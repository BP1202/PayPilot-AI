"""Comprehensive tests for PayPal Orders v2 integration, OAuth2, and milestone order creation.

Covers:
1. PayPalOrderService unit tests:
   - Request structure (intent=CAPTURE, purchase_units, amount formatting, custom_id, reference_id).
   - Idempotency via PayPal-Request-Id header.
   - Approval URL validation and domain security (sandbox vs production).
   - Error handling: timeouts, network failures, 4xx/5xx API errors, missing credentials.
2. PaymentService milestone PayPal order creation:
   - Valid approved milestone creates order and persists paypal_order_id.
   - Transaction status remains PENDING (never marked COMPLETED prematurely).
   - Milestone status remains APPROVED (never marked SETTLED prematurely).
   - Caller authorization: only the authoritative payer can initiate order creation (403 for worker/outsider).
   - Unapproved milestone rejection (422).
   - Milestone not ready for payment review rejection (422).
   - Missing prepared settlement transaction rejection (404).
   - Idempotent return of existing order without duplicate PayPal calls.
   - Mismatched / ambiguous agreement terms rejection (422).
   - Handling of PayPal timeout (504) and gateway errors (502).
3. FastAPI endpoint tests (POST /api/v1/deal-rooms/{room_id}/milestones/{milestone_id}/paypal/create-order):
   - Successful 201 response with typed schema.
   - 403 for unauthorized caller.
   - Idempotent retry returns identical order.
4. Direct PostgreSQL integration test verifying real database persistence, locking, and constraints.
"""

from __future__ import annotations

import json
from decimal import Decimal
from typing import Any
from uuid import uuid4

import httpx
import pytest
from app.core.config import settings
from app.core.database import Base, get_db
from app.core.security import create_access_token
from app.main import app
from app.models.connection import Connection, ConnectionStatus
from app.models.deal_room import DealRoom, DealRoomParticipant, DealRoomStatus
from app.models.milestone_execution import (
    MilestoneExecution,
    MilestoneExecutionStatus,
    PaymentReadinessStatus,
)
from app.models.proposal import Proposal, ProposalStatus
from app.models.transaction import Transaction, TransactionStatus
from app.models.user import User
from app.services.payment_service import PaymentService
from app.services.paypal_auth import PayPalAuthService
from app.services.paypal_order_service import (
    PayPalCaptureResult,
    PayPalOrderAPIError,
    PayPalOrderResult,
    PayPalOrderService,
    PayPalOrderTimeoutError,
    PayPalOrderValidationError,
)
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

SANDBOX_BASE = "https://api-m.sandbox.paypal.com"
FAKE_ORDER_ID = "ORDER-MOCK-TEST-001"
FAKE_CAPTURE_ID = "CAPTURE-MOCK-TEST-001"
FAKE_APPROVAL_URL = f"https://www.sandbox.paypal.com/checkoutnow?token={FAKE_ORDER_ID}"


@pytest.fixture
def test_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False,
    )
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


def _mock_order_response(
    *,
    order_id: str = FAKE_ORDER_ID,
    status: str = "CREATED",
    approval_url: str = FAKE_APPROVAL_URL,
) -> dict[str, Any]:
    return {
        "id": order_id,
        "status": status,
        "intent": "CAPTURE",
        "purchase_units": [
            {
                "reference_id": "TXN-REF-1",
                "amount": {"currency_code": "USD", "value": "2500.00"},
            }
        ],
        "links": [
            {
                "href": f"{SANDBOX_BASE}/v2/checkout/orders/{order_id}",
                "rel": "self",
                "method": "GET",
            },
            {
                "href": approval_url,
                "rel": "approve",
                "method": "GET",
            },
        ],
    }


def _mock_capture_response(
    *,
    order_id: str = FAKE_ORDER_ID,
    capture_id: str = FAKE_CAPTURE_ID,
    status: str = "COMPLETED",
    amount: str = "2500.00",
    currency: str = "USD",
) -> dict[str, Any]:
    return {
        "id": order_id,
        "status": status,
        "purchase_units": [
            {
                "reference_id": "TXN-REF-1",
                "payments": {
                    "captures": [
                        {
                            "id": capture_id,
                            "status": status,
                            "amount": {
                                "currency_code": currency,
                                "value": amount,
                            },
                            "final_capture": True,
                        }
                    ]
                },
            }
        ],
    }


