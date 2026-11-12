"""PayPal OAuth 2.0 client-credentials authentication with token caching."""

from __future__ import annotations

import logging
import threading
import time
from collections.abc import Callable
from typing import Any, Protocol, Self

import httpx

logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT_SECONDS = 10.0
DEFAULT_REFRESH_SKEW_SECONDS = 60
TOKEN_PATH = "/v1/oauth2/token"


class PayPalAuthError(Exception):
    """Base exception for PayPal authentication failures."""


class PayPalAuthConfigError(PayPalAuthError):
    """Raised when required PayPal credentials are missing or blank."""


class PayPalAuthRequestError(PayPalAuthError):
    """Raised when the token request fails (HTTP, network, or malformed response)."""


class SupportsHttpPost(Protocol):
    """Minimal HTTP client protocol used by PayPalAuthService."""

    def post(self, url: str, **kwargs: Any) -> httpx.Response: ...


class PayPalAuthService:
    """
    Obtain and cache PayPal REST API access tokens via OAuth 2.0.

    Uses the client-credentials grant against POST {base_url}/v1/oauth2/token
    with HTTP Basic authentication (client id + client secret).

    Tokens are cached in memory and refreshed shortly before expiry. Concurrent
    callers share a lock so only one refresh request is in flight at a time.
    """

    def __init__(
        self,
        *,
        client_id: str,
        client_secret: str,
        base_url: str = "https://api-m.sandbox.paypal.com",
        http_client: SupportsHttpPost | None = None,
        timeout: float = DEFAULT_TIMEOUT_SECONDS,
        refresh_skew_seconds: int = DEFAULT_REFRESH_SKEW_SECONDS,
        clock: Callable[[], float] | None = None,
    ) -> None:
        self._client_id = client_id
        self._client_secret = client_secret
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout
        self._refresh_skew_seconds = max(0, refresh_skew_seconds)
        self._clock = clock or time.monotonic
        self._lock = threading.Lock()

        self._owns_client = http_client is None
        self._http_client: SupportsHttpPost = http_client or httpx.Client(
            timeout=timeout
        )

        self._access_token: str | None = None
        self._expires_at: float = 0.0

    def close(self) -> None:
        """Close the owned HTTP client, if any."""
        if self._owns_client and hasattr(self._http_client, "close"):
            self._http_client.close()

    def __enter__(self) -> Self:
        return self

    def __exit__(self, *args: object) -> None:
        self.close()

    def clear_cached_token(self) -> None:
        """Drop any cached access token (does not revoke with PayPal)."""
        with self._lock:
            self._access_token = None
            self._expires_at = 0.0

    def get_access_token(self) -> str:
        """
        Return a valid access token, refreshing from PayPal when needed.

        Never returns credentials in exception messages.
        """
        with self._lock:
            if self._is_cached_token_valid():
                assert self._access_token is not None
                return self._access_token
            return self._request_and_cache_token()

    def _is_cached_token_valid(self) -> bool:
        if not self._access_token:
            return False
        return self._clock() + self._refresh_skew_seconds < self._expires_at

    def _require_credentials(self) -> None:
        if not self._client_id.strip() or not self._client_secret.strip():
            raise PayPalAuthConfigError("PayPal client credentials are not configured.")

    def _token_url(self) -> str:
        return f"{self._base_url}{TOKEN_PATH}"

    def _request_and_cache_token(self) -> str:
        self._require_credentials()

        try:
            response = self._http_client.post(
                self._token_url(),
                data={"grant_type": "client_credentials"},
                auth=(self._client_id, self._client_secret),
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                timeout=self._timeout,
            )
        except httpx.TimeoutException as exc:
            logger.warning("PayPal OAuth token request timed out")
            raise PayPalAuthRequestError("PayPal token request timed out.") from exc
        except httpx.ConnectError as exc:
            logger.warning("PayPal OAuth token request connection failure")
            raise PayPalAuthRequestError(
                "Failed to connect to PayPal token endpoint."
            ) from exc
        except httpx.HTTPError as exc:
            logger.warning("PayPal OAuth token request network error")
            raise PayPalAuthRequestError(
                "PayPal token request failed due to a network error."
            ) from exc

        return self._parse_and_cache_response(response)

    def _parse_and_cache_response(self, response: httpx.Response) -> str:
        status = response.status_code

        if status in {401, 403} or 400 <= status < 500:
            logger.warning("PayPal OAuth authentication rejected (HTTP %s)", status)
            raise PayPalAuthRequestError(
                f"PayPal authentication rejected (HTTP {status})."
            )

        if status >= 500:
            logger.warning("PayPal OAuth server error (HTTP %s)", status)
            raise PayPalAuthRequestError(
                f"PayPal token endpoint returned server error (HTTP {status})."
            )

        if status != 200:
            logger.warning("PayPal OAuth unexpected status (HTTP %s)", status)
            raise PayPalAuthRequestError(
                f"PayPal token endpoint returned unexpected status (HTTP {status})."
            )

        try:
            payload = response.json()
        except ValueError as exc:
            logger.warning("PayPal OAuth response was not valid JSON")
            raise PayPalAuthRequestError(
                "PayPal token response was malformed or incomplete."
            ) from exc

        if not isinstance(payload, dict):
            raise PayPalAuthRequestError(
                "PayPal token response was malformed or incomplete."
            )

        access_token = payload.get("access_token")
        expires_in = payload.get("expires_in")

        if not isinstance(access_token, str) or not access_token.strip():
            raise PayPalAuthRequestError(
                "PayPal token response was malformed or incomplete."
            )

        if isinstance(expires_in, bool) or not isinstance(expires_in, int | float):
            raise PayPalAuthRequestError(
                "PayPal token response was malformed or incomplete."
            )

        expires_in_seconds = float(expires_in)
        if expires_in_seconds <= 0:
            raise PayPalAuthRequestError(
                "PayPal token response was malformed or incomplete."
            )

        self._access_token = access_token
        self._expires_at = self._clock() + expires_in_seconds
        return access_token
