from decimal import Decimal

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.transaction import TransactionStatus
from app.repositories.business_repository import BusinessRepository
from app.repositories.transaction_repository import TransactionRepository
from app.schemas.business import BusinessCreate
from app.schemas.transaction import TransactionCreate


@pytest.fixture
def repo_session():
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


def test_business_repository_crud(repo_session):
    repo = BusinessRepository(repo_session)

    # Create via schema
    created = repo.create(
        BusinessCreate(name="Custom Machine Shop", currency="USD", industry="Machining")
    )
    assert created.id is not None

    # Get by id
    fetched = repo.get_by_id(created.id)
    assert fetched is not None
    assert fetched.name == "Custom Machine Shop"

    # Get or create default business
    business = repo.get_or_create_default_business(
        name="Apex Precision Gearworks", currency="USD"
    )
    assert business.id is not None
    assert business.name == "Apex Precision Gearworks"

    # Second call should return the exact same business
    business_2 = repo.get_or_create_default_business(
        name="Apex Precision Gearworks", currency="USD"
    )
    assert business_2.id == business.id


def test_transaction_repository_crud_and_totals(repo_session):
    biz_repo = BusinessRepository(repo_session)
    business = biz_repo.get_or_create_default_business(
        name="Apex Precision Gearworks", currency="USD"
    )

    tx_repo = TransactionRepository(repo_session)

    # Create completed transaction
    tx_data1 = TransactionCreate(
        transaction_ref="TXN-REP-001",
        business_id=business.id,
        amount=Decimal("1500.00"),
        currency="USD",
        status=TransactionStatus.COMPLETED,
        description="Completed Job 1",
    )
    tx1 = tx_repo.create(tx_data1)
    assert tx1.id is not None

    # Create pending transaction
    tx_data2 = TransactionCreate(
        transaction_ref="TXN-REP-002",
        business_id=business.id,
        amount=Decimal("500.00"),
        currency="USD",
        status=TransactionStatus.PENDING,
        description="Pending Job 2",
    )
    tx2 = tx_repo.create(tx_data2)
    assert tx2.id is not None

    # Get by id and ref
    by_id = tx_repo.get_by_id(tx1.id)
    assert by_id is not None
    assert by_id.transaction_ref == "TXN-REP-001"

    by_ref = tx_repo.get_by_ref("TXN-REP-002")
    assert by_ref is not None
    assert by_ref.id == tx2.id

    # Test filtering by status
    completed_items = tx_repo.list(
        business_id=business.id, status=TransactionStatus.COMPLETED
    )
    assert len(completed_items) == 1
    assert completed_items[0].transaction_ref == "TXN-REP-001"

    pending_items = tx_repo.list(
        business_id=business.id, status=TransactionStatus.PENDING
    )
    assert len(pending_items) == 1
    assert pending_items[0].transaction_ref == "TXN-REP-002"

    # Test count
    assert tx_repo.count(business_id=business.id) == 2
    assert (
        tx_repo.count(business_id=business.id, status=TransactionStatus.COMPLETED) == 1
    )
    assert tx_repo.count(business_id=business.id, status=TransactionStatus.PENDING) == 1

    # Test aggregated totals calculation
    totals = tx_repo.get_dashboard_totals(business_id=business.id)
    assert totals["total_revenue"] == Decimal("1500.00")
    assert totals["completed_count"] == 1
    assert totals["pending_total"] == Decimal("500.00")
    assert totals["pending_count"] == 1
    assert totals["transaction_count"] == 2