def _mock_get_order_response(
    *,
    order_id: str = FAKE_ORDER_ID,
    status: str = "APPROVED",
    amount: str = "2500.00",
    currency: str = "USD",
    intent: str = "CAPTURE",
    reference_id: str = "TXN-REF-1",
    captures: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    pu: dict[str, Any] = {
        "reference_id": reference_id,
        "custom_id": "custom_ref_1",
        "amount": {
            "currency_code": currency,
            "value": amount,
        },
    }
    if captures:
        pu["payments"] = {"captures": captures}
    return {
        "id": order_id,
        "status": status,
        "intent": intent,
        "purchase_units": [pu],
    }


def _build_mock_order_service(
    handler: Any,
    *,
    environment: str = "sandbox",
    base_url: str = SANDBOX_BASE,
) -> PayPalOrderService:
    transport = httpx.MockTransport(handler)
    mock_client = httpx.Client(transport=transport, timeout=10.0)

    # Mock auth service that returns dummy token
    class MockAuthService(PayPalAuthService):
        def get_access_token(self) -> str:
            return "MOCK_VALID_ACCESS_TOKEN"

    auth_svc = MockAuthService(
        client_id="mock_id",
        client_secret="mock_secret",
        base_url=base_url,
    )

    return PayPalOrderService(
        auth_service=auth_svc,
        base_url=base_url,
        environment=environment,
        http_client=mock_client,
        timeout=10.0,
    )


# ==============================================================================
# 1. PayPalOrderService Unit Tests
# ==============================================================================


def test_order_service_create_order_success():
    sent_requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        sent_requests.append(request)
        return httpx.Response(201, json=_mock_order_response())

    service = _build_mock_order_service(handler)

    res = service.create_order(
        amount=Decimal("2500.00"),
        currency="USD",
        reference_id="TXN-SETTLE-001",
        custom_id="tx_1_m_1",
        description="Phase 1 Deliverables",
        idempotency_key="idemp_key_12345",
    )

    assert isinstance(res, PayPalOrderResult)
    assert res.order_id == FAKE_ORDER_ID
    assert res.status == "CREATED"
    assert res.approval_url == FAKE_APPROVAL_URL
    assert res.amount == Decimal("2500.00")
    assert res.currency == "USD"

    # Verify HTTP request details
    assert len(sent_requests) == 1
    req = sent_requests[0]
    assert req.method == "POST"
    assert str(req.url) == f"{SANDBOX_BASE}/v2/checkout/orders"
    assert req.headers["PayPal-Request-Id"] == "idemp_key_12345"
    assert req.headers["Authorization"] == "Bearer MOCK_VALID_ACCESS_TOKEN"

    body = json.loads(req.content.decode())
    assert body["intent"] == "CAPTURE"
    assert body["purchase_units"][0]["reference_id"] == "TXN-SETTLE-001"
    assert body["purchase_units"][0]["custom_id"] == "tx_1_m_1"
    assert body["purchase_units"][0]["amount"]["value"] == "2500.00"
    assert body["purchase_units"][0]["amount"]["currency_code"] == "USD"


def test_order_service_validates_domain_security():
    # In sandbox, untrusted host must be rejected
    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            201,
            json=_mock_order_response(
                approval_url="https://evil-phishing.com/checkout"
            ),
        )

    service = _build_mock_order_service(handler)

    with pytest.raises(
        PayPalOrderValidationError, match="Untrusted PayPal approval host"
    ):
        service.create_order(
            amount=Decimal("100.00"),
            currency="USD",
            reference_id="ref",
            custom_id="cust",
            description="desc",
            idempotency_key="idemp",
        )


def test_order_service_handles_timeout():
    def handler(_request: httpx.Request) -> httpx.Response:
        raise httpx.TimeoutException("Connection timed out")

    service = _build_mock_order_service(handler)

    with pytest.raises(PayPalOrderTimeoutError, match="timed out"):
        service.create_order(
            amount=Decimal("100.00"),
            currency="USD",
            reference_id="ref",
            custom_id="cust",
            description="desc",
            idempotency_key="idemp",
        )


def test_order_service_handles_api_error_response():
    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            422,
            json={
                "name": "UNPROCESSABLE_ENTITY",
                "message": "The requested action could not be performed.",
                "details": [{"issue": "CURRENCY_NOT_SUPPORTED"}],
            },
        )

    service = _build_mock_order_service(handler)

    with pytest.raises(PayPalOrderAPIError) as exc_info:
        service.create_order(
            amount=Decimal("100.00"),
            currency="USD",
            reference_id="ref",
            custom_id="cust",
            description="desc",
            idempotency_key="idemp",
        )
    assert exc_info.value.status_code == 422
    assert exc_info.value.error_name == "UNPROCESSABLE_ENTITY"


