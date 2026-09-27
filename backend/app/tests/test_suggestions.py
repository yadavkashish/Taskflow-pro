import sys
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.api import suggestions
from app.main import app
from app.services.llm_service import LLMProviderError, LLMResponse, LLMService


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(autouse=True)
def use_mock_openai_provider(monkeypatch):
    """Keep automated tests independent from an ignored local Gemini .env."""
    monkeypatch.setenv("AI_PROVIDER", "openai")
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_MODEL", raising=False)
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.delenv("GROQ_MODEL", raising=False)


def create_project(client, name="AI Project"):
    return client.post("/projects/", json={"name": name}).json()


def create_task(client, project_id, title, description="Task description"):
    return client.post(f"/projects/{project_id}/tasks", json={"title": title, "description": description, "duration": 1}).json()


def test_suggestions_are_advisory_and_filtered(client, monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    async def fake_suggestions(tasks, existing_edges):
        assert existing_edges == set()
        assert tasks == [{"id": 1, "title": "Schema", "description": "Create tables"}, {"id": 2, "title": "API", "description": None}]
        return [
            LLMResponse(predecessor_id=1, successor_id=2, reason="API needs tables", confidence=0.91),
            LLMResponse(predecessor_id=1, successor_id=2, reason="duplicate", confidence=0.5),
            LLMResponse(predecessor_id=1, successor_id=1, reason="self edge", confidence=0.5),
            LLMResponse(predecessor_id=99, successor_id=2, reason="unknown task", confidence=0.5),
        ]

    monkeypatch.setattr(suggestions, "get_dependency_suggestions", fake_suggestions)
    response = client.post("/suggestions/suggest-dependencies", json={"tasks": [{"id": 1, "title": "Schema", "description": "Create tables"}, {"id": 2, "title": "API", "description": None}]})
    assert response.status_code == 200
    assert response.json() == [{"predecessor_id": 1, "successor_id": 2, "reason": "API needs tables", "confidence": 0.91}]


def test_project_suggestions_are_grounded_filtered_and_not_persisted(client, monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    project = create_project(client)
    schema = create_task(client, project["id"], "Schema", "Real database schema details")
    api = create_task(client, project["id"], "API", "Uses the persisted schema")
    tests = create_task(client, project["id"], "Tests", "Verify API behavior")
    other_project = create_project(client, "Other Project")
    foreign = create_task(client, other_project["id"], "Foreign", "Must never be sent")
    assert client.post(f"/projects/{project['id']}/dependencies", json={"predecessor_id": schema["id"], "successor_id": api["id"]}).status_code == 201

    async def fake_suggestions(tasks, existing_edges):
        assert {item["id"] for item in tasks} == {schema["id"], api["id"], tests["id"]}
        assert tasks[0]["title"] != "Spoofed title"
        assert (schema["id"], api["id"]) in existing_edges
        return [
            LLMResponse(predecessor_id=api["id"], successor_id=tests["id"], reason="Tests need the API", confidence=0.88),
            LLMResponse(predecessor_id=schema["id"], successor_id=api["id"], reason="Already exists", confidence=0.9),
            LLMResponse(predecessor_id=foreign["id"], successor_id=tests["id"], reason="Foreign", confidence=0.9),
            LLMResponse(predecessor_id=tests["id"], successor_id=tests["id"], reason="Self", confidence=0.9),
        ]

    monkeypatch.setattr(suggestions, "get_dependency_suggestions", fake_suggestions)
    response = client.post(f"/projects/{project['id']}/suggestions/suggest-dependencies", json={"tasks": [{"id": schema["id"], "title": "Spoofed title"}, {"id": api["id"], "title": "Spoofed title"}, {"id": tests["id"], "title": "Spoofed title"}]})
    assert response.status_code == 200
    assert response.json() == [{"predecessor_id": api["id"], "successor_id": tests["id"], "reason": "Tests need the API", "confidence": 0.88}]
    edges = client.get(f"/projects/{project['id']}/dependencies").json()
    assert len(edges) == 1
    assert (edges[0]["predecessor_id"], edges[0]["successor_id"]) == (schema["id"], api["id"])


def test_project_suggestions_reject_cross_project_input_and_empty_result(client, monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    project = create_project(client)
    local = create_task(client, project["id"], "Local")
    other = create_project(client, "Other")
    foreign = create_task(client, other["id"], "Foreign")
    response = client.post(f"/projects/{project['id']}/suggestions/suggest-dependencies", json={"tasks": [{"id": local["id"], "title": "Local"}, {"id": foreign["id"], "title": "Foreign"}]})
    assert response.status_code == 422

    async def no_suggestions(tasks, existing_edges):
        return []

    monkeypatch.setattr(suggestions, "get_dependency_suggestions", no_suggestions)
    response = client.post(f"/projects/{project['id']}/suggestions/suggest-dependencies", json={"tasks": [{"id": local["id"], "title": "Local"}]})
    assert response.status_code == 200
    assert response.json() == []


def test_accepted_suggestion_uses_normal_dag_cycle_validation(client):
    project = create_project(client)
    first = create_task(client, project["id"], "First")
    second = create_task(client, project["id"], "Second")
    assert client.post(f"/projects/{project['id']}/dependencies", json={"predecessor_id": first["id"], "successor_id": second["id"]}).status_code == 201
    response = client.post(f"/projects/{project['id']}/dependencies", json={"predecessor_id": second["id"], "successor_id": first["id"]})
    assert response.status_code == 409
    assert response.json()["detail"] == "CYCLE_DETECTED"


def test_suggestions_without_key_return_configuration_message(client, monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    response = client.post("/suggestions/suggest-dependencies", json={"tasks": []})
    assert response.status_code == 503
    assert response.json() == {"detail": "AI Assistant is not configured correctly."}


def test_authentication_provider_error_is_mapped_safely(client, monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    async def failing_suggestions(tasks, existing_edges):
        raise LLMProviderError("AuthenticationError")

    monkeypatch.setattr(suggestions, "get_dependency_suggestions", failing_suggestions)
    response = client.post("/suggestions/suggest-dependencies", json={"tasks": []})
    assert response.status_code == 503
    assert response.json() == {"detail": "AI provider authentication failed."}


def test_response_parser_filters_malformed_items_and_rejects_invalid_json():
    parsed = LLMService._parse_response('{"suggestions": [{"predecessor_id": 1, "successor_id": 2, "reason": "valid", "confidence": 0.9}, {"bad": true}, {"predecessor_id": 2, "successor_id": 3, "reason": "bad confidence", "confidence": 2}]}')
    assert parsed == [LLMResponse(predecessor_id=1, successor_id=2, reason="valid", confidence=0.9)]
    with pytest.raises(LLMProviderError, match="MalformedResponse"):
        LLMService._parse_response("not json")

    assert LLMService._parse_response('```json\n{"suggestions": []}\n```') == []


def test_gemini_provider_requires_configuration_and_uses_configured_model(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "gemini")
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    service = LLMService()
    assert service.is_configured() is False
    with pytest.raises(LLMProviderError, match="ConfigurationError"):
        service.suggest_dependencies([])

    monkeypatch.setenv("GEMINI_API_KEY", "test-gemini-key")
    monkeypatch.setenv("GEMINI_MODEL", "gemini-test-model")
    captured = {}

    def fake_gemini(prompt):
        captured["prompt"] = prompt
        captured["model"] = service.gemini_model
        return []

    monkeypatch.setattr(service, "_suggest_with_gemini", fake_gemini)
    assert service.suggest_dependencies([{"id": 1, "title": "Schema", "description": "Tables"}]) == []
    assert captured["model"] == "gemini-test-model"
    assert "Schema" in captured["prompt"]


def test_rate_limit_and_generic_provider_errors_are_sanitized(client, monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    async def rate_limited(tasks, existing_edges):
        raise LLMProviderError("RateLimitError")

    monkeypatch.setattr(suggestions, "get_dependency_suggestions", rate_limited)
    response = client.post("/suggestions/suggest-dependencies", json={"tasks": []})
    assert response.status_code == 503
    assert response.json() == {"detail": "AI suggestions are temporarily unavailable due to provider quota or rate limits. Please try again shortly."}

    async def provider_failure(tasks, existing_edges):
        raise LLMProviderError("NetworkError")

    monkeypatch.setattr(suggestions, "get_dependency_suggestions", provider_failure)
    response = client.post("/suggestions/suggest-dependencies", json={"tasks": []})
    assert response.status_code == 502
    assert response.json() == {"detail": "AI suggestions are currently unavailable. Please try again."}

    async def invalid_request(tasks, existing_edges):
        raise LLMProviderError("InvalidRequestError")

    monkeypatch.setattr(suggestions, "get_dependency_suggestions", invalid_request)
    response = client.post("/suggestions/suggest-dependencies", json={"tasks": []})
    assert response.status_code == 502
    assert response.json() == {"detail": "AI provider rejected the suggestion request."}


def test_groq_provider_normalizes_name_and_requires_both_settings(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", " GroQ ")
    service = LLMService()
    assert service.provider == "groq"

    monkeypatch.setenv("GROQ_MODEL", "groq-test-model")
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    assert service.is_configured() is False
    with pytest.raises(LLMProviderError, match="ConfigurationError"):
        service.suggest_dependencies([])

    monkeypatch.setenv("GROQ_API_KEY", "test-groq-key")
    monkeypatch.delenv("GROQ_MODEL", raising=False)
    assert service.is_configured() is False
    with pytest.raises(LLMProviderError, match="ConfigurationError"):
        service.suggest_dependencies([])


def test_groq_provider_uses_shared_prompt_and_supports_valid_or_empty_results(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "groq")
    monkeypatch.setenv("GROQ_API_KEY", "test-groq-key")
    monkeypatch.setenv("GROQ_MODEL", "groq-test-model")
    service = LLMService()
    captured = {}

    def valid_groq(prompt):
        captured["prompt"] = prompt
        captured["model"] = service.groq_model
        return [LLMResponse(predecessor_id=1, successor_id=2, reason="API needs schema", confidence=0.9)]

    monkeypatch.setattr(service, "_suggest_with_groq", valid_groq)
    tasks = [{"id": 1, "title": "Schema", "description": "Tables"}, {"id": 2, "title": "API", "description": "Endpoints"}]
    assert service.suggest_dependencies(tasks, {(1, 2)}) == [LLMResponse(predecessor_id=1, successor_id=2, reason="API needs schema", confidence=0.9)]
    assert captured["model"] == "groq-test-model"
    assert "Schema" in captured["prompt"]
    assert "[1, 2]" in captured["prompt"]

    monkeypatch.setattr(service, "_suggest_with_groq", lambda prompt: [])
    assert service.suggest_dependencies(tasks) == []


def test_groq_strict_schema_requires_an_object_envelope(monkeypatch):
    """Regression: gpt-oss must not be left to generate a bare JSON array."""
    monkeypatch.setenv("AI_PROVIDER", "groq")
    monkeypatch.setenv("GROQ_API_KEY", "test-groq-key")
    monkeypatch.setenv("GROQ_MODEL", "openai/gpt-oss-20b")
    captured = {}

    class FakeCompletions:
        def create(self, **kwargs):
            captured.update(kwargs)
            return SimpleNamespace(
                choices=[SimpleNamespace(message=SimpleNamespace(content='{"suggestions": []}'))]
            )

    class FakeGroq:
        def __init__(self, **kwargs):
            captured["client"] = kwargs
            self.chat = SimpleNamespace(completions=FakeCompletions())

        def close(self):
            captured["closed"] = True

    monkeypatch.setitem(sys.modules, "groq", SimpleNamespace(Groq=FakeGroq))
    service = LLMService()
    prompt = service._create_prompt(
        [{"id": 1, "title": "Schema", "description": "Tables"}],
        set(),
    )

    assert service._suggest_with_groq(prompt) == []
    assert captured["response_format"]["type"] == "json_schema"
    assert captured["response_format"]["json_schema"]["strict"] is True
    assert captured["response_format"]["json_schema"]["schema"]["required"] == ["suggestions"]
    assert "Return ONE JSON object." in captured["messages"][1]["content"]
    assert "Never return a bare array" in captured["messages"][1]["content"]
    assert captured["closed"] is True


class FakeGroqProviderError(Exception):
    def __init__(self, status_code, message, code=None):
        self.status_code = status_code
        self.body = {"error": {"message": message, **({"code": code} if code else {})}}
        super().__init__(message)


@pytest.mark.parametrize(
    "first_error",
    [
        FakeGroqProviderError(400, "Failed to generate JSON", "json_validate_failed"),
        FakeGroqProviderError(400, "Failed to validate JSON"),
    ],
)
def test_groq_json_validation_failure_retries_once_and_succeeds(monkeypatch, first_error):
    monkeypatch.setenv("GROQ_API_KEY", "test-groq-key")
    monkeypatch.setenv("GROQ_MODEL", "openai/gpt-oss-20b")
    attempts = []
    responses = [
        first_error,
        SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content='{"suggestions": []}'))]),
    ]

    class FakeCompletions:
        def create(self, **kwargs):
            attempts.append(kwargs)
            result = responses.pop(0)
            if isinstance(result, Exception):
                raise result
            return result

    class FakeGroq:
        def __init__(self, **kwargs):
            self.chat = SimpleNamespace(completions=FakeCompletions())

        def close(self):
            pass

    monkeypatch.setitem(sys.modules, "groq", SimpleNamespace(Groq=FakeGroq))
    service = LLMService()
    assert service._suggest_with_groq("project input") == []
    assert len(attempts) == 2
    assert "OUTPUT REQUIREMENTS" in attempts[1]["messages"][1]["content"]


@pytest.mark.parametrize(
    ("error", "expected_type"),
    [
        (FakeGroqProviderError(401, "Unauthorized"), "AuthenticationError"),
        (FakeGroqProviderError(429, "Rate limit"), "RateLimitError"),
        (FakeGroqProviderError(400, "Unsupported parameter"), "InvalidRequestError"),
        (FakeGroqProviderError(400, "Failed to validate JSON", "json_validate_failed"), "InvalidRequestError"),
    ],
)
def test_groq_retries_only_json_validation_errors_once(monkeypatch, error, expected_type):
    monkeypatch.setenv("GROQ_API_KEY", "test-groq-key")
    monkeypatch.setenv("GROQ_MODEL", "openai/gpt-oss-20b")
    attempts = []

    class FakeCompletions:
        def create(self, **kwargs):
            attempts.append(kwargs)
            raise error

    class FakeGroq:
        def __init__(self, **kwargs):
            self.chat = SimpleNamespace(completions=FakeCompletions())

        def close(self):
            pass

    monkeypatch.setitem(sys.modules, "groq", SimpleNamespace(Groq=FakeGroq))
    with pytest.raises(LLMProviderError, match=expected_type):
        LLMService()._suggest_with_groq("project input")
    assert len(attempts) == (2 if error.body["error"].get("code") == "json_validate_failed" else 1)
