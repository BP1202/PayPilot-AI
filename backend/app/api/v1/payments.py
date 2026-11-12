from typing import Annotated

from app.core.database import get_db
from app.repositories.business_repository import BusinessRepository
from app.schemas.payment import ApprovePaymentRequest, CreateOrderRequest
from app.schemas.transaction import TransactionRead
from app.services.payment_service import (
    PaymentApprovalRequiredError,
    PaymentService,
    TransactionNotFoundError,
)
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/payments", tags=["Payment Workflows"])


@router.post(
    "/create-order", response_model=TransactionRead, status_code=status.HTTP_201_CREATED
)
def create_customer_order(
    request: CreateOrderRequest,
    db: Annotated[Session, Depends(get_db)],
):
    biz_repo = BusinessRepository(db)
    business_id = request.business_id
    if not business_id:
        default_biz = biz_repo.get_or_create_default_business()
        business_id = default_biz.id

    payment_service = PaymentService(db)
    transaction = payment_service.create_customer_order(
        business_id=business_id,
        amount=request.amount,
        currency=request.currency,
        description=request.description,
        customer_name=request.customer_name,
        customer_email=request.customer_email,
    )
    return TransactionRead.model_validate(transaction)


@router.post("/approve", response_model=TransactionRead)
def approve_payment(
    request: ApprovePaymentRequest,
    db: Annotated[Session, Depends(get_db)],
):
    payment_service = PaymentService(db)
    try:
        updated_tx = payment_service.approve_and_capture(
            transaction_ref=request.transaction_ref,
            owner_approved=request.owner_approved,
            idempotency_key=request.idempotency_key,
        )
        return TransactionRead.model_validate(updated_tx)
    except PaymentApprovalRequiredError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except TransactionNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
