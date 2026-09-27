from datetime import date, timedelta

import pytest
from fastapi import HTTPException

from app.database import SessionLocal
from app.models.dependency import Dependency
from app.models.project import Project
from app.models.task import Task, TaskStatus
from app.services.critical_path import calculate_critical_path
from app.services.dag_engine import DAGEngine
from app.services.scheduling import get_dependency_state, recompute_schedule
from scripts.seed_demo import DEMO_NAME, EDGE_TITLES, seed_demo


EXPECTED_TITLES = {
    "Define Requirements",
    "Design Database Schema",
    "Build Backend API",
    "Build Authentication",
    "Build Frontend",
    "Integrate Frontend and API",
    "Write Integration Tests",
    "Security Review",
    "QA Testing",
    "Production Deployment",
}


def seeded_project(db):
    first = seed_demo(db)
    second = seed_demo(db)
    project = db.query(Project).filter_by(name=DEMO_NAME).one()
    tasks = {task.title: task for task in db.query(Task).filter_by(project_id=project.id)}
    return first, second, project, tasks


def test_demo_seed_is_idempotent_complete_and_preserves_other_projects():
    db = SessionLocal()
    unrelated = Project(name="Unrelated user project", start_date=date(2026, 1, 1))
    db.add(unrelated)
    db.commit()

    first, second, project, tasks = seeded_project(db)
    assert first["created_project"] is True
    assert second["created_project"] is False
    assert db.query(Project).filter_by(name=DEMO_NAME).count() == 1
    assert db.get(Project, unrelated.id) is not None
    assert set(tasks) == EXPECTED_TITLES
    assert len(tasks) == 10
    assert project.description
    assert project.start_date is not None
    assert project.target_deadline is not None
    assert len(EDGE_TITLES) == 11
    assert db.query(Dependency).join(Task, Dependency.predecessor_id == Task.id).filter(Task.project_id == project.id).count() == 11
    assert all(task.project_id == project.id and task.start_date and task.end_date for task in tasks.values())
    db.close()


def test_demo_seed_graph_states_critical_path_and_cycle_rejection():
    db = SessionLocal()
    _, _, project, tasks = seeded_project(db)
    requirements = tasks["Define Requirements"]
    backend = tasks["Build Backend API"]
    authentication = tasks["Build Authentication"]
    deployment = tasks["Production Deployment"]

    assert requirements.status == TaskStatus.DONE
    assert backend.status == TaskStatus.IN_PROGRESS
    assert authentication.status == TaskStatus.REVIEW
    assert get_dependency_state(backend, db) == "READY"
    assert get_dependency_state(authentication, db) == "BLOCKED"

    critical = calculate_critical_path(db, project.id)
    critical_titles = [item["title"] for item in critical["tasks"]]
    assert critical["is_complete"] is True
    assert critical_titles == [
        "Define Requirements", "Design Database Schema", "Build Backend API",
        "Build Frontend", "Integrate Frontend and API", "Write Integration Tests",
        "Security Review", "QA Testing", "Production Deployment",
    ]
    assert critical["total_duration"] == 23

    edge_count = db.query(Dependency).count()
    with pytest.raises(HTTPException, match="CYCLE_DETECTED"):
        DAGEngine(db, project.id).add_dependency(deployment.id, requirements.id)
    assert db.query(Dependency).count() == edge_count
    db.close()


def test_demo_seed_converging_schedule_and_rollback_state():
    db = SessionLocal()
    _, _, project, tasks = seeded_project(db)
    backend = tasks["Build Backend API"]
    integration_tests = tasks["Write Integration Tests"]
    authentication = tasks["Build Authentication"]
    original_tests_start = integration_tests.start_date

    backend.planned_start_date = backend.start_date + timedelta(days=3)
    db.commit()
    recompute_schedule(db, project.id)
    db.refresh(integration_tests)
    assert integration_tests.start_date - original_tests_start == timedelta(days=3)

    backend.status = TaskStatus.DONE
    db.commit()
    assert get_dependency_state(authentication, db) == "READY"
    backend.status = TaskStatus.IN_PROGRESS
    db.commit()
    assert get_dependency_state(authentication, db) == "BLOCKED"
    db.close()
