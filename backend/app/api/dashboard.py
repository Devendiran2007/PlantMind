from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.dashboard import DashboardResponse
from app.services.dashboard_service import DashboardService
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fetch aggregated industrial operations indicators, compliance rankings, and alarm trends.
    """
    return DashboardService.get_dashboard_summary(db)
