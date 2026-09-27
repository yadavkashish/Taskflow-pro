"""HTTP boundary for advisory, non-persisted LLM dependency suggestions."""

from typing import Iterable

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.services.llm_service import LLMProviderError, LLMResponse, LLMService, get_dependency_suggestions


router = APIRouter()


class TaskForSuggestion(BaseModel):
    id: int
    title: str = Field(min_length=1)
    description: str | None = None


class SuggestionRequest(BaseModel):
    tasks: list[TaskForSuggestion]


class SuggestionResponse(LLMResponse):
    pass


def _provider_error(exc: LLMProviderError) -> HTTPException:
    if exc.error_type == "ConfigurationError":
        return HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="AI Assistant is not configured correctly.")
    if exc.error_type == "AuthenticationError":
        return HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="AI provider authentication failed.")
    if exc.error_type == "RateLimitError":
        return HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="AI suggestions are temporarily unavailable due to provider quota or rate limits. Please try again shortly.")
    if exc.error_type == "MalformedResponse":
        return HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="AI provider returned an invalid response.")
    if exc.error_type == "InvalidRequestError":
        return HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="AI provider rejected the suggestion request.")
    return HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="AI suggestions are currently unavailable. Please try again.")


async def suggest_dependencies_for_tasks(payload: SuggestionRequest, allowed_ids: set[int], existing_edges: Iterable[tuple[int, int]] = ()) -> list[SuggestionResponse]:
    """Run and filter suggestions; callers supply an authorized task scope."""
    if not LLMService().is_configured():
        raise _provider_error(LLMProviderError("ConfigurationError"))
    task_data = [task.model_dump() for task in payload.tasks]
    edge_set = set(existing_edges)
    try:
        suggested = await get_dependency_suggestions(task_data, edge_set)
    except LLMProviderError as exc:
        raise _provider_error(exc) from None

    seen_edges: set[tuple[int, int]] = set()
    valid = []
    for suggestion in suggested:
        edge = (suggestion.predecessor_id, suggestion.successor_id)
        if edge[0] in allowed_ids and edge[1] in allowed_ids and edge[0] != edge[1] and edge not in edge_set and edge not in seen_edges:
            seen_edges.add(edge)
            valid.append(suggestion)
    return valid


@router.post("/suggest-dependencies", response_model=list[SuggestionResponse])
async def suggest_dependencies(payload: SuggestionRequest):
    """Legacy endpoint; project routes provide database-backed authorization."""
    return await suggest_dependencies_for_tasks(payload, {task.id for task in payload.tasks})
