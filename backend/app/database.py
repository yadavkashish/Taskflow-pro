from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./taskflow.db")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def migrate_task_schedule_schema() -> None:
    """Add the explicit start constraint without dropping or recreating data.

    The project has no migration framework. Existing start dates have an
    unknowable origin, so the one-time migration preserves them as constraints.
    New schedules keep constraints and calculated dates separate.
    """
    inspector = inspect(engine)
    if "tasks" not in inspector.get_table_names():
        return
    column_names = {column["name"] for column in inspector.get_columns("tasks")}
    if "planned_start_date" in column_names:
        return
    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE tasks ADD COLUMN planned_start_date DATETIME"))
        connection.execute(text("UPDATE tasks SET planned_start_date = start_date WHERE start_date IS NOT NULL"))


def migrate_project_schema() -> None:
    """Add project ownership without recreating existing task data."""
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    if "tasks" not in tables:
        return
    with engine.begin() as connection:
        project_columns = {column["name"] for column in inspector.get_columns("projects")} if "projects" in tables else set()
        if "projects" in tables and "start_date" not in project_columns:
            connection.execute(text("ALTER TABLE projects ADD COLUMN start_date DATE"))
        if "projects" in tables and "target_deadline" not in project_columns:
            connection.execute(text("ALTER TABLE projects ADD COLUMN target_deadline DATE"))
        task_columns = {column["name"] for column in inspector.get_columns("tasks")}
        if "project_id" not in task_columns:
            connection.execute(text("ALTER TABLE tasks ADD COLUMN project_id INTEGER"))
        existing_task_count = connection.execute(text("SELECT COUNT(*) FROM tasks")).scalar_one()
        if existing_task_count:
            existing_project = None
            if "project" in tables:
                existing_project = connection.execute(text("SELECT name FROM project ORDER BY id LIMIT 1")).scalar_one_or_none()
            default_name = existing_project or "Existing TaskFlow Project"
            default_id = connection.execute(text("SELECT id FROM projects ORDER BY id LIMIT 1")).scalar_one_or_none()
            if default_id is None:
                connection.execute(text("INSERT INTO projects (name) VALUES (:name)"), {"name": default_name})
                default_id = connection.execute(text("SELECT id FROM projects ORDER BY id LIMIT 1")).scalar_one()
            connection.execute(text("UPDATE tasks SET project_id = :project_id WHERE project_id IS NULL"), {"project_id": default_id})
