import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Cpu, 
  FileText, 
  AlertTriangle, 
  CheckCircle,
  Activity,
  Zap,
  Gauge,
  Thermometer,
  Compass
} from 'lucide-react';
import GlassCard from './GlassCard';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface PidDrawingExplorerProps {
  doc: any;
  onClose: () => void;
  setActiveTab: (tab: any) => void;
}

export const PidDrawingExplorer: React.FC<PidDrawingExplorerProps> = ({
  doc,
  onClose,
  setActiveTab
}) => {
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [selectedEqId, setSelectedEqId] = useState<string>('EQ-B3');
  const [loading, setLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isScanning, setIsScanning] = useState(true);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Custom simulation states for the selected equipment
  const [simTemp, setSimTemp] = useState<number>(0);
  const [simPress, setSimPress] = useState<number>(0);
  const [simVib, setSimVib] = useState<number>(0);
  const [isOverridden, setIsOverridden] = useState(false);

  // Fetch equipment list from backend
  useEffect(() => {
    const token = localStorage.getItem("plantmind_auth_token");
    fetch('http://127.0.0.1:8000/api/v1/incidents/equipment', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch equipment');
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setEquipmentList(data);
          // Set first available equipment or match doc reference
          const docEqTag = doc.entities?.equipment_tag;
          const matched = data.find((e: any) => e.id === docEqTag || e.id.includes(docEqTag || ''));
          if (matched) {
            setSelectedEqId(matched.id);
          } else {
            setSelectedEqId(data[0].id);
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching equipment list for drawing explorer:', err);
        // Fallback to static mock data if backend query fails
        const fallbackData = [
          { id: 'EQ-B3', name: 'Steam Boiler Unit 3', type: 'B', location: 'Thermal Power Block B', health: 74, status: 'warning', temperature: 542.0, pressure: 168.0, vibration: 4.8, flow_rate: 480.0, oee: 82.4 },
          { id: 'EQ-GT01', name: 'Gas Turbine GT-01', type: 'Siemens SGT-800', location: 'Co-generation Unit 1', health: 96, status: 'healthy', temperature: 920.0, pressure: 32.0, vibration: 1.2, flow_rate: null, oee: 94.8 },
          { id: 'EQ-RC2', name: 'Refinery Column C-102', type: 'Fractional Distillation', location: 'Hydrocracking Sector 2', health: 48, status: 'critical', temperature: 385.0, pressure: 12.4, vibration: 6.2, flow_rate: 840.0, oee: 64.1 },
          { id: 'EQ-P102', name: 'Feed Pump P-102A', type: 'P', location: 'Water Feed Sector B', health: 88, status: 'healthy', temperature: 65.0, pressure: 48.0, vibration: 2.1, flow_rate: 350.0, oee: 91.2 },
          { id: 'EQ-HE4', name: 'Heat Exchanger HE-04', type: 'Shell & Tube Exchanger', location: 'Cooling Block 4', health: 82, status: 'healthy', temperature: 185.0, pressure: 16.2, vibration: 0.8, flow_rate: 1420.0, oee: 89.5 }
        ];
        setEquipmentList(fallbackData);
        setSelectedEqId('EQ-B3');
        setLoading(false);
      });

    // Auto-disable scanning line after 2.5s
    const timer = setTimeout(() => {
      setIsScanning(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, [doc]);

  // Synchronize simulation sliders when the selected equipment changes
  const selectedEq = equipmentList.find((e) => e.id === selectedEqId);
  useEffect(() => {
    if (selectedEq) {
      setSimTemp(selectedEq.temperature);
      setSimPress(selectedEq.pressure);
      setSimVib(selectedEq.vibration);
      setIsOverridden(false);
    }
  }, [selectedEqId, selectedEq]);

  // Compute live safety alarm values
  const getSimulatedStatus = () => {
    if (!selectedEq) return 'healthy';
    let tempLimit = selectedEq.id === 'EQ-B3' ? 580 : selectedEq.id === 'EQ-GT01' ? 1000 : 400;
    let pressLimit = selectedEq.id === 'EQ-B3' ? 180 : selectedEq.id === 'EQ-GT01' ? 35 : 12;
    let vibLimit = 5.0;

    if (simTemp > tempLimit || simPress > pressLimit || simVib > vibLimit) {
      return 'critical';
    } else if (simTemp > tempLimit * 0.9 || simPress > pressLimit * 0.9 || simVib > vibLimit * 0.8) {
      return 'warning';
    }
    return 'healthy';
  };

  const getSimulatedHealth = () => {
    if (!selectedEq) return 100;
    const status = getSimulatedStatus();
    if (status === 'critical') return Math.min(selectedEq.health, 45);
    if (status === 'warning') return Math.min(selectedEq.health, 75);
    return selectedEq.health;
  };

  // Zoom and Pan Handlers
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    setPanOffset({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  // Dispatch prompt context to Copilot and change tab
  const handleAskCopilot = () => {
    const status = getSimulatedStatus();
    const tempVal = simTemp.toFixed(1);
    const pressVal = simPress.toFixed(1);
    const query = `Analyze the current health of equipment ${selectedEq?.name} (${selectedEq?.id}). Current simulated metrics stand at: Temperature: ${tempVal}°C, Pressure: ${pressVal} bar, Vibration: ${simVib.toFixed(1)} mm/s. The device state indicator is [${status.toUpperCase()}]. Provide me a compliance audit checklist against standard operating parameters and maintenance suggestions.`;
    
    localStorage.setItem('plantmind_pending_copilot_query', query);
    setActiveTab('copilot');
  };

  // Reset override sliders
  const handleResetCalibration = () => {
    if (selectedEq) {
      setSimTemp(selectedEq.temperature);
      setSimPress(selectedEq.pressure);
      setSimVib(selectedEq.vibration);
      setIsOverridden(false);
    }
  };

  // Simulated trend graph data
  const trendData = [
    { time: '08:00', val: simTemp * 0.95 },
    { time: '10:00', val: simTemp * 0.98 },
    { time: '12:00', val: simTemp * 1.02 },
    { time: '14:00', val: simTemp * 0.99 },
    { time: '16:00', val: simTemp },
  ];

  const currentStatus = getSimulatedStatus();
  const currentHealth = getSimulatedHealth();

  return (
    <div className="fixed inset-0 z-50 bg-[#040608]/90 backdrop-blur-md flex items-center justify-center p-4 md:p-6 overflow-hidden select-none">
      <div className="w-full h-full max-w-[1700px] flex flex-col glass-panel-heavy border border-border/80 rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative">
        
        {/* Radar Scanning Line Overlay */}
        <AnimatePresence>
          {isScanning && (
            <motion.div 
              initial={{ top: '0%' }}
              animate={{ top: '100%' }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.2, ease: "easeInOut" }}
              className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-secondary to-transparent z-40 shadow-[0_0_20px_#00E5FF] pointer-events-none"
            />
          )}
        </AnimatePresence>

        {/* Top Header bar */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-border/40 bg-card-secondary/20">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg border border-primary/20 text-primary">
              <Compass className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            <div>
              <h2 className="text-sm font-heading font-extrabold text-white tracking-wide uppercase flex items-center gap-2">
                P&ID AI Hotspot Blueprint Explorer
                {isScanning && (
                  <span className="text-[9px] font-code bg-secondary/10 text-secondary px-2 py-0.5 rounded animate-pulse">
                    PARSING DRAWING ENTITIES
                  </span>
                )}
              </h2>
              <p className="text-[10px] text-text-muted font-mono uppercase mt-0.5">
                Target Ref // {doc.code} // Source Document: {doc.title}
              </p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="p-1.5 text-text-secondary hover:text-white bg-card-secondary hover:bg-card border border-border/60 hover:border-border rounded-lg transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Split Panel Screen */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 relative">
          
          {/* LEFT: P&ID Drawing Canvas Panel */}
          <div 
            className="flex-1 bg-[#05080c] relative overflow-hidden border-r border-border/30 cursor-grab active:cursor-grabbing flex items-center justify-center"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Blueprint Grid Lines Background */}
            <div className="absolute inset-0 blueprint-grid opacity-20 pointer-events-none" />

            {/* Inner draggable, zoomable SVG container */}
            <div 
              style={{
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
                transition: isDragging.current ? 'none' : 'transform 0.15s ease-out',
                transformOrigin: 'center center'
              }}
              className="w-[850px] h-[550px] relative pointer-events-auto select-none"
            >
              {/* Process Engineering Vector Drawing */}
              <svg 
                viewBox="0 0 850 550" 
                className="w-full h-full text-border/60 font-code"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Pipeline Flow Loops (Cyan) */}
                <path d="M 50 150 L 150 150" fill="none" stroke="#64748B" strokeWidth="3" />
                <path d="M 230 150 L 320 150 L 320 280 L 450 280" fill="none" stroke="#00E5FF" strokeWidth="4" strokeDasharray="6,4" className="animate-pulse" />
                <path d="M 530 280 L 600 280 L 600 150 L 680 150" fill="none" stroke="#F97316" strokeWidth="4" strokeDasharray="6,4" />
                <path d="M 190 190 L 190 380 L 530 380 L 530 310" fill="none" stroke="#10B981" strokeWidth="3" />
                <path d="M 760 150 L 820 150" fill="none" stroke="#64748B" strokeWidth="3" />

                {/* Pipeline Labels */}
                <text x="75" y="135" fill="#64748B" fontSize="9" fontWeight="bold">RAW FEED LOOP</text>
                <text x="240" y="135" fill="#00E5FF" fontSize="9" fontWeight="bold">HP STEAM OVERLAY</text>
                <text x="590" y="320" fill="#F97316" fontSize="9" fontWeight="bold">REFINERY FRACTION DISCHARGE</text>

                {/* Valve symbols */}
                <g transform="translate(260, 150)" stroke="#64748B" strokeWidth="2" fill="#0c1219">
                  <polygon points="-8,-8 8,8 8,-8 -8,8" />
                  <line x1="0" y1="0" x2="0" y2="-12" />
                  <line x1="-6" y1="-12" x2="6" y2="-12" />
                </g>
                <text x="250" y="130" fill="#64748B" fontSize="8">FCV-301</text>

                <g transform="translate(630, 150)" stroke="#64748B" strokeWidth="2" fill="#0c1219">
                  <polygon points="-8,-8 8,8 8,-8 -8,8" />
                  <line x1="0" y1="0" x2="0" y2="-12" />
                  <line x1="-6" y1="-12" x2="6" y2="-12" />
                </g>
                <text x="620" y="130" fill="#64748B" fontSize="8">HCV-04</text>

                {/* --- Interactive Equipment Hotspots --- */}

                {/* 1. Feed Pump P-102A */}
                <g 
                  onClick={(e) => { e.stopPropagation(); setSelectedEqId('EQ-P102'); }}
                  className="cursor-pointer group"
                >
                  {/* Glowing backdrop circle */}
                  <circle cx="190" cy="150" r="38" className={`fill-none stroke-2 transition-all duration-300 ${selectedEqId === 'EQ-P102' ? 'stroke-secondary shadow-glow-cyan' : 'stroke-border/40 group-hover:stroke-secondary/60'}`} />
                  <circle cx="190" cy="150" r="28" fill="#0d141d" className="stroke-border/80" strokeWidth="2" />
                  <polygon points="178,140 205,150 178,160" fill="none" stroke="#64748B" strokeWidth="2" />
                  {/* Pulsing ring if critical/warning */}
                  {equipmentList.find(e => e.id === 'EQ-P102')?.status !== 'healthy' && (
                    <circle cx="190" cy="150" r="34" fill="none" stroke="#10B981" strokeWidth="1.5" className="animate-ping" style={{ animationDuration: '3s' }} />
                  )}
                  {/* Device Tag */}
                  <rect x="155" y="200" width="70" height="20" rx="4" fill="#0f172a" stroke="#00E5FF" strokeWidth="1" />
                  <text x="190" y="213" fill="white" fontSize="9" fontWeight="bold" textAnchor="middle">EQ-P102</text>
                </g>

                {/* 2. Heat Exchanger HE-04 */}
                <g 
                  onClick={(e) => { e.stopPropagation(); setSelectedEqId('EQ-HE4'); }}
                  className="cursor-pointer group"
                >
                  <rect x="290" y="280" width="80" height="40" rx="6" fill="#0d141d" className={`stroke-2 transition-all duration-300 ${selectedEqId === 'EQ-HE4' ? 'stroke-secondary' : 'stroke-border/40 group-hover:stroke-secondary/60'}`} />
                  {/* Exchanger tubes pattern */}
                  <line x1="300" y1="290" x2="360" y2="290" stroke="#64748B" strokeWidth="1.5" />
                  <line x1="300" y1="300" x2="360" y2="300" stroke="#64748B" strokeWidth="1.5" />
                  <line x1="300" y1="310" x2="360" y2="310" stroke="#64748B" strokeWidth="1.5" />
                  {/* Tag label */}
                  <rect x="295" y="335" width="70" height="20" rx="4" fill="#0f172a" stroke="#00E5FF" strokeWidth="1" />
                  <text x="330" y="348" fill="white" fontSize="9" fontWeight="bold" textAnchor="middle">EQ-HE4</text>
                </g>

                {/* 3. Steam Boiler Unit 3 */}
                <g 
                  onClick={(e) => { e.stopPropagation(); setSelectedEqId('EQ-B3'); }}
                  className="cursor-pointer group"
                >
                  {/* Glowing outline depending on simulation status */}
                  <rect x="450" y="230" width="80" height="80" rx="10" fill="#0d141d" 
                    className={`stroke-2 transition-all duration-300 ${
                      selectedEqId === 'EQ-B3' 
                        ? 'stroke-primary shadow-glow-orange' 
                        : 'stroke-border/40 group-hover:stroke-primary/60'
                    }`} 
                  />
                  {/* Fire element */}
                  <path d="M 480 290 Q 490 260 495 275 Q 500 255 510 290 Z" fill="none" stroke="#F97316" strokeWidth="2" className="animate-pulse" />
                  {/* Status Indicator circle inside Boiler */}
                  <circle cx="490" cy="248" r="4" fill={selectedEqId === 'EQ-B3' && currentStatus === 'critical' ? '#EF4444' : selectedEqId === 'EQ-B3' && currentStatus === 'warning' ? '#F59E0B' : '#10B981'} className={selectedEqId === 'EQ-B3' && currentStatus !== 'healthy' ? 'animate-ping' : ''} />
                  {/* Device Tag */}
                  <rect x="455" y="325" width="70" height="20" rx="4" fill="#0f172a" stroke="#F97316" strokeWidth="1" />
                  <text x="490" y="338" fill="white" fontSize="9" fontWeight="bold" textAnchor="middle">EQ-B3</text>
                </g>

                {/* 4. Refinery Column C-102 */}
                <g 
                  onClick={(e) => { e.stopPropagation(); setSelectedEqId('EQ-RC2'); }}
                  className="cursor-pointer group"
                >
                  <rect x="680" y="90" width="80" height="120" rx="8" fill="#0d141d" 
                    className={`stroke-2 transition-all duration-300 ${
                      selectedEqId === 'EQ-RC2' 
                        ? 'stroke-red-500 shadow-glow-red' 
                        : 'stroke-border/40 group-hover:stroke-red-500/60'
                    }`} 
                  />
                  {/* Column segments */}
                  <line x1="680" y1="120" x2="760" y2="120" stroke="#64748B" strokeWidth="1" strokeDasharray="3,2" />
                  <line x1="680" y1="150" x2="760" y2="150" stroke="#64748B" strokeWidth="1" strokeDasharray="3,2" />
                  <line x1="680" y1="180" x2="760" y2="180" stroke="#64748B" strokeWidth="1" strokeDasharray="3,2" />
                  {/* Device Tag */}
                  <rect x="685" y="225" width="70" height="20" rx="4" fill="#0f172a" stroke="#EF4444" strokeWidth="1" />
                  <text x="720" y="238" fill="white" fontSize="9" fontWeight="bold" textAnchor="middle">EQ-RC2</text>
                </g>

                {/* 5. Gas Turbine GT-01 */}
                <g 
                  onClick={(e) => { e.stopPropagation(); setSelectedEqId('EQ-GT01'); }}
                  className="cursor-pointer group"
                >
                  <polygon points="450,420 530,390 530,470 450,440" fill="#0d141d" 
                    className={`stroke-2 transition-all duration-300 ${
                      selectedEqId === 'EQ-GT01' 
                        ? 'stroke-emerald-500 shadow-glow-green' 
                        : 'stroke-border/40 group-hover:stroke-emerald-500/60'
                    }`} 
                  />
                  <circle cx="490" cy="430" r="12" fill="none" stroke="#64748B" strokeWidth="1.5" className="animate-spin" style={{ animationDuration: '4s' }} />
                  {/* Device Tag */}
                  <rect x="455" y="485" width="70" height="20" rx="4" fill="#0f172a" stroke="#10B981" strokeWidth="1" />
                  <text x="490" y="498" fill="white" fontSize="9" fontWeight="bold" textAnchor="middle">EQ-GT01</text>
                </g>
              </svg>
            </div>

            {/* Canvas Controls Overlay (Bottom-Left) */}
            <div className="absolute bottom-6 left-6 flex items-center gap-1 bg-card/85 backdrop-blur border border-border/60 p-1.5 rounded-xl z-20 shadow-lg">
              <button 
                onClick={handleZoomIn}
                title="Zoom In"
                className="p-1.5 text-text-secondary hover:text-white hover:bg-card-secondary rounded-lg transition-colors cursor-pointer"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button 
                onClick={handleZoomOut}
                title="Zoom Out"
                className="p-1.5 text-text-secondary hover:text-white hover:bg-card-secondary rounded-lg transition-colors cursor-pointer"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <div className="w-[1px] h-4 bg-border/40 mx-1" />
              <button 
                onClick={handleResetZoom}
                title="Reset View"
                className="p-1.5 text-text-secondary hover:text-white hover:bg-card-secondary rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
            
            {/* Quick Map Legend */}
            <div className="absolute top-6 left-6 bg-card/80 backdrop-blur border border-border/60 px-3.5 py-2.5 rounded-xl text-[10px] font-mono space-y-1.5 z-20">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-glow-green" />
                <span className="text-white">OPERATING / HEALTHY</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-warning shadow-glow-orange" />
                <span className="text-white">WARNING EXCURSION</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-glow-red" />
                <span className="text-white">CRITICAL ALARM LIMIT</span>
              </div>
            </div>
          </div>

          {/* RIGHT: Equipment Inspector Panel */}
          <div className="w-full lg:w-[480px] bg-[#070b0f] border-t lg:border-t-0 p-6 overflow-y-auto max-h-[calc(100vh-100px)] flex flex-col justify-between space-y-6">
            
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16 animate-pulse">
                <Activity className="w-10 h-10 text-primary animate-bounce mb-3" />
                <p className="text-xs text-text-secondary font-mono">Synchronizing live instrumentation loop...</p>
              </div>
            ) : selectedEq ? (
              <div className="space-y-6 flex-1">
                {/* Header: Equipment metadata */}
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-code text-primary uppercase font-bold tracking-widest bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                      {selectedEq.type} UNIT // {selectedEq.id}
                    </span>
                    <h3 className="text-base font-heading font-extrabold text-white mt-2">
                      {selectedEq.name}
                    </h3>
                    <p className="text-[11px] text-text-muted font-mono mt-0.5 uppercase">
                      LOC: {selectedEq.location}
                    </p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`text-[10px] font-code px-2 py-0.5 rounded border uppercase tracking-wider font-extrabold
                      ${currentStatus === 'healthy' ? 'text-success bg-success/5 border-success/20' : 
                        currentStatus === 'warning' ? 'text-warning bg-warning/5 border-warning/20' : 
                        'text-danger bg-danger/5 border-danger/20'}
                    `}>
                      {currentStatus}
                    </span>
                    <h4 className={`text-xl font-heading font-extrabold mt-1.5 ${
                      currentStatus === 'healthy' ? 'text-success' : 
                      currentStatus === 'warning' ? 'text-warning' : 'text-danger'
                    }`}>
                      {currentHealth}% <span className="text-[10px] text-text-muted font-mono font-normal">HEALTH</span>
                    </h4>
                  </div>
                </div>

                {/* Alarm warnings (if warning or critical) */}
                {currentStatus !== 'healthy' && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-3.5 border rounded-xl flex gap-3 items-start ${
                      currentStatus === 'critical' ? 'bg-danger/10 border-danger/25 text-danger' : 'bg-warning/10 border-warning/25 text-warning'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 animate-bounce" />
                    <div className="text-[11px] leading-relaxed">
                      <span className="font-bold uppercase font-mono">Limit Violation:</span>{' '}
                      {simTemp > (selectedEq.id === 'EQ-B3' ? 580 : selectedEq.id === 'EQ-GT01' ? 1000 : 400) && `Core thermal reading (${simTemp.toFixed(1)}°C) exceeds safety limit.`}
                      {simPress > (selectedEq.id === 'EQ-B3' ? 180 : selectedEq.id === 'EQ-GT01' ? 35 : 12) && `Chamber pressure reading (${simPress.toFixed(1)} bar) exceeds stress safety envelope.`}
                      {simVib > 5.0 && `Bearing vibration sensor (${simVib.toFixed(1)} mm/s) registers severe mechanical stress.`}
                      <p className="font-semibold font-mono mt-1 text-[9px] uppercase opacity-80">ACTION REQUIRED // SHUTDOWN THRESHOLD APPROACHING</p>
                    </div>
                  </motion.div>
                )}

                {/* Dynamic Telemetry dials grid */}
                <div className="grid grid-cols-2 gap-4">
                  
                  {/* Temp Gauge */}
                  <GlassCard className="p-4 border-border/40 flex flex-col justify-between min-h-[110px]" hoverEffect={false}>
                    <div className="flex justify-between items-center text-[10px] text-text-muted font-bold font-mono uppercase">
                      <span>TEMPERATURE</span>
                      <Thermometer className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="mt-2.5">
                      <h4 className="text-base font-extrabold font-heading text-white">
                        {simTemp.toFixed(1)} <span className="text-[10px] text-text-muted font-mono font-normal">°C</span>
                      </h4>
                      <div className="w-full bg-card-secondary h-1 rounded-full mt-2 overflow-hidden border border-border/20">
                        <div 
                          className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300"
                          style={{ width: `${Math.min((simTemp / (selectedEq.id === 'EQ-B3' ? 620 : selectedEq.id === 'EQ-GT01' ? 1100 : 450)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </GlassCard>

                  {/* Pressure Gauge */}
                  <GlassCard className="p-4 border-border/40 flex flex-col justify-between min-h-[110px]" hoverEffect={false}>
                    <div className="flex justify-between items-center text-[10px] text-text-muted font-bold font-mono uppercase">
                      <span>PRESSURE</span>
                      <Gauge className="w-3.5 h-3.5 text-secondary" />
                    </div>
                    <div className="mt-2.5">
                      <h4 className="text-base font-extrabold font-heading text-white">
                        {simPress.toFixed(1)} <span className="text-[10px] text-text-muted font-mono font-normal">bar</span>
                      </h4>
                      <div className="w-full bg-card-secondary h-1 rounded-full mt-2 overflow-hidden border border-border/20">
                        <div 
                          className="h-full bg-gradient-to-r from-secondary to-blue-500 transition-all duration-300"
                          style={{ width: `${Math.min((simPress / (selectedEq.id === 'EQ-B3' ? 200 : selectedEq.id === 'EQ-GT01' ? 40 : 15)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </GlassCard>

                  {/* Vibration Gauge */}
                  <GlassCard className="p-4 border-border/40 flex flex-col justify-between min-h-[110px]" hoverEffect={false}>
                    <div className="flex justify-between items-center text-[10px] text-text-muted font-bold font-mono uppercase">
                      <span>VIBRATION</span>
                      <Activity className="w-3.5 h-3.5 text-warning" />
                    </div>
                    <div className="mt-2.5">
                      <h4 className="text-base font-extrabold font-heading text-white">
                        {simVib.toFixed(1)} <span className="text-[10px] text-text-muted font-mono font-normal">mm/s</span>
                      </h4>
                      <div className="w-full bg-card-secondary h-1 rounded-full mt-2 overflow-hidden border border-border/20">
                        <div 
                          className="h-full bg-gradient-to-r from-warning to-red-500 transition-all duration-300"
                          style={{ width: `${Math.min((simVib / 6.5) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </GlassCard>

                  {/* Performance OEE */}
                  <GlassCard className="p-4 border-border/40 flex flex-col justify-between min-h-[110px]" hoverEffect={false}>
                    <div className="flex justify-between items-center text-[10px] text-text-muted font-bold font-mono uppercase">
                      <span>PLANT OEE</span>
                      <Zap className="w-3.5 h-3.5 text-success" />
                    </div>
                    <div className="mt-2.5">
                      <h4 className="text-base font-extrabold font-heading text-white">
                        {selectedEq.oee.toFixed(1)} <span className="text-[10px] text-text-muted font-mono font-normal">%</span>
                      </h4>
                      <div className="w-full bg-card-secondary h-1 rounded-full mt-2 overflow-hidden border border-border/20">
                        <div 
                          className="h-full bg-gradient-to-r from-success to-emerald-400 transition-all duration-300"
                          style={{ width: `${selectedEq.oee}%` }}
                        />
                      </div>
                    </div>
                  </GlassCard>

                </div>

                {/* Telemetry override simulation controls */}
                <div className="space-y-4 pt-4 border-t border-border/30">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-bold text-text-muted font-mono uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      Override Simulation controls
                    </h4>
                    {isOverridden && (
                      <span className="text-[8px] font-code text-warning border border-warning/20 bg-warning/5 px-2 py-0.5 rounded">
                        CALIBRATION DEVIATION
                      </span>
                    )}
                  </div>
                  
                  {/* Temp slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] text-text-secondary font-mono">
                      <span>Core Temp Simulator</span>
                      <span className="text-white font-bold">{simTemp.toFixed(0)}°C</span>
                    </div>
                    <input 
                      type="range"
                      min={selectedEq.id === 'EQ-B3' ? 300 : selectedEq.id === 'EQ-GT01' ? 600 : 100}
                      max={selectedEq.id === 'EQ-B3' ? 650 : selectedEq.id === 'EQ-GT01' ? 1200 : 500}
                      value={simTemp}
                      onChange={(e) => {
                        setSimTemp(parseFloat(e.target.value));
                        setIsOverridden(true);
                      }}
                      className="w-full accent-primary bg-card border border-border/40 h-1 rounded-lg outline-none cursor-pointer"
                    />
                  </div>

                  {/* Pressure slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] text-text-secondary font-mono">
                      <span>Loop Pressure Simulator</span>
                      <span className="text-white font-bold">{simPress.toFixed(1)} bar</span>
                    </div>
                    <input 
                      type="range"
                      min={selectedEq.id === 'EQ-B3' ? 100 : selectedEq.id === 'EQ-GT01' ? 10 : 2}
                      max={selectedEq.id === 'EQ-B3' ? 220 : selectedEq.id === 'EQ-GT01' ? 45 : 20}
                      step="0.1"
                      value={simPress}
                      onChange={(e) => {
                        setSimPress(parseFloat(e.target.value));
                        setIsOverridden(true);
                      }}
                      className="w-full accent-secondary bg-card border border-border/40 h-1 rounded-lg outline-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* Simulated Telemetry Trend Graph */}
                <div className="space-y-2.5 pt-4 border-t border-border/30">
                  <h4 className="text-[10px] font-bold text-text-muted font-mono uppercase tracking-wider">
                    Historic Telemetry Trend (last 8h)
                  </h4>
                  <div className="h-28 w-full border border-border/30 rounded-xl bg-card/30 p-2 overflow-hidden">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                        <XAxis dataKey="time" stroke="#64748B" fontSize={8} tickLine={false} />
                        <YAxis stroke="#64748B" fontSize={8} tickLine={false} />
                        <Tooltip contentStyle={{ background: '#0a0f14', border: '1px solid #1e293b', fontSize: 9, color: 'white' }} />
                        <Area type="monotone" dataKey="val" stroke="#F97316" fill="rgba(249,115,22,0.15)" strokeWidth={1.5} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Regulatory Standards Reference links */}
                <div className="space-y-2 pt-4 border-t border-border/30">
                  <h4 className="text-[10px] font-bold text-text-muted font-mono uppercase tracking-wider">
                    Associated Safety Compliance codes
                  </h4>
                  <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                    <span className="bg-card-secondary border border-border/80 text-text-secondary px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-primary" />
                      {selectedEq.id === 'EQ-B3' ? 'OSHA 1910.119 (PSM)' : selectedEq.id === 'EQ-RC2' ? 'API 521 (Venting Standards)' : 'ISO 10816 (Vibration Standards)'}
                    </span>
                    <span className="bg-card-secondary border border-border/80 text-text-secondary px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-success" />
                      Active compliance audit verified
                    </span>
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-16">
                <p className="text-xs text-text-secondary font-mono">Select a P&ID hotspot node to view diagnostics.</p>
              </div>
            )}

            {/* Quick Actions Footer inside Sidebar */}
            <div className="pt-4 border-t border-border/40 flex items-center gap-3">
              {isOverridden && (
                <button
                  onClick={handleResetCalibration}
                  className="flex-1 py-2.5 border border-border/60 hover:border-border text-[11px] font-code font-bold uppercase rounded-xl hover:bg-card-secondary/50 text-white transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Calibrate Loop
                </button>
              )}
              
              <button
                onClick={handleAskCopilot}
                className="flex-2 py-2.5 bg-gradient-to-r from-primary to-secondary text-white text-[11px] font-code font-bold uppercase rounded-xl hover:shadow-glow-orange border border-transparent transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Cpu className="w-3.5 h-3.5 animate-pulse" />
                Query Copilot Advisor
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default PidDrawingExplorer;
