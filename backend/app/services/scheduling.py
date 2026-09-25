from datetime import timedelta

from sqlalchemy.orm import Session

from app.models.task import Task, TaskStatus
from app.models.dependency import Dependency


def calculate_dates(task: Task, db: Session):
    """
    Calculate task end date from its start date and duration.
    """

    if task.start_date is None or task.duration is None:
        return task

    task.end_date = task.start_date + timedelta(days=task.duration)

    db.commit()
    db.refresh(task)

    return task


def get_dependency_state(task: Task, db: Session) -> str:
    """
    Derive readiness from predecessor dependencies without persisting it on Task.
    """

    dependencies = (
        db.query(Dependency)
        .filter(Dependency.successor_id == task.id)
        .all()
    )

    if not dependencies:
        return "READY"

    for dependency in dependencies:
        predecessor = (
            db.query(Task)
            .filter(Task.id == dependency.predecessor_id)
            .first()
        )

        if predecessor is None or predecessor.status != TaskStatus.DONE:
            return "BLOCKED"

    return "READY"


def update_task_status(task: Task, db: Session) -> str:
    """Backward-compatible entry point for callers needing derived state."""
    return get_dependency_state(task, db)
