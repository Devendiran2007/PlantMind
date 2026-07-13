import React from 'react';
import { 
  ShieldCheck, 
  Calendar, 
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import GlassCard from '../components/GlassCard';
import { mockCompliance } from '../data/mockData';

interface ComplianceViewProps {
  setActiveTab: (tab: any) => void;
}

export const ComplianceView: React.FC<ComplianceViewProps> = ({
  setActiveTab
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left 2 Columns: Audits Schedules, Standards Recommendations */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Active Regulatory Audits */}
        <GlassCard className="border-border/40" hoverEffect={false}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-secondary" />
              Regulatory Audit Schedule
            </h3>
            <span className="text-[10px] text-text-muted font-mono">DCS SYNC: LIVE</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mockCompliance.auditStatus.map((audit) => {
              const isDueSoon = audit.daysLeft > 0 && audit.daysLeft <= 15;
              const isCompleted = audit.daysLeft === 0;

              return (
                <div 
                  key={audit.agency}
                  className={`p-4 bg-card border rounded-xl flex flex-col justify-between min-h-[140px]
                    ${isDueSoon ? 'border-warning/30 bg-warning/5' : isCompleted ? 'border-success/30 bg-success/5' : 'border-border/50'}
                  `}
                >
                  <div>
                    <span className="text-[9px] font-mono text-text-muted uppercase font-bold block">{audit.agency}</span>
                    <h4 className="text-xs font-bold text-white mt-1 line-clamp-2">{audit.scope}</h4>
                  </div>

                  <div className="flex justify-between items-end mt-4 pt-2 border-t border-border/20">
                    <span className="text-[10px] text-text-secondary font-mono">{audit.date}</span>
                    {isCompleted ? (
                      <span className="text-[10px] font-bold text-success font-code uppercase">Completed</span>
                    ) : (
                      <span className={`text-[10px] font-bold font-code uppercase
                        ${isDueSoon ? 'text-warning animate-pulse' : 'text-text-secondary'}
                      `}>
                        {audit.daysLeft} days left
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>

        {/* System safety recommendations */}
        <GlassCard className="border-border/40" hoverEffect={false}>
          <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 mb-4">
            <ShieldCheck className="w-4 h-4 text-success" />
            Automated Safety Actions & Standards Alignment
          </h3>

          <div className="space-y-3">
            {mockCompliance.recommendations.map((rec, i) => (
              <div 
                key={i}
                className="p-3 bg-card border border-border/50 rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-3 text-xs"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[8px] font-code px-1.5 py-0.5 rounded border uppercase font-bold
                      ${rec.priority === 'critical' ? 'text-danger bg-danger/10 border-danger/20' : 
                        rec.priority === 'high' ? 'text-warning bg-warning/10 border-warning/20' : 
                        'text-secondary bg-secondary/10 border-secondary/20'}
                    `}>
                      {rec.priority}
                    </span>
                    <span className="text-[10px] text-text-muted font-mono">{rec.standardRef}</span>
                  </div>
                  <p className="text-xs text-text-secondary font-medium leading-relaxed">{rec.action}</p>
                </div>

                <button
                  onClick={() => setActiveTab('copilot')}
                  className="px-3.5 py-1.5 bg-card-secondary hover:bg-card border border-border hover:border-secondary text-[10px] text-text-secondary hover:text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 flex-shrink-0 self-end sm:self-center font-bold"
                >
                  Evaluate Action
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Right Column 1: Global Score dial, Missing SOPs */}
      <div className="space-y-6">
        
        {/* Safety Score Tracker */}
        <GlassCard className="border-border/40 text-center py-6" hoverEffect={false}>
          <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-4">Safety Index Matrix</h3>
          
          <div className="relative w-32 h-32 mx-auto flex items-center justify-center border-4 border-success border-r-transparent rounded-full shadow-glow-cyan">
            <div className="text-center">
              <span className="text-3xl font-bold font-heading text-white">{mockCompliance.globalScore}%</span>
              <span className="text-[8px] text-text-muted font-mono block uppercase mt-0.5">Rating</span>
            </div>
          </div>

          <p className="text-[11px] text-text-secondary mt-4 max-w-[200px] mx-auto leading-normal">
            Your safety index has increased by <span className="text-success font-bold">+0.5%</span> this week following the ingestion of Boiler 3's updated schematics.
          </p>
        </GlassCard>

        {/* Missing SOPs Checklist */}
        <GlassCard className="border-border/40" hoverEffect={false}>
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-border/20">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              SOP Compliance Gaps ({mockCompliance.missingSOPs.length})
            </h3>
            <span className="text-[9px] text-danger font-mono font-bold animate-pulse">ACTION REQUIRED</span>
          </div>

          <div className="space-y-4">
            {mockCompliance.missingSOPs.map((sop) => (
              <div 
                key={sop.id}
                className="space-y-2 border-b border-border/20 pb-3 last:border-0 last:pb-0"
              >
                <div className="flex justify-between items-baseline gap-2">
                  <span className="text-[10px] font-bold text-white line-clamp-1">{sop.task}</span>
                  <span className={`text-[8px] font-code px-1.5 py-0.5 rounded border uppercase font-bold flex-shrink-0
                    ${sop.riskImpact === 'critical' ? 'text-danger bg-danger/10 border-danger/20' : 
                      sop.riskImpact === 'high' ? 'text-warning bg-warning/10 border-warning/20' : 
                      'text-secondary bg-secondary/10 border-secondary/20'}
                  `}>
                    {sop.riskImpact} risk
                  </span>
                </div>

                <div className="flex justify-between items-center text-[10px] text-text-secondary">
                  <span>Asset: {sop.affectedEquipment}</span>
                  <button 
                    onClick={() => setActiveTab('uploads')}
                    className="text-[10px] text-primary hover:underline font-mono font-bold flex items-center gap-0.5 cursor-pointer"
                  >
                    Ingest SOP <ChevronRight className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default ComplianceView;
