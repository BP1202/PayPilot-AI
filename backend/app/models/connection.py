import enum
from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ConnectionStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    DECLINED = "DECLINED"
    WITHDRAWN = "WITHDRAWN"


class ConnectionIntent(str, enum.Enum):
    EXPLORE_COLLABORATION = "EXPLORE_COLLABORATION"
    OFFER_CAPABILITY = "OFFER_CAPABILITY"
    SEEK_ASSISTANCE = "SEEK_ASSISTANCE"
    CO_FOUNDER = "CO_FOUNDER"
    PARTNERSHIP = "PARTNERSHIP"


class Connection(Base):
    __tablename__ = "connections"

    id: Mapped[str] = mapped_column(
        String(64),
        primary_key=True,
        default=lambda: "conn_" + uuid4().hex[:12],
    )
    requester_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    recipient_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    opportunity_id: Mapped[str | None] = mapped_column(
        String(64),
        ForeignKey("opportunities.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    business_id: Mapped[int | None] = mapped_column(
        ForeignKey("businesses.id", ondelete="SET NULL"),
        nullable=True,
    )
    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default=ConnectionStatus.PENDING.value,
        index=True,
    )
    intent: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default=ConnectionIntent.EXPLORE_COLLABORATION.value,
    )
    message: Mapped[str] = mapped_column(String(1000), nullable=False)
    response_note: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    accepted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    declined_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    withdrawn_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    # Relationships
    requester = relationship(
        "User",
        foreign_keys=[requester_id],
        backref="sent_connections",
    )
    recipient = relationship(
        "User",
        foreign_keys=[recipient_id],
        backref="received_connections",
    )
    opportunity = relationship("Opportunity", foreign_keys=[opportunity_id])
    proposals = relationship(
        "Proposal",
        back_populates="connection",
        cascade="all, delete-orphan",
    )
