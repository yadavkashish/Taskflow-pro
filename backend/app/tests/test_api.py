from fastapi.testclient import TestClient
from app.main import app
from app.models.task import Task
from app.models.dependency import Dependency
from app.database import get_db
from sqlalchemy.orm import Session
import pytest

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

@pytest.fixture
def db_session():
    db = next(get_db())
    yield db
    db.rollback()

def test_create_task(client, db_session):
    response = client.post("/tasks", json={
        "title": "Test Task",
        "description": "This is a test task.",
        "status": "backlog",
        "start_date": "2023-01-01",
        "end_date": "2023-01-02",
        "duration": 1
    })
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test Task"
    assert data["status"] == "backlog"

def test_get_tasks(client):
    response = client.get("/tasks")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_update_task(client):
    response = client.post("/tasks", json={
        "title": "Update Task",
        "description": "This task will be updated.",
        "status": "backlog"
    })
    task_id = response.json()["id"]
    
    response = client.put(f"/tasks/{task_id}", json={
        "status": "in_progress"
    })
    assert response.status_code == 200
    assert response.json()["status"] == "in_progress"

def test_delete_task(client):
    response = client.post("/tasks", json={
        "title": "Delete Task",
        "description": "This task will be deleted."
    })
    task_id = response.json()["id"]
    
    response = client.delete(f"/tasks/{task_id}")
    assert response.status_code == 204

def test_create_dependency(client):
    response = client.post("/tasks", json={
        "title": "Task A",
        "description": "This is task A.",
        "status": "done"
    })
    task_a_id = response.json()["id"]

    response = client.post("/tasks", json={
        "title": "Task B",
        "description": "This is task B.",
        "status": "backlog"
    })
    task_b_id = response.json()["id"]

    response = client.post("/dependencies", json={
        "predecessor_id": task_a_id,
        "successor_id": task_b_id
    })
    assert response.status_code == 201

def test_cycle_detection(client):
    response_a = client.post("/tasks", json={"title": "Task A", "status": "done"})
    task_a_id = response_a.json()["id"]

    response_b = client.post("/tasks", json={"title": "Task B", "status": "done"})
    task_b_id = response_b.json()["id"]

    response = client.post("/dependencies", json={
        "predecessor_id": task_a_id,
        "successor_id": task_b_id
    })
    assert response.status_code == 201

    response = client.post("/dependencies", json={
        "predecessor_id": task_b_id,
        "successor_id": task_a_id
    })
    assert response.status_code == 409
    assert response.json() == {"error": "CYCLE_DETECTED", "message": "Adding this dependency would create a cycle."}


def test_schedule_propagates_after_duration_update(client):
    predecessor = client.post("/tasks", json={
        "title": "Predecessor",
        "status": "backlog",
        "start_date": "2024-01-01",
        "duration": 2,
    })
    successor = client.post("/tasks", json={
        "title": "Successor",
        "status": "backlog",
        "start_date": "2024-01-01",
        "duration": 3,
    })

    predecessor_id = predecessor.json()["id"]
    successor_id = successor.json()["id"]
    assert predecessor.json()["end_date"] == "2024-01-03T00:00:00"

    dependency = client.post("/dependencies", json={
        "predecessor_id": predecessor_id,
        "successor_id": successor_id,
    })
    assert dependency.status_code == 201
    assert client.get(f"/tasks/{successor_id}").json()["start_date"] == "2024-01-03T00:00:00"

    update = client.put(f"/tasks/{predecessor_id}", json={"duration": 4})
    assert update.status_code == 200
    assert update.json()["end_date"] == "2024-01-05T00:00:00"

    propagated_successor = client.get(f"/tasks/{successor_id}").json()
    assert propagated_successor["start_date"] == "2024-01-05T00:00:00"
    assert propagated_successor["end_date"] == "2024-01-08T00:00:00"


def test_reorder_persists_positions_and_cross_column_move(client):
    first = client.post("/tasks", json={"title": "First", "status": "backlog"}).json()
    second = client.post("/tasks", json={"title": "Second", "status": "backlog"}).json()
    third = client.post("/tasks", json={"title": "Third", "status": "backlog"}).json()

    reorder = client.post(f"/tasks/{third['id']}/reorder", json={
        "status": "backlog",
        "ordered_task_ids": [third["id"], first["id"], second["id"]],
    })
    assert reorder.status_code == 200
    backlog = [task for task in client.get("/tasks?limit=100").json() if task["status"] == "backlog"]
    assert [task["id"] for task in backlog] == [third["id"], first["id"], second["id"]]
    assert [task["position"] for task in backlog] == [0, 1, 2]

    moved = client.post(f"/tasks/{third['id']}/move", params={"status": "in_progress"})
    assert moved.status_code == 200
    reorder_cross_column = client.post(f"/tasks/{third['id']}/reorder", json={
        "status": "in_progress",
        "ordered_task_ids": [third["id"]],
    })
    assert reorder_cross_column.status_code == 200
    assert reorder_cross_column.json()["board_column"] == "in_progress"
