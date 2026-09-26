from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class ImpactChanges(BaseModel):
    duration: Optional[int] = Field(default=None, ge=0)
    start_date: Optional[datetime] = None


class ImpactAnalysisRequest(BaseModel):
    task_id: int
    changes: ImpactChanges


class ScheduleSnapshot(BaseModel):
    duration: Optional[int]
    start_date: Optional[datetime]
    end_date: Optional[datetime]


class ChangedTaskImpact(BaseModel):
    title: str
    before: ScheduleSnapshot
    after: ScheduleSnapshot


class AffectedTask(BaseModel):
    task_id: int
    title: str
    before_start: Optional[datetime]
    after_start: Optional[datetime]
    before_end: Optional[datetime]
    after_end: Optional[datetime]
    delay_days: Optional[int]


class ProjectCompletionImpact(BaseModel):
    before: Optional[datetime]
    after: Optional[datetime]
    delta_days: Optional[int]
    is_available: bool


class CriticalPathImpact(BaseModel):
    before_task_ids: List[int]
    after_task_ids: List[int]
    before_duration: int
    after_duration: int
    delta_duration: int
    changed: bool
    is_complete: bool


class ImpactAnalysisResponse(BaseModel):
    task_id: int
    changed_task: ChangedTaskImpact
    affected_tasks: List[AffectedTask]
    affected_count: int
    project_completion: ProjectCompletionImpact
    critical_path: CriticalPathImpact
