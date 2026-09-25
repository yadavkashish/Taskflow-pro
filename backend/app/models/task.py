from sqlalchemy import Column, Integer, String, DateTime, Enum
from sqlalchemy.sql import func
from enum import Enum as PyEnum
from app.database import Base

class TaskStatus(PyEnum):
    BACKLOG = "backlog"
    IN_PROGRESS = "in_progress"
    REVIEW = "review"
    DONE = "done"

class Task(Base):
    __tablename__ = 'tasks'

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    status = Column(
        Enum(
            TaskStatus,
            values_callable=lambda statuses: [status.value for status in statuses],
            native_enum=False,
            validate_strings=True,
        ),
        default=TaskStatus.BACKLOG,
        nullable=False,
    )
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    duration = Column(Integer, nullable=True)  # Duration in days
    board_column = Column(String, nullable=True)
    position = Column(Integer, nullable=True)  # Order in the column
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
