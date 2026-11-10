import json
import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.business import Business
from app.models.deal_room import DealRoom, DealRoomParticipant, DealRoomStatus
from app.models.milestone_execution import (
    MilestoneExecution,
    MilestoneExecutionStatus,
    PaymentReadinessStatus,
)
from app.models.transaction import Transaction, TransactionStatus, TransactionType
from app.repositories.business_repository import BusinessRepository
from app.repositories.transaction_repository import TransactionRepository
from app.schemas.transaction import TransactionCreate
from app.services.payment_provider import MockPaymentProvider, PaymentProviderInterface
from app.services.paypal_order_service import (
    PayPalCaptureResult,
    PayPalOrderAPIError,
    PayPalOrderConfigError,
    PayPalOrderNetworkError,
    PayPalOrderService,
    PayPalOrderTimeoutError,
    PayPalOrderValidationError,
)
from app.services.settlement_role_validator import SettlementRoleValidator


class PaymentApprovalRequiredError(Exception):
    """Raised when an operation requiring explicit owner authorization lacks approval."""


class TransactionNotFoundError(Exception):
    """Raised when a requested transaction cannot be found."""


class PaymentService:
    def __init__(
        self,
        db: Session,
        provider: PaymentProviderInterface | None = None,
    ):
        self.db = db
        self.provider = provider or MockPaymentProvider()
        self.tx_repo = TransactionRepository(db)

    def create_customer_order(
        self,
        business_id: int,
        amount: Decimal,
        currency: str = "USD",
        description: str | None = None,
        customer_name: str | None = None,
        customer_email: str | None = None,
    ) -> Transaction:
        transaction_ref = f"TXN-{uuid.uuid4().hex[:10].upper()}"
        order_res = self.provider.create_order(
            amount=amount,
            currency=currency,
            reference=transaction_ref,
            description=description or "",
        )

        tx_create = TransactionCreate(
            transaction_ref=transaction_ref,
            business_id=business_id,
            amount=amount,
            currency=currency,
            status=TransactionStatus.PENDING,
            type=TransactionType.CUSTOMER_PAYMENT,
            payment_method=order_res.get("provider", "PAYPAL_SIMULATED"),
            description=description,
            customer_name=customer_name,
            customer_email=customer_email,
            provider_reference=order_res.get("order_id"),
            metadata_json=json.dumps(order_res, default=str),
        )
        return self.tx_repo.create(tx_create)

    def approve_and_capture(
        self,
        transaction_ref: str,
        owner_approved: bool,
        idempotency_key: str,
    ) -> Transaction:
        # Strict security requirement: explicit owner approval is non-negotiable
        if not owner_approved:
            raise PaymentApprovalRequiredError(
                "Owner approval is strictly required before executing payment capture."
            )

        tx = self.tx_repo.get_by_ref(transaction_ref)
        if not tx:
            raise TransactionNotFoundError(
                f"Transaction with reference '{transaction_ref}' not found."
            )

        # Idempotency check: if transaction is already completed, safely return it
        if tx.status == TransactionStatus.COMPLETED:
            return tx

        # Execute capture with payment provider
        order_id = tx.provider_reference or f"SIM-PAYPAL-ORD-{tx.transaction_ref}"
        capture_res = self.provider.capture_payment(
            order_id=order_id,
            amount=tx.amount,
            currency=tx.currency,
        )

        # Update transaction status and ledger in database
        tx.status = TransactionStatus.COMPLETED
        tx.provider_reference = capture_res.get("capture_id")
        tx.idempotency_key = idempotency_key

        existing_meta = json.loads(tx.metadata_json) if tx.metadata_json else {}
        existing_meta["capture"] = capture_res
        existing_meta["idempotency_key"] = idempotency_key
        tx.metadata_json = json.dumps(existing_meta, default=str)

        self.db.commit()
        self.db.refresh(tx)
        return tx

    def prepare_milestone_settlement(
        self,
        *,
        caller_user_id: str,
        room_id: str,
        milestone_id: str,
        idempotency_key: str,
        description: str | None = None,
    ) -> Transaction:
        """
        Prepare an authoritative, agreement-backed settlement transaction record for an approved milestone.

        Enforces:
        1. Caller authorization (active Deal Room participant).
        2. Deal Room existence and ACTIVE status.
        3. Milestone existence, APPROVED status, READY_FOR_PAYMENT_REVIEW readiness, and positive agreed amount.
        4. Mutually accepted agreement version and authoritative payer/payee terms.
        5. Distinct payer and payee verified against Deal Room membership and assigned roles.
        6. Idempotency protection: returns existing transaction if already prepared with identical parameters.
        7. Conflict protection: rejects if already settled, pending under another key, or has mismatched parameters.
        8. Atomic persistence with row-level locking on the milestone.
        """
        if not idempotency_key or not idempotency_key.strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Idempotency key is strictly required for milestone settlement creation.",
            )
        clean_idempotency_key = idempotency_key.strip()

        # Step 1: Validate commercial settlement roles via authoritative agreement snapshot
        validator = SettlementRoleValidator()
        roles = validator.validate_settlement_roles(
            self.db,
            caller_user_id=caller_user_id,
            room_id=room_id,
            milestone_id=milestone_id,
        )

        # Step 2: Row locking on milestone to prevent concurrent race conditions
        m_query = self.db.query(MilestoneExecution).filter(
            MilestoneExecution.id == milestone_id,
            MilestoneExecution.room_id == room_id,
        )
        if self.db.bind and self.db.bind.dialect.name == "postgresql":
            m_query = m_query.with_for_update()
        milestone = m_query.first()
        if not milestone:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Milestone '{milestone_id}' not found in Deal Room '{room_id}'.",
            )

        # Step 3: Check for existing transactions associated with this milestone
        # 3a. Exact idempotency match
        existing_tx = (
            self.db.query(Transaction)
            .filter(
                Transaction.milestone_id == milestone_id,
                Transaction.idempotency_key == clean_idempotency_key,
            )
            .first()
        )
        if existing_tx:
            # Verify commercial parameter consistency
            if (
                existing_tx.deal_room_id != room_id
                or existing_tx.payer_user_id != roles.payer_user_id
                or existing_tx.payee_user_id != roles.payee_user_id
                or existing_tx.amount != roles.agreed_amount
                or existing_tx.currency != roles.currency
            ):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        f"Settlement transaction for milestone '{milestone_id}' with idempotency key "
                        f"'{clean_idempotency_key}' already exists with conflicting commercial parameters."
                    ),
                )
            return existing_tx

        # 3b. Already COMPLETED settlement check
        completed_tx = (
            self.db.query(Transaction)
            .filter(
                Transaction.milestone_id == milestone_id,
                Transaction.status == TransactionStatus.COMPLETED,
            )
            .first()
        )
        if completed_tx:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Milestone '{milestone_id}' has already been settled via transaction "
                    f"'{completed_tx.transaction_ref}'."
                ),
            )

        # 3c. Already PENDING settlement with different idempotency key
        pending_tx = (
            self.db.query(Transaction)
            .filter(
                Transaction.milestone_id == milestone_id,
                Transaction.status == TransactionStatus.PENDING,
            )
            .first()
        )
        if pending_tx:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"A settlement transaction ('{pending_tx.transaction_ref}') is already pending for milestone "
                    f"'{milestone_id}'. Please use the original idempotency key to retry or reconcile."
                ),
            )

        # Step 4: Resolve genuine associated business entity (if any)
        # Precedence: 1. Payee's registered business, 2. Opportunity business
        # Individual-to-individual settlements legitimately have biz_id = None.
        # We strictly do NOT associate with arbitrary, unrelated, or fallback default businesses.
        biz_id: int | None = None
        payee_biz = (
            self.db.query(Business)
            .filter(Business.user_id == roles.payee_user_id)
            .first()
        )
        if payee_biz:
            biz_id = payee_biz.id
        else:
            room = self.db.query(DealRoom).filter(DealRoom.id == room_id).first()
            if room and room.opportunity and room.opportunity.business_id:
                biz_id = room.opportunity.business_id

        # Step 5: Construct transaction record
        tx_ref = f"TXN-SETTLE-{uuid.uuid4().hex[:10].upper()}"
        meta = {
            "source_proposal_id": roles.source_proposal_id,
            "accepted_proposal_version": roles.accepted_proposal_version,
            "resolution_source": roles.resolution_source,
            "milestone_index": milestone.milestone_index,
        }

        settlement_tx = Transaction(
            transaction_ref=tx_ref,
            business_id=biz_id,
            milestone_id=milestone.id,
            deal_room_id=room_id,
            payer_user_id=roles.payer_user_id,
            payee_user_id=roles.payee_user_id,
            idempotency_key=clean_idempotency_key,
            amount=roles.agreed_amount,
            currency=roles.currency,
            status=TransactionStatus.PENDING,
            type=TransactionType.CUSTOMER_PAYMENT,
            payment_method="PAYPAL_SIMULATED",
            description=description or f"Commercial settlement for milestone: {milestone.title}",
            metadata_json=json.dumps(meta, default=str),
        )

        try:
            self.db.add(settlement_tx)
            self.db.commit()
            self.db.refresh(settlement_tx)
            return settlement_tx
        except IntegrityError:
            self.db.rollback()
            # Handle concurrent race condition: re-query by (milestone_id, idempotency_key)
            concurrent_tx = (
                self.db.query(Transaction)
                .filter(
                    Transaction.milestone_id == milestone_id,
                    Transaction.idempotency_key == clean_idempotency_key,
                )
                .first()
            )
            if concurrent_tx:
                return concurrent_tx
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Concurrent settlement conflict detected. Please retry with verified idempotency key.",
            )

    def create_paypal_order_for_milestone(
        self,
        *,
        caller_user_id: str,
        room_id: str,
        milestone_id: str,
        idempotency_key: str,
        order_service: PayPalOrderService | None = None,
        return_url: str | None = None,
        cancel_url: str | None = None,
    ) -> dict[str, Any]:
        """
        Create a real PayPal Orders v2 order for an approved milestone settlement.

        Security & Validation checks:
        1. Deal Room must exist and be ACTIVE.
        2. Caller must be an active participant in the Deal Room.
        3. Milestone must exist, belong to room, be APPROVED, and be READY_FOR_PAYMENT_REVIEW.
        4. Roles derived exclusively from authoritative agreement snapshot via SettlementRoleValidator.
        5. Caller MUST be the contractually designated payer.
        6. Prepared settlement transaction must already exist with matching terms.
        7. Idempotent return if a PayPal order has already been created for this settlement.
        8. Stable PayPal-Request-Id derived for gateway-level idempotency.
        9. Persist returned PayPal order ID into the transaction while keeping status PENDING.
        """
        clean_idemp = (idempotency_key or "").strip()
        if not clean_idemp:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Idempotency key is required.",
            )

        # 1. Deal Room check
        room = self.db.query(DealRoom).filter(DealRoom.id == room_id).first()
        if not room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Deal Room '{room_id}' not found.",
            )
        if room.status != DealRoomStatus.ACTIVE.value:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Deal Room '{room_id}' is not active (status: {room.status}).",
            )

        # 2. Caller participant check
        participants = (
            self.db.query(DealRoomParticipant)
            .filter(DealRoomParticipant.room_id == room_id)
            .all()
        )
        participant_ids = {p.user_id for p in participants}
        if caller_user_id not in participant_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Caller is not an active participant in this Deal Room.",
            )

        # 3. Milestone lock and validation
        m_query = self.db.query(MilestoneExecution).filter(
            MilestoneExecution.id == milestone_id,
            MilestoneExecution.room_id == room_id,
        )
        if self.db.bind and self.db.bind.dialect.name == "postgresql":
            m_query = m_query.with_for_update()

        milestone = m_query.first()
        if not milestone:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Milestone '{milestone_id}' not found in Deal Room '{room_id}'.",
            )

        if milestone.status != MilestoneExecutionStatus.APPROVED.value:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Milestone '{milestone_id}' is not approved (status: {milestone.status}).",
            )

        if milestone.payment_readiness != PaymentReadinessStatus.READY_FOR_PAYMENT_REVIEW.value:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"Milestone '{milestone_id}' is not in READY_FOR_PAYMENT_REVIEW readiness "
                    f"(current readiness: {milestone.payment_readiness})."
                ),
            )

        if milestone.agreed_amount is None or milestone.agreed_amount <= Decimal("0.00"):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Milestone '{milestone_id}' has no financial settlement amount.",
            )

        # 4. Resolve authoritative agreement roles
        validator = SettlementRoleValidator()
        roles = validator.validate_settlement_roles(
            self.db,
            caller_user_id=caller_user_id,
            room_id=room_id,
            milestone_id=milestone_id,
        )

        # 5. Caller MUST be the contractually authorized payer
        if caller_user_id != roles.payer_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Unauthorized payment initiation: caller ('{caller_user_id}') is not the "
                    f"contractually designated payer ('{roles.payer_user_id}')."
                ),
            )

        # 6. Locate prepared settlement transaction
        tx_query = self.db.query(Transaction).filter(
            Transaction.milestone_id == milestone_id,
            Transaction.deal_room_id == room_id,
        )
        if self.db.bind and self.db.bind.dialect.name == "postgresql":
            tx_query = tx_query.with_for_update()

        tx = tx_query.first()
        if not tx:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=(
                    f"No prepared settlement transaction exists for milestone '{milestone_id}'. "
                    "Settlement must be prepared before creating a PayPal order."
                ),
            )

        # Commercial integrity checks against prepared settlement
        if (
            tx.payer_user_id != roles.payer_user_id
            or tx.payee_user_id != roles.payee_user_id
            or tx.amount != roles.agreed_amount
            or tx.currency != roles.currency
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Prepared settlement parameters do not match authoritative agreement terms.",
            )

        if tx.status == TransactionStatus.COMPLETED:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Milestone settlement is already completed via transaction '{tx.transaction_ref}'.",
            )
        if tx.status != TransactionStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Transaction is in invalid status '{tx.status}' for PayPal order creation.",
            )

        # 7. Idempotent return if PayPal order is already created
        if tx.paypal_order_id:
            meta: dict[str, Any] = {}
            if tx.metadata_json:
                try:
                    meta = json.loads(tx.metadata_json) if isinstance(tx.metadata_json, str) else dict(tx.metadata_json)
                except Exception:
                    meta = {}
            return {
                "transaction_id": str(tx.id),
                "transaction_ref": tx.transaction_ref,
                "paypal_order_id": tx.paypal_order_id,
                "order_status": meta.get("paypal_order_status", "CREATED"),
                "approval_url": meta.get("paypal_approval_url", ""),
                "currency": tx.currency,
                "amount": str(tx.amount),
            }

        # 8. Create PayPal Orders v2 record
        order_svc = order_service or PayPalOrderService()
        paypal_request_id = f"opnly_{tx.id}_{clean_idemp}"

        try:
            result = order_svc.create_order(
                amount=tx.amount,
                currency=tx.currency,
                reference_id=tx.transaction_ref,
                custom_id=f"tx_{tx.id}_m_{milestone.id}",
                description=f"Opnly Milestone Payment: {milestone.title}",
                idempotency_key=paypal_request_id,
                return_url=return_url,
                cancel_url=cancel_url,
            )
        except PayPalOrderConfigError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="PayPal payment service credentials are not configured.",
            ) from exc
        except PayPalOrderTimeoutError as exc:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="PayPal order creation timed out. Please retry with the same idempotency key.",
            ) from exc
        except PayPalOrderNetworkError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to connect to PayPal gateway.",
            ) from exc
        except PayPalOrderValidationError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"PayPal order validation failed: {exc}",
            ) from exc
        except PayPalOrderAPIError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"PayPal API error: {exc}",
            ) from exc

        # 9. Persist returned PayPal order ID into existing transaction
        # Strict rule: status MUST remain PENDING; milestone is NOT marked SETTLED
        tx.paypal_order_id = result.order_id
        tx.payment_method = "PAYPAL"
        tx.provider = "paypal"

        existing_meta: dict[str, Any] = {}
        if tx.metadata_json:
            try:
                existing_meta = json.loads(tx.metadata_json) if isinstance(tx.metadata_json, str) else dict(tx.metadata_json)
            except Exception:
                existing_meta = {}

        existing_meta.update({
            "paypal_order_id": result.order_id,
            "paypal_order_status": result.status,
            "paypal_approval_url": result.approval_url,
            "paypal_order_created_at": datetime.now(UTC).isoformat(),
            "paypal_request_id": paypal_request_id,
        })
        tx.metadata_json = json.dumps(existing_meta, default=str)

        self.db.commit()
        self.db.refresh(tx)

        return {
            "transaction_id": str(tx.id),
            "transaction_ref": tx.transaction_ref,
            "paypal_order_id": result.order_id,
            "order_status": result.status,
            "approval_url": result.approval_url,
            "currency": tx.currency,
            "amount": str(tx.amount),
        }

    def capture_paypal_order_for_milestone(
        self,
        *,
        caller_user_id: str,
        room_id: str,
        milestone_id: str,
        idempotency_key: str,
        order_service: PayPalOrderService | None = None,
    ) -> dict[str, Any]:
        """
        Verify buyer approval and execute server-side PayPal Orders v2 capture.

        Security & Integrity Guarantees:
        1. Deal Room must exist and be ACTIVE.
        2. Caller must be an active participant in the Deal Room.
        3. Milestone must exist, belong to room, and be APPROVED.
        4. Agreement roles validated exclusively from authoritative agreement snapshot.
        5. Caller MUST be the contractually designated payer (403 for worker/outsider).
        6. Prepared settlement transaction must exist and have a valid paypal_order_id.
        7. Idempotent return if already captured/completed.
        8. Server-side buyer approval verification: queries PayPal GET /orders/{order_id}
           and strictly enforces status == 'APPROVED' (or reconciles if already COMPLETED).
        9. Verifies amount, currency, and purchase unit references against authoritative record.
        10. Executes POST /orders/{order_id}/capture with stable PayPal-Request-Id.
        11. Reconciles timeout and network interruptions safely via get_order.
        12. Transitions transaction to COMPLETED and milestone payment readiness to PAID
            strictly after authoritative verification of capture completion.
        """
        clean_idemp = (idempotency_key or "").strip()
        if not clean_idemp or len(clean_idemp) < 4:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A valid idempotency key (min 4 characters) is required.",
            )

        # 1. Deal Room verification
        room = self.db.query(DealRoom).filter(DealRoom.id == room_id).first()
        if not room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Deal Room '{room_id}' not found.",
            )
        if room.status != DealRoomStatus.ACTIVE.value:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Deal Room '{room_id}' is not active (status: {room.status}).",
            )

        # 2. Caller participant verification
        participants = (
            self.db.query(DealRoomParticipant)
            .filter(DealRoomParticipant.room_id == room_id)
            .all()
        )
        participant_ids = {p.user_id for p in participants}
        if caller_user_id not in participant_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Caller is not an active participant in this Deal Room.",
            )

        # 3. Milestone verification with row locking
        m_query = self.db.query(MilestoneExecution).filter(
            MilestoneExecution.id == milestone_id,
            MilestoneExecution.room_id == room_id,
        )
        if self.db.bind and self.db.bind.dialect.name == "postgresql":
            m_query = m_query.with_for_update()

        milestone = m_query.first()
        if not milestone:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Milestone '{milestone_id}' not found in Deal Room '{room_id}'.",
            )

        if milestone.status != MilestoneExecutionStatus.APPROVED.value:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Milestone '{milestone_id}' is not approved (status: {milestone.status}).",
            )

        # 4. Authoritative agreement role derivation
        validator = SettlementRoleValidator()
        roles = validator.validate_settlement_roles(
            self.db,
            caller_user_id=caller_user_id,
            room_id=room_id,
            milestone_id=milestone_id,
            allow_paid=True,
        )

        # 5. Payer authorization check
        if caller_user_id != roles.payer_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Unauthorized payment capture: caller ('{caller_user_id}') is not the "
                    f"contractually designated payer ('{roles.payer_user_id}')."
                ),
            )

        # 6. Locate prepared settlement transaction with row locking
        tx_query = self.db.query(Transaction).filter(
            Transaction.milestone_id == milestone_id,
            Transaction.deal_room_id == room_id,
        )
        if self.db.bind and self.db.bind.dialect.name == "postgresql":
            tx_query = tx_query.with_for_update()

        tx = tx_query.first()
        if not tx:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=(
                    f"No prepared settlement transaction exists for milestone '{milestone_id}'. "
                    "Settlement and order creation must occur before capture."
                ),
            )

        if not tx.paypal_order_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"No PayPal order has been created for transaction '{tx.transaction_ref}'. "
                    "An order must be created and approved by the buyer before capture."
                ),
            )

        # Commercial parameters integrity check
        if (
            tx.payer_user_id != roles.payer_user_id
            or tx.payee_user_id != roles.payee_user_id
            or tx.amount != roles.agreed_amount
            or tx.currency != roles.currency
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Transaction commercial parameters do not match authoritative agreement snapshot.",
            )

        # 7. Idempotent return if already COMPLETED
        if tx.status == TransactionStatus.COMPLETED and tx.paypal_capture_id:
            return {
                "transaction_id": str(tx.id),
                "transaction_ref": tx.transaction_ref,
                "paypal_order_id": tx.paypal_order_id,
                "paypal_capture_id": tx.paypal_capture_id,
                "capture_status": "COMPLETED",
                "transaction_status": tx.status.value,
                "payment_readiness": milestone.payment_readiness,
                "currency": tx.currency,
                "amount": str(tx.amount),
            }

        # For uncompleted transactions, milestone must be in READY_FOR_PAYMENT_REVIEW
        if milestone.payment_readiness != PaymentReadinessStatus.READY_FOR_PAYMENT_REVIEW.value:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"Milestone '{milestone_id}' is not in READY_FOR_PAYMENT_REVIEW status "
                    f"(current readiness: '{milestone.payment_readiness}')."
                ),
            )

        # 8. Server-side Buyer Approval Verification directly from PayPal Orders v2
        order_svc = order_service or PayPalOrderService()
        try:
            order_data = order_svc.get_order(tx.paypal_order_id)
        except PayPalOrderConfigError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="PayPal payment service credentials are not configured.",
            ) from exc
        except PayPalOrderTimeoutError as exc:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="PayPal order verification timed out. Please retry.",
            ) from exc
        except PayPalOrderNetworkError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to connect to PayPal gateway for order verification.",
            ) from exc
        except PayPalOrderAPIError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"PayPal API error during order verification: {exc}",
            ) from exc

        order_status = order_data.get("status")

        # 8a. If PayPal reports order is already COMPLETED, extract existing capture and reconcile
        if order_status == "COMPLETED":
            capture_res = order_svc._extract_capture_from_order_data(order_data)
            return self._finalize_verified_capture(
                tx=tx,
                milestone=milestone,
                capture_result=capture_res,
                capture_request_id=f"reconciled_{clean_idemp}",
            )

        # 8b. Strict requirement: Buyer approval at PayPal is non-negotiable
        if order_status != "APPROVED":
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"PayPal order '{tx.paypal_order_id}' has not been approved by the buyer "
                    f"(current PayPal status: '{order_status}'). Buyer approval is strictly required before capture."
                ),
            )

        # 8c. Verify order intent and amount match authoritative settlement terms
        if order_data.get("intent") != "CAPTURE":
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid order intent '{order_data.get('intent')}'. Expected CAPTURE.",
            )

        purchase_units = order_data.get("purchase_units", [])
        if not purchase_units or not isinstance(purchase_units, list):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="PayPal order response missing purchase units.",
            )

        pu_amount = purchase_units[0].get("amount", {})
        pu_value = pu_amount.get("value")
        pu_currency = pu_amount.get("currency_code")

        try:
            pu_value_dec = Decimal(str(pu_value))
        except Exception:
            pu_value_dec = Decimal("0.00")

        if pu_value_dec != tx.amount or pu_currency != tx.currency:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"PayPal order amount/currency ({pu_currency} {pu_value}) does not match "
                    f"authoritative settlement terms ({tx.currency} {tx.amount})."
                ),
            )

        # 9. Execute Server-Side Capture (POST /orders/{order_id}/capture)
        capture_request_id = f"opnly_cap_{tx.id}_{clean_idemp}"

        try:
            capture_res = order_svc.capture_order(
                tx.paypal_order_id,
                idempotency_key=capture_request_id,
            )
        except PayPalOrderTimeoutError:
            # Reconcile on timeout: check if PayPal actually completed capture
            try:
                check_order = order_svc.get_order(tx.paypal_order_id)
                if check_order.get("status") == "COMPLETED":
                    capture_res = order_svc._extract_capture_from_order_data(check_order)
                else:
                    raise HTTPException(
                        status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                        detail="PayPal capture timed out and order is not yet marked COMPLETED. Please retry.",
                    )
            except Exception as rec_exc:
                raise HTTPException(
                    status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                    detail="PayPal capture timed out and reconciliation could not be completed. Please retry.",
                ) from rec_exc
        except PayPalOrderNetworkError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to connect to PayPal gateway during capture.",
            ) from exc
        except PayPalOrderAPIError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"PayPal rejected order capture: {exc}",
            ) from exc

        # 10. Verify capture outcome
        if capture_res.status != "COMPLETED":
            if capture_res.status == "PENDING":
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="PayPal payment capture is currently PENDING provider clearance. Funds have not cleared.",
                )
            tx.status = TransactionStatus.FAILED
            self.db.commit()
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"PayPal payment capture was not successful (status: {capture_res.status}).",
            )

        if capture_res.amount != tx.amount or capture_res.currency != tx.currency:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Captured monetary amount or currency does not match authoritative settlement.",
            )

        # 11. Final State Transition: mark COMPLETED and PAID
        return self._finalize_verified_capture(
            tx=tx,
            milestone=milestone,
            capture_result=capture_res,
            capture_request_id=capture_request_id,
        )

    def _finalize_verified_capture(
        self,
        *,
        tx: Transaction,
        milestone: MilestoneExecution,
        capture_result: PayPalCaptureResult,
        capture_request_id: str,
    ) -> dict[str, Any]:
        """
        Transition transaction to COMPLETED and milestone to PAID following verified capture.
        """
        tx.paypal_capture_id = capture_result.capture_id
        tx.status = TransactionStatus.COMPLETED
        tx.payment_method = "PAYPAL"
        tx.provider = "paypal"

        milestone.payment_readiness = PaymentReadinessStatus.PAID.value

        meta: dict[str, Any] = {}
        if tx.metadata_json:
            try:
                meta = json.loads(tx.metadata_json) if isinstance(tx.metadata_json, str) else dict(tx.metadata_json)
            except Exception:
                meta = {}

        meta.update({
            "paypal_capture_id": capture_result.capture_id,
            "paypal_capture_status": capture_result.status,
            "paypal_captured_at": datetime.now(UTC).isoformat(),
            "capture_request_id": capture_request_id,
        })
        tx.metadata_json = json.dumps(meta, default=str)

        self.db.commit()
        self.db.refresh(tx)
        self.db.refresh(milestone)

        return {
            "transaction_id": str(tx.id),
            "transaction_ref": tx.transaction_ref,
            "paypal_order_id": tx.paypal_order_id,
            "paypal_capture_id": capture_result.capture_id,
            "capture_status": capture_result.status,
            "transaction_status": tx.status.value,
            "payment_readiness": milestone.payment_readiness,
            "currency": tx.currency,
            "amount": str(tx.amount),
        }

    def get_milestone_settlement_status(
        self,
        *,
        caller_user_id: str,
        room_id: str,
        milestone_id: str,
    ) -> dict[str, Any]:
        """Query authoritative settlement and PayPal order status for a milestone."""
        room = self.db.query(DealRoom).filter(DealRoom.id == room_id).first()
        if not room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Deal Room '{room_id}' not found.",
            )

        participants = (
            self.db.query(DealRoomParticipant)
            .filter(DealRoomParticipant.room_id == room_id)
            .all()
        )
        if caller_user_id not in {p.user_id for p in participants}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Caller is not an active participant in this Deal Room.",
            )

        milestone = (
            self.db.query(MilestoneExecution)
            .filter(
                MilestoneExecution.id == milestone_id,
                MilestoneExecution.room_id == room_id,
            )
            .first()
        )
        if not milestone:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Milestone '{milestone_id}' not found in Deal Room '{room_id}'.",
            )

        payer_id: str | None = None
        payee_id: str | None = None
        try:
            validator = SettlementRoleValidator()
            roles = validator.validate_settlement_roles(
                self.db,
                caller_user_id=caller_user_id,
                room_id=room_id,
                milestone_id=milestone_id,
                allow_paid=True,
            )
            payer_id = roles.payer_user_id
            payee_id = roles.payee_user_id
        except Exception:
            if milestone.reviewer_user_id:
                payer_id = milestone.reviewer_user_id
                payee_id = milestone.responsible_user_id

        tx = (
            self.db.query(Transaction)
            .filter(
                Transaction.milestone_id == milestone_id,
                Transaction.deal_room_id == room_id,
            )
            .first()
        )

        status_str = "NOT_PREPARED"
        tx_id = None
        tx_ref = None
        paypal_order_id = None
        paypal_capture_id = None
        approval_url = None

        if tx:
            tx_id = str(tx.id)
            tx_ref = tx.transaction_ref
            paypal_order_id = tx.paypal_order_id
            paypal_capture_id = tx.paypal_capture_id
            if tx.payer_user_id:
                payer_id = tx.payer_user_id
            if tx.payee_user_id:
                payee_id = tx.payee_user_id

            if tx.status == TransactionStatus.COMPLETED:
                status_str = "COMPLETED"
            elif tx.status == TransactionStatus.FAILED:
                status_str = "FAILED"
            elif tx.status == TransactionStatus.CANCELLED:
                status_str = "CANCELLED"
            elif tx.paypal_order_id:
                status_str = "AWAITING_APPROVAL"
            else:
                status_str = "PREPARED"

            if tx.metadata_json:
                try:
                    meta = json.loads(tx.metadata_json) if isinstance(tx.metadata_json, str) else dict(tx.metadata_json)
                    approval_url = meta.get("paypal_approval_url")
                except Exception:
                    approval_url = None

        return {
            "milestone_id": milestone.id,
            "room_id": room_id,
            "status": status_str,
            "payment_readiness": milestone.payment_readiness,
            "agreed_amount": str(milestone.agreed_amount) if milestone.agreed_amount is not None else None,
            "currency": milestone.currency or "USD",
            "payer_user_id": payer_id,
            "payee_user_id": payee_id,
            "transaction_id": tx_id,
            "transaction_ref": tx_ref,
            "paypal_order_id": paypal_order_id,
            "paypal_capture_id": paypal_capture_id,
            "approval_url": approval_url,
        }




