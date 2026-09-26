from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app.database import get_db
from app.main import app
from app.models.dependency import Dependency
from app.models.task import Task, TaskStatus
from app.services.project_health import analyze_project_health


@pytest.fixture
def db_session():
    session = next(get_db())
    yield session
    session.rollback()


def add_task(db, title, duration=1, status=TaskStatus.BACKLOG, scheduled=True):
    start = datetime(2026, 1, 1) if scheduled else None
    task = Task(
        title=title,
        duration=duration,
        status=status,
        start_date=start,
        end_date=start + timedelta(days=duration) if scheduled and duration is not None else None,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def add_edge(db, predecessor, successor):
    db.add(Dependency(predecessor_id=predecessor.id, successor_id=successor.id))
    db.commit()


def finding_types(result):
    return [finding["type"] for finding in result["findings"]]


def test_healthy_project_has_no_attention_findings(db_session):
    add_task(db_session, "Planned work", duration=2)

    result = analyze_project_health(db_session)

    assert result["overall_status"] == "healthy"
    assert result["findings"] == []
    assert result["metrics"]["ready_unfinished_tasks"] == 1


def test_critical_blocked_task_is_high_risk(db_session):
    build = add_task(db_session, "Build API", duration=3)
    testing = add_task(db_session, "Testing", duration=5)
    add_edge(db_session, build, testing)

    result = analyze_project_health(db_session)

    critical = next(finding for finding in result["findings"] if finding["type"] == "critical_task_blocked")
    assert result["overall_status"] == "at_risk"
    assert critical["task_ids"] == [testing.id, build.id]
    assert critical["waiting_for"] == [{"id": build.id, "title": "Build API"}]


def test_blocked_noncritical_task_is_medium_attention(db_session):
    critical_start = add_task(db_session, "Critical start", duration=5, status=TaskStatus.DONE)
    critical_end = add_task(db_session, "Critical end", duration=5, status=TaskStatus.DONE)
    waiting_on = add_task(db_session, "Small prerequisite", duration=1)
    blocked = add_task(db_session, "Small dependent", duration=1)
    add_edge(db_session, critical_start, critical_end)
    add_edge(db_session, waiting_on, blocked)

    result = analyze_project_health(db_session)

    assert result["overall_status"] == "attention"
    assert "blocked_non_critical_task" in finding_types(result)
    assert "critical_task_blocked" not in finding_types(result)


def test_missing_duration_is_grouped_medium_finding(db_session):
    missing = add_task(db_session, "Deployment", duration=None, scheduled=False)

    result = analyze_project_health(db_session)

    finding = next(finding for finding in result["findings"] if finding["type"] == "missing_duration")
    assert result["overall_status"] == "attention"
    assert finding["task_ids"] == [missing.id]
    assert result["critical_path"]["is_complete"] is False


def test_unscheduled_unfinished_task_is_medium_finding(db_session):
    task = add_task(db_session, "Documentation", duration=2, scheduled=False)

    result = analyze_project_health(db_session)

    finding = next(finding for finding in result["findings"] if finding["type"] == "unscheduled_task")
    assert finding["task_ids"] == [task.id]
    assert result["metrics"]["unscheduled_tasks"] == 1


def test_ready_tasks_exclude_done_tasks(db_session):
    ready = add_task(db_session, "Ready", duration=2)
    add_task(db_session, "Done", duration=2, status=TaskStatus.DONE)

    result = analyze_project_health(db_session)

    assert result["ready_tasks"] == [{"id": ready.id, "title": "Ready", "status": "backlog", "duration": 2}]


def test_blocker_details_include_only_direct_unfinished_predecessors(db_session):
    done = add_task(db_session, "Done predecessor", status=TaskStatus.DONE)
    unfinished = add_task(db_session, "Unfinished predecessor")
    blocked = add_task(db_session, "Blocked task")
    add_edge(db_session, done, blocked)
    add_edge(db_session, unfinished, blocked)

    result = analyze_project_health(db_session)

    detail = next(item for item in result["blocked_tasks"] if item["id"] == blocked.id)
    assert detail["waiting_for"] == [{"id": unfinished.id, "title": "Unfinished predecessor"}]


def test_critical_blocked_task_does_not_receive_noncritical_finding(db_session):
    predecessor = add_task(db_session, "Predecessor", duration=3)
    critical = add_task(db_session, "Critical dependent", duration=4)
    add_edge(db_session, predecessor, critical)

    result = analyze_project_health(db_session)

    assert "critical_task_blocked" in finding_types(result)
    assert "blocked_non_critical_task" not in finding_types(result)


def test_diamond_uses_direct_blockers_and_authoritative_critical_path(db_session):
    a = add_task(db_session, "A", duration=1, status=TaskStatus.DONE)
    b = add_task(db_session, "B", duration=2)
    c = add_task(db_session, "C", duration=5)
    d = add_task(db_session, "D", duration=2)
    for predecessor, successor in [(a, b), (a, c), (b, d), (c, d)]:
        add_edge(db_session, predecessor, successor)

    result = analyze_project_health(db_session)

    detail = next(item for item in result["blocked_tasks"] if item["id"] == d.id)
    assert result["critical_path"]["task_ids"] == [a.id, c.id, d.id]
    assert {item["id"] for item in detail["waiting_for"]} == {b.id, c.id}
    assert detail["critical"] is True


def test_empty_project_is_safe_and_healthy(db_session):
    result = analyze_project_health(db_session)

    assert result["overall_status"] == "healthy"
    assert result["metrics"]["total_tasks"] == 0
    assert result["ready_tasks"] == []
    assert result["critical_path"]["is_complete"] is True


def test_project_health_endpoint_returns_structured_contract():
    with TestClient(app) as client:
        response = client.get("/analysis/project-health")

    assert response.status_code == 200
    assert response.json()["overall_status"] == "healthy"
