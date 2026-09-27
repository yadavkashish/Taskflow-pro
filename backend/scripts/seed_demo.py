"""Safely add the TaskFlow Pro demonstration project to the configured database."""

from __future__ import annotations

import sys
from datetime import date, datetime, time, timedelta
from pathlib import Path


# `python scripts/seed_demo.py` places scripts/ on sys.path, not backend/.
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app import config  # noqa: F401  # Load backend/.env before database setup.
from app.database import Base, SessionLocal, engine, migrate_project_schema, migrate_task_schedule_schema
from app.models.dependency import Dependency
from app.models.project import Project
from app.models.task import Task, TaskStatus
from app.services.scheduling import recompute_schedule


DEMO_NAME = "TaskFlow Pro Demo Project"
DEMO_DESCRIPTION = (
    "Sample software delivery project demonstrating dependency-aware scheduling, "
    "Ready/Blocked states, critical path analysis, schedule propagation, and "
    "AI-assisted dependency planning."
)


def _specifications(start: date) -> list[dict]:
    start_time = datetime.combine(start, time.min)
    return [
        {"title": "Define Requirements", "description": "Confirm user journeys, delivery scope, and acceptance criteria for the software release.", "duration": 2, "status": TaskStatus.DONE, "planned_start_date": start_time},
        {"title": "Design Database Schema", "description": "Model the project, task, dependency, and scheduling data needed for the delivery workflow.", "duration": 3, "status": TaskStatus.DONE},
        {"title": "Build Backend API", "description": "Implement the project-scoped API, validation boundaries, and dependency-aware scheduling endpoints.", "duration": 4, "status": TaskStatus.IN_PROGRESS},
        {"title": "Build Authentication", "description": "Add secure identity, session, and authorization flows needed before release.", "duration": 3, "status": TaskStatus.REVIEW},
        {"title": "Build Frontend", "description": "Build the responsive workflow interface for tasks, schedules, and delivery visibility.", "duration": 4, "status": TaskStatus.BACKLOG},
        {"title": "Integrate Frontend and API", "description": "Connect the frontend workflow to the validated backend API contract.", "duration": 2, "status": TaskStatus.BACKLOG},
        {"title": "Write Integration Tests", "description": "Verify end-to-end task, dependency, scheduling, and persistence behavior.", "duration": 3, "status": TaskStatus.BACKLOG},
        {"title": "Security Review", "description": "Review authentication, data exposure, and deployment configuration before release.", "duration": 2, "status": TaskStatus.BACKLOG},
        {"title": "QA Testing", "description": "Execute acceptance, regression, and cross-browser validation for the release.", "duration": 2, "status": TaskStatus.BACKLOG},
        {"title": "Production Deployment", "description": "Prepare the verified release configuration and deploy the completed product.", "duration": 1, "status": TaskStatus.BACKLOG},
    ]


EDGE_TITLES = [
    ("Define Requirements", "Design Database Schema"),
    ("Design Database Schema", "Build Backend API"),
    ("Build Backend API", "Build Authentication"),
    ("Build Backend API", "Build Frontend"),
    ("Build Frontend", "Integrate Frontend and API"),
    ("Build Authentication", "Write Integration Tests"),
    ("Integrate Frontend and API", "Write Integration Tests"),
    ("Write Integration Tests", "Security Review"),
    ("Write Integration Tests", "QA Testing"),
    ("Security Review", "QA Testing"),
    ("QA Testing", "Production Deployment"),
]


def seed_demo(db) -> dict[str, int | bool]:
    """Ensure the named demo project, task set, and DAG edges exist without deleting data."""
    project = db.query(Project).filter(Project.name == DEMO_NAME).one_or_none()
    created_project = project is None
    if project is None:
        start = date.today() + timedelta(days=3)
        project = Project(name=DEMO_NAME, description=DEMO_DESCRIPTION, start_date=start, target_deadline=start + timedelta(days=25))
        db.add(project)
        db.flush()

    existing_tasks = {task.title: task for task in db.query(Task).filter(Task.project_id == project.id)}
    next_positions: dict[TaskStatus, int] = {}
    for status in TaskStatus:
        last = db.query(Task.position).filter(Task.project_id == project.id, Task.status == status).order_by(Task.position.desc()).first()
        next_positions[status] = (last[0] + 1) if last and last[0] is not None else 0

    for spec in _specifications(project.start_date or date.today()):
        if spec["title"] in existing_tasks:
            continue
        status = spec["status"]
        task = Task(**spec, project_id=project.id, board_column=status.value, position=next_positions[status])
        next_positions[status] += 1
        db.add(task)
        existing_tasks[task.title] = task
    db.flush()

    task_ids = [task.id for task in existing_tasks.values()]
    existing_edges = {
        (edge.predecessor_id, edge.successor_id)
        for edge in db.query(Dependency).filter(Dependency.predecessor_id.in_(task_ids), Dependency.successor_id.in_(task_ids))
    }
    for predecessor_title, successor_title in EDGE_TITLES:
        edge = (existing_tasks[predecessor_title].id, existing_tasks[successor_title].id)
        if edge not in existing_edges:
            db.add(Dependency(predecessor_id=edge[0], successor_id=edge[1]))
    db.commit()
    recompute_schedule(db, project.id)
    return {
        "created_project": created_project,
        "project_id": project.id,
        "task_count": db.query(Task).filter(Task.project_id == project.id).count(),
        "dependency_count": db.query(Dependency).join(Task, Dependency.predecessor_id == Task.id).filter(Task.project_id == project.id).count(),
    }


def main() -> None:
    Base.metadata.create_all(bind=engine)
    migrate_task_schedule_schema()
    migrate_project_schema()
    db = SessionLocal()
    try:
        result = seed_demo(db)
        action = "created" if result["created_project"] else "found"
        print(f"Demo project {action}: {DEMO_NAME} (id {result['project_id']})")
        print(f"Tasks: {result['task_count']}")
        print(f"Dependencies: {result['dependency_count']}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
