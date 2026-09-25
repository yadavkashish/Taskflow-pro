from datetime import timedelta
from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.dependency import Dependency
from app.models.task import Task, TaskStatus


class DAGEngine:
    """Dependency graph logic with database and deterministic in-memory modes.

    API callers provide a SQLAlchemy session.  The no-session mode is an
    explicit, deterministic graph used by the unit-level DAG contract.
    """

    def __init__(self, db: Optional[Session] = None):
        self.db = db
        self._tasks = {} if db is None else None
        self._edges = set() if db is None else None

    @property
    def _in_memory(self) -> bool:
        return self.db is None

    def add_task(self, task: Task) -> None:
        if not self._in_memory:
            raise RuntimeError("add_task is only available for in-memory DAGs")
        self._tasks[task.id] = task

    def get_dependencies(self):
        if self._in_memory:
            return sorted(self._edges)
        return [
            (dependency.predecessor_id, dependency.successor_id)
            for dependency in self.db.query(Dependency).order_by(
                Dependency.predecessor_id, Dependency.successor_id
            )
        ]

    def can_add_dependency(self, predecessor_id: int, successor_id: int) -> bool:
        return predecessor_id != successor_id and not self._creates_cycle(
            predecessor_id, successor_id
        )

    def add_dependency(self, predecessor_id: int, successor_id: int):
        if predecessor_id == successor_id:
            raise HTTPException(status_code=409, detail="CYCLE_DETECTED")
        if not self.can_add_dependency(predecessor_id, successor_id):
            raise HTTPException(status_code=409, detail="CYCLE_DETECTED")

        if self._in_memory:
            edge = (predecessor_id, successor_id)
            if edge in self._edges:
                raise HTTPException(status_code=409, detail="DUPLICATE_DEPENDENCY")
            self._edges.add(edge)
            return edge

        if self.db.query(Dependency).filter_by(
            predecessor_id=predecessor_id, successor_id=successor_id
        ).first():
            raise HTTPException(status_code=409, detail="DUPLICATE_DEPENDENCY")

        dependency = Dependency(
            predecessor_id=predecessor_id, successor_id=successor_id
        )
        try:
            self.db.add(dependency)
            self.db.commit()
            self.db.refresh(dependency)
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(status_code=409, detail="DUPLICATE_DEPENDENCY") from None

        predecessor = self.db.get(Task, predecessor_id)
        if predecessor is not None:
            self.propagate_dates(predecessor)
        return dependency

    def _successors(self, task_id: int) -> List[int]:
        if self._in_memory:
            return [successor for predecessor, successor in self._edges if predecessor == task_id]
        return [
            successor for (successor,) in self.db.query(Dependency.successor_id).filter(
                Dependency.predecessor_id == task_id
            )
        ]

    def _predecessors(self, task_id: int) -> List[int]:
        if self._in_memory:
            return [predecessor for predecessor, successor in self._edges if successor == task_id]
        return [
            predecessor for (predecessor,) in self.db.query(Dependency.predecessor_id).filter(
                Dependency.successor_id == task_id
            )
        ]

    def _creates_cycle(self, predecessor_id: int, successor_id: int) -> bool:
        """An edge A -> B cycles exactly when B already reaches A."""
        visited = set()
        stack = [successor_id]
        while stack:
            current = stack.pop()
            if current == predecessor_id:
                return True
            if current not in visited:
                visited.add(current)
                stack.extend(self._successors(current))
        return False

    @staticmethod
    def _status_value(status) -> str:
        return status.value if isinstance(status, TaskStatus) else status

    def dependency_state(self, task_id: int) -> str:
        """Return READY/BLOCKED as derived state; never persist it on Task."""
        predecessor_ids = self._predecessors(task_id)
        if not predecessor_ids:
            return "READY"
        if self._in_memory:
            predecessors = [self._tasks.get(task_id) for task_id in predecessor_ids]
        else:
            predecessors = [self.db.get(Task, task_id) for task_id in predecessor_ids]
        return (
            "READY"
            if all(task is not None and self._status_value(task.status) == TaskStatus.DONE.value for task in predecessors)
            else "BLOCKED"
        )

    def get_task_status(self, task_id: int) -> str:
        return self.dependency_state(task_id)

    def update_task_status(self, task_id: int, status) -> None:
        """Update only a valid stored status; dependent state remains derived."""
        value = self._status_value(status)
        try:
            status_value = TaskStatus(value)
        except ValueError:
            raise ValueError("Invalid task status") from None
        task = self._tasks.get(task_id) if self._in_memory else self.db.get(Task, task_id)
        if task is None:
            raise KeyError(task_id)
        task.status = status_value
        if not self._in_memory:
            self.db.commit()

    def get_ready_tasks(self) -> List[Task]:
        tasks = self._tasks.values() if self._in_memory else self.db.query(Task).all()
        return [task for task in tasks if self.dependency_state(task.id) == "READY"]

    def get_blocked_tasks(self) -> List[Task]:
        tasks = self._tasks.values() if self._in_memory else self.db.query(Task).all()
        return [task for task in tasks if self.dependency_state(task.id) == "BLOCKED"]

    def update_task_dates(self, task_id: int, days: int) -> None:
        task = self._tasks.get(task_id) if self._in_memory else self.db.get(Task, task_id)
        if task is None:
            raise KeyError(task_id)
        if task.start_date is not None:
            task.start_date += timedelta(days=days)
        if task.end_date is not None:
            task.end_date += timedelta(days=days)
        self.propagate_dates(task)

    def get_task_start_date(self, task_id: int):
        task = self._tasks.get(task_id) if self._in_memory else self.db.get(Task, task_id)
        return task.start_date

    def get_task_end_date(self, task_id: int):
        task = self._tasks.get(task_id) if self._in_memory else self.db.get(Task, task_id)
        return task.end_date

    def get_task_dates(self, task_id: int):
        return (self.get_task_start_date(task_id), self.get_task_end_date(task_id))

    def propagate_dates(self, task: Task) -> None:
        """Push dates downstream using the maximum predecessor completion date."""
        queue = [task.id]
        changed = False
        while queue:
            predecessor_id = queue.pop(0)
            for successor_id in self._successors(predecessor_id):
                successor = self._tasks.get(successor_id) if self._in_memory else self.db.get(Task, successor_id)
                predecessors = [
                    self._tasks.get(task_id) if self._in_memory else self.db.get(Task, task_id)
                    for task_id in self._predecessors(successor_id)
                ]
                predecessor_ends = [
                    predecessor.end_date for predecessor in predecessors
                    if predecessor is not None and predecessor.end_date is not None
                ]
                if successor and successor.start_date and predecessor_ends:
                    earliest_start = max(predecessor_ends)
                    if successor.start_date < earliest_start:
                        successor.start_date = earliest_start
                        if successor.duration is not None:
                            successor.end_date = earliest_start + timedelta(days=successor.duration)
                        changed = True
                queue.append(successor_id)
        if changed and not self._in_memory:
            self.db.commit()
