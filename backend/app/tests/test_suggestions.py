import pytest
from fastapi.testclient import TestClient

from app.api import suggestions
from app.main import app
from app.services.llm_service import LLMProviderError, LLMResponse, LLMService


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_suggestions_are_advisory_and_filtered(client, monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    async def fake_suggestions(tasks):
        assert tasks == [
            {"id": 1, "title": "Schema", "description": "Create tables"},
            {"id": 2, "title": "API", "description": None},
        ]
        return [
            LLMResponse(predecessor_id=1, successor_id=2, reason="API needs tables", confidence=0.91),
            LLMResponse(predecessor_id=1, successor_id=2, reason="duplicate", confidence=0.5),
            LLMResponse(predecessor_id=1, successor_id=1, reason="self edge", confidence=0.5),
            LLMResponse(predecessor_id=99, successor_id=2, reason="unknown task", confidence=0.5),
        ]

    monkeypatch.setattr(suggestions, "get_dependency_suggestions", fake_suggestions)
    response = client.post("/suggestions/suggest-dependencies", json={"tasks": [
        {"id": 1, "title": "Schema", "description": "Create tables"},
        {"id": 2, "title": "API", "description": None},
    ]})

    assert response.status_code == 200
    assert response.json() == [{
        "predecessor_id": 1,
        "successor_id": 2,
        "reason": "API needs tables",
        "confidence": 0.91,
    }]


def test_suggestions_without_key_return_configuration_message(client, monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    response = client.post("/suggestions/suggest-dependencies", json={"tasks": []})

    assert response.status_code == 503
    assert response.json() == {
        "detail": "AI suggestions are unavailable until an API key is configured."
    }


def test_authentication_provider_error_is_mapped_safely(client, monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    async def failing_suggestions(tasks):
        raise LLMProviderError("AuthenticationError")

    monkeypatch.setattr(suggestions, "get_dependency_suggestions", failing_suggestions)
    response = client.post("/suggestions/suggest-dependencies", json={"tasks": []})

    assert response.status_code == 503
    assert response.json() == {
        "detail": "AI suggestions are unavailable due to provider configuration."
    }


def test_response_parser_ignores_malformed_items_but_rejects_invalid_json():
    parsed = LLMService._parse_response(
        '[{"predecessor_id": 1, "successor_id": 2, "reason": "valid", "confidence": 0.9}, {"bad": true}]'
    )
    assert parsed == [LLMResponse(predecessor_id=1, successor_id=2, reason="valid", confidence=0.9)]

    with pytest.raises(LLMProviderError, match="MalformedResponse"):
        LLMService._parse_response("not json")
