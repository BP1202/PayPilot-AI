from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.business import Business
from app.schemas.business import BusinessCreate


class BusinessRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, business_id: int) -> Business | None:
        return self.db.execute(
            select(Business).where(Business.id == business_id)
        ).scalar_one_or_none()

    def get_by_name(self, name: str) -> Business | None:
        return self.db.execute(
            select(Business).where(Business.name == name)
        ).scalar_one_or_none()

    def create(self, business_in: BusinessCreate) -> Business:
        business = Business(
            name=business_in.name,
            currency=business_in.currency,
            industry=business_in.industry,
            description=business_in.description,
        )
        self.db.add(business)
        self.db.commit()
        self.db.refresh(business)
        return business

    def get_or_create_default_business(
        self,
        name: str = "Apex Precision Gearworks",
        currency: str = "USD",
        industry: str = "Precision Parts Manufacturing",
        description: str = "Specialized CNC precision machining and custom gearing demo company.",
    ) -> Business:
        existing = self.get_by_name(name)
        if existing:
            return existing

        business = Business(
            name=name,
            currency=currency,
            industry=industry,
            description=description,
        )
        self.db.add(business)
        self.db.commit()
        self.db.refresh(business)
        return business
