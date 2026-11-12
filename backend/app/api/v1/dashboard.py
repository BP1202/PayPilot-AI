from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import get_current_user_id
from app.core.database import get_db
from app.repositories.business_repository import BusinessRepository
from app.repositories.transaction_repository import TransactionRepository
from app.schemas.business import BusinessRead
from app.schemas.payment import DashboardOverviewResponse
from app.schemas.transaction import DashboardTotals

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/overview", response_model=DashboardOverviewResponse)
def get_dashboard_overview(
    db: Annotated[Session, Depends(get_db)],
    user_id: Annotated[str, Depends(get_current_user_id)],
):
    biz_repo = BusinessRepository(db)
    business = biz_repo.get_by_user_id(user_id)
    tx_repo = TransactionRepository(db)
    totals_data = tx_repo.get_dashboard_totals_for_user(
        user_id=user_id,
        business_id=business.id if business else None,
    )

    return DashboardOverviewResponse(
        business=BusinessRead.model_validate(business) if business else None,
        totals=DashboardTotals(**totals_data),
    )
