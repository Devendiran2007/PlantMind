import os
import io
import time
import logging
from PIL import Image, ImageOps, ImageEnhance
from sqlalchemy.orm import Session

# Database setup
from app.database.session import SessionLocal
from app.models.document import Document
from app.services.rag_service import RagService
from app.ocr.ocr_engine import OcrEngine
from app.entity_extraction.extractor import EntityExtractor

logger = logging.getLogger(__name__)

# Safely import OpenCV and NumPy
try:
    import cv2
    import numpy as np
except ImportError:
    cv2 = None
    np = None

# Safely import PyMuPDF (fitz)
try:
    import fitz
except ImportError:
    fitz = None

class CvService:
    @staticmethod
    def preprocess_image(image_payload) -> tuple:
        """
        Preprocess image (PIL Image, bytes, or file path) using OpenCV or Pillow fallback.
        Returns a tuple: (cleaned_pil_image, warnings_list)
        """
        image = None
        if isinstance(image_payload, bytes):
            image = Image.open(io.BytesIO(image_payload))
        elif isinstance(image_payload, str):
            image = Image.open(image_payload)
        else:
            image = image_payload

        warnings = []
        
        # 1. Check resolution
        w, h = image.size
        if w < 1000 or h < 1000:
            warnings.append(f"Low resolution detected: {w}x{h}px. Scans should ideally be at least 1000px on the shortest edge.")

        # 2. Try OpenCV preprocessing
        if cv2 is not None and np is not None:
            try:
                # Convert PIL Image to OpenCV BGR format
                img_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
                
                # Grayscale conversion
                gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
                
                # Blurry image detection using Laplacian variance
                blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
                if blur_score < 100.0:
                    warnings.append(f"Image appears to be blurry (Focus Score: {round(blur_score, 1)}). Consider re-uploading a sharper scan.")

                # Noise removal
                denoised = cv2.fastNlMeansDenoising(gray, h=10, templateWindowSize=7, searchWindowSize=21)
                
                # Deskewing
                coords = np.column_stack(np.where(denoised > 0))
                if len(coords) > 0:
                    angle = cv2.minAreaRect(coords)[-1]
                    # Adjust rotation angle bounds
                    if angle < -45:
                        angle = -(90 + angle)
                    else:
                        angle = -angle
                    
                    if abs(angle) > 0.5 and abs(angle) < 45.0:
                        (ch, cw) = denoised.shape[:2]
                        center = (cw // 2, ch // 2)
                        M = cv2.getRotationMatrix2D(center, angle, 1.0)
                        denoised = cv2.warpAffine(denoised, M, (cw, ch), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)

                # Contrast & Shadow removal (Adaptive Thresholding)
                adaptive_thresh = cv2.adaptiveThreshold(
                    denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                    cv2.THRESH_BINARY, 15, 8
                )
                
                # Sharpen text using kernel convolution
                kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
                sharpened = cv2.filter2D(adaptive_thresh, -1, kernel)
                
                # Convert back to PIL Image
                cleaned_pil = Image.fromarray(sharpened)
                return cleaned_pil, warnings
            except Exception as e:
                logger.warning(f"OpenCV preprocessing failed: {e}. Falling back to Pillow pipeline.")

        # 3. Fallback Pillow Image Preprocessing
        try:
            # Grayscale
            gray_pil = ImageOps.grayscale(image)
            
            # Focus score estimate using pixel differences
            img_arr = np.array(gray_pil) if np is not None else []
            if len(img_arr) > 0:
                diff_var = np.var(np.diff(img_arr))
                if diff_var < 50.0:
                    warnings.append(f"Image appears to be blurry (Focus Score Est: {round(diff_var, 1)}).")
            
            # Increase contrast & sharpen
            enhancer = ImageEnhance.Contrast(gray_pil)
            high_contrast = enhancer.enhance(2.0)
            
            sharp_enhancer = ImageEnhance.Sharpness(high_contrast)
            sharpened_pil = sharp_enhancer.enhance(1.5)
            
            return sharpened_pil, warnings
        except Exception as e:
            logger.error(f"Pillow fallback preprocessing failed: {e}")
            
        return image, warnings

    @staticmethod
    def process_document(db: Session, file_path: str, uploaded_by: str, doc_id: str = None) -> dict:
        """
        Orchestrates the entire Computer Vision + RAG pipeline:
        1. Detect format (converts PDF pages into images).
        2. Enhance images using grayscaling, deskewing, noise-reduction, and sharpening.
        3. OCR the cleaned page layouts (EasyOCR + Tesseract).
        4. Extract industrial entities and P&ID engineering markers.
        5. Build NetworkX graph nodes & edges by mapping document parameters.
        6. Ingest text into SQLite and vector store chunks.
        """
        start_time = time.perf_counter()
        
        filename = os.path.basename(file_path)
        ext = filename.split(".")[-1].lower() if "." in filename else ""
        
        if not doc_id:
            doc_id = f"DOC-CV-{int(time.time())}"
        
        # Check files directory
        pages_images = []
        
        # Step 1: File conversion
        if ext == "pdf" and fitz is not None:
            try:
                doc = fitz.open(file_path)
                for page_num in range(len(doc)):
                    page = doc.load_page(page_num)
                    pix = page.get_pixmap(dpi=150)
                    img_data = pix.tobytes("png")
                    pages_images.append(Image.open(io.BytesIO(img_data)))
                doc.close()
            except Exception as e:
                logger.error(f"PyMuPDF failed to parse PDF pages: {e}")
        else:
            try:
                pages_images.append(Image.open(file_path))
            except Exception as e:
                logger.error(f"Failed to open image {filename}: {e}")

        if not pages_images:
            return {
                "document_id": doc_id,
                "pages": 0,
                "entities": [],
                "equipment": [],
                "confidence": 0,
                "ocr_text": "",
                "knowledge_graph_nodes": [],
                "processing_time": "0s",
                "status": "failed"
            }

        full_ocr_text = []
        ocr_confidence_sum = 0.0
        warnings_all = []
        all_words = []
        
        # Step 2 & 3: Image pre-processing and OCR per page
        for page_idx, raw_img in enumerate(pages_images):
            # Preprocess
            cleaned_img, warnings = CvService.preprocess_image(raw_img)
            warnings_all.extend(warnings)
            
            # OCR
            ocr_res = OcrEngine.perform_ocr(cleaned_img)
            full_ocr_text.append(ocr_res["text"])
            ocr_confidence_sum += ocr_res["confidence"]
            all_words.extend(ocr_res["words"])

        avg_confidence = round(ocr_confidence_sum / len(pages_images), 2)
        combined_text = "\n\n".join(full_ocr_text)

        # Step 4 & 5: Entity extraction
        extracted_entities = EntityExtractor.extract_entities(combined_text)
        drawing_metadata = EntityExtractor.extract_drawing_labels(combined_text)
        
        # Combine drawing and standard entities
        combined_entities = {**extracted_entities, "drawing_metadata": drawing_metadata}
        
        # Check low confidence re-upload warnings
        if avg_confidence < 60.0:
            warnings_all.append(f"Average OCR confidence is low ({avg_confidence}%). Please verify the quality and resolution of the scan.")

        # Save OCR JSON metadata
        ocr_output_payload = {
            "document_id": doc_id,
            "filename": filename,
            "ocr_confidence": avg_confidence,
            "pages": len(pages_images),
            "warnings": list(set(warnings_all)),
            "words": all_words
        }
        OcrEngine.save_ocr_output(doc_id, ocr_output_payload)

        # Step 6: Save Document metadata to Database to auto-trigger Graph edges
        db_doc = db.query(Document).filter(Document.filename == filename).first()
        if not db_doc:
            db_doc = Document(
                id=doc_id,
                filename=filename,
                type=ext,
                size=os.path.getsize(file_path) if os.path.exists(file_path) else 1000,
                uploaded_by=uploaded_by,
                ocr_status="completed",
                embedding_status="processing",
                graph_status="completed",
                file_path=file_path,
                entities=combined_entities
            )
            db.add(db_doc)
        else:
            db_doc.entities = combined_entities
            db_doc.ocr_status = "completed"
            db_doc.graph_status = "completed"
            db_doc.embedding_status = "processing"
            doc_id = db_doc.id

        db.commit()

        # Step 7: RAG Chunking and Embeddings Ingestion
        success = RagService.chunk_and_embed_document(db, doc_id, combined_text)
        if success:
            db_doc.embedding_status = "completed"
        else:
            db_doc.embedding_status = "failed"
        db.commit()

        processing_time = time.perf_counter() - start_time
        
        # Build node structure matching step 8 JSON format
        graph_nodes = []
        for eq_id in combined_entities.get("equipment_ids", []):
            graph_nodes.append({"id": f"eq_{eq_id.lower()}", "type": "equipment", "label": eq_id})
        for eng_name in combined_entities.get("engineer_names", []):
            graph_nodes.append({"id": f"eng_{eng_name.lower().replace(' ', '_')}", "type": "engineer", "label": eng_name})
        graph_nodes.append({"id": f"doc_{doc_id.lower()}", "type": "document", "label": filename})

        return {
            "document_id": doc_id,
            "pages": len(pages_images),
            "entities": list(set(combined_entities.get("engineer_names", []))),
            "equipment": list(set(combined_entities.get("equipment_ids", []))),
            "confidence": avg_confidence,
            "ocr_text": combined_text,
            "knowledge_graph_nodes": graph_nodes,
            "processing_time": f"{round(processing_time, 2)}s",
            "status": "success"
        }
