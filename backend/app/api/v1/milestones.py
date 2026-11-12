"""Milestones API router — endpoints for Deal Room milestone execution, evidence submission and review."""

from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.milestone_execution import (
    CapturePayPalOrderPayload,
    CreatePayPalOrderPayload,
    MilestoneAIAnalysisResponse,
    MilestoneCancelPayload,
    MilestoneEvidenceCreatePayload,
    MilestoneEvidenceResponse,
    MilestoneExecutionResponse,
    MilestoneListResponse,
    MilestonePaymentReadinessResponse,
    MilestoneReviewPayload,
    MilestoneSettlementStatusResponse,
    PayPalCaptureResponse,
    PayPalOrderResponse,
    PrepareMilestoneSettlementPayload,
)
from app.schemas.transaction import TransactionRead
from app.services.milestone_service import MilestoneService
from app.services.payment_service import PaymentService

router = APIRouter(
    prefix="/deal-rooms/{room_id}/milestones", tags=["deal-room-milestones"]
)


@router.post(
    "/initialize",
    response_model=list[MilestoneExecutionResponse],
    summary="Initialize execution milestones from accepted proposal snapshot",
)
def initialize_deal_room_milestones(
    room_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[MilestoneExecutionResponse]:
    service = MilestoneService()
    return service.initialize_milestones(
        db=db, user_id=current_user.id, room_id=room_id
    )


@router.get(
    "",
    response_model=MilestoneListResponse,
    summary="List all milestone execution records and progress aggregates for a Deal Room",
)
def list_deal_room_milestones(
    room_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> MilestoneListResponse:
    service = MilestoneService()
    return service.list_milestones(db=db, user_id=current_user.id, room_id=room_id)


@router.get(
    "/{milestone_id}",
    response_model=MilestoneExecutionResponse,
    summary="Get detailed milestone execution record with evidence history and reviews",
)
def get_deal_room_milestone(
    room_id: str,
    milestone_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> MilestoneExecutionResponse:
    service = MilestoneService()
    return service.get_milestone(
        db=db, user_id=current_user.id, room_id=room_id, milestone_id=milestone_id
    )


@router.post(
    "/{milestone_id}/start",
    response_model=MilestoneExecutionResponse,
    summary="Responsible participant begins work on milestone (IN_PROGRESS)",
)
def start_milestone_work(
    room_id: str,
    milestone_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> MilestoneExecutionResponse:
    service = MilestoneService()
    return service.start_work(
        db=db, user_id=current_user.id, room_id=room_id, milestone_id=milestone_id
    )


@router.post(
    "/{milestone_id}/evidence",
    response_model=MilestoneEvidenceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit deliverable evidence for review (SUBMITTED_FOR_REVIEW)",
)
def submit_milestone_evidence(
    room_id: str,
    milestone_id: str,
    payload: MilestoneEvidenceCreatePayload,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> MilestoneEvidenceResponse:
    service = MilestoneService()
    return service.submit_evidence(
        db=db,
        user_id=current_user.id,
        room_id=room_id,
        milestone_id=milestone_id,
        payload=payload,
    )


@router.post(
    "/{milestone_id}/reviews",
    response_model=MilestoneExecutionResponse,
    summary="Designated reviewer approves or requests revisions on submitted evidence",
)
def review_milestone_evidence(
    room_id: str,
    milestone_id: str,
    payload: MilestoneReviewPayload,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> MilestoneExecutionResponse:
    service = MilestoneService()
    return service.review_milestone(
        db=db,
        user_id=current_user.id,
        room_id=room_id,
        milestone_id=milestone_id,
        payload=payload,
    )


@router.post(
    "/{milestone_id}/cancel",
    response_model=MilestoneExecutionResponse,
    summary="Cancel an unapproved milestone with mandatory reason",
)
def cancel_deal_room_milestone(
    room_id: str,
    milestone_id: str,
    payload: MilestoneCancelPayload,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> MilestoneExecutionResponse:
    service = MilestoneService()
    return service.cancel_milestone(
        db=db,
        user_id=current_user.id,
        room_id=room_id,
        milestone_id=milestone_id,
        payload=payload,
    )


@router.get(
    "/{milestone_id}/payment-readiness",
    response_model=MilestonePaymentReadinessResponse,
    summary="Expose payment readiness and approval audit record for PayPal integration",
)
def get_milestone_payment_readiness(
    room_id: str,
    milestone_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> MilestonePaymentReadinessResponse:
    service = MilestoneService()
    return service.get_payment_readiness(
        db=db, user_id=current_user.id, room_id=room_id, milestone_id=milestone_id
    )


@router.post(
    "/{milestone_id}/ai/analyze",
    response_model=MilestoneAIAnalysisResponse,
    summary="AI Milestone Copilot evaluates evidence completeness against agreed scope",
)
async def analyze_milestone_deliverables_ai(
    room_id: str,
    milestone_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> MilestoneAIAnalysisResponse:
    service = MilestoneService()
    return await service.analyze_milestone_ai(
        db=db, user_id=current_user.id, room_id=room_id, milestone_id=milestone_id
    )


@router.post(
    "/{milestone_id}/settlement",
    response_model=TransactionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Prepare an agreement-backed settlement transaction record for an approved milestone",
)
def prepare_milestone_settlement(
    room_id: str,
    milestone_id: str,
    payload: PrepareMilestoneSettlementPayload,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    response: Response,
) -> TransactionRead:
    payment_service = PaymentService(db)
    tx = payment_service.prepare_milestone_settlement(
        caller_user_id=current_user.id,
        room_id=room_id,
        milestone_id=milestone_id,
        idempotency_key=payload.idempotency_key,
        description=payload.description,
    )
    return TransactionRead.model_validate(tx)


@router.get(
    "/{milestone_id}/settlement",
    response_model=MilestoneSettlementStatusResponse,
    summary="Get authoritative settlement and PayPal order status for a milestone",
)
def get_milestone_settlement_status(
    room_id: str,
    milestone_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> MilestoneSettlementStatusResponse:
    payment_service = PaymentService(db)
    res = payment_service.get_milestone_settlement_status(
        caller_user_id=current_user.id,
        room_id=room_id,
        milestone_id=milestone_id,
    )
    return MilestoneSettlementStatusResponse.model_validate(res)


@router.post(
    "/{milestone_id}/paypal/create-order",
    response_model=PayPalOrderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a PayPal Sandbox order for an approved milestone settlement",
)
def create_milestone_paypal_order(
    room_id: str,
    milestone_id: str,
    payload: CreatePayPalOrderPayload,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> PayPalOrderResponse:
    payment_service = PaymentService(db)
    res = payment_service.create_paypal_order_for_milestone(
        caller_user_id=current_user.id,
        room_id=room_id,
        milestone_id=milestone_id,
        idempotency_key=payload.idempotency_key,
        return_url=payload.return_url,
        cancel_url=payload.cancel_url,
    )
    return PayPalOrderResponse.model_validate(res)


@router.post(
    "/{milestone_id}/paypal/capture-order",
    response_model=PayPalCaptureResponse,
    status_code=status.HTTP_200_OK,
    summary="Verify buyer approval and capture a PayPal Sandbox order for an approved milestone",
)
def capture_milestone_paypal_order(
    room_id: str,
    milestone_id: str,
    payload: CapturePayPalOrderPayload,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> PayPalCaptureResponse:
    payment_service = PaymentService(db)
    res = payment_service.capture_paypal_order_for_milestone(
        caller_user_id=current_user.id,
        room_id=room_id,
        milestone_id=milestone_id,
        idempotency_key=payload.idempotency_key,
    )
    return PayPalCaptureResponse.model_validate(res)


