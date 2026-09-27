from datetime import date, datetime

from app.database import SessionLocal
from app.models.dependency import Dependency
from app.models.project import Project
from app.models.task import Task, TaskStatus
from scripts.seed_demo import DEMO_NAME, seed_demo


def test_project_task_dependency_persistence_across_sessions():
    first_session = SessionLocal()
    project = Project(name="Persistent Project", start_date=date(2026, 10, 1), target_deadline=date(2026, 10, 20))
    first_session.add(project)
    first_session.flush()
    predecessor = Task(project_id=project.id, title="Persisted predecessor", status=TaskStatus.DONE, planned_start_date=datetime(2026, 10, 1), start_date=datetime(2026, 10, 1), end_date=datetime(2026, 10, 3), duration=2, board_column="done", position=0)
    successor = Task(project_id=project.id, title="Persisted successor", status=TaskStatus.IN_PROGRESS, planned_start_date=datetime(2026, 10, 3), start_date=datetime(2026, 10, 3), end_date=datetime(2026, 10, 6), duration=3, board_column="in_progress", position=0)
    first_session.add_all([predecessor, successor])
    first_session.flush()
    first_session.add(Dependency(predecessor_id=predecessor.id, successor_id=successor.id))
    first_session.commit()
    project_id, successor_id = project.id, successor.id
    first_session.close()

    second_session = SessionLocal()
    persisted_project = second_session.get(Project, project_id)
    persisted_task = second_session.get(Task, successor_id)
    persisted_dependency = second_session.query(Dependency).filter_by(successor_id=successor_id).one()
    assert persisted_project is not None
    assert persisted_project.target_deadline == date(2026, 10, 20)
    assert persisted_task is not None
    assert persisted_task.project_id == project_id
    assert persisted_task.status == TaskStatus.IN_PROGRESS
    assert persisted_task.start_date == datetime(2026, 10, 3)
    assert persisted_task.end_date == datetime(2026, 10, 6)
    assert persisted_task.duration == 3
    assert persisted_task.position == 0
    assert persisted_dependency.predecessor_id != persisted_dependency.successor_id
    second_session.close()


def test_demo_seed_is_idempotent_and_project_scoped():
    db = SessionLocal()
    first = seed_demo(db)
    second = seed_demo(db)
    assert first["created_project"] is True
    assert second["created_project"] is False
    assert second["task_count"] == 10
    assert second["dependency_count"] == 11
    project = db.query(Project).filter_by(name=DEMO_NAME).one()
    assert db.query(Task).filter_by(project_id=project.id).count() == 10
    db.close()
