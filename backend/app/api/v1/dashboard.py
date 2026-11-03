from typing import Annotated

from app.core.auth import get_current_user_id
from app.core.database import get_db
from app.repositories.business_repository import BusinessRepository
from app.repositories.transaction_repository import TransactionRepository
from app.schemas.business import BusinessRead
from app.schemas.payment import DashboardOverviewResponse
from app.schemas.transaction import DashboardTotals
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/overview", response_model=DashboardOverviewResponse)
def get_dashboard_overview(
    db: Annotated[Session, Depends(get_db)],
    user_id: Annotated[str, Depends(get_current_user_id)],
):
    biz_repo = BusinessRepository(db)
    business = biz_repo.get_by_user_id(user_id)
    if not business:
        business = biz_repo.get_or_create_default_business()

    tx_repo = TransactionRepository(db)
    totals_data = tx_repo.get_dashboard_totals(business.id)

    return DashboardOverviewResponse(
        business=BusinessRead.model_validate(business),
        totals=DashboardTotals(**totals_data),
    )
