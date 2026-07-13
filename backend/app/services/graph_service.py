from sqlalchemy.orm import Session
import networkx as nx
from app.models.industrial import Equipment, Incident, Engineer, ComplianceRule
from app.models.document import Document
import logging

logger = logging.getLogger(__name__)

class GraphService:
    @staticmethod
    def get_topology_network(db: Session) -> dict:
        G = nx.DiGraph()
        
        try:
            # 1. Fetch tables
            equipment = db.query(Equipment).all()
            incidents = db.query(Incident).all()
            engineers = db.query(Engineer).all()
            rules = db.query(ComplianceRule).all()
            documents = db.query(Document).all()
            
            # 2. Add nodes to NetworkX graph representation
            for eq in equipment:
                G.add_node(
                    f"node-{eq.id.lower()}",
                    label=eq.name,
                    type="equipment",
                    status=eq.status,
                    details={
                        "Location": eq.location,
                        "Health": f"{eq.health}%",
                        "Model": eq.type
                    }
                )
                
            for inc in incidents:
                G.add_node(
                    f"node-{inc.id.lower()}",
                    label=inc.title,
                    type="incident",
                    status=inc.status,
                    details={
                        "Severity": inc.severity.capitalize(),
                        "Date": inc.date
                    }
                )
                # Link Incident to Equipment
                if inc.equipment_id:
                    G.add_edge(
                        f"node-{inc.equipment_id.lower()}",
                        f"node-{inc.id.lower()}",
                        label="affected by",
                        animated=True
                    )
                    
            for eng in engineers:
                G.add_node(
                    f"node-{eng.id.lower()}",
                    label=eng.name,
                    type="engineer",
                    details={
                        "Title": eng.title,
                        "Experience": f"{eng.experience_years} Years"
                    }
                )
                
            for rule in rules:
                # Map rules as SOP nodes
                G.add_node(
                    f"node-{rule.id.lower()}",
                    label=rule.description,
                    type="sop",
                    details={
                        "RegulatoryCode": rule.code,
                        "Standard": rule.standard_ref
                    }
                )
                
            for doc in documents:
                G.add_node(
                    f"node-{doc.id.lower()}",
                    label=doc.filename,
                    type="document",
                    details={
                        "Code": doc.filename.split('.')[0] if '.' in doc.filename else doc.id,
                        "Size": f"{(doc.size / (1024*1024)):.2f} MB"
                    }
                )

            # 3. Add default structural edges for dense visual graph
            # Connect engineers to incident reviews or assets
            for eng in engineers:
                for eq in equipment:
                    # System owner connections
                    G.add_edge(f"node-{eng.id.lower()}", f"node-{eq.id.lower()}", label="inspects")
                    break # Single connection per engineer to keep it clean
                    
            # Connect safety rules to assets based on type match
            for rule in rules:
                for eq in equipment:
                    if rule.affected_equipment_type.lower() in eq.type.lower() or rule.affected_equipment_type.lower() in eq.name.lower():
                        G.add_edge(f"node-{eq.id.lower()}", f"node-{rule.id.lower()}", label="governed by")

            # Connect documents to assets
            for doc in documents:
                for eq in equipment:
                    if eq.id.lower() in doc.filename.lower() or eq.name.lower() in doc.filename.lower():
                        G.add_edge(f"node-{eq.id.lower()}", f"node-{doc.id.lower()}", label="documented in")

        except Exception as e:
            logger.error(f"NetworkX graph generation failed: {e}")
            
        # 4. Map NetworkX nodes and edges to standard React Flow dictionary schema
        react_nodes = []
        for n_id, attrs in G.nodes(data=True):
            react_nodes.append({
                "id": n_id,
                "label": attrs.get("label", ""),
                "type": attrs.get("type", "equipment"),
                "status": attrs.get("status"),
                "details": attrs.get("details", {})
            })
            
        react_edges = []
        edge_idx = 0
        for u, v, attrs in G.edges(data=True):
            react_edges.append({
                "id": f"e{edge_idx}",
                "source": u,
                "target": v,
                "label": attrs.get("label", ""),
                "animated": attrs.get("animated", False)
            })
            edge_idx += 1
            
        return {"nodes": react_nodes, "edges": react_edges}
