from unittest.mock import MagicMock

import pytest
from app.core.config import settings
from app.core.database import Base, get_db
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker


def test_production_database_target_is_postgresql():
    """Verify that settings and database defaults target PostgreSQL and not SQLite."""
    assert settings.DATABASE_URL.startswith("postgresql"), (
        f"Production DATABASE_URL must target PostgreSQL, got {settings.DATABASE_URL}"
    )


def test_isolated_test_database_compatibility():
    """Explicitly verify that an isolated test-only SQLite in-memory engine can bind to Base."""
    test_engine = create_engine("sqlite:///:memory:", echo=False)
    TestingSessionLocal = sessionmaker(
        autocommit=False, autoflush=False, bind=test_engine
    )

    try:
        # Create tables
        Base.metadata.create_all(bind=test_engine)

        # Verify session execute and rollback
        with TestingSessionLocal() as session:
            result = session.execute(text("SELECT 1")).scalar()
            assert result == 1
            session.rollback()

        Base.metadata.drop_all(bind=test_engine)
    finally:
        test_engine.dispose()


def test_get_db_yields_and_closes(monkeypatch):
    """Verify get_db dependency yields a session and guarantees its closure."""
    mock_session = MagicMock()
    mock_session_factory = MagicMock(return_value=mock_session)
    monkeypatch.setattr("app.core.database.SessionLocal", mock_session_factory)

    generator = get_db()
    db = next(generator)
    assert db is mock_session
    mock_session.close.assert_not_called()

    with pytest.raises(StopIteration):
        next(generator)
    mock_session.close.assert_called_once()
