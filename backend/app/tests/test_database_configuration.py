from sqlalchemy.dialects import postgresql
from sqlalchemy.schema import CreateTable

import app.database as database
from app.models import dependency, project, task  # noqa: F401 - register all tables


def test_sqlite_engine_uses_only_sqlite_connection_arguments(monkeypatch):
    captured = {}

    def fake_create_engine(url, **kwargs):
        captured["url"] = url
        captured["kwargs"] = kwargs
        return object()

    monkeypatch.setattr(database, "create_engine", fake_create_engine)
    database.create_database_engine("sqlite:///:memory:")

    assert captured == {
        "url": "sqlite:///:memory:",
        "kwargs": {"connect_args": {"check_same_thread": False}},
    }


def test_postgresql_engine_and_models_are_portable_without_a_live_connection(monkeypatch):
    captured = {}

    def fake_create_engine(url, **kwargs):
        captured["url"] = url
        captured["kwargs"] = kwargs
        return object()

    monkeypatch.setattr(database, "create_engine", fake_create_engine)
    database.create_database_engine("postgresql+psycopg://user:password@localhost/taskflow")

    import psycopg  # noqa: F401 - verify the configured driver is importable.

    compiled_tables = {
        table.name: str(CreateTable(table).compile(dialect=postgresql.dialect()))
        for table in database.Base.metadata.sorted_tables
    }
    assert captured == {
        "url": "postgresql+psycopg://user:password@localhost/taskflow",
        "kwargs": {},
    }
    assert {"projects", "tasks", "dependencies"}.issubset(compiled_tables)
    assert all(statement.startswith("\nCREATE TABLE") for statement in compiled_tables.values())
