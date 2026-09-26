from dataclasses import dataclass, replace
from datetime import datetime, timedelta
from typing import Dict, Iterable, List, Optional, Set, Tuple

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.dependency import Dependency
from app.models.task import Task
from app.schemas.impact import ImpactChanges
from app.services.critical_path import calculate_critical_path_for_graph


@dataclass
class SimulatedTask:
    id: int
    title: str
    duration: Optional[int]
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


def _propagate_dates(tasks: Dict[int, SimulatedTask], edges: List[Tuple[int, int]], task_id: int) -> None:
    """In-memory equivalent of DAGEngine.propagate_dates; never persists data."""
    predecessors: Dict[int, List[int]] = {task_key: [] for task_key in tasks}
    successors: Dict[int, List[int]] = {task_key: [] for task_key in tasks}
    for predecessor_id, successor_id in edges:
        predecessors[successor_id].append(predecessor_id)
        successors[predecessor_id].append(successor_id)
    for task_ids in predecessors.values():
        task_ids.sort()
    for task_ids in successors.values():
        task_ids.sort()

    queue = [task_id]
    while queue:
        predecessor_id = queue.pop(0)
        for successor_id in successors.get(predecessor_id, []):
            successor = tasks[successor_id]
            predecessor_ends = [tasks[item].end_date for item in predecessors[successor_id] if tasks[item].end_date is not None]
            if successor.start_date is not None and predecessor_ends:
                earliest_start = max(predecessor_ends)
                if successor.start_date < earliest_start:
                    successor.start_date = earliest_start
                    if successor.duration is not None:
                        successor.end_date = earliest_start + timedelta(days=successor.duration)
            queue.append(successor_id)


def analyze_impact(db: Session, task_id: int, changes: ImpactChanges) -> dict:
    """Preview a task schedule change entirely in memory without mutating the session."""
    source_tasks = db.query(Task).order_by(Task.id).all()
    if task_id not in {task.id for task in source_tasks}:
        raise HTTPException(status_code=404, detail="Task not found")
    if not ({"duration", "start_date"} & changes.model_fields_set):
        raise HTTPException(status_code=422, detail="Provide a duration or start_date change for impact analysis")
    if "duration" in changes.model_fields_set and changes.duration is None:
        raise HTTPException(status_code=422, detail="duration cannot be null for impact analysis")
    if "start_date" in changes.model_fields_set and changes.start_date is None:
        raise HTTPException(status_code=422, detail="start_date cannot be null for impact analysis")

    edges = [(item.predecessor_id, item.successor_id) for item in db.query(Dependency).order_by(Dependency.predecessor_id, Dependency.successor_id)]
    before = {task.id: SimulatedTask(task.id, task.title, task.duration, task.start_date, task.end_date) for task in source_tasks}
    after = {task_id: replace(task) for task_id, task in before.items()}
    changed = after[task_id]
    if "duration" in changes.model_fields_set:
        changed.duration = changes.duration
    if "start_date" in changes.model_fields_set:
        changed.start_date = changes.start_date
    if changed.start_date is not None and changed.duration is not None:
        changed.end_date = changed.start_date + timedelta(days=changed.duration)
    elif "start_date" in changes.model_fields_set or "duration" in changes.model_fields_set:
        changed.end_date = None

    _propagate_dates(after, edges, task_id)
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
