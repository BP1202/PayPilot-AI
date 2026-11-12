"""PayPal Orders v2 integration service for milestone settlement order creation.

Handles:
- Secure communication with PayPal Orders v2 API (POST /v2/checkout/orders).
- Intent: CAPTURE.
- Authoritative amount and currency formatting.
- Request idempotency via PayPal-Request-Id header.
- Buyer approval link extraction and domain verification.
- Safe structured error propagation without leaking credentials or tokens.
"""

from __future__ import annotations

import logging
from decimal import Decimal
from typing import Any, Protocol
from urllib.parse import urlparse

import httpx
from pydantic import BaseModel, ConfigDict

from app.core.config import settings
from app.services.paypal_auth import (
    PayPalAuthConfigError,
    PayPalAuthError,
    PayPalAuthService,
)

logger = logging.getLogger(__name__)

ORDERS_PATH = "/v2/checkout/orders"
DEFAULT_TIMEOUT_SECONDS = 15.0

ALLOWED_SANDBOX_HOSTS = frozenset({"www.sandbox.paypal.com", "sandbox.paypal.com"})
ALLOWED_PRODUCTION_HOSTS = frozenset({"www.paypal.com", "paypal.com"})


class PayPalOrderError(Exception):
    """Base exception for PayPal Orders v2 operations."""


class PayPalOrderConfigError(PayPalOrderError):
    """Raised when PayPal credentials or configuration are missing or invalid."""


class PayPalOrderTimeoutError(PayPalOrderError):
    """Raised when an external request to PayPal times out."""


class PayPalOrderNetworkError(PayPalOrderError):
    """Raised when a network failure prevents reaching PayPal."""


