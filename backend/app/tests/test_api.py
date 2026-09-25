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