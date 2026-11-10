from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.transaction import TransactionStatus
from app.repositories.business_repository import BusinessRepository
from app.repositories.transaction_repository import TransactionRepository
from app.schemas.copilot import (
    CopilotChatResponse,
    CopilotMode,
    CopilotRecommendation,
    FinancialImpact,
    RecommendedAction,
)


class CopilotService:
    def __init__(self, db: Session, api_key: str | None = None):
        self.db = db
        self.api_key = api_key if api_key is not None else settings.AI_API_KEY
        self.biz_repo = BusinessRepository(db)
        self.tx_repo = TransactionRepository(db)

    @property
    def mode(self) -> CopilotMode:
        return CopilotMode.LIVE_AI if self.api_key else CopilotMode.DETERMINISTIC_DEMO

    def get_decision_recommendation(
        self, user_id: str | None = None
    ) -> CopilotRecommendation:
        if user_id:
            business = self.biz_repo.get_by_user_id(user_id)
            biz_id = business.id if business else None
            totals = self.tx_repo.get_dashboard_totals_for_user(user_id, biz_id)
            pending_items = self.tx_repo.list_for_user(
                user_id=user_id,
                business_id=biz_id,
                status=TransactionStatus.PENDING,
                limit=1,
            )
            biz_name = business.name if business else "Your Account"
        else:
            business = self.biz_repo.get_or_create_default_business()
            totals = self.tx_repo.get_dashboard_totals(business.id)
            pending_items = self.tx_repo.list(
                business_id=business.id,
                status=TransactionStatus.PENDING,
                limit=1,
            )
            biz_name = business.name

        current_rev = totals["total_revenue"]

        now_str = datetime.now(UTC).isoformat()

        if pending_items:
            pending_tx = pending_items[0]
            net_change = pending_tx.amount
            projected_rev = current_rev + net_change
            pct_inc = (
                ((net_change / current_rev) * Decimal(100)).quantize(Decimal("0.01"))
                if current_rev > Decimal("0.00")
                else Decimal("0.00")
            )

            impact = FinancialImpact(
                current_revenue=current_rev,
                projected_revenue=projected_rev,
                net_change=net_change,
                percentage_increase=pct_inc,
            )

            customer = pending_tx.customer_name or "Client"
            desc = pending_tx.description or "Customer Order"

            reasoning = (
                f"Ledger analysis for {biz_name} confirms ${current_rev:,.2f} in completed revenue, "
                f"with ${net_change:,.2f} locked in pending customer order '{desc}' from {customer}. "
                f"Executing customer payment confirmation immediately expands available working capital by "
                f"{pct_inc}% and accelerates manufacturing order fulfillment."
            )

            action = RecommendedAction(
                action_type="APPROVE_CUSTOMER_PAYMENT",
                transaction_ref=pending_tx.transaction_ref,
                amount=pending_tx.amount,
                currency=pending_tx.currency,
                customer_name=customer,
                rationale=f"Confirm and capture pending customer payment {pending_tx.transaction_ref} for ${pending_tx.amount:,.2f}.",
            )

            return CopilotRecommendation(
                title=f"Working Capital Acceleration: Capture Order from {customer}",
                mode=self.mode,
                reasoning=reasoning,
                financial_impact=impact,
                suggested_action=action,
                generated_at=now_str,
            )

        # No pending items
        impact = FinancialImpact(
            current_revenue=current_rev,
            projected_revenue=current_rev,
            net_change=Decimal("0.00"),
            percentage_increase=Decimal("0.00"),
        )

        return CopilotRecommendation(
            title="Commerce Ledger Reconciled: Zero Pending Receivables",
            mode=self.mode,
            reasoning=(
                f"All customer transactions for {biz_name} have been successfully verified and captured. "
                f"Total settled revenue stands at ${current_rev:,.2f} across {totals['completed_count']} orders. "
                "No immediate payment authorization is required."
            ),
            financial_impact=impact,
            suggested_action=None,
            generated_at=now_str,
        )

    def chat(self, prompt: str, user_id: str | None = None) -> CopilotChatResponse:
        if user_id:
            business = self.biz_repo.get_by_user_id(user_id)
            biz_id = business.id if business else None
            totals = self.tx_repo.get_dashboard_totals_for_user(user_id, biz_id)
            pending_items = self.tx_repo.list_for_user(
                user_id=user_id,
                business_id=biz_id,
                status=TransactionStatus.PENDING,
                limit=1,
            )
            biz_name = business.name if business else "Your Account"
            currency = business.currency if business else "USD"
        else:
            business = self.biz_repo.get_or_create_default_business()
            totals = self.tx_repo.get_dashboard_totals(business.id)
            pending_items = self.tx_repo.list(
                business.id, status=TransactionStatus.PENDING, limit=1
            )
            biz_name = business.name
            currency = business.currency

        current_rev = totals["total_revenue"]
        pending_total = totals["pending_total"]
        completed_count = totals["completed_count"]
        pending_count = totals["pending_count"]

        context_summary: dict[str, Any] = {
            "business_name": biz_name,
            "currency": currency,
            "total_revenue": str(current_rev),
            "completed_count": completed_count,
            "pending_count": pending_count,
            "pending_total": str(pending_total),
        }

        # Deterministic domain responses grounded in real database values
        p_lower = prompt.lower()
        if "revenue" in p_lower or "sales" in p_lower or "income" in p_lower:
            reply = (
                f"{biz_name} currently has ${current_rev:,.2f} in verified settled revenue "
                f"from {completed_count} completed transactions. We also have ${pending_total:,.2f} "
                f"in pending customer payments awaiting capture."
            )
        elif "pending" in p_lower or "order" in p_lower or "stratos" in p_lower:
            if pending_items:
                tx = pending_items[0]
                reply = (
                    f"There is currently {pending_count} pending customer order: "
                    f"'{tx.description}' for ${tx.amount:,.2f} from {tx.customer_name} "
                    f"(Ref: {tx.transaction_ref}). Approving this payment will capture funds and increase "
                    f"settled revenue to ${(current_rev + tx.amount):,.2f}."
                )
            else:
                reply = "There are currently no pending payments in the commerce ledger. All customer orders are settled."
        else:
            reply = (
                f"Opnly Copilot Overview for {biz_name}: Settled revenue is ${current_rev:,.2f} "
                f"({completed_count} completed orders). Pending receivables total ${pending_total:,.2f} "
                f"({pending_count} pending order). You can review our recommended action to capture pending orders."
            )

        return CopilotChatResponse(
            reply=reply,
            mode=self.mode,
            confidence=1.0,
            context_summary=context_summary,
        )
