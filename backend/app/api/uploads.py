from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.document import DocumentResponse
from app.services.upload_service import UploadService
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()

@router.post("/upload", response_model=DocumentResponse)
def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a document payload (PDF, DOCX, XLSX, TXT, PNG, JPG) and enqueue OCR / vector index tasks.
    """
    return UploadService.process_file_upload(
        db=db, 
        file=file, 
        uploaded_by=current_user.email, 
        background_tasks=background_tasks
    )
