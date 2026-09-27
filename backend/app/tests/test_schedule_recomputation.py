from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app.database import get_db
from app.main import app
from app.models.dependency import Dependency
from app.models.task import Task
from app.services.critical_path import calculate_critical_path
from app.services.impact_analysis import analyze_impact
from app.services.scheduling import recompute_schedule
from app.schemas.impact import ImpactChanges


SEP_1 = datetime(2026, 9, 1)


@pytest.fixture
def db_session():
    session = next(get_db())
    yield session
    session.rollback()


def add_task(db, title, duration, planned_start=None):
    task = Task(title=title, duration=duration, planned_start_date=planned_start)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def add_edge(db, predecessor, successor):
    edge = Dependency(predecessor_id=predecessor.id, successor_id=successor.id)
    db.add(edge)
    db.commit()
    recompute_schedule(db)
    return edge


def test_simple_delay_recomputes_full_chain_later(db_session):
    a = add_task(db_session, "A", 3, SEP_1)
    b = add_task(db_session, "B", 2)
    c = add_task(db_session, "C", 2)
    add_edge(db_session, a, b)
    add_edge(db_session, b, c)

    a.duration = 6
    recompute_schedule(db_session)

    assert (b.start_date, c.start_date) == (SEP_1 + timedelta(days=6), SEP_1 + timedelta(days=8))


def test_simple_improvement_recomputes_full_chain_earlier(db_session):
    a = add_task(db_session, "A", 6, SEP_1)
    b = add_task(db_session, "B", 3)
    c = add_task(db_session, "C", 2)
    add_edge(db_session, a, b)
    add_edge(db_session, b, c)

    a.duration = 2
    recompute_schedule(db_session)

    assert (b.start_date, c.start_date) == (SEP_1 + timedelta(days=2), SEP_1 + timedelta(days=5))


def test_root_moved_later_recomputes_descendants(db_session):
    a = add_task(db_session, "A", 2, SEP_1)
    b = add_task(db_session, "B", 2)
    c = add_task(db_session, "C", 2)
    add_edge(db_session, a, b)
    add_edge(db_session, b, c)

    a.planned_start_date = SEP_1 + timedelta(days=4)
    recompute_schedule(db_session)

    assert b.start_date == SEP_1 + timedelta(days=6)
    assert c.start_date == SEP_1 + timedelta(days=8)


def test_root_moved_earlier_recomputes_descendants(db_session):
    a = add_task(db_session, "A", 2, SEP_1 + timedelta(days=4))
    b = add_task(db_session, "B", 2)
    c = add_task(db_session, "C", 2)
    add_edge(db_session, a, b)
    add_edge(db_session, b, c)

    a.planned_start_date = SEP_1
    recompute_schedule(db_session)

    assert b.start_date == SEP_1 + timedelta(days=2)
    assert c.start_date == SEP_1 + timedelta(days=4)


def test_diamond_switches_to_the_later_branch_after_shortening(db_session):
    a = add_task(db_session, "A", 1, SEP_1)
    b = add_task(db_session, "B", 6)
    c = add_task(db_session, "C", 5)
    d = add_task(db_session, "D", 2)
    for predecessor, successor in [(a, b), (a, c), (b, d), (c, d)]:
        add_edge(db_session, predecessor, successor)
    assert d.start_date == SEP_1 + timedelta(days=7)

    b.duration = 3
    recompute_schedule(db_session)

    assert b.end_date == SEP_1 + timedelta(days=4)
    assert c.end_date == SEP_1 + timedelta(days=6)
    assert d.start_date == c.end_date


def test_multiple_predecessors_use_latest_current_completion(db_session):
    a = add_task(db_session, "A", 2, SEP_1)
    b = add_task(db_session, "B", 6, SEP_1)
    c = add_task(db_session, "C", 4, SEP_1)
    d = add_task(db_session, "D", 1)
    for predecessor in (a, b, c):
        add_edge(db_session, predecessor, d)

    assert d.start_date == b.end_date


def test_dependency_removal_releases_old_propagated_date(db_session):
    early = add_task(db_session, "Early", 2, SEP_1)
    late = add_task(db_session, "Late", 8, SEP_1)
    dependent = add_task(db_session, "Dependent", 2)
    add_edge(db_session, early, dependent)
    late_edge = add_edge(db_session, late, dependent)
    assert dependent.start_date == late.end_date

    db_session.delete(late_edge)
    db_session.commit()
    recompute_schedule(db_session)

    assert dependent.start_date == early.end_date


