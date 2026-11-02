import pytest
from app.core.config import settings
from app.main import app
from fastapi.testclient import TestClient


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {
        "message": f"Welcome to {settings.APP_NAME}",
        "status": "running",
    }


def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {
        "status": "healthy",
        "service": f"{settings.APP_NAME} Backend",
    }


def test_api_v1_health_endpoint(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {
        "status": "healthy",
        "application": settings.APP_NAME,
        "environment": settings.APP_ENV,
    }


@pytest.mark.parametrize("endpoint", ["/", "/health", "/api/v1/health"])
def test_endpoints_do_not_expose_sensitive_credentials(client, endpoint):
    response = client.get(endpoint)
    assert response.status_code == 200
    response_text = response.text.lower()

    sensitive_keys = [
        "paypal_client_id",
        "paypal_client_secret",
        "database_url",
        "ai_api_key",
        "client_secret",
        "api_key",
        "password",
    ]

    for key in sensitive_keys:
        assert key not in response_text, (
            f"Potential credential leak detected for '{key}' on {endpoint}"
        )
