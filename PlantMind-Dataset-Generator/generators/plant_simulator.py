import json
import random
from datetime import datetime, timedelta
from pathlib import Path
from faker import Faker

class Asset:
    def __init__(self, tag, name, asset_class, specs, criticality):
        self.tag = tag
        self.name = name
        self.asset_class = asset_class
        self.specs = specs
        self.criticality = criticality
        self.running_hours = 0.0
        self.wear_level = 0.0          # 0.0 to 1.0 (1.0 is failure)
        self.calibration_drift = 0.0  # 0.0 to 1.0
        self.fouling_index = 0.0      # 0.0 to 1.0
        self.leak_rate = 0.0          # L/min
        self.status = "NORMAL"         # NORMAL, DEGRADING, DELAYED, FAILED
        self.last_maintenance_date = None
        self.last_inspection_date = None

class PlantSimulator:
    def __init__(self, config_path, templates_path):
        self.fake = Faker("en_IN")
        Faker.seed(42)
        random.seed(42)
        
        with open(config_path, "r") as f:
            self.config = json.load(f)
            
        with open(templates_path, "r") as f:
            self.templates = json.load(f)
            
        self.start_date = datetime.strptime(self.config["date_range"]["start"], "%Y-%m-%d")
        self.end_date = datetime.strptime(self.config["date_range"]["end"], "%Y-%m-%d")
        
        self.assets = []
        self.employees = []
        self.documents = []
        
        self.generate_assets()
        self.generate_employees()
        
        # Central counters for IDs
        self.counters = {
            "OEM": 100, "SOP": 200, "INS": 300, "WO": 1000, "MNT": 500,
            "INC": 100, "AUD": 400, "CMP": 700, "SHF": 100, "OPR": 100,
            "LUB": 900, "VIB": 800, "RSK": 1200, "TRN": 100, "CAL": 1300,
            "EML": 100
        }
        
    def generate_assets(self):
        base_assets = [
            {"tag": "P-101", "name": "Cooling Water Pump A", "class": "P"},
            {"tag": "P-198", "name": "Cooling Water Pump B", "class": "P"},
            {"tag": "HX-301", "name": "Shell & Tube Heat Exchanger", "class": "HX"},
            {"tag": "HX-302", "name": "Shell & Tube Heat Exchanger B", "class": "HX"},
            {"tag": "V-203", "name": "Isolation Valve", "class": "V"},
            {"tag": "V-204", "name": "Control Valve", "class": "V"},
            {"tag": "M-501", "name": "Drive Motor A", "class": "M"},
            {"tag": "M-502", "name": "Drive Motor B", "class": "M"},
            {"tag": "B-401", "name": "Steam Boiler A", "class": "B"},
            {"tag": "TK-601", "name": "Chemical Storage Tank A", "class": "TK"},
            {"tag": "C-701", "name": "Air Compressor A", "class": "C"}
        ]
        
        for ba in base_assets:
            cls_info = self.templates["asset_classes"][ba["class"]]
            self.assets.append(Asset(
                ba["tag"], ba["name"], ba["class"],
                cls_info["specs"], cls_info["criticality"]
            ))
            
        extra_tags = [
            ("P-102", "Cooling Water Pump C", "P"),
            ("P-103", "Boiler Feed Water Pump A", "P"),
            ("P-104", "Boiler Feed Water Pump B", "P"),
            ("HX-303", "Condenser Heat Exchanger", "HX"),
            ("HX-304", "Reboiler Heat Exchanger", "HX"),
            ("V-205", "Pressure Regulating Valve", "V"),
            ("V-206", "Safety Relief Valve", "V"),
            ("M-503", "Boiler Fan Drive Motor", "M"),
            ("M-504", "Exhaust Blower Motor", "M"),
            ("B-402", "Auxiliary Boiler B", "B"),
            ("TK-602", "Acid Neutralization Tank", "TK"),
            ("TK-603", "Process Water Storage Tank", "TK"),
            ("C-702", "Instrument Air Compressor B", "C"),
            ("C-703", "Centrifugal Air Blower", "C"),
            ("T-801", "Steam Turbine", "HX"),
            ("G-851", "Electrical Generator", "M"),
            ("TX-901", "Step-up Transformer", "M"),
            ("TX-902", "Auxiliary Transformer", "M"),
            ("F-351", "Reheat Furnace", "B")
        ]
        
        for tag, name, cls in extra_tags:
            cls_info = self.templates["asset_classes"][cls]
            self.assets.append(Asset(
                tag, name, cls,
                cls_info["specs"], cls_info["criticality"]
            ))
            
    def generate_employees(self):
        director = {
            "emp_id": "EMP-DIR-01", "name": "Karthik Ramaswamy", "department": "OPS",
            "designation": "Plant Director", "experience": "24 Years", "supervisor": "None",
            "phone": "+91 94432 10101", "email": "karthik.ramaswamy@steelforge.in"
        }
        self.employees.append(director)
        
        dept_heads = {}
        for dept in self.templates["departments"]:
            head_id = f"EMP-{dept}-HDR"
            head_name = self.fake.name()
            email = f"{head_name.lower().replace(' ', '.')}@steelforge.in"
            head = {
                "emp_id": head_id, "name": head_name, "department": dept,
                "designation": f"Head of {self.templates['departments'][dept].split(' ')[0]}",
                "experience": f"{random.randint(12, 20)} Years", "supervisor": "Karthik Ramaswamy",
                "phone": f"+91 {random.randint(60000, 99999)} {random.randint(10000, 99999)}",
                "email": email
            }
            self.employees.append(head)
            dept_heads[dept] = head_name
            
        designations = {
            "MECH": ["Senior Mechanical Engineer", "Mechanical Inspector", "Maintenance Technician", "Senior Fitter"],
            "ELEC": ["Senior Electrical Engineer", "Electrical Technician", "Substation Supervisor"],
            "INC": ["Instrumentation Engineer", "Calibration Specialist", "C&I Technician"],
            "OPS": ["Shift In-Charge", "Control Room Operator", "Boiler Operator", "Field Operator"],
            "HSE": ["Safety Officer", "Environment Engineer", "Industrial Hygienist"],
            "QAQC": ["Lead Auditor", "QC Inspector", "Metallurgist"],
            "UTIL": ["Utilities Engineer", "Compressor Operator"],
            "PROC": ["Procurement Executive", "Warehouse In-Charge", "Inventory Planner"]
        }
        
        emp_counter = 100
        while len(self.employees) < self.config["employee_count"]:
            dept = random.choice(list(self.templates["departments"].keys()))
            desg = random.choice(designations[dept])
            emp_id = f"EMP-{dept}-{emp_counter}"
            emp_counter += 1
            name = self.fake.name()
            email = f"{name.lower().replace(' ', '.')}@steelforge.in"
            self.employees.append({
                "emp_id": emp_id, "name": name, "department": dept, "designation": desg,
                "experience": f"{random.randint(2, 10)} Years", "supervisor": dept_heads[dept],
                "phone": f"+91 {random.randint(60000, 99999)} {random.randint(10000, 99999)}",
                "email": email
            })

    def get_employees_by_dept(self, dept):
        return [e for e in self.employees if e["department"] == dept]
        
    def get_next_id(self, prefix):
        self.counters[prefix] += 1
        return f"{prefix}-{self.counters[prefix]}"
        
    def generate_all_documents(self):
        # 1. Generate Static OEM Manuals and SOPs early in 2022
        self.generate_oem_manuals()
        self.generate_sops()
        
        # 2. Run simulation loop to generate interconnected chains of documents
        self.run_simulation()
        
        # Sort by date
        self.documents.sort(key=lambda x: x["date"])
        return {
            "assets": [{
                "tag": a.tag,
                "name": a.name,
                "class": a.asset_class,
                "specs": a.specs,
                "criticality": a.criticality
            } for a in self.assets],
            "employees": self.employees,
            "documents": self.documents
        }

        
    def generate_oem_manuals(self):
        for idx, asset in enumerate(self.assets[:15]):
            oem_id = self.get_next_id("OEM")
            prep = random.choice(self.get_employees_by_dept("PROC"))
            rev = random.choice(self.get_employees_by_dept("MECH" if asset.asset_class in ["P", "HX", "V"] else "ELEC"))
            appr = random.choice(self.get_employees_by_dept("OPS"))
            
            self.documents.append({
                "doc_id": oem_id,
                "type": "OEM_Manual",
                "title": f"OEM Operation & Technical Specifications Manual - {asset.name}",
                "date": self.start_date + timedelta(days=idx),
                "equipment_tag": asset.tag,
                "equipment_name": asset.name,
                "department": "PROC",
                "prepared_by": prep["name"],
                "prepared_by_id": prep["emp_id"],
                "reviewed_by": rev["name"],
                "reviewed_by_id": rev["emp_id"],
                "approved_by": appr["name"],
                "approved_by_id": appr["emp_id"],
                "revision": "R0",
                "risk_level": "Low",
                "observations": f"Original manufacturer specification sheet for {asset.name} (Tag: {asset.tag}). Contains nominal thresholds, calibration constraints, and recommended greasing cycles.",
                "engineering_notes": f"Operational Specs:\n- Critical Rating: {asset.specs}\n- Recommended lube: Lithium Soap EP2\n- Vibration Threshold (Alert): 4.5 mm/s RMS, (Action): 7.1 mm/s RMS.",
                "tables": [
                    ["Specification", "Minimum Value", "Nominal Value", "Maximum Limit"],
                    ["Vibration Profile", "0.0 mm/s", "1.8 mm/s", "4.5 mm/s"],
                    ["Bearing Temp", "15 C", "45 C", "80 C"],
                    ["Static Pressure", "0.0 bar", "4.2 bar", "10.0 bar"]
                ],
                "recommendations": "1. Verify instrument calibration indices every 6 months.\n2. Apply grease to bearings every 2000 running hours.",
                "references": []
            })
            
    def generate_sops(self):
        for idx, asset in enumerate(self.assets[:15]):
            sop_id = self.get_next_id("SOP")
            prep = random.choice(self.get_employees_by_dept("OPS"))
            rev = random.choice(self.get_employees_by_dept("HSE"))
            appr = random.choice(self.get_employees_by_dept("OPS"))
            
            # Find matching OEM manual
            oem_ref = next((d for d in self.documents if d["type"] == "OEM_Manual" and d["equipment_tag"] == asset.tag), None)
            refs = [{"doc_id": oem_ref["doc_id"], "relationship": "derived_from"}] if oem_ref else []
            
            self.documents.append({
                "doc_id": sop_id,
                "type": "SOP",
                "title": f"Standard Operating Procedure (SOP) for {asset.name} Operations",
                "date": self.start_date + timedelta(days=20 + idx),
                "equipment_tag": asset.tag,
                "equipment_name": asset.name,
                "department": "OPS",
                "prepared_by": prep["name"],
                "prepared_by_id": prep["emp_id"],
                "reviewed_by": rev["name"],
                "reviewed_by_id": rev["emp_id"],
                "approved_by": appr["name"],
                "approved_by_id": appr["emp_id"],
                "revision": "R1",
                "risk_level": "Medium",
                "observations": f"Standard isolation, startup, and shutdown procedure for {asset.name}. This SOP must be verified by field supervisors prior to releasing equipment.",
                "engineering_notes": "Operations Guide:\n1. Check lube level indicator.\n2. Confirm LOTO key is removed from terminal switch.\n3. Turn valve actuator to OPEN.\n4. Trigger start button. Check for abnormal vibration or thermal warning.",
                "tables": [
                    ["Check Point", "Description", "Acceptable Status", "Action on Deviation"],
                    ["Lube Level", "Visual check sight glass", "Middle index", "Top-up with EP2"],
                    ["Lock State", "LOTO padlock inspection", "Unlocked & Cleared", "Raise flag to supervisor"],
                    ["Vibration Level", "RMS local dial check", "< 4.5 mm/s", "Stop motor immediately"]
                ],
                "recommendations": "1. Operators must undergo LOTOTO certification training.\n2. Wear class-2 double ear protection during high-frequency cycles.",
                "references": refs
            })

    def run_simulation(self):
        # We step week-by-week from Jan 2022 to Dec 2026 (approx 260 weeks)
        current_date = self.start_date + timedelta(days=60) # Start simulation after manuals/SOPs
        
        week_count = 0
        total_required_docs = 250
        
        while current_date < self.end_date and len(self.documents) < total_required_docs:
            week_count += 1
            current_date += timedelta(days=7)
            
            # Every week, run a routine logging check (creates Operator Log or Shift Handover Log)
            log_doc = self.simulate_weekly_log(current_date)
            self.documents.append(log_doc)
            
            # Simulate asset degradation
            for asset in self.assets:
                # Add running hours
                hours = random.uniform(80.0, 140.0)
                asset.running_hours += hours
                
                # Check for scheduled PM (every 5000 running hours)
                if asset.running_hours > 5000.0:
                    asset.running_hours = 0.0
                    self.trigger_pm_chain(asset, current_date, log_doc)
                    continue
                
                # Check for specialized degradation
                # We have 6 recurring failures. Let's trigger them systematically.
                if asset.tag in self.templates["recurring_failures"] and asset.status == "NORMAL":
                    # Random chance to start degradation (higher probability)
                    if random.random() < 0.02:
                        asset.status = "DEGRADING"
                        self.trigger_breakdown_chain(asset, current_date, log_doc)
                        
            # If we are close to the end date but need more documents, force a few chains
            if (self.end_date - current_date).days < 180 and len(self.documents) < total_required_docs:
                for asset in random.sample(self.assets, 5):
                    if asset.status == "NORMAL":
                        asset.status = "DEGRADING"
                        self.trigger_breakdown_chain(asset, current_date, log_doc)

    def simulate_weekly_log(self, date):
        # Generates a DailyOperatorLog or ShiftHandoverLog
        log_type = random.choice(["DailyOperatorLog", "ShiftHandoverLog"])
        prefix = "OPR" if log_type == "DailyOperatorLog" else "SHF"
        log_id = self.get_next_id(prefix)
        
        prep = random.choice(self.get_employees_by_dept("OPS"))
        rev = random.choice(self.get_employees_by_dept("OPS"))
        appr = random.choice(self.get_employees_by_dept("OPS"))
        
        # Link to a couple of recently active documents in the repository
        recent_refs = []
        past_docs = [d for d in self.documents if d["date"] <= date]
        if len(past_docs) > 5:
            for doc in reversed(past_docs[-3:]):
                recent_refs.append({"doc_id": doc["doc_id"], "relationship": "monitors_state_after"})

                
        # Generate some parameters
        tables = [["Asset Tag", "Parameter Checked", "Logged Value", "Standard Range"]]
        for asset in random.sample(self.assets, 4):
            val = "41.5 bar" if asset.asset_class == "B" else "2.1 mm/s" if asset.asset_class == "P" else "Normal"
            tables.append([asset.tag, "Drum Pressure" if asset.asset_class == "B" else "Vibration Velocity" if asset.asset_class == "P" else "Operation status", val, "40-42 bar" if asset.asset_class == "B" else "< 4.5 mm/s" if asset.asset_class == "P" else "Normal"])
            
        return {
            "doc_id": log_id,
            "type": log_type,
            "title": f"Shift Operations parameter Log sheet - Week {self.counters[prefix]}",
            "date": date,
            "equipment_tag": "PLANT-WIDE",
            "equipment_name": "Integrated Plant Utilities",
            "department": "OPS",
            "prepared_by": prep["name"],
            "prepared_by_id": prep["emp_id"],
            "reviewed_by": rev["name"],
            "reviewed_by_id": rev["emp_id"],
            "approved_by": appr["name"],
            "approved_by_id": appr["emp_id"],
            "revision": "R0",
            "risk_level": "Low",
            "observations": "Routine plant operations checklist parameter logs. Plant is running steady, safety checks conducted at shift handovers.",
            "engineering_notes": "Control room notes:\n- Boiler drum indicators: stable\n- Cooling system loop pressure: 4.1 bar\n- Utility air dryers: cycle active",
            "tables": tables,
            "recommendations": "Continue routine visual checks on pump glands and lube oil levels.",
            "references": recent_refs
        }

    def trigger_pm_chain(self, asset, start_date, trigger_log):
        # 1. PM Inspection
        ins_id = self.get_next_id("INS")
        ins_date = start_date + timedelta(days=1)
        prep_ins = random.choice(self.get_employees_by_dept("MECH" if asset.asset_class in ["P", "HX", "V"] else "ELEC"))
        rev_ins = random.choice(self.get_employees_by_dept("MECH"))
        appr_ins = random.choice(self.get_employees_by_dept("OPS"))
        
        ins_doc = {
            "doc_id": ins_id,
            "type": "Inspection",
            "title": f"Scheduled Preventive Maintenance Inspection - {asset.name}",
            "date": ins_date,
            "equipment_tag": asset.tag,
            "equipment_name": asset.name,
            "department": "MECH" if asset.asset_class in ["P", "HX", "V"] else "ELEC",
            "prepared_by": prep_ins["name"],
            "prepared_by_id": prep_ins["emp_id"],
            "reviewed_by": rev_ins["name"],
            "reviewed_by_id": rev_ins["emp_id"],
            "approved_by": appr_ins["name"],
            "approved_by_id": appr_ins["emp_id"],
            "revision": "R0",
            "risk_level": "Low",
            "observations": f"Routine PM wear inspection for {asset.name}. Checked support mounts, alignment, and basic parameters. Condition is optimal.",
            "engineering_notes": "Inspection checks:\n- Frame corrosion: none detected\n- Grounding wires: tight\n- Running clearances: within nominal tolerance",
            "tables": [
                ["Inspection Point", "Check", "Result", "Action taken"],
                ["Mount bolts", "Tightness", "Passed", "None"],
                ["Junction box", "Seal integrity", "Passed", "Cleaned contacts"]
            ],
            "recommendations": "Schedule standard lubrication checks during next month cycle.",
            "references": [{"doc_id": trigger_log["doc_id"], "relationship": "scheduled_by"}]
        }
        self.documents.append(ins_doc)
        
        # 2. PM Work Order
        wo_id = self.get_next_id("WO")
        wo_date = ins_date + timedelta(days=1)
        prep_wo = random.choice(self.get_employees_by_dept("OPS"))
        rev_wo = random.choice(self.get_employees_by_dept("MECH"))
        appr_wo = random.choice(self.get_employees_by_dept("MECH"))
        
        wo_doc = {
            "doc_id": wo_id,
            "type": "WorkOrder",
            "title": f"Scheduled PM Work Order - {asset.name}",
            "date": wo_date,
            "equipment_tag": asset.tag,
            "equipment_name": asset.name,
            "department": "MECH" if asset.asset_class in ["P", "HX", "V"] else "ELEC",
            "prepared_by": prep_wo["name"],
            "prepared_by_id": prep_wo["emp_id"],
            "reviewed_by": rev_wo["name"],
            "reviewed_by_id": rev_wo["emp_id"],
            "approved_by": appr_wo["name"],
            "approved_by_id": appr_wo["emp_id"],
            "revision": "R0",
            "risk_level": "Low",
            "observations": f"Execute PM guidelines defined in SOP for {asset.name}. Clean cooling fins, apply lube grease, align couplings.",
            "engineering_notes": "Ensure LOTO padlocks are registered in MCC room prior to starting mechanical checks.",
            "tables": [
                ["Skill Trade", "Technician Assigned", "Duration", "LOTO Tag No"],
                ["Mechanical Fitter", "Suresh Kumar", "2 hours", "LOTO-PM-089"]
            ],
            "recommendations": "Verify motor shaft alignment post PM.",
            "references": [{"doc_id": ins_id, "relationship": "authorized_by"}]
        }
        self.documents.append(wo_doc)
        
        # 3. PM Maintenance Report (Successful repair)
        mnt_id = self.get_next_id("MNT")
        mnt_date = wo_date + timedelta(days=2)
        prep_mnt = random.choice(self.get_employees_by_dept("MECH" if asset.asset_class in ["P", "HX", "V"] else "ELEC"))
        rev_mnt = random.choice(self.get_employees_by_dept("MECH"))
        appr_mnt = random.choice(self.get_employees_by_dept("OPS"))
        
        mnt_doc = {
            "doc_id": mnt_id,
            "type": "Maintenance",
            "title": f"PM Maintenance Execution Report - {asset.name}",
            "date": mnt_date,
            "equipment_tag": asset.tag,
            "equipment_name": asset.name,
            "department": "MECH" if asset.asset_class in ["P", "HX", "V"] else "ELEC",
            "prepared_by": prep_mnt["name"],
            "prepared_by_id": prep_mnt["emp_id"],
            "reviewed_by": rev_mnt["name"],
            "reviewed_by_id": rev_mnt["emp_id"],
            "approved_by": appr_mnt["name"],
            "approved_by_id": appr_mnt["emp_id"],
            "revision": "R0",
            "risk_level": "Low",
            "observations": f"Preventive Maintenance completed. Applied 20g of Mobilux EP2 grease to bearings. Motor base and housing cleaned.",
            "engineering_notes": "Alignment check registered 0.02 mm offset (well within limits). Ground connections checked and verified.",
            "tables": [
                ["PM Action", "Condition Found", "Action Completed", "Material used"],
                ["Lube check", "Low grease", "Applied 20g Mobilux", "Lithium soap grease"],
                ["Body clean", "Dust on fins", "Cleaned with air blast", "None"]
            ],
            "recommendations": "Return asset to normal service. PM cycle reset.",
            "references": [{"doc_id": wo_id, "relationship": "executes_work_for"}]
        }
        self.documents.append(mnt_doc)

    def trigger_breakdown_chain(self, asset, start_date, trigger_log):
        # Get specific failure templates for the recurring failures or generic ones
        fail_key = asset.tag if asset.tag in self.templates["recurring_failures"] else "P-101"
        fail_data = self.templates["recurring_failures"][fail_key]
        
        # 1. Inspection Report (Vibe / Lube / Calibration)
        ins_id = self.get_next_id("INS")
        ins_date = start_date + timedelta(days=1)
        prep_ins = random.choice(self.get_employees_by_dept("QAQC" if asset.asset_class in ["V", "B"] else "MECH"))
        rev_ins = random.choice(self.get_employees_by_dept("MECH"))
        appr_ins = random.choice(self.get_employees_by_dept("OPS"))
        
        spec_type = "Inspection"
        if asset.tag == "P-101":
            spec_type = "Vibration"
            ins_id = self.get_next_id("VIB")
        elif asset.tag == "C-701":
            spec_type = "Lubrication"
            ins_id = self.get_next_id("LUB")
        elif asset.tag == "B-401":
            spec_type = "Calibration"
            ins_id = self.get_next_id("CAL")
            
        ins_doc = {
            "doc_id": ins_id,
            "type": spec_type,
            "title": f"Technical {spec_type} Report - Fault Detected on {asset.name}",
            "date": ins_date,
            "equipment_tag": asset.tag,
            "equipment_name": asset.name,
            "department": "MECH" if spec_type != "Calibration" else "INC",
            "prepared_by": prep_ins["name"],
            "prepared_by_id": prep_ins["emp_id"],
            "reviewed_by": rev_ins["name"],
            "reviewed_by_id": rev_ins["emp_id"],
            "approved_by": appr_ins["name"],
            "approved_by_id": appr_ins["emp_id"],
            "revision": "R0",
            "risk_level": "High",
            "observations": fail_data["inspection_findings"],
            "engineering_notes": f"Immediate repair required. Operating parameters are out of nominal specs defined in {asset.tag} OEM manuals.",
            "tables": [
                ["Parameter Measured", "Current Reading", "Standard Limit", "Deviation Status"],
                ["Vibration / Leak Rate", "Critical Level", "Normal", "EXCEEDS LIMIT"]
            ],
            "recommendations": "Schedule emergency shut down and parts overhaul immediately.",
            "references": [{"doc_id": trigger_log["doc_id"], "relationship": "triggered_by"}]
        }
        self.documents.append(ins_doc)
        
        # 2. Work Order (Stating scope of repair)
        wo_id = self.get_next_id("WO")
        wo_date = ins_date + timedelta(days=1)
        prep_wo = random.choice(self.get_employees_by_dept("OPS"))
        rev_wo = random.choice(self.get_employees_by_dept("MECH"))
        appr_wo = random.choice(self.get_employees_by_dept("MECH"))
        
        wo_doc = {
            "doc_id": wo_id,
            "type": "WorkOrder",
            "title": f"Emergency Maintenance Work Order - {asset.name}",
            "date": wo_date,
            "equipment_tag": asset.tag,
            "equipment_name": asset.name,
            "department": "MECH" if asset.asset_class in ["P", "HX", "V"] else "INC",
            "prepared_by": prep_wo["name"],
            "prepared_by_id": prep_wo["emp_id"],
            "reviewed_by": rev_wo["name"],
            "reviewed_by_id": rev_wo["emp_id"],
            "approved_by": appr_wo["name"],
            "approved_by_id": appr_wo["emp_id"],
            "revision": "R0",
            "risk_level": "High",
            "observations": fail_data["work_description"],
            "engineering_notes": f"Scope of work scheduled. Stock check note: {fail_data['delay_reason']}",
            "tables": [
                ["Required Spares", "Part Number", "Sump quantity", "Status"],
                [fail_data["required_spare"], f"SP-{asset.tag}-11", "0 units", "STOCKOUT"]
            ],
            "recommendations": "Verify secondary standby equipment is in service before starting work.",
            "references": [{"doc_id": ins_id, "relationship": "scheduled_by"}]
        }
        self.documents.append(wo_doc)
        
        # 3. Maintenance Report (Delayed status)
        mnt_id = self.get_next_id("MNT")
        mnt_date = wo_date + timedelta(days=2)
        prep_mnt = random.choice(self.get_employees_by_dept("MECH" if asset.asset_class in ["P", "HX", "V"] else "INC"))
        rev_mnt = random.choice(self.get_employees_by_dept("MECH"))
        appr_mnt = random.choice(self.get_employees_by_dept("OPS"))
        
        mnt_doc = {
            "doc_id": mnt_id,
            "type": "Maintenance",
            "title": f"Maintenance Delay Report - {asset.name}",
            "date": mnt_date,
            "equipment_tag": asset.tag,
            "equipment_name": asset.name,
            "department": "MECH" if asset.asset_class in ["P", "HX", "V"] else "INC",
            "prepared_by": prep_mnt["name"],
            "prepared_by_id": prep_mnt["emp_id"],
            "reviewed_by": rev_mnt["name"],
            "reviewed_by_id": rev_mnt["emp_id"],
            "approved_by": appr_mnt["name"],
            "approved_by_id": appr_mnt["emp_id"],
            "revision": "R0",
            "risk_level": "High",
            "observations": f"Repair task put on HOLD. Issue: {fail_data['delay_reason']}",
            "engineering_notes": "Technicians could not complete overhaul due to lack of warehouse parts. Asset returned to service under high risk warning.",
            "tables": [
                ["Job Status", "Blocked By", "Pending Part", "Estimated Delay"],
                ["DELAYED", "Warehouse Stockout", fail_data["required_spare"], "9-15 days"]
            ],
            "recommendations": "Procurement team must fast track shipment. Operations must monitor temperature levels.",
            "references": [{"doc_id": wo_id, "relationship": "documents_work_for"}]
        }
        self.documents.append(mnt_doc)
        
        # 4. Incident Report (Failure occurs due to delay)
        inc_id = self.get_next_id("INC")
        inc_date = mnt_date + timedelta(days=random.randint(4, 7))
        prep_inc = random.choice(self.get_employees_by_dept("HSE"))
        rev_inc = random.choice(self.get_employees_by_dept("OPS"))
        appr_inc = next((e for e in self.employees if e["emp_id"] == "EMP-DIR-01"), None)
        
        inc_doc = {
            "doc_id": inc_id,
            "type": "Incident",
            "title": f"Major Catastrophic Breakdown Incident Report - {asset.name}",
            "date": inc_date,
            "equipment_tag": asset.tag,
            "equipment_name": asset.name,
            "department": "HSE",
            "prepared_by": prep_inc["name"],
            "prepared_by_id": prep_inc["emp_id"],
            "reviewed_by": rev_inc["name"],
            "reviewed_by_id": rev_inc["emp_id"],
            "approved_by": appr_inc["name"],
            "approved_by_id": appr_inc["emp_id"],
            "revision": "R0",
            "risk_level": "Critical",
            "observations": fail_data["incident_description"],
            "engineering_notes": "Root Cause Analysis (5-Whys):\n" + "\n".join([f"{i+1}. {why}" for i, why in enumerate(fail_data["root_cause_5whys"])]),
            "tables": [
                ["RCA Level", "Answering Question", "Findings", "Tracking Code"],
                ["W1", "Why did it trip?", fail_data["root_cause_5whys"][0], "RCA-W1"],
                ["W2", "What caused failure?", fail_data["root_cause_5whys"][1], "RCA-W2"],
                ["W3", "Why was wear excessive?", fail_data["root_cause_5whys"][2], "RCA-W3"],
                ["W4", "Why delayed?", fail_data["root_cause_5whys"][3], "RCA-W4"],
                ["W5", "Root systemic cause?", fail_data["root_cause_5whys"][4], "RCA-W5"]
            ],
            "recommendations": "Formally audit procurement spares process and establish minimum safety buffers.",
            "references": [{"doc_id": mnt_id, "relationship": "caused_by_delay_of"}]
        }
        self.documents.append(inc_doc)
        
        # 5. Audit Report
        aud_id = self.get_next_id("AUD")
        aud_date = inc_date + timedelta(days=12)
        prep_aud = random.choice(self.get_employees_by_dept("QAQC"))
        rev_aud = random.choice(self.get_employees_by_dept("QAQC"))
        appr_aud = random.choice(self.get_employees_by_dept("OPS"))
        
        aud_doc = {
            "doc_id": aud_id,
            "type": "Audit",
            "title": f"Internal Safety & Quality Maintenance Management Audit - {asset.tag} Incident",
            "date": aud_date,
            "equipment_tag": asset.tag,
            "equipment_name": asset.name,
            "department": "QAQC",
            "prepared_by": prep_aud["name"],
            "prepared_by_id": prep_aud["emp_id"],
            "reviewed_by": rev_aud["name"],
            "reviewed_by_id": rev_aud["emp_id"],
            "approved_by": appr_aud["name"],
            "approved_by_id": appr_aud["emp_id"],
            "revision": "R0",
            "risk_level": "High",
            "observations": fail_data["audit_findings"],
            "engineering_notes": "Audit finding: Maintenance management controls failed to maintain safety spares inventory balances.",
            "tables": [
                ["Audit Check", "Standard Criteria", "Evaluation Finding", "Gap Severity"],
                ["Spares tracking", "SAP re-order trigger", "Disabled or set to zero", "HIGH"],
                ["Modification", "Authorization of change", "Technician material swap occurred", "MEDIUM"]
            ],
            "recommendations": "Log compliance non-conformance ticket and draft corrective actions.",
            "references": [{"doc_id": inc_id, "relationship": "audit_triggered_by"}]
        }
        self.documents.append(aud_doc)
        
        # 6. Compliance Finding Report
        cmp_id = self.get_next_id("CMP")
        cmp_date = aud_date + timedelta(days=5)
        prep_cmp = random.choice(self.get_employees_by_dept("HSE"))
        rev_cmp = random.choice(self.get_employees_by_dept("QAQC"))
        appr_cmp = next((e for e in self.employees if e["emp_id"] == "EMP-DIR-01"), None)
        
        cmp_doc = {
            "doc_id": cmp_id,
            "type": "Compliance",
            "title": f"Regulatory Compliance Gap & Corrective Action Plan - {asset.tag}",
            "date": cmp_date,
            "equipment_tag": asset.tag,
            "equipment_name": asset.name,
            "department": "HSE",
            "prepared_by": prep_cmp["name"],
            "prepared_by_id": prep_cmp["emp_id"],
            "reviewed_by": rev_cmp["name"],
            "reviewed_by_id": rev_cmp["emp_id"],
            "approved_by": appr_cmp["name"],
            "approved_by_id": appr_cmp["emp_id"],
            "revision": "R0",
            "risk_level": "Medium",
            "observations": fail_data["compliance_gap"],
            "engineering_notes": f"Details of Corrective Actions Plan:\n{fail_data['corrective_actions']}",
            "tables": [
                ["Action Reference", "Action required", "Target Date", "Owner Assigned", "Status"],
                ["CAP-01", "Update inventory min-stock in SAP", (cmp_date + timedelta(days=30)).strftime("%Y-%m-%d"), "Procurement Lead", "OPEN"],
                ["CAP-02", "Audit and inspect local locks", (cmp_date + timedelta(days=15)).strftime("%Y-%m-%d"), "Safety In-Charge", "OPEN"]
            ],
            "recommendations": "Ensure monthly verification audit is reported to safety committee.",
            "references": [{"doc_id": aud_id, "relationship": "remedies_finding_in"}]
        }
        self.documents.append(cmp_doc)
        
        # 7. Corrective Action Training Record (Close the loop)
        trn_id = self.get_next_id("TRN")
        trn_date = cmp_date + timedelta(days=14)
        prep_trn = random.choice(self.get_employees_by_dept("HSE"))
        rev_trn = random.choice(self.get_employees_by_dept("OPS"))
        appr_trn = random.choice(self.get_employees_by_dept("HSE"))
        
        # Pull 3 technicians to undergo certification training
        attendees = self.get_employees_by_dept("MECH")[:3]
        table_attendees = [["Attendee Name", "Employee ID", "Designation", "Assessment Score"]]
        for att in attendees:
            table_attendees.append([att["name"], att["emp_id"], att["designation"], "95% (Pass)"])
            
        trn_doc = {
            "doc_id": trn_id,
            "type": "Training",
            "title": f"Corrective Action Technical Safety Training - {asset.tag} Failure",
            "date": trn_date,
            "equipment_tag": asset.tag,
            "equipment_name": asset.name,
            "department": "HSE",
            "prepared_by": prep_trn["name"],
            "prepared_by_id": prep_trn["emp_id"],
            "reviewed_by": rev_trn["name"],
            "reviewed_by_id": rev_trn["emp_id"],
            "approved_by": appr_trn["name"],
            "approved_by_id": appr_trn["emp_id"],
            "revision": "R0",
            "risk_level": "Low",
            "observations": f"Conducted certification refresher safety training to prevent recurrence of {asset.tag} failures. Topics included critical spares tracking, LOTO verification, and procedural alignment.",
            "engineering_notes": "Refresher course material covered standard operating procedures and calibration safety interlock parameters.",
            "tables": table_attendees,
            "recommendations": "Employees listed are certified to perform repairs. Keep record inside personnel file.",
            "references": [{"doc_id": cmp_id, "relationship": "fulfills_action_of"}]
        }
        self.documents.append(trn_doc)
        
        # 8. Email update (Sent by Engineer to manager summarizing resolution)
        eml_id = self.get_next_id("EML")
        eml_date = trn_date + timedelta(days=2)
        prep_eml = random.choice(self.get_employees_by_dept("HSE"))
        rev_eml = random.choice(self.get_employees_by_dept("OPS"))
        
        eml_doc = {
            "doc_id": eml_id,
            "type": "Email",
            "title": f"Technical Update: Resolution of Compliance Finding for {asset.tag}",
            "date": eml_date,
            "equipment_tag": asset.tag,
            "equipment_name": asset.name,
            "department": prep_eml["department"],
            "prepared_by": prep_eml["name"],
            "prepared_by_id": prep_eml["emp_id"],
            "reviewed_by": rev_eml["name"],
            "reviewed_by_id": rev_eml["emp_id"],
            "approved_by": rev_eml["name"],
            "approved_by_id": rev_eml["emp_id"],
            "revision": "N/A",
            "risk_level": "Low",
            "observations": f"Subject: Spares and SOP training resolution for {asset.tag}\nFrom: {prep_eml['email']}\nTo: {rev_eml['email']}\n\nHi {rev_eml['name']},\n\nThis is to confirm that the compliance gap COMP-MNT-001 has been successfully addressed. All mechanical fitters have completed safety training. Standard minimum inventory balances have been configured in SAP. The safety interlocks check is complete.",
            "engineering_notes": "We will run another inspection next week to confirm temperature values are nominal.",
            "tables": [
                ["Action Reference", "Completed Date", "Verified By", "Status"],
                ["CAP-01 (Inventory)", (cmp_date + timedelta(days=10)).strftime("%Y-%m-%d"), "Warehouse Manager", "CLOSED"],
                ["CAP-02 (Training)", trn_date.strftime("%Y-%m-%d"), "HSE Instructor", "CLOSED"]
            ],
            "recommendations": "Recommend resuming regular vibration monitoring.",
            "references": [{"doc_id": trn_id, "relationship": "confirms_completion_of"}]
        }
        self.documents.append(eml_doc)
        
        # Reset asset status
        asset.status = "NORMAL"
