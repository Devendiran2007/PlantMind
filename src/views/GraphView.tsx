import React, { useState, useEffect, useMemo } from 'react';
import { 
  ReactFlow, 
  Controls, 
  Background, 
  Handle, 
  Position
} from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { 
  Network, 
  Wrench, 
  AlertTriangle,
  Cpu,
  ArrowRight
} from 'lucide-react';
import GlassCard from '../components/GlassCard';
import { mockGraph } from '../data/mockData';

// Custom Node Component for React Flow
const CustomGraphNode = ({ data }: any) => {
  const { label, type, status } = data;
  
  // Custom styling based on industrial node type
  const nodeStyles: Record<string, string> = {
    equipment: 'border-primary bg-primary/5 shadow-[0_0_15px_rgba(249,115,22,0.1)]',
    document: 'border-sky-500 bg-sky-500/5 shadow-[0_0_15px_rgba(14,165,233,0.1)]',
    engineer: 'border-emerald-500 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.1)]',
    sop: 'border-purple-500 bg-purple-500/5 shadow-[0_0_15px_rgba(168,85,247,0.1)]',
    incident: 'border-danger bg-danger/10 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse',
    maintenance: 'border-yellow-500 bg-yellow-500/5 shadow-[0_0_15px_rgba(234,179,8,0.1)]',
    compliance_rule: 'border-success bg-success/5 shadow-[0_0_15px_rgba(34,197,94,0.1)]'
  };

  const badgeStyles: Record<string, string> = {
    equipment: 'text-primary bg-primary/10 border-primary/20',
    document: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    engineer: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    sop: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    incident: 'text-danger bg-danger/10 border-danger/20',
    maintenance: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    compliance_rule: 'text-success bg-success/10 border-success/20'
  };

  return (
    <div className={`px-4 py-3 rounded-xl border glass-panel flex flex-col justify-center min-w-[160px] text-left transition-all duration-300 ${nodeStyles[type]}`}>
      {/* Input connection pin */}
      <Handle type="target" position={Position.Top} className="!bg-border/80 !w-2 !h-2" />
      
      <div className="flex justify-between items-center mb-1">
        <span className={`text-[8px] font-code px-1.5 py-0.5 rounded border uppercase tracking-wider font-bold ${badgeStyles[type]}`}>
          {type === 'compliance_rule' ? 'compliance' : type}
        </span>
        {status && (
          <span className={`w-1.5 h-1.5 rounded-full ${status === 'healthy' || status === 'completed' || status === 'compliant' || status === 'active' || status === 'approved' || status === 'enforced' ? 'bg-success' : status === 'warning' ? 'bg-warning' : 'bg-danger'}`} />
        )}
      </div>
      
      <span className="text-[11px] font-bold text-white tracking-wide truncate max-w-[150px]" title={label}>
        {label}
      </span>
      
      {/* Output connection pin */}
      <Handle type="source" position={Position.Bottom} className="!bg-border/80 !w-2 !h-2" />
    </div>
  );
};

interface GraphViewProps {
  setActiveTab: (tab: any) => void;
  openRcaWithId: (id: string) => void;
}

