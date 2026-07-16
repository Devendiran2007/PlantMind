from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.database.session import get_db
from app.schemas.industrial import IncidentResponse, EquipmentResponse
from app.models.industrial import Incident, Equipment
from app.api.deps import get_current_user
from app.models.user import User
from app.services.war_room_service import WarRoomService

router = APIRouter()

class WarRoomRequest(BaseModel):
    history: List[dict] = []
    message: Optional[str] = None
    live_telemetry: Optional[dict] = None

@router.get("", response_model=List[IncidentResponse])
def get_incidents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve all industrial incidents from the SQLite database.
    """
    return db.query(Incident).all()

@router.get("/equipment", response_model=List[EquipmentResponse])
def get_equipment_list(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve all physical equipment assets.
    """
    return db.query(Equipment).all()

@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident(
    incident_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve details for a specific incident.
    """
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident

@router.post("/{incident_id}/war-room")
def run_incident_war_room(
    incident_id: str,
    request: WarRoomRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Starts or continues a multi-agent engineering debate about a failure root cause.
    """
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    equipment_name = "Unknown Equipment"
    live_telemetry = {"temperature": 0.0, "pressure": 0.0, "vibration": 0.0, "flow_rate": 0.0}
    if incident.equipment_id:
        equipment = db.query(Equipment).filter(Equipment.id == incident.equipment_id).first()
        if equipment:
            equipment_name = equipment.name
            live_telemetry = {
                "temperature": equipment.temperature,
                "pressure": equipment.pressure,
                "vibration": equipment.vibration,
                "flow_rate": equipment.flow_rate
            }

    if request.live_telemetry:
        live_telemetry = request.live_telemetry

    debate = WarRoomService.run_debate(
        incident_title=incident.title,
        equipment_name=equipment_name,
        timeline=incident.timeline,
        evidence=incident.evidence,
        live_telemetry=live_telemetry,
        history=request.history,
        operator_message=request.message
    )
    return {"debate": debate}
