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
    description: str | None = Field(default=None, max_length=500)


class BusinessCreate(BusinessBase):
    pass


class BusinessRead(BusinessBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
