import enum
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.core.database import Base


class OpportunityType(str, enum.Enum):
    IDEA = "IDEA"
    PROBLEM = "PROBLEM"


class OpportunityIntent(str, enum.Enum):
    SEEKING_SOLUTION = "SEEKING_SOLUTION"
    OFFERING_SOLUTION = "OFFERING_SOLUTION"


class OpportunityCategory(str, enum.Enum):
    FINTECH = "FINTECH"
    TECH = "TECH"
    BUSINESS = "BUSINESS"
    LOCAL = "LOCAL"


class OpportunityStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    ANALYSED = "ANALYSED"
    PUBLISHED = "PUBLISHED"
    MATCHING = "MATCHING"
    NEGOTIATING = "NEGOTIATING"
    TRANSACTING = "TRANSACTING"
    GROWING = "GROWING"
    COMPLETED = "COMPLETED"
    ARCHIVED = "ARCHIVED"
    CLOSED = "CLOSED"


class OpportunityVisibility(str, enum.Enum):
    PRIVATE = "PRIVATE"
    AUTHENTICATED = "AUTHENTICATED"
    PUBLIC = "PUBLIC"
    SHARED = "SHARED"


class ProvenanceCategory(str, enum.Enum):
    USER_PROVIDED = "USER_PROVIDED"
    AI_SUGGESTION = "AI_SUGGESTION"
    AI_HYPOTHESIS = "AI_HYPOTHESIS"
    VERIFIED_EXTERNAL = "VERIFIED_EXTERNAL"
    DETERMINISTIC_CALCULATION = "DETERMINISTIC_CALCULATION"
    MISSING_UNKNOWN = "MISSING_UNKNOWN"


class Opportunity(Base):
    __tablename__ = "opportunities"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    business_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("businesses.id"), nullable=True, index=True
    )

    submission_type: Mapped[str] = mapped_column(
        String(20), nullable=False, default=OpportunityType.IDEA.value
    )
    intent: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default=OpportunityIntent.SEEKING_SOLUTION.value,
        index=True,
    )
    category: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default=OpportunityCategory.BUSINESS.value,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default=OpportunityStatus.DRAFT.value, index=True
    )
    visibility: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default=OpportunityVisibility.PRIVATE.value,
        index=True,
    )
    published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )
    closed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    original_description: Mapped[str] = mapped_column(Text, nullable=False)

    # Core structured analysis fields
    problem_statement: Mapped[str | None] = mapped_column(Text, nullable=True)
    proposed_solution: Mapped[str | None] = mapped_column(Text, nullable=True)
    industry: Mapped[str | None] = mapped_column(String(100), nullable=True)
    value_proposition: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Structured collections stored as portable JSON
    target_customer_segments: Mapped[list[str]] = mapped_column(
        JSON, nullable=False, default=list
    )
    customer_pain_points: Mapped[list[str]] = mapped_column(
        JSON, nullable=False, default=list
    )
    required_skills_and_resources: Mapped[list[str]] = mapped_column(
        JSON, nullable=False, default=list
    )
    potential_business_models: Mapped[list[str]] = mapped_column(
        JSON, nullable=False, default=list
    )
    key_assumptions: Mapped[list[str]] = mapped_column(
        JSON, nullable=False, default=list
    )
    risks_and_uncertainties: Mapped[list[str]] = mapped_column(
        JSON, nullable=False, default=list
    )
    missing_information: Mapped[list[str]] = mapped_column(
        JSON, nullable=False, default=list
    )
    suggested_follow_up_questions: Mapped[list[str]] = mapped_column(
        JSON, nullable=False, default=list
    )

    # Field-level provenance mapping: {field_name: ProvenanceCategory}
    provenance: Mapped[dict[str, Any]] = mapped_column(
        JSON, nullable=False, default=dict
    )

    # AI engine metadata: {provider, model, confidence, analyzed_at, mode}
    ai_metadata: Mapped[dict[str, Any]] = mapped_column(
        JSON, nullable=False, default=dict
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

    # Relationship to optional Business
    business = relationship("Business", backref="opportunities")
