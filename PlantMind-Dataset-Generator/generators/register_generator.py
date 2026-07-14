import os
from pathlib import Path
from generators.base_generator import BaseGenerator
from datetime import datetime

class RegisterGenerator(BaseGenerator):
    def __init__(self, output_dir):
        super().__init__(output_dir)

    def generate_all_registers(self, assets, employees):
        self.generate_asset_register(assets)
        self.generate_equipment_register(assets)
        self.generate_employee_directory(employees)
        self.generate_spare_parts_inventory()

    def generate_asset_register(self, assets):
        table_data = [["Asset Tag", "Asset Name", "Criticality", "Specifications"]]
        for a in assets:
            table_data.append([a["tag"], a["name"], a["criticality"], a["specs"]])

        doc_data = {
            "doc_id": "REG-AST-001",
            "type": "Equipment",
            "title": "Master Asset Register",
            "date": datetime(2022, 1, 1),
            "equipment_tag": "PLANT-WIDE",
            "equipment_name": "All Assets",
            "revision": "R0",
            "risk_level": "Low",
            "observations": "This register lists all physical assets commissioned at the SteelForge Industries Hosur plant. The assets are classified according to their operational criticality and engineering specifications.",
            "engineering_notes": "Asset tagging philosophy:\n- P: Pumps\n- HX: Heat Exchangers\n- V: Valves\n- M: Motors\n- B: Boilers\n- TK: Tanks\n- C: Compressors",
            "tables": table_data,
            "recommendations": "Ensure all modifications, decommissions, or relocations are updated in this register via the management of change (MOC) process.",
            "prepared_by": "Karthik Ramaswamy",
            "prepared_by_id": "EMP-DIR-01",
            "reviewed_by": "Suresh Kumar",
            "reviewed_by_id": "EMP-MECH-101",
            "approved_by": "Karthik Ramaswamy",
            "approved_by_id": "EMP-DIR-01",
            "references": []
        }
        
        self.generate_pdf(doc_data, "Equipment")
        self.generate_docx(doc_data, "Equipment")

    def generate_equipment_register(self, assets):
        # Adds OEM details, serial numbers, and locations
        table_data = [["Tag", "Name", "OEM Manufacturer", "Serial Number", "Location"]]
        oems = ["Kirloskar Pumps", "Thermax Boilers", "Atlas Copco", "Siemens Ltd", "Audco Valves", "L&T Heavy Eng"]
        
        for idx, a in enumerate(assets):
            oem = oems[idx % len(oems)]
            serial = f"S/N-SF-{10000 + idx}"
            
            # Location mapping
            if a["class"] == "P":
                loc = "Cooling Tower Pump House"
            elif a["class"] == "HX":
                loc = "Heat Exchanger Yard"
            elif a["class"] == "V":
                loc = "Control Valve Gallery"
            elif a["class"] == "M":
                loc = "Motor Control Center (MCC)"
            elif a["class"] == "B":
                loc = "Boiler Utilities House"
            elif a["class"] == "TK":
                loc = "Acid & Chemical Storage Yard"
            else:
                loc = "Central Utility Bay"
                
            table_data.append([a["tag"], a["name"], oem, serial, loc])

        doc_data = {
            "doc_id": "REG-EQP-001",
            "type": "Equipment",
            "title": "Master Equipment Register",
            "date": datetime(2022, 1, 1),
            "equipment_tag": "PLANT-WIDE",
            "equipment_name": "All Equipment",
            "revision": "R0",
            "risk_level": "Low",
            "observations": "This register provides trace information of physical equipment tags, including manufacturer detail and location boundaries inside the SteelForge plant.",
            "engineering_notes": "Serial numbers and physical manufacturer specifications are mapped directly to parent tags. Physical inspection checks must verify alignment with nameplate details.",
            "tables": table_data,
            "recommendations": "Verify physical nameplates on equipment match the records inside this register during the annual inspection audit.",
            "prepared_by": "Karthik Ramaswamy",
            "prepared_by_id": "EMP-DIR-01",
            "reviewed_by": "Suresh Kumar",
            "reviewed_by_id": "EMP-MECH-101",
            "approved_by": "Karthik Ramaswamy",
            "approved_by_id": "EMP-DIR-01",
            "references": [{"doc_id": "REG-AST-001", "relationship": "derived_from"}]
        }
        
        self.generate_pdf(doc_data, "Equipment")
        self.generate_docx(doc_data, "Equipment")

    def generate_employee_directory(self, employees):
        table_data = [["ID", "Name", "Department", "Designation", "Supervisor"]]
        
        # Add subset of employees to table to avoid overflow in document layout
        for e in employees[:35]:  # Show first 35 employees in document table
            table_data.append([e["emp_id"], e["name"], e["department"], e["designation"], e["supervisor"]])

        doc_data = {
            "doc_id": "DIR-EMP-001",
            "type": "Training",
            "title": "Plant Employee Directory",
            "date": datetime(2022, 1, 1),
            "equipment_tag": "PLANT-WIDE",
            "equipment_name": "General Directory",
            "revision": "R0",
            "risk_level": "Low",
            "observations": "This directory contains the list of engineering staff, maintenance technicians, safety coordinators, and management personnel at SteelForge Pvt Ltd, Hosur.",
            "engineering_notes": f"Total active workforce in database: {len(employees)}. This document displays active operations & maintenance staff with supervisor mappings.",
            "tables": table_data,
            "recommendations": "Ensure directory updates are coordinated with HR whenever personnel shift departments or leave the company.",
            "prepared_by": "Karthik Ramaswamy",
            "prepared_by_id": "EMP-DIR-01",
            "reviewed_by": "Karthik Ramaswamy",
            "reviewed_by_id": "EMP-DIR-01",
            "approved_by": "Karthik Ramaswamy",
            "approved_by_id": "EMP-DIR-01",
            "references": []
        }
        
        self.generate_pdf(doc_data, "Training")
        self.generate_docx(doc_data, "Training")

    def generate_spare_parts_inventory(self):
        spares = [
            ("SP-BRG-6312", "SKF 6312-C3 Bearing", "P-101 / M-501", "10 units", "₹8,500", "2 units", "9 Days"),
            ("SP-SEAL-GLD12", "PTFE Gland Packing 12mm", "P-198", "5 rolls", "₹4,200", "1 roll", "3 Days"),
            ("SP-INST-R3051", "Rosemount 3051S Transmitter", "B-401 / V-204", "1 unit", "₹65,000", "1 unit", "15 Days"),
            ("SP-VALV-SEAT", "Stellite Valve Seat DN200", "V-203 / V-205", "2 units", "₹22,000", "1 unit", "30 Days"),
            ("SP-COMP-FILT", "Separator Element C-701", "C-701 / C-702", "4 units", "₹14,500", "1 unit", "5 Days"),
            ("SP-NEO-PLUG", "Neoprene Scraping Plugs", "HX-301 / HX-302", "150 units", "₹80", "50 units", "10 Days"),
            ("SP-O-RING-KIT", "Viton O-Ring Box Set", "General", "8 sets", "₹1,500", "2 sets", "2 Days"),
            ("SP-LUB-MOB2", "Mobilux EP2 Grease (18kg)", "General", "6 pails", "₹11,000", "2 pails", "3 Days"),
            ("SP-LUB-ROT1", "Roto-Inject Comp Oil (20L)", "C-701 / C-702", "8 pails", "₹18,500", "2 pails", "4 Days"),
            ("SP-LOTO-PAD", "Master Lock LOTO Padlock", "Safety", "50 units", "₹950", "10 units", "5 Days")
        ]
        
        table_data = [["Part Number", "Description", "Application", "Stock Qty", "Unit Price", "Reorder Level", "Lead Time"]]
        for sp in spares:
            table_data.append(list(sp))

        doc_data = {
            "doc_id": "INV-SPR-001",
            "type": "SpareParts",
            "title": "Critical Spare Parts Inventory Status",
            "date": datetime(2022, 1, 1),
            "equipment_tag": "PLANT-WIDE",
            "equipment_name": "Warehouse Inventory",
            "revision": "R0",
            "risk_level": "Low",
            "observations": "Inventory assessment for safety-critical spare parts. Table details active stock balances, purchase cost, reorder levels, and average lead times.",
            "engineering_notes": "Safety critical spares are classified under reliability guidelines. Stockouts of A-class spares directly impact plant uptime.",
            "tables": table_data,
            "recommendations": "1. Update ERP systems with reorder triggers to prevent stockouts.\n2. Do not negotiate critical safety vendor contracts beyond standard timelines.",
            "prepared_by": "Karthik Ramaswamy",
            "prepared_by_id": "EMP-DIR-01",
            "reviewed_by": "Suresh Kumar",
            "reviewed_by_id": "EMP-MECH-101",
            "approved_by": "Karthik Ramaswamy",
            "approved_by_id": "EMP-DIR-01",
            "references": [{"doc_id": "REG-AST-001", "relationship": "supports_assets"}]
        }
        
        self.generate_pdf(doc_data, "SpareParts")
        self.generate_docx(doc_data, "SpareParts")
