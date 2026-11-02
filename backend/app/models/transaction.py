import enum
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class TransactionStatus(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class TransactionType(str, enum.Enum):
    CUSTOMER_PAYMENT = "CUSTOMER_PAYMENT"
    REFUND = "REFUND"


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    transaction_ref: Mapped[str] = mapped_column(
        String(64), unique=True, index=True, nullable=False
    )
    business_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("businesses.id"), nullable=False, index=True
    )

    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")

    status: Mapped[TransactionStatus] = mapped_column(
        Enum(TransactionStatus),
        nullable=False,
        default=TransactionStatus.PENDING,
        index=True,
    )
    type: Mapped[TransactionType] = mapped_column(
        Enum(TransactionType),
        nullable=False,
        default=TransactionType.CUSTOMER_PAYMENT,
    )

    payment_method: Mapped[str] = mapped_column(
        String(50), nullable=False, default="PAYPAL_SIMULATED"
    )
    description: Mapped[str] = mapped_column(String(255), nullable=True)

    customer_name: Mapped[str] = mapped_column(String(100), nullable=True)
    customer_email: Mapped[str] = mapped_column(String(255), nullable=True)
    provider_reference: Mapped[str] = mapped_column(String(128), nullable=True)

    metadata_json: Mapped[str] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
        index=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    business = relationship("Business", back_populates="transactions")
