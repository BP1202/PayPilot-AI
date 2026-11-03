from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.opportunity import Opportunity, OpportunityStatus, OpportunityType
from app.repositories.opportunity_repository import OpportunityRepository
from app.schemas.opportunity import (
    OpportunityAnalyzeRequest,
    OpportunityAnalyzeResponse,
    OpportunityCreate,
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
        return await self.analyst.analyze(
            submission_type=request.submission_type,
            text=request.description,
        )

    def create_draft(
        self, payload: OpportunityCreate, user_id: str
    ) -> Opportunity:
        if not user_id or not user_id.strip():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required to save opportunity draft.",
            )

        opportunity = Opportunity(
            id=self.repo.generate_id(),
            user_id=user_id.strip(),
            business_id=payload.business_id,
            submission_type=payload.submission_type.value,
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

    def get_opportunity(
        self, opportunity_id: str, user_id: str
    ) -> Opportunity:
        opp = self.repo.get_by_id(opportunity_id)
        if not opp:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Opportunity draft not found.",
            )

        # Strict tenant / creator ownership authorization check
        if opp.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You do not have permission to view this opportunity.",
            )

        return opp

    def list_user_opportunities(
        self,
        user_id: str,
        status_filter: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Opportunity], int]:
        return self.repo.list_by_user(
            user_id=user_id,
            status=status_filter,
            limit=limit,
            offset=offset,
        )

    def update_opportunity(
        self, opportunity_id: str, payload: OpportunityUpdate, user_id: str
    ) -> Opportunity:
        opp = self.get_opportunity(opportunity_id, user_id)

        update_data = payload.model_dump(exclude_unset=True)
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

        # Update original description and submission type if updated
        if payload.description:
            opp.original_description = payload.description.strip()
        if payload.submission_type:
            opp.submission_type = payload.submission_type.value

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

