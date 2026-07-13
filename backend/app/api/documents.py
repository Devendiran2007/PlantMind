from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List
from app.database.session import get_db
from app.schemas.document import DocumentResponse
from app.services.document_service import DocumentService
from app.api.deps import get_current_user, RoleChecker
from app.models.user import User

router = APIRouter()

# Instantiate checkers for document deletion (Admin or Safety Officer required)
delete_permission = RoleChecker(allowed_roles=["Admin", "Safety Officer"])

@router.get("/documents", response_model=List[DocumentResponse])
def get_documents(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """
    List all uploaded documents and ingestion statuses.
    """
    return DocumentService.get_all_documents(db)

@router.get("/document/{id}", response_model=DocumentResponse)
def get_document(
    id: str, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed metadata for a single document.
    """
    return DocumentService.get_document_by_id(db, id)

@router.delete("/document/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    id: str, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(delete_permission)
):
    """
    Remove document from database and delete underlying file payload from disk storage.
    """
    DocumentService.delete_document(db, id)
    return None
