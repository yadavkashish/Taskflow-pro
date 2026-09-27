from fastapi.testclient import TestClient
from app.main import app

def project(client, name, deadline=None, start=None):
    body = {"name": name, "target_deadline": deadline, "start_date": start}
    response = client.post("/projects", json=body)
    assert response.status_code == 201
    return response.json()

def task(client, project_id, title, end):
    return client.post(f"/projects/{project_id}/tasks", json={"title": title, "duration": 1, "start_date": end}).json()

def status(client, project_id): return client.get(f"/projects/{project_id}/schedule/deadline-status").json()

def test_deadline_variance_and_latest_completion_are_project_scoped():
    with TestClient(app) as client:
        a = project(client, "A", "2026-10-20")
        b = project(client, "B", "2026-11-30")
        task(client, a["id"], "Early", "2026-10-20")
        task(client, a["id"], "Late", "2026-10-23")
        task(client, b["id"], "B task", "2026-11-19")
        a_status, b_status = status(client, a["id"]), status(client, b["id"])
    assert (a_status["deadline_status"], a_status["variance_days"]) == ("AT_RISK", 4)
    assert (b_status["deadline_status"], b_status["variance_days"]) == ("ON_TRACK", -10)

def test_on_track_equal_no_deadline_and_no_schedule():
    with TestClient(app) as client:
        equal = project(client, "Equal", "2026-10-24")
        task(client, equal["id"], "Task", "2026-10-23")
        no_deadline = project(client, "No deadline")
        no_schedule = project(client, "No schedule", "2026-10-20")
        equal_status, no_deadline_status, no_schedule_status = status(client, equal["id"]), status(client, no_deadline["id"]), status(client, no_schedule["id"])
    assert (equal_status["deadline_status"], equal_status["variance_days"]) == ("ON_TRACK", 0)
    assert no_deadline_status["deadline_status"] == "NO_DEADLINE"
    assert no_schedule_status["deadline_status"] == "NO_SCHEDULE"

def test_project_dates_validate_order():
    with TestClient(app) as client:
        response = client.post("/projects", json={"name": "Invalid", "start_date": "2026-10-20", "target_deadline": "2026-10-19"})
    assert response.status_code == 422
