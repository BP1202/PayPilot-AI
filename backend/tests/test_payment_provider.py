from decimal import Decimal

import pytest
from app.services.payment_provider import MockPaymentProvider, PaymentProviderError


def test_mock_payment_provider_create_order():
    provider = MockPaymentProvider()
    order = provider.create_order(
        amount=Decimal("150.00"),
        currency="USD",
        reference="ORDER-REF-101",
        description="Demo Order Description",
    )
    assert order["status"] == "CREATED"
    assert order["provider"] == "PAYPAL_SIMULATED"
    assert order["is_simulated"] is True
    assert order["order_id"].startswith("SIM-PAYPAL-ORD-")
    assert order["amount"] == Decimal("150.00")
    assert order["currency"] == "USD"


def test_mock_payment_provider_capture_payment_success():
    provider = MockPaymentProvider()
    order = provider.create_order(
        amount=Decimal("250.50"),
        currency="USD",
        reference="ORDER-REF-102",
        description="Test Capture",
    )
    capture = provider.capture_payment(
        order_id=order["order_id"],
        amount=Decimal("250.50"),
        currency="USD",
    )
    assert capture["status"] == "COMPLETED"
    assert capture["is_simulated"] is True
    assert capture["capture_id"].startswith("SIM-PAYPAL-CAP-")
    assert capture["amount"] == Decimal("250.50")


def test_mock_payment_provider_capture_rejects_negative_or_zero():
    provider = MockPaymentProvider()
    with pytest.raises(PaymentProviderError):
        provider.capture_payment(
            order_id="SIM-PAYPAL-ORD-999",
            amount=Decimal("0.00"),
            currency="USD",
        )


def test_mock_payment_provider_create_order_rejects_zero_or_negative():
    provider = MockPaymentProvider()
    with pytest.raises(PaymentProviderError):
        provider.create_order(
            amount=Decimal("0.00"),
            currency="USD",
            reference="TXN-INVALID",
            description="Invalid zero order",
        )
