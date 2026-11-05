import uuid

from sqlalchemy import String, cast, func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.opportunity import Opportunity, OpportunityStatus


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
        q: str | None = None,
        intent: str | None = None,
        category: str | None = None,
        industry: str | None = None,
        skill: str | None = None,
        sort: str = "newest",
        limit: int = 12,
        offset: int = 0,
    ) -> tuple[list[Opportunity], int]:
        base_query = (
            select(Opportunity)
            .where(Opportunity.status == OpportunityStatus.PUBLISHED.value)
            .where(Opportunity.visibility.in_(allowed_visibilities))
        )
        if intent:
            base_query = base_query.where(Opportunity.intent == intent)
        if category:
            base_query = base_query.where(Opportunity.category == category)
        if industry and industry.strip():
            base_query = base_query.where(
                Opportunity.industry.ilike(f"%{industry.strip()}%")
            )
        if skill and skill.strip():
            base_query = base_query.where(
                cast(Opportunity.required_skills_and_resources, String).ilike(
                    f"%{skill.strip()}%"
                )
            )
        if q and q.strip():
            clean_q = q.strip()
            search_pattern = f"%{clean_q}%"
            base_query = base_query.where(
                or_(
                    Opportunity.title.ilike(search_pattern),
                    Opportunity.original_description.ilike(search_pattern),
                    Opportunity.problem_statement.ilike(search_pattern),
                    Opportunity.proposed_solution.ilike(search_pattern),
                    Opportunity.value_proposition.ilike(search_pattern),
                    Opportunity.industry.ilike(search_pattern),
                    cast(Opportunity.required_skills_and_resources, String).ilike(
                        search_pattern
                    ),
                )
            )

        count_stmt = select(func.count()).select_from(base_query.subquery())
        total = self.db.execute(count_stmt).scalar() or 0

        stmt = base_query.options(joinedload(Opportunity.business))

        if sort == "oldest":
            stmt = stmt.order_by(
                Opportunity.published_at.asc().nullsfirst(),
                Opportunity.updated_at.asc(),
                Opportunity.id.asc(),
            )
        else:
            stmt = stmt.order_by(
                Opportunity.published_at.desc().nullslast(),
                Opportunity.updated_at.desc(),
                Opportunity.id.desc(),
            )

        stmt = stmt.offset(offset).limit(limit)
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
