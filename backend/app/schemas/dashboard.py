from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.schemas.industrial import EquipmentResponse

class StatCard(BaseModel):
    label: str
    value: str
    change: str
    trend: str
    color: str

class DashboardResponse(BaseModel):
    stats: List[StatCard]
    equipment_health: List[EquipmentResponse]
    compliance_score: int
    compliance_gaps: int
    recent_activities: List[Dict[str, Any]]
    telemetry_history: List[Dict[str, Any]]
    plant_status: Optional[Dict[str, Any]] = None
