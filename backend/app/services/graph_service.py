import logging
import math
import networkx as nx
from sqlalchemy.orm import Session
from app.models.industrial import Equipment, Incident, Engineer, ComplianceRule, MaintenanceRecord
from app.models.document import Document

logger = logging.getLogger(__name__)

class GraphService:
    @staticmethod
    def build_nx_graph(db: Session) -> nx.DiGraph:
        """
        Builds and returns the raw NetworkX DiGraph instance.
        Used by the graph API and RAG/Copilot neighbor retrievers.
        """
        G = nx.DiGraph()
        try:
            equipment_list = db.query(Equipment).all()
            engineer_list = db.query(Engineer).all()
            document_list = db.query(Document).all()
            incident_list = db.query(Incident).all()
            maintenance_list = db.query(MaintenanceRecord).all()
            rule_list = db.query(ComplianceRule).all()
            
            # A. Add Nodes
            for eq in equipment_list:
                G.add_node(
                    f"eq_{eq.id.lower()}",
                    label=eq.name,
                    type="equipment",
                    status=eq.status,
                    details={
                        "Type": eq.type,
                        "Location": eq.location,
                        "Health": f"{eq.health}%",
                        "OEE": f"{eq.oee}%",
                        "Opr Temp": f"{eq.temperature}°C",
                        "Pressure": f"{eq.pressure} bar"
                    }
                )
                
            for eng in engineer_list:
                G.add_node(
                    f"eng_{eng.id.lower()}",
                    label=eng.name,
                    type="engineer",
                    status="active",
                    details={
                        "Title": eng.title,
                        "Certifications": eng.certifications,
                        "Experience": f"{eng.experience_years} Years"
                    }
                )
                
            for doc in document_list:
                # Map specific document sub-types to frontend styling types
                doc_type = "document"
                if doc.id.startswith("SOP") or (doc.entities and doc.entities.get("document_type") == "SOP"):
                    doc_type = "sop"
                elif doc.id.startswith("INC") or doc.id.startswith("RCA") or (doc.entities and doc.entities.get("document_type") == "Incident"):
                    doc_type = "incident"
                
                G.add_node(
                    f"doc_{doc.id.lower()}",
                    label=doc.filename,
                    type=doc_type,
                    status="indexed",
                    details={
                        "Code": doc.id,
                        "Format": doc.type.upper(),
                        "Size": f"{(doc.size / 1024):.1f} KB",
                        "Ingested By": doc.uploaded_by
                    }
                )
                
            for inc in incident_list:
                G.add_node(
                    f"inc_{inc.id.lower()}",
                    label=inc.title,
                    type="incident",
                    status=inc.status,
                    details={
                        "Severity": inc.severity.upper(),
                        "Risk Score": str(inc.risk_score),
                        "Date Triggered": inc.date,
                        "Downtime": inc.duration
                    }
                )
                
            for maint in maintenance_list:
                maint_id_str = str(maint.id)
                G.add_node(
                    f"maint_{maint_id_str.lower()}",
                    label=f"Maint: {maint_id_str}",
                    type="maintenance",
                    status=maint.status,
                    details={
                        "Action": maint.task_description,
                        "Date": maint.date.strftime("%Y-%m-%d") if maint.date else ""
                    }
                )
                
            for rule in rule_list:
                G.add_node(
                    f"rule_{rule.id.lower()}",
                    label=rule.code,
                    type="compliance_rule",
                    status="enforced",
                    details={
                        "Code": rule.code,
                        "Standard": rule.standard_ref,
                        "Impact": rule.risk_impact,
                        "Scope": rule.description
                    }
                )

            # B. Add Edges dynamically
            for doc in document_list:
                if doc.entities:
                    # 1. Equipment Tag Mentions
                    eq_mentions = doc.entities.get("equipment_ids", [])
                    if not eq_mentions and "equipment_tag" in doc.entities:
                        tag = doc.entities["equipment_tag"]
                        if tag:
                            eq_mentions = [tag]
                    for eq_id in eq_mentions:
                        if not eq_id:
                            continue
                        for eq in equipment_list:
                            if eq_id.upper() in eq.name.upper() or eq_id.upper() in eq.id.upper():
                                G.add_edge(f"doc_{doc.id.lower()}", f"eq_{eq.id.lower()}", label="mentions")
                                
                    # 2. Engineer Mentions
                    eng_mentions = doc.entities.get("engineer_names", [])
                    if not eng_mentions and "prepared_by" in doc.entities:
                        prep = doc.entities["prepared_by"]
                        if prep:
                            eng_mentions = [prep]
                    for eng_name in eng_mentions:
                        if not eng_name:
                            continue
                        for eng in engineer_list:
                            if eng_name.lower() in eng.name.lower():
                                G.add_edge(f"doc_{doc.id.lower()}", f"eng_{eng.id.lower()}", label="mentions")
                                
                    # 3. Incident Mentions
                    inc_mentions = doc.entities.get("incident_ids", [])
                    for inc_id in inc_mentions:
                        if not inc_id:
                            continue
                        for inc in incident_list:
                            if inc_id.upper() in inc.id.upper():
                                G.add_edge(f"doc_{doc.id.lower()}", f"inc_{inc.id.lower()}", label="mentions")

                    # 4. Document to Document References
                    references = doc.entities.get("references", [])
                    for ref in references:
                        ref_doc_id = ref.get("doc_id") if isinstance(ref, dict) else ref
                        if ref_doc_id:
                            for target_doc in document_list:
                                if target_doc.id.lower() == ref_doc_id.lower():
                                    rel = ref.get("relationship", "references") if isinstance(ref, dict) else "references"
                                    G.add_edge(f"doc_{doc.id.lower()}", f"doc_{ref_doc_id.lower()}", label=rel)

            for maint in maintenance_list:
                maint_id_str = str(maint.id)
                if maint.equipment_id:
                    G.add_edge(f"maint_{maint_id_str.lower()}", f"eq_{maint.equipment_id.lower()}", label="uses")
                if maint.engineer_id:
                    G.add_edge(f"maint_{maint_id_str.lower()}", f"eng_{maint.engineer_id.lower()}", label="maintained_by")
                    
            for inc in incident_list:
                if inc.equipment_id:
                    G.add_edge(f"inc_{inc.id.lower()}", f"eq_{inc.equipment_id.lower()}", label="caused_by")
                    
            for rule in rule_list:
                for eq in equipment_list:
                    if rule.affected_equipment_type.lower() in eq.type.lower():
                        G.add_edge(f"rule_{rule.id.lower()}", f"eq_{eq.id.lower()}", label="references")
                        
            for i, inc1 in enumerate(incident_list):
                for inc2 in incident_list[i+1:]:
                    if inc1.equipment_id == inc2.equipment_id:
                        G.add_edge(f"inc_{inc1.id.lower()}", f"inc_{inc2.id.lower()}", label="similar_failure")

        except Exception as e:
            logger.error(f"Failed to build raw NetworkX graph: {e}")
            
        return G

    @staticmethod
    def get_topology_network(db: Session) -> dict:
        """
        Fetch network topology dictionary mapped for React Flow canvas.
        Includes concentric circles layout to space large networks cleanly.
        """
        G = GraphService.build_nx_graph(db)
        
        react_nodes = []
        nodes_list = list(G.nodes(data=True))
        
        # Segment nodes into three concentric circles layers
        layer1_nodes = []  # Core layer: physical equipment (Radius = 300)
        layer2_nodes = []  # Context layer: engineers, incidents, maintenance, compliance, sops (Radius = 650)
        layer3_nodes = []  # Documentation layer: standard documents (Radius = 1000)
        
        for n_id, attrs in nodes_list:
            n_type = attrs.get("type", "document")
            if n_type == "equipment":
                layer1_nodes.append((n_id, attrs))
            elif n_type in ("engineer", "incident", "maintenance", "compliance_rule", "sop"):
                layer2_nodes.append((n_id, attrs))
            else:
                layer3_nodes.append((n_id, attrs))
                
        # Layout Center Point coordinates
        center_x = 500
        center_y = 500
        
        # Position Layer 1: Core Assets (Circle radius = 300)
        num_l1 = len(layer1_nodes)
        for idx, (n_id, attrs) in enumerate(layer1_nodes):
            angle = (2 * math.pi * idx) / num_l1 if num_l1 > 0 else 0
            x_pos = int(center_x + 300 * math.cos(angle))
            y_pos = int(center_y + 300 * math.sin(angle))
            react_nodes.append({
                "id": n_id,
                "type": attrs.get("type", "equipment"),
                "position": {"x": x_pos, "y": y_pos},
                "data": {
                    "label": attrs.get("label", ""),
                    "status": attrs.get("status", "normal"),
                    "details": attrs.get("details", {})
                }
            })
            
        # Position Layer 2: Operational Context (Circle radius = 650)
        num_l2 = len(layer2_nodes)
        for idx, (n_id, attrs) in enumerate(layer2_nodes):
            angle = (2 * math.pi * idx) / num_l2 if num_l2 > 0 else 0
            x_pos = int(center_x + 650 * math.cos(angle))
            y_pos = int(center_y + 650 * math.sin(angle))
            react_nodes.append({
                "id": n_id,
                "type": attrs.get("type", "engineer"),
                "position": {"x": x_pos, "y": y_pos},
                "data": {
                    "label": attrs.get("label", ""),
                    "status": attrs.get("status", "normal"),
                    "details": attrs.get("details", {})
                }
            })
            
        # Position Layer 3: Documentation and Logs (Circle radius = 1000)
        num_l3 = len(layer3_nodes)
        for idx, (n_id, attrs) in enumerate(layer3_nodes):
            angle = (2 * math.pi * idx) / num_l3 if num_l3 > 0 else 0
            x_pos = int(center_x + 1000 * math.cos(angle))
            y_pos = int(center_y + 1000 * math.sin(angle))
            react_nodes.append({
                "id": n_id,
                "type": attrs.get("type", "document"),
                "position": {"x": x_pos, "y": y_pos},
                "data": {
                    "label": attrs.get("label", ""),
                    "status": attrs.get("status", "normal"),
                    "details": attrs.get("details", {})
                }
            })
            
        react_edges = []
        edge_idx = 0
        for u, v, attrs in G.edges(data=True):
            react_edges.append({
                "id": f"edge_{edge_idx}",
                "source": u,
                "target": v,
                "label": attrs.get("label", "related_to"),
                "animated": u.startswith("inc_") or u.startswith("doc_") or attrs.get("label") in ("derived_from", "similar_failure")
            })
            edge_idx += 1
            
        return {"nodes": react_nodes, "edges": react_edges}
