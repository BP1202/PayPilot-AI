import enum
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.core.database import Base


class MilestoneExecutionStatus(str, enum.Enum):
    NOT_STARTED = "NOT_STARTED"
    IN_PROGRESS = "IN_PROGRESS"
    SUBMITTED_FOR_REVIEW = "SUBMITTED_FOR_REVIEW"
    REVISION_REQUESTED = "REVISION_REQUESTED"
    APPROVED = "APPROVED"
    CANCELLED = "CANCELLED"


class PaymentReadinessStatus(str, enum.Enum):
    NOT_READY = "NOT_READY"
    READY_FOR_PAYMENT_REVIEW = "READY_FOR_PAYMENT_REVIEW"
    PAYMENT_IN_PROGRESS = "PAYMENT_IN_PROGRESS"
    PAID = "PAID"


class MilestoneEvidenceType(str, enum.Enum):
    DOCUMENT = "DOCUMENT"
    IMAGE = "IMAGE"
    VIDEO_LINK = "VIDEO_LINK"
    EXTERNAL_REFERENCE = "EXTERNAL_REFERENCE"
    CODE_REPOSITORY = "CODE_REPOSITORY"
    OTHER = "OTHER"


class EvidenceReviewStatus(str, enum.Enum):
    PENDING_REVIEW = "PENDING_REVIEW"
    REVISION_REQUESTED = "REVISION_REQUESTED"
    APPROVED = "APPROVED"
    SUPERSEDED = "SUPERSEDED"


class MilestoneReviewDecision(str, enum.Enum):
    APPROVED = "APPROVED"
    REVISION_REQUESTED = "REVISION_REQUESTED"


class MilestoneExecution(Base):
    __tablename__ = "deal_room_milestones"

    id: Mapped[str] = mapped_column(
        String(64),
        primary_key=True,
        default=lambda: "mil_" + uuid4().hex[:12],
    )
    room_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("deal_rooms.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    source_proposal_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("proposals.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    accepted_proposal_version: Mapped[int] = mapped_column(Integer, nullable=False)
    milestone_index: Mapped[int] = mapped_column(Integer, nullable=False)

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    expected_deliverables: Mapped[list[str]] = mapped_column(
        JSON, nullable=False, default=list
    )
    agreed_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")
    due_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    planned_due_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    responsible_user_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    reviewer_user_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default=MilestoneExecutionStatus.NOT_STARTED.value,
        index=True,
    )
    cancellation_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    payment_readiness: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default=PaymentReadinessStatus.NOT_READY.value,
        index=True,
    )

    current_evidence_submission_id: Mapped[str | None] = mapped_column(
        String(64), nullable=True
    )

    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    submitted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    approved_at: Mapped[datetime | None] = mapped_column(
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
    deal_room = relationship("DealRoom", back_populates="milestones")
    responsible_user = relationship("User", foreign_keys=[responsible_user_id])
    reviewer_user = relationship("User", foreign_keys=[reviewer_user_id])
    evidence_submissions = relationship(
        "MilestoneEvidence",
        back_populates="milestone",
        cascade="all, delete-orphan",
        order_by="MilestoneEvidence.submission_version.asc()",
    )
    reviews = relationship(
        "MilestoneReview",
        back_populates="milestone",
        cascade="all, delete-orphan",
        order_by="MilestoneReview.created_at.desc()",
    )


class MilestoneEvidence(Base):
    __tablename__ = "milestone_evidence"

    id: Mapped[str] = mapped_column(
        String(64),
        primary_key=True,
        default=lambda: "evi_" + uuid4().hex[:12],
    )
    milestone_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("deal_room_milestones.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    room_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("deal_rooms.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    submitted_by_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    submission_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    evidence_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default=MilestoneEvidenceType.EXTERNAL_REFERENCE.value,
    )
    reference_url: Mapped[str] = mapped_column(String(500), nullable=False)
    attachments: Mapped[list[dict[str, Any]]] = mapped_column(
        JSON, nullable=False, default=list
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default=EvidenceReviewStatus.PENDING_REVIEW.value,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    # Relationships
    milestone = relationship(
        "MilestoneExecution", back_populates="evidence_submissions"
    )
    deal_room = relationship("DealRoom")
    submitted_by = relationship("User")
    reviews = relationship(
        "MilestoneReview",
        back_populates="evidence",
        cascade="all, delete-orphan",
    )


class MilestoneReview(Base):
    __tablename__ = "milestone_reviews"

    id: Mapped[str] = mapped_column(
        String(64),
        primary_key=True,
        default=lambda: "mrv_" + uuid4().hex[:12],
    )
    milestone_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("deal_room_milestones.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    evidence_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("milestone_evidence.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    evidence_version: Mapped[int] = mapped_column(Integer, nullable=False)
    reviewer_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    decision: Mapped[str] = mapped_column(String(30), nullable=False)
    comments: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    # Relationships
    milestone = relationship("MilestoneExecution", back_populates="reviews")
    evidence = relationship("MilestoneEvidence", back_populates="reviews")
    reviewer = relationship("User")
