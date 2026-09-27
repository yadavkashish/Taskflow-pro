"""Safely verify the active PostgreSQL schema without touching user data."""

from __future__ import annotations

import sys
from pathlib import Path
from uuid import uuid4


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app import config  # noqa: F401 - load backend/.env before database setup.
from app.database import Base, SessionLocal, engine, migrate_project_schema, migrate_task_schedule_schema
from app.models.dependency import Dependency
from app.models.project import Project
from app.models.task import Task


def main() -> None:
    if engine.dialect.name != "postgresql":
        print("Skipped: the active database dialect is not PostgreSQL.")
        return

    # create_all and the existing additive compatibility steps never drop data.
    Base.metadata.create_all(bind=engine)
    migrate_task_schedule_schema()
    migrate_project_schema()

    session = SessionLocal()
    project = None
    tasks: list[Task] = []
    try:
        project = Project(name=f"TaskFlow Pro PostgreSQL Verification {uuid4()}")
        session.add(project)
        session.flush()

        first = Task(project_id=project.id, title="Temporary schema verification predecessor", duration=1)
        second = Task(project_id=project.id, title="Temporary schema verification successor", duration=1)
        session.add_all([first, second])
        session.flush()
        session.add(Dependency(predecessor_id=first.id, successor_id=second.id))
        session.commit()
        tasks = [first, second]

        persisted_tasks = session.query(Task).filter(Task.project_id == project.id).count()
        persisted_dependencies = (
            session.query(Dependency)
            .filter(Dependency.predecessor_id == first.id, Dependency.successor_id == second.id)
            .count()
        )
        if persisted_tasks != 2 or persisted_dependencies != 1:
            raise RuntimeError("PostgreSQL verification records could not be read back")
        print("PostgreSQL verification passed: projects, tasks, and dependencies persisted and were read back.")
    finally:
        # Remove only records created by this unique verification run.
        try:
            task_ids = [task.id for task in tasks if task.id is not None]
            if task_ids:
                session.query(Dependency).filter(
                    Dependency.predecessor_id.in_(task_ids) | Dependency.successor_id.in_(task_ids)
                ).delete(synchronize_session=False)
                session.query(Task).filter(Task.id.in_(task_ids)).delete(synchronize_session=False)
            if project is not None and project.id is not None:
                session.query(Project).filter(Project.id == project.id).delete(synchronize_session=False)
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()


if __name__ == "__main__":
    main()
