from decimal import Decimal

import pytest
from app.core.database import Base
from app.core.seed import seed_demo_data
from app.repositories.transaction_repository import TransactionRepository
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


@pytest.fixture
def seed_session():
    engine = create_engine("sqlite:///:memory:", echo=False)
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


def test_seed_demo_data_creation_and_idempotency(seed_session):
    # First seed run
    business = seed_demo_data(seed_session)
    assert business.id is not None
    assert business.name == "Apex Precision Gearworks"

    tx_repo = TransactionRepository(seed_session)
    totals = tx_repo.get_dashboard_totals(business.id)

    # 4 completed transactions: 4250.00 + 1890.50 + 3120.00 + 875.25 = 10135.75
    assert totals["total_revenue"] == Decimal("10135.75")
    assert totals["completed_count"] == 4
    # 1 pending: 2650.00
    assert totals["pending_total"] == Decimal("2650.00")
    assert totals["pending_count"] == 1
    assert totals["transaction_count"] == 5

    # Second seed run should be idempotent
    business_again = seed_demo_data(seed_session)
    assert business_again.id == business.id
    totals_after = tx_repo.get_dashboard_totals(business.id)
    assert totals_after["transaction_count"] == 5
    assert totals_after["total_revenue"] == Decimal("10135.75")
