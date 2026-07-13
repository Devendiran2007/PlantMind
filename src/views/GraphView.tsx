import React, { useState, useMemo } from 'react';
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
    engineer: 'border-success bg-success/5 shadow-[0_0_15px_rgba(34,197,94,0.1)]',
    sop: 'border-purple-500 bg-purple-500/5 shadow-[0_0_15px_rgba(168,85,247,0.1)]',
    incident: 'border-danger bg-danger/10 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse'
  };

  const badgeStyles: Record<string, string> = {
    equipment: 'text-primary bg-primary/10 border-primary/20',
    document: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    engineer: 'text-success bg-success/10 border-success/20',
    sop: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    incident: 'text-danger bg-danger/10 border-danger/20'
  };

  return (
    <div className={`px-4 py-3 rounded-xl border glass-panel flex flex-col justify-center min-w-[160px] text-left transition-all duration-300 ${nodeStyles[type]}`}>
      {/* Input connection pin */}
      <Handle type="target" position={Position.Top} className="!bg-border/80 !w-2 !h-2" />
      
      <div className="flex justify-between items-center mb-1">
        <span className={`text-[8px] font-code px-1.5 py-0.5 rounded border uppercase tracking-wider font-bold ${badgeStyles[type]}`}>
          {type}
        </span>
        {status && (
          <span className={`w-1.5 h-1.5 rounded-full ${status === 'healthy' ? 'bg-success' : status === 'warning' ? 'bg-warning' : 'bg-danger'}`} />
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
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('node-eq-b3');

  // Register Custom Nodes type inside useMemo to avoid re-renders
  const nodeTypes = useMemo(() => ({
    custom: CustomGraphNode
  }), []);

  // Map our mock nodes into React Flow specifications
  // Coordinate positions designed to look structured and readable
  const initialNodes: Node[] = useMemo(() => {
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

    return mockGraph.nodes.map(node => ({
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
  }, []);

  // Map our mock edges into React Flow specifications
  const initialEdges: Edge[] = useMemo(() => {
    return mockGraph.edges.map(edge => {
      // Color-coding connection lines
      let edgeColor = 'rgba(168, 179, 197, 0.25)'; // Secondary text default
      if (edge.source.includes('inc') || edge.target.includes('inc')) {
        edgeColor = 'rgba(239, 68, 68, 0.4)'; // Red danger line for incident relations
      } else if (edge.animated) {
        edgeColor = 'rgba(249, 115, 22, 0.5)'; // Orange primary active line
      }

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        labelStyle: { fill: '#64748B', fontSize: 8, fontFamily: 'JetBrains Mono', fontWeight: 'bold' },
        labelBgPadding: [4, 2],
        labelBgBorderRadius: 4,
        labelBgStyle: { fill: '#151B23', fillOpacity: 0.8 },
        animated: edge.animated || false,
        style: { stroke: edgeColor, strokeWidth: 1.5 }
      };
    });
  }, []);

  // Find clicked node details
  const selectedNodeData = useMemo(() => {
    if (!selectedNodeId) return null;
    return mockGraph.nodes.find(n => n.id === selectedNodeId) || null;
  }, [selectedNodeId]);

  // Find node links
  const relatedLinks = useMemo(() => {
    if (!selectedNodeId) return [];
    return mockGraph.edges.filter(
      edge => edge.source === selectedNodeId || edge.target === selectedNodeId
    );
  }, [selectedNodeId]);

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
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
            {mockGraph.nodes.length} Ingested Nodes // {mockGraph.edges.length} Synthesis Edges
          </span>
        </div>

        {/* Legend */}
        <div className="absolute top-4 right-4 z-10 p-3 bg-card-secondary/70 border border-border/30 rounded-xl flex flex-col gap-1.5 text-[9px] font-mono pointer-events-auto">
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded bg-primary" /> Equipment</div>
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded bg-sky-500" /> Document</div>
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded bg-success" /> Engineer</div>
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded bg-purple-500" /> Standard SOP</div>
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded bg-danger" /> Incident</div>
        </div>

        {/* React Flow Core Canvas */}
        <div className="w-full h-full">
          <ReactFlow
            nodes={initialNodes}
            edges={initialEdges}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            fitView
            minZoom={0.5}
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
                    {selectedNodeData.label}
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
                    {selectedNodeData.details && Object.entries(selectedNodeData.details).map(([key, val]) => (
                      <div key={key} className="flex justify-between text-xs">
                        <span className="text-text-muted">{key}</span>
                        <span className="text-white font-medium">{val}</span>
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
                      const targetNode = mockGraph.nodes.find(n => n.id === targetId);

                      return (
                        <div
                          key={link.id}
                          onClick={() => setSelectedNodeId(targetId)}
                          className="p-2 bg-card-secondary/40 border border-border/40 hover:border-primary/30 rounded-lg text-xs flex justify-between items-center group cursor-pointer transition-all duration-200"
                        >
                          <div>
                            <span className="text-[9px] text-text-muted font-mono uppercase font-bold block">
                              {link.label}
                            </span>
                            <span className="text-white font-medium group-hover:text-primary transition-colors line-clamp-1">
                              {targetNode?.label}
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
              {selectedNodeData.type === 'incident' && (
                <button
                  onClick={() => openRcaWithId('INC-2026-089')}
                  className="w-full py-2.5 bg-danger text-white text-xs font-bold rounded-xl hover:bg-danger/80 transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer border border-danger/30"
                >
                  <AlertTriangle className="w-4 h-4 text-white" />
                  Perform Deep RCA Diagnostic
                </button>
              )}

              {selectedNodeData.type === 'equipment' && (
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
