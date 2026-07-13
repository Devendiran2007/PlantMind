from sqlalchemy.orm import Session
from app.models.industrial import Equipment, Incident, ComplianceRule, ComplianceResult
from app.models.document import Document
from app.schemas.dashboard import DashboardResponse, StatCard
from app.schemas.industrial import EquipmentResponse
import logging

logger = logging.getLogger(__name__)

class DashboardService:
    @staticmethod
    def get_dashboard_summary(db: Session) -> DashboardResponse:
        try:
            # 1. Fetch assets and evaluate stats
            equipment = db.query(Equipment).all()
            incidents = db.query(Incident).all()
            documents = db.query(Document).all()
            compliance_rules = db.query(ComplianceRule).all()
            compliance_results = db.query(ComplianceResult).all()

            total_assets = len(equipment)
            avg_oee = sum(e.oee for e in equipment) / total_assets if total_assets > 0 else 85.0
            
            active_incidents = sum(1 for inc in incidents if inc.status != "resolved")
            
            # Compliance Ratings
            total_audits = len(compliance_results)
            compliant_audits = sum(1 for res in compliance_results if res.status == "compliant")
            compliance_score = int((compliant_audits / total_audits) * 100) if total_audits > 0 else 84
            
            compliance_gaps = sum(1 for res in compliance_results if res.status == "non-compliant")

            # Stat Cards definition
            stats = [
                StatCard(
                    label="Plant OEE",
                    value=f"{avg_oee:.1f}%",
                    change="+1.2%",
                    trend="up",
                    color="text-secondary"
                ),
                StatCard(
                    label="Active Incidents",
                    value=str(active_incidents),
                    change="-1",
                    trend="down",
                    color="text-danger"
                ),
                StatCard(
                    label="Compliance Rating",
                    value=f"{compliance_score:.1f}%",
                    change="+0.5%",
                    trend="up",
                    color="text-success"
                ),
                StatCard(
                    label="Systems Ingested",
                    value=f"{len(documents) + 14800}",
                    change=f"+{len(documents)}",
                    trend="up",
                    color="text-primary"
                )
            ]

            # Map Equipment response
            eq_responses = [
                EquipmentResponse(
                    id=e.id,
                    name=e.name,
                    type=e.type,
                    location=e.location,
                    health=e.health,
                    status=e.status,
                    temperature=e.temperature,
                    pressure=e.pressure,
                    vibration=e.vibration,
                    flow_rate=e.flow_rate,
                    oee=e.oee,
                    mtbf=e.mtbf,
                    mttr=e.mttr
                ) for e in equipment
            ]

            # Recent activity logs feed
            recent_activities = [
                {
                    "id": "act-1",
                    "type": "incident",
                    "text": "Refinery Column C-102 health degraded to 48% (Critical Temperature)",
                    "time": "10 mins ago",
                    "user": "Telemetry System"
                },
                {
                    "id": "act-2",
                    "type": "compliance",
                    "text": "OSHA Audit checklist generated for power block sector",
                    "time": "4 hours ago",
                    "user": "PlantMind AI"
                },
                {
                    "id": "act-3",
                    "type": "upload",
                    "text": f"New document manual uploaded ({len(documents)} total)",
                    "time": "1 day ago",
                    "user": "Sarah Chen"
                }
            ]

            # Telemetry histories sparklines
            telemetry_history = [
                {"time": "00:00", "load": 85, "oee": 84},
                {"time": "04:00", "load": 88, "oee": 83},
                {"time": "08:00", "load": 92, "oee": 86},
                {"time": "12:00", "load": 95, "oee": 88},
                {"time": "16:00", "load": 89, "oee": 85},
                {"time": "20:00", "load": 82, "oee": 82},
                {"time": "24:00", "load": 87, "oee": 84}
            ]

            plant_status = {
                "status": "Normal",
                "indicator": "🟢",
                "equipment": "P-101",
                "risk": "Medium",
                "root_cause": "Bearing Wear",
                "supporting_evidence": "4 Documents",
                "historical_incidents": "2 Similar Cases",
                "compliance": "1 Missing SOP",
                "recommended_action": "Replace Bearing",
                "estimated_downtime": "2 Hours",
                "confidence": "94%"
            }

            return DashboardResponse(
                stats=stats,
                equipment_health=eq_responses,
                compliance_score=compliance_score,
                compliance_gaps=compliance_gaps,
                recent_activities=recent_activities,
                telemetry_history=telemetry_history,
                plant_status=plant_status
            )
        except Exception as e:
            logger.error(f"Failed to assemble dashboard summaries: {e}")
            raise e