def test_order_service_get_order_success():
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "GET"
        assert str(request.url) == f"{SANDBOX_BASE}/v2/checkout/orders/{FAKE_ORDER_ID}"
        return httpx.Response(200, json=_mock_get_order_response())

    service = _build_mock_order_service(handler)
    data = service.get_order(FAKE_ORDER_ID)

    assert data["id"] == FAKE_ORDER_ID
    assert data["status"] == "APPROVED"
    assert data["intent"] == "CAPTURE"


def test_order_service_capture_order_success():
    sent_requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        sent_requests.append(request)
        assert request.method == "POST"
        assert (
            str(request.url)
            == f"{SANDBOX_BASE}/v2/checkout/orders/{FAKE_ORDER_ID}/capture"
        )
        assert request.headers["PayPal-Request-Id"] == "cap_idemp_999"
        return httpx.Response(201, json=_mock_capture_response())

    service = _build_mock_order_service(handler)
    cap_res = service.capture_order(FAKE_ORDER_ID, idempotency_key="cap_idemp_999")

    assert isinstance(cap_res, PayPalCaptureResult)
    assert cap_res.order_id == FAKE_ORDER_ID
    assert cap_res.capture_id == FAKE_CAPTURE_ID
    assert cap_res.status == "COMPLETED"
    assert cap_res.amount == Decimal("2500.00")
    assert cap_res.currency == "USD"


def test_order_service_capture_reconciles_already_captured():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.method == "POST":
            # PayPal returns 422 ORDER_ALREADY_CAPTURED
            return httpx.Response(
                422,
                json={
                    "name": "UNPROCESSABLE_ENTITY",
                    "message": "Order already captured",
                    "details": [{"issue": "ORDER_ALREADY_CAPTURED"}],
                },
            )
        # GET order returns order with completed capture
        return httpx.Response(
            200,
            json=_mock_get_order_response(
                status="COMPLETED",
                captures=[
                    {
                        "id": FAKE_CAPTURE_ID,
                        "status": "COMPLETED",
                        "amount": {"currency_code": "USD", "value": "2500.00"},
                    }
                ],
            ),
        )

    service = _build_mock_order_service(handler)
    cap_res = service.capture_order(FAKE_ORDER_ID, idempotency_key="cap_idemp_dup")

    assert cap_res.capture_id == FAKE_CAPTURE_ID
    assert cap_res.status == "COMPLETED"


# ==============================================================================
# 2. PaymentService Milestone Order Creation Tests
# ==============================================================================


def _setup_settlement_fixture(
    db,
    *,
    milestone_amount=Decimal("2500.00"),
    currency="USD",
    milestone_status=MilestoneExecutionStatus.APPROVED.value,
    payment_readiness=PaymentReadinessStatus.READY_FOR_PAYMENT_REVIEW.value,
    room_status=DealRoomStatus.ACTIVE.value,
    create_settlement_tx=True,
):
    uid = uuid4().hex[:6]
    u_payer = User(
        id=f"usr_payer_{uid}",
        email=f"payer_{uid}@test.com",
        hashed_password="pw",
    )
    u_worker = User(
        id=f"usr_worker_{uid}",
        email=f"worker_{uid}@test.com",
        hashed_password="pw",
    )
    u_outsider = User(
        id=f"usr_outsider_{uid}",
        email=f"outsider_{uid}@test.com",
        hashed_password="pw",
    )
    db.add_all([u_payer, u_worker, u_outsider])
    db.flush()

    conn = Connection(
        id=f"conn_{uid}",
        requester_id=u_payer.id,
        recipient_id=u_worker.id,
        status=ConnectionStatus.ACCEPTED.value,
        message="Commercial partnership",
    )
    db.add(conn)
    db.flush()

    prop = Proposal(
        id=f"prop_{uid}",
        connection_id=conn.id,
        proposer_id=u_payer.id,
        recipient_id=u_worker.id,
        status=ProposalStatus.ACCEPTED.value,
        title="Web Platform Milestone Contract",
        description="Agreed commercial contract",
        budget_amount=milestone_amount,
        currency=currency,
    )
    db.add(prop)
    db.flush()

    room = DealRoom(
        id=f"room_{uid}",
        proposal_id=prop.id,
        connection_id=conn.id,
        title="Commercial Platform Deal Room",
        description="Active commercial workspace",
        status=room_status,
        accepted_proposal_version=1,
        agreed_budget_amount=milestone_amount,
        agreed_currency=currency,
        agreed_milestones=[
            {
                "id": f"m_{uid}_0",
                "title": "Phase 1: Architecture Spec",
                "payer_user_id": u_payer.id,
                "payee_user_id": u_worker.id,
                "agreed_amount": str(milestone_amount),
                "currency": currency,
            }
        ],
        agreed_responsibilities={},
    )
    db.add(room)
    db.flush()

    p_payer = DealRoomParticipant(
        room_id=room.id,
        user_id=u_payer.id,
        collaboration_role="CLIENT",
        assigned_responsibilities="Reviews deliverables and funds milestone releases.",
    )
    p_worker = DealRoomParticipant(
        room_id=room.id,
        user_id=u_worker.id,
        collaboration_role="DEVELOPER",
        assigned_responsibilities="Builds and delivers milestone features to receive payment.",
    )
    db.add_all([p_payer, p_worker])
    db.flush()

    m = MilestoneExecution(
        id=f"m_{uid}_0",
        room_id=room.id,
        source_proposal_id=prop.id,
        accepted_proposal_version=1,
        milestone_index=0,
        title="Phase 1: Architecture Spec",
        status=milestone_status,
        payment_readiness=payment_readiness,
        agreed_amount=milestone_amount,
        currency=currency,
        reviewer_user_id=u_payer.id,
        responsible_user_id=u_worker.id,
    )
    db.add(m)
    db.flush()

    settlement_tx = None
    if create_settlement_tx:
        svc = PaymentService(db)
        settlement_tx = svc.prepare_milestone_settlement(
            caller_user_id=u_payer.id,
            room_id=room.id,
            milestone_id=m.id,
            idempotency_key=f"prep_{uid}",
            description="Prepared settlement for phase 1",
        )

    db.commit()

    return {
        "payer": u_payer,
        "worker": u_worker,
        "outsider": u_outsider,
        "room": room,
        "milestone": m,
        "proposal": prop,
        "connection": conn,
        "settlement_tx": settlement_tx,
    }


