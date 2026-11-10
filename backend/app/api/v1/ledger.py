from typing import Annotated

from app.core.auth import get_optional_user_id
from app.core.database import get_db
from app.models.transaction import TransactionStatus
from app.repositories.business_repository import BusinessRepository
from app.repositories.transaction_repository import TransactionRepository
from app.schemas.payment import LedgerListResponse
from app.schemas.transaction import TransactionRead, TransactionStatusEnum
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

router = APIRouter(prefix="/ledger", tags=["Commerce Ledger"])


@router.get("", response_model=LedgerListResponse)
@router.get("/", response_model=LedgerListResponse, include_in_schema=False)
def get_ledger_transactions(
    db: Annotated[Session, Depends(get_db)],
    user_id: Annotated[str | None, Depends(get_optional_user_id)] = None,
    status: Annotated[
        TransactionStatusEnum | None,
        Query(description="Filter by transaction status"),
    ] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    biz_repo = BusinessRepository(db)
    tx_repo = TransactionRepository(db)
    status_filter = TransactionStatus(status.value) if status else None

    if user_id:
        business = biz_repo.get_by_user_id(user_id)
        business_id = business.id if business else None
        items = tx_repo.list_for_user(
            user_id=user_id,
            business_id=business_id,
            status=status_filter,
            limit=limit,
            offset=offset,
        )
        total_count = tx_repo.count_for_user(
            user_id=user_id,
            business_id=business_id,
            status=status_filter,
        )
    else:
        business = biz_repo.get_or_create_default_business()
        items = tx_repo.list(
            business_id=business.id,
            status=status_filter,
            limit=limit,
            offset=offset,
        )
        total_count = tx_repo.count(business_id=business.id, status=status_filter)

    return LedgerListResponse(
        items=[TransactionRead.model_validate(item) for item in items],
        total=total_count,
    )
