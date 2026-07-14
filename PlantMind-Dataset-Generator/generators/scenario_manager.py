import json
import random
from datetime import datetime, timedelta
from pathlib import Path
from faker import Faker

class ScenarioManager:
    def __init__(self, config_path, templates_path):
        self.fake = Faker("en_IN")  # Indian localization for names, phones
        Faker.seed(12345)
        random.seed(12345)
        
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
        
    def generate_assets(self):
        # Base assets defined in prompt
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
            self.assets.append({
                "tag": ba["tag"],
                "name": ba["name"],
                "specs": cls_info["specs"],
                "criticality": cls_info["criticality"],
                "class": ba["class"]
            })
            
        # Additional assets to reach ~30
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
            ("T-801", "Steam Turbine", "HX"), # close enough class
            ("G-851", "Electrical Generator", "M"),
            ("TX-901", "Step-up Transformer", "M"),
            ("TX-902", "Auxiliary Transformer", "M"),
            ("F-351", "Reheat Furnace", "B")
        ]
        
        for tag, name, cls in extra_tags:
            cls_info = self.templates["asset_classes"][cls]
            self.assets.append({
                "tag": tag,
                "name": name,
                "specs": cls_info["specs"],
                "criticality": cls_info["criticality"],
                "class": cls
            })
            
    def generate_employees(self):
        # We need ~50 employees. Let's create supervisors first.
        departments = list(self.templates["departments"].keys())
        
        # Plant Management
        director = {
            "emp_id": "EMP-DIR-01",
            "name": "Karthik Ramaswamy",
            "department": "OPS",
            "designation": "Plant Director",
            "experience": "24 Years",
            "supervisor": "None",
            "phone": "+91 94432 10101",
            "email": "karthik.ramaswamy@steelforge.in"
        }
        self.employees.append(director)
        
        # Heads of Departments (Supervisors)
        dept_heads = {}
        for dept in departments:
            head_id = f"EMP-{dept}-HDR"
            head_name = self.fake.name()
            exp = random.randint(12, 20)
            phone = f"+91 {random.randint(60000, 99999)} {random.randint(10000, 99999)}"
            email = f"{head_name.lower().replace(' ', '.')}@steelforge.in"
            
            head = {
                "emp_id": head_id,
                "name": head_name,
                "department": dept,
                "designation": f"Head of {self.templates['departments'][dept].split(' ')[0]}",
                "experience": f"{exp} Years",
                "supervisor": "Karthik Ramaswamy",
                "phone": phone,
                "email": email
            }
            self.employees.append(head)
            dept_heads[dept] = head_name
            
        # Standard employees (Engineers & Technicians)
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
            dept = random.choice(departments)
            desg = random.choice(designations[dept])
            emp_id = f"EMP-{dept}-{emp_counter}"
            emp_counter += 1
            name = self.fake.name()
            exp = random.randint(2, 10)
            phone = f"+91 {random.randint(60000, 99999)} {random.randint(10000, 99999)}"
            email = f"{name.lower().replace(' ', '.')}@steelforge.in"
            
            self.employees.append({
                "emp_id": emp_id,
                "name": name,
                "department": dept,
                "designation": desg,
                "experience": f"{exp} Years",
                "supervisor": dept_heads[dept],
                "phone": phone,
                "email": email
            })

    def get_employees_by_dept(self, dept):
        return [e for e in self.employees if e["department"] == dept]
        
    def get_asset_by_tag(self, tag):
        for a in self.assets:
            if a["tag"] == tag:
                return a
        return None

    def get_random_date(self, start=None, end=None):
        start = start or self.start_date
        end = end or self.end_date
        delta = end - start
        random_days = random.randint(0, delta.days)
        return start + timedelta(days=random_days)

    def generate_all_documents(self):
        # We need to build a chronological register of documents
        # 1. 10 OEM Manuals (static reference documents early in 2022)
        self.generate_oem_manuals()
        
        # 2. SOP Documents (early in 2022)
        self.generate_sops()
        
        # 3. Cause and Effect Chains
        self.generate_scenario_chains()
        
        # 4. Fill up remaining documents to meet counts
        self.fill_remaining_documents()
        
        # Sort documents by date to ensure proper timeline
        self.documents.sort(key=lambda x: x["date"])
        
        return {
            "assets": self.assets,
            "employees": self.employees,
            "documents": self.documents
        }

    def generate_oem_manuals(self):
        # 10 OEM Manuals for key assets
        oem_assets = [a for a in self.assets if a["criticality"] in ["Critical", "High"]][:10]
        for i, asset in enumerate(oem_assets):
            oem_id = f"OEM-MNL-{101 + i}"
            prep = random.choice(self.get_employees_by_dept("PROC"))
            rev = random.choice(self.get_employees_by_dept(asset["class"] if asset["class"] in ["MECH", "ELEC", "INC"] else "MECH"))
            appr = random.choice(self.get_employees_by_dept("OPS"))
            
            doc = {
                "doc_id": oem_id,
                "type": "OEM_Manual",
                "title": f"OEM Operation and Maintenance Manual - {asset['name']}",
                "date": datetime(2022, 1, 10 + i),
                "equipment_tag": asset["tag"],
                "equipment_name": asset["name"],
                "department": "PROC",
                "prepared_by": prep["name"],
                "prepared_by_id": prep["emp_id"],
                "reviewed_by": rev["name"],
                "reviewed_by_id": rev["emp_id"],
                "approved_by": appr["name"],
                "approved_by_id": appr["emp_id"],
                "revision": "R0",
                "risk_level": "Low",
                "observations": f"OEM specified specifications for {asset['name']} (Tag: {asset['tag']}). Operations should strictly adhere to parameter constraints.",
                "engineering_notes": f"Critical limits:\n- Maximum Operating Limit: {asset['specs']}\n- Recommended Lubricant: Mobilux EP 2 / Roto-Inject fluid\n- Inspection Interval: Monthly visual check, quarterly vibration profiling.",
                "tables": [
                    ["Parameter", "Min Limit", "Max Limit", "Action Threshold"],
                    ["Vibration Level", "0 mm/s", "4.5 mm/s", "7.1 mm/s"],
                    ["Operating Temp", "0 C", "75 C", "85 C"],
                    ["Pressure Range", "0 bar", "10 bar", "12 bar"]
                ],
                "recommendations": "1. Perform calibration of pressure sensors every 6 months.\n2. Do not bypass high pressure interlocks during operation.\n3. Always use OEM certified spare parts to maintain warranty.",
                "references": []
            }
            self.documents.append(doc)

    def generate_sops(self):
        # 20 SOP Documents
        sop_assets = self.assets[:20]
        for i, asset in enumerate(sop_assets):
            sop_id = f"SOP-OPS-{201 + i}"
            dept = asset["class"]
            if dept not in self.templates["departments"]:
                dept = "OPS"
            prep = random.choice(self.get_employees_by_dept(dept))
            rev = random.choice(self.get_employees_by_dept("HSE"))
            appr = random.choice(self.get_employees_by_dept("OPS"))
            
            # Find matching OEM Manual
            ref_oem = next((d for d in self.documents if d["type"] == "OEM_Manual" and d["equipment_tag"] == asset["tag"]), None)
            refs = [{"doc_id": ref_oem["doc_id"], "relationship": "derived_from"}] if ref_oem else []
            
            doc = {
                "doc_id": sop_id,
                "type": "SOP",
                "title": f"Standard Operating Procedure for {asset['name']}",
                "date": datetime(2022, 2, 1 + i),
                "equipment_tag": asset["tag"],
                "equipment_name": asset["name"],
                "department": dept,
                "prepared_by": prep["name"],
                "prepared_by_id": prep["emp_id"],
                "reviewed_by": rev["name"],
                "reviewed_by_id": rev["emp_id"],
                "approved_by": appr["name"],
                "approved_by_id": appr["emp_id"],
                "revision": "R1",
                "risk_level": "Medium",
                "observations": "Standard operation and isolation sequence of the equipment. All field operators must undergo certification on this SOP before operating the asset.",
                "engineering_notes": "Step-by-Step Operations:\n1. Verify all inlet and outlet valves are open/closed as per P&ID.\n2. Switch on control panel power, check for alarm conditions.\n3. Push local start button. Monitor parameter buildup for 10 minutes.\n4. Log values of pressure, flow and temperature in the daily sheet.",
                "tables": [
                    ["Step", "Activity Description", "Required PPE", "Hazard Checked"],
                    ["1", "Pre-start inspection", "Safety Shoes, Helmet, Glasses", "Leaks / Loose fittings"],
                    ["2", "Isolate energy source", "LOTO Padlock, tag", "Stored energy release"],
                    ["3", "System Flushing", "Acid-resistant apron, visor", "Chemical splashes"],
                    ["4", "Start sequence check", "Hearing Protection", "Abnormal noise/vibe"]
                ],
                "recommendations": "1. Ensure Lockout-Tagout (LOTO) is strictly enforced.\n2. In case of abnormal noise, hit Emergency Stop immediately.\n3. Periodic training on this procedure is mandatory every 12 months.",
                "references": refs
            }
            self.documents.append(doc)

    def generate_scenario_chains(self):
        # We need to model the 6 recurring failures. Let's create a chain of documents for each.
        # Total documents needed: 40 Maintenance, 20 Incident, 25 Inspection, 20 WorkOrders, 10 Audits, 10 Compliance, etc.
        # Let's generate 2 full cycles of each failure across the 5 years timeline (2022 - 2026).
        # Cycle 1: 2023. Cycle 2: 2025.
        
        failures = self.templates["recurring_failures"]
        director = next((e for e in self.employees if e["emp_id"] == "EMP-DIR-01"), None)

        
        inc_counter = 100
        wo_counter = 1000
        mnt_counter = 500
        ins_counter = 300
        aud_counter = 400
        cmp_counter = 700
        vib_counter = 800
        lube_counter = 900
        cal_counter = 1100
        risk_counter = 1200
        
        for cycle in [1, 2]:
            year = 2023 if cycle == 1 else 2025
            
            for key, fail_data in failures.items():
                tag = fail_data["tag"]
                asset = self.get_asset_by_tag(tag)
                
                # Step 1: Inspection / Lubrication / Vibration / Calibration Report
                # Create a specific pre-event report showing degradation.
                ins_id = f"INS-{ins_counter}"
                ins_counter += 1
                ins_date = datetime(year, random.randint(1, 4), random.randint(1, 28))
                
                prep_ins = random.choice(self.get_employees_by_dept("QAQC" if "V" in tag or "B" in tag else "MECH"))
                rev_ins = random.choice(self.get_employees_by_dept("MECH"))
                appr_ins = random.choice(self.get_employees_by_dept("OPS"))
                
                # Check for Vibration or Lubrication or Calibration specialized report
                spec_report_type = "Inspection"
                if "P-101" in tag:
                    spec_report_type = "Vibration"
                    ins_id = f"VIB-{vib_counter}"
                    vib_counter += 1
                elif "C-701" in tag:
                    spec_report_type = "Lubrication"
                    ins_id = f"LUB-{lube_counter}"
                    lube_counter += 1
                elif "B-401" in tag:
                    spec_report_type = "Calibration"
                    ins_id = f"CAL-{cal_counter}"
                    cal_counter += 1
                
                ins_doc = {
                    "doc_id": ins_id,
                    "type": spec_report_type,
                    "title": f"{spec_report_type} Report - {asset['name']}",
                    "date": ins_date,
                    "equipment_tag": tag,
                    "equipment_name": asset["name"],
                    "department": "MECH" if spec_report_type != "Calibration" else "INC",
                    "prepared_by": prep_ins["name"],
                    "prepared_by_id": prep_ins["emp_id"],
                    "reviewed_by": rev_ins["name"],
                    "reviewed_by_id": rev_ins["emp_id"],
                    "approved_by": appr_ins["name"],
                    "approved_by_id": appr_ins["emp_id"],
                    "revision": "R0",
                    "risk_level": "Medium" if cycle == 1 else "High",
                    "observations": fail_data["inspection_findings"],
                    "engineering_notes": f"Degradation detected under standard testing. Parameters exceed guidelines defined in {asset['tag']} manuals.",
                    "tables": [
                        ["Test Node", "Measured Value", "Alarm Limit", "Status"],
                        ["Drive End", "6.2 mm/s" if "P-101" in tag else "3.2 bar", "4.5 mm/s", "ALERT"],
                        ["Non-Drive End", "12.4 mm/s" if "P-101" in tag else "85 C", "4.5 mm/s", "CRITICAL"],
                        ["Housing Temp", "78 C" if "P-101" in tag else "Normal", "70 C", "ALERT"]
                    ],
                    "recommendations": "Recommend scheduling emergency maintenance to inspect components and replace worn parts immediately.",
                    "references": []
                }
                self.documents.append(ins_doc)
                
                # Step 2: Work Order created shortly after
                wo_id = f"WO-{wo_counter}"
                wo_counter += 1
                wo_date = ins_date + timedelta(days=2)
                
                prep_wo = random.choice(self.get_employees_by_dept("OPS"))
                rev_wo = random.choice(self.get_employees_by_dept("MECH"))
                appr_wo = random.choice(self.get_employees_by_dept("MECH"))
                
                wo_doc = {
                    "doc_id": wo_id,
                    "type": "WorkOrder",
                    "title": f"Maintenance Work Order - {asset['name']}",
                    "date": wo_date,
                    "equipment_tag": tag,
                    "equipment_name": asset["name"],
                    "department": "MECH" if "B-401" not in tag else "INC",
                    "prepared_by": prep_wo["name"],
                    "prepared_by_id": prep_wo["emp_id"],
                    "reviewed_by": rev_wo["name"],
                    "reviewed_by_id": rev_wo["emp_id"],
                    "approved_by": appr_wo["name"],
                    "approved_by_id": appr_wo["emp_id"],
                    "revision": "R0",
                    "risk_level": "High",
                    "observations": fail_data["work_description"],
                    "engineering_notes": f"Scope of work scheduled. Delayed status note: {fail_data['delay_reason']}",
                    "tables": [
                        ["Resource Name", "Role", "Hours Required", "Certifications Checked"],
                        ["Suresh Kumar", "Mechanical Fitter", "6 hours", "LOTO Certified"],
                        ["Venkatesh S", "Rigger", "2 hours", "Working at Height"]
                    ],
                    "recommendations": "Lockout Tagout (LOTO) key must be registered in the control room log book prior to work start.",
                    "references": [{"doc_id": ins_id, "relationship": "scheduled_by"}]
                }
                self.documents.append(wo_doc)
                
                # Step 3: Maintenance Report showing Delay or improper repair
                mnt_id = f"MNT-{mnt_counter}"
                mnt_counter += 1
                mnt_date = wo_date + timedelta(days=random.randint(4, 8))
                
                prep_mnt = random.choice(self.get_employees_by_dept("MECH" if "B-401" not in tag else "INC"))
                rev_mnt = random.choice(self.get_employees_by_dept("MECH"))
                appr_mnt = random.choice(self.get_employees_by_dept("OPS"))
                
                mnt_doc = {
                    "doc_id": mnt_id,
                    "type": "Maintenance",
                    "title": f"Maintenance Execution Report - {asset['name']}",
                    "date": mnt_date,
                    "equipment_tag": tag,
                    "equipment_name": asset["name"],
                    "department": "MECH" if "B-401" not in tag else "INC",
                    "prepared_by": prep_mnt["name"],
                    "prepared_by_id": prep_mnt["emp_id"],
                    "reviewed_by": rev_mnt["name"],
                    "reviewed_by_id": rev_mnt["emp_id"],
                    "approved_by": appr_mnt["name"],
                    "approved_by_id": appr_mnt["emp_id"],
                    "revision": "R0",
                    "risk_level": "High",
                    "observations": f"Job postponed/improperly resolved. Issue detail: {fail_data['delay_reason']}",
                    "engineering_notes": "Maintenance team was dispatched to perform repairs. However, due to material and logistical issues, the equipment was put back in service temporarily without full parts overhaul.",
                    "tables": [
                        ["Component Checked", "Condition Found", "Action Taken", "Status"],
                        ["Housing / Body", "Slight wear", "Cleaned", "Completed"],
                        ["Primary Seal/Bearing", "Severe Wear", "None - Stockout", "PENDING"]
                    ],
                    "recommendations": "Urgent procurement of replacement parts. System is running under elevated risk.",
                    "references": [{"doc_id": wo_id, "relationship": "documents_work_for"}]
                }
                self.documents.append(mnt_doc)
                
                # Step 4: Incident Report - Major failure shortly after due to the delay
                inc_id = f"INC-{inc_counter}"
                inc_counter += 1
                inc_date = mnt_date + timedelta(days=random.randint(5, 10))
                
                prep_inc = random.choice(self.get_employees_by_dept("HSE"))
                rev_inc = random.choice(self.get_employees_by_dept("OPS"))
                appr_inc = director  # Approved by Plant Director for severity
                
                inc_doc = {
                    "doc_id": inc_id,
                    "type": "Incident",
                    "title": f"Catastrophic Asset Failure Incident Report - {asset['name']}",
                    "date": inc_date,
                    "equipment_tag": tag,
                    "equipment_name": asset["name"],
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
                    "engineering_notes": "Root Cause Analysis (5-Whys Method):\n" + "\n".join([f"{i+1}. {why}" for i, why in enumerate(fail_data["root_cause_5whys"])]),
                    "tables": [
                        ["Analysis Step", "Question", "Answer / Investigation", "Finding Code"],
                        ["Why 1", "Why did asset trip?", fail_data["root_cause_5whys"][0], "RCA-W1"],
                        ["Why 2", "What caused that?", fail_data["root_cause_5whys"][1], "RCA-W2"],
                        ["Why 3", "Why did component fail?", fail_data["root_cause_5whys"][2], "RCA-W3"],
                        ["Why 4", "Why was maintenance delayed?", fail_data["root_cause_5whys"][3], "RCA-W4"],
                        ["Why 5", "Why was stock set to zero?", fail_data["root_cause_5whys"][4], "RCA-W5"]
                    ],
                    "recommendations": "Initiate comprehensive audit of warehousing and safety critical procurement.",
                    "references": [{"doc_id": mnt_id, "relationship": "precipitated_by"}]
                }
                self.documents.append(inc_doc)
                
                # Step 5: Audit Finding Report following the incident
                aud_id = f"AUD-{aud_counter}"
                aud_counter += 1
                aud_date = inc_date + timedelta(days=15)
                
                prep_aud = random.choice(self.get_employees_by_dept("QAQC"))
                rev_aud = random.choice(self.get_employees_by_dept("QAQC"))
                appr_aud = random.choice(self.get_employees_by_dept("OPS"))
                
                aud_doc = {
                    "doc_id": aud_id,
                    "type": "Audit",
                    "title": f"Internal Maintenance Management Quality Audit - {asset['name']} Failure",
                    "date": aud_date,
                    "equipment_tag": tag,
                    "equipment_name": asset["name"],
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
                    "engineering_notes": "Audit finding code: AUD-MNT-GAP. Recommendations have been formally logged into the plant compliance register.",
                    "tables": [
                        ["Audit Area", "Compliance Criteria", "Observation / Gap Description", "Severity"],
                        ["Inventory", "Critical Spares Availability", "No safety stock for critical equipment", "HIGH"],
                        ["Change Mgt", "Engineering Material Signoff", "Material substitution occurred without authorization", "MEDIUM"],
                        ["Operations", "LOTO Registry", "LOTO keys were not registered properly", "LOW"]
                    ],
                    "recommendations": "1. Mandate monthly audits of the critical spares warehouse inventory.\n2. Revise safety stock thresholds for all A-class assets.",
                    "references": [{"doc_id": inc_id, "relationship": "triggered_by"}]
                }
                self.documents.append(aud_doc)
                
                # Step 6: Compliance Report indicating gap and correction
                cmp_id = f"CMP-{cmp_counter}"
                cmp_counter += 1
                cmp_date = aud_date + timedelta(days=5)
                
                prep_cmp = random.choice(self.get_employees_by_dept("HSE"))
                rev_cmp = random.choice(self.get_employees_by_dept("QAQC"))
                appr_cmp = director
                
                cmp_doc = {
                    "doc_id": cmp_id,
                    "type": "Compliance",
                    "title": f"Regulatory Compliance & Corrective Action Report - {asset['name']} Failure",
                    "date": cmp_date,
                    "equipment_tag": tag,
                    "equipment_name": asset["name"],
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
                    "engineering_notes": f"Corrective Actions Details:\n{fail_data['corrective_actions']}",
                    "tables": [
                        ["Gap Reference", "Standard / Law", "Target Completion Date", "Assigned Owner", "Status"],
                        ["COMP-MNT-001", "ISO 55001 Asset Mgt", (cmp_date + timedelta(days=30)).strftime("%Y-%m-%d"), "Maintenance Manager", "OPEN"],
                        ["COMP-SAF-002", "Factories Act, Section 21", (cmp_date + timedelta(days=15)).strftime("%Y-%m-%d"), "Safety In-Charge", "IN PROGRESS"]
                    ],
                    "recommendations": "Ensure compliance reports are submitted to the local factory inspector board within the 30-day statutory window.",
                    "references": [{"doc_id": aud_id, "relationship": "remedies_finding"}]
                }
                self.documents.append(cmp_doc)
                
                # Step 7: Risk Assessment Document related to this
                risk_id = f"RSK-{risk_counter}"
                risk_counter += 1
                risk_date = cmp_date + timedelta(days=10)
                prep_risk = random.choice(self.get_employees_by_dept("HSE"))
                rev_risk = random.choice(self.get_employees_by_dept("OPS"))
                appr_risk = random.choice(self.get_employees_by_dept("HSE"))
                
                risk_doc = {
                    "doc_id": risk_id,
                    "type": "RiskAssessment",
                    "title": f"Process Risk Assessment (HAZOP) for {asset['name']}",
                    "date": risk_date,
                    "equipment_tag": tag,
                    "equipment_name": asset["name"],
                    "department": "HSE",
                    "prepared_by": prep_risk["name"],
                    "prepared_by_id": prep_risk["emp_id"],
                    "reviewed_by": rev_risk["name"],
                    "reviewed_by_id": rev_risk["emp_id"],
                    "approved_by": appr_risk["name"],
                    "approved_by_id": appr_risk["emp_id"],
                    "revision": "R0",
                    "risk_level": "Medium",
                    "observations": f"Review of hazards associated with operation of {asset['name']}. Particular focus on bearing wear/overpressure/seal blowout scenarios.",
                    "engineering_notes": "Hazards Identified:\n1. Mechanical failure leading to process trip.\n2. Inadequate cooling/pressure control.\n3. Toxic/corrosive chemical exposure.\nSafeguards:\n1. Safety stock of parts.\n2. Backup pump systems.\n3. Automatic sensor shut-downs.",
                    "tables": [
                        ["Hazard Scenario", "Potential Cause", "Severity", "Likelihood", "Risk Level", "Recommended Control"],
                        ["Pump Seizure", "Bearing wear", "Medium", "Medium", "Medium", "Vibration analysis"],
                        ["Acid Leak", "Seat erosion", "High", "Low", "Medium", "Stellite seats"],
                        ["Boiler Overpressure", "False pressure signal", "Critical", "Low", "High", "Redundant transmitter"]
                    ],
                    "recommendations": "Implement daily log inspection checks and automate calibration procedures to reduce likelihood parameters.",
                    "references": [{"doc_id": cmp_id, "relationship": "controls_risk_from"}]
                }
                self.documents.append(risk_doc)

    def fill_remaining_documents(self):
        # We have generated specific chains for the 6 failures.
        # Now let's fill the rest of the documents to match the counts:
        # Maintenance: 40 (we generated 12 in chains, we need 28 more)
        # Incident: 20 (we generated 12, we need 8 more)
        # Inspection: 25 (we generated 0 in chains directly, we generated 3 Vibration, 3 Lubrication, 3 Calibration, 0 general inspection, wait: the chains generated some. Let's see. The chains generated 6 inspection-class documents (3 general, 3 specialized) per cycle, total 12. Let's create general inspections to fill up)
        # WorkOrders: 20 (we generated 12 in chains, we need 8 more)
        # Audit: 10 (we generated 12 in chains! Oh! That's already 12. Let's ensure we have at least the minimum. Since 12 is greater than 10, that's fine. We don't need to generate more unless needed)
        # Compliance: 10 (we generated 12 in chains. That's fine)
        # Shift Handover Logs: 20 (need 20)
        # Daily Operator Logs: 20 (need 20)
        # Lubrication Reports: 20 (need 18 more, we generated 2 in chains)
        # Vibration Reports: 15 (need 13 more, we generated 2 in chains)
        # Risk Assessments: 10 (need 10, we generated 12 in chains. That's fine)
        # Training Records: 10 (need 10)
        # Calibration Reports: 10 (need 8 more, we generated 2 in chains)
        # Internal Emails: 10 (need 10)
        
        # Helper to generate general maintenance reports
        self.fill_maintenance_reports()
        self.fill_incidents()
        self.fill_inspections()
        self.fill_work_orders()
        self.fill_shift_logs()
        self.fill_daily_operator_logs()
        self.fill_lubrication_reports()
        self.fill_vibration_reports()
        self.fill_training_records()
        self.fill_calibration_reports()
        self.fill_emails()

    def fill_maintenance_reports(self):
        current_count = len([d for d in self.documents if d["type"] == "Maintenance"])
        needed = self.config["document_counts"]["maintenance_reports"] - current_count
        if needed <= 0:
            return
            
        m_counter = 600
        for i in range(needed):
            asset = random.choice(self.assets)
            date = self.get_random_date()
            prep = random.choice(self.get_employees_by_dept("MECH" if asset["class"] in ["P", "HX", "V"] else "ELEC"))
            rev = random.choice(self.get_employees_by_dept("MECH"))
            appr = random.choice(self.get_employees_by_dept("OPS"))
            
            doc = {
                "doc_id": f"MNT-{m_counter + i}",
                "type": "Maintenance",
                "title": f"Preventive Maintenance Report - {asset['name']}",
                "date": date,
                "equipment_tag": asset["tag"],
                "equipment_name": asset["name"],
                "department": "MECH" if asset["class"] in ["P", "HX", "V"] else "ELEC",
                "prepared_by": prep["name"],
                "prepared_by_id": prep["emp_id"],
                "reviewed_by": rev["name"],
                "reviewed_by_id": rev["emp_id"],
                "approved_by": appr["name"],
                "approved_by_id": appr["emp_id"],
                "revision": "R0",
                "risk_level": "Low",
                "observations": f"Routine PM check completed for {asset['name']}. Checked foundation bolts, motor terminal box tightness, and coupling lubrication status.",
                "engineering_notes": "Work details:\n1. Isolate motor power supply, test for dead.\n2. Clean body and cooling fins of accumulated dirt.\n3. Measure insulation resistance of motor winding (yielded > 100 Mega-ohms).\n4. Lubricate bearings with lithium soap grease.",
                "tables": [
                    ["Check Description", "Expected Value", "Measured Value", "Status"],
                    ["Insulation Resistance", "> 10 MOhm", "125 MOhm", "OK"],
                    ["Bolt Torque", "85 Nm", "85 Nm", "OK"],
                    ["Grease Condition", "Clean", "Clean", "OK"]
                ],
                "recommendations": "Equipment returned to operations in healthy condition. Standard inspection cycle remains unchanged.",
                "references": []
            }
            self.documents.append(doc)

    def fill_incidents(self):
        current_count = len([d for d in self.documents if d["type"] == "Incident"])
        needed = self.config["document_counts"]["incident_reports"] - current_count
        if needed <= 0:
            return
            
        inc_counter = 200
        for i in range(needed):
            asset = random.choice(self.assets)
            date = self.get_random_date()
            prep = random.choice(self.get_employees_by_dept("HSE"))
            rev = random.choice(self.get_employees_by_dept("OPS"))
            appr = random.choice(self.get_employees_by_dept("OPS"))
            
            doc = {
                "doc_id": f"INC-GEN-{inc_counter + i}",
                "type": "Incident",
                "title": f"Minor Operational Incident Report - {asset['name']}",
                "date": date,
                "equipment_tag": asset["tag"],
                "equipment_name": asset["name"],
                "department": "HSE",
                "prepared_by": prep["name"],
                "prepared_by_id": prep["emp_id"],
                "reviewed_by": rev["name"],
                "reviewed_by_id": rev["emp_id"],
                "approved_by": appr["name"],
                "approved_by_id": appr["emp_id"],
                "revision": "R0",
                "risk_level": "Medium",
                "observations": f"Operator noticed minor steam/water leak from piping flange adjacent to {asset['name']}. Minor spray of fluid did not lead to process shut down.",
                "engineering_notes": "Incident details:\nFlange bolts found slightly loose due to piping thermal vibration. Re-tightening was scheduled during opportunity window.",
                "tables": [
                    ["Parameter", "Detail", "Impact", "Code"],
                    ["Fluid Type", "Cooling Water", "None", "FLUID-H2O"],
                    ["Leak Rate", "0.5 L/min", "Low", "LEAK-MIN"],
                    ["Injuries", "None", "None", "SAFE-001"]
                ],
                "recommendations": "Replace flange gasket during next scheduled shutdown. Conduct visual checks of pipeline supports.",
                "references": []
            }
            self.documents.append(doc)

    def fill_inspections(self):
        current_count = len([d for d in self.documents if d["type"] == "Inspection"])
        needed = self.config["document_counts"]["inspection_reports"] - current_count
        if needed <= 0:
            return
            
        ins_counter = 500
        for i in range(needed):
            asset = random.choice(self.assets)
            date = self.get_random_date()
            prep = random.choice(self.get_employees_by_dept("MECH" if asset["class"] in ["P", "HX", "V"] else "ELEC"))
            rev = random.choice(self.get_employees_by_dept("MECH"))
            appr = random.choice(self.get_employees_by_dept("OPS"))
            
            doc = {
                "doc_id": f"INS-GEN-{ins_counter + i}",
                "type": "Inspection",
                "title": f"General Technical Inspection Report - {asset['name']}",
                "date": date,
                "equipment_tag": asset["tag"],
                "equipment_name": asset["name"],
                "department": "MECH" if asset["class"] in ["P", "HX", "V"] else "ELEC",
                "prepared_by": prep["name"],
                "prepared_by_id": prep["emp_id"],
                "reviewed_by": rev["name"],
                "reviewed_by_id": rev["emp_id"],
                "approved_by": appr["name"],
                "approved_by_id": appr["emp_id"],
                "revision": "R0",
                "risk_level": "Low",
                "observations": f"Conducted periodic visual and technical inspection of {asset['name']}. The overall physical condition is satisfactory. Minor paint peeling noted.",
                "engineering_notes": "Inspection checks:\n- Structural support and anchor bolts: OK\n- Connections and piping: Leak-free\n- Local instrumentation dials reading: Normal\n- Electrical junction box: Gland sealed",
                "tables": [
                    ["Component", "Check Description", "Result", "Remarks"],
                    ["Baseframe", "Corrosion check", "Passed", "No structural damage"],
                    ["Piping Connects", "Leak test", "Passed", "Tight seal"],
                    ["Grounding", "Earth resistance", "Passed", "0.15 Ohm"]
                ],
                "recommendations": "No immediate actions required. Continue routine inspections as defined in the PM program.",
                "references": []
            }
            self.documents.append(doc)

    def fill_work_orders(self):
        current_count = len([d for d in self.documents if d["type"] == "WorkOrder"])
        needed = self.config["document_counts"]["work_orders"] - current_count
        if needed <= 0:
            return
            
        wo_counter = 1200
        for i in range(needed):
            asset = random.choice(self.assets)
            date = self.get_random_date()
            prep = random.choice(self.get_employees_by_dept("OPS"))
            rev = random.choice(self.get_employees_by_dept("MECH"))
            appr = random.choice(self.get_employees_by_dept("MECH"))
            
            doc = {
                "doc_id": f"WO-GEN-{wo_counter + i}",
                "type": "WorkOrder",
                "title": f"Standard Work Order - {asset['name']}",
                "date": date,
                "equipment_tag": asset["tag"],
                "equipment_name": asset["name"],
                "department": "MECH" if asset["class"] in ["P", "HX", "V"] else "ELEC",
                "prepared_by": prep["name"],
                "prepared_by_id": prep["emp_id"],
                "reviewed_by": rev["name"],
                "reviewed_by_id": rev["emp_id"],
                "approved_by": appr["name"],
                "approved_by_id": appr["emp_id"],
                "revision": "R0",
                "risk_level": "Low",
                "observations": f"Routine check / minor adjustment for {asset['name']}. Request to adjust belt/tension or clean filters.",
                "engineering_notes": "Instruction details:\nIsolate system, clean element, inspect for debris, reassemble and document values.",
                "tables": [
                    ["Task", "Estimated Duration", "Trade", "Material Needed"],
                    ["Isolate & Tag", "0.5 hr", "Operator", "LOTO Kit"],
                    ["Clean Filter", "1.0 hr", "Mechanical Fitter", "Cleaning Fluid"],
                    ["Test Run", "0.5 hr", "Technician", "None"]
                ],
                "recommendations": "Report any signs of oil/gas leaks to the shift supervisor.",
                "references": []
            }
            self.documents.append(doc)

    def fill_shift_logs(self):
        needed = self.config["document_counts"]["shift_handover_logs"]
        s_counter = 100
        for i in range(needed):
            date = self.get_random_date()
            prep = random.choice(self.get_employees_by_dept("OPS"))
            rev = random.choice(self.get_employees_by_dept("OPS"))
            appr = random.choice(self.get_employees_by_dept("OPS"))
            
            doc = {
                "doc_id": f"SHF-LOG-{s_counter + i}",
                "type": "ShiftHandoverLog",
                "title": f"Shift Handover Log - SteelForge Plant",
                "date": date,
                "equipment_tag": "PLANT-WIDE",
                "equipment_name": "Integrated Plant Operations",
                "department": "OPS",
                "prepared_by": prep["name"],
                "prepared_by_id": prep["emp_id"],
                "reviewed_by": rev["name"],
                "reviewed_by_id": rev["emp_id"],
                "approved_by": appr["name"],
                "approved_by_id": appr["emp_id"],
                "revision": "R0",
                "risk_level": "Low",
                "observations": "Shift A to Shift B Handover. Production targets achieved for the shift. No major electrical grid issues reported.",
                "engineering_notes": "Highlights:\n- Blast Furnace #1 running at 92% capacity.\n- Cooling water circuit pressure steady at 4.2 bar.\n- Air compressor C-701 oil level checked and found normal.\n- Reheat furnace temperature stable at 1150C.",
                "tables": [
                    ["Area", "Status", "Log Comment", "Action Required"],
                    ["Utility Bay", "Normal", "All compressors running", "None"],
                    ["Rolling Mill", "Normal", "Billet transfer active", "None"],
                    ["Water Treatment", "Normal", "pH level at 7.4", "Regular dosage check"]
                ],
                "recommendations": "Keep close watch on P-101 standby pump startup if primary pump vibration increases.",
                "references": []
            }
            self.documents.append(doc)

    def fill_daily_operator_logs(self):
        needed = self.config["document_counts"]["daily_operator_logs"]
        o_counter = 100
        for i in range(needed):
            date = self.get_random_date()
            prep = random.choice(self.get_employees_by_dept("OPS"))
            rev = random.choice(self.get_employees_by_dept("OPS"))
            appr = random.choice(self.get_employees_by_dept("OPS"))
            
            doc = {
                "doc_id": f"OPR-LOG-{o_counter + i}",
                "type": "DailyOperatorLog",
                "title": f"Daily Operator Parameters Log - Utilities",
                "date": date,
                "equipment_tag": "UTILITY-BAY",
                "equipment_name": "Plant Utilities Sector",
                "department": "OPS",
                "prepared_by": prep["name"],
                "prepared_by_id": prep["emp_id"],
                "reviewed_by": rev["name"],
                "reviewed_by_id": rev["emp_id"],
                "approved_by": appr["name"],
                "approved_by_id": appr["emp_id"],
                "revision": "R0",
                "risk_level": "Low",
                "observations": "Routine parameter logging for utility sector equipment.",
                "engineering_notes": "Log sheet entries for pressure, temperature, flow, and levels. All checks performed at 08:00, 12:00, and 16:00.",
                "tables": [
                    ["Parameter", "Normal Range", "Value Logged", "Deviation Code"],
                    ["Steam drum pressure", "40-42 bar", "41.2 bar", "NORMAL"],
                    ["Instrument Air Pressure", "7.0-7.5 bar", "7.2 bar", "NORMAL"],
                    ["Cooling Water Temp", "32-38 C", "34.5 C", "NORMAL"]
                ],
                "recommendations": "Check air dryer purge valves for sticking. Bleed moisture separator drain manually.",
                "references": []
            }
            self.documents.append(doc)

    def fill_lubrication_reports(self):
        current_count = len([d for d in self.documents if d["type"] == "Lubrication"])
        needed = self.config["document_counts"]["lubrication_reports"] - current_count
        if needed <= 0:
            return
            
        l_counter = 1000
        for i in range(needed):
            asset = random.choice([a for a in self.assets if a["class"] in ["P", "M", "C"]])
            date = self.get_random_date()
            prep = random.choice(self.get_employees_by_dept("MECH"))
            rev = random.choice(self.get_employees_by_dept("MECH"))
            appr = random.choice(self.get_employees_by_dept("OPS"))
            
            doc = {
                "doc_id": f"LUB-{l_counter + i}",
                "type": "Lubrication",
                "title": f"Lubrication Audit and Top-Up Report - {asset['name']}",
                "date": date,
                "equipment_tag": asset["tag"],
                "equipment_name": asset["name"],
                "department": "MECH",
                "prepared_by": prep["name"],
                "prepared_by_id": prep["emp_id"],
                "reviewed_by": rev["name"],
                "reviewed_by_id": rev["emp_id"],
                "approved_by": appr["name"],
                "approved_by_id": appr["emp_id"],
                "revision": "R0",
                "risk_level": "Low",
                "observations": f"Routine lubrication check performed for {asset['name']}. Checked oil level, color and grease condition.",
                "engineering_notes": "Lubrication tasks completed:\n- Cleaned oil sight glass: OK\n- Added 0.5 Litres of Mobilux EP2 / Mobil DTE oil.\n- Inspected for oil leaks: None found.",
                "tables": [
                    ["Point Name", "Lubricant Type", "Action Taken", "Volume Added"],
                    ["Drive End Bearing", "Mobilux EP2 Grease", "Greased", "15 grams"],
                    ["Sump / Reservoir", "Mobil DTE Heavy", "Top-Up", "0.5 Litres"],
                    ["Coupling", "Grease", "Inspected", "None"]
                ],
                "recommendations": "Ensure oil drum caps are properly sealed in the storage room to prevent ambient moisture contamination.",
                "references": []
            }
            self.documents.append(doc)

    def fill_vibration_reports(self):
        current_count = len([d for d in self.documents if d["type"] == "Vibration"])
        needed = self.config["document_counts"]["vibration_reports"] - current_count
        if needed <= 0:
            return
            
        v_counter = 1000
        for i in range(needed):
            asset = random.choice([a for a in self.assets if a["class"] in ["P", "M", "C"]])
            date = self.get_random_date()
            prep = random.choice(self.get_employees_by_dept("MECH"))
            rev = random.choice(self.get_employees_by_dept("MECH"))
            appr = random.choice(self.get_employees_by_dept("OPS"))
            
            doc = {
                "doc_id": f"VIB-{v_counter + i}",
                "type": "Vibration",
                "title": f"Vibration Analysis & Monitoring Report - {asset['name']}",
                "date": date,
                "equipment_tag": asset["tag"],
                "equipment_name": asset["name"],
                "department": "MECH",
                "prepared_by": prep["name"],
                "prepared_by_id": prep["emp_id"],
                "reviewed_by": rev["name"],
                "reviewed_by_id": rev["emp_id"],
                "approved_by": appr["name"],
                "approved_by_id": appr["emp_id"],
                "revision": "R0",
                "risk_level": "Low",
                "observations": f"Conducted quarterly vibration analysis on {asset['name']}. Overall velocity levels remain within normal ISO 10816 limits.",
                "engineering_notes": "Measurements register:\n- Axial: 1.8 mm/s RMS (Good)\n- Horizontal: 2.1 mm/s RMS (Good)\n- Vertical: 1.5 mm/s RMS (Good)\nFFT spectrum shows no dominant frequencies matching bearing or misalignment peaks.",
                "tables": [
                    ["Point Location", "Axis", "RMS Velocity (mm/s)", "Condition Assessment"],
                    ["Motor DE", "Horizontal", "2.1", "Normal Class I"],
                    ["Motor NDE", "Vertical", "1.5", "Normal Class I"],
                    ["Pump DE", "Axial", "1.8", "Normal Class I"]
                ],
                "recommendations": "No immediate maintenance actions. Keep regular vibration check schedule.",
                "references": []
            }
            self.documents.append(doc)

    def fill_training_records(self):
        needed = self.config["document_counts"]["training_records"]
        t_counter = 100
        for i in range(needed):
            date = self.get_random_date()
            prep = random.choice(self.get_employees_by_dept("HSE"))
            rev = random.choice(self.get_employees_by_dept("OPS"))
            appr = random.choice(self.get_employees_by_dept("HSE"))
            
            doc = {
                "doc_id": f"TRN-{t_counter + i}",
                "type": "Training",
                "title": "Industrial Safety and SOP Certification Training",
                "date": date,
                "equipment_tag": "PLANT-WIDE",
                "equipment_name": "Standard Safety Training",
                "department": "HSE",
                "prepared_by": prep["name"],
                "prepared_by_id": prep["emp_id"],
                "reviewed_by": rev["name"],
                "reviewed_by_id": rev["emp_id"],
                "approved_by": appr["name"],
                "approved_by_id": appr["emp_id"],
                "revision": "R0",
                "risk_level": "Low",
                "observations": "Conducted safety refresher training module for plant technicians and control room operators. Focus areas: LOTO procedures, acid handling, and high-pressure system safety.",
                "engineering_notes": "Training topics details:\n1. Lockout-Tagout-Tryout (LOTOTO) protocol implementation.\n2. Chemical safety and acid spill neutralizer deployment.\n3. Pressure vessel safety limits and relief valve checks.",
                "tables": [
                    ["Attendee Name", "Employee ID", "Designation", "Assessment Score"],
                    ["Suresh Kumar", "EMP-MECH-101", "Mechanical Fitter", "95% (Pass)"],
                    ["Venkatesh S", "EMP-MECH-102", "Rigger", "90% (Pass)"],
                    ["Rajesh R", "EMP-OPS-103", "Control Room Operator", "100% (Pass)"]
                ],
                "recommendations": "Technicians who passed are certified to perform critical hot jobs. Refresh certification in 1 year.",
                "references": []
            }
            self.documents.append(doc)

    def fill_calibration_reports(self):
        current_count = len([d for d in self.documents if d["type"] == "Calibration"])
        needed = self.config["document_counts"]["calibration_reports"] - current_count
        if needed <= 0:
            return
            
        c_counter = 1300
        for i in range(needed):
            # Select control valve or instrument/boiler
            asset = random.choice([a for a in self.assets if a["class"] in ["V", "B", "C"]])
            date = self.get_random_date()
            prep = random.choice(self.get_employees_by_dept("INC"))
            rev = random.choice(self.get_employees_by_dept("INC"))
            appr = random.choice(self.get_employees_by_dept("OPS"))
            
            doc = {
                "doc_id": f"CAL-{c_counter + i}",
                "type": "Calibration",
                "title": f"Instrumentation Calibration Report - {asset['name']}",
                "date": date,
                "equipment_tag": asset["tag"],
                "equipment_name": asset["name"],
                "department": "INC",
                "prepared_by": prep["name"],
                "prepared_by_id": prep["emp_id"],
                "reviewed_by": rev["name"],
                "reviewed_by_id": rev["emp_id"],
                "approved_by": appr["name"],
                "approved_by_id": appr["emp_id"],
                "revision": "R0",
                "risk_level": "Low",
                "observations": f"Completed standard calibration check for sensor instrumentation on {asset['name']}. Values are aligned within design tolerance limit.",
                "engineering_notes": "Calibration details:\n- Standard Instrument: fluke 789 calibrator\n- Zero offset adjust: none required\n- Span drift check: 0.12% span (within 0.5% tolerance limit)",
                "tables": [
                    ["Input Parameter", "True Value", "Indicated Value", "Error %"],
                    ["Pressure (0 bar)", "0.00 bar", "0.01 bar", "+0.1%"],
                    ["Pressure (5 bar)", "5.00 bar", "4.99 bar", "-0.1%"],
                    ["Pressure (10 bar)", "10.00 bar", "10.02 bar", "+0.2%"]
                ],
                "recommendations": "Sensor calibrator certified. Affixed calibration green sticker on the transmitter dial.",
                "references": []
            }
            self.documents.append(doc)

    def fill_emails(self):
        needed = self.config["document_counts"]["emails"]
        e_counter = 100
        for i in range(needed):
            date = self.get_random_date()
            prep = random.choice(self.employees)
            # Find a recipient in the same or different department
            rev = random.choice([e for e in self.employees if e["emp_id"] != prep["emp_id"]])
            
            doc = {
                "doc_id": f"EML-{e_counter + i}",
                "type": "Email",
                "title": f"Technical Update: Scheduled maintenance discussion",
                "date": date,
                "equipment_tag": "PLANT-WIDE",
                "equipment_name": "General Correspondence",
                "department": prep["department"],
                "prepared_by": prep["name"],
                "prepared_by_id": prep["emp_id"],
                "reviewed_by": rev["name"],
                "reviewed_by_id": rev["emp_id"],
                "approved_by": rev["name"],  # Just duplicate for approval fields
                "approved_by_id": rev["emp_id"],
                "revision": "N/A",
                "risk_level": "Low",
                "observations": f"Subject: Coordination of shutdown scheduling\nFrom: {prep['email']}\nTo: {rev['email']}\n\nHi {rev['name']},\n\nWe need to align on the scheduled outage window for the upcoming week. The mechanical team needs 4 hours for filter replacement. Let me know if you can release the equipment during the night shift.",
                "engineering_notes": "Please verify if standby compressors are healthy before confirming the schedule.",
                "tables": [
                    ["Proposed Outage Date", "Duration", "Asset Tag", "Operations Contact"],
                    [(date + timedelta(days=2)).strftime("%Y-%m-%d"), "4 hours", "C-701", "Shift In-Charge"]
                ],
                "recommendations": "Ensure LOTO coordinator is notified.",
                "references": []
            }
            self.documents.append(doc)
