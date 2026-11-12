from decimal import Decimal

import pytest
from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.business import Business
from app.models.transaction import Transaction, TransactionStatus, TransactionType


@pytest.fixture
def db_session():
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


def test_create_business_model(db_session):
    business = Business(
        name="Apex Precision Gearworks",
        currency="USD",
        industry="Precision Manufacturing",
        description="Demo manufacturer specialized in custom CNC components.",
    )
    db_session.add(business)
    db_session.commit()
    db_session.refresh(business)

    assert business.id is not None
    assert business.name == "Apex Precision Gearworks"
    assert business.currency == "USD"
    assert business.created_at is not None


def test_create_transaction_model_with_decimal_precision(db_session):
    business = Business(name="Apex Precision Gearworks", currency="USD")
    db_session.add(business)
    db_session.commit()

    tx = Transaction(
        transaction_ref="TXN-DEMO-001",
        business_id=business.id,
        amount=Decimal("1250.50"),
        currency="USD",
        status=TransactionStatus.COMPLETED,
        type=TransactionType.CUSTOMER_PAYMENT,
        payment_method="PAYPAL_SIMULATED",
        description="Invoice #4012 - Custom gear shafts",
        customer_name="Acme Robotics",
        customer_email="billing@acmerobotics.demo",
    )
    db_session.add(tx)
    db_session.commit()
    db_session.refresh(tx)

    assert tx.id is not None
    assert tx.transaction_ref == "TXN-DEMO-001"
    assert isinstance(tx.amount, Decimal)
    assert tx.amount == Decimal("1250.50")
    assert tx.status == TransactionStatus.COMPLETED
    assert tx.type == TransactionType.CUSTOMER_PAYMENT


def test_transaction_ref_uniqueness(db_session):
    business = Business(name="Apex Precision Gearworks", currency="USD")
    db_session.add(business)
    db_session.commit()

    tx1 = Transaction(
        transaction_ref="TXN-DUP-001",
        business_id=business.id,
        amount=Decimal("100.00"),
        currency="USD",
        status=TransactionStatus.COMPLETED,
    )
    db_session.add(tx1)
    db_session.commit()

    tx2 = Transaction(
        transaction_ref="TXN-DUP-001",
        business_id=business.id,
        amount=Decimal("200.00"),
        currency="USD",
        status=TransactionStatus.PENDING,
    )
    db_session.add(tx2)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()
