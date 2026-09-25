from datetime import datetime

from fastapi import HTTPException
from app.services.dag_engine import DAGEngine
from app.models.task import Task
from app.models.dependency import Dependency
from app.database import SessionLocal
import pytest

@pytest.fixture
def db_session():
    session = SessionLocal()
    yield session
    session.close()

@pytest.fixture
def dag_engine():
    return DAGEngine()

def test_self_cycle(dag_engine):
    task_a = Task(id=1, title="Task A", status="backlog")
    dag_engine.add_task(task_a)
    with pytest.raises(HTTPException) as excinfo:
        dag_engine.add_dependency(predecessor_id=1, successor_id=1)
    assert excinfo.value.status_code == 409
    assert excinfo.value.detail == "CYCLE_DETECTED"

def test_direct_cycle(dag_engine):
    task_a = Task(id=1, title="Task A", status="backlog")
    task_b = Task(id=2, title="Task B", status="backlog")
    dag_engine.add_task(task_a)
    dag_engine.add_task(task_b)
    dag_engine.add_dependency(predecessor_id=1, successor_id=2)
    with pytest.raises(HTTPException) as excinfo:
        dag_engine.add_dependency(predecessor_id=2, successor_id=1)
    assert excinfo.value.status_code == 409
    assert excinfo.value.detail == "CYCLE_DETECTED"

def test_indirect_cycle(dag_engine):
    task_a = Task(id=1, title="Task A", status="backlog")
    task_b = Task(id=2, title="Task B", status="backlog")
    task_c = Task(id=3, title="Task C", status="backlog")
    dag_engine.add_task(task_a)
    dag_engine.add_task(task_b)
    dag_engine.add_task(task_c)
    dag_engine.add_dependency(predecessor_id=1, successor_id=2)
    dag_engine.add_dependency(predecessor_id=2, successor_id=3)
    with pytest.raises(HTTPException) as excinfo:
        dag_engine.add_dependency(predecessor_id=3, successor_id=1)
    assert excinfo.value.status_code == 409
    assert excinfo.value.detail == "CYCLE_DETECTED"

def test_valid_dependency(dag_engine):
    task_a = Task(id=1, title="Task A", status="backlog")
    task_b = Task(id=2, title="Task B", status="backlog")
    dag_engine.add_task(task_a)
    dag_engine.add_task(task_b)
    dag_engine.add_dependency(predecessor_id=1, successor_id=2)
    assert dag_engine.get_dependencies() == [(1, 2)]

def test_blocked_status(dag_engine):
    task_a = Task(id=1, title="Task A", status="in_progress")
    task_b = Task(id=2, title="Task B", status="backlog")
    dag_engine.add_task(task_a)
    dag_engine.add_task(task_b)
    dag_engine.add_dependency(predecessor_id=1, successor_id=2)
    assert dag_engine.get_task_status(2) == "BLOCKED"

def test_ready_status(dag_engine):
    task_a = Task(id=1, title="Task A", status="done")
    task_b = Task(id=2, title="Task B", status="backlog")
    dag_engine.add_task(task_a)
    dag_engine.add_task(task_b)
    dag_engine.add_dependency(predecessor_id=1, successor_id=2)
    assert dag_engine.get_task_status(2) == "READY"

def test_rollback(dag_engine):
    task_a = Task(id=1, title="Task A", status="done")
    task_b = Task(id=2, title="Task B", status="backlog")
    dag_engine.add_task(task_a)
    dag_engine.add_task(task_b)
    dag_engine.add_dependency(predecessor_id=1, successor_id=2)
    dag_engine.update_task_status(1, "in_progress")
    assert dag_engine.get_task_status(2) == "BLOCKED"

def test_converging_paths(dag_engine):
    task_a = Task(id=1, title="Task A", status="done", start_date=datetime(2024, 1, 1), end_date=datetime(2024, 1, 2), duration=1)
    task_b = Task(id=2, title="Task B", status="backlog", start_date=datetime(2024, 1, 2), end_date=datetime(2024, 1, 3), duration=1)
    task_c = Task(id=3, title="Task C", status="backlog", start_date=datetime(2024, 1, 2), end_date=datetime(2024, 1, 6), duration=4)
    task_d = Task(id=4, title="Task D", status="backlog", start_date=datetime(2024, 1, 6), end_date=datetime(2024, 1, 8), duration=2)
    dag_engine.add_task(task_a)
    dag_engine.add_task(task_b)
    dag_engine.add_task(task_c)
    dag_engine.add_task(task_d)
    dag_engine.add_dependency(predecessor_id=1, successor_id=2)
    dag_engine.add_dependency(predecessor_id=1, successor_id=3)
    dag_engine.add_dependency(predecessor_id=2, successor_id=4)
    dag_engine.add_dependency(predecessor_id=3, successor_id=4)
    dag_engine.update_task_dates(1, 3)  # Move A by +3 days
    assert dag_engine.get_task_dates(4) == (datetime(2024, 1, 9), datetime(2024, 1, 11))

def test_persistence(db_session):
    task_a = Task(id=1, title="Task A", status="backlog")
    db_session.add(task_a)
    db_session.commit()
    assert db_session.query(Task).filter(Task.id == 1).first() is not None

def test_duplicate_dependency(dag_engine):
    task_a = Task(id=1, title="Task A", status="backlog")
    task_b = Task(id=2, title="Task B", status="backlog")
    dag_engine.add_task(task_a)
    dag_engine.add_task(task_b)
    dag_engine.add_dependency(predecessor_id=1, successor_id=2)
    with pytest.raises(HTTPException) as excinfo:
        dag_engine.add_dependency(predecessor_id=1, successor_id=2)
    assert excinfo.value.status_code == 409
    assert excinfo.value.detail == "DUPLICATE_DEPENDENCY"
