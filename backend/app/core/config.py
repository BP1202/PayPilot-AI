from pathlib import Path
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

    PAYPAL_BASE_URL: str = "https://api-m.sandbox.paypal.com"
    PAYPAL_CLIENT_ID: str = ""
    PAYPAL_CLIENT_SECRET: str = ""

    DATABASE_URL: str = ""
    AI_API_KEY: str = ""

    model_config = SettingsConfigDict(
        env_file=(str(ENV_PATH), ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


settings = Settings()
