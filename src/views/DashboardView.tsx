import React from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, 
  ShieldAlert, 
  ArrowRight, 
  Cpu, 
  Network, 
  Plus, 
  TrendingUp, 
  Wrench,
  Gauge
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid 
} from 'recharts';
import { mockEquipment, mockRecentActivities, mockCompliance } from '../data/mockData';
import GlassCard from '../components/GlassCard';
import type { ActiveTab } from '../components/Sidebar';

interface DashboardViewProps {
  setActiveTab: (tab: ActiveTab) => void;
  openRcaWithId: (id: string) => void;
}

// Sparkline data for stats
const performanceHistory = [
  { time: '00:00', load: 85, oee: 84 },
  { time: '04:00', load: 88, oee: 83 },
  { time: '08:00', load: 92, oee: 86 },
  { time: '12:00', load: 95, oee: 88 },
  { time: '16:00', load: 89, oee: 85 },
  { time: '20:00', load: 82, oee: 82 },
  { time: '24:00', load: 87, oee: 84 },
];

export const DashboardView: React.FC<DashboardViewProps> = ({
  setActiveTab,
  openRcaWithId
}) => {
  // Stats definitions
  const statCards = [
    { label: 'Plant OEE', value: '88.4%', change: '+1.2%', trend: 'up', color: 'text-secondary' },
    { label: 'Active Incidents', value: '2', change: '-1', trend: 'down', color: 'text-danger' },
    { label: 'Compliance Rating', value: '84.0%', change: '+0.5%', trend: 'up', color: 'text-success' },
    { label: 'Systems Ingested', value: '14,802', change: '+24', trend: 'up', color: 'text-primary' },
  ];

  return (
    <div className="space-y-6">
      {/* Top section: stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          >
            <GlassCard className="p-4 flex items-center justify-between border-border/40" hoverEffect>
              <div>
                <span className="text-xs text-text-muted font-medium">{stat.label}</span>
                <h3 className="text-xl font-bold font-heading mt-1 text-white">{stat.value}</h3>
              </div>
              <div className="text-right">
                <span className={`text-xs font-code px-2 py-0.5 rounded-full ${stat.trend === 'up' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                  {stat.change}
                </span>
                <p className="text-[10px] text-text-muted mt-1 font-mono">Vs 24h ago</p>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Main Grid: AI Insights (glowing) + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: AI Insights and Live Telemetry Graph */}
        <div className="lg:col-span-2 space-y-6">
          {/* Glowing AI Insight Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <GlassCard glow="orange" className="relative overflow-hidden" hoverEffect={false}>
              {/* Decorative graphic element */}
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
              
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-2xl border border-primary/20 text-primary mt-1">
                  <Cpu className="w-6 h-6 animate-pulse" />
                </div>
                <div className="space-y-2 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-code text-primary uppercase font-bold tracking-widest flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                      Critical AI Diagnostics
                    </span>
                    <span className="text-[10px] text-text-muted font-mono bg-card-secondary/60 px-2.5 py-0.5 rounded border border-border/40">
                      RESOLVER ENGINE ACTIVE
                    </span>
                  </div>
                  <h2 className="text-lg font-heading font-bold text-white">
                    Refinery Column C-102: Thermal runaway prediction on Tray 12
                  </h2>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    PlantMind predictive modeling detected a temperature deviation (+12.4°C/hr gradient) matching historical incident profiles of paraffin deposition. Current safety margins will deplete in <span className="text-primary font-bold">2.4 hours</span> if reflux pump loop flow rate remains at 840 m³/h.
                  </p>
                  
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      onClick={() => openRcaWithId('INC-2026-089')}
                      className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/80 transition-all duration-200 flex items-center gap-2 cursor-pointer shadow-glow-orange border border-primary/40"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      Launch Diagnostic RCA
                    </button>
                    <button
                      onClick={() => setActiveTab('copilot')}
                      className="px-4 py-2 bg-card-secondary border border-border hover:border-secondary text-text-secondary hover:text-white text-xs font-medium rounded-xl transition-all duration-200 flex items-center gap-2 cursor-pointer"
                    >
                      <Cpu className="w-3.5 h-3.5" />
                      Consult Copilot Advisor
                    </button>
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Plant Efficiency and Load Telemetry Graph */}
          <GlassCard className="border-border/40" hoverEffect={false}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-white">
                  <TrendingUp className="w-4 h-4 text-secondary" />
                  Operational Telemetry Stream
                </h3>
                <p className="text-[11px] text-text-muted">Boiler Block thermal load vs plant overall efficiency</p>
              </div>
              <div className="flex gap-4 text-xs font-code">
                <span className="flex items-center gap-1.5 text-secondary">
                  <span className="w-2.5 h-2.5 rounded bg-secondary" />
                  Overall OEE (%)
                </span>
                <span className="flex items-center gap-1.5 text-primary">
                  <span className="w-2.5 h-2.5 rounded bg-primary" />
                  Thermal Load (MW)
                </span>
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="oeeGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#00E5FF" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="loadGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F97316" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(43, 54, 71, 0.2)" />
                  <XAxis dataKey="time" stroke="#64748B" style={{ fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                  <YAxis stroke="#64748B" style={{ fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: '#151B23', 
                      borderColor: '#2B3647', 
                      borderRadius: '12px',
                      color: 'white',
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '12px'
                    }}
                  />
                  <Area type="monotone" dataKey="oee" stroke="#00E5FF" strokeWidth={2} fillOpacity={1} fill="url(#oeeGlow)" name="OEE %" />
                  <Area type="monotone" dataKey="load" stroke="#F97316" strokeWidth={2} fillOpacity={1} fill="url(#loadGlow)" name="Thermal Load" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </div>

        {/* Right 1 Col: Quick Actions & Recent Activity Feed */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <GlassCard className="border-border/40" hoverEffect={false}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-4">Quick Operations</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Upload Files', icon: Plus, tab: 'uploads', color: 'hover:border-secondary text-secondary' },
                { label: 'Ask Copilot', icon: Cpu, tab: 'copilot', color: 'hover:border-primary text-primary' },
                { label: 'Explore Graph', icon: Network, tab: 'graph', color: 'hover:border-purple-500 text-purple-400' },
                { label: 'Audit Compliance', icon: ShieldAlert, tab: 'compliance', color: 'hover:border-success text-success' },
              ].map((act) => {
                const Icon = act.icon;
                return (
                  <button
                    key={act.label}
                    onClick={() => setActiveTab(act.tab as ActiveTab)}
                    className={`p-3.5 rounded-xl bg-card border border-border/50 hover:bg-card-secondary flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-300 font-medium text-xs text-text-secondary hover:text-white ${act.color}`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{act.label}</span>
                  </button>
                );
              })}
            </div>
          </GlassCard>

          {/* Recent Activity */}
          <GlassCard className="border-border/40 h-[calc(100%-190px)]" hoverEffect={false}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Live Event Log</h3>
              <span className="text-[9px] text-secondary font-code border border-secondary/20 bg-secondary/5 px-2 py-0.5 rounded animate-pulse">
                SCADA LINK: OK
              </span>
            </div>
            <div className="space-y-4 overflow-y-auto max-h-[300px] pr-2">
              {mockRecentActivities.map((act) => {
                const isIncident = act.type === 'incident';
                const isUpload = act.type === 'upload';
                return (
                  <div key={act.id} className="flex gap-3 text-left group">
                    <div className="mt-0.5 flex flex-col items-center">
                      <div className={`w-2.5 h-2.5 rounded-full ${isIncident ? 'bg-danger animate-ping' : isUpload ? 'bg-secondary' : 'bg-primary'}`} />
                      <div className="w-0.5 h-10 bg-border/20 mt-1" />
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary leading-normal group-hover:text-white transition-colors duration-200">
                        {act.text}
                      </p>
                      <div className="flex gap-2 text-[9px] text-text-muted mt-1 font-mono">
                        <span>{act.time}</span>
                        <span>•</span>
                        <span>{act.user}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Bottom Grid: Equipment Health Matrix & Compliance Status summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Equipment Health - 2 Columns */}
        <div className="lg:col-span-2">
          <GlassCard className="border-border/40" hoverEffect={false}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Wrench className="w-4 h-4 text-primary" />
                Asset Health Matrix
              </h3>
              <button 
                onClick={() => setActiveTab('settings')} 
                className="text-[10px] text-primary hover:underline flex items-center gap-1 cursor-pointer font-mono"
              >
                Thresholds Configuration <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/40 text-text-muted font-bold pb-2">
                    <th className="py-2.5">Asset ID</th>
                    <th className="py-2.5">Equipment Name</th>
                    <th className="py-2.5">Location</th>
                    <th className="py-2.5">Health</th>
                    <th className="py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {mockEquipment.slice(0, 4).map((eq) => (
                    <tr 
                      key={eq.id} 
                      className="hover:bg-card-secondary/30 transition-colors duration-200"
                    >
                      <td className="py-3 font-code text-secondary">{eq.id}</td>
                      <td className="py-3 font-medium text-white">{eq.name}</td>
                      <td className="py-3 text-text-secondary">{eq.location}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2 w-28">
                          <div className="flex-1 h-1.5 bg-border/40 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                eq.status === 'healthy' ? 'bg-success' : eq.status === 'warning' ? 'bg-warning' : 'bg-danger'
                              }`}
                              style={{ width: `${eq.health}%` }}
                            />
                          </div>
                          <span className="font-mono text-[10px] font-bold text-white">{eq.health}%</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-code text-[10px] uppercase font-bold
                          ${eq.status === 'healthy' ? 'bg-success/10 text-success border border-success/20' : 
                            eq.status === 'warning' ? 'bg-warning/10 text-warning border border-warning/20' : 
                            'bg-danger/10 text-danger border border-danger/20'}
                        `}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            eq.status === 'healthy' ? 'bg-success' : eq.status === 'warning' ? 'bg-warning' : 'bg-danger'
                          }`} />
                          {eq.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>

        {/* Compliance Summary - 1 Column */}
        <div>
          <GlassCard className="border-border/40 h-full flex flex-col justify-between" hoverEffect={false}>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 mb-4">
                <Gauge className="w-4 h-4 text-success" />
                Compliance Coverage
              </h3>
              
              {/* Circular safety score visualization */}
              <div className="flex justify-center my-4 relative">
                <div className="w-28 h-28 rounded-full border-4 border-border/30 flex flex-col items-center justify-center relative">
                  <div 
                    className="absolute inset-0 rounded-full border-4 border-success border-t-transparent animate-spin" 
                    style={{ animationDuration: '4s' }}
                  />
                  <span className="text-2xl font-bold font-heading text-white">{mockCompliance.globalScore}%</span>
                  <span className="text-[8px] text-text-muted font-mono uppercase tracking-widest">Global Safety</span>
                </div>
              </div>

              {/* Core compliance metrics */}
              <div className="space-y-3 pt-2">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-text-secondary">Missing Equipment SOPs</span>
                    <span className="text-danger font-bold">{mockCompliance.missingSOPs.length} Critical</span>
                  </div>
                  <div className="h-1 bg-border/40 rounded-full overflow-hidden">
                    <div className="h-full bg-danger rounded-full" style={{ width: '40%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-text-secondary">Audit Status Check</span>
                    <span className="text-warning font-bold">OSHA due in 12d</span>
                  </div>
                  <div className="h-1 bg-border/40 rounded-full overflow-hidden">
                    <div className="h-full bg-warning rounded-full" style={{ width: '70%' }} />
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('compliance')}
              className="mt-6 w-full py-2 bg-card-secondary hover:bg-card border border-border hover:border-success text-xs text-text-secondary hover:text-white font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-success" />
              Open Regulations Audit Center
            </button>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
