from dataclasses import dataclass, replace
from datetime import datetime, timedelta
from typing import Dict, Iterable, List, Optional, Set, Tuple

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.dependency import Dependency
from app.models.task import Task
from app.schemas.impact import ImpactChanges
from app.services.critical_path import calculate_critical_path_for_graph
from app.services.scheduling import recompute_schedule_for_graph


@dataclass
class SimulatedTask:
    id: int
    title: str
    duration: Optional[int]
    planned_start_date: Optional[datetime]
    start_date: Optional[datetime]
    end_date: Optional[datetime]


def _completion(tasks: Iterable[SimulatedTask]) -> Optional[datetime]:
    end_dates = [task.end_date for task in tasks if task.end_date is not None]
    return max(end_dates) if end_dates else None


def _downstream(task_id: int, successors: Dict[int, List[int]]) -> Set[int]:
    visited: Set[int] = set()
    stack = list(reversed(successors.get(task_id, [])))
    while stack:
        current = stack.pop()
        if current in visited:
            continue
        visited.add(current)
        stack.extend(reversed(successors.get(current, [])))
    return visited


def analyze_impact(db: Session, task_id: int, changes: ImpactChanges, project_id: int | None = None) -> dict:
    """Preview a task schedule change entirely in memory without mutating the session."""
    query = db.query(Task)
    if project_id is not None:
        query = query.filter(Task.project_id == project_id)
    source_tasks = query.order_by(Task.id).all()
    if task_id not in {task.id for task in source_tasks}:
        raise HTTPException(status_code=404, detail="Task not found")
    if not ({"duration", "start_date"} & changes.model_fields_set):
        raise HTTPException(status_code=422, detail="Provide a duration or start_date change for impact analysis")
    if "duration" in changes.model_fields_set and changes.duration is None:
        raise HTTPException(status_code=422, detail="duration cannot be null for impact analysis")
    if "start_date" in changes.model_fields_set and changes.start_date is None:
        raise HTTPException(status_code=422, detail="start_date cannot be null for impact analysis")

    dependency_query = db.query(Dependency).join(Task, Dependency.predecessor_id == Task.id)
    if project_id is not None:
        dependency_query = dependency_query.filter(Task.project_id == project_id)
    edges = [(item.predecessor_id, item.successor_id) for item in dependency_query.order_by(Dependency.predecessor_id, Dependency.successor_id)]
    predecessor_ids = {successor_id for _, successor_id in edges}
    before = {
        task.id: SimulatedTask(
            task.id,
            task.title,
            task.duration,
            task.planned_start_date if task.planned_start_date is not None else (task.start_date if task.id not in predecessor_ids else None),
            task.start_date,
            task.end_date,
        )
        for task in source_tasks
    }
    after = {task_id: replace(task) for task_id, task in before.items()}
    changed = after[task_id]
    if "duration" in changes.model_fields_set:
        changed.duration = changes.duration
    if "start_date" in changes.model_fields_set:
        changed.planned_start_date = changes.start_date

    recompute_schedule_for_graph(after.values(), edges)
    successors: Dict[int, List[int]] = {task.id: [] for task in source_tasks}
    for predecessor_id, successor_id in edges:
        successors[predecessor_id].append(successor_id)
    descendants = _downstream(task_id, successors)
    affected = []
    for descendant_id in sorted(descendants):
        old, new = before[descendant_id], after[descendant_id]
        if old.start_date != new.start_date or old.end_date != new.end_date:
            delta_source = (new.end_date - old.end_date) if old.end_date and new.end_date else (new.start_date - old.start_date) if old.start_date and new.start_date else None
            affected.append({"task_id": new.id, "title": new.title, "before_start": old.start_date, "after_start": new.start_date, "before_end": old.end_date, "after_end": new.end_date, "delay_days": delta_source.days if delta_source else None})

    before_completion, after_completion = _completion(before.values()), _completion(after.values())
    before_critical = calculate_critical_path_for_graph(before.values(), edges)
    after_critical = calculate_critical_path_for_graph(after.values(), edges)
    old, new = before[task_id], after[task_id]
    return {
        "task_id": task_id,
        "changed_task": {"title": new.title, "before": {"duration": old.duration, "start_date": old.start_date, "end_date": old.end_date}, "after": {"duration": new.duration, "start_date": new.start_date, "end_date": new.end_date}},
        "affected_tasks": affected,
        "affected_count": len(affected),
        "project_completion": {"before": before_completion, "after": after_completion, "delta_days": (after_completion - before_completion).days if before_completion and after_completion else None, "is_available": before_completion is not None and after_completion is not None},
        "critical_path": {"before_task_ids": before_critical["task_ids"], "after_task_ids": after_critical["task_ids"], "before_duration": before_critical["total_duration"], "after_duration": after_critical["total_duration"], "delta_duration": after_critical["total_duration"] - before_critical["total_duration"], "changed": before_critical["task_ids"] != after_critical["task_ids"] or before_critical["total_duration"] != after_critical["total_duration"], "is_complete": before_critical["is_complete"] and after_critical["is_complete"]},
    }
