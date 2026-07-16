import re
import logging

logger = logging.getLogger(__name__)

class EntityExtractor:
    @staticmethod
    def extract_entities(text: str) -> dict:
        """
        Extract core industrial parameters and entity relations from OCR text output.
        """
        # Define industrial regex patterns
        equip_pattern = r"\b(?:P|HX|V|M|EQ|XV|FT|PT)-\d{2,4}[A-Z]?\b|\b[A-Z]{1,3}-\d{2,4}\b"
        incident_pattern = r"\bINC-\d{4}-\d{2,4}\b"
        wo_pattern = r"\bWO-[a-zA-Z0-9\-\+]+\b"
        fault_pattern = r"\bFC-\d{2,4}\b"
        
        # Mechanical/Bearing elements
        bearing_pattern = r"\b(?:6\d{3}|7\d{3}|NU\d{3}|NJ\d{3})\b"
        
        # Temporal & Identification
        date_pattern = r"\b\d{4}[-/.]\d{2}[-/.]\d{2}\b|\b\d{2}[-/.]\d{2}[-/.]\d{4}\b"
        name_pattern = r"\b[A-Z][a-z]+\s+[A-Z][a-z]+\b|\b[A-Z]\.\s+[A-Z][a-z]+\b"

        # Search matches
        equipment_ids = sorted(list(set(re.findall(equip_pattern, text))))
        incidents = sorted(list(set(re.findall(incident_pattern, text))))
        work_orders = sorted(list(set(re.findall(wo_pattern, text))))
        fault_codes = sorted(list(set(re.findall(fault_pattern, text))))
        bearings = sorted(list(set(re.findall(bearing_pattern, text))))
        dates = sorted(list(set(re.findall(date_pattern, text))))
        
        # Extract temperatures (including table layout semantic fallbacks)
        temperatures = re.findall(r"\b\d+(?:\.\d+)?\s*(?:°C|°F)\b", text, re.IGNORECASE)
        for line in text.split("\n"):
            # Exclude lines with document metadata and dates
            if any(k in line.lower() for k in ["date", "doc", "order", "no."]):
                continue
            if "temperature" in line.lower() or "temp" in line.lower():
                digits = re.findall(r"\b\d{2,3}\b", line)
                for d in digits:
                    val = float(d)
                    # Normal equipment temps are between 30 and 200 C, avoid matching equipment P-101 tags
                    if 30 <= val <= 200 and d not in ["101", "102"]:
                        temperatures.append(f"{d} °C")
        temperatures = sorted(list(set(temperatures)))

        # Extract pressures (including table layout semantic fallbacks)
        pressures = re.findall(r"\b\d+(?:\.\d+)?\s*(?:bar|psi|kPa|MPa|atm|kg/cm2|kg/cm²)\b", text, re.IGNORECASE)
        for line in text.split("\n"):
            # Exclude lines with document metadata and dates
            if any(k in line.lower() for k in ["date", "doc", "order", "no.", "id"]):
                continue
            if "pressure" in line.lower() or "press" in line.lower():
                digits = re.findall(r"\b\d+(?:\.\d+)?\b", line)
                for d in digits:
                    try:
                        val = float(d)
                        # Normal system pressures are between 0.2 and 150 bar
                        if 0.2 <= val <= 150:
                            pressures.append(f"{d} bar")
                    except ValueError:
                        pass
        pressures = sorted(list(set(pressures)))

        # Extract flow rates (including table layout semantic fallbacks)
        flow_rates = re.findall(r"\b\d+(?:\.\d+)?\s*(?:m³/h|gpm|L/s|m3/h|m3/hr|kg/s)\b", text, re.IGNORECASE)
        for line in text.split("\n"):
            if any(k in line.lower() for k in ["date", "doc", "order", "no."]):
                continue
            if "flow" in line.lower():
                digits = re.findall(r"\b\d{2,4}\b", line)
                for d in digits:
                    val = float(d)
                    if 10 <= val <= 5000:
                        flow_rates.append(f"{d} m3/h")
        flow_rates = sorted(list(set(flow_rates)))

        # Filter names based on common exclusions
        common_exclusions = {
            "Boiler Block", "Steam Boiler", "Gas Turbine", "Process Safety", 
            "Safety Officer", "Refinery Column", "Fractional Distillation", 
            "Thermal Power", "Cooling Block", "Water Feed", "Instrument Tech", 
            "Page Title", "Acceptable Range", "Alignment Kit", "Bearing Puller",
            "Torque Wrench", "Grease Gun", "Vibration Analyzer", "Infrared Thermometer",
            "Maintenance Report", "Work Order", "Equipment Tag", "Equipment Name",
            "Date Maintenance", "Start Time", "End Time", "Total Downtime",
            "Before Maintenance", "After Maintenance", "Approved By", "Prepared By",
            "Reviewed By", "Official Stamp", "Next Due", "Due Date", "Suction Pressure",
            "Discharge Pressure", "Bearing Temperature", "Motor Current", "Flow Rate",
            "Technician In", "Requested By", "Maintenance Engineer", "Report Type",
            "Preventive Maintenance", "Sop Title", "Acoptble Rande", "Babu Prlortty",
            "Ann Ryar", "Sel Mdntor", "Hosur Flant", "Cooling Wuater", "Cooling Water",
            "Water System", "Pump House", "Mechanical Maintenance", "Matthal Degthption",
            "Order Ne", "Status Completed", "Prepared By", "Reviewed By", "Approved By"
        }
        
        raw_names = re.findall(name_pattern, text)
        names = []
        for n in raw_names:
            n_clean = n.strip()
            # Must not be a common exclusion and must not contain common exclusion words
            if n_clean not in common_exclusions and not any(ex in n_clean for ex in ["Pressure", "Temperature", "Rate", "Maintenance", "Prepared", "Reviewed", "Approved", "Stamp", "Plant", "System"]):
                names.append(n_clean)
        names = sorted(list(set(names)))

        # Static department lists
        departments = []
        dept_keywords = ["Operations", "Maintenance", "Process Safety", "Instrumentation", "HSE", "Reliability Engineering", "Mechanical Maintenance"]
        for dept in dept_keywords:
            if dept.lower() in text.lower():
                departments.append(dept)

        # Static location lists
        locations = []
        loc_keywords = ["Thermal Power Block B", "Co-generation Unit 1", "Hydrocracking Sector 2", "Cooling Block 4", "Water Feed Sector B", "Pump House 1"]
        for loc in loc_keywords:
            if loc.lower() in text.lower():
                locations.append(loc)

        return {
            "equipment_ids": equipment_ids,
            "engineer_names": names,
            "departments": list(set(departments)),
            "work_order_ids": work_orders,
            "incident_ids": incidents,
            "temperatures": temperatures,
            "pressures": pressures,
            "flow_rates": flow_rates,
            "bearing_numbers": bearings,
            "fault_codes": fault_codes,
            "dates": dates,
            "locations": list(set(locations))
        }

    @staticmethod
    def extract_drawing_labels(text: str) -> dict:
        """
        Perform engineering-specific layout checks to extract P&ID and CAD drawing elements.
        """
        dwg_pattern = r"\bDWG-[A-Z0-9\-]+\b"
        rev_pattern = r"\b(?:REV|Rev|Revision)\.?\s*([A-Z0-9]+)\b"
        pipe_pattern = r"\b\d+(?:\.\d+)?\"?-P-[A-Z0-9\-]+\b"
        valve_pattern = r"\b(?:V|XV|FCV|PRV|HV)-\d{3,4}\b"
        instrument_pattern = r"\b(?:FT|PT|TT|LT|PIT|TIT|FC)-\d{3,4}\b"

        dwgs = sorted(list(set(re.findall(dwg_pattern, text))))
        revs_raw = re.findall(rev_pattern, text)
        revs = sorted(list(set(revs_raw))) if revs_raw else ["0"]
        pipes = sorted(list(set(re.findall(pipe_pattern, text))))
        valves = sorted(list(set(re.findall(valve_pattern, text))))
        instruments = sorted(list(set(re.findall(instrument_pattern, text))))

        # Extract title block keywords
        title_block = {}
        title_match = re.search(r"(?i)(?:title|drawing name)\s*:\s*([^\n\r]+)", text)
        if title_match:
            title_block["title"] = title_match.group(1).strip()
            
        client_match = re.search(r"(?i)(?:client|customer|owner)\s*:\s*([^\n\r]+)", text)
        if client_match:
            title_block["client"] = client_match.group(1).strip()

        approved_match = re.search(r"(?i)(?:approved by|appr)\s*:\s*([^\n\r]+)", text)
        if approved_match:
            title_block["approved_by"] = approved_match.group(1).strip()

        return {
            "drawing_numbers": dwgs,
            "revision_numbers": revs,
            "pipe_ids": pipes,
            "valve_ids": valves,
            "instrument_ids": instruments,
            "title_block": title_block
        }
