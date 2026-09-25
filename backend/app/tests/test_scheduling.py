from datetime import datetime, timedelta
import pytest
from app.models.task import Task
from app.models.dependency import Dependency
from app.services.scheduling import calculate_dates, get_dependency_state
from app.database import SessionLocal

@pytest.fixture
def db_session():
    session = SessionLocal()
    yield session
    session.close()

@pytest.fixture
def sample_tasks(db_session):
    task1 = Task(title="Task 1", description="First task", status="backlog", start_date=datetime.now(), duration=5)
    task2 = Task(title="Task 2", description="Second task", status="backlog", start_date=datetime.now(), duration=3)
    db_session.add(task1)
    db_session.add(task2)
    db_session.commit()
    db_session.add(Dependency(predecessor_id=task1.id, successor_id=task2.id))
    db_session.commit()
    return task1, task2

def test_calculate_dates_no_dependencies(db_session, sample_tasks):
    task1, task2 = sample_tasks
    calculate_dates(task1, db_session)
    assert task1.end_date == task1.start_date + timedelta(days=task1.duration)

def test_update_task_status_ready(db_session, sample_tasks):
    task1, task2 = sample_tasks
    task1.status = "done"
    db_session.commit()
    assert get_dependency_state(task2, db_session) == "READY"
    assert task2.status.value == "backlog"

def test_update_task_status_blocked(db_session, sample_tasks):
    task1, task2 = sample_tasks
    task1.status = "in_progress"
    db_session.commit()
    assert get_dependency_state(task2, db_session) == "BLOCKED"
    assert task2.status.value == "backlog"

def test_date_propagation(db_session, sample_tasks):
    task1, task2 = sample_tasks
    task1.start_date = datetime(2023, 1, 1)
    task1.duration = 5
    calculate_dates(task1, db_session)
    assert task1.end_date == datetime(2023, 1, 6)

    # Simulate changing task1's end date
    task1.start_date = datetime(2023, 1, 3)
    calculate_dates(task1, db_session)
    assert task1.end_date == datetime(2023, 1, 8)

def test_rollback_on_status_change(db_session, sample_tasks):
    task1, task2 = sample_tasks
    task1.status = "done"
    db_session.commit()
    assert get_dependency_state(task2, db_session) == "READY"

    # Rollback task1 to in_progress
    task1.status = "in_progress"
    db_session.commit()
    assert get_dependency_state(task2, db_session) == "BLOCKED"
