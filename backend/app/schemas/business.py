from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class BusinessBase(BaseModel):
    name: str = Field(
        ..., min_length=1, max_length=255, description="Business or merchant name"
    )
    currency: str = Field(
        default="USD",
        min_length=3,
        max_length=3,
        description="Default 3-letter currency code",
    )
    industry: str | None = Field(default=None, max_length=100)
    business_type: str | None = Field(
        default=None,
        max_length=100,
        description="e.g., Wholesaler, Retailer, Manufacturer",
    )
    country: str | None = Field(default=None, max_length=100)
    location: str | None = Field(default=None, max_length=255)
    website: str | None = Field(default=None, max_length=255)
    description: str | None = Field(default=None, max_length=1000)
    visibility: str = Field(default="PRIVATE", max_length=30)
    skills: list[str] = Field(default_factory=list)
    experience: list[str] = Field(default_factory=list)
    services: list[str] = Field(default_factory=list)
    resources: list[str] = Field(default_factory=list)
    interests: list[str] = Field(default_factory=list)


class BusinessCreate(BusinessBase):
    user_id: str | None = Field(default=None, max_length=100)


class BusinessUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    industry: str | None = Field(default=None, max_length=100)
    business_type: str | None = Field(default=None, max_length=100)
    country: str | None = Field(default=None, max_length=100)
    location: str | None = Field(default=None, max_length=255)
    website: str | None = Field(default=None, max_length=255)
    description: str | None = Field(default=None, max_length=1000)
    visibility: str | None = Field(default=None, max_length=30)
    skills: list[str] | None = None
    experience: list[str] | None = None
    services: list[str] | None = None
    resources: list[str] | None = None
    interests: list[str] | None = None


class BusinessRead(BusinessBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: str | None = None
    created_at: datetime
    updated_at: datetime
    completeness_percent: int | None = None
    missing_fields: list[str] = Field(default_factory=list)


class BusinessPublicRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    currency: str = "USD"
    industry: str | None = None
    business_type: str | None = None
    country: str | None = None
    location: str | None = None
    website: str | None = None
    description: str | None = None
    visibility: str = "PRIVATE"
    skills: list[str] = Field(default_factory=list)
    experience: list[str] = Field(default_factory=list)
    services: list[str] = Field(default_factory=list)
    resources: list[str] = Field(default_factory=list)
    interests: list[str] = Field(default_factory=list)
    created_at: datetime


class BusinessProfileExtractRequest(BaseModel):
    description: str = Field(
        ...,
        min_length=5,
        max_length=5000,
        description="Unstructured business description provided by the business owner",
    )


class BusinessProfileExtraction(BaseModel):
    name: str = Field(default="", description="Suggested business name")
    description: str = Field(default="", description="Suggested business summary")
    industry: str = Field(default="", description="Suggested industry sector")
    business_type: str = Field(
        default="",
        description="Suggested business classification (e.g., Wholesaler, Retailer)",
    )
    country: str = Field(default="", description="Suggested home country")
    website: str = Field(
        default="", description="Extracted official website URL if supplied, else blank"
    )
    currency: str = Field(default="USD", description="Suggested default currency code")
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    extracted_fields: list[str] = Field(
        default_factory=list, description="List of fields extracted from input text"
    )
