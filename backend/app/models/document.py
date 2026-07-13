from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.models.base import Base

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(String, primary_key=True, index=True) # UUID-based unique ID
    filename = Column(String, nullable=False)
    type = Column(String, nullable=False) # PDF, DOCX, XLSX, TXT, PNG, JPG
    size = Column(Integer, nullable=False) # File size in bytes
    uploaded_by = Column(String, nullable=False) # Operator email/id
    upload_date = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Ingestion statuses
    ocr_status = Column(String, default="pending", nullable=False)      # pending, processing, completed, failed
    embedding_status = Column(String, default="pending", nullable=False) # pending, processing, completed, failed
    graph_status = Column(String, default="pending", nullable=False)     # pending, processing, completed, failed
    
    file_path = Column(String, nullable=False)
    entities = Column(JSON, nullable=True) # Extracted metadata entities JSON
    
    # Cascading relations
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")

class DocumentChunk(Base):
    __tablename__ = "document_chunks"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(String, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    page_num = Column(Integer, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    
    document = relationship("Document", back_populates="chunks")
