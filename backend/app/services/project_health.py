from collections import defaultdict

from sqlalchemy.orm import Session

from app.models.dependency import Dependency
from app.models.task import Task, TaskStatus
from app.services.critical_path import calculate_critical_path
from app.services.scheduling import get_dependency_state


def _is_done(task: Task) -> bool:
    return task.status == TaskStatus.DONE or task.status == TaskStatus.DONE.value


def _task_reference(task: Task) -> dict:
    return {"id": task.id, "title": task.title}


def analyze_project_health(db: Session) -> dict:
    """Build explainable health findings from the existing project domain rules."""
    tasks = db.query(Task).order_by(Task.id).all()
    dependencies = db.query(Dependency).order_by(Dependency.predecessor_id, Dependency.successor_id).all()
    task_by_id = {task.id: task for task in tasks}
    predecessors = defaultdict(list)
    for dependency in dependencies:
        if dependency.predecessor_id in task_by_id and dependency.successor_id in task_by_id:
            predecessors[dependency.successor_id].append(task_by_id[dependency.predecessor_id])

    critical_path = calculate_critical_path(db)
    critical_task_ids = set(critical_path["task_ids"])
    unfinished_tasks = [task for task in tasks if not _is_done(task)]
    dependency_states = {task.id: get_dependency_state(task, db) for task in unfinished_tasks}
    ready_tasks = [task for task in unfinished_tasks if dependency_states[task.id] == "READY"]
    blocked_tasks = [task for task in unfinished_tasks if dependency_states[task.id] == "BLOCKED"]

    blocked_details = []
    for task in blocked_tasks:
        waiting_for = [_task_reference(predecessor) for predecessor in predecessors[task.id] if not _is_done(predecessor)]
        blocked_details.append({
            **_task_reference(task),
            "critical": task.id in critical_task_ids,
            "waiting_for": waiting_for,
        })

    findings = []
    for blocked_task in blocked_details:
        if not blocked_task["critical"]:
            continue
        waiting_titles = ", ".join(task["title"] for task in blocked_task["waiting_for"])
        findings.append({
            "id": f"critical-task-blocked-{blocked_task['id']}",
            "severity": "high",
            "type": "critical_task_blocked",
            "title": "Critical task is blocked",
            "message": f"{blocked_task['title']} is waiting for {waiting_titles}.",
            "task_ids": [blocked_task["id"], *[task["id"] for task in blocked_task["waiting_for"]]],
            "waiting_for": blocked_task["waiting_for"],
        })

    missing_duration_tasks = [task for task in unfinished_tasks if task.duration is None or task.duration < 0]
    if missing_duration_tasks:
        findings.append({
            "id": "missing-duration",
            "severity": "medium",
            "type": "missing_duration",
            "title": "Missing duration information",
            "message": f"{len(missing_duration_tasks)} unfinished task{' is' if len(missing_duration_tasks) == 1 else 's are'} missing a valid duration, so Critical Path analysis may be incomplete.",
            "task_ids": [task.id for task in missing_duration_tasks],
            "waiting_for": [],
        })

    unscheduled_tasks = [task for task in unfinished_tasks if task.start_date is None or task.end_date is None]
    if unscheduled_tasks:
        findings.append({
            "id": "unscheduled-tasks",
            "severity": "medium",
            "type": "unscheduled_task",
            "title": "Unscheduled tasks",
            "message": f"{len(unscheduled_tasks)} unfinished task{' needs' if len(unscheduled_tasks) == 1 else 's need'} a complete schedule.",
            "task_ids": [task.id for task in unscheduled_tasks],
            "waiting_for": [],
        })

    noncritical_blocked = [detail for detail in blocked_details if not detail["critical"]]
    if noncritical_blocked:
        findings.append({
            "id": "blocked-non-critical-tasks",
            "severity": "medium",
            "type": "blocked_non_critical_task",
            "title": "Blocked non-critical tasks",
            "message": f"{len(noncritical_blocked)} task{' is' if len(noncritical_blocked) == 1 else 's are'} waiting on unfinished prerequisites.",
            "task_ids": [detail["id"] for detail in noncritical_blocked],
            "waiting_for": [],
        })

    has_high = any(finding["severity"] == "high" for finding in findings)
    has_medium = any(finding["severity"] == "medium" for finding in findings)
    scheduled_tasks = [task for task in tasks if task.start_date is not None and task.end_date is not None]
    project_completion_date = max((task.end_date for task in scheduled_tasks), default=None)

    return {
        "overall_status": "at_risk" if has_high else "attention" if has_medium else "healthy",
        "findings": findings,
        "metrics": {
            "total_tasks": len(tasks),
            "completed_tasks": len(tasks) - len(unfinished_tasks),
            "ready_unfinished_tasks": len(ready_tasks),
            "blocked_unfinished_tasks": len(blocked_tasks),
            "critical_task_count": len(critical_task_ids),
            "scheduled_tasks": len(scheduled_tasks),
            "unscheduled_tasks": len(unscheduled_tasks),
            "dependency_count": len(dependencies),
            "project_completion_date": project_completion_date,
            "critical_path_duration": critical_path["total_duration"] if critical_path["is_complete"] else None,
        },
        "ready_tasks": [
            {**_task_reference(task), "status": task.status.value if isinstance(task.status, TaskStatus) else task.status, "duration": task.duration}
            for task in ready_tasks
        ],
        "blocked_tasks": blocked_details,
        "critical_path": {
            "is_complete": critical_path["is_complete"],
            "duration": critical_path["total_duration"] if critical_path["is_complete"] else None,
            "task_ids": critical_path["task_ids"],
            "task_count": len(critical_task_ids),
            "missing_duration_task_ids": critical_path["missing_duration_task_ids"],
        },
    }
