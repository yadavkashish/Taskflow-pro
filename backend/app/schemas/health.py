from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel


class HealthTaskReference(BaseModel):
    id: int
    title: str


class ReadyTask(HealthTaskReference):
    status: str
    duration: Optional[int]


class BlockedTaskDetail(HealthTaskReference):
    critical: bool
    waiting_for: List[HealthTaskReference]


class HealthFinding(BaseModel):
    id: str
    severity: Literal["high", "medium"]
    type: str
    title: str
    message: str
    task_ids: List[int]
    waiting_for: List[HealthTaskReference] = []


class ProjectHealthMetrics(BaseModel):
    total_tasks: int
    completed_tasks: int
    ready_unfinished_tasks: int
    blocked_unfinished_tasks: int
    critical_task_count: int
    scheduled_tasks: int
    unscheduled_tasks: int
    dependency_count: int
    project_completion_date: Optional[datetime]
    critical_path_duration: Optional[int]


class CriticalPathHealthSnapshot(BaseModel):
    is_complete: bool
    duration: Optional[int]
    task_ids: List[int]
    task_count: int
    missing_duration_task_ids: List[int]


class ProjectHealthResponse(BaseModel):
    overall_status: Literal["healthy", "attention", "at_risk"]
    findings: List[HealthFinding]
    metrics: ProjectHealthMetrics
    ready_tasks: List[ReadyTask]
    blocked_tasks: List[BlockedTaskDetail]
    critical_path: CriticalPathHealthSnapshot
