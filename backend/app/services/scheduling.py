from collections import deque
from datetime import timedelta
from typing import Iterable, Tuple

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


def recompute_schedule_for_graph(tasks: Iterable, edges: Iterable[Tuple[int, int]]) -> None:
    """Recalculate every derived date from current constraints and DAG edges.

    Objects must expose id, planned_start_date, start_date, end_date and
    duration. A legacy object with only start_date is treated as having an
    explicit constraint once, preserving direct service callers predating the
    planned_start_date column.
    """
    tasks_by_id = {task.id: task for task in tasks}
    predecessors = {task_id: [] for task_id in tasks_by_id}
    successors = {task_id: [] for task_id in tasks_by_id}
    for predecessor_id, successor_id in sorted(edges):
        if predecessor_id in tasks_by_id and successor_id in tasks_by_id:
            predecessors[successor_id].append(predecessor_id)
            successors[predecessor_id].append(successor_id)
    for task_ids in predecessors.values():
        task_ids.sort()
    for task_ids in successors.values():
        task_ids.sort()

    indegree = {task_id: len(task_ids) for task_id, task_ids in predecessors.items()}
    queue = deque(sorted(task_id for task_id, degree in indegree.items() if degree == 0))
    processed = 0
    while queue:
        task_id = queue.popleft()
        processed += 1
        task = tasks_by_id[task_id]
        planned_start = getattr(task, "planned_start_date", None)
        if not hasattr(task, "planned_start_date") and task.start_date is not None:
            # Backward compatibility for direct model/service clients. API
            # callers always populate planned_start_date for manual starts.
            planned_start = task.start_date
            task.planned_start_date = planned_start
        predecessor_ends = [
            tasks_by_id[predecessor_id].end_date
            for predecessor_id in predecessors[task_id]
            if tasks_by_id[predecessor_id].end_date is not None
        ]
        candidates = ([planned_start] if planned_start is not None else []) + predecessor_ends
        task.start_date = max(candidates) if candidates else None
        task.end_date = task.start_date + timedelta(days=task.duration) if task.start_date is not None and task.duration is not None else None
        for successor_id in successors[task_id]:
            indegree[successor_id] -= 1
            if indegree[successor_id] == 0:
                queue.append(successor_id)

    if processed != len(tasks_by_id):
        raise ValueError("Cannot schedule a cyclic dependency graph")


def recompute_schedule(db: Session, project_id: int | None = None) -> None:
    """Persist a deterministic full-DAG schedule recalculation."""
    query = db.query(Task)
    if project_id is not None:
        query = query.filter(Task.project_id == project_id)
    tasks = query.order_by(Task.id).all()
    dependency_query = db.query(Dependency).join(Task, Dependency.predecessor_id == Task.id)
    if project_id is not None:
        dependency_query = dependency_query.filter(Task.project_id == project_id)
    edges = [
        (dependency.predecessor_id, dependency.successor_id)
        for dependency in dependency_query.order_by(Dependency.predecessor_id, Dependency.successor_id)
    ]
    recompute_schedule_for_graph(tasks, edges)
    db.commit()


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
            .filter(Task.id == dependency.predecessor_id, Task.project_id == task.project_id)
            .first()
        )

        if predecessor is None or predecessor.status != TaskStatus.DONE:
            return "BLOCKED"

    return "READY"


def update_task_status(task: Task, db: Session) -> str:
    """Backward-compatible entry point for callers needing derived state."""
    return get_dependency_state(task, db)
