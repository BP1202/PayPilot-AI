from decimal import Decimal

import pytest
from app.core.database import Base
from app.models.transaction import TransactionStatus
from app.repositories.business_repository import BusinessRepository
from app.repositories.transaction_repository import TransactionRepository
from app.services.payment_provider import MockPaymentProvider
from app.services.payment_service import PaymentApprovalRequiredError, PaymentService
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


@pytest.fixture
def service_session():
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


def test_payment_service_create_customer_order(service_session):
    biz_repo = BusinessRepository(service_session)
    business = biz_repo.get_or_create_default_business()

    service = PaymentService(service_session, MockPaymentProvider())
    tx = service.create_customer_order(
        business_id=business.id,
        amount=Decimal("350.00"),
        currency="USD",
        description="Invoice #201 - Precision bearings",
        customer_name="Starlight Robotics",
        customer_email="starlight@demo.com",
    )
    assert tx.id is not None
    assert tx.status == TransactionStatus.PENDING
    assert tx.amount == Decimal("350.00")
    assert tx.provider_reference is not None
    assert tx.provider_reference.startswith("SIM-PAYPAL-ORD-")


def test_payment_service_requires_owner_approval(service_session):
    biz_repo = BusinessRepository(service_session)
    business = biz_repo.get_or_create_default_business()

    service = PaymentService(service_session, MockPaymentProvider())
    tx = service.create_customer_order(
        business_id=business.id,
        amount=Decimal("500.00"),
        currency="USD",
        description="Pending Order",
    )

    # Attempt capture without owner approval must fail
    with pytest.raises(PaymentApprovalRequiredError):
        service.approve_and_capture(
            transaction_ref=tx.transaction_ref,
            owner_approved=False,
            idempotency_key="idemp-key-001",
        )

    # Status must remain PENDING
    service_session.refresh(tx)
    assert tx.status == TransactionStatus.PENDING


def test_payment_service_approve_and_capture_success_and_idempotency(service_session):
    biz_repo = BusinessRepository(service_session)
    business = biz_repo.get_or_create_default_business()

    service = PaymentService(service_session, MockPaymentProvider())
    tx = service.create_customer_order(
        business_id=business.id,
        amount=Decimal("750.25"),
        currency="USD",
        description="Custom Sprockets",
    )

    # Owner approves payment
    captured_tx = service.approve_and_capture(
        transaction_ref=tx.transaction_ref,
        owner_approved=True,
        idempotency_key="idemp-key-002",
    )
    assert captured_tx.status == TransactionStatus.COMPLETED
    assert captured_tx.provider_reference.startswith("SIM-PAYPAL-CAP-")

    # Second call with same idempotency key / reference should return completed without creating new records
    tx_repo = TransactionRepository(service_session)
    initial_count = tx_repo.count(business.id)

    repeat_tx = service.approve_and_capture(
        transaction_ref=tx.transaction_ref,
        owner_approved=True,
        idempotency_key="idemp-key-002",
    )
    assert repeat_tx.id == captured_tx.id
    assert tx_repo.count(business.id) == initial_count
