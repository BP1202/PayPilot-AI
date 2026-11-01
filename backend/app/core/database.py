from collections.abc import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings

# Read DATABASE_URL from centralized settings (populated from backend/.env)
# Provide non-credentialed fallback to allow engine instantiation when DATABASE_URL is unset
DATABASE_URL = (
    settings.DATABASE_URL
    if settings.DATABASE_URL
    else "postgresql+psycopg://localhost:5432/paypilot"
)

# SQLAlchemy engine - connection is created lazily without opening a connection immediately
engine = create_engine(
    DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,
)

# Session factory bound to the engine
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a database session and guarantees safe closure."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

