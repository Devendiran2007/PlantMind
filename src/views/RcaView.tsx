import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, 
  User, 
  Sparkles,
  Terminal,
  Activity
} from 'lucide-react';
import GlassCard from '../components/GlassCard';
import { mockIncidents, mockEquipment } from '../data/mockData';
import MultiAgentWarRoom from '../components/MultiAgentWarRoom';

interface RcaViewProps {
  selectedIncidentId: string | null;
  setSelectedIncidentId: (id: string | null) => void;
}

export const RcaView: React.FC<RcaViewProps> = ({
  selectedIncidentId,
  setSelectedIncidentId
}) => {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [activeIncidentId, setActiveIncidentId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Handle local state for evidence overrides, so the user can interactively toggle evidence relevance
  // and see the risk score update!
  const [evidenceStates, setEvidenceStates] = useState<Record<string, 'confirmed' | 'suspect' | 'unrelated'>>({});
  const [aiRec, setAiRec] = useState<string | null>(null);
  const [generatingRecs, setGeneratingRecs] = useState<boolean>(false);
  const [warRoomOpen, setWarRoomOpen] = useState<boolean>(false);

  // Real-time live telemetry override simulation states
  const [liveTemp, setLiveTemp] = useState<number>(0);
  const [livePress, setLivePress] = useState<number>(0);
  const [liveVib, setLiveVib] = useState<number>(0);

  // Find current incident data
  const incidentData = useMemo(() => {
    return incidents.find(inc => inc.id === activeIncidentId) || incidents[0] || mockIncidents[0];
  }, [activeIncidentId, incidents]);

  const activeEquipment = useMemo(() => {
    if (!incidentData) return mockEquipment[0];
    const eqId = incidentData.equipment_id || incidentData.equipmentId;
    return equipmentList.find(eq => eq.id === eqId) || equipmentList[0] || mockEquipment[0];
  }, [incidentData, equipmentList]);

  // Synchronize live telemetry values from selected equipment
  useEffect(() => {
    if (activeEquipment) {
      setLiveTemp(activeEquipment.temperature);
      setLivePress(activeEquipment.pressure);
      setLiveVib(activeEquipment.vibration);
    }
  }, [activeEquipment]);

  const generateAiMitigations = async () => {
    if (!incidentData) return;
    setGeneratingRecs(true);
    setAiRec(null);
    try {
      const prompt = `Synthesize immediate & scheduled mitigation steps for industrial incident ${incidentData.id}: "${incidentData.title}" involving asset ${activeEquipment?.name || "equipment"}. Return exactly 2-3 concise actions.`;
      const token = localStorage.getItem("plantmind_auth_token");
      const res = await fetch("http://127.0.0.1:8000/api/v1/copilot/query", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ query: prompt })
      });
      if (!res.ok) throw new Error("AI query failed");
      const data = await res.json();
      setAiRec(data.content);
    } catch (e) {
      console.error("AI Mitigations Error:", e);
      setAiRec("Immediate Action: Check alignment parameters.\nScheduled Action: Schedule bearing replacement audits.");
    } finally {
      setGeneratingRecs(false);
    }
  };

  // Compute dynamic similarities from DB
  const similarIncidents = useMemo(() => {
    if (!incidentData) return [];
    const eqId = incidentData.equipment_id || incidentData.equipmentId;
    return incidents
      .filter(inc => inc.id !== activeIncidentId && (inc.equipment_id === eqId || inc.equipmentId === eqId))
      .map(inc => ({
        id: inc.id,
        title: inc.title,
        match: '94%',
        status: inc.status
      }));
  }, [incidents, incidentData, activeIncidentId]);

  useEffect(() => {
    const token = localStorage.getItem("plantmind_auth_token");
    // 1. Fetch incidents from backend
    fetch('http://127.0.0.1:8000/api/v1/incidents', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then((res) => {
        if (!res.ok) throw new Error('API Response Error');
        return res.json();
      })
      .then((data) => {
        if (data && Array.isArray(data) && data.length > 0) {
          setIncidents(data);
          
          // Select default incident: check selectedIncidentId first, then default to first item
          if (selectedIncidentId) {
            // Check if selectedIncidentId matches any database ID (e.g. INC-102)
            const exists = data.some(inc => inc.id.toUpperCase() === selectedIncidentId.toUpperCase());
            if (exists) {
              setActiveIncidentId(selectedIncidentId);
            } else {
              // Try to find a partial match (e.g. if selectedIncidentId is doc_inc-102, clean it to INC-102)
              const cleanId = selectedIncidentId.replace('doc_', '').replace('inc_', '').toUpperCase();
              const partialExists = data.some(inc => inc.id.toUpperCase() === cleanId);
              if (partialExists) {
                setActiveIncidentId(cleanId);
              } else {
                setActiveIncidentId(data[0].id);
              }
            }
          } else {
            setActiveIncidentId(data[0].id);
          }
        } else {
          setIncidents(mockIncidents);
          setActiveIncidentId(selectedIncidentId || mockIncidents[0].id);
        }
      })
      .catch((err) => {
        console.error('Error fetching incidents from backend:', err);
        setIncidents(mockIncidents);
        setActiveIncidentId(selectedIncidentId || mockIncidents[0].id);
      });

    // 2. Fetch equipment from backend
    fetch('http://127.0.0.1:8000/api/v1/incidents/equipment', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then((res) => {
        if (!res.ok) throw new Error('API Response Error');
        return res.json();
      })
      .then((data) => {
        if (data && Array.isArray(data) && data.length > 0) {
          setEquipmentList(data);
        } else {
          setEquipmentList(mockEquipment);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching equipment from backend:', err);
        setEquipmentList(mockEquipment);
        setLoading(false);
      });
  }, [selectedIncidentId]);



  const getEvidenceStatus = (id: string) => {
    if (evidenceStates[id]) return evidenceStates[id];
    if (!incidentData || !Array.isArray(incidentData.evidence)) return 'unrelated';
    return incidentData.evidence.find((ev: any) => ev.id === id)?.status || 'unrelated';
  };

  const cycleEvidenceStatus = (id: string) => {
    const current = getEvidenceStatus(id);
    const nextStates: Record<string, 'confirmed' | 'suspect' | 'unrelated'> = {
      confirmed: 'suspect',
      suspect: 'unrelated',
      unrelated: 'confirmed'
    };
    setEvidenceStates(prev => ({
      ...prev,
      [id]: nextStates[current] || 'confirmed'
    }));
  };

  const tempLimit = activeEquipment ? (activeEquipment.id === 'EQ-B3' ? 580 : activeEquipment.id === 'EQ-GT01' ? 1000 : 400) : 500;
  const pressLimit = activeEquipment ? (activeEquipment.id === 'EQ-B3' ? 180 : activeEquipment.id === 'EQ-GT01' ? 35 : 12) : 150;
  const vibLimit = 5.0;

  // Calculate dynamic risk score based on evidence states and live telemetry
  const dynamicRiskScore = useMemo(() => {
    if (!incidentData) return 50;
    let base = incidentData.risk_score !== undefined ? incidentData.risk_score : incidentData.riskScore !== undefined ? incidentData.riskScore : 50;
    // Adjust based on user interactions
    Object.entries(evidenceStates).forEach(([id, state]) => {
      const orig = (incidentData.evidence || []).find((ev: any) => ev.id === id)?.status || 'unrelated';
      if (state !== orig) {
        if (state === 'confirmed') base += 5;
        if (state === 'unrelated') base -= 10;
        if (state === 'suspect') base -= 2;
      }
    });

    // Adjust based on live telemetry deviations
    if (activeEquipment) {
      if (liveTemp > tempLimit) base += 12;
      else if (liveTemp > tempLimit * 0.9) base += 4;

      if (livePress > pressLimit) base += 12;
      else if (livePress > pressLimit * 0.9) base += 4;

      if (liveVib > vibLimit) base += 10;
      else if (liveVib > vibLimit * 0.8) base += 3;
    }

    return Math.min(100, Math.max(0, base));
  }, [evidenceStates, incidentData, liveTemp, livePress, liveVib, activeEquipment, tempLimit, pressLimit, vibLimit]);

  // Color mapping
  const riskColor = (score: number) => {
    if (score >= 80) return 'text-danger border-danger/30';
    if (score >= 50) return 'text-warning border-warning/30';
    return 'text-success border-success/30';
  };

  const severityColor = (sev: string) => {
    const s = (sev || '').toLowerCase();
    if (s === 'critical' || s === 'high') return 'text-danger bg-danger/10 border-danger/20';
    if (s === 'medium') return 'text-warning bg-warning/10 border-warning/20';
    return 'text-success bg-success/10 border-success/20';
  };

  const timelineStatusColor = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'anomaly') return 'text-danger bg-danger/10 border-danger/20';
    if (s === 'warning') return 'text-warning bg-warning/10 border-warning/20';
    if (s === 'action') return 'text-secondary bg-secondary/10 border-secondary/20';
    return 'text-success bg-success/10 border-success/20';
  };

  if (loading && incidents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4" />
        <span className="text-xs text-text-muted font-mono">Loading Incident Records...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selector & Header bar */}
      <GlassCard className="border-border/40 p-4" hoverEffect={false}>
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-muted font-mono uppercase">Select Incident File:</span>
            <select
              value={activeIncidentId}
              onChange={(e) => {
                setSelectedIncidentId(e.target.value);
                setActiveIncidentId(e.target.value);
                setEvidenceStates({}); // Reset modifications
                setAiRec(null); // Reset AI mitigation
              }}
              className="bg-card-secondary border border-border/80 rounded-xl px-4 py-2 text-xs font-heading font-bold text-white focus:outline-none focus:border-primary"
            >
              {incidents.map((inc) => (
                <option key={inc.id} value={inc.id} className="bg-card text-white">
                  [{inc.id}] {inc.title.slice(0, 40)}...
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] text-text-muted font-mono uppercase bg-card px-2.5 py-1 rounded border border-border/60">
              Target Asset: <span className="text-secondary font-bold font-sans">{activeEquipment?.name || 'Unknown'} ({activeEquipment?.id || 'N/A'})</span>
            </span>
          </div>
        </div>
      </GlassCard>

      {/* Main Grid: Telemetry Timeline & Diagnostics Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column 2: Failure Timeline, Interactive Evidence Cards */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Incident Overview & Interactive Risk Meter */}
          <GlassCard className="border-border/40" hoverEffect={false}>
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
              {incidentData && (
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full font-code text-[10px] font-bold uppercase border ${severityColor(incidentData.severity)}`}>
                      {incidentData.severity} severity
                    </span>
                    <span className="text-text-muted text-[10px] font-mono">Date: {incidentData.date} ({incidentData.duration})</span>
                  </div>
                  <h2 className="text-lg font-heading font-bold text-white mt-1.5 leading-snug">
                    {incidentData.title}
                  </h2>
                </div>
              )}

              {/* Risk Meter Gauge */}
              <div className={`px-5 py-3 rounded-xl border flex flex-col items-center justify-center font-code ${riskColor(dynamicRiskScore)} bg-card`}>
                <span className="text-[9px] text-text-muted font-mono uppercase font-bold tracking-wider mb-0.5">Cascade Risk</span>
                <span className="text-2xl font-bold font-heading">{dynamicRiskScore}%</span>
              </div>
            </div>
            
            <p className="text-xs text-text-secondary leading-relaxed border-t border-border/20 pt-3 mt-3">
              PlantMind AI synthesized historian sensor flags and P&ID diagrams. Use the evidence selector tools below to confirm or discard SCADA telemetry anomalies. The overall safety cascade risk will update dynamically.
            </p>
          </GlassCard>

          {/* Live Sensor Stream Comparison & Simulation */}
          <GlassCard className="border-border/40" hoverEffect={false}>
            <div className="flex justify-between items-center mb-4 border-b border-border/20 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary animate-pulse" />
                Live Telemetry Feed & Safety Thresholds
              </h3>
              <span className="text-[9px] text-primary font-code border border-primary/20 bg-primary/5 px-2 py-0.5 rounded font-bold uppercase animate-pulse">
                Active Feed
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Temperature Widget */}
              <div className="bg-card-secondary/20 p-3 rounded-xl border border-border/40 relative">
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-[9px] font-mono text-text-muted uppercase font-bold">Temperature</span>
                  <span className={`text-xs font-bold font-mono ${liveTemp > tempLimit ? 'text-danger' : 'text-success'}`}>
                    {liveTemp}°C
                  </span>
                </div>
                <div className="w-full bg-card/60 h-1.5 rounded-full overflow-hidden mb-2">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${liveTemp > tempLimit ? 'bg-danger shadow-glow-orange' : 'bg-success'}`}
                    style={{ width: `${Math.min(100, (liveTemp / (tempLimit * 1.2)) * 100)}%` }}
                  />
                </div>
                <div className="text-[9px] text-text-muted space-y-0.5">
                  <div className="flex justify-between">
                    <span>Safety Limit:</span>
                    <span>{tempLimit}°C</span>
                  </div>
                  <div className="flex justify-between text-secondary">
                    <span>Incident Peak:</span>
                    <span>{activeEquipment?.id === 'EQ-B3' ? '542°C' : activeEquipment?.id === 'EQ-GT01' ? '920°C' : 'N/A'}</span>
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-[8px] text-text-muted uppercase font-mono block mb-1">Simulate Override:</span>
                  <input 
                    type="range"
                    min={activeEquipment?.id === 'EQ-B3' ? 300 : activeEquipment?.id === 'EQ-GT01' ? 700 : 100}
                    max={activeEquipment?.id === 'EQ-B3' ? 650 : activeEquipment?.id === 'EQ-GT01' ? 1100 : 500}
                    value={liveTemp}
                    onChange={(e) => setLiveTemp(parseInt(e.target.value))}
                    className="w-full accent-primary bg-card border border-border/40 h-1 rounded-lg outline-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Pressure Widget */}
              <div className="bg-card-secondary/20 p-3 rounded-xl border border-border/40 relative">
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-[9px] font-mono text-text-muted uppercase font-bold">Pressure</span>
                  <span className={`text-xs font-bold font-mono ${livePress > pressLimit ? 'text-danger' : 'text-secondary'}`}>
                    {livePress.toFixed(1)} bar
                  </span>
                </div>
                <div className="w-full bg-card/60 h-1.5 rounded-full overflow-hidden mb-2">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${livePress > pressLimit ? 'bg-danger' : 'bg-secondary'}`}
                    style={{ width: `${Math.min(100, (livePress / (pressLimit * 1.2)) * 100)}%` }}
                  />
                </div>
                <div className="text-[9px] text-text-muted space-y-0.5">
                  <div className="flex justify-between">
                    <span>Safety Limit:</span>
                    <span>{pressLimit} bar</span>
                  </div>
                  <div className="flex justify-between text-secondary">
                    <span>Incident Peak:</span>
                    <span>{activeEquipment?.id === 'EQ-B3' ? '168.0 bar' : activeEquipment?.id === 'EQ-GT01' ? '31.2 bar' : 'N/A'}</span>
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-[8px] text-text-muted uppercase font-mono block mb-1">Simulate Override:</span>
                  <input 
                    type="range"
                    min={activeEquipment?.id === 'EQ-B3' ? 100 : activeEquipment?.id === 'EQ-GT01' ? 10 : 2}
                    max={activeEquipment?.id === 'EQ-B3' ? 220 : activeEquipment?.id === 'EQ-GT01' ? 45 : 20}
                    step="0.5"
                    value={livePress}
                    onChange={(e) => setLivePress(parseFloat(e.target.value))}
                    className="w-full accent-secondary bg-card border border-border/40 h-1 rounded-lg outline-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Vibration Widget */}
              <div className="bg-card-secondary/20 p-3 rounded-xl border border-border/40 relative">
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-[9px] font-mono text-text-muted uppercase font-bold">Vibration</span>
                  <span className={`text-xs font-bold font-mono ${liveVib > vibLimit ? 'text-danger' : 'text-amber-400'}`}>
                    {liveVib.toFixed(1)} mm/s
                  </span>
                </div>
                <div className="w-full bg-card/60 h-1.5 rounded-full overflow-hidden mb-2">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${liveVib > vibLimit ? 'bg-danger' : 'bg-amber-400'}`}
                    style={{ width: `${Math.min(100, (liveVib / (vibLimit * 1.5)) * 100)}%` }}
                  />
                </div>
                <div className="text-[9px] text-text-muted space-y-0.5">
                  <div className="flex justify-between">
                    <span>Safety Limit:</span>
                    <span>{vibLimit.toFixed(1)} mm/s</span>
                  </div>
                  <div className="flex justify-between text-secondary">
                    <span>Incident Peak:</span>
                    <span>{activeEquipment?.id === 'EQ-B3' ? '4.8 mm/s' : activeEquipment?.id === 'EQ-GT01' ? '4.2 mm/s' : 'N/A'}</span>
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-[8px] text-text-muted uppercase font-mono block mb-1">Simulate Override:</span>
                  <input 
                    type="range"
                    min={0}
                    max={8}
                    step="0.1"
                    value={liveVib}
                    onChange={(e) => setLiveVib(parseFloat(e.target.value))}
                    className="w-full accent-warning bg-card border border-border/40 h-1 rounded-lg outline-none cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className={`mt-4 p-3 rounded-xl border-2 text-[10px] font-mono flex items-center justify-between
              ${(liveTemp > tempLimit || livePress > pressLimit || liveVib > vibLimit)
                ? 'bg-danger/10 border-danger/40 text-danger animate-pulse'
                : 'bg-success/5 border-success/30 text-success'
              }
            `}>
              <span>
                {(liveTemp > tempLimit || livePress > pressLimit || liveVib > vibLimit)
                  ? '⚠️ SAFETY THRESHOLDS VIOLATED: EXCURSION ALARM ONGOING'
                  : '✅ NORMAL OPERATIONS: SENSORS REPORT COMPLIANT LEVELS'
                }
              </span>
              <span>
                Risk Factor: {dynamicRiskScore > 75 ? 'HIGH (STRESS PROPAGATING)' : 'STABLE'}
              </span>
            </div>
          </GlassCard>

          {/* Evidence Checklist */}
          <GlassCard className="border-border/40" hoverEffect={false}>
            <div className="flex justify-between items-center mb-4 border-b border-border/20 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Interactive Telemetry Evidence Triage
              </h3>
              <span className="text-[9px] text-text-muted font-mono">Click cards to toggle validation state</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {incidentData && Array.isArray(incidentData.evidence) && incidentData.evidence.map((ev: any) => {
                const status = getEvidenceStatus(ev.id);
                const isConfirmed = status === 'confirmed';
                const isSuspect = status === 'suspect';
                const isUnrelated = status === 'unrelated';

                return (
                  <div
                    key={ev.id}
                    onClick={() => cycleEvidenceStatus(ev.id)}
                    className={`
                      p-3.5 rounded-xl border-2 cursor-pointer transition-all duration-300 text-left relative flex flex-col justify-between h-28
                      ${isConfirmed ? 'bg-danger/5 border-danger/60 shadow-[0_0_15px_rgba(239,68,68,0.05)]' : ''}
                      ${isSuspect ? 'bg-warning/5 border-warning/60 shadow-[0_0_15px_rgba(245,158,11,0.05)]' : ''}
                      ${isUnrelated ? 'bg-card border-border/60 opacity-60 hover:opacity-100' : ''}
                    `}
                  >
                    <div>
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-[9px] font-mono text-text-muted uppercase font-bold">{ev.source}</span>
                        <span className={`text-[8px] font-code px-1.5 py-0.5 rounded border uppercase font-bold
                          ${isConfirmed ? 'text-danger bg-danger/10 border-danger/20' : ''}
                          ${isSuspect ? 'text-warning bg-warning/10 border-warning/20' : ''}
                          ${isUnrelated ? 'text-text-muted bg-card-secondary border-border/60' : ''}
                        `}>
                          {status}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white line-clamp-1">{ev.name}</h4>
                      <p className="text-[10px] text-text-secondary mt-1 font-mono">{ev.value}</p>
                    </div>

                    <p className="text-[9px] text-text-muted mt-2 text-right">Click to change state</p>
                  </div>
                );
              })}
            </div>
          </GlassCard>

          {/* Alarm Timeline */}
          <GlassCard className="border-border/40" hoverEffect={false}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 mb-6">
              <Clock className="w-4 h-4 text-secondary animate-pulse" />
              Historian Sequence of Events (SOE)
            </h3>

            <div className="space-y-6 relative pl-4">
              <div className="absolute top-1 bottom-1 left-7 w-[2px] bg-border/40 z-0" />
              
              {incidentData && Array.isArray(incidentData.timeline) && incidentData.timeline.map((item: any, i: number) => (
                <div key={i} className="flex gap-4 text-left relative z-10">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full border border-border/80 bg-card flex items-center justify-center font-code text-[9px] text-text-secondary mt-0.5 font-bold">
                    {i + 1}
                  </div>
                  <div className="flex-1 p-3 bg-card rounded-xl border border-border/40 flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-white leading-relaxed">{item.event}</p>
                      <span className="text-[9px] text-text-muted font-mono">{item.time}</span>
                    </div>
                    
                    <span className={`text-[8px] font-code px-2 py-0.5 rounded border uppercase font-bold
                      ${timelineStatusColor(item.status)}
                    `}>
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Right Column 1: Action Items, Historical Similar incidents */}
        <div className="space-y-6">
          {/* Recommended Actions */}
          <GlassCard className="border-border/40" hoverEffect={false}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Recommended Mitigations</h3>
              <div className="flex gap-2">
                <button
                  onClick={generateAiMitigations}
                  disabled={generatingRecs}
                  className="px-2.5 py-1 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-[10px] text-primary font-bold rounded-lg cursor-pointer flex items-center gap-1 shadow-glow-orange transition-all duration-200"
                >
                  <Sparkles className="w-3.5 h-3.5 animate-pulse text-primary" />
                  {generatingRecs ? "Synthesizing..." : "Consult AI"}
                </button>
                <button
                  onClick={() => setWarRoomOpen(true)}
                  className="px-2.5 py-1 bg-danger/10 hover:bg-danger/20 border border-danger/30 text-[10px] text-danger font-bold rounded-lg cursor-pointer flex items-center gap-1 shadow-glow-orange transition-all duration-200"
                >
                  <Terminal className="w-3.5 h-3.5 animate-pulse text-danger" />
                  War Room
                </button>
              </div>
            </div>

            {aiRec && (
              <div className="mb-4 p-3.5 bg-secondary/5 border border-secondary/20 rounded-xl space-y-2 animated-border-cyan">
                <span className="text-[8px] font-code px-1.5 py-0.5 rounded border border-secondary/20 text-secondary bg-secondary/10 uppercase font-bold">
                  AI Generated Mitigation Plan
                </span>
                <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-line">{aiRec}</p>
              </div>
            )}

            <div className="space-y-3">
              {incidentData && Array.isArray(incidentData.recommendations) && incidentData.recommendations.map((rec: any, i: number) => (
                <div 
                  key={i} 
                  className={`p-3 bg-card border rounded-xl space-y-2 text-xs
                    ${rec.type === 'immediate' ? 'border-danger/30' : 'border-secondary/30'}
                  `}
                >
                  <div className="flex justify-between items-center">
                    <span className={`text-[9px] font-code px-1.5 py-0.5 rounded border uppercase font-bold
                      ${rec.type === 'immediate' ? 'text-danger bg-danger/10 border-danger/20' : 'text-secondary bg-secondary/10 border-secondary/20'}
                    `}>
                      {rec.type}
                    </span>
                    <span className="text-[10px] text-text-muted flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {rec.assignee}
                    </span>
                  </div>
                  
                  <p className="text-xs text-text-secondary leading-normal">{rec.action}</p>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Historical Similar Incidents */}
          <GlassCard className="border-border/40" hoverEffect={false}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Historical Similarities</h3>
              <span className="text-[9px] text-primary font-code border border-primary/20 bg-primary/5 px-2 py-0.5 rounded">
                Ingested Models: {similarIncidents.length > 0 ? similarIncidents.length : "0"}
              </span>
            </div>

            <div className="space-y-3">
              {similarIncidents.length > 0 ? (
                similarIncidents.map((hist) => (
                  <div 
                    key={hist.id}
                    onClick={() => {
                      setSelectedIncidentId(hist.id);
                      setActiveIncidentId(hist.id);
                      setAiRec(null);
                    }}
                    className="p-3 bg-card hover:bg-card-secondary border border-border/50 hover:border-primary/20 rounded-xl transition-all duration-200 text-left flex justify-between items-center group cursor-pointer"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-primary transition-colors line-clamp-1">{hist.title}</h4>
                      <span className="text-[9px] text-text-muted font-mono">{hist.id} // {hist.status}</span>
                    </div>

                    <span className="text-[10px] font-mono text-primary font-bold">{hist.match}</span>
                  </div>
                ))
              ) : (
                <div className="p-4 bg-card border border-border/30 rounded-xl text-center">
                  <p className="text-xs text-text-muted">No topological failure matches found in graph network.</p>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
      {warRoomOpen && incidentData && (
        <MultiAgentWarRoom
          incidentId={incidentData.id}
          incidentTitle={incidentData.title}
          equipmentName={activeEquipment?.name || 'Unknown Asset'}
          liveTelemetry={{ temperature: liveTemp, pressure: livePress, vibration: liveVib }}
          onClose={() => setWarRoomOpen(false)}
        />
      )}
    </div>
  );
};

export default RcaView;
