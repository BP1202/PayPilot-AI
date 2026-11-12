"""Tests for PayPal OAuth 2.0 client-credentials authentication."""

from __future__ import annotations

import base64
import threading
import time
from typing import Any
from urllib.parse import parse_qs

import httpx
import pytest

from app.services.paypal_auth import (
    PayPalAuthConfigError,
    PayPalAuthError,
    PayPalAuthRequestError,
    PayPalAuthService,
)

SANDBOX_BASE_URL = "https://api-m.sandbox.paypal.com"
TOKEN_PATH = "/v1/oauth2/token"
CLIENT_ID = "test-paypal-client-id"
CLIENT_SECRET = "test-paypal-client-secret"
ACCESS_TOKEN = "TEST_ACCESS_TOKEN_VALUE"
ACCESS_TOKEN_REFRESHED = "TEST_ACCESS_TOKEN_REFRESHED"


def _basic_auth_header(client_id: str, client_secret: str) -> str:
    raw = f"{client_id}:{client_secret}".encode()
    return "Basic " + base64.b64encode(raw).decode()


def _token_payload(
    *,
    access_token: str = ACCESS_TOKEN,
    expires_in: int = 3600,
    include_token: bool = True,
    include_expires: bool = True,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "token_type": "Bearer",
        "app_id": "APP-TEST",
    }
    if include_token:
        payload["access_token"] = access_token
    if include_expires:
        payload["expires_in"] = expires_in
    return payload


class _RecordingClock:
    def __init__(self, start: float = 1_000.0) -> None:
        self.now = start

    def __call__(self) -> float:
        return self.now

    def advance(self, seconds: float) -> None:
        self.now += seconds


def _build_service(
    handler: Any,
    *,
    client_id: str = CLIENT_ID,
    client_secret: str = CLIENT_SECRET,
    base_url: str = SANDBOX_BASE_URL,
    refresh_skew_seconds: int = 60,
    clock: Any | None = None,
    timeout: float = 5.0,
) -> PayPalAuthService:
    transport = httpx.MockTransport(handler)
    client = httpx.Client(transport=transport, timeout=timeout)
    return PayPalAuthService(
        client_id=client_id,
        client_secret=client_secret,
        base_url=base_url,
        http_client=client,
        timeout=timeout,
        refresh_skew_seconds=refresh_skew_seconds,
        clock=clock,
    )


def test_get_access_token_success_uses_oauth_endpoint_basic_auth_and_grant_type():
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(200, json=_token_payload())

    service = _build_service(handler)
    token = service.get_access_token()

    assert token == ACCESS_TOKEN
    assert len(requests) == 1
    request = requests[0]
    assert request.method == "POST"
    assert str(request.url) == f"{SANDBOX_BASE_URL}{TOKEN_PATH}"
    assert request.headers.get("Authorization") == _basic_auth_header(
        CLIENT_ID, CLIENT_SECRET
    )
    content_type = request.headers.get("Content-Type", "")
    assert "application/x-www-form-urlencoded" in content_type
    form = parse_qs(request.content.decode())
    assert form.get("grant_type") == ["client_credentials"]


def test_cached_token_is_reused_without_additional_http_calls():
    call_count = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        call_count["n"] += 1
        return httpx.Response(200, json=_token_payload(expires_in=3600))

    clock = _RecordingClock()
    service = _build_service(handler, clock=clock)

    first = service.get_access_token()
    clock.advance(10)
    second = service.get_access_token()

    assert first == second == ACCESS_TOKEN
    assert call_count["n"] == 1


def test_token_is_refreshed_when_near_expiry():
    tokens = [ACCESS_TOKEN, ACCESS_TOKEN_REFRESHED]
    call_count = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        idx = call_count["n"]
        call_count["n"] += 1
        return httpx.Response(
            200,
            json=_token_payload(access_token=tokens[idx], expires_in=120),
        )

    clock = _RecordingClock()
    service = _build_service(handler, clock=clock, refresh_skew_seconds=60)

    first = service.get_access_token()
    # expires_in=120 with 60s skew => refresh after 60s of age
    clock.advance(61)
    second = service.get_access_token()

    assert first == ACCESS_TOKEN
    assert second == ACCESS_TOKEN_REFRESHED
    assert call_count["n"] == 2


def test_token_is_refreshed_after_full_expiry():
    call_count = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        call_count["n"] += 1
        token = ACCESS_TOKEN if call_count["n"] == 1 else ACCESS_TOKEN_REFRESHED
        return httpx.Response(
            200, json=_token_payload(access_token=token, expires_in=30)
        )

    clock = _RecordingClock()
    service = _build_service(handler, clock=clock, refresh_skew_seconds=5)

    first = service.get_access_token()
    clock.advance(40)
    second = service.get_access_token()

    assert first == ACCESS_TOKEN
    assert second == ACCESS_TOKEN_REFRESHED
    assert call_count["n"] == 2


