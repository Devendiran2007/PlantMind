import logging
import math
import networkx as nx
from sqlalchemy.orm import Session
from app.models.industrial import Equipment, Incident, Engineer, ComplianceRule, MaintenanceRecord
from app.models.document import Document

logger = logging.getLogger(__name__)

class GraphService:
    @staticmethod
    def get_topology_network(db: Session) -> dict:
        """
        Orchestrates NetworkX synthesis of the Industrial Knowledge Graph:
        1. Adds Equipment, Engineer, Document, Incident, Maintenance, and Compliance Rule nodes.
        2. Automatically establishes:
           - mentions (via parsed document entities)
           - references (via compliance rules)
           - maintained_by & uses (via maintenance records)
           - caused_by & related_to (via incident mappings)
           - similar_failure (via co-affected equipment)
        3. Computes layout positions (x, y) ready for React Flow rendering.
        """
        G = nx.DiGraph()
        
        try:
            # 1. Retrieve data
            equipment_list = db.query(Equipment).all()
            engineer_list = db.query(Engineer).all()
            document_list = db.query(Document).all()
            incident_list = db.query(Incident).all()
            maintenance_list = db.query(MaintenanceRecord).all()
            rule_list = db.query(ComplianceRule).all()
            
            # 2. Add Nodes
            # A. Equipment Nodes
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
                
            # B. Engineer Nodes
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
                
            # C. Document Nodes
            for doc in document_list:
                G.add_node(
                    f"doc_{doc.id.lower()}",
                    label=doc.filename,
                    type="document",
                    status="indexed",
                    details={
                        "Code": doc.id,
                        "Format": doc.type.upper(),
                        "Size": f"{(doc.size / 1024):.1f} KB",
                        "Ingested By": doc.uploaded_by
                    }
                )
                
            # D. Incident Nodes
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
                
            # E. Maintenance Nodes
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
                
            # F. Compliance Rule Nodes
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
                
            # G. Create custom SOP Nodes (derived from specific standard references)
            G.add_node(
                "sop_sop402",
                label="SOP-402: Emergency Bypass",
                type="sop",
                status="approved",
                details={
                    "SOP Code": "SOP-402",
                    "Title": "Emergency Heat Dissipation Procedure",
                    "Revision": "Rev 4"
                }
            )

            # 3. Add Edges & Relationships
            # A. Auto-link Document Mentions (mapped from extracted entities)
            for doc in document_list:
                if doc.entities:
                    # Equipment ID mentions -> (Document) -mentions-> (Equipment)
                    eq_mentions = doc.entities.get("equipment_ids", [])
                    for eq_id in eq_mentions:
                        # Find seeded equipment matching mentions
                        for eq in equipment_list:
                            if eq_id.upper() in eq.name.upper() or eq_id.upper() in eq.id.upper():
                                G.add_edge(f"doc_{doc.id.lower()}", f"eq_{eq.id.lower()}", label="mentions")
                                
                    # Engineer mentions -> (Document) -mentions-> (Engineer)
                    eng_mentions = doc.entities.get("engineer_names", [])
                    for eng_name in eng_mentions:
                        for eng in engineer_list:
                            if eng_name.lower() in eng.name.lower():
                                G.add_edge(f"doc_{doc.id.lower()}", f"eng_{eng.id.lower()}", label="mentions")
                                
                    # Incident mentions -> (Document) -mentions-> (Incident)
                    inc_mentions = doc.entities.get("incident_ids", [])
                    for inc_id in inc_mentions:
                        for inc in incident_list:
                            if inc_id.upper() in inc.id.upper():
                                G.add_edge(f"doc_{doc.id.lower()}", f"inc_{inc.id.lower()}", label="mentions")

            # B. Maintenance linkages -> uses (Equipment) & maintained_by (Engineer)
            for maint in maintenance_list:
                maint_id_str = str(maint.id)
                if maint.equipment_id:
                    G.add_edge(f"maint_{maint_id_str.lower()}", f"eq_{maint.equipment_id.lower()}", label="uses")
                if maint.engineer_id:
                    G.add_edge(f"maint_{maint_id_str.lower()}", f"eng_{maint.engineer_id.lower()}", label="maintained_by")
                    
            # C. Incident linkages -> caused_by (Equipment)
            for inc in incident_list:
                if inc.equipment_id:
                    G.add_edge(f"inc_{inc.id.lower()}", f"eq_{inc.equipment_id.lower()}", label="caused_by")
                    
            # D. Compliance linkages -> references (Equipment)
            for rule in rule_list:
                # Find matching target equipment types (e.g. Boiler)
                for eq in equipment_list:
                    if rule.affected_equipment_type.lower() in eq.type.lower():
                        G.add_edge(f"rule_{rule.id.lower()}", f"eq_{eq.id.lower()}", label="references")
                        
            # E. SOP linkages -> references (Equipment)
            # SOP-402 references Steam Boiler Unit 3 (eq_eq-b3)
            G.add_edge("sop_sop402", "eq_eq-b3", label="references")
            
            # F. Incident similar_failure linkages
            # If multiple incidents affect the same equipment, map as similar failure
            for i, inc1 in enumerate(incident_list):
                for inc2 in incident_list[i+1:]:
                    if inc1.equipment_id == inc2.equipment_id:
                        G.add_edge(f"inc_{inc1.id.lower()}", f"inc_{inc2.id.lower()}", label="similar_failure")

            # G. General relational linkage fallback to keep graph connected
            # Link SOP to rule
            G.add_edge("sop_sop402", "rule_comp-01", label="related_to")

        except Exception as e:
            logger.error(f"NetworkX Knowledge Graph synthesis failed: {e}")
            
        # 4. Map NetworkX nodes & edges to React Flow layout coordinates
        react_nodes = []
        nodes_list = list(G.nodes(data=True))
        num_nodes = len(nodes_list)
        radius = 380
        
        for idx, (n_id, attrs) in enumerate(nodes_list):
            # Calculate coordinates in a neat circular layout to present dense graph
            angle = (2 * math.pi * idx) / num_nodes if num_nodes > 0 else 0
            x_pos = int(500 + radius * math.cos(angle))
            y_pos = int(350 + radius * math.sin(angle))
            
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
            
        react_edges = []
        edge_idx = 0
        for u, v, attrs in G.edges(data=True):
            react_edges.append({
                "id": f"edge_{edge_idx}",
                "source": u,
                "target": v,
                "label": attrs.get("label", "related_to"),
                "animated": u.startswith("inc_") or u.startswith("doc_") # Animate failure & document pipelines
            })
            edge_idx += 1
            
        return {"nodes": react_nodes, "edges": react_edges}