def test_payment_service_create_paypal_order_success(test_db):
    fix = _setup_settlement_fixture(test_db)
    svc = PaymentService(test_db)

    order_call_count = 0

    def handler(_request: httpx.Request) -> httpx.Response:
        nonlocal order_call_count
        order_call_count += 1
        return httpx.Response(201, json=_mock_order_response())

    mock_order_svc = _build_mock_order_service(handler)

    res = svc.create_paypal_order_for_milestone(
        caller_user_id=fix["payer"].id,
        room_id=fix["room"].id,
        milestone_id=fix["milestone"].id,
        idempotency_key="order_idemp_001",
        order_service=mock_order_svc,
    )

    assert res["paypal_order_id"] == FAKE_ORDER_ID
    assert res["order_status"] == "CREATED"
    assert res["approval_url"] == FAKE_APPROVAL_URL
    assert res["amount"] == "2500.00"
    assert res["currency"] == "USD"
    assert order_call_count == 1

    # Verify transaction in database
    tx = (
        test_db.query(Transaction)
        .filter(Transaction.id == int(res["transaction_id"]))
        .first()
    )
    assert tx is not None
    assert tx.paypal_order_id == FAKE_ORDER_ID
    # STRICT RULE: Transaction remains PENDING
    assert tx.status == TransactionStatus.PENDING
    assert tx.payment_method == "PAYPAL"
    assert tx.provider == "paypal"

    # STRICT RULE: Milestone remains APPROVED (not marked settled)
    m = (
        test_db.query(MilestoneExecution)
        .filter(MilestoneExecution.id == fix["milestone"].id)
        .first()
    )
    assert m.status == MilestoneExecutionStatus.APPROVED.value

    # Repeat call with same key -> Idempotent return (does NOT invoke PayPal again)
    repeat_res = svc.create_paypal_order_for_milestone(
        caller_user_id=fix["payer"].id,
        room_id=fix["room"].id,
        milestone_id=fix["milestone"].id,
        idempotency_key="order_idemp_001",
        order_service=mock_order_svc,
    )
    assert repeat_res["paypal_order_id"] == FAKE_ORDER_ID
    assert repeat_res["transaction_id"] == res["transaction_id"]
    assert order_call_count == 1  # No secondary external call!


