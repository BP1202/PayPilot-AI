from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.business import BusinessRead


class IndividualProfileBase(BaseModel):
    headline: str | None = Field(default=None, max_length=255)
    bio: str | None = Field(default=None)
    location: str | None = Field(default=None, max_length=255)
    industry: str | None = Field(default=None, max_length=100)
    skills: list[str] = Field(default_factory=list)
    experience: list[str] = Field(default_factory=list)
    services: list[str] = Field(default_factory=list)
    resources: list[str] = Field(default_factory=list)
    interests: list[str] = Field(default_factory=list)
    visibility: str = Field(default="PRIVATE", max_length=30)


class IndividualProfileUpdate(BaseModel):
    headline: str | None = Field(default=None, max_length=255)
    bio: str | None = None
    location: str | None = Field(default=None, max_length=255)
    industry: str | None = Field(default=None, max_length=100)
    skills: list[str] | None = None
    experience: list[str] | None = None
    services: list[str] | None = None
    resources: list[str] | None = None
    interests: list[str] | None = None
    visibility: str | None = Field(default=None, max_length=30)


class IndividualProfileRead(IndividualProfileBase):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    created_at: datetime
    updated_at: datetime
    completeness_percent: int = 0
    missing_fields: list[str] = Field(default_factory=list)


class IndividualProfilePublicRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    headline: str | None = None
    bio: str | None = None
    location: str | None = None
    industry: str | None = None
    skills: list[str] = Field(default_factory=list)
    experience: list[str] = Field(default_factory=list)
    services: list[str] = Field(default_factory=list)
    resources: list[str] = Field(default_factory=list)
    interests: list[str] = Field(default_factory=list)
    visibility: str = "PRIVATE"
    created_at: datetime


class ProfileMeResponse(BaseModel):
    individual: IndividualProfileRead
    businesses: list[BusinessRead] = Field(default_factory=list)
