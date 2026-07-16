import os
import io
import json
import logging
import sys
from PIL import Image

# Reconfigure stdout/stderr to UTF-8 on Windows to prevent Unicode progress bar crashes
try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

logger = logging.getLogger(__name__)

# Attempt to import EasyOCR and PyTesseract safely
try:
    import easyocr
except ImportError:
    easyocr = None

try:
    import pytesseract
except ImportError:
    pytesseract = None

class OcrEngine:
    _easyocr_reader = None

    @classmethod
    def _get_easyocr_reader(cls):
        """
        Lazily initialize the EasyOCR reader to prevent startup lag.
        """
        if cls._easyocr_reader is None and easyocr is not None:
            try:
                logger.info("Initializing EasyOCR reader...")
                cls._easyocr_reader = easyocr.Reader(['en'], gpu=False)
            except Exception as e:
                logger.error(f"Failed to initialize EasyOCR: {e}")
        return cls._easyocr_reader

    @classmethod
    def perform_ocr(cls, image_payload) -> dict:
        """
        Perform OCR on an image (PIL Image, bytes, or file path).
        Returns a dict containing:
        - text: extracted full string
        - confidence: average confidence score (0-100)
        - words: list of dicts with {"word": "...", "bbox": [...], "confidence": ...}
        """
        # Convert image payload to PIL Image if needed
        image = None
        if isinstance(image_payload, bytes):
            image = Image.open(io.BytesIO(image_payload))
        elif isinstance(image_payload, str):
            image = Image.open(image_payload)
        else:
            image = image_payload

        # Ensure image is in RGB format for OCR
        if image.mode != "RGB":
            image = image.convert("RGB")

        extracted_text = ""
        avg_confidence = 80.0
        words_list = []

        # 1. Attempt EasyOCR first
        reader = cls._get_easyocr_reader()
        if reader is not None:
            try:
                # Save PIL to temporary byte stream for EasyOCR
                buf = io.BytesIO()
                image.save(buf, format="PNG")
                img_bytes = buf.getvalue()
                
                results = reader.readtext(img_bytes)
                
                text_parts = []
                conf_sum = 0
                count = 0
                
                for bbox, word_text, confidence in results:
                    text_parts.append(word_text)
                    conf_sum += confidence
                    count += 1
                    
                    # Convert bounding box coordinates to list of lists
                    # bbox format: [[x0, y0], [x1, y1], [x2, y2], [x3, y3]]
                    bbox_list = [[float(pt[0]), float(pt[1])] for pt in bbox]
                    
                    words_list.append({
                        "word": word_text,
                        "bbox": bbox_list,
                        "confidence": round(float(confidence) * 100, 2)
                    })
                
                extracted_text = " ".join(text_parts)
                if count > 0:
                    avg_confidence = round((conf_sum / count) * 100, 2)
                
                logger.info(f"EasyOCR completed successfully. Extracted {count} words. Avg Confidence: {avg_confidence}%")
                return {
                    "text": extracted_text,
                    "confidence": avg_confidence,
                    "words": words_list
                }
            except Exception as e:
                logger.warning(f"EasyOCR execution failed: {e}. Falling back to PyTesseract OCR.")

        # 2. Fallback to Tesseract OCR
        if pytesseract is not None:
            try:
                # Get detailed word layout and bounding boxes
                tess_data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
                
                text_parts = []
                conf_sum = 0
                count = 0
                n_items = len(tess_data["text"])
                
                for i in range(n_items):
                    w_text = tess_data["text"][i].strip()
                    if not w_text:
                        continue
                    
                    text_parts.append(w_text)
                    conf = float(tess_data["conf"][i])
                    
                    # Tesseract confidence ranges from 0-100. -1 indicates layout metadata/headers.
                    if conf >= 0:
                        conf_sum += conf
                        count += 1
                    else:
                        conf = 80.0
                    
                    # Convert box to standard coordinates
                    x = float(tess_data["left"][i])
                    y = float(tess_data["top"][i])
                    w = float(tess_data["width"][i])
                    h = float(tess_data["height"][i])
                    
                    bbox_list = [
                        [x, y],
                        [x + w, y],
                        [x + w, y + h],
                        [x, y + h]
                    ]
                    
                    words_list.append({
                        "word": w_text,
                        "bbox": bbox_list,
                        "confidence": round(conf, 2)
                    })
                
                extracted_text = " ".join(text_parts)
                if count > 0:
                    avg_confidence = round(conf_sum / count, 2)
                
                logger.info(f"Tesseract OCR completed successfully. Extracted {len(words_list)} words. Avg Confidence: {avg_confidence}%")
                return {
                    "text": extracted_text,
                    "confidence": avg_confidence,
                    "words": words_list
                }
            except Exception as e:
                logger.error(f"Tesseract OCR execution failed: {e}")

        # 3. Fallback Layout Mocks if no OCR engine is available
        logger.warning("No functional OCR engine detected. Generating index tag layouts.")
        filename = getattr(image, "filename", "scanned_layout.png")
        if filename:
            filename = os.path.basename(filename)
        extracted_text = f"[Scanned Engineering Layout: {filename} Ingestion Bypassed]"
        return {
            "text": extracted_text,
            "confidence": 50.0,
            "words": [{
                "word": extracted_text,
                "bbox": [[0.0, 0.0], [100.0, 0.0], [100.0, 100.0], [0.0, 100.0]],
                "confidence": 50.0
            }]
        }

    @staticmethod
    def save_ocr_output(doc_id: str, ocr_data: dict, processed_dir: str = "./processed") -> str:
        """
        Save OCR data to disk in JSON format inside the processed/ directory.
        """
        os.makedirs(processed_dir, exist_ok=True)
        file_name = f"ocr_{doc_id}.json"
        file_path = os.path.join(processed_dir, file_name)
        try:
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(ocr_data, f, indent=4)
            logger.info(f"OCR JSON metadata output saved to: {file_path}")
        except Exception as e:
            logger.error(f"Failed to save OCR JSON output: {e}")
        return file_path