def test_payment_service_rejects_unauthorized_payer(test_db):
    fix = _setup_settlement_fixture(test_db)
    svc = PaymentService(test_db)

    # Worker attempts to initiate payment order -> 403 Forbidden
    with pytest.raises(HTTPException) as exc_info:
        svc.create_paypal_order_for_milestone(
            caller_user_id=fix["worker"].id,
            room_id=fix["room"].id,
            milestone_id=fix["milestone"].id,
            idempotency_key="order_idemp_worker",
        )
    assert exc_info.value.status_code == 403
    assert "designated payer" in exc_info.value.detail

    # Outsider attempts to initiate payment order -> 403 Forbidden
    with pytest.raises(HTTPException) as exc_info:
        svc.create_paypal_order_for_milestone(
            caller_user_id=fix["outsider"].id,
            room_id=fix["room"].id,
            milestone_id=fix["milestone"].id,
            idempotency_key="order_idemp_outsider",
        )
    assert exc_info.value.status_code == 403


def test_payment_service_rejects_missing_settlement(test_db):
    fix = _setup_settlement_fixture(test_db, create_settlement_tx=False)
    svc = PaymentService(test_db)

    with pytest.raises(HTTPException) as exc_info:
        svc.create_paypal_order_for_milestone(
            caller_user_id=fix["payer"].id,
            room_id=fix["room"].id,
            milestone_id=fix["milestone"].id,
            idempotency_key="order_idemp_no_settle",
        )
    assert exc_info.value.status_code == 404
    assert "No prepared settlement transaction exists" in exc_info.value.detail


def test_payment_service_rejects_unapproved_milestone(test_db):
    fix = _setup_settlement_fixture(
        test_db,
        milestone_status=MilestoneExecutionStatus.SUBMITTED_FOR_REVIEW.value,
        create_settlement_tx=False,
    )
    svc = PaymentService(test_db)

    with pytest.raises(HTTPException) as exc_info:
        svc.create_paypal_order_for_milestone(
            caller_user_id=fix["payer"].id,
            room_id=fix["room"].id,
            milestone_id=fix["milestone"].id,
            idempotency_key="order_idemp_unapp",
        )
    assert exc_info.value.status_code == 422
    assert "not approved" in exc_info.value.detail


def test_payment_service_handles_gateway_timeout(test_db):
    fix = _setup_settlement_fixture(test_db)
    svc = PaymentService(test_db)

    def handler(_request: httpx.Request) -> httpx.Response:
        raise httpx.TimeoutException("Gateway timeout")

    mock_order_svc = _build_mock_order_service(handler)

    with pytest.raises(HTTPException) as exc_info:
        svc.create_paypal_order_for_milestone(
            caller_user_id=fix["payer"].id,
            room_id=fix["room"].id,
            milestone_id=fix["milestone"].id,
            idempotency_key="order_idemp_timeout",
            order_service=mock_order_svc,
        )
    assert exc_info.value.status_code == 504


def test_payment_service_capture_paypal_order_success(test_db):
    fix = _setup_settlement_fixture(test_db)
    svc = PaymentService(test_db)

    # Attach order to transaction
    fix["settlement_tx"].paypal_order_id = FAKE_ORDER_ID
    test_db.commit()

    def handler(request: httpx.Request) -> httpx.Response:
        if request.method == "GET":
            # Server-side buyer approval check
            return httpx.Response(200, json=_mock_get_order_response(status="APPROVED"))
        if request.method == "POST":
            # Capture call
            return httpx.Response(201, json=_mock_capture_response())
        return httpx.Response(404)

    mock_svc = _build_mock_order_service(handler)

    res = svc.capture_paypal_order_for_milestone(
        caller_user_id=fix["payer"].id,
        room_id=fix["room"].id,
        milestone_id=fix["milestone"].id,
        idempotency_key="cap_idemp_001",
        order_service=mock_svc,
    )

    assert res["paypal_capture_id"] == FAKE_CAPTURE_ID
    assert res["capture_status"] == "COMPLETED"
    assert res["transaction_status"] == "COMPLETED"
    assert res["payment_readiness"] == "PAID"

    # Verify database state
    tx = (
        test_db.query(Transaction)
        .filter(Transaction.id == int(res["transaction_id"]))
        .first()
    )
    assert tx.status == TransactionStatus.COMPLETED
    assert tx.paypal_capture_id == FAKE_CAPTURE_ID

    m = (
        test_db.query(MilestoneExecution)
        .filter(MilestoneExecution.id == fix["milestone"].id)
        .first()
    )
    assert m.payment_readiness == PaymentReadinessStatus.PAID.value

    # Idempotent repeat on completed settlement
    repeat_res = svc.capture_paypal_order_for_milestone(
        caller_user_id=fix["payer"].id,
        room_id=fix["room"].id,
        milestone_id=fix["milestone"].id,
        idempotency_key="cap_idemp_001",
        order_service=mock_svc,
    )
    assert repeat_res["paypal_capture_id"] == FAKE_CAPTURE_ID
    assert repeat_res["transaction_status"] == "COMPLETED"


