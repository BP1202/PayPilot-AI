from datetime import UTC, datetime

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

    def get_by_user_id(self, user_id: str) -> Business | None:
        return (
            self.db.execute(
                select(Business)
                .where(Business.user_id == user_id)
                .order_by(Business.created_at.desc())
            )
            .scalars()
            .first()
        )

    def list_by_user_id(self, user_id: str) -> list[Business]:
        return list(
            self.db.execute(
                select(Business)
                .where(Business.user_id == user_id)
                .order_by(Business.created_at.desc())
            )
            .scalars()
            .all()
        )

    def create(self, business_in: BusinessCreate) -> Business:
        business = Business(
            name=business_in.name,
            currency=business_in.currency.upper(),
            industry=business_in.industry,
            business_type=business_in.business_type,
            country=business_in.country,
            location=business_in.location,
            website=business_in.website,
            description=business_in.description,
            user_id=business_in.user_id,
            visibility=business_in.visibility or "PRIVATE",
            skills=business_in.skills or [],
            experience=business_in.experience or [],
            services=business_in.services or [],
            resources=business_in.resources or [],
            interests=business_in.interests or [],
        )
        self.db.add(business)
        self.db.commit()
        self.db.refresh(business)
        return business

    def update(self, business: Business) -> Business:
        business.updated_at = datetime.now(UTC)
        self.db.commit()
        self.db.refresh(business)
        return business

    def get_or_create_default_business(
        self,
        name: str = "Apex Precision Gearworks",
        currency: str = "USD",
        industry: str = "Precision Parts Manufacturing",
        business_type: str = "Manufacturer",
        country: str = "United States",
        website: str = "https://apexgearworks.demo",
        description: str = "Specialized CNC precision machining and custom gearing demo company.",
        user_id: str | None = None,
    ) -> Business:
        if user_id:
            user_biz = self.get_by_user_id(user_id)
            if user_biz:
                return user_biz

            business = Business(
                name=name,
                currency=currency,
                industry=industry,
                business_type=business_type,
                country=country,
                website=website,
                description=description,
                user_id=user_id,
                visibility="PRIVATE",
                skills=[],
                experience=[],
                services=[],
                resources=[],
                interests=[],
            )
            self.db.add(business)
            self.db.commit()
            self.db.refresh(business)
            return business

        existing = self.get_by_name(name)
        if existing:
            return existing

        business = Business(
            name=name,
            currency=currency,
            industry=industry,
            business_type=business_type,
            country=country,
            website=website,
            description=description,
            user_id="default_user",
            visibility="PRIVATE",
            skills=[],
            experience=[],
            services=[],
            resources=[],
            interests=[],
        )
        self.db.add(business)
        self.db.commit()
        self.db.refresh(business)
        return business
