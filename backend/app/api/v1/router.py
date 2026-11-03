from fastapi import APIRouter

from app.api.v1.business import router as business_router
from app.api.v1.business import router as business_router
from app.api.v1.copilot import router as copilot_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.ledger import router as ledger_router
from app.api.v1.payments import router as payments_router

api_v1_router = APIRouter()

api_v1_router.include_router(dashboard_router)
api_v1_router.include_router(ledger_router)
api_v1_router.include_router(payments_router)
api_v1_router.include_router(copilot_router)
api_v1_router.include_router(business_router)
api_v1_router.include_router(business_router)
