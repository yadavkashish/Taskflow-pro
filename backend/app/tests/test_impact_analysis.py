from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app.database import get_db
from app.main import app
from app.models.dependency import Dependency
from app.models.task import Task
from app.schemas.impact import ImpactChanges
from app.services.impact_analysis import analyze_impact


@pytest.fixture
def db_session():
    session = next(get_db())
    yield session
    session.rollback()


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def add_task(db, title, duration, start):
    task = Task(title=title, duration=duration, start_date=start, end_date=start)
    db.add(task)
    db.commit()
    task.end_date = start + timedelta(days=duration)
    db.commit()
    db.refresh(task)
    return task


def add_edge(db, predecessor, successor):
    db.add(Dependency(predecessor_id=predecessor.id, successor_id=successor.id))
    db.commit()


def test_impact_chain_propagates_without_persisting_preview(db_session):
    jan = datetime(2026, 1, 1)
    a = add_task(db_session, "A", 2, jan)
    b = add_task(db_session, "B", 3, datetime(2026, 1, 3))
    c = add_task(db_session, "C", 2, datetime(2026, 1, 6))
    add_edge(db_session, a, b)
    add_edge(db_session, b, c)

    result = analyze_impact(db_session, a.id, ImpactChanges(duration=5))

    assert [item["task_id"] for item in result["affected_tasks"]] == [b.id, c.id]
    assert result["affected_tasks"][0]["after_start"] == datetime(2026, 1, 6)
    assert result["affected_tasks"][1]["after_end"] == datetime(2026, 1, 11)
    assert db_session.get(Task, a.id).duration == 2
    assert db_session.get(Task, b.id).start_date == datetime(2026, 1, 3)


def test_impact_diamond_does_not_delay_join_when_other_branch_is_later(db_session):
    a = add_task(db_session, "A", 1, datetime(2026, 1, 1))
    b = add_task(db_session, "B", 2, datetime(2026, 1, 2))
    c = add_task(db_session, "C", 5, datetime(2026, 1, 2))
    d = add_task(db_session, "D", 2, datetime(2026, 1, 7))
    for left, right in [(a, b), (a, c), (b, d), (c, d)]: add_edge(db_session, left, right)

    result = analyze_impact(db_session, b.id, ImpactChanges(duration=4))

    assert result["affected_count"] == 0
    assert result["project_completion"]["delta_days"] == 0


def test_impact_diamond_delays_join_when_controlling_branch_changes(db_session):
    a = add_task(db_session, "A", 1, datetime(2026, 1, 1))
    b = add_task(db_session, "B", 2, datetime(2026, 1, 2))
    c = add_task(db_session, "C", 5, datetime(2026, 1, 2))
    d = add_task(db_session, "D", 2, datetime(2026, 1, 7))
    for left, right in [(a, b), (a, c), (b, d), (c, d)]: add_edge(db_session, left, right)

    result = analyze_impact(db_session, c.id, ImpactChanges(duration=7))

    assert result["affected_tasks"][0]["task_id"] == d.id
    assert result["affected_tasks"][0]["delay_days"] == 2


def test_impact_compares_critical_path_and_supports_earlier_terminal_completion(db_session):
    a = add_task(db_session, "A", 2, datetime(2026, 1, 1))
    b = add_task(db_session, "B", 3, datetime(2026, 1, 3))
    c = add_task(db_session, "C", 5, datetime(2026, 1, 6))
    add_edge(db_session, a, b)
    add_edge(db_session, b, c)

    result = analyze_impact(db_session, c.id, ImpactChanges(duration=2))

    assert result["critical_path"]["delta_duration"] == -3
    assert result["project_completion"]["delta_days"] == -3


def test_impact_reports_critical_path_chain_change(db_session):
    a = add_task(db_session, "A", 2, datetime(2026, 1, 1))
    b = add_task(db_session, "B", 3, datetime(2026, 1, 3))
    c = add_task(db_session, "C", 5, datetime(2026, 1, 3))
    d = add_task(db_session, "D", 2, datetime(2026, 1, 8))
    for left, right in [(a, b), (a, c), (b, d), (c, d)]: add_edge(db_session, left, right)

    result = analyze_impact(db_session, b.id, ImpactChanges(duration=6))

    assert result["critical_path"]["changed"] is True
    assert result["critical_path"]["before_task_ids"] == [a.id, c.id, d.id]
    assert result["critical_path"]["after_task_ids"] == [a.id, b.id, d.id]


def test_impact_no_change_has_no_downstream_effect(db_session):
    a = add_task(db_session, "A", 2, datetime(2026, 1, 1))
    b = add_task(db_session, "B", 2, datetime(2026, 1, 3))
    add_edge(db_session, a, b)

    result = analyze_impact(db_session, a.id, ImpactChanges(duration=2))

    assert result["affected_count"] == 0


def test_impact_start_date_change_propagates_in_memory(db_session):
    a = add_task(db_session, "A", 2, datetime(2026, 1, 1))
    b = add_task(db_session, "B", 2, datetime(2026, 1, 3))
    add_edge(db_session, a, b)

    result = analyze_impact(db_session, a.id, ImpactChanges(start_date=datetime(2026, 1, 4)))

    assert result["affected_tasks"][0]["task_id"] == b.id
    assert result["affected_tasks"][0]["after_start"] == datetime(2026, 1, 6)
    assert db_session.get(Task, a.id).start_date == datetime(2026, 1, 1)


def test_impact_rejects_invalid_duration(client):
    response = client.post("/analysis/impact", json={"task_id": 1, "changes": {"duration": -1}})
    assert response.status_code == 422
