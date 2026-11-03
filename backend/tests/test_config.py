from urllib.parse import urlparse

from app.core.config import Settings


def test_default_settings():
    settings = Settings(
        DATABASE_URL="postgresql+psycopg://user:pass@localhost:5433/paypilot_ai"
    )
    assert settings.APP_NAME == "PayPilot AI"
    assert settings.API_V1_PREFIX == "/api/v1"
    assert settings.DEBUG is True
    assert "postgresql" in settings.DATABASE_URL
    assert "http://localhost:3000" in settings.CORS_ORIGINS


def test_cors_origins_comma_separated_parsing():
    settings = Settings(
        DATABASE_URL="postgresql+psycopg://user:pass@localhost:5433/paypilot_ai",
        CORS_ORIGINS="http://localhost:3000, http://example.com",
    )
    assert settings.CORS_ORIGINS == ["http://localhost:3000", "http://example.com"]


def test_database_url_from_components():
    settings = Settings(
        DATABASE_URL="",
        POSTGRES_USER="testuser",
        POSTGRES_PASSWORD="testpassword",
        POSTGRES_HOST="dbhost",
        POSTGRES_PORT=5433,
        POSTGRES_DB="testdb",
    )
    assert (
        settings.DATABASE_URL
        == "postgresql+psycopg://testuser:testpassword@dbhost:5433/testdb"
    )


def test_database_url_resolves_unsupported_shell_interpolation():
    # If .env contains unresolved ${VAR} or $(VAR), config must resolve to a valid Postgres URL
    settings = Settings(
        DATABASE_URL="postgresql+psycopg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5433/${DATABASE_NAME}",
        POSTGRES_USER="pilot",
        POSTGRES_PASSWORD="secretpassword",
        POSTGRES_HOST="localhost",
        POSTGRES_PORT=5433,
        POSTGRES_DB="paypilot_ai",
    )
    assert "${" not in settings.DATABASE_URL
    assert "$(" not in settings.DATABASE_URL
    assert (
        settings.DATABASE_URL
        == "postgresql+psycopg://pilot:secretpassword@localhost:5433/paypilot_ai"
    )


def test_database_url_must_not_default_to_sqlite():
    # PostgreSQL must remain the application's intended database
    settings = Settings(DATABASE_URL="")
    parsed = urlparse(settings.DATABASE_URL)
    assert parsed.scheme.startswith("postgresql"), (
        f"Expected postgresql scheme, got {parsed.scheme}"
    )
