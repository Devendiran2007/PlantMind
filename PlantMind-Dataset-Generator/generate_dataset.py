import os
import json
import time
from pathlib import Path
from generators.scenario_manager import ScenarioManager
from generators.register_generator import RegisterGenerator
from generators.image_generator import EquipmentImageGenerator
from generators.document_generators import (
    OEMManualGenerator,
    MaintenanceReportGenerator,
    IncidentReportGenerator,
    InspectionReportGenerator,
    SOPDocumentGenerator,
    WorkOrderGenerator,
    AuditReportGenerator,
    ComplianceReportGenerator,
    ShiftLogGenerator,
    DailyOperatorLogGenerator,
    LubricationReportGenerator,
    VibrationReportGenerator,
    RiskAssessmentGenerator,
    TrainingRecordGenerator,
    CalibrationReportGenerator,
    EmailGenerator
)

def create_output_directories(output_dir):
    categories = [
        "Equipment", "OEM_Manuals", "Maintenance", "Incidents", "Inspection",
        "SOP", "WorkOrders", "Audit", "Compliance", "Training", "ShiftLogs",
        "Emails", "SpareParts", "Calibration", "RiskAssessment", "Images",
        "PDF", "DOCX"
    ]
    for cat in categories:
        (output_dir / cat).mkdir(parents=True, exist_ok=True)
        # Also create a .gitkeep to ensure directories are tracked
        with open(output_dir / cat / ".gitkeep", "w") as f:
            f.write("# Keep directory")

def main():
    print("====================================================")
    print("      PLANTMIND INDUSTRIAL DATASET GENERATOR        ")
    print("====================================================")
    
    start_time = time.time()
    
    # Path configuration
    base_dir = Path(__file__).resolve().parent
    config_path = base_dir / "templates" / "config.json"
    templates_path = base_dir / "templates" / "document_templates.json"
    output_dir = base_dir / "output"
    
    # Ensure directories exist
    output_dir.mkdir(parents=True, exist_ok=True)
    create_output_directories(output_dir)
    
    # Initialize Scenario Manager
    print("[1/5] Initializing Scenario Manager and generating metadata...")
    manager = ScenarioManager(config_path, templates_path)
    
    # Generate all assets, employees and documents metadata
    dataset = manager.generate_all_documents()
    assets = dataset["assets"]
    employees = dataset["employees"]
    documents = dataset["documents"]
    
    print(f" -> Generated {len(assets)} unique physical assets.")
    print(f" -> Generated {len(employees)} employees with supervisors and departments.")
    print(f" -> Prepared {len(documents)} linked document records.")
    
    # Initialize generators
    print("[2/5] Initializing document renderers...")
    register_gen = RegisterGenerator(output_dir)
    image_gen = EquipmentImageGenerator(output_dir)
    
    generators_map = {
        "OEM_Manual": OEMManualGenerator(output_dir),
        "Maintenance": MaintenanceReportGenerator(output_dir),
        "Incident": IncidentReportGenerator(output_dir),
        "Inspection": InspectionReportGenerator(output_dir),
        "SOP": SOPDocumentGenerator(output_dir),
        "WorkOrder": WorkOrderGenerator(output_dir),
        "Audit": AuditReportGenerator(output_dir),
        "Compliance": ComplianceReportGenerator(output_dir),
        "ShiftHandoverLog": ShiftLogGenerator(output_dir),
        "DailyOperatorLog": DailyOperatorLogGenerator(output_dir),
        "Lubrication": LubricationReportGenerator(output_dir),
        "Vibration": VibrationReportGenerator(output_dir),
        "RiskAssessment": RiskAssessmentGenerator(output_dir),
        "Training": TrainingRecordGenerator(output_dir),
        "Calibration": CalibrationReportGenerator(output_dir),
        "Email": EmailGenerator(output_dir)
    }
    
    # Generate Registers
    print("[3/5] Generating registers and inventories (PDF and DOCX)...")
    register_gen.generate_all_registers(assets, employees)
    print(" -> Generated Asset Register, Equipment Register, Employee Directory, and Spare Parts Inventory.")
    
    # Generate Pillow Images
    print("[4/5] Generating equipment schematic images for OCR testing...")
    image_gen.generate_all_images(assets)
    print(f" -> Generated {len(assets)} equipment PNG schematics inside output/Images/.")
    
    # Generate Documents
    print("[5/5] Rendering all narrative industrial documents (PDF and DOCX)...")
    success_count = 0
    failure_count = 0
    
    # Print a progress indicator
    total_docs = len(documents)
    for idx, doc in enumerate(documents):
        doc_type = doc["type"]
        if doc_type in generators_map:
            try:
                generators_map[doc_type].generate(doc)
                success_count += 1
                if success_count % 30 == 0:
                    print(f"    Rerendered {success_count}/{total_docs} documents...")
            except Exception as e:
                print(f"    [Error] Failed to render {doc['doc_id']} ({doc_type}): {e}")
                failure_count += 1
        else:
            print(f"    [Warning] No generator found for type: {doc_type}")
            
    end_time = time.time()
    elapsed = end_time - start_time
    
    print("\n====================================================")
    print("                GENERATION COMPLETE                 ")
    print("====================================================")
    print(f"Time Elapsed: {elapsed:.2f} seconds")
    print(f"Successfully generated: {success_count} documents (each in PDF and DOCX)")
    print(f"Failed documents: {failure_count}")
    print(f"Output files saved inside: {output_dir.resolve()}")
    print("====================================================")

if __name__ == "__main__":
    main()
