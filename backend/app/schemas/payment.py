from decimal import Decimal

from pydantic import BaseModel, Field

from app.schemas.business import BusinessRead
from app.schemas.transaction import DashboardTotals, TransactionRead


class CreateOrderRequest(BaseModel):
    business_id: int | None = Field(
        default=None,
        description="Optional business ID; defaults to default demo business",
    )
    amount: Decimal = Field(
        ...,
        gt=Decimal("0.00"),
        decimal_places=2,
        description="Monetary transaction amount",
    )
    currency: str = Field(
        default="USD", min_length=3, max_length=3, description="ISO-4217 currency"
    )
    description: str | None = Field(default=None, max_length=255)
    customer_name: str | None = Field(default=None, max_length=100)
    customer_email: str | None = Field(default=None, max_length=255)


class ApprovePaymentRequest(BaseModel):
    transaction_ref: str = Field(
        ..., min_length=3, max_length=64, description="Transaction reference to approve"
    )
    owner_approved: bool = Field(
        ..., description="Explicit owner authorization confirmation"
    )
    idempotency_key: str = Field(
        ...,
        min_length=1,
        max_length=128,
        description="Unique key preventing duplicate submissions",
    )


class LedgerListResponse(BaseModel):
    items: list[TransactionRead]
    total: int


class DashboardOverviewResponse(BaseModel):
    business: BusinessRead | None = None
    totals: DashboardTotals
