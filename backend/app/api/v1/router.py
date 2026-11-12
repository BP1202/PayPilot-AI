from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.business import router as business_router
from app.api.v1.connections import router as connections_router
from app.api.v1.copilot import router as copilot_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.deal_rooms import router as deal_rooms_router
from app.api.v1.ledger import router as ledger_router
from app.api.v1.matches import router as matches_router
from app.api.v1.milestones import router as milestones_router
from app.api.v1.opportunities import router as opportunities_router
from app.api.v1.payments import router as payments_router
from app.api.v1.profiles import router as profiles_router
from app.api.v1.proposals import router as proposals_router

api_v1_router = APIRouter()

api_v1_router.include_router(auth_router)
api_v1_router.include_router(dashboard_router)
api_v1_router.include_router(ledger_router)
api_v1_router.include_router(payments_router)
api_v1_router.include_router(copilot_router)
api_v1_router.include_router(business_router)
api_v1_router.include_router(opportunities_router)
api_v1_router.include_router(profiles_router)
api_v1_router.include_router(matches_router)
api_v1_router.include_router(connections_router)
api_v1_router.include_router(proposals_router)
api_v1_router.include_router(deal_rooms_router)
api_v1_router.include_router(milestones_router)
