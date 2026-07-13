import React, { useState } from 'react';
import { 
  Sliders, 
  Database, 
  User, 
  Save, 
  Power, 
  Zap
} from 'lucide-react';
import GlassCard from '../components/GlassCard';

export const SettingsView: React.FC = () => {
  const [vibrationLimit, setVibrationLimit] = useState(5.0);
  const [boilerTempLimit, setBoilerTempLimit] = useState(580);
  const [telemetryPollRate, setTelemetryPollRate] = useState('1000ms');

  // Integrations states
  const [connections, setConnections] = useState([
    { id: 'dcs', name: 'Honeywell Experion DCS', type: 'DCS / Sensor Streams', connected: true, lastSync: '12s ago' },
    { id: 'scada', name: 'Ignition SCADA Gateway', type: 'Modbus / OPC-UA', connected: true, lastSync: '1s ago' },
    { id: 'cmms', name: 'SAP PM Maintenance', type: 'CMMS / Work Orders', connected: false, lastSync: '2h ago' },
    { id: 'lims', name: 'LabWare LIMS Database', type: 'Quality / Lab Data', connected: true, lastSync: '10 mins ago' },
  ]);

  const toggleConnection = (id: string) => {
    setConnections(prev => prev.map(conn => {
      if (conn.id === id) {
        return { ...conn, connected: !conn.connected, lastSync: !conn.connected ? '1s ago' : 'Offline' };
      }
      return conn;
    }));
  };

  const handleSaveSettings = () => {
    alert("Industrial thresholds and SCADA parameters committed successfully to DCS Registry.");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left 2 Columns: Threshold limits, Telemetry configuration */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* SCADA Telemetry threshold controls */}
        <GlassCard className="border-border/40" hoverEffect={false}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-primary" />
              SCADA Alarm Threshold limits
            </h3>
            <span className="text-[10px] text-danger font-mono font-bold animate-pulse">L1 INTERLOCK ACTIVE</span>
          </div>

          <div className="space-y-6">
            {/* Boiler vibration slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-bold text-white">Steam Boiler Vibration Interlock (ISO 21940)</span>
                <span className="font-code text-xs text-primary font-bold">{vibrationLimit.toFixed(1)} mm/s</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="10.0"
                step="0.1"
                value={vibrationLimit}
                onChange={(e) => setVibrationLimit(parseFloat(e.target.value))}
                className="w-full h-1 bg-border/40 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-[9px] text-text-muted font-mono">
                <span>1.0 mm/s (Low vibration)</span>
                <span>Critical Threshold: 5.0 mm/s</span>
                <span>10.0 mm/s (Extreme vibration)</span>
              </div>
            </div>

            {/* Boiler Temperature limit slider */}
            <div className="space-y-2 pt-2 border-t border-border/20">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-bold text-white">Superheater Metal Temp High Alarm</span>
                <span className="font-code text-xs text-secondary font-bold">{boilerTempLimit} °C</span>
              </div>
              <input
                type="range"
                min="400"
                max="700"
                step="5"
                value={boilerTempLimit}
                onChange={(e) => setBoilerTempLimit(parseInt(e.target.value))}
                className="w-full h-1 bg-border/40 rounded-lg appearance-none cursor-pointer accent-secondary"
              />
              <div className="flex justify-between text-[9px] text-text-muted font-mono">
                <span>400 °C</span>
                <span>Operating limit: 580 °C</span>
                <span>700 °C</span>
              </div>
            </div>

            {/* Poll rate sync */}
            <div className="pt-4 border-t border-border/20 space-y-3">
              <label className="text-xs font-bold text-white block">Telemetry Live Ingestion Interval</label>
              <div className="flex gap-3 text-xs">
                {['500ms', '1000ms', '5000ms'].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => setTelemetryPollRate(rate)}
                    className={`px-4 py-2 border rounded-xl font-code transition-all duration-200 cursor-pointer
                      ${telemetryPollRate === rate 
                        ? 'border-secondary bg-secondary/10 text-secondary font-bold shadow-inner' 
                        : 'border-border/60 text-text-secondary hover:text-white hover:bg-card-secondary/40'}
                    `}
                  >
                    {rate}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSaveSettings}
              className="mt-4 px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/80 transition-all duration-200 flex items-center justify-center gap-1.5 shadow-glow-orange border border-primary/20 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Commit Configuration Changes
            </button>
          </div>
        </GlassCard>
      </div>

      {/* Right Column 1: Connected systems status, Security profiles */}
      <div className="space-y-6">
        
        {/* Integrations panel */}
        <GlassCard className="border-border/40" hoverEffect={false}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-secondary" />
              OT/IT Core Connections
            </h3>
            <span className="text-[9px] text-success font-code flex items-center gap-1">
              <Zap className="w-3 h-3 text-success" />
              API GATEWAY: OK
            </span>
          </div>

          <div className="space-y-3">
            {connections.map((conn) => (
              <div
                key={conn.id}
                className="p-3 bg-card border border-border/60 rounded-xl flex justify-between items-center text-xs group"
              >
                <div>
                  <h4 className="font-bold text-white group-hover:text-secondary transition-colors duration-200">
                    {conn.name}
                  </h4>
                  <span className="text-[9px] text-text-muted font-mono block mt-0.5">{conn.type} // Sync {conn.lastSync}</span>
                </div>

                <button
                  onClick={() => toggleConnection(conn.id)}
                  title={conn.connected ? "Disconnect System Link" : "Establish System Link"}
                  className={`p-2 rounded-lg border transition-all duration-200 flex items-center justify-center cursor-pointer
                    ${conn.connected 
                      ? 'border-success/30 bg-success/10 text-success' 
                      : 'border-border/80 text-text-muted hover:text-white hover:bg-border/20'
                    }
                  `}
                >
                  <Power className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Security Clearance profile detail */}
        <GlassCard className="border-border/40" hoverEffect={false}>
          <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-primary" />
            Security Clearance Registry
          </h3>

          <div className="space-y-3 text-xs leading-normal">
            <div className="p-3 bg-card rounded-xl border border-border/40 space-y-2">
              <div className="flex justify-between">
                <span className="text-text-muted">Operator Authority</span>
                <span className="text-white font-bold font-heading">Process Safety Leader</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Ingestion Access</span>
                <span className="text-success font-bold font-code">GRANTED // L4</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">DCS Overwrite</span>
                <span className="text-success font-bold font-code">GRANTED // PASS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Token ID</span>
                <span className="text-text-secondary font-mono font-bold">PM-OP-CH4-980X2</span>
              </div>
            </div>
            
            <p className="text-[10px] text-text-muted italic leading-relaxed font-mono">
              Audit log credentials are linked with plant security keys. Every configuration override is recorded under OSHA safety directive guidelines.
            </p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default SettingsView;