def test_dependency_addition_recomputes_successor_and_descendants(db_session):
    early = add_task(db_session, "Early", 2, SEP_1)
    late = add_task(db_session, "Late", 8, SEP_1)
    dependent = add_task(db_session, "Dependent", 2)
    child = add_task(db_session, "Child", 2)
    add_edge(db_session, early, dependent)
    add_edge(db_session, dependent, child)
    assert dependent.start_date == early.end_date

    add_edge(db_session, late, dependent)

    assert dependent.start_date == late.end_date
    assert child.start_date == dependent.end_date


def test_dependency_removal_endpoint_recomputes_from_remaining_predecessors():
    with TestClient(app) as client:
        early = client.post("/tasks", json={"title": "Early", "start_date": "2026-09-01", "duration": 2}).json()
        late = client.post("/tasks", json={"title": "Late", "start_date": "2026-09-01", "duration": 8}).json()
        dependent = client.post("/tasks", json={"title": "Dependent", "duration": 2}).json()
        assert client.post("/dependencies", json={"predecessor_id": early["id"], "successor_id": dependent["id"]}).status_code == 201
        late_edge = client.post("/dependencies", json={"predecessor_id": late["id"], "successor_id": dependent["id"]}).json()
        assert client.get(f"/tasks/{dependent['id']}").json()["start_date"] == "2026-09-09T00:00:00"

        assert client.delete(f"/dependencies/{late_edge['id']}").status_code == 200
        recalculated = client.get(f"/tasks/{dependent['id']}").json()

    assert recalculated["start_date"] == "2026-09-03T00:00:00"


def test_manual_start_constraint_is_never_pulled_before_requested_date(db_session):
    a = add_task(db_session, "A", 4, SEP_1)
    b = add_task(db_session, "B", 2, SEP_1 + timedelta(days=10))
    add_edge(db_session, a, b)

    assert a.end_date == SEP_1 + timedelta(days=4)
    assert b.start_date == SEP_1 + timedelta(days=10)


def test_stale_calculated_start_is_not_promoted_to_a_constraint(db_session):
    a = add_task(db_session, "A", 8, SEP_1)
    b = add_task(db_session, "B", 2)
    add_edge(db_session, a, b)
    assert b.planned_start_date is None
    assert b.start_date == SEP_1 + timedelta(days=8)

    a.duration = 3
    recompute_schedule(db_session)

    assert b.planned_start_date is None
    assert b.start_date == SEP_1 + timedelta(days=3)


def test_impact_preview_reports_earlier_downstream_dates_without_persisting(db_session):
    a = add_task(db_session, "A", 6, SEP_1)
    b = add_task(db_session, "B", 2)
    add_edge(db_session, a, b)

    preview = analyze_impact(db_session, a.id, ImpactChanges(duration=2))

    affected = preview["affected_tasks"][0]
    assert affected["after_start"] == SEP_1 + timedelta(days=2)
    assert affected["delay_days"] == -4
    assert db_session.get(Task, b.id).start_date == SEP_1 + timedelta(days=6)


def test_preview_and_apply_have_matching_recomputed_schedule():
    with TestClient(app) as client:
        a = client.post("/tasks", json={"title": "A", "start_date": "2026-09-01", "duration": 6}).json()
        b = client.post("/tasks", json={"title": "B", "duration": 2}).json()
        assert client.post("/dependencies", json={"predecessor_id": a["id"], "successor_id": b["id"]}).status_code == 201

        preview = client.post("/analysis/impact", json={"task_id": a["id"], "changes": {"duration": 2}}).json()
        preview_b = next(item for item in preview["affected_tasks"] if item["task_id"] == b["id"])
        assert client.put(f"/tasks/{a['id']}", json={"duration": 2}).status_code == 200
        applied_b = client.get(f"/tasks/{b['id']}").json()

    assert applied_b["start_date"] == preview_b["after_start"]
    assert applied_b["end_date"] == preview_b["after_end"]


def test_critical_path_remains_authoritative_after_recomputation(db_session):
    a = add_task(db_session, "A", 2, SEP_1)
    b = add_task(db_session, "B", 6)
    c = add_task(db_session, "C", 3)
    add_edge(db_session, a, b)
    add_edge(db_session, a, c)

    b.planned_start_date = SEP_1 + timedelta(days=4)
    recompute_schedule(db_session)
    critical = calculate_critical_path(db_session)

    assert critical["task_ids"] == [a.id, b.id]
    assert b.start_date == SEP_1 + timedelta(days=4)


def test_project_health_uses_recomputed_schedule(client=None):
    with TestClient(app) as test_client:
        task = test_client.post("/tasks", json={"title": "Scheduled", "start_date": "2026-09-01", "duration": 2}).json()
        response = test_client.get("/analysis/project-health")

    assert response.status_code == 200
    assert response.json()["metrics"]["project_completion_date"].startswith(task["end_date"][:10])
