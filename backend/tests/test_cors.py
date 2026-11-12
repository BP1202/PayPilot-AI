import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


def test_cors_headers_on_api_request(client):
    response = client.get("/api/v1/health", headers={"Origin": "http://localhost:3000"})
    assert response.status_code == 200
    assert (
        response.headers.get("access-control-allow-origin") == "http://localhost:3000"
    )


def test_cors_preflight_options_request(client):
    headers = {
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
    }
    response = client.options("/api/v1/copilot/chat", headers=headers)
    assert response.status_code == 200
    assert (
        response.headers.get("access-control-allow-origin") == "http://localhost:3000"
    )
    assert "POST" in response.headers.get("access-control-allow-methods", "")


def test_cors_origin_127_0_0_1_3000(client):
    response = client.get("/api/v1/health", headers={"Origin": "http://127.0.0.1:3000"})
    assert response.status_code == 200
    assert (
        response.headers.get("access-control-allow-origin") == "http://127.0.0.1:3000"
    )


def test_cors_disallowed_origin(client):
    response = client.get(
        "/api/v1/health", headers={"Origin": "https://unauthorized-domain.com"}
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") is None
