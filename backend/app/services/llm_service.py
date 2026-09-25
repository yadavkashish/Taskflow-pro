from typing import List, Dict, Any
import os
import json

from pydantic import BaseModel


class LLMResponse(BaseModel):
    task_id: str
    reason: str
    confidence: float


class LLMService:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")

    def suggest_dependencies(
        self,
        current_task: Dict[str, Any],
        existing_tasks: List[Dict[str, Any]]
    ) -> List[LLMResponse]:
        """
        Generate dependency suggestions.

        If no OpenAI API key is configured, return an empty list.
        This keeps deterministic backend tests independent of external APIs.
        """

        if not self.api_key:
            return []

        try:
            from openai import OpenAI

            client = OpenAI(api_key=self.api_key)

            prompt = self._create_prompt(
                current_task,
                existing_tasks
            )

            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0
            )

            content = response.choices[0].message.content or "[]"

            return self._parse_response(content)

        except Exception as e:
            print(f"Error communicating with LLM: {e}")
            return []

    def _create_prompt(
        self,
        current_task: Dict[str, Any],
        existing_tasks: List[Dict[str, Any]]
    ) -> str:

        existing_tasks_info = "\n".join(
            [
                (
                    f"ID: {task['id']}, "
                    f"Title: {task['title']}, "
                    f"Description: {task.get('description', '')}, "
                    f"Status: {task['status']}"
                )
                for task in existing_tasks
            ]
        )

        return (
            "Current task:\n"
            f"Title: {current_task['title']}\n"
            f"Description: {current_task.get('description', '')}\n\n"
            f"Existing tasks:\n{existing_tasks_info}\n\n"
            "Identify only plausible prerequisite relationships among "
            "the existing tasks.\n"
            "Return only a JSON array.\n"
            "Do not invent task IDs.\n"
            "If there is insufficient evidence, return an empty array.\n\n"
            "Each suggestion must contain:\n"
            '{"task_id": "ID", "reason": "reason", "confidence": 0.0}'
        )

    def _parse_response(self, content: str) -> List[LLMResponse]:
        try:
            data = json.loads(content)

            if not isinstance(data, list):
                return []

            return [
                LLMResponse(**item)
                for item in data
                if isinstance(item, dict)
            ]

        except Exception as e:
            print(f"Invalid LLM response: {e}")
            return []


async def get_dependency_suggestions(
    current_task: Any,
    existing_tasks: List[Any]
) -> List[LLMResponse]:
    """
    API-compatible wrapper used by suggestions.py.
    """

    service = LLMService()

    current_task_data = {
        "id": current_task.id,
        "title": current_task.title,
        "description": current_task.description,
        "status": current_task.status
    }

    existing_task_data = [
        {
            "id": task.id,
            "title": task.title,
            "description": task.description,
            "status": task.status
        }
        for task in existing_tasks
    ]

    return service.suggest_dependencies(
        current_task_data,
        existing_task_data
    )