import json
import uuid
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.transaction import Transaction, TransactionStatus, TransactionType
from app.repositories.transaction_repository import TransactionRepository
from app.schemas.transaction import TransactionCreate
from app.services.payment_provider import MockPaymentProvider, PaymentProviderInterface


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

        existing_meta = json.loads(tx.metadata_json) if tx.metadata_json else {}
        existing_meta["capture"] = capture_res
        existing_meta["idempotency_key"] = idempotency_key
        tx.metadata_json = json.dumps(existing_meta, default=str)

        self.db.commit()
        self.db.refresh(tx)
        return tx
