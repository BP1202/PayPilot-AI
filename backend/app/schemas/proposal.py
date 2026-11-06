from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field, field_validator

from app.models.proposal import ProposalStatus
from app.schemas.connection import ParticipantCard


class ProposalMilestoneItem(BaseModel):
    id: str = Field(default_factory=lambda: "ms_" + uuid4().hex[:8])
    title: str
    description: str | None = None
    amount: Decimal = Field(ge=0, decimal_places=2)
    target_date: str | None = None  # ISO date string


class ProposalCreatePayload(BaseModel):
    connection_id: str
    opportunity_id: str | None = None
    title: str = Field(..., max_length=255)
    description: str
    scope_of_work: str | None = None
    deliverables: list[str] = []
    budget_amount: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    currency: str = Field(default="USD")
    timeline_summary: str | None = None
    estimated_duration_days: int | None = Field(default=None, ge=1)
    milestones: list[ProposalMilestoneItem] = []
    responsibilities: dict[str, str] = {}
    assumptions: list[str] = []
    conditions: list[str] = []
    notes: str | None = None

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: str) -> str:
        if len(v) != 3 or not v.isalpha():
            raise ValueError("Currency must be a 3-letter ISO 4217 code")
        return v.upper()


class ProposalRevisionPayload(BaseModel):
    change_summary: str = Field(..., max_length=500)
    title: str | None = None
    description: str | None = None
    scope_of_work: str | None = None
    deliverables: list[str] | None = None
    budget_amount: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    currency: str | None = None
    timeline_summary: str | None = None
    estimated_duration_days: int | None = None
    milestones: list[ProposalMilestoneItem] | None = None
    responsibilities: dict[str, str] | None = None
    assumptions: list[str] | None = None
    conditions: list[str] | None = None
    notes: str | None = None

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if len(v) != 3 or not v.isalpha():
            raise ValueError("Currency must be a 3-letter ISO 4217 code")
        return v.upper()


class ProposalActionPayload(BaseModel):
    action: Literal["ACCEPT", "REJECT", "REQUEST_REVISION", "WITHDRAW"]
    note: str | None = None


class ProposalRevisionResponse(BaseModel):
    id: str
    version: int
    title: str
    description: str
    scope_of_work: str | None
    deliverables: list[str]
    budget_amount: Decimal | None
    currency: str
    milestones: list
    responsibilities: dict
    assumptions: list
    conditions: list
    notes: str | None
    change_summary: str | None
    created_by_id: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ProposalResponse(BaseModel):
    id: str
    connection_id: str
    opportunity_id: str | None
    opportunity_title: str | None
    proposer: ParticipantCard
    recipient: ParticipantCard
    status: ProposalStatus
    current_version: int
    title: str
    description: str
    scope_of_work: str | None
    deliverables: list[str]
    budget_amount: Decimal | None
    currency: str
    timeline_summary: str | None
    estimated_duration_days: int | None
    milestones: list
    responsibilities: dict
    assumptions: list
    conditions: list
    notes: str | None
    proposer_accepted_at: datetime | None
    recipient_accepted_at: datetime | None
    accepted_version: int | None
    rejection_reason: str | None
    revision_requested_note: str | None
    revisions: list[ProposalRevisionResponse]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProposalListResponse(BaseModel):
    items: list[ProposalResponse]
    total: int
