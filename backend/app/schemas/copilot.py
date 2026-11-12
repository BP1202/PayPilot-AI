import enum
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field


class CopilotMode(str, enum.Enum):
    DETERMINISTIC_DEMO = "DETERMINISTIC_DEMO"
    LIVE_AI = "LIVE_AI"


class FinancialImpact(BaseModel):
    current_revenue: Decimal = Field(
        ..., description="Verified current settled revenue"
    )
    projected_revenue: Decimal = Field(
        ..., description="Projected revenue after recommended action"
    )
    net_change: Decimal = Field(..., description="Net financial increase")
    percentage_increase: Decimal = Field(..., description="Percentage revenue change")


class RecommendedAction(BaseModel):
    action_type: str = Field(
        ..., description="Type of executable action, e.g. APPROVE_CUSTOMER_PAYMENT"
    )
    transaction_ref: str | None = Field(
        default=None, description="Target transaction reference"
    )
    amount: Decimal | None = Field(
        default=None, description="Associated payment amount"
    )
    currency: str = Field(default="USD", description="Currency code")
    customer_name: str | None = Field(default=None, description="Target customer name")
    rationale: str = Field(..., description="Action rationale")


class CopilotRecommendation(BaseModel):
    title: str = Field(..., description="Insight headline")
    mode: CopilotMode = Field(..., description="Mode indicating source of intelligence")
    reasoning: str = Field(
        ..., description="Detailed business reasoning and operational context"
    )
    financial_impact: FinancialImpact
    suggested_action: RecommendedAction | None = None
    generated_at: str


class CopilotChatRequest(BaseModel):
    prompt: str = Field(
        ..., min_length=2, max_length=1000, description="Merchant query or prompt"
    )


class CopilotChatResponse(BaseModel):
    reply: str = Field(..., description="Grounded AI response")
    mode: CopilotMode = Field(..., description="Intelligence generation mode")
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    context_summary: dict[str, Any] = Field(
        default_factory=dict, description="Underlying business context"
    )
