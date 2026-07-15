from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.document import Document
import os
import logging

logger = logging.getLogger(__name__)

class DocumentService:
    @staticmethod
    def get_all_documents(db: Session) -> list:
        return db.query(Document).order_by(Document.upload_date.desc()).all()

    @staticmethod
    def get_document_by_id(db: Session, doc_id: str) -> Document:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document with ID '{doc_id}' not found."
            )
        return doc

    @staticmethod
    def delete_document(db: Session, doc_id: str) -> bool:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document with ID '{doc_id}' not found."
            )
            
        # 1. Clean file system payload
        if os.path.exists(doc.file_path):
            try:
                os.remove(doc.file_path)
                logger.info(f"Removed document payload from disk storage: {doc.file_path}")
            except Exception as fs_err:
                logger.error(f"Failed to delete disk file {doc.file_path}: {fs_err}")
                
        # 2. Clean Vector Indexing
        try:
            from app.services.rag_service import CHROMA_AVAILABLE, settings
            import chromadb
            if CHROMA_AVAILABLE:
                chroma_client = chromadb.PersistentClient(path=settings.VECTOR_DB_DIR)
                collection = chroma_client.get_or_create_collection(name="plantmind_rag")
                collection.delete(where={"document_id": doc_id})
                logger.info(f"Deleted vector chunks matching metadata 'document_id' = {doc_id}")
        except Exception as chroma_ex:
            logger.warning(f"Vector cleanup bypassed for document {doc_id}: {chroma_ex}")

        # 3. Clean DB rows (cascading relation drops the chunks automatically)
        db.delete(doc)
        db.commit()
        logger.info(f"Document ID: {doc_id} successfully deleted from database.")
        return True
