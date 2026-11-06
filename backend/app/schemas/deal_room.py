from datetime import datetime
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, Field

from app.models.deal_room import (
    DealRoomActivityType,
    DealRoomClarificationStatus,
    DealRoomDocumentType,
    DealRoomStatus,
)


class DealRoomCreatePayload(BaseModel):
    proposal_id: str = Field(..., description="ID of the mutually accepted proposal")


class DealRoomStatusUpdatePayload(BaseModel):
    status: DealRoomStatus = Field(..., description="Target lifecycle state")
    reason: str | None = Field(
        None,
        max_length=1000,
        description="Required justification when placing on hold or cancelling",
    )


class DealRoomNoteCreatePayload(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    content: str = Field(..., min_length=2)
    is_pinned: bool = Field(False)


class DealRoomClarificationCreatePayload(BaseModel):
    question: str = Field(..., min_length=5, max_length=2000)


class DealRoomClarificationAnswerPayload(BaseModel):
    answer: str = Field(..., min_length=2, max_length=3000)


class DealRoomDocumentCreatePayload(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    document_type: DealRoomDocumentType = Field(DealRoomDocumentType.REFERENCE_LINK)
    reference_url: str = Field(
        ...,
        min_length=3,
        max_length=500,
        description="External reference URL, specification link, or storage identifier",
    )
    description: str | None = Field(None, max_length=1000)


class DealRoomParticipantCard(BaseModel):
    id: str
    user_id: str
    name: str
    headline: str | None = None
    industry: str | None = None
    collaboration_role: str
    assigned_responsibilities: str | None = None
    joined_at: datetime


class DealRoomDocumentResponse(BaseModel):
    id: str
    room_id: str
    uploaded_by_id: str
    uploader_name: str
    title: str
    document_type: str
    reference_url: str
    description: str | None = None
    created_at: datetime


class DealRoomNoteResponse(BaseModel):
    id: str
    room_id: str
    author_id: str
    author_name: str
    title: str
    content: str
    is_pinned: bool
    created_at: datetime
    updated_at: datetime


class DealRoomClarificationResponse(BaseModel):
    id: str
    room_id: str
    asked_by_id: str
    asker_name: str
    question: str
    status: DealRoomClarificationStatus
    answered_by_id: str | None = None
    answerer_name: str | None = None
    answer: str | None = None
    answered_at: datetime | None = None
    created_at: datetime


class DealRoomActivityResponse(BaseModel):
    id: str
    room_id: str
    actor_id: str
    actor_name: str
    activity_type: DealRoomActivityType
    title: str
    details: str | None = None
    created_at: datetime


class DealRoomResponse(BaseModel):
    id: str
    proposal_id: str
    connection_id: str
    opportunity_id: str | None = None
    opportunity_title: str | None = None
    title: str
    description: str
    status: DealRoomStatus
    status_reason: str | None = None
    accepted_proposal_version: int

    # Agreed Terms Snapshot
    agreed_scope_of_work: str | None = None
    agreed_deliverables: list[str] = []
    agreed_budget_amount: Decimal | None = None
    agreed_currency: str = "USD"
    agreed_timeline_summary: str | None = None
    agreed_estimated_duration_days: int | None = None
    agreed_milestones: list[dict[str, Any]] = []
    agreed_responsibilities: dict[str, Any] = {}
    agreed_assumptions: list[str] = []
    agreed_conditions: list[str] = []
    agreed_notes: str | None = None

    participants: list[DealRoomParticipantCard] = []
    created_at: datetime
    updated_at: datetime


class DealRoomOverviewResponse(BaseModel):
    id: str
    title: str
    status: DealRoomStatus
    status_reason: str | None = None
    accepted_proposal_version: int
    opportunity_title: str | None = None
    participants: list[DealRoomParticipantCard]
    scope_preview: str | None = None
    deliverables_count: int
    milestones_count: int
    total_budget: Decimal | None = None
    currency: str
    estimated_duration_days: int | None = None
    recent_activities: list[DealRoomActivityResponse]
    open_clarifications_count: int
    pinned_notes_count: int
    documents_count: int


class DealRoomListResponse(BaseModel):
    items: list[DealRoomResponse]
    total: int


class DealRoomAIAnalysisRequest(BaseModel):
    analysis_type: Literal["SUMMARY", "RESPONSIBILITIES", "RISKS", "NEXT_ACTIONS"] = (
        "SUMMARY"
    )


class DealRoomAIAnalysisResponse(BaseModel):
    analysis_type: str
    summary: str
    key_findings: list[str] = []
    actionable_recommendations: list[str] = []
    provenance_breakdown: dict[str, list[str]] = Field(
        default_factory=dict,
        description="Categorizes claims by AGREED_TERM, USER_RECORDED_FACT, VERIFIED_RECORD, AI_SUGGESTION, AI_HYPOTHESIS, UNKNOWN_OR_MISSING",
    )
    mode: Literal["LIVE_AI", "DETERMINISTIC_FALLBACK"]
    provider: str
    model: str