export const GraphView: React.FC<GraphViewProps> = ({
  setActiveTab,
  openRcaWithId
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [rawNodes, setRawNodes] = useState<Node[]>([]);
  const [rawEdges, setRawEdges] = useState<Edge[]>([]);

  // Category Filter States - Default high density items (documents, engineers, maintenance logs) to false
  const [filters, setFilters] = useState<Record<string, boolean>>({
    equipment: true,
    incident: true,
    sop: true,
    compliance_rule: true,
    document: false,
    engineer: false,
    maintenance: false
  });

  // Register Custom Nodes type inside useMemo to avoid re-renders
  const nodeTypes = useMemo(() => ({
    custom: CustomGraphNode
  }), []);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/v1/graph')
      .then((res) => {
        if (!res.ok) throw new Error('API Response Error');
        return res.json();
      })
      .then((data) => {
        if (data && Array.isArray(data.nodes) && data.nodes.length > 0) {
          const mappedNodes = data.nodes.map((node: any) => ({
            ...node,
            type: 'custom',
            data: {
              ...node.data,
              type: node.type
            }
          }));

          const mappedEdges = data.edges.map((edge: any) => {
            return {
              ...edge,
              labelStyle: { fill: '#64748B', fontSize: 8, fontFamily: 'JetBrains Mono', fontWeight: 'bold' },
              labelBgPadding: [4, 2] as [number, number],
              labelBgBorderRadius: 4,
              labelBgStyle: { fill: '#151B23', fillOpacity: 0.8 }
            };
          });

          setRawNodes(mappedNodes);
          setRawEdges(mappedEdges);
          
          // Set first equipment node as selected by default if available
          const firstEq = mappedNodes.find((n: any) => n.data.type === 'equipment');
          if (firstEq) {
            setSelectedNodeId(firstEq.id);
          } else if (mappedNodes.length > 0) {
            setSelectedNodeId(mappedNodes[0].id);
          }
        } else {
          loadMockGraph();
        }
      })
      .catch((err) => {
        console.error('Error fetching graph from backend:', err);
        loadMockGraph();
      });

    function loadMockGraph() {
      const layoutCoords: Record<string, { x: number; y: number }> = {
        'node-eq-b3': { x: 300, y: 50 },
        'node-doc-pid': { x: 100, y: 150 },
        'node-sop-402': { x: 300, y: 200 },
        'node-eng-chen': { x: 500, y: 150 },
        'node-inc-089': { x: 420, y: 320 },
        'node-eq-gt01': { x: 750, y: 50 },
        'node-doc-man': { x: 850, y: 180 },
        'node-eq-rc2': { x: -100, y: 80 },
        'node-doc-hzp': { x: -250, y: 180 },
        'node-sop-109': { x: -50, y: 220 },
        'node-inc-077': { x: -120, y: 340 },
        'node-eng-marcus': { x: 120, y: 320 }
      };

      const fallbackNodes = mockGraph.nodes.map(node => ({
        id: node.id,
        type: 'custom',
        position: layoutCoords[node.id] || { x: Math.random() * 400, y: Math.random() * 400 },
        data: { 
          label: node.label, 
          type: node.type, 
          status: node.status, 
          details: node.details 
        }
      }));

      const fallbackEdges = mockGraph.edges.map(edge => {
        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: edge.label,
          labelStyle: { fill: '#64748B', fontSize: 8, fontFamily: 'JetBrains Mono', fontWeight: 'bold' },
          labelBgPadding: [4, 2] as [number, number],
          labelBgBorderRadius: 4,
          labelBgStyle: { fill: '#151B23', fillOpacity: 0.8 },
          animated: edge.animated || false
        };
      });

      setRawNodes(fallbackNodes);
      setRawEdges(fallbackEdges);
      setSelectedNodeId('node-eq-b3');
    }
  }, []);

  // Filter Toggle Handler
  const toggleFilter = (key: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // 1. Filter Nodes based on active checkboxes
  const filteredNodes = useMemo(() => {
    return rawNodes.filter((node: any) => {
      const type = node.data?.type;
      return filters[type] ?? true;
    });
  }, [rawNodes, filters]);

  // 2. Filter Edges ensuring both source & target exist in the visible nodes list
  const filteredEdges = useMemo(() => {
    return rawEdges.filter((edge: any) => {
      const sourceExists = filteredNodes.some(n => n.id === edge.source);
      const targetExists = filteredNodes.some(n => n.id === edge.target);
      return sourceExists && targetExists;
    });
  }, [rawEdges, filteredNodes]);

  // 3. Focus Mode: Find all node IDs connected directly to the selected node
  const connectedNodeIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const ids = new Set<string>([selectedNodeId]);
    filteredEdges.forEach(edge => {
      if (edge.source === selectedNodeId) {
        ids.add(edge.target);
      } else if (edge.target === selectedNodeId) {
        ids.add(edge.source);
      }
    });
    return ids;
  }, [selectedNodeId, filteredEdges]);

  // 4. Flow Nodes with Dynamic Highlight/Fade style mapping
  const nodesForFlow = useMemo(() => {
    if (!selectedNodeId) return filteredNodes;
    return filteredNodes.map(node => {
      const isFocused = connectedNodeIds.has(node.id);
      return {
        ...node,
        style: {
          ...node.style,
          opacity: isFocused ? 1.0 : 0.15,
          transition: 'opacity 0.25s ease-in-out'
        }
      };
    });
  }, [filteredNodes, selectedNodeId, connectedNodeIds]);

  // 5. Flow Edges with Dynamic Opacity & Glow highlight mapping
  const edgesForFlow = useMemo(() => {
    return filteredEdges.map(edge => {
      const isRelated = selectedNodeId ? (edge.source === selectedNodeId || edge.target === selectedNodeId) : false;
      
      let strokeColor = 'rgba(168, 179, 197, 0.25)'; // Default unselected
      let strokeWidth = 1.5;
      
      if (selectedNodeId) {
        if (isRelated) {
          // Highlight active paths with distinctive colors
          if (edge.source.includes('inc') || edge.target.includes('inc')) {
            strokeColor = 'rgba(239, 68, 68, 0.85)'; // Red for Incidents
          } else if (edge.source.includes('sop') || edge.target.includes('sop')) {
            strokeColor = 'rgba(168, 85, 247, 0.85)'; // Purple for SOPs
          } else if (edge.source.includes('rule') || edge.target.includes('rule')) {
            strokeColor = 'rgba(34, 197, 94, 0.85)';  // Green for Rules
          } else {
            strokeColor = 'rgba(249, 115, 22, 0.85)';  // Orange for others
          }
          strokeWidth = 2.5;
        } else {
          // Dim non-connected edges
          strokeColor = 'rgba(168, 179, 197, 0.04)';
          strokeWidth = 1.0;
        }
      } else {
        // Fallback colors when nothing is selected
        if (edge.source.includes('inc') || edge.target.includes('inc')) {
          strokeColor = 'rgba(239, 68, 68, 0.45)';
        } else if (edge.animated) {
          strokeColor = 'rgba(249, 115, 22, 0.5)';
        }
      }

      return {
        ...edge,
        animated: selectedNodeId ? (isRelated && edge.animated) : edge.animated,
        style: {
          ...edge.style,
          stroke: strokeColor,
          strokeWidth,
          transition: 'stroke 0.25s, stroke-width 0.25s'
        }
      };
    });
  }, [filteredEdges, selectedNodeId]);

  // Find clicked node details in raw lists so inspection details work even if type filter is unchecked
  const selectedNodeData = useMemo(() => {
    if (!selectedNodeId) return null;
    return (rawNodes.find(n => n.id === selectedNodeId) as any) || null;
  }, [selectedNodeId, rawNodes]);

  // Find node links in raw lists
  const relatedLinks = useMemo(() => {
    if (!selectedNodeId) return [];
    return rawEdges.filter(
      edge => edge.source === selectedNodeId || edge.target === selectedNodeId
    );
  }, [selectedNodeId, rawEdges]);

  // Select node handler with automatic type filter activation if targeted node type is hidden
  const handleSelectNode = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    
    const targetNode = rawNodes.find(n => n.id === nodeId) as any;
    if (targetNode && targetNode.data?.type) {
      const type = targetNode.data.type;
      if (!filters[type]) {
        setFilters(prev => ({
          ...prev,
          [type]: true
        }));
      }
    }
  };

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    handleSelectNode(node.id);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
      {/* Left 2 Columns: Flow Canvas */}
      <div className="lg:col-span-2 relative border border-border/40 rounded-industrial bg-[#080B0F] overflow-hidden flex flex-col justify-end">
        {/* Graph Heading */}
        <div className="absolute top-4 left-4 z-10 flex flex-col pointer-events-none select-none">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
            <Network className="w-4 h-4 text-primary animate-pulse" />
            Active Knowledge Graph Network
          </h3>
          <span className="text-[9px] text-text-muted mt-0.5 font-mono">
            Showing {nodesForFlow.length} of {rawNodes.length} Nodes // {edgesForFlow.filter(e => (e.style as any)?.strokeWidth > 1).length} Focused Connections
          </span>
        </div>

        {/* Dynamic Category Filters Toolbar */}
        <div className="absolute top-16 left-4 z-10 flex flex-wrap gap-2 pointer-events-auto bg-[#0b0f14]/80 p-2 rounded-xl border border-border/20 backdrop-blur max-w-[calc(100%-32px)]">
          <button
            onClick={() => toggleFilter('equipment')}
            className={`px-2.5 py-1 rounded-lg text-[9px] font-bold font-mono border transition-all cursor-pointer ${
              filters.equipment 
                ? 'bg-primary/20 border-primary text-primary shadow-[0_0_10px_rgba(249,115,22,0.15)]' 
                : 'bg-card/40 border-border/40 text-text-muted hover:border-border'
            }`}
          >
            Assets ({rawNodes.filter(n => n.data?.type === 'equipment').length})
          </button>
          <button
            onClick={() => toggleFilter('incident')}
            className={`px-2.5 py-1 rounded-lg text-[9px] font-bold font-mono border transition-all cursor-pointer ${
              filters.incident 
                ? 'bg-danger/20 border-danger text-danger shadow-[0_0_10px_rgba(239,68,68,0.15)]' 
                : 'bg-card/40 border-border/40 text-text-muted hover:border-border'
            }`}
          >
            Incidents ({rawNodes.filter(n => n.data?.type === 'incident').length})
          </button>
          <button
            onClick={() => toggleFilter('sop')}
            className={`px-2.5 py-1 rounded-lg text-[9px] font-bold font-mono border transition-all cursor-pointer ${
              filters.sop 
                ? 'bg-purple-500/20 border-purple-500 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.15)]' 
                : 'bg-card/40 border-border/40 text-text-muted hover:border-border'
            }`}
          >
            SOPs ({rawNodes.filter(n => n.data?.type === 'sop').length})
          </button>
          <button
            onClick={() => toggleFilter('compliance_rule')}
            className={`px-2.5 py-1 rounded-lg text-[9px] font-bold font-mono border transition-all cursor-pointer ${
              filters.compliance_rule 
                ? 'bg-success/20 border-success text-success shadow-[0_0_10px_rgba(34,197,94,0.15)]' 
                : 'bg-card/40 border-border/40 text-text-muted hover:border-border'
            }`}
          >
            Compliance Rules ({rawNodes.filter(n => n.data?.type === 'compliance_rule').length})
          </button>
          <button
            onClick={() => toggleFilter('document')}
            className={`px-2.5 py-1 rounded-lg text-[9px] font-bold font-mono border transition-all cursor-pointer ${
              filters.document 
                ? 'bg-sky-500/20 border-sky-500 text-sky-400 shadow-[0_0_10px_rgba(14,165,233,0.15)]' 
                : 'bg-card/40 border-border/40 text-text-muted hover:border-border'
            }`}
          >
            Documents ({rawNodes.filter(n => n.data?.type === 'document').length})
          </button>
          <button
            onClick={() => toggleFilter('engineer')}
            className={`px-2.5 py-1 rounded-lg text-[9px] font-bold font-mono border transition-all cursor-pointer ${
              filters.engineer 
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.15)]' 
                : 'bg-card/40 border-border/40 text-text-muted hover:border-border'
            }`}
          >
            Engineers ({rawNodes.filter(n => n.data?.type === 'engineer').length})
          </button>
          <button
            onClick={() => toggleFilter('maintenance')}
            className={`px-2.5 py-1 rounded-lg text-[9px] font-bold font-mono border transition-all cursor-pointer ${
              filters.maintenance 
                ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.15)]' 
                : 'bg-card/40 border-border/40 text-text-muted hover:border-border'
            }`}
          >
            Maintenance ({rawNodes.filter(n => n.data?.type === 'maintenance').length})
          </button>
        </div>

        {/* Legend */}
        <div className="absolute top-4 right-4 z-10 p-3 bg-card-secondary/70 border border-border/30 rounded-xl flex flex-col gap-1.5 text-[9px] font-mono pointer-events-auto backdrop-blur">
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded bg-primary" /> Equipment</div>
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded bg-sky-500" /> Document</div>
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded bg-emerald-500" /> Engineer</div>
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded bg-purple-500" /> Standard SOP</div>
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded bg-danger" /> Incident</div>
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded bg-yellow-500" /> Maintenance</div>
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded bg-success" /> Compliance Rule</div>
        </div>

        {/* React Flow Core Canvas */}
        <div className="w-full h-full">
          <ReactFlow
            nodes={nodesForFlow}
            edges={edgesForFlow}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            fitView
            minZoom={0.01}
            maxZoom={1.5}
          >
            <Background color="#2B3647" gap={16} size={1} />
            <Controls className="!m-4" />
          </ReactFlow>
        </div>
      </div>

      {/* Right Column: Node Inspector panel */}
      <div className="space-y-6 h-full overflow-y-auto pr-1">
        {selectedNodeData ? (
          <GlassCard className="border-border/40 min-h-full flex flex-col justify-between" hoverEffect={false}>
            <div>
              {/* Header */}
              <div className="flex justify-between items-start pb-4 border-b border-border/30 mb-4">
                <div>
                  <span className="text-[10px] font-code text-primary uppercase font-bold tracking-wider">
                    Node Inspector
                  </span>
                  <h3 className="text-sm font-bold text-white mt-1">
                    {selectedNodeData.data.label}
                  </h3>
                </div>
                <span className="text-[9px] text-text-muted font-mono font-bold bg-card p-1.5 rounded border border-border/60">
                  {selectedNodeData.id}
                </span>
              </div>

              {/* Details Parameters */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2 font-mono">
                    Ingested Parameters
                  </h4>
                  <div className="space-y-2 p-3 bg-card rounded-xl border border-border/40">
                    {selectedNodeData.data.details && Object.entries(selectedNodeData.data.details).map(([key, val]) => (
                      <div key={key} className="flex justify-between text-xs">
                        <span className="text-text-muted">{key}</span>
                        <span className="text-white font-medium">{val as any}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Relational Edges List */}
                <div>
                  <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2 font-mono">
                    Active Synthesis Connections ({relatedLinks.length})
                  </h4>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {relatedLinks.map((link) => {
                      const isSource = link.source === selectedNodeId;
                      const targetId = isSource ? link.target : link.source;
                      const targetNode = rawNodes.find(n => n.id === targetId) as any;

                      return (
                        <div
                          key={link.id}
                          onClick={() => handleSelectNode(targetId)}
                          className="p-2 bg-card-secondary/40 border border-border/40 hover:border-primary/30 rounded-lg text-xs flex justify-between items-center group cursor-pointer transition-all duration-200"
                        >
                          <div>
                            <span className="text-[9px] text-text-muted font-mono uppercase font-bold block">
                              {link.label}
                            </span>
                            <span className="text-white font-medium group-hover:text-primary transition-colors line-clamp-1">
                              {targetNode?.data?.label || targetNode?.label}
                            </span>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-text-muted group-hover:text-white transition-colors" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions for active node types */}
            <div className="mt-6 pt-4 border-t border-border/20 space-y-2">
              {selectedNodeData.data.type === 'incident' && (
                <button
                  onClick={() => openRcaWithId(selectedNodeData.id.replace('doc_', '').replace('inc_', '').toUpperCase())}
                  className="w-full py-2.5 bg-danger text-white text-xs font-bold rounded-xl hover:bg-danger/80 transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer border border-danger/30"
                >
                  <AlertTriangle className="w-4 h-4 text-white" />
                  Perform Deep RCA Diagnostic
                </button>
              )}

              {selectedNodeData.data.type === 'equipment' && (
                <button
                  onClick={() => openRcaWithId('INC-2026-089')}
                  className="w-full py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/80 transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer shadow-glow-orange border border-primary/20"
                >
                  <Wrench className="w-4 h-4" />
                  Launch RCA Pipeline
                </button>
              )}

              <button
                onClick={() => setActiveTab('copilot')}
                className="w-full py-2 bg-card-secondary hover:bg-card border border-border hover:border-secondary text-xs text-text-secondary hover:text-white font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Cpu className="w-4 h-4 text-secondary" />
                Query Copilot on Entity
              </button>
            </div>
          </GlassCard>
        ) : (
          <GlassCard className="border-border/40 text-center py-16" hoverEffect={false}>
            <Network className="w-12 h-12 text-text-muted mx-auto mb-3 animate-pulse" />
            <h4 className="text-sm font-bold text-white">No Entity Inspected</h4>
            <p className="text-xs text-text-secondary mt-1 max-w-[180px] mx-auto leading-relaxed">
              Click any node in the knowledge network canvas to load details.
            </p>
          </GlassCard>
        )}
      </div>
    </div>
  );
};

export default GraphView;
