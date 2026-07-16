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

            # Dynamic AI-powered plant status evaluation
            active_incident = db.query(Incident).filter(Incident.status != "resolved").order_by(Incident.date.desc()).first()
            
            # Initialize defaults
            status_data = {
                "status": "Normal Operations",
                "indicator": "🟢",
                "risk": "Minimal",
                "root_cause": "None",
                "recommended_action": "Routine diagnostics scan",
                "estimated_downtime": "0 Hours",
                "confidence": "99%"
            }
            
            if active_incident:
                status_data = {
                    "status": "Anomaly Detected",
                    "indicator": "🔴",
                    "risk": active_incident.severity.capitalize(),
                    "root_cause": active_incident.title[:30] + "...",
                    "recommended_action": "Execute RCA Triage",
                    "estimated_downtime": "2 Hours",
                    "confidence": "94%"
                }
                
                # Query Gemini to summarize the anomaly details if key exists
                from app.core.config import settings
                import json
                import httpx
                
                gemini_key = settings.GEMINI_API_KEY
                if gemini_key:
                    try:
                        prompt = f"""You are PlantMind AI. Analyze the following active industrial incident:
Incident ID: {active_incident.id}
Title: {active_incident.title}
Severity: {active_incident.severity}
Equipment ID: {active_incident.equipment_id}
Details: {active_incident.details}

Provide a JSON response with these exact keys:
{{
  "status": "Anomaly Detected" or "Warning" (short string),
  "indicator": "🔴" or "🟡" (one emoji),
  "risk": "High" or "Critical" or "Medium" (short string),
  "root_cause": "brief explanation under 5 words",
  "recommended_action": "brief step under 6 words",
  "estimated_downtime": "X Hours" or "X Days",
  "confidence": "XX%"
}}
Do not output any markdown formatting, only valid JSON.
"""
                        url = f"https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key={gemini_key}"
                        payload = {
                            "contents": [{"parts": [{"text": prompt}]}],
                            "generationConfig": {"responseMimeType": "application/json", "temperature": 0.1}
                        }
                        with httpx.Client(timeout=8.0) as client:
                            resp = client.post(url, json=payload)
                        if resp.status_code == 200:
                            parsed = json.loads(resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip())
                            for k in status_data.keys():
                                if k in parsed:
                                    status_data[k] = parsed[k]
                    except Exception as e:
                        logger.warning(f"Failed to query Gemini for dashboard status card: {e}")

            plant_status = {
                "status": status_data["status"],
                "indicator": status_data["indicator"],
                "equipment": active_incident.equipment_id if active_incident else "All assets clear",
                "risk": status_data["risk"],
                "root_cause": status_data["root_cause"],
                "supporting_evidence": f"{len(documents)} Documents",
                "historical_incidents": f"{len(incidents)} Similar Cases",
                "compliance": f"{compliance_gaps} Missing SOPs",
                "recommended_action": status_data["recommended_action"],
                "estimated_downtime": status_data["estimated_downtime"],
                "confidence": status_data["confidence"]
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
