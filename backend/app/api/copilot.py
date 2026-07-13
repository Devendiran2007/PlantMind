from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.services.copilot_service import CopilotService
from app.api.deps import get_current_user
from app.models.user import User
from pydantic import BaseModel

router = APIRouter()

class CopilotQueryRequest(BaseModel):
    query: str

@router.post("/query")
def query_copilot(
    request: CopilotQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Query the AI Copilot Advisor. Fetches matching database context chunks and asks Gemini.
    """
    return CopilotService.query_copilot(db, request.query)
