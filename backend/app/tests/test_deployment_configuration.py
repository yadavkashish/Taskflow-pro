from fastapi.testclient import TestClient

from app.main import app, get_cors_origins


def test_cors_uses_configured_origins_without_wildcards():
    assert get_cors_origins("https://taskflow.example/, https://preview.example") == [
        "https://taskflow.example",
        "https://preview.example",
    ]
    assert "*" not in get_cors_origins("")


def test_health_endpoint_returns_only_liveness_status():
    with TestClient(app) as client:
        assert client.get("/health").json() == {"status": "ok"}
