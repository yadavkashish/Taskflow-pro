"""Bounded provider integration for advisory dependency suggestions."""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any, Iterable

from pydantic import BaseModel, Field


logger = logging.getLogger(__name__)


GROQ_DEPENDENCY_SUGGESTIONS_SCHEMA = {
    "type": "object",
    "properties": {
        "suggestions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "predecessor_id": {"type": "integer"},
                    "successor_id": {"type": "integer"},
                    "reason": {"type": "string"},
                    "confidence": {"type": "number", "minimum": 0, "maximum": 1},
                },
                "required": ["predecessor_id", "successor_id", "reason", "confidence"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["suggestions"],
    "additionalProperties": False,
}


class LLMResponse(BaseModel):
    predecessor_id: int
    successor_id: int
    reason: str = Field(min_length=1, max_length=500)
    confidence: float = Field(ge=0, le=1)


class LLMResponseEnvelope(BaseModel):
    suggestions: list[LLMResponse]


class LLMProviderError(Exception):
    """A provider failure that is safe to report without provider internals."""

    def __init__(self, error_type: str):
        self.error_type = error_type
        super().__init__(error_type)


class LLMService:
    @property
    def provider(self) -> str:
        return os.getenv("AI_PROVIDER", "openai").strip().lower()

    @property
    def openai_model(self) -> str:
        return os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    @property
    def gemini_model(self) -> str:
        model = os.getenv("GEMINI_MODEL", "").strip()
        if not model:
            raise LLMProviderError("ConfigurationError")
        return model

    @property
    def groq_model(self) -> str:
        model = os.getenv("GROQ_MODEL", "").strip()
        if not model:
            raise LLMProviderError("ConfigurationError")
        return model

    @staticmethod
    def _has_value(name: str) -> bool:
        return bool(os.getenv(name, "").strip())

    def is_configured(self) -> bool:
        if self.provider == "groq":
            return self._has_value("GROQ_API_KEY") and self._has_value("GROQ_MODEL")
        if self.provider == "gemini":
            return self._has_value("GEMINI_API_KEY") and self._has_value("GEMINI_MODEL")
        if self.provider == "openai":
            return self._has_value("OPENAI_API_KEY")
        return False

    def suggest_dependencies(self, tasks: list[dict[str, Any]], existing_edges: Iterable[tuple[int, int]] = ()) -> list[LLMResponse]:
        """Return suggestions only; this service never writes dependencies."""
        if not self.is_configured():
            raise LLMProviderError("ConfigurationError")
        prompt = self._create_prompt(tasks, existing_edges)
        if self.provider == "groq":
            return self._suggest_with_groq(prompt)
        if self.provider == "gemini":
            return self._suggest_with_gemini(prompt)
        if self.provider == "openai":
            return self._suggest_with_openai(prompt)
        raise LLMProviderError("ConfigurationError")

    def _suggest_with_groq(self, prompt: str) -> list[LLMResponse]:
        try:
            from groq import Groq

            client = Groq(api_key=os.environ["GROQ_API_KEY"], timeout=20.0, max_retries=0)
            try:
                try:
                    response = self._create_groq_completion(client, prompt)
                except Exception as exc:
                    if not self._is_groq_json_generation_error(exc):
                        raise
                    logger.warning(
                        "Groq JSON generation failed; retrying once with the repair prompt: status=%s message=%s",
                        getattr(exc, "status_code", None),
                        self._safe_provider_message(exc),
                    )
                    response = self._create_groq_completion(client, self._create_groq_repair_prompt(prompt))
                return self._parse_response(response.choices[0].message.content or "")
            finally:
                client.close()
        except LLMProviderError:
            raise
        except Exception as exc:
            error_type = self._safe_error_type(exc)
            logger.warning(
                "Groq dependency suggestion request failed: status=%s category=%s message=%s",
                getattr(exc, "status_code", None),
                error_type,
                self._safe_provider_message(exc),
            )
            raise LLMProviderError(error_type) from exc

    def _create_groq_completion(self, client: Any, prompt: str) -> Any:
        return client.chat.completions.create(
            model=self.groq_model,
            messages=[
                {
                    "role": "system",
                    "content": "You are a careful project-planning assistant. Return only one JSON object that conforms to the supplied response schema.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0,
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "dependency_suggestions",
                    "strict": True,
                    "schema": GROQ_DEPENDENCY_SUGGESTIONS_SCHEMA,
                },
            },
        )

    @staticmethod
    def _create_groq_repair_prompt(prompt: str) -> str:
        return (
            "OUTPUT REQUIREMENTS:\n"
            "Return exactly one valid JSON object. No markdown, explanation, or surrounding text.\n"
            "The first character must be { and the final character must be }.\n"
            "Never return a bare array.\n"
            "Use this exact top-level shape: {\"suggestions\": []}.\n\n"
            f"{prompt}"
        )

    def _suggest_with_gemini(self, prompt: str) -> list[LLMResponse]:
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
            try:
                response = client.models.generate_content(
                    model=self.gemini_model,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=0,
                        response_mime_type="application/json",
                        response_schema=LLMResponseEnvelope,
                    ),
                )
                return self._parse_response(response.text or "")
            finally:
                client.close()
        except LLMProviderError:
            raise
        except Exception as exc:
            error_type = self._safe_error_type(exc)
            logger.warning("Gemini dependency suggestion request failed: %s", error_type)
            raise LLMProviderError(error_type) from exc

    def _suggest_with_openai(self, prompt: str) -> list[LLMResponse]:
        try:
            from openai import OpenAI

            response = OpenAI(api_key=os.environ["OPENAI_API_KEY"], timeout=20.0, max_retries=0).chat.completions.create(
                model=self.openai_model,
                messages=[
                    {"role": "system", "content": "You are a careful project-planning assistant. Return only the requested JSON object."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0,
                response_format={"type": "json_object"},
            )
            return self._parse_response(response.choices[0].message.content or "")
        except LLMProviderError:
            raise
        except Exception as exc:
            error_type = self._safe_error_type(exc)
            logger.warning("OpenAI dependency suggestion request failed: %s", error_type)
            raise LLMProviderError(error_type) from exc

    @staticmethod
    def _safe_error_type(exc: Exception) -> str:
        name = type(exc).__name__
        status_code = getattr(exc, "status_code", None) or getattr(exc, "code", None)
        if status_code == 429 or "ResourceExhausted" in name or "RateLimit" in name:
            return "RateLimitError"
        if status_code == 404 or "NotFound" in name or "ModelNotFound" in name:
            return "ModelNotFoundError"
        if status_code in {401, 403} or "Authentication" in name or "Unauthorized" in name or "PermissionDenied" in name:
            return "AuthenticationError"
        if status_code == 400 or "BadRequest" in name:
            return "InvalidRequestError"
        if "Timeout" in name or "DeadlineExceeded" in name:
            return "TimeoutError"
        return name

    @staticmethod
    def _safe_provider_message(exc: Exception) -> str:
        """Return a bounded provider diagnostic without credentials or response payloads."""
        body = getattr(exc, "body", None)
        if isinstance(body, dict):
            error = body.get("error", body)
            if isinstance(error, dict) and isinstance(error.get("message"), str):
                message = error["message"]
            else:
                message = type(exc).__name__
        else:
            message = str(exc) or type(exc).__name__
        message = re.sub(r"gsk_[A-Za-z0-9_-]+", "[REDACTED]", message)
        message = re.sub(r"Bearer\s+\S+", "Bearer [REDACTED]", message, flags=re.IGNORECASE)
        return " ".join(message.split())[:500]

    @classmethod
    def _is_groq_json_generation_error(cls, exc: Exception) -> bool:
        if getattr(exc, "status_code", None) != 400:
            return False
        body = getattr(exc, "body", None)
        if isinstance(body, dict):
            error = body.get("error", body)
            if isinstance(error, dict) and error.get("code") == "json_validate_failed":
                return True
        message = cls._safe_provider_message(exc).lower()
        return "failed to validate json" in message or "failed to generate json" in message

    @staticmethod
    def _create_prompt(tasks: list[dict[str, Any]], existing_edges: Iterable[tuple[int, int]]) -> str:
        task_details = [{"id": task["id"], "title": task["title"], "description": task.get("description") or ""} for task in tasks]
        return (
            "You are a dependency analysis assistant for a project management system.\n"
            "You are given the EXISTING tasks for one project. Suggest prerequisite relationships only.\n"
            "A dependency predecessor_id = A, successor_id = B means task A must be completed before task B can proceed.\n"
            "DEPENDENCY RULES:\n"
            "1. ONLY use task IDs supplied below. NEVER invent tasks or IDs.\n"
            "2. Suggest a dependency only when the predecessor is genuinely required before the successor can proceed.\n"
            "3. Do not suggest relationships merely because tasks are related.\n"
            "4. Never suggest self-dependencies or dependencies already present.\n"
            "5. Prefer fewer high-quality suggestions. If evidence is insufficient, return no suggestions.\n"
            "OUTPUT REQUIREMENTS:\n"
            "Return ONE JSON object. The first character must be { and the final character must be }.\n"
            "Never return a bare array, markdown fence, commentary, or text before or after the JSON.\n"
            "Schema:\n"
            '{"suggestions":[{"predecessor_id":1,"successor_id":2,"reason":"brief requirement","confidence":0.9}]}\n'
            "If none are warranted, return exactly {\"suggestions\": []}.\n\n"
            f"Existing project tasks:\n{json.dumps(task_details, ensure_ascii=False)}\n"
            f"Existing dependency edges [predecessor_id, successor_id]:\n{json.dumps(sorted(existing_edges))}"
        )

    @staticmethod
    def _parse_response(content: str) -> list[LLMResponse]:
        try:
            normalized = content.strip()
            if normalized.startswith("```"):
                normalized = normalized.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
            data = json.loads(normalized)
            items = data.get("suggestions") if isinstance(data, dict) else data
            if not isinstance(items, list):
                raise ValueError("Expected a suggestions array")
            parsed = []
            for item in items:
                if not isinstance(item, dict):
                    continue
                try:
                    parsed.append(LLMResponse.model_validate(item))
                except ValueError:
                    continue
            return parsed
        except (json.JSONDecodeError, ValueError) as exc:
            logger.warning("Dependency suggestion response parsing failed: %s", type(exc).__name__)
            raise LLMProviderError("MalformedResponse") from exc


async def get_dependency_suggestions(tasks: list[dict[str, Any]], existing_edges: Iterable[tuple[int, int]] = ()) -> list[LLMResponse]:
    return LLMService().suggest_dependencies(tasks, existing_edges)
