import os
import json
import shutil
from pathlib import Path
from datetime import datetime, timezone

# Add parent path to import app modules
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.database.session import SessionLocal, engine
from app.models.base import Base
from app.models.document import Document, DocumentChunk
from app.models.industrial import Equipment, Engineer, Incident, MaintenanceRecord, ComplianceRule, ComplianceResult
from app.services.rag_service import RecursiveCharacterTextSplitter, LC_Doc
from app.services.document_intelligence import DocumentIntelligenceEngine

def main():
    print("====================================================")
    print("     PLANTMIND DATABASE INTEGRATION PIPELINE        ")
    print("====================================================")
    
    backend_dir = Path(__file__).resolve().parent
    generator_dir = backend_dir.parent / "PlantMind-Dataset-Generator"
    graph_path = generator_dir / "output" / "metadata_graph.json"
    
    if not graph_path.exists():
        print(f"[Error] metadata_graph.json not found at {graph_path}.")
        print("Please run 'python generate_dataset.py' inside 'PlantMind-Dataset-Generator' first.")
        return
        
    print(f"Reading dataset metadata graph from: {graph_path}...")
    with open(graph_path, "r") as f:
        graph = json.load(f)
        
    assets = graph["assets"]
    employees = graph["employees"]
    documents = graph["documents"]
    
    # Filter dataset for clean prototype visualization
    ALLOWED_ASSETS = ["P-101", "B-401", "HX-301"]
    
    # Filter assets
    assets = [a for a in assets if a["tag"] in ALLOWED_ASSETS]
    
    # Filter documents to at most 4 per allowed asset tag (1 OEM, 1 SOP, 1 Incident, 1 Maintenance)
    filtered_docs = []
    doc_types_per_asset = {}
    for doc in documents:
        tag = doc.get("equipment_tag")
        if tag not in ALLOWED_ASSETS:
            continue
            
        doc_type = doc.get("type")
        simplified_type = None
        if doc_type in ("OEM_Manual", "Equipment"):
            simplified_type = "OEM"
        elif doc_type == "SOP":
            simplified_type = "SOP"
        elif doc_type == "Incident":
            simplified_type = "Incident"
        elif doc_type in ("Maintenance", "Lubrication", "WorkOrder"):
            simplified_type = "Maintenance"
            
        if not simplified_type:
            continue
            
        if tag not in doc_types_per_asset:
            doc_types_per_asset[tag] = {}
            
        if simplified_type not in doc_types_per_asset[tag]:
            filtered_docs.append(doc)
            doc_types_per_asset[tag][simplified_type] = True
            
    documents = filtered_docs
    
    # Filter employees mentioned in selected documents to avoid dangling engineers
    allowed_emp_ids = set()
    for doc in documents:
        if doc.get("prepared_by_id"):
            allowed_emp_ids.add(doc["prepared_by_id"])
        if doc.get("reviewed_by_id"):
            allowed_emp_ids.add(doc["reviewed_by_id"])
        if doc.get("approved_by_id"):
            allowed_emp_ids.add(doc["approved_by_id"])
            
    employees = [emp for emp in employees if emp["emp_id"] in allowed_emp_ids]
    if len(employees) < 3:
        # Fallback to keep at least 3 engineers if empty
        employees = graph["employees"][:3]
    
    print(f"Filtered prototype dataset: {len(assets)} assets, {len(employees)} employees, and {len(documents)} documents.")
    
    # Initialize database schemas if they don't exist yet
    print("\nInitializing database schemas...")
    Base.metadata.create_all(bind=engine)
    
    # Establish DB session
    db = SessionLocal()
    
    try:
        # 1. Clear existing database tables to avoid conflicts
        print("\n[1/5] Clearing existing database tables...")
        db.query(DocumentChunk).delete()
        db.query(Document).delete()
        db.query(MaintenanceRecord).delete()
        db.query(Incident).delete()
        db.query(Engineer).delete()
        db.query(Equipment).delete()
        db.commit()
        print(" -> Existing tables cleared.")
        
        # 2. Ingest Equipment (Assets)
        print("\n[2/5] Ingesting physical assets into database...")
        db_assets = []
        for a in assets:
            # Map tag to location
            cls = a["class"]
            if cls == "P":
                loc = "Cooling Tower Pump House"
            elif cls == "HX":
                loc = "Heat Exchanger Yard"
            elif cls == "V":
                loc = "Control Valve Gallery"
            elif cls == "M":
                loc = "Motor Control Center (MCC)"
            elif cls == "B":
                loc = "Boiler Utilities House"
            elif cls == "TK":
                loc = "Acid & Chemical Storage Yard"
            else:
                loc = "Central Utility Bay"
                
            db_assets.append(Equipment(
                id=a["tag"],
                name=a["name"],
                type=a["class"],
                location=loc,
                health=50 if a["criticality"] == "Critical" else 85,
                status="critical" if a["criticality"] == "Critical" else "healthy",
                temperature=542.0 if cls == "B" else 78.0 if cls == "M" else 35.0,
                pressure=168.0 if cls == "B" else 4.2 if cls == "P" else 0.0,
                vibration=6.2 if cls == "M" else 1.8 if cls == "P" else 0.0,
                flow_rate=450.0 if cls == "P" else None,
                oee=82.4 if cls == "B" else 94.8,
                mtbf=2400.0 if cls == "B" else 4800.0,
                mttr=14.5 if cls == "B" else 8.2
            ))
        db.bulk_save_objects(db_assets)
        db.commit()
        print(f" -> Commissioned {len(db_assets)} assets in the 'equipment' table.")
        
        # 3. Ingest Engineers (Employees)
        print("\n[3/5] Ingesting engineers directory...")
        db_engineers = []
        for emp in employees:
            exp_years = 5
            try:
                exp_years = int(emp["experience"].split()[0])
            except:
                pass
                
            db_engineers.append(Engineer(
                id=emp["emp_id"],
                name=emp["name"],
                title=emp["designation"],
                certifications=f"{emp['department']} Safety Certified, LOTOTO Standard",
                experience_years=exp_years
            ))
        db.bulk_save_objects(db_engineers)
        db.commit()
        print(f" -> Enrolled {len(db_engineers)} technicians/engineers in 'engineers' table.")
        
        # 4. Copy PDF Files & Ingest Documents & Chunks
        print("\n[4/5] Copying generated PDF files & indexing documents/chunks...")
        uploads_dir = backend_dir / "uploads"
        uploads_dir.mkdir(parents=True, exist_ok=True)
        
        doc_count = 0
        chunk_count = 0
        
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        
        for doc in documents:
            doc_id = doc["doc_id"]
            category = doc["type"]
            
            # Map type to subfolder names
            # Map: OEM_Manual -> OEM_Manuals, ShiftHandoverLog -> ShiftLogs, etc.
            folder_map = {
                "OEM_Manual": "OEM_Manuals",
                "Maintenance": "Maintenance",
                "Incident": "Incidents",
                "Inspection": "Inspection",
                "SOP": "SOP",
                "WorkOrder": "WorkOrders",
                "Audit": "Audit",
                "Compliance": "Compliance",
                "ShiftHandoverLog": "ShiftLogs",
                "DailyOperatorLog": "ShiftLogs",
                "Lubrication": "Maintenance",
                "Vibration": "Inspection",
                "RiskAssessment": "RiskAssessment",
                "Training": "Training",
                "Calibration": "Calibration",
                "Email": "Emails",
                "Equipment": "Equipment",
                "SpareParts": "SpareParts"
            }
            subfolder = folder_map.get(category, category)
            
            # Locate physical PDF
            pdf_src = generator_dir / "output" / "PDF" / subfolder / f"{doc_id}.pdf"
            if not pdf_src.exists():
                # Check directly in Top level Category folder (for registers like REG-AST-001)
                pdf_src = generator_dir / "output" / subfolder / f"{doc_id}.pdf"
                if not pdf_src.exists():
                    # Fallback to output/SpareParts/ etc.
                    pdf_src = generator_dir / "output" / "PDF" / "SpareParts" / f"{doc_id}.pdf"
                    if not pdf_src.exists():
                        print(f"  [Warning] Physical PDF not found for {doc_id} at {pdf_src}")
                        continue
            
            # Copy file to uploads/
            # Unique filename in uploads/ folder
            unique_filename = f"{doc_id}_{doc_id}.pdf"
            pdf_dest = uploads_dir / unique_filename
            shutil.copy2(pdf_src, pdf_dest)
            
            # Create Document Text for Chunks
            doc_text = f"""Company: SteelForge Industries Pvt Ltd
Location: Hosur, Tamil Nadu
Document ID: {doc_id}
Title: {doc['title']}
Date: {doc['date']}
Equipment Tag: {doc['equipment_tag']}
Equipment Name: {doc['equipment_name']}
Prepared By: {doc['prepared_by']} (Emp ID: {doc['prepared_by_id']})
Reviewed By: {doc['reviewed_by']} (Emp ID: {doc['reviewed_by_id']})
Approved By: {doc['approved_by']} (Emp ID: {doc['approved_by_id']})
Revision: {doc['revision']}
Risk Level: {doc['risk_level']}

1. Technical Observations & Description
{doc['observations']}

2. Engineering Notes & Work Instructions
{doc['engineering_notes']}

3. Analytical Parameters Table
{str(doc.get('tables', ''))}

4. Corrective Actions & Recommendations
{doc['recommendations']}
"""
            # Split to chunks
            chunks = text_splitter.split_text(doc_text)
            
            # Create DB Document
            db_doc = Document(
                id=doc_id,
                filename=f"{doc_id}.pdf",
                type="pdf",
                size=pdf_dest.stat().st_size,
                uploaded_by=doc["prepared_by_id"],
                upload_date=datetime.strptime(doc["date"], "%Y-%m-%d"),
                ocr_status="completed",
                embedding_status="completed",
                graph_status="completed",
                file_path=str(pdf_dest.relative_to(backend_dir)),
                entities={
                    **DocumentIntelligenceEngine._extract_entities(doc_text),
                    "equipment_tag": doc["equipment_tag"],
                    "prepared_by": doc["prepared_by"],
                    "risk_level": doc["risk_level"],
                    "references": doc.get("references", [])
                }
            )
            db.add(db_doc)
            db.commit()
            doc_count += 1
            
            # Save Chunks
            for idx, c_text in enumerate(chunks):
                db_chunk = DocumentChunk(
                    document_id=doc_id,
                    content=c_text,
                    page_num=(idx // 3) + 1,
                    chunk_index=idx
                )
                db.add(db_chunk)
                chunk_count += 1
            db.commit()
            
        print(f" -> Indexed {doc_count} documents and created {chunk_count} text chunks in DB.")
        
        # 5. Populate Incidents and Maintenance logs
        print("\n[5/5] Mapping incidents and maintenance logs to DB dashboards...")
        incidents_seeded = 0
        maintenance_seeded = 0
        
        for doc in documents:
            doc_id = doc["doc_id"]
            if doc["type"] == "Incident":
                timeline = [
                    {"time": "08:15", "event": "Operator registered abnormal readings", "status": "warning"},
                    {"time": "10:30", "event": "Technical inspection scheduled", "status": "warning"},
                    {"time": "14:15", "event": doc["observations"][:100] + "...", "status": "anomaly"}
                ]
                
                db_inc = Incident(
                    id=doc_id,
                    title=doc["title"],
                    equipment_id=doc["equipment_tag"],
                    date=doc["date"],
                    duration="4 hours",
                    severity=doc["risk_level"].lower(),
                    status="resolved",
                    risk_score=85 if doc["risk_level"] == "Critical" else 65,
                    timeline=timeline,
                    evidence=[{"id": "EV-1", "name": "Technical Inspection Report", "source": "Inspector", "value": doc["observations"][:80], "status": "confirmed"}],
                    recommendations=[{"type": "immediate", "action": doc["recommendations"][:120], "assignee": doc["prepared_by"]}]
                )
                db.add(db_inc)
                incidents_seeded += 1
                
            elif doc["type"] == "Maintenance":
                db_maint = MaintenanceRecord(
                    id=int(doc_id.split("-")[-1]) if doc_id.split("-")[-1].isdigit() else None,
                    equipment_id=doc["equipment_tag"],
                    engineer_id=doc["prepared_by_id"],
                    date=datetime.strptime(doc["date"], "%Y-%m-%d"),
                    task_description=doc["observations"],
                    status="completed"
                )
                db.add(db_maint)
                maintenance_seeded += 1
                
        db.commit()
        print(f" -> Populated {incidents_seeded} incidents and {maintenance_seeded} maintenance records.")
        
        print("\n====================================================")
        print("          INTEGRATION PIPELINE COMPLETED            ")
        print("====================================================")
        print("All simulated files and database records are synced.")
        print("Restart your FastAPI server if needed to refresh memory caches.")
        print("====================================================")
        
    except Exception as e:
        print(f"[Error] Integration failed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()
