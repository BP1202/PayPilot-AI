from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.models.connection import ConnectionIntent, ConnectionStatus


class ConnectionCreatePayload(BaseModel):
    recipient_id: str
    opportunity_id: str | None = None
    intent: ConnectionIntent = ConnectionIntent.EXPLORE_COLLABORATION
    message: str = Field(..., min_length=10, max_length=1000)


class ConnectionRespondPayload(BaseModel):
    action: str = Field(..., pattern="^(ACCEPT|DECLINE)$")
    response_note: str | None = Field(default=None, max_length=1000)


class ParticipantCard(BaseModel):
    user_id: str
    full_name: str | None
    headline: str | None
    industry: str | None
    skills: list[str]

    model_config = {"from_attributes": True}


class ConnectionResponse(BaseModel):
    id: str
    status: ConnectionStatus
    intent: ConnectionIntent
    message: str
    response_note: str | None
    requester: ParticipantCard
    recipient: ParticipantCard
    opportunity_id: str | None
    opportunity_title: str | None
    accepted_at: datetime | None
    declined_at: datetime | None
    withdrawn_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ConnectionListResponse(BaseModel):
    items: list[ConnectionResponse]
    total: int
    pending_count: int
    accepted_count: int


class ActivityResponse(BaseModel):
    id: str
    entity_type: str
    entity_id: str
    activity_type: str
    title: str
    details: str | None
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ActivityListResponse(BaseModel):
    items: list[ActivityResponse]
    total: int
    unread_count: int
