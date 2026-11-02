from pathlib import Path
from urllib.parse import quote_plus

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Base directory for the backend (where .env is located)
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
ENV_PATH = BACKEND_DIR / ".env"


class Settings(BaseSettings):
    APP_NAME: str = "PayPilot AI"
    APP_DESCRIPTION: str = "AI-powered business and payment intelligence platform."
    APP_VERSION: str = "0.1.0"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

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

    model_config = SettingsConfigDict(
        env_file=(str(ENV_PATH), ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

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
