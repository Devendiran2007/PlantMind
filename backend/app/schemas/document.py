from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class DocumentBase(BaseModel):
    id: str
    filename: str
    type: str
    size: int
    uploaded_by: str
    upload_date: datetime
    ocr_status: str
    embedding_status: str
    graph_status: str
    entities: Optional[dict] = None

class DocumentResponse(DocumentBase):
    class Config:
        from_attributes = True

class DocumentChunkResponse(BaseModel):
    id: int
    document_id: str
    content: str
    page_num: int
    chunk_index: int

    class Config:
        from_attributes = True
