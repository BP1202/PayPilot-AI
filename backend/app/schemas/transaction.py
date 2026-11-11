import enum
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class TransactionStatusEnum(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class TransactionTypeEnum(str, enum.Enum):
    CUSTOMER_PAYMENT = "CUSTOMER_PAYMENT"
    REFUND = "REFUND"


class TransactionBase(BaseModel):
    transaction_ref: str = Field(
        ..., min_length=3, max_length=64, description="Unique transaction reference"
    )
    business_id: int | None = Field(
        default=None, description="Associated business ID (nullable for individual settlements)"
    )
    amount: Decimal = Field(
        ...,
        gt=Decimal("0.00"),
        decimal_places=2,
        description="Monetary transaction amount",
    )
    currency: str = Field(
        default="USD",
        min_length=3,
        max_length=3,
        description="ISO-4217 3-letter currency code",
    )
    status: TransactionStatusEnum = Field(default=TransactionStatusEnum.PENDING)
    type: TransactionTypeEnum = Field(default=TransactionTypeEnum.CUSTOMER_PAYMENT)
    payment_method: str = Field(default="PAYPAL_SIMULATED", max_length=50)
    description: str | None = Field(default=None, max_length=255)
    customer_name: str | None = Field(default=None, max_length=100)
    customer_email: str | None = Field(default=None, max_length=255)
    provider_reference: str | None = Field(default=None, max_length=128)
    metadata_json: str | None = None

    # Settlement linkage fields (nullable for legacy transactions)
    milestone_id: str | None = Field(default=None, max_length=64)
    deal_room_id: str | None = Field(default=None, max_length=64)
    payer_user_id: str | None = Field(default=None, max_length=64)
    payee_user_id: str | None = Field(default=None, max_length=64)
    payer_name: str | None = Field(default=None, max_length=100)
    payee_name: str | None = Field(default=None, max_length=100)
    paypal_order_id: str | None = Field(default=None, max_length=128)
    paypal_capture_id: str | None = Field(default=None, max_length=128)
    idempotency_key: str | None = Field(default=None, max_length=128)

    @field_validator("amount")
    @classmethod
    def validate_amount_precision(cls, v: Decimal) -> Decimal:
        if v <= Decimal("0.00"):
            raise ValueError("Amount must be greater than zero.")
        # Ensure 2 decimal places rounding
        return v.quantize(Decimal("0.01"))


class TransactionCreate(TransactionBase):
    pass


class TransactionRead(TransactionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class DashboardTotals(BaseModel):
    business_id: int
    currency: str
    total_revenue: Decimal
    transaction_count: int
    completed_count: int
    pending_count: int
    pending_total: Decimal
