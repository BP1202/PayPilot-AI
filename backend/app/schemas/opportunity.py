from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.opportunity import (
    OpportunityCategory,
    OpportunityIntent,
    OpportunityStatus,
    OpportunityType,
    OpportunityVisibility,
    ProvenanceCategory,
)


class OpportunityAnalyzeRequest(BaseModel):
    submission_type: OpportunityType = OpportunityType.IDEA
    description: str = Field(
        ...,
        min_length=10,
        max_length=10000,
        description="Natural language description of the idea or problem statement.",
    )
    business_id: int | None = Field(
        default=None, description="Optional linked business profile ID."
    )
    intent: OpportunityIntent = OpportunityIntent.SEEKING_SOLUTION
    category: OpportunityCategory = OpportunityCategory.BUSINESS


class OpportunityAnalysisData(BaseModel):
    suggested_title: str = Field(
        default="", description="Professional, concise title for the opportunity."
    )
    problem_statement: str = Field(
        default="",
        description="Structured articulation of the core friction or pain point.",
    )
    proposed_solution: str = Field(
        default="",
        description="Structured conceptual solution addressing the problem.",
    )
    target_customer_segments: list[str] = Field(
        default_factory=list,
        description="Specific candidate customer segments or audiences.",
    )
    customer_pain_points: list[str] = Field(
        default_factory=list,
        description="Specific operational or financial pain points.",
    )
    value_proposition: str = Field(
        default="",
        description="Primary commercial or operational value delivered.",
    )
    industry: str = Field(
        default="",
        description="Relevant industry or business category.",
    )
    required_skills_and_resources: list[str] = Field(
        default_factory=list,
        description="Capabilities, skills, or assets required to execute.",
    )
    potential_business_models: list[str] = Field(
        default_factory=list,
        description="Plausible commercial monetization models.",
    )
    key_assumptions: list[str] = Field(
        default_factory=list,
        description="Unverified assumptions underlying the opportunity.",
    )
    risks_and_uncertainties: list[str] = Field(
        default_factory=list,
        description="Market, technical, or execution uncertainties.",
    )
    missing_information: list[str] = Field(
        default_factory=list,
        description="Crucial details not provided in the original submission.",
    )
    suggested_follow_up_questions: list[str] = Field(
        default_factory=list,
        description="Targeted prompts to deepen the concept.",
    )
    provenance: dict[str, ProvenanceCategory] = Field(
        default_factory=dict,
        description="Field-level provenance distinction (USER_PROVIDED, AI_SUGGESTION, AI_HYPOTHESIS, etc.).",
    )
    ai_metadata: dict[str, Any] = Field(
        default_factory=dict,
        description="Engine provenance metadata (provider, model, confidence score, mode).",
    )


class OpportunityAnalyzeResponse(BaseModel):
    submission_type: OpportunityType
    original_description: str
    analysis: OpportunityAnalysisData
    mode: str = Field(
        default="DETERMINISTIC_FALLBACK",
        description="AI execution mode: 'LIVE_AI' or 'DETERMINISTIC_FALLBACK'.",
    )
    provider: str | None = Field(default=None, description="Active AI provider name.")
    model: str | None = Field(default=None, description="Active AI model name.")
    confidence: float = Field(default=0.85, ge=0.0, le=1.0)
    message: str = Field(
        default="",
        description="Transparent summary of analysis provenance and human review advice.",
    )
    intent: OpportunityIntent = OpportunityIntent.SEEKING_SOLUTION
    category: OpportunityCategory = OpportunityCategory.BUSINESS


class OpportunityCreate(BaseModel):
    submission_type: OpportunityType = OpportunityType.IDEA
    intent: OpportunityIntent = OpportunityIntent.SEEKING_SOLUTION
    category: OpportunityCategory = OpportunityCategory.BUSINESS
    title: str = Field(..., min_length=2, max_length=255)
    original_description: str = Field(..., min_length=10)

    problem_statement: str | None = ""
    proposed_solution: str | None = ""
    industry: str | None = ""
    value_proposition: str | None = ""

    target_customer_segments: list[str] = Field(default_factory=list)
    customer_pain_points: list[str] = Field(default_factory=list)
    required_skills_and_resources: list[str] = Field(default_factory=list)
    potential_business_models: list[str] = Field(default_factory=list)
    key_assumptions: list[str] = Field(default_factory=list)
    risks_and_uncertainties: list[str] = Field(default_factory=list)
    missing_information: list[str] = Field(default_factory=list)
    suggested_follow_up_questions: list[str] = Field(default_factory=list)

    provenance: dict[str, Any] = Field(default_factory=dict)
    ai_metadata: dict[str, Any] = Field(default_factory=dict)
    business_id: int | None = None
    status: OpportunityStatus = OpportunityStatus.ANALYSED
    visibility: OpportunityVisibility = OpportunityVisibility.PRIVATE


class OpportunityUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=255)
    original_description: str | None = Field(default=None, min_length=10)
    intent: OpportunityIntent | None = None
    category: OpportunityCategory | None = None
    problem_statement: str | None = None
    proposed_solution: str | None = None
    industry: str | None = None
    value_proposition: str | None = None

    target_customer_segments: list[str] | None = None
    customer_pain_points: list[str] | None = None
    required_skills_and_resources: list[str] | None = None
    potential_business_models: list[str] | None = None
    key_assumptions: list[str] | None = None
    risks_and_uncertainties: list[str] | None = None
    missing_information: list[str] | None = None
    suggested_follow_up_questions: list[str] | None = None

    provenance: dict[str, Any] | None = None
    ai_metadata: dict[str, Any] | None = None
    status: OpportunityStatus | None = None
    visibility: OpportunityVisibility | None = None
    business_id: int | None = None


class OpportunityResponse(BaseModel):
    id: str
    user_id: str
    business_id: int | None = None
    submission_type: str
    intent: str = OpportunityIntent.SEEKING_SOLUTION.value
    category: str = OpportunityCategory.BUSINESS.value
    status: str
    visibility: str
    title: str
    original_description: str

    problem_statement: str | None = None
    proposed_solution: str | None = None
    industry: str | None = None
    value_proposition: str | None = None

    target_customer_segments: list[str] = Field(default_factory=list)
    customer_pain_points: list[str] = Field(default_factory=list)
    required_skills_and_resources: list[str] = Field(default_factory=list)
    potential_business_models: list[str] = Field(default_factory=list)
    key_assumptions: list[str] = Field(default_factory=list)
    risks_and_uncertainties: list[str] = Field(default_factory=list)
    missing_information: list[str] = Field(default_factory=list)
    suggested_follow_up_questions: list[str] = Field(default_factory=list)

    provenance: dict[str, Any] = Field(default_factory=dict)
    ai_metadata: dict[str, Any] = Field(default_factory=dict)
    published_at: datetime | None = None
    closed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OpportunityListResponse(BaseModel):
    items: list[OpportunityResponse]
    total: int


class OpportunityReanalyzeRequest(BaseModel):
    description: str | None = Field(
        default=None,
        description="Optional updated description. If omitted, uses stored original_description.",
    )
    submission_type: OpportunityType | None = None
    intent: OpportunityIntent | None = None
    category: OpportunityCategory | None = None
    preserve_user_edits: bool = Field(
        default=True,
        description="If True, keeps custom user-edited fields and merges new analytical suggestions.",
    )


class OpportunityPublishRequest(BaseModel):
    visibility: OpportunityVisibility = Field(
        default=OpportunityVisibility.PUBLIC,
        description="Target publication visibility: PUBLIC or AUTHENTICATED.",
    )


class OpportunityVisibilityUpdateRequest(BaseModel):
    visibility: OpportunityVisibility = Field(
        ...,
        description="Target visibility: PRIVATE, AUTHENTICATED, or PUBLIC.",
    )


class OpportunityCloseRequest(BaseModel):
    reason: str | None = Field(
        default=None, max_length=500, description="Optional closure rationale."
    )


class OpportunityPublicResponse(BaseModel):
    id: str
    user_id: str | None = None
    creator_name: str | None = None
    business_id: int | None = None
    business_name: str | None = None
    submission_type: str
    intent: str
    category: str
    status: str
    visibility: str
    title: str

    problem_statement: str | None = None
    proposed_solution: str | None = None
    industry: str | None = None
    value_proposition: str | None = None

    target_customer_segments: list[str] = Field(default_factory=list)
    customer_pain_points: list[str] = Field(default_factory=list)
    required_skills_and_resources: list[str] = Field(default_factory=list)
    potential_business_models: list[str] = Field(default_factory=list)
    key_assumptions: list[str] = Field(default_factory=list)
    risks_and_uncertainties: list[str] = Field(default_factory=list)
    missing_information: list[str] = Field(default_factory=list)
    suggested_follow_up_questions: list[str] = Field(default_factory=list)

    published_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OpportunityDiscoveryResponse(BaseModel):
    items: list[OpportunityPublicResponse]
    total: int
    page: int
    limit: int
    pages: int
