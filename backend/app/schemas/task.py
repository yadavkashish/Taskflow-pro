from pydantic import BaseModel, ConfigDict, field_validator
from datetime import datetime
from typing import Literal, Optional, List

from app.models.task import TaskStatus


TaskStatusValue = Literal["backlog", "in_progress", "review", "done"]

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: TaskStatusValue = "backlog"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    duration: Optional[int] = None  # Duration in days
    board_column: Optional[str] = None
    position: Optional[int] = None

    @field_validator("status", mode="before")
    @classmethod
    def serialize_task_status(cls, value):
        return value.value if isinstance(value, TaskStatus) else value

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatusValue] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    duration: Optional[int] = None
    board_column: Optional[str] = None
    position: Optional[int] = None

class Task(TaskBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TaskInDB(Task):
    dependencies: List[int] = []  # List of dependency IDs
    dependents: List[int] = []  # List of dependent task IDs
