import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.opportunity import Opportunity


class OpportunityRepository:
    def __init__(self, db: Session):
        self.db = db

    def generate_id(self) -> str:
        return f"opp_{uuid.uuid4().hex}"

    def create(self, opportunity: Opportunity) -> Opportunity:
        if not opportunity.id:
            opportunity.id = self.generate_id()
        self.db.add(opportunity)
        self.db.commit()
        self.db.refresh(opportunity)
        return opportunity

    def get_by_id(
        self, opportunity_id: str, user_id: str | None = None
    ) -> Opportunity | None:
        stmt = select(Opportunity).where(Opportunity.id == opportunity_id)
        if user_id is not None:
            stmt = stmt.where(Opportunity.user_id == user_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def list_by_user(
        self,
        user_id: str,
        status: str | None = None,
        intent: str | None = None,
        category: str | None = None,
        visibility: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Opportunity], int]:
        base_query = select(Opportunity).where(Opportunity.user_id == user_id)
        if status:
            base_query = base_query.where(Opportunity.status == status)
        if intent:
            base_query = base_query.where(Opportunity.intent == intent)
        if category:
            base_query = base_query.where(Opportunity.category == category)
        if visibility:
            base_query = base_query.where(Opportunity.visibility == visibility)

        # Count total
        count_stmt = select(func.count()).select_from(base_query.subquery())
        total = self.db.execute(count_stmt).scalar() or 0

        # Items ordered by updated_at desc
        stmt = (
            base_query.order_by(Opportunity.updated_at.desc())
            .offset(offset)
            .limit(limit)
        )
        items = list(self.db.execute(stmt).scalars().all())
        return items, total

    def list_published(
        self,
        allowed_visibilities: list[str],
        intent: str | None = None,
        category: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Opportunity], int]:
        base_query = (
            select(Opportunity)
            .where(Opportunity.status == "PUBLISHED")
            .where(Opportunity.visibility.in_(allowed_visibilities))
        )
        if intent:
            base_query = base_query.where(Opportunity.intent == intent)
        if category:
            base_query = base_query.where(Opportunity.category == category)

        count_stmt = select(func.count()).select_from(base_query.subquery())
        total = self.db.execute(count_stmt).scalar() or 0

        stmt = (
            base_query.order_by(
                Opportunity.published_at.desc().nullslast(),
                Opportunity.updated_at.desc(),
            )
            .offset(offset)
            .limit(limit)
        )
        items = list(self.db.execute(stmt).scalars().all())
        return items, total

    def update(self, opportunity: Opportunity) -> Opportunity:
        self.db.add(opportunity)
        self.db.commit()
        self.db.refresh(opportunity)
        return opportunity

    def delete(self, opportunity: Opportunity) -> None:
        self.db.delete(opportunity)
        self.db.commit()
