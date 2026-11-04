from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.profile import IndividualProfile, ProfileVisibility


class IndividualProfileRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_user_id(self, user_id: str) -> IndividualProfile | None:
        return self.db.execute(
            select(IndividualProfile).where(IndividualProfile.user_id == user_id)
        ).scalar_one_or_none()

    def create(self, profile: IndividualProfile) -> IndividualProfile:
        self.db.add(profile)
        self.db.commit()
        self.db.refresh(profile)
        return profile

    def get_or_create(self, user_id: str) -> IndividualProfile:
        profile = self.get_by_user_id(user_id)
        if profile is not None:
            return profile

        new_profile = IndividualProfile(
            user_id=user_id,
            headline=None,
            bio=None,
            location=None,
            industry=None,
            skills=[],
            experience=[],
            services=[],
            resources=[],
            interests=[],
            visibility=ProfileVisibility.PRIVATE.value,
        )
        self.db.add(new_profile)
        self.db.commit()
        self.db.refresh(new_profile)
        return new_profile

    def update(self, profile: IndividualProfile) -> IndividualProfile:
        profile.updated_at = datetime.now(UTC)
        self.db.commit()
        self.db.refresh(profile)
        return profile

