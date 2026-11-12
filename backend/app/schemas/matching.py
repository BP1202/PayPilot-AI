import enum
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class MatchTier(str, enum.Enum):
    STRONG_MATCH = "STRONG_MATCH"
    MODERATE_MATCH = "MODERATE_MATCH"
    EXPLORATORY = "EXPLORATORY"


class MatchExplanation(BaseModel):
    match_tier: MatchTier
    score: float = Field(
        ge=0.0,
        le=1.0,
        description="Normalized compatibility score used for deterministic ranking",
    )
    strong_signals: list[str] = Field(
        default_factory=list,
        description="Directly matching capabilities, skills, or verified attributes",
    )
    partial_signals: list[str] = Field(
        default_factory=list,
        description="Adjacent domain skills, related industries, or secondary capabilities",
    )
    missing_information: list[str] = Field(
        default_factory=list,
        description="Missing context or details needed to confirm full compatibility",
    )
    potential_gaps: list[str] = Field(
        default_factory=list,
        description="Required opportunity criteria not identified in the candidate profile",
    )
    explanation_summary: str = Field(
        description="Fact-grounded natural language explanation for why this match was recommended",
    )
    mode: Literal["LIVE_AI", "DETERMINISTIC_FALLBACK"] = "DETERMINISTIC_FALLBACK"
    provenance: Literal["AI_INFERRED", "DETERMINISTIC_CALCULATION"] = (
        "DETERMINISTIC_CALCULATION"
    )


class ParticipantCandidate(BaseModel):
    participant_type: Literal["INDIVIDUAL", "BUSINESS"]
    id: str | int
    name: str
    headline: str | None = None
    industry: str | None = None
    location: str | None = None
    skills: list[str] = Field(default_factory=list)
    services: list[str] = Field(default_factory=list)
    resources: list[str] = Field(default_factory=list)
    experience: list[str] = Field(default_factory=list)
    explanation: MatchExplanation


class OpportunityCandidate(BaseModel):
    id: str
    title: str
    submission_type: str
    intent: str
    category: str
    industry: str | None = None
    required_skills_and_resources: list[str] = Field(default_factory=list)
    value_proposition: str | None = None
    published_at: datetime | None = None
    explanation: MatchExplanation


class OpportunityMatchesResponse(BaseModel):
    total: int
    items: list[OpportunityCandidate]
    mode: Literal["LIVE_AI", "DETERMINISTIC_FALLBACK"]


class ParticipantMatchesResponse(BaseModel):
    opportunity_id: str
    opportunity_title: str
    total: int
    items: list[ParticipantCandidate]
    mode: Literal["LIVE_AI", "DETERMINISTIC_FALLBACK"]
