from datetime import date
from sqlalchemy.orm import Session
from app.models.project import Project
from app.models.task import Task

def get_deadline_status(db: Session, project: Project) -> dict:
    ends = [task.end_date.date() for task in db.query(Task).filter(Task.project_id == project.id) if task.end_date]
    completion = max(ends) if ends else None
    deadline = project.target_deadline
    if deadline is None: status, variance = "NO_DEADLINE", None
    elif completion is None: status, variance = "NO_SCHEDULE", None
    else:
        variance = (completion - deadline).days
        status = "ON_TRACK" if variance <= 0 else "AT_RISK"
    return {"target_deadline": deadline, "calculated_completion_date": completion, "variance_days": variance, "deadline_status": status}
