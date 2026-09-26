from collections import deque
from typing import Dict, Iterable, List, Tuple

from sqlalchemy.orm import Session

from app.models.dependency import Dependency
from app.models.task import Task


def calculate_critical_path_for_graph(tasks: Iterable[Task], edges: Iterable[Tuple[int, int]]) -> dict:
    """Calculate the longest task-duration path in O(V + E), plus sorting.

    A missing duration makes the weighted project analysis incomplete; durations
    are never guessed. Equal-length alternatives choose the lowest predecessor
    ID, then the lowest ending task ID, for a stable result.
    """
    tasks = sorted(tasks, key=lambda task: task.id)
    missing_duration_task_ids = [task.id for task in tasks if task.duration is None or task.duration < 0]
    if missing_duration_task_ids:
        return {
            "task_ids": [],
            "total_duration": 0,
            "tasks": [],
            "missing_duration_task_ids": missing_duration_task_ids,
            "is_complete": False,
        }

    task_by_id = {task.id: task for task in tasks}
    adjacency: Dict[int, List[int]] = {task.id: [] for task in tasks}
    indegree = {task.id: 0 for task in tasks}
    for predecessor_id, successor_id in sorted(edges):
        if predecessor_id in task_by_id and successor_id in task_by_id:
            adjacency[predecessor_id].append(successor_id)
            indegree[successor_id] += 1
    for successors in adjacency.values():
        successors.sort()

    queue = deque(sorted(task_id for task_id, degree in indegree.items() if degree == 0))
    distance = {task.id: task.duration for task in tasks}
    predecessor: Dict[int, int] = {}
    processed = 0
    while queue:
        task_id = queue.popleft()
        processed += 1
        for successor_id in adjacency[task_id]:
            candidate = distance[task_id] + task_by_id[successor_id].duration
            if candidate > distance[successor_id] or (
                candidate == distance[successor_id] and task_id < predecessor.get(successor_id, task_id + 1)
            ):
                distance[successor_id] = candidate
                predecessor[successor_id] = task_id
            indegree[successor_id] -= 1
            if indegree[successor_id] == 0:
                queue.append(successor_id)

    if processed != len(tasks):
        # Defensive only: the dependency endpoint should already make cycles impossible.
        return {"task_ids": [], "total_duration": 0, "tasks": [], "missing_duration_task_ids": [], "is_complete": False}
    if not tasks:
        return {"task_ids": [], "total_duration": 0, "tasks": [], "missing_duration_task_ids": [], "is_complete": True}

    end_task_id = min(task_id for task_id, value in distance.items() if value == max(distance.values()))
    path_ids = []
    current_id = end_task_id
    while True:
        path_ids.append(current_id)
        if current_id not in predecessor:
            break
        current_id = predecessor[current_id]
    path_ids.reverse()
    return {
        "task_ids": path_ids,
        "total_duration": distance[end_task_id],
        "tasks": [{"id": task_by_id[task_id].id, "title": task_by_id[task_id].title, "duration": task_by_id[task_id].duration} for task_id in path_ids],
        "missing_duration_task_ids": [],
        "is_complete": True,
    }


def calculate_critical_path(db: Session) -> dict:
    """Database adapter for the pure deterministic critical-path calculation."""
    tasks = db.query(Task).order_by(Task.id).all()
    edges = [
        (dependency.predecessor_id, dependency.successor_id)
        for dependency in db.query(Dependency).order_by(Dependency.predecessor_id, Dependency.successor_id)
    ]
    return calculate_critical_path_for_graph(tasks, edges)
