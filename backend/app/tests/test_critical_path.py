import pytest

from app.database import get_db
from app.models.dependency import Dependency
from app.models.task import Task
from app.services.critical_path import calculate_critical_path


@pytest.fixture
def db_session():
    session = next(get_db())
    yield session
    session.rollback()


def add_task(db_session, title, duration):
    task = Task(title=title, duration=duration)
    db_session.add(task)
    db_session.commit()
    db_session.refresh(task)
    return task


def add_edge(db_session, predecessor, successor):
    db_session.add(Dependency(predecessor_id=predecessor.id, successor_id=successor.id))
    db_session.commit()


def test_critical_path_for_simple_chain(db_session):
    a, b, c = (add_task(db_session, title, duration) for title, duration in [("A", 2), ("B", 3), ("C", 4)])
    add_edge(db_session, a, b)
    add_edge(db_session, b, c)

    result = calculate_critical_path(db_session)

    assert result["task_ids"] == [a.id, b.id, c.id]
    assert result["total_duration"] == 9
    assert result["is_complete"] is True


def test_critical_path_uses_longest_diamond_branch_without_double_counting(db_session):
    a, b, c, d = (add_task(db_session, title, duration) for title, duration in [("A", 2), ("B", 3), ("C", 5), ("D", 2)])
    add_edge(db_session, a, b)
    add_edge(db_session, a, c)
    add_edge(db_session, b, d)
    add_edge(db_session, c, d)

    result = calculate_critical_path(db_session)

    assert result["task_ids"] == [a.id, c.id, d.id]
    assert result["total_duration"] == 9


def test_critical_path_selects_longest_parallel_root_or_chain(db_session):
    a = add_task(db_session, "A", 10)
    b = add_task(db_session, "B", 2)
    c = add_task(db_session, "C", 3)
    add_edge(db_session, b, c)

    result = calculate_critical_path(db_session)

    assert result["task_ids"] == [a.id]
    assert result["total_duration"] == 10


def test_critical_path_breaks_equal_duration_ties_by_lowest_ending_task_id(db_session):
    a = add_task(db_session, "A", 2)
    b = add_task(db_session, "B", 2)
    c = add_task(db_session, "C", 3)
    d = add_task(db_session, "D", 3)
    add_edge(db_session, a, c)
    add_edge(db_session, b, d)

    result = calculate_critical_path(db_session)

    assert result["task_ids"] == [a.id, c.id]
    assert result["total_duration"] == 5


def test_critical_path_is_incomplete_when_duration_is_missing(db_session):
    known = add_task(db_session, "Known", 2)
    missing = add_task(db_session, "Missing", None)
    add_edge(db_session, known, missing)

    result = calculate_critical_path(db_session)

    assert result["is_complete"] is False
    assert result["missing_duration_task_ids"] == [missing.id]
    assert result["task_ids"] == []
