from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, JSON, Text
from datetime import datetime, timezone
from app.models.base import Base

class Equipment(Base):
    __tablename__ = "equipment"
    
    id = Column(String, primary_key=True, index=True) # e.g. EQ-B3
    name = Column(String, nullable=False)
    type = Column(String, nullable=False) # e.g. Boiler, Turbine
    location = Column(String, nullable=False)
    health = Column(Integer, default=100, nullable=False) # 0-100
    status = Column(String, default="healthy", nullable=False) # healthy, warning, critical
    
    # Telemetry metrics
    temperature = Column(Float, nullable=False)
    pressure = Column(Float, nullable=False)
    vibration = Column(Float, nullable=False)
    flow_rate = Column(Float, nullable=True)
    
    # Performance metrics
    oee = Column(Float, default=100.0, nullable=False)
    mtbf = Column(Float, default=4000.0, nullable=False) # hours
    mttr = Column(Float, default=12.0, nullable=False) # hours

class Engineer(Base):
    __tablename__ = "engineers"
    
    id = Column(String, primary_key=True, index=True) # e.g. ENG-CHEN
    name = Column(String, nullable=False)
    title = Column(String, nullable=False) # e.g. Senior Reliability Engineer
    certifications = Column(String, nullable=True) # comma separated
    experience_years = Column(Integer, default=5, nullable=False)

class Incident(Base):
    __tablename__ = "incidents"
    
    id = Column(String, primary_key=True, index=True) # e.g. INC-2026-089
    title = Column(String, nullable=False)
    equipment_id = Column(String, ForeignKey("equipment.id", ondelete="SET NULL"), nullable=True)
    date = Column(String, nullable=False) # e.g. 2026-07-12
    duration = Column(String, nullable=False) # e.g. 45 mins
    severity = Column(String, default="medium", nullable=False) # low, medium, high, critical
    status = Column(String, default="open", nullable=False) # open, investigating, resolved
    risk_score = Column(Integer, default=50, nullable=False)
    
    # Serialized structures
    timeline = Column(JSON, nullable=False) # List of event dicts
    evidence = Column(JSON, nullable=False) # List of evidence dicts
    recommendations = Column(JSON, nullable=False) # List of recommendation dicts

class MaintenanceRecord(Base):
    __tablename__ = "maintenance_records"
    
    id = Column(Integer, primary_key=True, index=True)
    equipment_id = Column(String, ForeignKey("equipment.id", ondelete="CASCADE"), nullable=False)
    engineer_id = Column(String, ForeignKey("engineers.id", ondelete="SET NULL"), nullable=True)
    date = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    task_description = Column(Text, nullable=False)
    status = Column(String, default="scheduled", nullable=False) # scheduled, progress, completed

class ComplianceRule(Base):
    __tablename__ = "compliance_rules"
    
    id = Column(String, primary_key=True, index=True) # e.g. COMP-OSHA-01
    code = Column(String, nullable=False) # e.g. OSHA 1910.119
    description = Column(Text, nullable=False)
    standard_ref = Column(String, nullable=False) # e.g. API 521, OSHA
    risk_impact = Column(String, default="medium", nullable=False) # low, medium, high, critical
    affected_equipment_type = Column(String, nullable=False) # e.g. Boiler, Column, Turbine

class ComplianceResult(Base):
    __tablename__ = "compliance_results"
    
    id = Column(Integer, primary_key=True, index=True)
    rule_id = Column(String, ForeignKey("compliance_rules.id", ondelete="CASCADE"), nullable=False)
    status = Column(String, default="compliant", nullable=False) # compliant, warning, non-compliant
    audit_date = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    auditor_id = Column(String, nullable=False)
    findings = Column(Text, nullable=True)
