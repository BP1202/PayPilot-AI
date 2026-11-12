from datetime import datetime
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.milestone_execution import (
    EvidenceReviewStatus,
    MilestoneEvidenceType,
    MilestoneExecutionStatus,
    MilestoneReviewDecision,
    PaymentReadinessStatus,
)


class MilestoneEvidenceCreatePayload(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    description: str = Field(
        ..., min_length=5, description="Deliverables and work description"
    )
    evidence_type: MilestoneEvidenceType = Field(
        MilestoneEvidenceType.EXTERNAL_REFERENCE
    )
    reference_url: str = Field(
        ...,
        min_length=3,
        max_length=500,
        description="External reference URL, repository branch, preview link, or storage identifier",
    )
    attachments: list[dict[str, Any]] = Field(default_factory=list)
    submission_notes: str | None = Field(
        None,
        max_length=2000,
        description="Optional notes or context for the reviewer regarding this deliverable submission",
    )


class MilestoneReviewPayload(BaseModel):
    evidence_id: str = Field(
        ..., description="ID of the evidence submission being reviewed"
    )
    decision: MilestoneReviewDecision = Field(
        ..., description="APPROVED, REVISION_REQUESTED, or REJECTED"
    )
    comments: str | None = Field(
        None,
        max_length=2000,
        description="Reviewer feedback notes or reason (mandatory if REVISION_REQUESTED or REJECTED)",
    )


class MilestoneCancelPayload(BaseModel):
    reason: str = Field(
        ...,
        min_length=3,
        max_length=1000,
        description="Justification for cancelling milestone",
    )


class MilestoneParticipantSummary(BaseModel):
    user_id: str
    name: str
    email: str | None = None
    role: str | None = None


class MilestoneEvidenceResponse(BaseModel):
    id: str
    milestone_id: str
    room_id: str
    submitted_by_id: str
    submitter_name: str
    submission_version: int
    title: str
    description: str
    evidence_type: str
    reference_url: str
    attachments: list[dict[str, Any]] = []
    status: EvidenceReviewStatus
    submission_notes: str | None = None
    created_at: datetime


class MilestoneReviewResponse(BaseModel):
    id: str
    milestone_id: str
    evidence_id: str
    evidence_version: int
    reviewer_id: str
    reviewer_name: str
    decision: MilestoneReviewDecision
    comments: str | None = None
    created_at: datetime


class MilestoneExecutionResponse(BaseModel):
    id: str
    room_id: str
    source_proposal_id: str
    accepted_proposal_version: int
    milestone_index: int
    title: str
    description: str | None = None
    expected_deliverables: list[str] = []
    agreed_amount: Decimal | None = None
    currency: str = "USD"
    due_days: int | None = None
    planned_due_date: datetime | None = None
    responsible_user: MilestoneParticipantSummary
    reviewer_user: MilestoneParticipantSummary
    status: MilestoneExecutionStatus
    cancellation_reason: str | None = None
    payment_readiness: PaymentReadinessStatus
    current_evidence_submission: MilestoneEvidenceResponse | None = None
    evidence_history: list[MilestoneEvidenceResponse] = Field(default_factory=list)
    review_history: list[MilestoneReviewResponse] = Field(default_factory=list)
    evidence_submissions_count: int = 0
    reviews_count: int = 0
    payer_user_id: str | None = None
    payee_user_id: str | None = None
    started_at: datetime | None = None
    submitted_at: datetime | None = None
    approved_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class MilestoneListResponse(BaseModel):
    items: list[MilestoneExecutionResponse]
    total: int
    completed_count: int
    in_progress_count: int
    pending_review_count: int
    total_agreed_amount: Decimal
    approved_amount: Decimal


class MilestonePaymentReadinessResponse(BaseModel):
    milestone_id: str
    room_id: str
    title: str
    payment_readiness: PaymentReadinessStatus
    agreed_amount: Decimal | None = None
    currency: str = "USD"
    approved_evidence_id: str | None = None
    approved_evidence_version: int | None = None
    reviewer_id: str | None = None
    approved_at: datetime | None = None
    source_proposal_version: int
    settlement_note: str


class MilestoneAIAnalysisResponse(BaseModel):
    milestone_id: str
    completeness_score: int
    deliverables_analysis: list[dict[str, Any]] = []
    review_checklist: list[str] = []
    observations: list[str] = []
    provenance_breakdown: dict[str, list[str]] = Field(
        default_factory=dict,
        description="Categorizes claims into AGREED_TERM, USER_SUBMITTED_EVIDENCE, VERIFIED_APPLICATION_RECORD, AI_OBSERVATION, AI_SUGGESTION, AI_HYPOTHESIS, UNKNOWN_OR_MISSING",
    )
    mode: Literal["LIVE_AI", "DETERMINISTIC_FALLBACK"]
    provider: str
    model: str


class PrepareMilestoneSettlementPayload(BaseModel):
    idempotency_key: str = Field(
        ...,
        min_length=1,
        max_length=128,
        description="Client-generated unique idempotency token to ensure exactly-once transaction preparation.",
    )
    description: str | None = Field(
        default=None,
        max_length=255,
        description="Optional human-readable memo or description for the settlement transaction.",
    )


class CreatePayPalOrderPayload(BaseModel):
    idempotency_key: str = Field(
        ...,
        min_length=1,
        max_length=128,
        description="Client-generated unique idempotency token to ensure exactly-once PayPal order creation.",
    )
    return_url: str | None = Field(
        default=None,
        max_length=500,
        description="Optional buyer return URL upon approval",
    )
    cancel_url: str | None = Field(
        default=None,
        max_length=500,
        description="Optional buyer cancel URL",
    )


class PayPalOrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    transaction_id: str
    transaction_ref: str
    paypal_order_id: str
    order_status: str
    approval_url: str
    currency: str
    amount: str


class CapturePayPalOrderPayload(BaseModel):
    idempotency_key: str = Field(
        ...,
        min_length=4,
        max_length=128,
        description="Client-generated unique idempotency token to ensure exactly-once PayPal order capture.",
    )


class PayPalCaptureResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    transaction_id: str
    transaction_ref: str
    paypal_order_id: str
    paypal_capture_id: str
    capture_status: str
    transaction_status: str
    payment_readiness: str
    currency: str
    amount: str


class MilestoneSettlementStatusResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    milestone_id: str
    room_id: str
    status: str
    payment_readiness: str
    agreed_amount: str | None = None
    currency: str = "USD"
    payer_user_id: str | None = None
    payee_user_id: str | None = None
    transaction_id: str | None = None
    transaction_ref: str | None = None
    paypal_order_id: str | None = None
    paypal_capture_id: str | None = None
    approval_url: str | None = None
