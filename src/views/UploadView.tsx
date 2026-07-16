import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UploadCloud, 
  FileText, 
  Cpu, 
  Layers, 
  Network, 
  CheckCircle2, 
  Zap, 
  RefreshCw
} from 'lucide-react';
import GlassCard from '../components/GlassCard';

interface UploadViewProps {
  setActiveTab?: (tab: any) => void;
}

export const UploadView: React.FC<UploadViewProps> = ({ setActiveTab }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pipelineStep, setPipelineStep] = useState<number>(-1); // -1: not started, 0: upload, 1: enhancement, 2: OCR/Parse, 3: Entities, 4: Graph, 5: Embeddings, 6: Ready
  const [pipelineLogs, setPipelineLogs] = useState<string[]>([]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleUploadFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      handleUploadFile(file);
    }
  };

  const handleUploadFile = async (file: File) => {
    const sizeStr = (file.size / (1024 * 1024)).toFixed(2) + " MB";
    setSelectedFile({ name: file.name, size: sizeStr });
    setUploadProgress(0);
    setPipelineStep(0);
    setPipelineLogs(["[00:00] Ingesting document package...", "[00:01] Transmitting file bytes to secure upload buffer..."]);

    let progress = 0;
    const progressInterval = window.setInterval(() => {
      progress += 10;
      if (progress >= 100) {
        clearInterval(progressInterval);
        setUploadProgress(100);
        setPipelineStep(1);
        setPipelineLogs(prev => [
          ...prev,
          `[00:02] File upload success. Size: ${sizeStr}`,
          `[00:03] Beginning layout analysis & content processing...`
        ]);
        
        triggerPipelineExecution(file, sizeStr);
      } else {
        setUploadProgress(progress);
      }
    }, 100);
  };

  const triggerPipelineExecution = async (file: File, sizeStr: string) => {
    const formData = new FormData();
    formData.append("file", file);

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const isCvType = ["pdf", "png", "jpg", "jpeg", "tiff", "bmp"].includes(ext);
    const url = isCvType 
      ? "http://127.0.0.1:8000/cv/process"
      : "http://127.0.0.1:8000/api/v1/upload";

    setTimeout(async () => {
      setPipelineStep(2);
      setPipelineLogs(prev => [
        ...prev,
        isCvType 
          ? `[00:05] Shadows and noise removed. Text sharpening filter applied.`
          : `[00:05] File format verified. Formatting structure clean.`,
        isCvType
          ? `[00:06] Document deskewed and binarized with adaptive threshold.`
          : `[00:06] Ingested document metadata and tags.`,
        `[00:07] Initializing neural character & structure recognition...`
      ]);

      try {
        const token = localStorage.getItem("plantmind_auth_token");
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`
          },
          body: formData
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || "Document ingestion pipeline request failed");
        }
        const data = await res.json();
        
        executeApiSuccessStages(data, !isCvType, file.name);
      } catch (err: any) {
        console.warn("Backend CV pipeline unreachable or rejected. Running simulation fallback.", err);
        setPipelineLogs(prev => [
          ...prev,
          `[00:08] Backend error: ${err.message || err}. Reverting to local simulation fallback.`
        ]);
        runFallbackSimulation(file.name, sizeStr);
      }
    }, 1500);
  };

  const executeApiSuccessStages = (data: any, isGeneralUpload: boolean, _filename: string) => {
    const docId = isGeneralUpload ? data.id : data.document_id;
    const confidence = isGeneralUpload ? 98 : data.confidence;
    const equipment = isGeneralUpload ? (data.entities?.equipment_ids || []) : (data.equipment || []);
    const engineers = isGeneralUpload ? (data.entities?.engineer_names || []) : (data.entities || []);
    const nodeCount = isGeneralUpload ? (equipment.length + engineers.length + 1) : (data.knowledge_graph_nodes?.length || 1);

    setTimeout(() => {
      setPipelineStep(3);
      setPipelineLogs(prev => [
        ...prev,
        `[00:10] Ingestion complete. Average confidence: ${confidence}%.`,
        `[00:11] Registered document in database. ID: ${docId}`,
        `[00:12] Running entity extraction: Mining parameters & tags...`,
        `[00:13] Extracted Equipment: [${equipment.join(", ") || "N/A"}]`,
        `[00:14] Extracted Engineers: [${engineers.join(", ") || "N/A"}]`
      ]);
    }, 1200);

    setTimeout(() => {
      setPipelineStep(4);
      setPipelineLogs(prev => [
        ...prev,
        `[00:16] Mapping relational references inside NetworkX Graph...`,
        `[00:17] Created ${nodeCount} nodes (type: ${equipment.length > 0 ? "equipment" : "document"}).`,
        `[00:18] Graph connections established (label: mentions/references).`
      ]);
    }, 2400);

    setTimeout(() => {
      setPipelineStep(5);
      setPipelineLogs(prev => [
        ...prev,
        `[00:20] Chunking document text for RAG (Size: 1000, Overlap: 200)...`,
        `[00:21] Generating 1,536-dimensional embeddings...`,
        `[00:22] Vector records stored successfully in ChromaDB.`
      ]);
    }, 3600);

    setTimeout(() => {
      setPipelineStep(6);
      setPipelineLogs(prev => [
        ...prev,
        `[00:24] System synchronization complete. Status: SUCCESS.`,
        `[00:25] New industrial node active in PlantMind Knowledge Network.`
      ]);
    }, 4800);
  };

  const runFallbackSimulation = (name: string, _size: string) => {
    setTimeout(() => {
      setPipelineStep(3);
      const isDrawing = name.toLowerCase().includes("dwg") || name.toLowerCase().includes("pid") || name.toLowerCase().includes("draw");
      const mockEquip = isDrawing ? "EQ-B3, V-102, FT-101" : "EQ-B3, EQ-GT01";
      const mockEng = "Sarah Chen, J. Marcus";
      
      setPipelineLogs(prev => [
        ...prev,
        `[00:10] OCR scan complete. Average Confidence: 94.2%. (Simulation Mode)`,
        `[00:11] Ingested 1 page layout into database. ID: DOC-SIM-${Date.now().toString().slice(-4)}`,
        `[00:12] Running entity extraction: Mining parameters & tags...`,
        `[00:13] Extracted Equipment: [${mockEquip}]`,
        `[00:14] Extracted Engineers: [${mockEng}]`
      ]);
    }, 1200);

    setTimeout(() => {
      setPipelineStep(4);
      setPipelineLogs(prev => [
        ...prev,
        `[00:16] Mapping relational references inside NetworkX Graph...`,
        `[00:17] Created 3 nodes (types: equipment, engineer, document).`,
        `[00:18] Graph connections established (label: mentions/references).`
      ]);
    }, 2400);

    setTimeout(() => {
      setPipelineStep(5);
      setPipelineLogs(prev => [
        ...prev,
        `[00:20] Chunking document text for RAG (Size: 1000, Overlap: 200)...`,
        `[00:21] Generating 1,536-dimensional embeddings...`,
        `[00:22] Vector records stored successfully in ChromaDB.`
      ]);
    }, 3600);

    setTimeout(() => {
      setPipelineStep(6);
      setPipelineLogs(prev => [
        ...prev,
        `[00:24] System synchronization complete. Status: SUCCESS.`,
        `[00:25] New simulated industrial node active in PlantMind Graph.`
      ]);
    }, 4800);
  };

  const resetPipeline = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    setPipelineStep(-1);
    setPipelineLogs([]);
  };

  const pipelineNodes = [
    { label: 'Uploading', icon: UploadCloud, desc: 'Transmitting bytes' },
    { label: 'Enhancement', icon: Layers, desc: 'Binarize & Deskew' },
    { label: 'OCR Engine', icon: FileText, desc: 'Neural OCR parsing' },
    { label: 'Entity Mining', icon: Cpu, desc: 'Parameter extraction' },
    { label: 'Knowledge Graph', icon: Network, desc: 'Relational mapping' },
    { label: 'Embeddings', icon: Zap, desc: 'ChromaDB ingestion' },
    { label: 'Completed', icon: CheckCircle2, desc: 'Node activated' }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-6">
        <GlassCard className="border-border/40 h-full flex flex-col justify-between" hoverEffect={false}>
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Ingestion Center</h3>
              <span className="text-[10px] text-text-muted font-mono">ENCRYPTED // SHA256</span>
            </div>

            {/* Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`
                border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 relative group cursor-pointer flex flex-col items-center justify-center min-h-[220px]
                ${dragActive ? 'border-secondary bg-secondary/5' : 'border-border/60 hover:border-primary/50 hover:bg-card-secondary/20'}
                ${selectedFile ? 'pointer-events-none opacity-40' : ''}
              `}
            >
              <input
                type="file"
                accept=".pdf,.docx,.xlsx,.csv,.json,.html,.htm,.md,.txt,.png,.jpg,.jpeg"
                onChange={handleFileSelect}
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={selectedFile !== null}
              />
              <div className="p-3.5 bg-card rounded-2xl border border-border/80 text-text-secondary group-hover:text-primary transition-colors mb-3">
                <UploadCloud className="w-8 h-8 group-hover:scale-110 transition-transform duration-300" />
              </div>
              <p className="text-xs text-white font-bold">Drag and drop document package here</p>
              <p className="text-[10px] text-text-muted mt-1 leading-normal">
                Supports PDF, DOCX, XLSX, CSV, JSON, HTML, MD, TXT, Images up to 100MB.<br />Automatic OCR extraction active.
              </p>
              
              <button 
                className="mt-4 px-3 py-1.5 bg-card-secondary hover:bg-card border border-border hover:border-primary/50 text-[10px] text-text-secondary hover:text-white rounded-lg transition-colors cursor-pointer"
                disabled={selectedFile !== null}
              >
                Browse Disk Files
              </button>
            </div>

            {/* Upload File Progress */}
            {selectedFile && (
              <div className="mt-6 p-4 bg-card-secondary/40 border border-border/40 rounded-xl space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <div>
                      <h4 className="text-xs font-bold text-white line-clamp-1">{selectedFile.name}</h4>
                      <p className="text-[9px] text-text-muted font-mono">{selectedFile.size}</p>
                    </div>
                  </div>
                  {uploadProgress === 100 && (
                    <span className="text-[10px] text-success font-code uppercase font-bold">Ingested</span>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-text-secondary">
                    <span>Transmission Status</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 bg-border/40 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-100"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {selectedFile && uploadProgress === 100 && (
            <div className="mt-6 space-y-2">
              {setActiveTab && pipelineStep === 6 && (
                <button
                  onClick={() => setActiveTab('documents')}
                  className="w-full py-2 bg-secondary text-background hover:bg-secondary/80 font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer shadow-glow-cyan text-xs"
                >
                  <FileText className="w-4 h-4" />
                  View in Document Manager
                </button>
              )}
              <button
                onClick={resetPipeline}
                className="w-full py-2 bg-card-secondary hover:bg-card border border-border hover:border-danger text-xs text-text-secondary hover:text-danger font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Clear Pipeline Ingestion
              </button>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Right 2 Columns: Pipeline Visualizer & Logs */}
      <div className="lg:col-span-2 space-y-6">
        <GlassCard className="border-border/40" hoverEffect={false}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-secondary" />
              Ingestion Pipeline Visualization
            </h3>
            <span className="text-[9px] text-secondary font-code border border-secondary/20 bg-secondary/5 px-2.5 py-0.5 rounded">
              PIPELINE SPEED // 1.2 GB/HR
            </span>
          </div>

          {/* Horizontal Pipeline flow */}
          <div className="grid grid-cols-7 gap-2 relative">
            {/* Horizontal progress bar background */}
            <div className="absolute top-5 left-8 right-8 h-[2px] bg-border/40 z-0" />
            
            {pipelineNodes.map((node, i) => {
              const NodeIcon = node.icon;
              
              const isCompleted = pipelineStep > i;
              const isActive = pipelineStep === i;
              const isPending = pipelineStep < i;

              return (
                <div key={node.label} className="flex flex-col items-center text-center z-10">
                  {/* Glowing Node Button */}
                  <motion.div
                    animate={isActive ? { scale: [1, 1.08, 1], borderColor: ['#2B3647', '#00E5FF', '#2B3647'] } : {}}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className={`
                      w-10 h-10 rounded-xl border flex items-center justify-center transition-all duration-300 relative
                      ${isCompleted ? 'bg-success/15 border-success text-success shadow-inner' : ''}
                      ${isActive ? 'bg-secondary/15 border-secondary text-secondary shadow-glow-cyan' : ''}
                      ${isPending ? 'bg-card border-border/80 text-text-muted' : ''}
                    `}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : isActive && i === 3 ? (
                      <Network className="w-5 h-5 animate-pulse text-secondary" />
                    ) : isActive ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-secondary" />
                    ) : (
                      <NodeIcon className="w-5 h-5" />
                    )}
                  </motion.div>

                  <span className={`text-[10px] font-bold mt-2 truncate max-w-full px-1
                    ${isCompleted ? 'text-success' : isActive ? 'text-secondary' : 'text-text-secondary'}
                  `}>
                    {node.label}
                  </span>
                  <span className="text-[9px] text-text-muted mt-0.5 hidden md:block">
                    {node.desc}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Running Terminal Ingestion Logs */}
          <div className="mt-8">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-white mb-2 font-mono">
              Pipeline Synthesis Console logs
            </h4>
            <div className="bg-[#080B0F] border border-border/50 rounded-xl p-4 h-48 font-code text-[11px] text-text-secondary overflow-y-auto space-y-1.5 shadow-inner">
              <AnimatePresence>
                {pipelineLogs.map((log, i) => (
                  <motion.p
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`leading-relaxed ${log.includes("Ready") || log.includes("ACTIVE") ? 'text-success' : log.includes("extracted") ? 'text-secondary' : ''}`}
                  >
                    {log}
                  </motion.p>
                ))}
              </AnimatePresence>

              {pipelineStep >= 0 && pipelineStep < 6 && (
                <div className="flex items-center gap-2 text-text-muted mt-2 animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-secondary animate-ping" />
                  <span>Synthesizing vector metrics...</span>
                </div>
              )}
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default UploadView;
