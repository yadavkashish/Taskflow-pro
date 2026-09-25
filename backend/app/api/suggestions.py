from typing import List, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.services.llm_service import (
    LLMProviderError,
    LLMResponse,
    LLMService,
    get_dependency_suggestions,
)


router = APIRouter()


class TaskForSuggestion(BaseModel):
    id: int
    title: str = Field(min_length=1)
    description: Optional[str] = None


class SuggestionRequest(BaseModel):
    tasks: List[TaskForSuggestion]


class SuggestionResponse(LLMResponse):
    pass


@router.post(
    "/suggest-dependencies", response_model=List[SuggestionResponse]
)
async def suggest_dependencies(payload: SuggestionRequest):
    """Analyze a submitted task snapshot; returned edges require human acceptance."""
    if not LLMService.is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI suggestions are unavailable until an API key is configured.",
        )

    task_data = [task.model_dump() for task in payload.tasks]
    try:
        suggested = await get_dependency_suggestions(task_data)
    except LLMProviderError as exc:
        if exc.error_type == "AuthenticationError":
            detail = "AI suggestions are unavailable due to provider configuration."
            status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        elif exc.error_type == "RateLimitError":
            detail = "AI suggestions are temporarily unavailable due to provider quota or rate limits."
            status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        elif exc.error_type == "MalformedResponse":
            detail = "AI suggestions returned an invalid provider response. Please try again later."
            status_code = status.HTTP_502_BAD_GATEWAY
        else:
            detail = "AI suggestions are temporarily unavailable. Please try again later."
            status_code = status.HTTP_502_BAD_GATEWAY
        raise HTTPException(
            status_code=status_code,
            detail=detail,
        ) from None
    known_ids = {task["id"] for task in task_data}
    seen_edges = set()
    valid_suggestions = []
    for suggestion in suggested:
        edge = (suggestion.predecessor_id, suggestion.successor_id)
        if (
            edge[0] in known_ids
            and edge[1] in known_ids
            and edge[0] != edge[1]
            and edge not in seen_edges
        ):
            seen_edges.add(edge)
            valid_suggestions.append(suggestion)
    return valid_suggestions
