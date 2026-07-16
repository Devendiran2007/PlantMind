import os
import shutil
import uuid
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.core.config import settings
from app.cv.cv_service import CvService

router = APIRouter()

@router.post("/process")
def process_cv_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    POST /cv/process
    Accepts file payload (PDF, PNG, JPG, JPEG, TIFF, BMP), preprocesses page layouts,
    extracts OCR text + bounding boxes, mines engineering drawing markers,
    updates NetworkX Knowledge Graph, and indexes vector embeddings.
    """
    filename = file.filename
    ext = filename.split(".")[-1].lower() if "." in filename else ""
    
    # Supported files checklist
    allowed_cv_extensions = {"pdf", "png", "jpg", "jpeg", "tiff", "bmp"}
    if ext not in allowed_cv_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Supported formats: {allowed_cv_extensions}"
        )

    # Make uploads directory if it doesn't exist
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    
    # Save file temporarily
    doc_id = f"DOC-{uuid.uuid4().hex[:8].upper()}"
    unique_filename = f"{doc_id}_{filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to write file to local disk: {e}"
        )

    # Process Document through Computer Vision Pipeline
    try:
        result = CvService.process_document(db, file_path, current_user.email, doc_id=doc_id)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Computer Vision extraction pipeline failed: {e}"
        )
