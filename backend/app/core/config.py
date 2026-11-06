import json
from pathlib import Path
from typing import Any
from urllib.parse import quote_plus

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Base directory for the backend (where .env is located)
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
ENV_PATH = BACKEND_DIR / ".env"


class Settings(BaseSettings):
    APP_NAME: str = "Opnly"
    APP_DESCRIPTION: str = "AI-powered idea-to-business opportunity network. Where Ideas Find the Right People."
    APP_VERSION: str = "0.1.0"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # CORS Configuration - accepts list[str] or comma-separated string from env
    CORS_ORIGINS: list[str] | str = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    # PostgreSQL Database Configuration
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = ""
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5433
    POSTGRES_DB: str = "paypilot_ai"
    DATABASE_NAME: str = ""
    DATABASE_URL: str = ""

    # PayPal Integration
    PAYPAL_BASE_URL: str = "https://api-m.sandbox.paypal.com"
    PAYPAL_CLIENT_ID: str = ""
    PAYPAL_CLIENT_SECRET: str = ""

    # AI Intelligence Service
    AI_API_KEY: str = ""

    # Authentication & Security
    AUTH_SECRET_KEY: str = (
        "paypilot-dev-insecure-secret-key-change-in-production-12345678"
    )
    AUTH_ALGORITHM: str = "HS256"
    AUTH_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    model_config = SettingsConfigDict(
        env_file=(str(ENV_PATH), ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @field_validator("CORS_ORIGINS", mode="after")
    @classmethod
    def assemble_cors_origins(cls, v: Any) -> list[str]:
        if isinstance(v, str):
            trimmed = v.strip()
            if trimmed.startswith("[") and trimmed.endswith("]"):
                try:
                    parsed = json.loads(trimmed)
                    if isinstance(parsed, list):
                        return [str(i).strip() for i in parsed if str(i).strip()]
                except (json.JSONDecodeError, TypeError, ValueError):
                    return [i.strip() for i in trimmed.split(",") if i.strip()]
            return [i.strip() for i in trimmed.split(",") if i.strip()]
        return v

    @model_validator(mode="after")
    def resolve_database_url(self) -> "Settings":
        db_name = self.POSTGRES_DB or self.DATABASE_NAME or "paypilot_ai"

        # Check if DATABASE_URL is unset, empty, or contains unresolved shell template markers
        has_unresolved_placeholders = (
            "${" in self.DATABASE_URL
            or "$(" in self.DATABASE_URL
            or self.DATABASE_URL.endswith("localhost:5433/")
            or self.DATABASE_URL.endswith("5432/")
        )

        if not self.DATABASE_URL or has_unresolved_placeholders:
            user = self.POSTGRES_USER or "postgres"
            encoded_password = (
                quote_plus(self.POSTGRES_PASSWORD) if self.POSTGRES_PASSWORD else ""
            )
            auth = f"{user}:{encoded_password}" if encoded_password else user
            host = self.POSTGRES_HOST or "localhost"
            port = self.POSTGRES_PORT or 5433
            self.DATABASE_URL = f"postgresql+psycopg://{auth}@{host}:{port}/{db_name}"

        return self


settings = Settings()
