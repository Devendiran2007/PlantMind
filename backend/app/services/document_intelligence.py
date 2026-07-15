import os
import re
import time
import logging
from PIL import Image
import io

# Parsers
import fitz # PyMuPDF
import docx
import openpyxl

logger = logging.getLogger(__name__)

# Try importing pytesseract
try:
    import pytesseract
except ImportError:
    pytesseract = None

class DocumentIntelligenceEngine:
    @staticmethod
    def process_document(file_path: str) -> dict:
        """
        Main orchestration endpoint:
        1. Detect type
        2. Extract raw text
        3. Normalize text
        4. Extract entities
        5. Returns structured JSON containing Text, Metadata, Entities, and Processing Time.
        """
        start_time = time.perf_counter()
        
        # 1. Detect file type
        filename = os.path.basename(file_path)
        ext = filename.split(".")[-1].lower() if "." in filename else "unknown"
        
        logger.info(f"Processing document intelligence pipeline for: {filename} (Format: {ext})")
        
        # 2. Extract raw text
        raw_text = ""
        metadata = {
            "filename": filename,
            "format": ext,
            "size_bytes": os.path.getsize(file_path)
        }
        
        try:
            if ext == "pdf":
                raw_text, pdf_meta = DocumentIntelligenceEngine._extract_pdf(file_path)
                metadata.update(pdf_meta)
            elif ext == "docx":
                raw_text = DocumentIntelligenceEngine._extract_docx(file_path)
            elif ext == "xlsx":
                raw_text = DocumentIntelligenceEngine._extract_xlsx(file_path)
            elif ext == "csv":
                raw_text = DocumentIntelligenceEngine._extract_csv(file_path)
            elif ext == "json":
                raw_text = DocumentIntelligenceEngine._extract_json(file_path)
            elif ext in {"html", "htm"}:
                raw_text = DocumentIntelligenceEngine._extract_html(file_path)
            elif ext in {"png", "jpg", "jpeg"}:
                raw_text = DocumentIntelligenceEngine._extract_image(file_path)
            elif ext in {"txt", "md"}:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    raw_text = f.read()
            else:
                raw_text = f"[Unsupported document format: {ext}]"
        except Exception as err:
            logger.error(f"Failed extracting text from {filename}: {err}")
            raw_text = f"[Ingestion Error: {err}]"

        # 3. Normalize text
        normalized_text = DocumentIntelligenceEngine._normalize_text(raw_text)
        
        # 4. Extract entities
        entities = DocumentIntelligenceEngine._extract_entities(normalized_text)
        
        processing_time = time.perf_counter() - start_time
        
        return {
            "extracted_text": normalized_text,
            "metadata": metadata,
            "entities": entities,
            "processing_time_seconds": round(processing_time, 4)
        }

    @staticmethod
    def _extract_pdf(file_path: str) -> tuple[str, dict]:
        text = ""
        metadata = {}
        doc = fitz.open(file_path)
        metadata["pages"] = len(doc)
        
        # Read text pages
        for page in doc:
            text += page.get_text()
            
        # If PDF is scanned, trigger OCR
        if not text.strip():
            logger.info("PDF has no embedded text. Running Tesseract OCR on rendering pages...")
            metadata["is_scanned"] = True
            if pytesseract:
                for page_num in range(len(doc)):
                    page = doc.load_page(page_num)
                    pix = page.get_pixmap(dpi=150)
                    img_data = pix.tobytes("png")
                    image = Image.open(io.BytesIO(img_data))
                    try:
                        text += pytesseract.image_to_string(image) + "\n"
                    except Exception as ocr_err:
                        logger.warning(f"OCR failed on PDF page {page_num}: {ocr_err}")
            else:
                logger.warning("pytesseract not available for scanned PDF. Using index tags.")
                text = "\n".join([f"[Scanned page {i+1}]" for i in range(len(doc))])
        else:
            metadata["is_scanned"] = False
            
        doc.close()
        return text, metadata

    @staticmethod
    def _extract_docx(file_path: str) -> str:
        doc_obj = docx.Document(file_path)
        paragraphs = [para.text for para in doc_obj.paragraphs]
        return "\n".join(paragraphs)

    @staticmethod
    def _extract_xlsx(file_path: str) -> str:
        wb = openpyxl.load_workbook(file_path, read_only=True)
        lines = []
        for sheet in wb.worksheets:
            lines.append(f"--- Sheet: {sheet.title} ---")
            for row in sheet.iter_rows(values_only=True):
                # Join cells
                row_str = " | ".join([str(cell) for cell in row if cell is not None])
                if row_str.strip():
                    lines.append(row_str)
        return "\n".join(lines)

    @staticmethod
    def _extract_csv(file_path: str) -> str:
        import csv
        lines = []
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            reader = csv.reader(f)
            for row_idx, row in enumerate(reader):
                row_str = " | ".join([cell.strip() for cell in row if cell is not None])
                if row_str.strip():
                    lines.append(f"Row {row_idx + 1}: {row_str}")
        return "\n".join(lines)

    @staticmethod
    def _extract_json(file_path: str) -> str:
        import json
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            data = json.load(f)
        if isinstance(data, dict):
            lines = []
            for k, v in data.items():
                if isinstance(v, (dict, list)):
                    lines.append(f"{k}: {json.dumps(v)}")
                else:
                    lines.append(f"{k}: {v}")
            return "\n".join(lines)
        return json.dumps(data, indent=2)

    @staticmethod
    def _extract_html(file_path: str) -> str:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            html = f.read()
        # Remove script, style, head blocks
        text = re.sub(r"<(script|style|head)[^>]*>([\s\S]*?)<\/\1>", "", html, flags=re.IGNORECASE)
        # Strip all HTML tags
        text = re.sub(r"<[^>]+>", " ", text)
        # Standard entities replacements
        text = text.replace("&nbsp;", " ").replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", '"')
        return text

    @staticmethod
    def _extract_image(file_path: str) -> str:
        if pytesseract:
            image = Image.open(file_path)
            return pytesseract.image_to_string(image)
        return f"[Image OCR unavailable: pytesseract module is not loaded]"

    @staticmethod
    def _normalize_text(text: str) -> str:
        """
        Normalize text payload:
        1. Remove page headers/footers noise (e.g. standard ISO labels, 'Page X of Y', 'CONFIDENTIAL')
        2. Remove duplicate whitespaces / multiple newlines.
        """
        # Strip common header/footer metadata strings
        patterns_to_remove = [
            r"(?i)page\s+\d+\s+of\s+\d+",
            r"(?i)confidential\s+-\s+internal\s+use\s+only",
            r"(?i)all\s+rights\s+reserved",
            r"PM-PID-PWR-[A-Z0-9\-]+" # Mock document codes
        ]
        
        lines = text.split("\n")
        cleaned_lines = []
        
        for line in lines:
            # Check if line is a common header/footer indicator
            skip_line = False
            for pat in patterns_to_remove:
                if re.search(pat, line.strip()):
                    skip_line = True
                    break
            
            # Skip short numeric footers (like page numbers "1", "2")
            if line.strip().isdigit() and len(line.strip()) <= 3:
                skip_line = True
                
            if not skip_line:
                cleaned_lines.append(line)
                
        cleaned_text = "\n".join(cleaned_lines)
        
        # Remove duplicate spaces
        cleaned_text = re.sub(r"[ \t]+", " ", cleaned_text)
        
        # Collapse multiple newlines into double newlines (paragraphs)
        cleaned_text = re.sub(r"\n\s*\n+", "\n\n", cleaned_text)
        
        return cleaned_text.strip()

    @staticmethod
    def _extract_entities(text: str) -> dict:
        """
        Compile regular expressions to extract industrial parameters:
        - Equipment IDs (e.g. P-101, HX-301, EQ-B3, M-501)
        - Engineer Names (standard Title-case name checks)
        - Dates (YYYY-MM-DD or MM/DD/YYYY)
        - Incident IDs (INC-2026-089)
        - Work Orders (WO-3021)
        - Fault Codes (FC-301)
        - Temperatures (e.g. 542°C, 920 C)
        - Pressures (e.g. 168 bar, 32 psi, 12 kPa)
        """
        # Regex Definitions
        equip_pattern = r"\b[A-Z]{1,3}-\d{2,4}\b"
        incident_pattern = r"\bINC-\d{4}-\d{2,4}\b"
        wo_pattern = r"\bWO-\d{3,6}\b"
        fault_pattern = r"\bFC-\d{2,4}\b"
        
        # Telemetry
        temp_pattern = r"\b\d+(?:\.\d+)?\s*(?:°C|°F|C|F)\b"
        pressure_pattern = r"\b\d+(?:\.\d+)?\s*(?:bar|psi|kPa|MPa|atm)\b"
        
        # Dates
        date_pattern = r"\b\d{4}-\d{2}-\d{2}\b|\b\d{2}/\d{2}/\d{4}\b"
        
        # Names (e.g. Sarah Chen, J. Marcus, Operator B)
        name_pattern = r"\b[A-Z][a-z]+\s+[A-Z][a-z]+\b|\b[A-Z]\.\s+[A-Z][a-z]+\b"

        # Search matches
        equipment_ids = sorted(list(set(re.findall(equip_pattern, text))))
        incidents = sorted(list(set(re.findall(incident_pattern, text))))
        work_orders = sorted(list(set(re.findall(wo_pattern, text))))
        fault_codes = sorted(list(set(re.findall(fault_pattern, text))))
        temperatures = sorted(list(set(re.findall(temp_pattern, text))))
        pressures = sorted(list(set(re.findall(pressure_pattern, text))))
        dates = sorted(list(set(re.findall(date_pattern, text))))
        
        # Exclude common keywords that match name patterns
        common_exclusions = {"Boiler Block", "Steam Boiler", "Gas Turbine", "Process Safety", "Safety Officer", "Refinery Column", "Fractional Distillation"}
        raw_names = re.findall(name_pattern, text)
        names = sorted(list(set([n for n in raw_names if n not in common_exclusions])))

        return {
            "equipment_ids": equipment_ids,
            "engineer_names": names,
            "dates": dates,
            "incident_ids": incidents,
            "work_order_ids": work_orders,
            "fault_codes": fault_codes,
            "temperatures": temperatures,
            "pressures": pressures
        }