class PayPalOrderAPIError(PayPalOrderError):
    """Raised when PayPal returns an error response (4xx/5xx)."""

    def __init__(
        self,
        message: str,
        *,
        status_code: int,
        error_name: str | None = None,
        details: list[dict[str, Any]] | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.error_name = error_name
        self.details = details or []


class PayPalOrderValidationError(PayPalOrderError):
    """Raised when request parameters or PayPal response data fail validation."""


class PayPalOrderResult(BaseModel):
    """Validated result from PayPal Orders v2 creation."""

    model_config = ConfigDict(frozen=True)

    order_id: str
    status: str
    approval_url: str
    currency: str
    amount: Decimal
    raw_response: dict[str, Any]


class PayPalCaptureResult(BaseModel):
    """Validated result from PayPal Orders v2 capture."""

    model_config = ConfigDict(frozen=True)

    order_id: str
    capture_id: str
    status: str
    currency: str
    amount: Decimal
    raw_response: dict[str, Any]


class SupportsHttp(Protocol):
    """Minimal HTTP client protocol for testing and dependency injection."""

    def post(self, url: str, **kwargs: Any) -> httpx.Response: ...
    def get(self, url: str, **kwargs: Any) -> httpx.Response: ...


class PayPalOrderService:
    """Service for interacting with PayPal Orders v2 API."""

    def __init__(
        self,
        *,
        auth_service: PayPalAuthService | None = None,
        base_url: str | None = None,
        environment: str | None = None,
        http_client: SupportsHttp | None = None,
        timeout: float = DEFAULT_TIMEOUT_SECONDS,
    ) -> None:
        self._environment = (environment or settings.PAYPAL_ENVIRONMENT or "sandbox").strip().lower()
        self._base_url = (base_url or settings.PAYPAL_BASE_URL or "https://api-m.sandbox.paypal.com").rstrip("/")
        self._timeout = timeout

        self._auth_service = auth_service or PayPalAuthService(
            client_id=settings.PAYPAL_CLIENT_ID,
            client_secret=settings.PAYPAL_CLIENT_SECRET,
            base_url=self._base_url,
            timeout=timeout,
        )

        self._owns_client = http_client is None
        self._http_client: SupportsHttp = http_client or httpx.Client(timeout=timeout)

    def close(self) -> None:
        """Close HTTP client resources if owned."""
        if self._owns_client and hasattr(self._http_client, "close"):
            self._http_client.close()

    def __enter__(self) -> PayPalOrderService:
        return self

    def __exit__(self, *args: object) -> None:
        self.close()

    def create_order(
        self,
        *,
        amount: Decimal,
        currency: str,
        reference_id: str,
        custom_id: str,
        description: str,
        idempotency_key: str,
        return_url: str | None = None,
        cancel_url: str | None = None,
    ) -> PayPalOrderResult:
        """
        Create a PayPal Orders v2 record with intent=CAPTURE.

        Args:
            amount: Non-negative monetary amount (formatted to 2 decimal places).
            currency: 3-letter ISO-4217 currency code.
            reference_id: Opnly internal reference (e.g. transaction_ref).
            custom_id: Opnly audit reference (e.g. tx_id & milestone_id).
            description: Sanitized, non-sensitive payment description.
            idempotency_key: Unique identifier sent as PayPal-Request-Id header.
            return_url: Optional buyer return URL upon approval.
            cancel_url: Optional buyer return URL upon cancellation.

        Returns:
            PayPalOrderResult with validated order ID and approval URL.
        """
        # Validate input parameters
        if amount <= Decimal("0.00"):
            raise PayPalOrderValidationError("Order amount must be greater than zero.")
        clean_currency = currency.strip().upper()
        if len(clean_currency) != 3:
            raise PayPalOrderValidationError(f"Invalid currency code '{currency}'. Must be 3-letter ISO code.")
        if not idempotency_key or not idempotency_key.strip():
            raise PayPalOrderValidationError("Idempotency key is required for PayPal order creation.")

        # Obtain OAuth2 bearer token
        try:
            access_token = self._auth_service.get_access_token()
        except PayPalAuthConfigError as exc:
            logger.error("PayPal credentials not configured: %s", exc)
            raise PayPalOrderConfigError("PayPal payment service credentials are not configured.") from exc
        except PayPalAuthError as exc:
            logger.error("PayPal OAuth2 authentication failed: %s", exc)
            raise PayPalOrderAPIError(
                "Failed to authenticate with PayPal payment gateway.",
                status_code=502,
            ) from exc

        url = f"{self._base_url}{ORDERS_PATH}"
        amount_str = f"{amount:.2f}"
        safe_description = description[:127].strip() if description else "Opnly Milestone Payment"

        app_context: dict[str, Any] = {
            "brand_name": "Opnly",
            "landing_page": "NO_PREFERENCE",
            "user_action": "PAY_NOW",
            "shipping_preference": "NO_SHIPPING",
        }
        if return_url and return_url.strip():
            app_context["return_url"] = return_url.strip()
        if cancel_url and cancel_url.strip():
            app_context["cancel_url"] = cancel_url.strip()

        payload: dict[str, Any] = {
            "intent": "CAPTURE",
            "purchase_units": [
                {
                    "reference_id": reference_id,
                    "custom_id": custom_id,
                    "description": safe_description,
                    "amount": {
                        "currency_code": clean_currency,
                        "value": amount_str,
                    },
                }
            ],
            "application_context": app_context,
        }

        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}",
            "PayPal-Request-Id": idempotency_key.strip(),
        }

        try:
            response = self._http_client.post(
                url,
                json=payload,
                headers=headers,
                timeout=self._timeout,
            )
        except httpx.TimeoutException as exc:
            logger.warning("PayPal create_order timed out for reference %s", reference_id)
            raise PayPalOrderTimeoutError("PayPal order creation timed out. Please retry with the same idempotency key.") from exc
        except httpx.ConnectError as exc:
            logger.warning("PayPal create_order connection failure for reference %s", reference_id)
            raise PayPalOrderNetworkError("Failed to connect to PayPal gateway.") from exc
        except httpx.HTTPError as exc:
            logger.warning("PayPal create_order network error: %s", exc)
            raise PayPalOrderNetworkError("PayPal order creation encountered a network error.") from exc

        return self._parse_order_response(response, amount=amount, currency=clean_currency)

    def _parse_order_response(
        self,
        response: httpx.Response,
        *,
        amount: Decimal,
        currency: str,
    ) -> PayPalOrderResult:
        status_code = response.status_code

        try:
            data = response.json()
        except ValueError as exc:
            logger.error("PayPal response was not valid JSON (HTTP %s)", status_code)
            raise PayPalOrderAPIError(
                f"PayPal returned non-JSON response (HTTP {status_code}).",
                status_code=502,
            ) from exc

        if not isinstance(data, dict):
            raise PayPalOrderAPIError("PayPal returned unexpected response structure.", status_code=502)

        # Handle 4xx / 5xx error responses
        if status_code not in (200, 201):
            error_name = data.get("name")
            error_message = data.get("message", "PayPal order creation failed.")
            details = data.get("details", [])
            logger.warning(
                "PayPal order creation rejected (HTTP %s): %s (%s)",
                status_code,
                error_name,
                error_message,
            )
            raise PayPalOrderAPIError(
                f"PayPal rejected order creation: {error_message}",
                status_code=status_code,
                error_name=error_name,
                details=details,
            )

        order_id = data.get("id")
        order_status = data.get("status")

        if not order_id or not isinstance(order_id, str):
            raise PayPalOrderAPIError("PayPal response missing valid order ID.", status_code=502)
        if not order_status or not isinstance(order_status, str):
            raise PayPalOrderAPIError("PayPal response missing valid order status.", status_code=502)

        # Extract approval URL
        links = data.get("links", [])
        approval_url: str | None = None
        if isinstance(links, list):
            for link in links:
                if isinstance(link, dict) and link.get("rel") == "approve":
                    href = link.get("href")
                    if isinstance(href, str) and href.strip():
                        approval_url = href.strip()
                        break

        if not approval_url:
            raise PayPalOrderAPIError(
                "PayPal order response did not contain a valid buyer approval URL.",
                status_code=502,
            )

        validated_url = self.validate_approval_url(approval_url)

        return PayPalOrderResult(
            order_id=order_id,
            status=order_status,
            approval_url=validated_url,
            currency=currency,
            amount=amount,
            raw_response=data,
        )

    def validate_approval_url(self, url: str) -> str:
        """
        Validate and sanitize buyer approval URL domain against configured environment.

        Prohibits untrusted or spoofed redirect targets using exact allowlists.
        """
        parsed = urlparse(url)
        if parsed.scheme.lower() != "https":
            raise PayPalOrderValidationError(f"Insecure approval URL scheme '{parsed.scheme}'. Must be https.")

        hostname = (parsed.hostname or "").lower()
        if not hostname:
            raise PayPalOrderValidationError("Invalid approval URL: missing hostname.")

        if self._environment in {"production", "live"}:
            if hostname not in ALLOWED_PRODUCTION_HOSTS:
                raise PayPalOrderValidationError(
                    f"Untrusted PayPal approval host '{hostname}' for production environment. "
                    f"Must be one of: {sorted(ALLOWED_PRODUCTION_HOSTS)}"
                )
        else:
            # Sandbox environment
            if hostname not in ALLOWED_SANDBOX_HOSTS:
                raise PayPalOrderValidationError(
                    f"Untrusted PayPal approval host '{hostname}' for sandbox environment. "
                    f"Must be one of: {sorted(ALLOWED_SANDBOX_HOSTS)}"
                )

        return url

    def get_order(self, order_id: str) -> dict[str, Any]:
        """
        Retrieve order details directly from PayPal Orders v2 API (GET /v2/checkout/orders/{order_id}).

        Used for server-side buyer approval verification and state reconciliation.
        """
        clean_order_id = (order_id or "").strip()
        if not clean_order_id:
            raise PayPalOrderValidationError("Order ID is required to retrieve PayPal order.")

        try:
            access_token = self._auth_service.get_access_token()
        except PayPalAuthConfigError as exc:
            logger.error("PayPal credentials not configured: %s", exc)
            raise PayPalOrderConfigError("PayPal payment service credentials are not configured.") from exc
        except PayPalAuthError as exc:
            logger.error("PayPal OAuth2 authentication failed: %s", exc)
            raise PayPalOrderAPIError("Failed to authenticate with PayPal gateway.", status_code=502) from exc

        url = f"{self._base_url}{ORDERS_PATH}/{clean_order_id}"
        headers = {
            "Accept": "application/json",
            "Authorization": f"Bearer {access_token}",
        }

        try:
            response = self._http_client.get(url, headers=headers, timeout=self._timeout)
        except httpx.TimeoutException as exc:
            logger.warning("PayPal get_order timed out for order %s", clean_order_id)
            raise PayPalOrderTimeoutError("PayPal order retrieval timed out.") from exc
        except httpx.ConnectError as exc:
            logger.warning("PayPal get_order connection failure for order %s", clean_order_id)
            raise PayPalOrderNetworkError("Failed to connect to PayPal gateway.") from exc
        except httpx.HTTPError as exc:
            logger.warning("PayPal get_order network error: %s", exc)
            raise PayPalOrderNetworkError("PayPal order retrieval encountered a network error.") from exc

        status_code = response.status_code
        try:
            data = response.json()
        except ValueError as exc:
            logger.error("PayPal response was not valid JSON (HTTP %s)", status_code)
            raise PayPalOrderAPIError(f"PayPal returned non-JSON response (HTTP {status_code}).", status_code=502) from exc

        if not isinstance(data, dict):
            raise PayPalOrderAPIError("PayPal returned unexpected response structure.", status_code=502)

        if status_code != 200:
            error_name = data.get("name")
            error_message = data.get("message", f"Failed to retrieve PayPal order (HTTP {status_code}).")
            details = data.get("details", [])
            logger.warning("PayPal get_order failed (HTTP %s): %s (%s)", status_code, error_name, error_message)
            raise PayPalOrderAPIError(
                error_message,
                status_code=status_code,
                error_name=error_name,
                details=details,
            )

        return data

    def capture_order(
        self,
        order_id: str,
        *,
        idempotency_key: str,
    ) -> PayPalCaptureResult:
        """
        Capture an approved PayPal Orders v2 order (POST /v2/checkout/orders/{order_id}/capture).

        Args:
            order_id: PayPal order identifier.
            idempotency_key: Stable idempotency token sent as PayPal-Request-Id.

        Returns:
            PayPalCaptureResult with capture ID, status, amount, and currency.
        """
        clean_order_id = (order_id or "").strip()
        if not clean_order_id:
            raise PayPalOrderValidationError("Order ID is required to capture PayPal order.")
        clean_idemp = (idempotency_key or "").strip()
        if not clean_idemp:
            raise PayPalOrderValidationError("Idempotency key is required for PayPal order capture.")

        try:
            access_token = self._auth_service.get_access_token()
        except PayPalAuthConfigError as exc:
            logger.error("PayPal credentials not configured: %s", exc)
            raise PayPalOrderConfigError("PayPal payment service credentials are not configured.") from exc
        except PayPalAuthError as exc:
            logger.error("PayPal OAuth2 authentication failed: %s", exc)
            raise PayPalOrderAPIError("Failed to authenticate with PayPal gateway.", status_code=502) from exc

        url = f"{self._base_url}{ORDERS_PATH}/{clean_order_id}/capture"
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}",
            "PayPal-Request-Id": clean_idemp,
        }

        try:
            response = self._http_client.post(
                url,
                json={},
                headers=headers,
                timeout=self._timeout,
            )
        except httpx.TimeoutException as exc:
            logger.warning("PayPal capture_order timed out for order %s", clean_order_id)
            raise PayPalOrderTimeoutError(
                "PayPal order capture timed out. Please retry with the same idempotency key."
            ) from exc
        except httpx.ConnectError as exc:
            logger.warning("PayPal capture_order connection failure for order %s", clean_order_id)
            raise PayPalOrderNetworkError("Failed to connect to PayPal gateway during capture.") from exc
        except httpx.HTTPError as exc:
            logger.warning("PayPal capture_order network error: %s", exc)
            raise PayPalOrderNetworkError("PayPal order capture encountered a network error.") from exc

        status_code = response.status_code
        try:
            data = response.json()
        except ValueError as exc:
            logger.error("PayPal capture response was not valid JSON (HTTP %s)", status_code)
            raise PayPalOrderAPIError(f"PayPal returned non-JSON capture response (HTTP {status_code}).", status_code=502) from exc

        if not isinstance(data, dict):
            raise PayPalOrderAPIError("PayPal returned unexpected capture response structure.", status_code=502)

        # Handle error responses
        if status_code not in (200, 201):
            error_name = data.get("name")
            error_message = data.get("message", "PayPal order capture failed.")
            details = data.get("details", [])
            logger.warning(
                "PayPal order capture rejected (HTTP %s): %s (%s)",
                status_code,
                error_name,
                error_message,
            )

            # Check if order was already captured
            has_already_captured = any(
                isinstance(d, dict) and d.get("issue") == "ORDER_ALREADY_CAPTURED"
                for d in details
            ) or error_name == "ORDER_ALREADY_CAPTURED"

            if has_already_captured:
                # Reconcile from authoritative order data
                logger.info("Order %s was already captured on PayPal; reconciling capture details.", clean_order_id)
                order_data = self.get_order(clean_order_id)
                return self._extract_capture_from_order_data(order_data)

            raise PayPalOrderAPIError(
                f"PayPal rejected order capture: {error_message}",
                status_code=status_code,
                error_name=error_name,
                details=details,
            )

        return self._extract_capture_from_response(clean_order_id, data)

    def _extract_capture_from_response(self, order_id: str, data: dict[str, Any]) -> PayPalCaptureResult:
        purchase_units = data.get("purchase_units", [])
        if not isinstance(purchase_units, list) or not purchase_units:
            raise PayPalOrderAPIError("PayPal capture response missing purchase units.", status_code=502)

        pu = purchase_units[0]
        payments = pu.get("payments", {}) if isinstance(pu, dict) else {}
        captures = payments.get("captures", []) if isinstance(payments, dict) else []

        if not isinstance(captures, list) or not captures:
            raise PayPalOrderAPIError("PayPal capture response missing captures array.", status_code=502)

        cap = captures[0]
        if not isinstance(cap, dict):
            raise PayPalOrderAPIError("PayPal capture data malformed.", status_code=502)

        capture_id = cap.get("id")
        capture_status = cap.get("status")
        amount_data = cap.get("amount", {})
        currency = amount_data.get("currency_code")
        amount_val = amount_data.get("value")

        if not capture_id or not isinstance(capture_id, str):
            raise PayPalOrderAPIError("PayPal capture response missing capture ID.", status_code=502)
        if not capture_status or not isinstance(capture_status, str):
            raise PayPalOrderAPIError("PayPal capture response missing capture status.", status_code=502)
        if not currency or not amount_val:
            raise PayPalOrderAPIError("PayPal capture response missing amount or currency.", status_code=502)

        try:
            amount_decimal = Decimal(str(amount_val))
        except Exception as exc:
            raise PayPalOrderAPIError(f"PayPal capture amount malformed: {amount_val}", status_code=502) from exc

        return PayPalCaptureResult(
            order_id=order_id,
            capture_id=capture_id,
            status=capture_status,
            currency=currency,
            amount=amount_decimal,
            raw_response=data,
        )

    def _extract_capture_from_order_data(self, order_data: dict[str, Any]) -> PayPalCaptureResult:
        order_id = order_data.get("id", "")
        return self._extract_capture_from_response(order_id, order_data)

