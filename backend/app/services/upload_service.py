import os
import uuid
import shutil
from fastapi import UploadFile, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session
from app.models.document import Document
from app.core.config import settings
from app.services.rag_service import RagService
from app.services.document_intelligence import DocumentIntelligenceEngine
import logging

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {"pdf", "docx", "xlsx", "csv", "json", "html", "md", "txt", "png", "jpg", "jpeg"}

class UploadService:
    @staticmethod
    def process_file_upload(
        db: Session, 
        file: UploadFile, 
        uploaded_by: str, 
        background_tasks: BackgroundTasks
    ) -> Document:
        filename = file.filename
        ext = filename.split(".")[-1].lower() if "." in filename else ""
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File extension '{ext}' not supported. Allowed formats: {ALLOWED_EXTENSIONS}"
            )
            
        # Generate unique document ID and file path
        doc_id = f"DOC-{uuid.uuid4().hex[:8].upper()}"
        unique_filename = f"{doc_id}_{filename}"
        file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
        
        # Save file to storage
        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        except Exception as e:
            logger.error(f"Failed to write file payload to storage: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Could not write file to storage."
            )
            
        file_size = os.path.getsize(file_path)
        
        # Initialize DB metadata row
        db_doc = Document(
            id=doc_id,
            filename=filename,
            type=ext,
            size=file_size,
            uploaded_by=uploaded_by,
            ocr_status="pending",
            embedding_status="pending",
            graph_status="pending",
            file_path=file_path
        )
        db.add(db_doc)
        db.commit()
        db.refresh(db_doc)
        
        # Queue Async Ingestion Pipeline Tasks
        background_tasks.add_task(
            UploadService._run_ingestion_pipeline, db_doc.id, file_path, ext
        )
        
        logger.info(f"Ingested file upload {filename} as document ID: {doc_id}. Pipeline queued.")
        return db_doc

    @staticmethod
    def _run_ingestion_pipeline(doc_id: str, file_path: str, ext: str):
        # We must instantiate a new connection pool session inside background threads
        from app.database.session import SessionLocal
        db = SessionLocal()
        try:
            doc = db.query(Document).filter(Document.id == doc_id).first()
            if not doc:
                logger.error(f"Background pipeline failed: document {doc_id} not found in DB.")
                return
            
            # Step 1: Document Intelligence Extraction
            doc.ocr_status = "processing"
            db.commit()
            
            result = DocumentIntelligenceEngine.process_document(file_path)
            parsed_text = result["extracted_text"]
            
            doc.entities = result["entities"]
            doc.ocr_status = "completed"
            doc.embedding_status = "processing"
            db.commit()
            
            # Step 2: Vector Ingestion (RAG)
            success = RagService.chunk_and_embed_document(db, doc_id, parsed_text)
            if success:
                doc.embedding_status = "completed"
            else:
                doc.embedding_status = "failed"
            db.commit()
            
            # Step 3: Graph Relationship Indexing
            doc.graph_status = "processing"
            db.commit()
            
            # Synthesize relations (Auto-completed since graph service queries document table dynamically)
            doc.graph_status = "completed"
            db.commit()
            
            logger.info(f"Ingestion pipeline completed successfully for document: {doc_id}")
            
        except Exception as e:
            logger.error(f"Pipeline failure occurred on doc {doc_id}: {e}")
            try:
                doc = db.query(Document).filter(Document.id == doc_id).first()
                if doc:
                    doc.ocr_status = "failed"
                    doc.embedding_status = "failed"
                    doc.graph_status = "failed"
                    db.commit()
            except Exception as write_ex:
                logger.error(f"Failed to record failure status for doc {doc_id}: {write_ex}")
        finally:
            db.close()
