from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional, Any

class EquipmentResponse(BaseModel):
    id: str
    name: str
    type: str
    location: str
    health: int
    status: str
    temperature: float
    pressure: float
    vibration: float
    flow_rate: Optional[float] = None
    oee: float
    mtbf: float
    mttr: float

    class Config:
        from_attributes = True

class EngineerResponse(BaseModel):
    id: str
    name: str
    title: str
    certifications: Optional[str] = None
    experience_years: int

    class Config:
        from_attributes = True

class IncidentResponse(BaseModel):
    id: str
    title: str
    equipment_id: Optional[str] = None
    date: str
    duration: str
    severity: str
    status: str
    risk_score: int
    timeline: List[Any]
    evidence: List[Any]
    recommendations: List[Any]

    class Config:
        from_attributes = True

class MaintenanceResponse(BaseModel):
    id: int
    equipment_id: str
    engineer_id: Optional[str] = None
    date: datetime
    task_description: str
    status: str

    class Config:
        from_attributes = True

class ComplianceRuleResponse(BaseModel):
    id: str
    code: str
    description: str
    standard_ref: str
    risk_impact: str
    affected_equipment_type: str

    class Config:
        from_attributes = True

class ComplianceResultResponse(BaseModel):
    id: int
    rule_id: str
    status: str
    audit_date: datetime
    auditor_id: str
    findings: Optional[str] = None

    class Config:
        from_attributes = True