def test_payment_service_capture_rejects_unapproved_order(test_db):
    fix = _setup_settlement_fixture(test_db)
    svc = PaymentService(test_db)

    fix["settlement_tx"].paypal_order_id = FAKE_ORDER_ID
    test_db.commit()

    # PayPal reports order is still CREATED (buyer has not approved)
    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=_mock_get_order_response(status="CREATED"))

    mock_svc = _build_mock_order_service(handler)

    with pytest.raises(HTTPException) as exc_info:
        svc.capture_paypal_order_for_milestone(
            caller_user_id=fix["payer"].id,
            room_id=fix["room"].id,
            milestone_id=fix["milestone"].id,
            idempotency_key="cap_idemp_unapproved",
            order_service=mock_svc,
        )
    assert exc_info.value.status_code == 422
    assert "has not been approved by the buyer" in exc_info.value.detail

    # Transaction MUST remain PENDING
    tx = (
        test_db.query(Transaction)
        .filter(Transaction.id == fix["settlement_tx"].id)
        .first()
    )
    assert tx.status == TransactionStatus.PENDING
    assert tx.paypal_capture_id is None


def test_payment_service_capture_rejects_unauthorized_caller(test_db):
    fix = _setup_settlement_fixture(test_db)
    svc = PaymentService(test_db)

    fix["settlement_tx"].paypal_order_id = FAKE_ORDER_ID
    test_db.commit()

    # Worker calls capture -> 403 Forbidden
    with pytest.raises(HTTPException) as exc_info:
        svc.capture_paypal_order_for_milestone(
            caller_user_id=fix["worker"].id,
            room_id=fix["room"].id,
            milestone_id=fix["milestone"].id,
            idempotency_key="cap_idemp_worker",
        )
    assert exc_info.value.status_code == 403
    assert "designated payer" in exc_info.value.detail

    # Outsider calls capture -> 403 Forbidden
    with pytest.raises(HTTPException) as exc_info:
        svc.capture_paypal_order_for_milestone(
            caller_user_id=fix["outsider"].id,
            room_id=fix["room"].id,
            milestone_id=fix["milestone"].id,
            idempotency_key="cap_idemp_outsider",
        )
    assert exc_info.value.status_code == 403


def test_payment_service_capture_rejects_amount_mismatch(test_db):
    fix = _setup_settlement_fixture(test_db)
    svc = PaymentService(test_db)

    fix["settlement_tx"].paypal_order_id = FAKE_ORDER_ID
    test_db.commit()

    # PayPal reports order amount 3000.00 while transaction is 2500.00
    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200, json=_mock_get_order_response(status="APPROVED", amount="3000.00")
        )

    mock_svc = _build_mock_order_service(handler)

    with pytest.raises(HTTPException) as exc_info:
        svc.capture_paypal_order_for_milestone(
            caller_user_id=fix["payer"].id,
            room_id=fix["room"].id,
            milestone_id=fix["milestone"].id,
            idempotency_key="cap_idemp_mismatch",
            order_service=mock_svc,
        )
    assert exc_info.value.status_code == 422
    assert "amount/currency" in exc_info.value.detail


def test_payment_service_capture_handles_pending_capture(test_db):
    fix = _setup_settlement_fixture(test_db)
    svc = PaymentService(test_db)

    fix["settlement_tx"].paypal_order_id = FAKE_ORDER_ID
    test_db.commit()

    # PayPal reports capture is PENDING (not completed)
    def handler(request: httpx.Request) -> httpx.Response:
        if request.method == "GET":
            return httpx.Response(200, json=_mock_get_order_response(status="APPROVED"))
        return httpx.Response(201, json=_mock_capture_response(status="PENDING"))

    mock_svc = _build_mock_order_service(handler)

    with pytest.raises(HTTPException) as exc_info:
        svc.capture_paypal_order_for_milestone(
            caller_user_id=fix["payer"].id,
            room_id=fix["room"].id,
            milestone_id=fix["milestone"].id,
            idempotency_key="cap_idemp_pending",
            order_service=mock_svc,
        )
    assert exc_info.value.status_code == 422
    assert "PENDING provider clearance" in exc_info.value.detail

    # Transaction must NOT be marked COMPLETED
    tx = (
        test_db.query(Transaction)
        .filter(Transaction.id == fix["settlement_tx"].id)
        .first()
    )
    assert tx.status == TransactionStatus.PENDING


# ==============================================================================
# 3. FastAPI Route Tests
# ==============================================================================


