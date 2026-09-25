from typing import Any, Dict, List
import json
import logging
import os

from pydantic import BaseModel, Field


logger = logging.getLogger(__name__)


class LLMResponse(BaseModel):
    """An advisory dependency edge returned by the language model."""

    predecessor_id: int
    successor_id: int
    reason: str = Field(min_length=1)
    confidence: float = Field(ge=0, le=1)


class LLMProviderError(Exception):
    """A provider failure that is safe to report without provider internals."""

    def __init__(self, error_type: str):
        self.error_type = error_type
        super().__init__(error_type)


class LLMService:
    model = "gpt-4o-mini"

    @staticmethod
    def is_configured() -> bool:
        return bool(os.getenv("OPENAI_API_KEY"))

    def suggest_dependencies(self, tasks: List[Dict[str, Any]]) -> List[LLMResponse]:
        """Return suggestions only; this service never writes dependencies."""
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            return []

        try:
            from openai import OpenAI

            response = OpenAI(api_key=api_key).chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": self._create_prompt(tasks)}],
                temperature=0,
            )
            return self._parse_response(response.choices[0].message.content or "[]")
        except Exception as exc:
            # Error type is sufficient for diagnostics; never log request headers or keys.
            error_type = type(exc).__name__
            logger.warning("OpenAI request failed: %s", error_type)
            raise LLMProviderError(error_type) from exc

    @staticmethod
    def _create_prompt(tasks: List[Dict[str, Any]]) -> str:
        task_details = "\n".join(
            f"ID: {task['id']}; Title: {task['title']}; "
            f"Description: {task.get('description') or ''}"
            for task in tasks
        )
        return (
            "Analyze these project tasks for plausible prerequisite relationships.\n"
            "A predecessor must be completed before its successor can start.\n"
            "Return only a JSON array. Do not invent IDs, suggest self-dependencies, "
            "or return an edge unless there is evidence.\n"
            "Each item must be: "
            '{"predecessor_id": 1, "successor_id": 2, '
            '"reason": "...", "confidence": 0.0}.\n\n'
            f"Tasks:\n{task_details}"
        )

    @staticmethod
    def _parse_response(content: str) -> List[LLMResponse]:
        try:
            if content.startswith("```"):
                content = content.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
            data = json.loads(content)
            if not isinstance(data, list):
                raise ValueError("Expected a JSON array")
            suggestions = []
            for item in data:
                if not isinstance(item, dict):
                    continue
                try:
                    suggestions.append(LLMResponse.model_validate(item))
                except ValueError:
                    # Individual malformed suggestions are safely ignored.
                    continue
            return suggestions
        except (json.JSONDecodeError, ValueError) as exc:
            logger.warning("OpenAI response parsing failed: %s", type(exc).__name__)
            raise LLMProviderError("MalformedResponse") from exc


async def get_dependency_suggestions(tasks: List[Dict[str, Any]]) -> List[LLMResponse]:
    return LLMService().suggest_dependencies(tasks)
