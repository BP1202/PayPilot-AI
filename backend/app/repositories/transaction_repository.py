from decimal import Decimal
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.transaction import Transaction, TransactionStatus
from app.schemas.transaction import TransactionCreate


class TransactionRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, transaction_id: int) -> Transaction | None:
        return self.db.execute(
            select(Transaction).where(Transaction.id == transaction_id)
        ).scalar_one_or_none()

    def get_by_ref(self, transaction_ref: str) -> Transaction | None:
        return self.db.execute(
            select(Transaction).where(Transaction.transaction_ref == transaction_ref)
        ).scalar_one_or_none()

    def create(self, tx_in: TransactionCreate) -> Transaction:
        tx = Transaction(
            transaction_ref=tx_in.transaction_ref,
            business_id=tx_in.business_id,
            amount=tx_in.amount,
            currency=tx_in.currency,
            status=TransactionStatus(tx_in.status.value),
            type=tx_in.type.value,
            payment_method=tx_in.payment_method,
            description=tx_in.description,
            customer_name=tx_in.customer_name,
            customer_email=tx_in.customer_email,
            provider_reference=tx_in.provider_reference,
            metadata_json=tx_in.metadata_json,
        )
        self.db.add(tx)
        self.db.commit()
        self.db.refresh(tx)
        return tx

    def list(
        self,
        business_id: int,
        status: TransactionStatus | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Transaction]:
        query = select(Transaction).where(Transaction.business_id == business_id)
        if status is not None:
            query = query.where(Transaction.status == status)

        query = (
            query.order_by(Transaction.created_at.desc()).limit(limit).offset(offset)
        )
        return list(self.db.execute(query).scalars().all())

    def count(self, business_id: int, status: TransactionStatus | None = None) -> int:
        query = select(func.count(Transaction.id)).where(
            Transaction.business_id == business_id
        )
        if status is not None:
            query = query.where(Transaction.status == status)
        return self.db.execute(query).scalar() or 0

    def get_dashboard_totals(self, business_id: int) -> dict[str, Any]:
        """Calculate dashboard totals deterministically using database aggregation."""
        # Completed revenue
        rev_stmt = select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            Transaction.business_id == business_id,
            Transaction.status == TransactionStatus.COMPLETED,
        )
        total_revenue_raw = self.db.execute(rev_stmt).scalar()
        total_revenue = Decimal(str(total_revenue_raw)).quantize(Decimal("0.01"))

        # Completed count
        comp_stmt = select(func.count(Transaction.id)).where(
            Transaction.business_id == business_id,
            Transaction.status == TransactionStatus.COMPLETED,
        )
        completed_count = self.db.execute(comp_stmt).scalar() or 0

        # Pending total
        pending_total_stmt = select(
            func.coalesce(func.sum(Transaction.amount), 0)
        ).where(
            Transaction.business_id == business_id,
            Transaction.status == TransactionStatus.PENDING,
        )
        pending_total_raw = self.db.execute(pending_total_stmt).scalar()
        pending_total = Decimal(str(pending_total_raw)).quantize(Decimal("0.01"))

        # Pending count
        pending_count_stmt = select(func.count(Transaction.id)).where(
            Transaction.business_id == business_id,
            Transaction.status == TransactionStatus.PENDING,
        )
        pending_count = self.db.execute(pending_count_stmt).scalar() or 0

        # Total transaction count
        total_stmt = select(func.count(Transaction.id)).where(
            Transaction.business_id == business_id
        )
        transaction_count = self.db.execute(total_stmt).scalar() or 0

        return {
            "business_id": business_id,
            "currency": "USD",
            "total_revenue": total_revenue,
            "completed_count": completed_count,
            "pending_count": pending_count,
            "pending_total": pending_total,
            "transaction_count": transaction_count,
        }
