from datetime import UTC, datetime
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.core.database import Base


class ProposalRevision(Base):
    __tablename__ = "proposal_revisions"

    id: Mapped[str] = mapped_column(
        String(64),
        primary_key=True,
        default=lambda: "prev_" + uuid4().hex[:12],
    )
    proposal_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("proposals.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    created_by_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Same term fields as Proposal (snapshot at time of revision)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    scope_of_work: Mapped[str | None] = mapped_column(Text, nullable=True)
    deliverables: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    budget_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")
    milestones: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    responsibilities: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    assumptions: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    conditions: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    change_summary: Mapped[str | None] = mapped_column(String(500), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    # Relationships
    proposal = relationship("Proposal", back_populates="revisions")
    created_by = relationship("User", foreign_keys=[created_by_id])