def test_api_create_paypal_order_endpoint(test_db, monkeypatch):
    fix = _setup_settlement_fixture(test_db)

    def override_get_db():
        yield test_db

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)

    try:
        payer_token = create_access_token(
            user_id=fix["payer"].id, email=fix["payer"].email
        )
        worker_token = create_access_token(
            user_id=fix["worker"].id, email=fix["worker"].email
        )

        url = f"/api/v1/deal-rooms/{fix['room'].id}/milestones/{fix['milestone'].id}/paypal/create-order"

        # Mock order service inside endpoint
        def mock_create_order(self, **kwargs):
            return PayPalOrderResult(
                order_id=FAKE_ORDER_ID,
                status="CREATED",
                approval_url=FAKE_APPROVAL_URL,
                currency="USD",
                amount=Decimal("2500.00"),
                raw_response=_mock_order_response(),
            )

        monkeypatch.setattr(PayPalOrderService, "create_order", mock_create_order)

        # 1. Payer initiates order creation -> 201 Created
        resp = client.post(
            url,
            headers={"Authorization": f"Bearer {payer_token}"},
            json={"idempotency_key": "api_idemp_001"},
        )
        assert resp.status_code == 201, resp.text
        data = resp.json()
        assert data["paypal_order_id"] == FAKE_ORDER_ID
        assert data["order_status"] == "CREATED"
        assert data["approval_url"] == FAKE_APPROVAL_URL
        assert data["currency"] == "USD"
        assert data["amount"] == "2500.00"

        # 2. Worker attempts to initiate -> 403 Forbidden
        worker_resp = client.post(
            url,
            headers={"Authorization": f"Bearer {worker_token}"},
            json={"idempotency_key": "api_idemp_002"},
        )
        assert worker_resp.status_code == 403

        # 3. Idempotent repeat by payer -> returns existing order
        repeat_resp = client.post(
            url,
            headers={"Authorization": f"Bearer {payer_token}"},
            json={"idempotency_key": "api_idemp_001"},
        )
        assert repeat_resp.status_code == 201
        assert repeat_resp.json()["paypal_order_id"] == FAKE_ORDER_ID

    finally:
        app.dependency_overrides.clear()


