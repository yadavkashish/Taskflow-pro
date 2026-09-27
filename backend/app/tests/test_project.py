from fastapi.testclient import TestClient

from app.main import app


def create_project(client, name):
    response = client.post("/projects", json={"name": name})
    assert response.status_code == 201
    return response.json()


def test_projects_create_list_and_rename():
    with TestClient(app) as client:
        first = create_project(client, "  Website Redesign  ")
        second = create_project(client, "Mobile Application")
        listed = client.get("/projects")
        renamed = client.put(f"/projects/{first['id']}", json={"name": "Website Launch", "description": "Delivery work"})

    assert {project["name"] for project in listed.json()} == {"Website Redesign", "Mobile Application"}
    assert renamed.json()["name"] == "Website Launch"
    assert renamed.json()["description"] == "Delivery work"


def test_project_task_dependency_and_critical_path_isolation():
    with TestClient(app) as client:
        project_a = create_project(client, "A")
        project_b = create_project(client, "B")
        a_tasks = [client.post(f"/projects/{project_a['id']}/tasks", json={"title": title, "duration": duration}).json() for title, duration in [("A", 6), ("B", 3), ("C", 2)]]
        b_task = client.post(f"/projects/{project_b['id']}/tasks", json={"title": "X", "duration": 20}).json()
        assert client.post(f"/projects/{project_a['id']}/dependencies", json={"predecessor_id": a_tasks[0]["id"], "successor_id": a_tasks[1]["id"]}).status_code == 201
        assert client.post(f"/projects/{project_a['id']}/dependencies", json={"predecessor_id": a_tasks[1]["id"], "successor_id": a_tasks[2]["id"]}).status_code == 201
        cross = client.post(f"/projects/{project_a['id']}/dependencies", json={"predecessor_id": a_tasks[0]["id"], "successor_id": b_task["id"]})
        a_path = client.get(f"/projects/{project_a['id']}/schedule/critical-path").json()
        b_path = client.get(f"/projects/{project_b['id']}/schedule/critical-path").json()
        a_tasks_response = client.get(f"/projects/{project_a['id']}/tasks").json()
        b_tasks_response = client.get(f"/projects/{project_b['id']}/tasks").json()

    assert cross.status_code == 422
    assert a_path["total_duration"] == 11
    assert b_path["total_duration"] == 20
    assert {task["id"] for task in a_tasks_response} == {task["id"] for task in a_tasks}
    assert [task["id"] for task in b_tasks_response] == [b_task["id"]]


def test_project_health_and_impact_do_not_cross_projects():
    with TestClient(app) as client:
        first = create_project(client, "A")
        second = create_project(client, "B")
        a = client.post(f"/projects/{first['id']}/tasks", json={"title": "A", "duration": 2, "start_date": "2024-01-01"}).json()
        b = client.post(f"/projects/{second['id']}/tasks", json={"title": "B", "duration": 30, "start_date": "2024-01-01"}).json()
        health = client.get(f"/projects/{first['id']}/analysis/project-health").json()
        impact = client.post(f"/projects/{first['id']}/analysis/impact", json={"task_id": a["id"], "changes": {"duration": 4}})
        foreign_impact = client.post(f"/projects/{first['id']}/analysis/impact", json={"task_id": b["id"], "changes": {"duration": 4}})

    assert health["metrics"]["total_tasks"] == 1
    assert impact.status_code == 200
    assert foreign_impact.status_code == 404


def test_project_summary_and_delete_are_isolated():
    with TestClient(app) as client:
        first = create_project(client, "A")
        second = create_project(client, "B")
        a1 = client.post(f"/projects/{first['id']}/tasks", json={"title": "A1", "duration": 2, "status": "done"}).json()
        a2 = client.post(f"/projects/{first['id']}/tasks", json={"title": "A2", "duration": 3}).json()
        b1 = client.post(f"/projects/{second['id']}/tasks", json={"title": "B1", "duration": 5}).json()
        client.post(f"/projects/{first['id']}/dependencies", json={"predecessor_id": a1["id"], "successor_id": a2["id"]})
        summaries = {item["id"]: item for item in client.get("/projects").json()}
        deleted = client.delete(f"/projects/{first['id']}")

        missing = client.get(f"/projects/{first['id']}")
        b_tasks = client.get(f"/projects/{second['id']}/tasks").json()
        b_dependencies = client.get(f"/projects/{second['id']}/dependencies").json()

    assert summaries[first["id"]]["task_count"] == 2
    assert summaries[first["id"]]["completed_count"] == 1
    assert summaries[first["id"]]["critical_path_duration"] == 5
    assert deleted.status_code == 204
    assert missing.status_code == 404
    assert [task["id"] for task in b_tasks] == [b1["id"]]
    assert b_dependencies == []
