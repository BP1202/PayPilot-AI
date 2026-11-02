import uuid
from abc import ABC, abstractmethod
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any


class PaymentProviderError(Exception):
    """Base exception for payment provider operations."""


class PaymentProviderInterface(ABC):
    """
    Abstract Payment Provider Interface.

    This interface defines the integration boundary between PayPilot AI business logic
    and external payment rails.

    FUTURE PAYPAL INTEGRATION NOTICE:
    To replace MockPaymentProvider with real PayPal Sandbox:
    1. Implement this interface using PayPal REST APIs (v2/checkout/orders).
    2. Obtain OAuth2 bearer token via client_credentials at /v1/oauth2/token using PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.
    3. create_order() -> Call POST /v2/checkout/orders with intent="CAPTURE".
    4. capture_payment() -> Call POST /v2/checkout/orders/{order_id}/capture.
    5. Handle webhook verification for PAYMENT.CAPTURE.COMPLETED.
    """

    @abstractmethod
    def create_order(
        self, amount: Decimal, currency: str, reference: str, description: str
    ) -> dict[str, Any]:
        """Create a payment intent / order on the provider."""

    @abstractmethod
    def capture_payment(
        self, order_id: str, amount: Decimal, currency: str
    ) -> dict[str, Any]:
        """Capture an approved payment on the provider."""


class MockPaymentProvider(PaymentProviderInterface):
    """
    Simulated Payment Provider for demo and testing.

    IMPORTANT DISCLAIMER:
    All transactions processed by this provider are simulated.
    No live funds or PayPal APIs are touched.
    """

    def __init__(self, provider_name: str = "PAYPAL_SIMULATED"):
        self.provider_name = provider_name

    def create_order(
        self, amount: Decimal, currency: str, reference: str, description: str
    ) -> dict[str, Any]:
        if amount <= Decimal("0.00"):
            raise PaymentProviderError(
                "Payment order amount must be greater than zero."
            )

        order_id = f"SIM-PAYPAL-ORD-{uuid.uuid4().hex[:12].upper()}"
        return {
            "order_id": order_id,
            "provider": self.provider_name,
            "status": "CREATED",
            "is_simulated": True,
            "amount": amount,
            "currency": currency.upper(),
            "reference": reference,
            "description": description,
            "created_at": datetime.now(UTC).isoformat(),
        }

    def capture_payment(
        self, order_id: str, amount: Decimal, currency: str
    ) -> dict[str, Any]:
        if amount <= Decimal("0.00"):
            raise PaymentProviderError("Capture amount must be greater than zero.")

        capture_id = f"SIM-PAYPAL-CAP-{uuid.uuid4().hex[:12].upper()}"
        return {
            "capture_id": capture_id,
            "order_id": order_id,
            "provider": self.provider_name,
            "status": "COMPLETED",
            "is_simulated": True,
            "amount": amount,
            "currency": currency.upper(),
            "captured_at": datetime.now(UTC).isoformat(),
        }
