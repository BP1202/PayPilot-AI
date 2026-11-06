import math
from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.opportunity import (
    Opportunity,
    OpportunityStatus,
    OpportunityType,
    OpportunityVisibility,
)
from app.repositories.business_repository import BusinessRepository
from app.repositories.opportunity_repository import OpportunityRepository
from app.schemas.opportunity import (
    OpportunityAnalyzeRequest,
    OpportunityAnalyzeResponse,
    OpportunityCreate,
    OpportunityDiscoveryResponse,
    OpportunityPublicResponse,
    OpportunityReanalyzeRequest,
    OpportunityUpdate,
)
from app.services.opportunity_analyst import OpportunityAnalystService


class OpportunityService:
    def __init__(self, db: Session, analyst: OpportunityAnalystService | None = None):
        self.db = db
        self.repo = OpportunityRepository(db)
        self.analyst = analyst or OpportunityAnalystService()

    async def analyze(
        self, request: OpportunityAnalyzeRequest
    ) -> OpportunityAnalyzeResponse:
        result = await self.analyst.analyze(
            submission_type=request.submission_type,
            text=request.description,
        )
        return OpportunityAnalyzeResponse(
            submission_type=result.submission_type,
            original_description=result.original_description,
            analysis=result.analysis,
            mode=result.mode,
            provider=result.provider,
            model=result.model,
            confidence=result.confidence,
            message=result.message,
            intent=request.intent,
            category=request.category,
        )

    def create_draft(self, payload: OpportunityCreate, user_id: str) -> Opportunity:
        if not user_id or not user_id.strip():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required to save opportunity draft.",
            )

        if payload.business_id is not None:
            biz = BusinessRepository(self.db).get_by_id(payload.business_id)
            if not biz or biz.user_id != user_id.strip():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: Linked business does not belong to the authenticated user.",
                )

        intent_val = (
            payload.intent.value
            if hasattr(payload.intent, "value")
            else str(payload.intent)
        )
        category_val = (
            payload.category.value
            if hasattr(payload.category, "value")
            else str(payload.category)
        )

        opportunity = Opportunity(
            id=self.repo.generate_id(),
            user_id=user_id.strip(),
            business_id=payload.business_id,
            submission_type=payload.submission_type.value,
            intent=intent_val,
            category=category_val,
            status=payload.status.value,
            visibility=payload.visibility.value,
            title=payload.title.strip(),
            original_description=payload.original_description.strip(),
            problem_statement=payload.problem_statement,
            proposed_solution=payload.proposed_solution,
            industry=payload.industry,
            value_proposition=payload.value_proposition,
            target_customer_segments=payload.target_customer_segments,
            customer_pain_points=payload.customer_pain_points,
            required_skills_and_resources=payload.required_skills_and_resources,
            potential_business_models=payload.potential_business_models,
            key_assumptions=payload.key_assumptions,
            risks_and_uncertainties=payload.risks_and_uncertainties,
            missing_information=payload.missing_information,
            suggested_follow_up_questions=payload.suggested_follow_up_questions,
            provenance=payload.provenance or {},
            ai_metadata=payload.ai_metadata or {},
        )
        return self.repo.create(opportunity)

    def validate_for_publication(self, opp: Opportunity) -> list[str]:
        """Validates that an opportunity meets all quality and commercial criteria before publication."""
        errors: list[str] = []

        if opp.status == OpportunityStatus.CLOSED.value:
            errors.append(
                "Closed opportunities cannot be republished. Please create a new opportunity draft."
            )
            return errors

        if not (opp.title and len(opp.title.strip()) >= 5):
            errors.append("Title must be at least 5 characters long.")

        if not (opp.industry and len(opp.industry.strip()) >= 2):
            errors.append("Industry sector must be specified.")

        has_substance = (
            (opp.problem_statement and len(opp.problem_statement.strip()) >= 10)
            or (opp.proposed_solution and len(opp.proposed_solution.strip()) >= 10)
            or (
                opp.original_description and len(opp.original_description.strip()) >= 15
            )
        )
        if not has_substance:
            errors.append(
                "A detailed problem statement, proposed solution, or description (at least 10 characters) is required."
            )

        has_commercial_clarity = (
            bool(opp.target_customer_segments and len(opp.target_customer_segments) > 0)
            or bool(
                opp.required_skills_and_resources
                and len(opp.required_skills_and_resources) > 0
            )
            or bool(opp.value_proposition and len(opp.value_proposition.strip()) >= 5)
        )
        if not has_commercial_clarity:
            errors.append(
                "At least one target customer segment, required skill/resource, or value proposition must be defined."
            )

        if opp.business_id is not None:
            biz = BusinessRepository(self.db).get_by_id(opp.business_id)
            if not biz or biz.user_id != opp.user_id:
                errors.append(
                    "Linked business profile does not belong to the opportunity creator."
                )

        return errors

    def get_opportunity(
        self, opportunity_id: str, requester_id: str | None = None
    ) -> Opportunity:
        opp = self.repo.get_by_id(opportunity_id)
        if not opp:
            if not requester_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required to view this opportunity.",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Opportunity draft not found.",
            )

        is_owner = requester_id is not None and opp.user_id == requester_id
        if is_owner:
            return opp

        # Non-owner access checks
        if opp.status not in (
            OpportunityStatus.PUBLISHED.value,
            OpportunityStatus.CLOSED.value,
        ):
            if not requester_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required to view this opportunity.",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: This opportunity is a private draft.",
            )

        vis = (opp.visibility or OpportunityVisibility.PRIVATE.value).upper()
        if vis == OpportunityVisibility.PRIVATE.value:
            if not requester_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required to view this opportunity.",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: This opportunity is private.",
            )
        elif vis == OpportunityVisibility.AUTHENTICATED.value:
            if not requester_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required to view this opportunity.",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            return opp
        elif vis in (
            OpportunityVisibility.PUBLIC.value,
            OpportunityVisibility.SHARED.value,
        ):
            return opp
        else:
            if not requester_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required to view this opportunity.",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: This opportunity is private.",
            )

    def publish_opportunity(
        self,
        opportunity_id: str,
        user_id: str,
        target_visibility: OpportunityVisibility = OpportunityVisibility.PUBLIC,
    ) -> Opportunity:
        opp = self.repo.get_by_id(opportunity_id)
        if not opp:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Opportunity draft not found.",
            )
        if opp.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You do not have permission to publish this opportunity.",
            )

        errors = self.validate_for_publication(opp)
        if errors:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Cannot publish opportunity: {'; '.join(errors)}",
            )

        vis_val = (
            target_visibility.value
            if hasattr(target_visibility, "value")
            else str(target_visibility)
        )
        if vis_val == OpportunityVisibility.PRIVATE.value:
            vis_val = OpportunityVisibility.PUBLIC.value

        opp.status = OpportunityStatus.PUBLISHED.value
        opp.visibility = vis_val
        opp.published_at = datetime.now(UTC)
        opp.updated_at = datetime.now(UTC)
        return self.repo.update(opp)

    def unpublish_opportunity(self, opportunity_id: str, user_id: str) -> Opportunity:
        opp = self.repo.get_by_id(opportunity_id)
        if not opp:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Opportunity not found.",
            )
        if opp.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You do not have permission to unpublish this opportunity.",
            )

        if opp.status == OpportunityStatus.CLOSED.value:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Closed opportunities cannot be unpublished.",
            )
        if opp.status != OpportunityStatus.PUBLISHED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Opportunity is not currently published.",
            )

        opp.status = OpportunityStatus.DRAFT.value
        opp.visibility = OpportunityVisibility.PRIVATE.value
        opp.updated_at = datetime.now(UTC)
        return self.repo.update(opp)

    def close_opportunity(
        self, opportunity_id: str, user_id: str, reason: str | None = None
    ) -> Opportunity:
        opp = self.repo.get_by_id(opportunity_id)
        if not opp:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Opportunity not found.",
            )
        if opp.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You do not have permission to close this opportunity.",
            )

        opp.status = OpportunityStatus.CLOSED.value
        opp.closed_at = datetime.now(UTC)
        opp.updated_at = datetime.now(UTC)
        return self.repo.update(opp)

    def update_visibility(
        self,
        opportunity_id: str,
        user_id: str,
        visibility: OpportunityVisibility,
    ) -> Opportunity:
        opp = self.repo.get_by_id(opportunity_id)
        if not opp:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Opportunity not found.",
            )
        if opp.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You do not have permission to modify visibility.",
            )
        if opp.status == OpportunityStatus.CLOSED.value:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Cannot change visibility of a closed opportunity.",
            )

        vis_val = visibility.value if hasattr(visibility, "value") else str(visibility)
        opp.visibility = vis_val
        opp.updated_at = datetime.now(UTC)
        return self.repo.update(opp)

    def list_user_opportunities(
        self,
        user_id: str,
        status_filter: str | None = None,
        intent_filter: str | None = None,
        category_filter: str | None = None,
        visibility_filter: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Opportunity], int]:
        return self.repo.list_by_user(
            user_id=user_id,
            status=status_filter,
            intent=intent_filter,
            category=category_filter,
            visibility=visibility_filter,
            limit=limit,
            offset=offset,
        )

    def list_public_opportunities(
        self,
        requester_id: str | None = None,
        q: str | None = None,
        intent_filter: str | None = None,
        category_filter: str | None = None,
        industry_filter: str | None = None,
        skill_filter: str | None = None,
        sort: str = "newest",
        page: int = 1,
        limit: int = 12,
    ) -> OpportunityDiscoveryResponse:
        allowed = (
            [
                OpportunityVisibility.PUBLIC.value,
                OpportunityVisibility.AUTHENTICATED.value,
            ]
            if requester_id
            else [OpportunityVisibility.PUBLIC.value]
        )
        safe_q = q.strip()[:100] if q and q.strip() else None
        safe_page = max(1, page)
        safe_limit = max(1, min(100, limit))
        offset = (safe_page - 1) * safe_limit

        items, total = self.repo.list_published(
            allowed_visibilities=allowed,
            q=safe_q,
            intent=intent_filter,
            category=category_filter,
            industry=industry_filter.strip()
            if industry_filter and industry_filter.strip()
            else None,
            skill=skill_filter.strip()
            if skill_filter and skill_filter.strip()
            else None,
            sort=sort,
            limit=safe_limit,
            offset=offset,
        )

        pages = math.ceil(total / safe_limit) if total > 0 else 1

        public_items: list[OpportunityPublicResponse] = []
        for opp in items:
            biz_name = opp.business.name if opp.business else None
            dto = OpportunityPublicResponse.model_validate(opp)
            dto.business_name = biz_name
            public_items.append(dto)

        return OpportunityDiscoveryResponse(
            items=public_items,
            total=total,
            page=safe_page,
            limit=safe_limit,
            pages=pages,
        )

    def update_opportunity(
        self, opportunity_id: str, payload: OpportunityUpdate, user_id: str
    ) -> Opportunity:
        opp = self.get_opportunity(opportunity_id, user_id)

        update_data = payload.model_dump(exclude_unset=True)

        # Enforce closed opportunity protection
        if opp.status == OpportunityStatus.CLOSED.value:
            new_status = update_data.get("status")
            if new_status and (
                getattr(new_status, "value", str(new_status))
                != OpportunityStatus.CLOSED.value
            ):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Closed opportunities cannot be reopened or republished.",
                )
        if "business_id" in update_data and update_data["business_id"] is not None:
            biz = BusinessRepository(self.db).get_by_id(update_data["business_id"])
            if not biz or biz.user_id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: Linked business does not belong to the authenticated user.",
                )

        for key, val in update_data.items():
            if hasattr(opp, key):
                if hasattr(val, "value"):  # Handle enum values
                    setattr(opp, key, val.value)
                else:
                    setattr(opp, key, val)

        opp.updated_at = datetime.now(UTC)
        return self.repo.update(opp)

    async def reanalyze_opportunity(
        self,
        opportunity_id: str,
        payload: OpportunityReanalyzeRequest,
        user_id: str,
    ) -> Opportunity:
        opp = self.get_opportunity(opportunity_id, user_id)

        target_description = payload.description or opp.original_description
        target_submission_type = (
            payload.submission_type
            if payload.submission_type is not None
            else OpportunityType(opp.submission_type)
        )

        # Execute fresh analysis
        analysis_res = await self.analyst.analyze(
            submission_type=target_submission_type,
            text=target_description,
        )
        new_data = analysis_res.analysis

        # Update original description, submission type, intent, category if provided
        if payload.description:
            opp.original_description = payload.description.strip()
        if payload.submission_type:
            opp.submission_type = payload.submission_type.value
        if payload.intent:
            opp.intent = (
                payload.intent.value
                if hasattr(payload.intent, "value")
                else str(payload.intent)
            )
        if payload.category:
            opp.category = (
                payload.category.value
                if hasattr(payload.category, "value")
                else str(payload.category)
            )

        # Preserve user edits if requested: only overwrite if current field is empty
        if not payload.preserve_user_edits:
            opp.title = new_data.suggested_title or opp.title
            opp.problem_statement = new_data.problem_statement
            opp.proposed_solution = new_data.proposed_solution
            opp.industry = new_data.industry
            opp.value_proposition = new_data.value_proposition
        else:
            # If user has an existing title and didn't clear it, keep it
            if not opp.title or opp.title == opp.original_description[:40]:
                opp.title = new_data.suggested_title or opp.title
            if not opp.problem_statement:
                opp.problem_statement = new_data.problem_statement
            if not opp.proposed_solution:
                opp.proposed_solution = new_data.proposed_solution
            if not opp.industry:
                opp.industry = new_data.industry
            if not opp.value_proposition:
                opp.value_proposition = new_data.value_proposition

        # Merge / update analytical hypothesis arrays
        opp.target_customer_segments = new_data.target_customer_segments
        opp.customer_pain_points = new_data.customer_pain_points
        opp.required_skills_and_resources = new_data.required_skills_and_resources
        opp.potential_business_models = new_data.potential_business_models
        opp.key_assumptions = new_data.key_assumptions
        opp.risks_and_uncertainties = new_data.risks_and_uncertainties
        opp.missing_information = new_data.missing_information
        opp.suggested_follow_up_questions = new_data.suggested_follow_up_questions

        # Update provenance and metadata
        merged_provenance: dict[str, Any] = dict(opp.provenance or {})
        for field, prov_val in new_data.provenance.items():
            merged_provenance[field] = (
                prov_val.value if hasattr(prov_val, "value") else str(prov_val)
            )
        opp.provenance = merged_provenance
        opp.ai_metadata = new_data.ai_metadata
        opp.status = OpportunityStatus.ANALYSED.value
        opp.updated_at = datetime.now(UTC)

        return self.repo.update(opp)
