import enum
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.core.database import Base


class DealRoomStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    ON_HOLD = "ON_HOLD"
    COMPLETION_REVIEW = "COMPLETION_REVIEW"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class DealRoomDocumentType(str, enum.Enum):
    SPECIFICATION = "SPECIFICATION"
    DESIGN = "DESIGN"
    REFERENCE_LINK = "REFERENCE_LINK"
    CONTRACT_PREVIEW = "CONTRACT_PREVIEW"
    DELIVERABLE_DRAFT = "DELIVERABLE_DRAFT"
    OTHER = "OTHER"


class DealRoomActivityType(str, enum.Enum):
    ROOM_CREATED = "ROOM_CREATED"
    STATUS_CHANGED = "STATUS_CHANGED"
    NOTE_ADDED = "NOTE_ADDED"
    DOCUMENT_ATTACHED = "DOCUMENT_ATTACHED"
    DOCUMENT_DELETED = "DOCUMENT_DELETED"
    CLARIFICATION_OPENED = "CLARIFICATION_OPENED"
    CLARIFICATION_ANSWERED = "CLARIFICATION_ANSWERED"
    MILESTONE_INITIALIZED = "MILESTONE_INITIALIZED"
    MILESTONE_STARTED = "MILESTONE_STARTED"
    EVIDENCE_SUBMITTED = "EVIDENCE_SUBMITTED"
    EVIDENCE_RESUBMITTED = "EVIDENCE_RESUBMITTED"
    REVISION_REQUESTED = "REVISION_REQUESTED"
    MILESTONE_APPROVED = "MILESTONE_APPROVED"
    MILESTONE_CANCELLED = "MILESTONE_CANCELLED"


class DealRoomClarificationStatus(str, enum.Enum):
    OPEN = "OPEN"
    RESOLVED = "RESOLVED"


class DealRoom(Base):
    __tablename__ = "deal_rooms"

    id: Mapped[str] = mapped_column(
        String(64),
        primary_key=True,
        default=lambda: "room_" + uuid4().hex[:12],
    )
    proposal_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("proposals.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    connection_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("connections.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    opportunity_id: Mapped[str | None] = mapped_column(
        String(64),
        ForeignKey("opportunities.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default=DealRoomStatus.ACTIVE.value,
        index=True,
    )
    status_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    accepted_proposal_version: Mapped[int] = mapped_column(Integer, nullable=False)

    # Immutable Agreed Terms Snapshot from Accepted Proposal
    agreed_scope_of_work: Mapped[str | None] = mapped_column(Text, nullable=True)
    agreed_deliverables: Mapped[list[str]] = mapped_column(
        JSON, nullable=False, default=list
    )
    agreed_budget_amount: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 2), nullable=True
    )
    agreed_currency: Mapped[str] = mapped_column(
        String(3), nullable=False, default="USD"
    )
    agreed_timeline_summary: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    agreed_estimated_duration_days: Mapped[int | None] = mapped_column(
        Integer, nullable=True
    )
    agreed_milestones: Mapped[list[dict[str, Any]]] = mapped_column(
        JSON, nullable=False, default=list
    )
    agreed_responsibilities: Mapped[dict[str, Any]] = mapped_column(
        JSON, nullable=False, default=dict
    )
    agreed_assumptions: Mapped[list[str]] = mapped_column(
        JSON, nullable=False, default=list
    )
    agreed_conditions: Mapped[list[str]] = mapped_column(
        JSON, nullable=False, default=list
    )
    agreed_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

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
    proposal = relationship("Proposal")
    connection = relationship("Connection")
    opportunity = relationship("Opportunity")
    participants = relationship(
        "DealRoomParticipant",
        back_populates="deal_room",
        cascade="all, delete-orphan",
    )
    activities = relationship(
        "DealRoomActivity",
        back_populates="deal_room",
        cascade="all, delete-orphan",
        order_by="DealRoomActivity.created_at.desc()",
    )
    documents = relationship(
        "DealRoomDocument",
        back_populates="deal_room",
        cascade="all, delete-orphan",
        order_by="DealRoomDocument.created_at.desc()",
    )
    notes = relationship(
        "DealRoomNote",
        back_populates="deal_room",
        cascade="all, delete-orphan",
        order_by="DealRoomNote.created_at.desc()",
    )
    clarifications = relationship(
        "DealRoomClarification",
        back_populates="deal_room",
        cascade="all, delete-orphan",
        order_by="DealRoomClarification.created_at.desc()",
    )
    milestones = relationship(
        "MilestoneExecution",
        back_populates="deal_room",
        cascade="all, delete-orphan",
        order_by="MilestoneExecution.milestone_index.asc()",
    )


class DealRoomParticipant(Base):
    __tablename__ = "deal_room_participants"

    id: Mapped[str] = mapped_column(
        String(64),
        primary_key=True,
        default=lambda: "drp_" + uuid4().hex[:12],
    )
    room_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("deal_rooms.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    collaboration_role: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="Collaborator",
    )
    assigned_responsibilities: Mapped[str | None] = mapped_column(Text, nullable=True)
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    deal_room = relationship("DealRoom", back_populates="participants")
    user = relationship("User")


class DealRoomActivity(Base):
    __tablename__ = "deal_room_activities"

    id: Mapped[str] = mapped_column(
        String(64),
        primary_key=True,
        default=lambda: "dra_" + uuid4().hex[:12],
    )
    room_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("deal_rooms.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    actor_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    activity_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default=DealRoomActivityType.ROOM_CREATED.value,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
        index=True,
    )

    deal_room = relationship("DealRoom", back_populates="activities")
    actor = relationship("User")


class DealRoomDocument(Base):
    __tablename__ = "deal_room_documents"

    id: Mapped[str] = mapped_column(
        String(64),
        primary_key=True,
        default=lambda: "drd_" + uuid4().hex[:12],
    )
    room_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("deal_rooms.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    uploaded_by_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    document_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default=DealRoomDocumentType.REFERENCE_LINK.value,
    )
    reference_url: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    deal_room = relationship("DealRoom", back_populates="documents")
    uploaded_by = relationship("User")


class DealRoomNote(Base):
    __tablename__ = "deal_room_notes"

    id: Mapped[str] = mapped_column(
        String(64),
        primary_key=True,
        default=lambda: "drn_" + uuid4().hex[:12],
    )
    room_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("deal_rooms.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    author_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
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

    deal_room = relationship("DealRoom", back_populates="notes")
    author = relationship("User")


class DealRoomClarification(Base):
    __tablename__ = "deal_room_clarifications"

    id: Mapped[str] = mapped_column(
        String(64),
        primary_key=True,
        default=lambda: "drc_" + uuid4().hex[:12],
    )
    room_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("deal_rooms.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    asked_by_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    question: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default=DealRoomClarificationStatus.OPEN.value,
        index=True,
    )
    answered_by_id: Mapped[str | None] = mapped_column(
        String(64),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    answered_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    deal_room = relationship("DealRoom", back_populates="clarifications")
    asked_by = relationship("User", foreign_keys=[asked_by_id])
    answered_by = relationship("User", foreign_keys=[answered_by_id])
