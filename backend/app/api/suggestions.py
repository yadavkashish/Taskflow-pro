from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List

from app.services.llm_service import get_dependency_suggestions
from app.schemas.task import Task


router = APIRouter()


class SuggestionResponse(BaseModel):
    task_id: str
    reason: str
    confidence: float


@router.post(
    "/suggest-dependencies",
    response_model=List[SuggestionResponse]
)
async def suggest_dependencies(
    current_task: Task,
    existing_tasks: List[Task]
):
    try:
        suggestions = await get_dependency_suggestions(
            current_task,
            existing_tasks
        )

        return suggestions

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )