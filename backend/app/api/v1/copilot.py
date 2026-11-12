from typing import Annotated

from app.core.auth import get_optional_user_id
from app.core.database import get_db
from app.schemas.copilot import (
    CopilotChatRequest,
    CopilotChatResponse,
    CopilotRecommendation,
)
from app.services.copilot_service import CopilotService
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

router = APIRouter(prefix="/copilot", tags=["AI Business Copilot"])


@router.get("/recommendation", response_model=CopilotRecommendation)
def get_copilot_recommendation(
    db: Annotated[Session, Depends(get_db)],
    user_id: Annotated[str | None, Depends(get_optional_user_id)] = None,
):
    service = CopilotService(db)
    return service.get_decision_recommendation(user_id=user_id)


@router.post("/chat", response_model=CopilotChatResponse)
def chat_with_copilot(
    request: CopilotChatRequest,
    db: Annotated[Session, Depends(get_db)],
    user_id: Annotated[str | None, Depends(get_optional_user_id)] = None,
):
    service = CopilotService(db)
    return service.chat(prompt=request.prompt, user_id=user_id)
