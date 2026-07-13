from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.services.graph_service import GraphService
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("")
def get_graph(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Exposes the synthesized Industrial Knowledge Graph nodes and edges.
    """
    return GraphService.get_topology_network(db)
