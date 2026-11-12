from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.schemas.business import BusinessCreate
from app.schemas.transaction import (
    TransactionCreate,
    TransactionStatusEnum,
    TransactionTypeEnum,
)


def test_business_schema_validation():
    data = {
        "name": "Apex Precision Gearworks",
        "currency": "USD",
        "industry": "Manufacturing",
    }
    schema = BusinessCreate(**data)
    assert schema.name == "Apex Precision Gearworks"
    assert schema.currency == "USD"

    with pytest.raises(ValidationError):
        BusinessCreate(name="")


def test_transaction_schema_decimal_amount():
    data = {
        "transaction_ref": "TXN-TEST-100",
        "business_id": 1,
        "amount": "450.75",
        "currency": "USD",
        "status": TransactionStatusEnum.COMPLETED,
        "type": TransactionTypeEnum.CUSTOMER_PAYMENT,
        "payment_method": "PAYPAL_SIMULATED",
        "description": "Test payment",
    }
    schema = TransactionCreate(**data)
    assert isinstance(schema.amount, Decimal)
    assert schema.amount == Decimal("450.75")


def test_transaction_schema_rejects_negative_or_zero_amount():
    with pytest.raises(ValidationError):
        TransactionCreate(
            transaction_ref="TXN-TEST-000",
            business_id=1,
            amount=Decimal("0.00"),
            currency="USD",
            description="Zero payment",
        )

    with pytest.raises(ValidationError):
        TransactionCreate(
            transaction_ref="TXN-TEST-NEG",
            business_id=1,
            amount=Decimal("-50.00"),
            currency="USD",
            description="Negative payment",
        )
