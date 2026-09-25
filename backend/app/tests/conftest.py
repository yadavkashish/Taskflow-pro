from pathlib import Path

import pytest
from sqlalchemy import create_engine

import app.database as database
from app.models.dependency import Dependency
from app.models.task import Task


TEST_DATABASE_PATH = Path(__file__).resolve().parent / ".pytest-taskflow.db"
TEST_DATABASE_URL = f"sqlite:///{TEST_DATABASE_PATH.as_posix()}"


# This runs before test modules import app.main, so its startup hook and every
# SessionLocal reference use the isolated test database.
database.engine = create_engine(
    TEST_DATABASE_URL, connect_args={"check_same_thread": False}
)
database.SessionLocal.configure(bind=database.engine)


@pytest.fixture(autouse=True)
def isolated_database():
    database.Base.metadata.drop_all(bind=database.engine)
    database.Base.metadata.create_all(bind=database.engine)
    yield
    database.SessionLocal.remove() if hasattr(database.SessionLocal, "remove") else None