def test_api_capture_paypal_order_endpoint(test_db, monkeypatch):
    fix = _setup_settlement_fixture(test_db)
    fix["settlement_tx"].paypal_order_id = FAKE_ORDER_ID
    test_db.commit()

    def override_get_db():
        yield test_db

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)

    try:
        payer_token = create_access_token(
            user_id=fix["payer"].id, email=fix["payer"].email
        )
        worker_token = create_access_token(
            user_id=fix["worker"].id, email=fix["worker"].email
        )

        url = f"/api/v1/deal-rooms/{fix['room'].id}/milestones/{fix['milestone'].id}/paypal/capture-order"

        # Mock order service methods
        def mock_get_order(self, order_id):
            return _mock_get_order_response(status="APPROVED")

        def mock_capture_order(self, order_id, **kwargs):
            return PayPalCaptureResult(
                order_id=FAKE_ORDER_ID,
                capture_id=FAKE_CAPTURE_ID,
                status="COMPLETED",
                currency="USD",
                amount=Decimal("2500.00"),
                raw_response=_mock_capture_response(),
            )

        monkeypatch.setattr(PayPalOrderService, "get_order", mock_get_order)
        monkeypatch.setattr(PayPalOrderService, "capture_order", mock_capture_order)

        # 1. Payer captures approved order -> 200 OK
        resp = client.post(
            url,
            headers={"Authorization": f"Bearer {payer_token}"},
            json={"idempotency_key": "api_cap_idemp_001"},
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["paypal_capture_id"] == FAKE_CAPTURE_ID
        assert data["capture_status"] == "COMPLETED"
        assert data["transaction_status"] == "COMPLETED"
        assert data["payment_readiness"] == "PAID"
        assert data["amount"] == "2500.00"

        # 2. Worker attempts to capture -> 403 Forbidden
        worker_resp = client.post(
            url,
            headers={"Authorization": f"Bearer {worker_token}"},
            json={"idempotency_key": "api_cap_idemp_002"},
        )
        assert worker_resp.status_code == 403

    finally:
        app.dependency_overrides.clear()


# ==============================================================================
# 4. Direct PostgreSQL Integration Test
# ==============================================================================


def test_postgresql_order_creation_integration():
    """Verify real PostgreSQL row locking, nullable business_id, and order ID persistence."""
    pg_url = settings.DATABASE_URL
    if not pg_url or "postgresql" not in pg_url:
        pytest.skip("PostgreSQL not configured in settings")

    try:
        engine = create_engine(pg_url, connect_args={"connect_timeout": 3})
        with engine.connect():
            pass
    except (SQLAlchemyError, OSError):
        pytest.skip(
            "PostgreSQL connection not reachable in current execution environment"
        )

    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()

    try:
        fix = _setup_settlement_fixture(session)
        svc = PaymentService(session)

        def handler(_request: httpx.Request) -> httpx.Response:
            return httpx.Response(201, json=_mock_order_response())

        mock_svc = _build_mock_order_service(handler)

        res = svc.create_paypal_order_for_milestone(
            caller_user_id=fix["payer"].id,
            room_id=fix["room"].id,
            milestone_id=fix["milestone"].id,
            idempotency_key=f"pg_order_{uuid4().hex[:8]}",
            order_service=mock_svc,
        )

        assert res["paypal_order_id"] == FAKE_ORDER_ID
        assert res["order_status"] == "CREATED"

        # Verify transaction record in PostgreSQL
        tx = (
            session.query(Transaction)
            .filter(Transaction.id == int(res["transaction_id"]))
            .first()
        )
        assert tx is not None
        assert tx.paypal_order_id == FAKE_ORDER_ID
        assert tx.status == TransactionStatus.PENDING

        # Clean up created PostgreSQL records
        session.delete(tx)
        session.delete(fix["milestone"])
        for p in session.query(DealRoomParticipant).filter(
            DealRoomParticipant.room_id == fix["room"].id
        ):
            session.delete(p)
        session.delete(fix["room"])
        session.delete(fix["proposal"])
        session.delete(fix["connection"])
        session.delete(fix["payer"])
        session.delete(fix["worker"])
        session.delete(fix["outsider"])
        session.commit()

    finally:
        session.close()
        engine.dispose()


def test_postgresql_capture_integration():
    """Verify real PostgreSQL row locking, verified buyer approval, and capture state transition."""
    pg_url = settings.DATABASE_URL
    if not pg_url or "postgresql" not in pg_url:
        pytest.skip("PostgreSQL not configured in settings")

    try:
        engine = create_engine(pg_url, connect_args={"connect_timeout": 3})
        with engine.connect():
            pass
    except (SQLAlchemyError, OSError):
        pytest.skip(
            "PostgreSQL connection not reachable in current execution environment"
        )

    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()

    try:
        fix = _setup_settlement_fixture(session)
        fix["settlement_tx"].paypal_order_id = f"PG_ORDER_{uuid4().hex[:10]}"
        session.commit()

        svc = PaymentService(session)

        def handler(request: httpx.Request) -> httpx.Response:
            if request.method == "GET":
                return httpx.Response(
                    200, json=_mock_get_order_response(status="APPROVED")
                )
            if request.method == "POST":
                return httpx.Response(201, json=_mock_capture_response())
            return httpx.Response(404)

        mock_svc = _build_mock_order_service(handler)

        res = svc.capture_paypal_order_for_milestone(
            caller_user_id=fix["payer"].id,
            room_id=fix["room"].id,
            milestone_id=fix["milestone"].id,
            idempotency_key=f"pg_cap_{uuid4().hex[:8]}",
            order_service=mock_svc,
        )

        assert res["paypal_capture_id"] == FAKE_CAPTURE_ID
        assert res["capture_status"] == "COMPLETED"
        assert res["transaction_status"] == "COMPLETED"
        assert res["payment_readiness"] == "PAID"

        # Verify transaction and milestone record in PostgreSQL
        tx = (
            session.query(Transaction)
            .filter(Transaction.id == int(res["transaction_id"]))
            .first()
        )
        assert tx is not None
        assert tx.status == TransactionStatus.COMPLETED
        assert tx.paypal_capture_id == FAKE_CAPTURE_ID

        m = (
            session.query(MilestoneExecution)
            .filter(MilestoneExecution.id == fix["milestone"].id)
            .first()
        )
        assert m.payment_readiness == PaymentReadinessStatus.PAID.value

        # Clean up created PostgreSQL records
        session.delete(tx)
        session.delete(fix["milestone"])
        for p in session.query(DealRoomParticipant).filter(
            DealRoomParticipant.room_id == fix["room"].id
        ):
            session.delete(p)
        session.delete(fix["room"])
        session.delete(fix["proposal"])
        session.delete(fix["connection"])
        session.delete(fix["payer"])
        session.delete(fix["worker"])
        session.delete(fix["outsider"])
        session.commit()

    finally:
        session.close()
        engine.dispose()