@pytest.mark.parametrize("status_code", [401, 403])
def test_authentication_rejection_raises_safe_error(status_code: int):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            status_code,
            json={"error": "invalid_client", "error_description": CLIENT_SECRET},
        )

    service = _build_service(handler)

    with pytest.raises(PayPalAuthRequestError) as exc_info:
        service.get_access_token()

    message = str(exc_info.value)
    assert CLIENT_SECRET not in message
    assert ACCESS_TOKEN not in message
    assert str(status_code) in message


def test_server_error_raises_safe_error():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(503, json={"name": "INTERNAL_SERVICE_ERROR"})

    service = _build_service(handler)

    with pytest.raises(PayPalAuthRequestError) as exc_info:
        service.get_access_token()

    assert "503" in str(exc_info.value)
    assert CLIENT_SECRET not in str(exc_info.value)


def test_network_connection_failure_raises_safe_error():
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused")

    service = _build_service(handler)

    with pytest.raises(PayPalAuthRequestError) as exc_info:
        service.get_access_token()

    message = str(exc_info.value).lower()
    assert "connect" in message or "network" in message
    assert CLIENT_SECRET not in str(exc_info.value)


def test_timeout_raises_safe_error():
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.TimeoutException("request timed out")

    service = _build_service(handler)

    with pytest.raises(PayPalAuthRequestError) as exc_info:
        service.get_access_token()

    assert "timed out" in str(exc_info.value).lower()
    assert CLIENT_SECRET not in str(exc_info.value)


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"expires_in": 3600},
        {"access_token": ACCESS_TOKEN},
        {"access_token": "", "expires_in": 3600},
        {"access_token": ACCESS_TOKEN, "expires_in": "not-an-int"},
        "not-json",
    ],
)
def test_malformed_or_incomplete_token_response(payload: Any):
    def handler(request: httpx.Request) -> httpx.Response:
        if payload == "not-json":
            return httpx.Response(200, text="not-json")
        return httpx.Response(200, json=payload)

    service = _build_service(handler)

    with pytest.raises(PayPalAuthRequestError) as exc_info:
        service.get_access_token()

    message = str(exc_info.value).lower()
    assert "malformed" in message or "incomplete" in message
    assert CLIENT_SECRET not in str(exc_info.value)
    assert ACCESS_TOKEN not in str(exc_info.value)


@pytest.mark.parametrize(
    ("client_id", "client_secret"),
    [
        ("", CLIENT_SECRET),
        (CLIENT_ID, ""),
        ("", ""),
        ("   ", CLIENT_SECRET),
        (CLIENT_ID, "   "),
    ],
)
def test_missing_credentials_raise_config_error(client_id: str, client_secret: str):
    def handler(request: httpx.Request) -> httpx.Response:
        pytest.fail("HTTP must not be called when credentials are missing")

    service = _build_service(handler, client_id=client_id, client_secret=client_secret)

    with pytest.raises(PayPalAuthConfigError) as exc_info:
        service.get_access_token()

    assert CLIENT_SECRET not in str(exc_info.value)
    assert isinstance(exc_info.value, PayPalAuthError)


def test_concurrent_get_access_token_does_not_duplicate_requests():
    call_count = {"n": 0}
    release_handler = threading.Event()
    entered_handler = threading.Event()

    def handler(request: httpx.Request) -> httpx.Response:
        call_count["n"] += 1
        entered_handler.set()
        # Hold the first request until both callers have started.
        assert release_handler.wait(timeout=2.0)
        time.sleep(0.05)
        return httpx.Response(200, json=_token_payload(expires_in=3600))

    service = _build_service(handler)
    results: list[str] = []
    errors: list[BaseException] = []

    def worker() -> None:
        try:
            results.append(service.get_access_token())
        except BaseException as exc:  # noqa: BLE001 - capture for assertion
            errors.append(exc)

    threads = [threading.Thread(target=worker) for _ in range(2)]
    for thread in threads:
        thread.start()

    assert entered_handler.wait(timeout=2.0)
    # Give the second thread a moment to block on the lock.
    time.sleep(0.1)
    release_handler.set()

    for thread in threads:
        thread.join(timeout=3.0)

    assert errors == []
    assert results == [ACCESS_TOKEN, ACCESS_TOKEN]
    assert call_count["n"] == 1


def test_error_messages_never_include_access_token_or_secret():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            401,
            text=f"unauthorized secret={CLIENT_SECRET} token={ACCESS_TOKEN}",
        )

    service = _build_service(handler)

    with pytest.raises(PayPalAuthRequestError) as exc_info:
        service.get_access_token()

    message = str(exc_info.value)
    assert CLIENT_SECRET not in message
    assert ACCESS_TOKEN not in message
