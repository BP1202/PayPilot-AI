from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.business import Business
from app.models.profile import IndividualProfile, ProfileVisibility
from app.repositories.business_repository import BusinessRepository
from app.repositories.individual_profile_repository import IndividualProfileRepository
from app.schemas.business import BusinessPublicRead, BusinessRead, BusinessUpdate
from app.schemas.profile import (
    IndividualProfilePublicRead,
    IndividualProfileRead,
    IndividualProfileUpdate,
    ProfileMeResponse,
)
from app.services.profile_completeness import (
    calculate_business_completeness,
    calculate_individual_completeness,
)
from app.services.profile_privacy import (
    check_business_access,
    check_individual_access,
)


class ProfileService:
    def __init__(self, db: Session):
        self.db = db
        self.ind_repo = IndividualProfileRepository(db)
        self.biz_repo = BusinessRepository(db)

    def _to_individual_read(self, profile: IndividualProfile) -> IndividualProfileRead:
        completeness = calculate_individual_completeness(profile)
        return IndividualProfileRead(
            user_id=profile.user_id,
            headline=profile.headline,
            bio=profile.bio,
            location=profile.location,
            industry=profile.industry,
            skills=profile.skills or [],
            experience=profile.experience or [],
            services=profile.services or [],
            resources=profile.resources or [],
            interests=profile.interests or [],
            visibility=profile.visibility,
            created_at=profile.created_at,
            updated_at=profile.updated_at,
            completeness_percent=completeness["completeness_percent"],
            missing_fields=completeness["missing_fields"],
        )

    def _to_business_read(self, business: Business) -> BusinessRead:
        completeness = calculate_business_completeness(business)
        return BusinessRead(
            id=business.id,
            name=business.name,
            currency=business.currency,
            industry=business.industry,
            business_type=business.business_type,
            country=business.country,
            location=business.location,
            website=business.website,
            description=business.description,
            user_id=business.user_id,
            visibility=business.visibility or "PRIVATE",
            skills=business.skills or [],
            experience=business.experience or [],
            services=business.services or [],
            resources=business.resources or [],
            interests=business.interests or [],
            created_at=business.created_at,
            updated_at=business.updated_at,
            completeness_percent=completeness["completeness_percent"],
            missing_fields=completeness["missing_fields"],
        )

    def get_my_profiles(self, user_id: str) -> ProfileMeResponse:
        ind = self.ind_repo.get_or_create(user_id)
        ind_read = self._to_individual_read(ind)

        businesses = self.biz_repo.list_by_user_id(user_id)
        biz_reads = [self._to_business_read(b) for b in businesses]

        return ProfileMeResponse(
            individual=ind_read,
            businesses=biz_reads,
        )

    def get_my_individual(self, user_id: str) -> IndividualProfileRead:
        ind = self.ind_repo.get_or_create(user_id)
        return self._to_individual_read(ind)

    def update_my_individual(
        self, user_id: str, payload: IndividualProfileUpdate
    ) -> IndividualProfileRead:
        ind = self.ind_repo.get_or_create(user_id)
        data = payload.model_dump(exclude_unset=True)

        if data.get("visibility"):
            vis_val = data["visibility"].upper()
            if vis_val not in ProfileVisibility._value2member_map_:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Invalid visibility value: {data['visibility']}. Expected PRIVATE, AUTHENTICATED, or PUBLIC.",
                )
            data["visibility"] = vis_val

        for key, val in data.items():
            if hasattr(ind, key):
                setattr(ind, key, val)

        updated = self.ind_repo.update(ind)
        return self._to_individual_read(updated)

    def update_my_business(
        self, user_id: str, business_id: int, payload: BusinessUpdate
    ) -> BusinessRead:
        biz = self.biz_repo.get_by_id(business_id)
        if not biz:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization profile not found.",
            )

        if biz.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You do not own this organization profile.",
            )

        data = payload.model_dump(exclude_unset=True)
        if data.get("visibility"):
            vis_val = data["visibility"].upper()
            if vis_val not in ProfileVisibility._value2member_map_:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Invalid visibility value: {data['visibility']}. Expected PRIVATE, AUTHENTICATED, or PUBLIC.",
                )
            data["visibility"] = vis_val

        for key, val in data.items():
            if hasattr(biz, key):
                setattr(biz, key, val)

        updated = self.biz_repo.update(biz)
        return self._to_business_read(updated)

    def get_individual_profile(
        self, target_user_id: str, requester_id: str | None
    ) -> IndividualProfileRead | IndividualProfilePublicRead:
        profile = self.ind_repo.get_by_user_id(target_user_id)
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Individual profile not found.",
            )

        is_owner = check_individual_access(profile, requester_id)
        if is_owner:
            return self._to_individual_read(profile)

        return IndividualProfilePublicRead(
            user_id=profile.user_id,
            headline=profile.headline,
            bio=profile.bio,
            location=profile.location,
            industry=profile.industry,
            skills=profile.skills or [],
            experience=profile.experience or [],
            services=profile.services or [],
            resources=profile.resources or [],
            interests=profile.interests or [],
            visibility=profile.visibility,
            created_at=profile.created_at,
        )

    def get_business_profile(
        self, business_id: int, requester_id: str | None
    ) -> BusinessRead | BusinessPublicRead:
        biz = self.biz_repo.get_by_id(business_id)
        if not biz:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization profile not found.",
            )

        is_owner = check_business_access(biz, requester_id)
        if is_owner:
            return self._to_business_read(biz)

        return BusinessPublicRead(
            id=biz.id,
            name=biz.name,
            currency=biz.currency,
            industry=biz.industry,
            business_type=biz.business_type,
            country=biz.country,
            location=biz.location,
            website=biz.website,
            description=biz.description,
            visibility=biz.visibility or "PRIVATE",
            skills=biz.skills or [],
            experience=biz.experience or [],
            services=biz.services or [],
            resources=biz.resources or [],
            interests=biz.interests or [],
            created_at=biz.created_at,
        )
