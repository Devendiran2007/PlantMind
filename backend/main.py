import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Core
from app.core.config import settings
from app.core.security import get_password_hash

# Database
from app.models.base import Base
from app.database.session import engine, SessionLocal

# Models
from app.models.user import User
from app.models.document import Document, DocumentChunk
from app.models.industrial import Equipment, Engineer, Incident, MaintenanceRecord, ComplianceRule, ComplianceResult

# Routers
from app.api import auth, documents, uploads, dashboard, copilot, graph, incidents, cv

# Setup logging
logging.basicConfig(
    level=logging.INFO, 
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("plantmind")

def seed_database():
    logger.info("Initializing database schemas...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # 1. Users Seeding
        if db.query(User).count() == 0:
            logger.info("Seeding user accounts...")
            users = [
                User(email="admin@plantmind.com", hashed_password=get_password_hash("adminpassword"), role="Admin", full_name="Admin Lead"),
                User(email="engineer@plantmind.com", hashed_password=get_password_hash("engineerpassword"), role="Engineer", full_name="Sarah Chen"),
                User(email="safety@plantmind.com", hashed_password=get_password_hash("safetypassword"), role="Safety Officer", full_name="J. Marcus"),
                User(email="auditor@plantmind.com", hashed_password=get_password_hash("auditorpassword"), role="Auditor", full_name="Lead Auditor")
            ]
            db.bulk_save_objects(users)
            db.commit()

        # 2. Assets Seeding
        if db.query(Equipment).count() == 0:
            logger.info("Seeding plant equipment assets...")
            assets = [
                Equipment(id="EQ-B3", name="Steam Boiler Unit 3", type="High-Pressure Boiler", location="Thermal Power Block B", health=74, status="warning", temperature=542.0, pressure=168.0, vibration=4.8, oee=82.4, mtbf=2400.0, mttr=14.5),
                Equipment(id="EQ-GT01", name="Gas Turbine GT-01", type="Siemens SGT-800", location="Co-generation Unit 1", health=96, status="healthy", temperature=920.0, pressure=32.0, vibration=1.2, oee=94.8, mtbf=4800.0, mttr=8.2),
                Equipment(id="EQ-RC2", name="Refinery Column C-102", type="Fractional Distillation", location="Hydrocracking Sector 2", health=48, status="critical", temperature=385.0, pressure=12.4, vibration=6.2, flow_rate=840.0, oee=64.1, mtbf=1200.0, mttr=28.0)
            ]
            db.bulk_save_objects(assets)
            db.commit()

        # 3. Engineers Seeding
        if db.query(Engineer).count() == 0:
            logger.info("Seeding engineers directory...")
            engs = [
                Engineer(id="ENG-CHEN", name="Sarah Chen", title="Senior Reliability Engineer", certifications="CRE, PHA Leader", experience_years=8),
                Engineer(id="ENG-MARCUS", name="J. Marcus", title="Director of Process Safety", certifications="PE, CSP", experience_years=18)
            ]
            db.bulk_save_objects(engs)
            db.commit()

        # 4. Incident Records Seeding
        if db.query(Incident).count() == 0:
            logger.info("Seeding incident histories...")
            inc = Incident(
                id="INC-2026-089",
                title="Boiler 3 Thermal Expansion & Pressure Excursion",
                equipment_id="EQ-B3",
                date="2026-07-12",
                duration="45 mins",
                severity="high",
                status="investigating",
                risk_score=78,
                timeline=[
                    {"time": "14:20:05", "event": "Main Steam Valve FC-301 feedback mismatch", "status": "warning"},
                    {"time": "14:21:40", "event": "Superheater outlet pressure rose from 155 to 168 bar", "status": "anomaly"},
                    {"time": "14:24:12", "event": "Tube metal temp exceeded alarm threshold at 542°C", "status": "anomaly"},
                    {"time": "14:25:00", "event": "Auto-shedding triggered in Steam Generator 3A", "status": "action"},
                    {"time": "15:05:00", "event": "Steam temperature stabilized back to 505°C; pressure at 152 bar", "status": "normal"}
                ],
                evidence=[
                    {"id": "EV-1", "name": "FC-301 Valve Actuator Feedback Log", "source": "SCADA Historian", "value": "42% commanded, 12% actual", "status": "confirmed"},
                    {"id": "EV-2", "name": "Boiler Tube Metal Temp Sensors", "source": "DCS Telemetry", "value": "Peak 542°C", "status": "confirmed"}
                ],
                recommendations=[
                    {"type": "immediate", "action": "Inspect and recalibrate electro-pneumatic actuator on valve FC-301.", "assignee": "M. Vance (Instrument Tech)"},
                    {"type": "long-term", "action": "Update DCS interlock rules to automatically trigger Boiler bypass cooling loops.", "assignee": "Sarah Chen"}
                ]
            )
            db.add(inc)
            db.commit()

        # 5. Regulatory Rules Seeding
        if db.query(ComplianceRule).count() == 0:
            logger.info("Seeding regulatory rules standards...")
            rules = [
                ComplianceRule(id="COMP-01", code="OSHA 1910.119", description="Process Safety Management of Highly Hazardous Chemicals", standard_ref="OSHA PSM", risk_impact="critical", affected_equipment_type="Boiler"),
                ComplianceRule(id="COMP-02", code="API 521", description="Pressure-relieving and Depressuring Systems verification", standard_ref="API", risk_impact="high", affected_equipment_type="Column")
            ]
            db.bulk_save_objects(rules)
            db.commit()

        # 6. Audit Results Seeding
        if db.query(ComplianceResult).count() == 0:
            logger.info("Seeding compliance audit traces...")
            results = [
                ComplianceResult(rule_id="COMP-01", status="compliant", auditor_id="OSHA Lead Auditor", findings="Boiler maintenance logs and safety interlock valves meet compliance standards"),
                ComplianceResult(rule_id="COMP-02", status="non-compliant", auditor_id="OSHA Lead Auditor", findings="Column C-102 does not have active double isolation bypass SOP")
            ]
            db.bulk_save_objects(results)
            db.commit()

        # 7. Maintenance Records Seeding
        if db.query(MaintenanceRecord).count() == 0:
            logger.info("Seeding maintenance records logs...")
            from datetime import datetime, timezone
            maint = [
                MaintenanceRecord(
                    id=1,
                    equipment_id="EQ-B3",
                    engineer_id="ENG-CHEN",
                    task_description="Replaced safety valves and recalibrated temperature sensors on superheater bypass loops.",
                    date=datetime.now(timezone.utc),
                    status="completed"
                )
            ]
            db.bulk_save_objects(maint)
            db.commit()

        logger.info("Database seeding completed successfully.")
    except Exception as err:
        logger.error(f"Seeding error encountered: {err}")
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Run database initialization and seeding on startup
    seed_database()
    yield
    # Shutdown actions go here

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="PlantMind Industrial AI Operating System Backend API. Includes OCR, RAG, and topology graph queries.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware configurations
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Exception Catch-all middleware
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception caught on endpoint '{request.url}': {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"}
    )

# Routing Mounts
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(documents.router, prefix=settings.API_V1_STR, tags=["Documents"])
app.include_router(uploads.router, prefix=settings.API_V1_STR, tags=["Uploads"])
app.include_router(dashboard.router, prefix=settings.API_V1_STR, tags=["Dashboard"])
app.include_router(copilot.router, prefix=f"{settings.API_V1_STR}/copilot", tags=["Copilot"])
app.include_router(graph.router, prefix=f"{settings.API_V1_STR}/graph", tags=["Knowledge Graph"])
app.include_router(incidents.router, prefix=f"{settings.API_V1_STR}/incidents", tags=["Incidents"])
app.include_router(cv.router, prefix="/cv", tags=["Computer Vision"])

@app.get("/")
def read_root():
    return {"status": "online", "platform": "PlantMind AI OS", "api_version": "v1"}
