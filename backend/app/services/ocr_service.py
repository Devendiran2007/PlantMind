import os
import fitz # PyMuPDF
from PIL import Image
import io
import logging

logger = logging.getLogger(__name__)

# Try importing pytesseract, handle import failures gracefully
try:
    import pytesseract
except ImportError:
    pytesseract = None

class OcrService:
    @staticmethod
    def extract_text_from_pdf(file_path: str) -> str:
        text = ""
        try:
            doc = fitz.open(file_path)
            for page in doc:
                text += page.get_text()
            
            # If the PDF is scanned (contains no text), fallback to OCR via Tesseract if available
            if not text.strip():
                logger.info("PDF contains no selectable text. Attempting Tesseract OCR page rendering...")
                if pytesseract:
                    for page_num in range(len(doc)):
                        page = doc.load_page(page_num)
                        pix = page.get_pixmap(dpi=150)
                        img_data = pix.tobytes("png")
                        image = Image.open(io.BytesIO(img_data))
                        try:
                            text += pytesseract.image_to_string(image) + "\n"
                        except Exception as ocr_ex:
                            logger.warning(f"Tesseract page execution failed: {ocr_ex}")
                            text += f"\n[Scanned Page {page_num + 1} Metadata Ingestion]\n"
                else:
                    logger.warning("pytesseract binary or binding not found. Falling back to layout tags.")
                    text = "\n".join([f"[Scanned Engineering Layout Page {i+1}]" for i in range(len(doc))])
            doc.close()
        except Exception as e:
            logger.error(f"PyMuPDF parser encountered error on {file_path}: {e}")
            text = f"[Ingestion error reading PDF layout: {e}]"
        return text

    @staticmethod
    def extract_text_from_image(file_path: str) -> str:
        try:
            if pytesseract:
                image = Image.open(file_path)
                return pytesseract.image_to_string(image)
            else:
                logger.warning("Tesseract engine not bound. Returning image registry tag.")
                return f"[Ingested Image: {os.path.basename(file_path)} (OCR processing bypassed)]"
        except Exception as e:
            logger.error(f"Image extraction error on {file_path}: {e}")
            return f"[Image Metadata Ingest: {os.path.basename(file_path)}]"
