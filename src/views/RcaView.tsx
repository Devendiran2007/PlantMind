import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, 
  User, 
  Sparkles
} from 'lucide-react';
import GlassCard from '../components/GlassCard';
import { mockIncidents, mockEquipment } from '../data/mockData';

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

  useEffect(() => {
    // 1. Fetch incidents from backend
    fetch('http://127.0.0.1:8000/api/v1/incidents')
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
    fetch('http://127.0.0.1:8000/api/v1/incidents/equipment')
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

  // Find current incident data
  const incidentData = useMemo(() => {
    return incidents.find(inc => inc.id === activeIncidentId) || incidents[0] || mockIncidents[0];
  }, [activeIncidentId, incidents]);

  const activeEquipment = useMemo(() => {
    if (!incidentData) return mockEquipment[0];
    const eqId = incidentData.equipment_id || incidentData.equipmentId;
    return equipmentList.find(eq => eq.id === eqId) || equipmentList[0] || mockEquipment[0];
  }, [incidentData, equipmentList]);

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

  // Calculate dynamic risk score based on evidence states
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
    return Math.min(100, Math.max(0, base));
  }, [evidenceStates, incidentData]);

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
            <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-4">Recommended Mitigations</h3>
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
                Ingested Models: 12
              </span>
            </div>

            <div className="space-y-3">
              {[
                { id: 'INC-102', title: 'Cooling Water Pump A bearing degradation', match: '95%', status: 'Resolved' },
                { id: 'INC-105', title: 'Boiler Utilities pressure excursion warning', match: '88%', status: 'Resolved' }
              ].map((hist) => (
                <div 
                  key={hist.id}
                  onClick={() => {
                    setSelectedIncidentId(hist.id);
                    setActiveIncidentId(hist.id);
                  }}
                  className="p-3 bg-card hover:bg-card-secondary border border-border/50 hover:border-primary/20 rounded-xl transition-all duration-200 text-left flex justify-between items-center group cursor-pointer"
                >
                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-primary transition-colors line-clamp-1">{hist.title}</h4>
                    <span className="text-[9px] text-text-muted font-mono">{hist.id} // {hist.status}</span>
                  </div>

                  <span className="text-[10px] font-mono text-primary font-bold">{hist.match}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default RcaView;
