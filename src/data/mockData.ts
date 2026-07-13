export interface Equipment {
  id: string;
  name: string;
  type: string;
  location: string;
  health: number; // 0-100
  status: 'healthy' | 'warning' | 'critical';
  telemetry: {
    temperature: { value: number; unit: string; limit: number };
    pressure: { value: number; unit: string; limit: number };
    vibration: { value: number; unit: string; limit: number };
    flowRate?: { value: number; unit: string; limit: number };
  };
  metrics: {
    oee: number;
    mtbf: number; // Mean Time Between Failures (hours)
    mttr: number; // Mean Time To Repair (hours)
  };
}

export interface Document {
  id: string;
  title: string;
  type: 'P&ID' | 'SOP' | 'Manual' | 'HAZOP' | 'Report';
  code: string;
  author: string;
  lastUpdated: string;
  status: 'indexed' | 'processing' | 'pending';
  complianceLinked: boolean;
  fileSize: string;
}

export interface Incident {
  id: string;
  title: string;
  equipmentId: string;
  date: string;
  duration: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'resolved' | 'investigating' | 'open';
  riskScore: number; // 0-100
  timeline: { time: string; event: string; status: 'anomaly' | 'warning' | 'action' | 'normal' }[];
  evidence: { id: string; name: string; source: string; value: string; status: 'confirmed' | 'suspect' | 'unrelated' }[];
  recommendations: { type: 'immediate' | 'long-term'; action: string; assignee: string }[];
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'equipment' | 'document' | 'engineer' | 'sop' | 'incident';
  status?: string;
  details?: Record<string, string>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  animated?: boolean;
}

// ----------------------------------------------------
// Mock Data Implementation
// ----------------------------------------------------

export const mockEquipment: Equipment[] = [
  {
    id: 'EQ-B3',
    name: 'Steam Boiler Unit 3',
    type: 'High-Pressure Boiler',
    location: 'Thermal Power Block B',
    health: 74,
    status: 'warning',
    telemetry: {
      temperature: { value: 542, unit: '°C', limit: 580 },
      pressure: { value: 168, unit: 'bar', limit: 180 },
      vibration: { value: 4.8, unit: 'mm/s', limit: 5.0 }
    },
    metrics: { oee: 82.4, mtbf: 2400, mttr: 14.5 }
  },
  {
    id: 'EQ-GT01',
    name: 'Gas Turbine GT-01',
    type: 'Siemens SGT-800',
    location: 'Co-generation Unit 1',
    health: 96,
    status: 'healthy',
    telemetry: {
      temperature: { value: 920, unit: '°C', limit: 1050 },
      pressure: { value: 32, unit: 'bar', limit: 35 },
      vibration: { value: 1.2, unit: 'mm/s', limit: 4.5 }
    },
    metrics: { oee: 94.8, mtbf: 4800, mttr: 8.2 }
  },
  {
    id: 'EQ-RC2',
    name: 'Refinery Column C-102',
    type: 'Fractional Distillation',
    location: 'Hydrocracking Sector 2',
    health: 48,
    status: 'critical',
    telemetry: {
      temperature: { value: 385, unit: '°C', limit: 390 },
      pressure: { value: 12.4, unit: 'bar', limit: 12.0 },
      vibration: { value: 6.2, unit: 'mm/s', limit: 5.5 },
      flowRate: { value: 840, unit: 'm³/h', limit: 900 }
    },
    metrics: { oee: 64.1, mtbf: 1200, mttr: 28.0 }
  },
  {
    id: 'EQ-P102',
    name: 'Feed Pump P-102A',
    type: 'Centrifugal Multistage Pump',
    location: 'Water Feed Sector B',
    health: 88,
    status: 'healthy',
    telemetry: {
      temperature: { value: 65, unit: '°C', limit: 90 },
      pressure: { value: 48, unit: 'bar', limit: 55 },
      vibration: { value: 2.1, unit: 'mm/s', limit: 4.0 }
    },
    metrics: { oee: 91.2, mtbf: 3200, mttr: 6.5 }
  },
  {
    id: 'EQ-HE4',
    name: 'Heat Exchanger HE-04',
    type: 'Shell & Tube Exchanger',
    location: 'Cooling Block 4',
    health: 82,
    status: 'healthy',
    telemetry: {
      temperature: { value: 185, unit: '°C', limit: 220 },
      pressure: { value: 16.2, unit: 'bar', limit: 20.0 },
      vibration: { value: 0.8, unit: 'mm/s', limit: 3.0 },
      flowRate: { value: 1420, unit: 'm³/h', limit: 1600 }
    },
    metrics: { oee: 89.5, mtbf: 5000, mttr: 4.0 }
  }
];

export const mockDocuments: Document[] = [
  {
    id: 'DOC-PID-003',
    title: 'P&ID Schematic - Steam Boiler Unit 3',
    type: 'P&ID',
    code: 'PM-PID-PWR-B3-001',
    author: 'K. Devendiran (Lead Process)',
    lastUpdated: '2026-05-12',
    status: 'indexed',
    complianceLinked: true,
    fileSize: '14.2 MB'
  },
  {
    id: 'DOC-SOP-402',
    title: 'SOP-402: Emergency Heat Dissipation Protocol',
    type: 'SOP',
    code: 'PM-SOP-SFT-402',
    author: 'J. Marcus (Safety Lead)',
    lastUpdated: '2026-02-18',
    status: 'indexed',
    complianceLinked: true,
    fileSize: '2.4 MB'
  },
  {
    id: 'DOC-MAN-SGT800',
    title: 'Technical Manual - Siemens SGT-800 Gas Turbine',
    type: 'Manual',
    code: 'SI-MAN-GT01-V4',
    author: 'Siemens AG Energy',
    lastUpdated: '2023-11-05',
    status: 'indexed',
    complianceLinked: false,
    fileSize: '45.1 MB'
  },
  {
    id: 'DOC-HZP-RC2',
    title: 'HAZOP Analysis Report - Refinery Column C-102',
    type: 'HAZOP',
    code: 'PM-HAZOP-REF-RC2-2025',
    author: 'Hazop Committee Block 2',
    lastUpdated: '2025-08-30',
    status: 'indexed',
    complianceLinked: true,
    fileSize: '8.7 MB'
  },
  {
    id: 'DOC-REP-VIB3',
    title: 'Vibration Analysis Report - Boiler Block B Pumps',
    type: 'Report',
    code: 'PM-REP-MAINT-2026-08',
    author: 'Sarah Chen (Reliability Eng)',
    lastUpdated: '2026-07-02',
    status: 'processing',
    complianceLinked: false,
    fileSize: '5.1 MB'
  },
  {
    id: 'DOC-SOP-109',
    title: 'SOP-109: Refinery Column Overpressure Mitigation',
    type: 'SOP',
    code: 'PM-SOP-REF-109',
    author: 'R. Davis (Operations Manager)',
    lastUpdated: '2026-06-15',
    status: 'pending',
    complianceLinked: true,
    fileSize: '3.1 MB'
  }
];

export const mockIncidents: Incident[] = [
  {
    id: 'INC-2026-089',
    title: 'Boiler 3 Thermal Expansion & Pressure Excursion',
    equipmentId: 'EQ-B3',
    date: '2026-07-12',
    duration: '45 mins',
    severity: 'high',
    status: 'investigating',
    riskScore: 78,
    timeline: [
      { time: '14:20:05', event: 'Main Steam Valve FC-301 feedback mismatch', status: 'warning' },
      { time: '14:21:40', event: 'Superheater outlet pressure rose from 155 to 168 bar', status: 'anomaly' },
      { time: '14:24:12', event: 'Tube metal temp exceeded alarm threshold at 542°C', status: 'anomaly' },
      { time: '14:25:00', event: 'Auto-shedding triggered in Steam Generator 3A', status: 'action' },
      { time: '14:28:30', event: 'Manual bypass valve open command by Operator B', status: 'action' },
      { time: '15:05:00', event: 'Steam temperature stabilized back to 505°C; pressure at 152 bar', status: 'normal' }
    ],
    evidence: [
      { id: 'EV-1', name: 'FC-301 Valve Actuator Feedback Log', source: 'SCADA Historian', value: '42% commanded, 12% actual', status: 'confirmed' },
      { id: 'EV-2', name: 'Boiler Block Tube Temp Sensors 08-12', source: 'DCS Telemetry', value: 'Peak 542°C', status: 'confirmed' },
      { id: 'EV-3', name: 'SOP-402 Execution Log Check', source: 'Operator Panel Logs', value: 'Executed 4 mins late', status: 'suspect' },
      { id: 'EV-4', name: 'Fuel flow rate controller signal', source: 'DCS Telemetry', value: 'Constant at 18.2 kg/s', status: 'unrelated' }
    ],
    recommendations: [
      { type: 'immediate', action: 'Inspect and recalibrate electro-pneumatic actuator on valve FC-301.', assignee: 'M. Vance (Instrument Tech)' },
      { type: 'long-term', action: 'Update DCS interlock rules to automatically trigger Boiler bypass cooling loops if FC-301 mismatch persists > 30s.', assignee: 'Sarah Chen (Reliability Eng)' },
      { type: 'long-term', action: 'Conduct drill refresher for SOP-402 Emergency Heat Dissipation protocol for Block B crew.', assignee: 'J. Marcus (Safety Lead)' }
    ]
  },
  {
    id: 'INC-2026-077',
    title: 'Distillation Column C-102 Thermal Runaway Event',
    equipmentId: 'EQ-RC2',
    date: '2026-07-05',
    duration: '2 hours 10 mins',
    severity: 'critical',
    status: 'open',
    riskScore: 92,
    timeline: [
      { time: '09:05:00', event: 'Reflux pump control loop loss of power', status: 'warning' },
      { time: '09:12:00', event: 'Overpressure at tray 12 triggered rupture disc warning', status: 'anomaly' },
      { time: '09:15:00', event: 'Emergency dump valves failed to seal due to paraffin deposition', status: 'anomaly' },
      { time: '09:22:00', event: 'Operator shut down heater manually', status: 'action' },
      { time: '11:15:00', event: 'Tray temperatures cooled below critical limits', status: 'normal' }
    ],
    evidence: [
      { id: 'EV-10', name: 'Reflux Pump power breaker logs', source: 'Electrical MCC Panel', value: 'Tripped due to ground fault', status: 'confirmed' },
      { id: 'EV-11', name: 'Tray 12 pressure sensor historical calibration', source: 'CMMS Records', value: 'Calibrated 9 months ago (Overdue)', status: 'suspect' },
      { id: 'EV-12', name: 'Feedstock purity analysis', source: 'LIMS Lab Database', value: 'Water content 0.4% higher than limit', status: 'unrelated' }
    ],
    recommendations: [
      { type: 'immediate', action: 'Replace rupture disc assembly and clean valve seats on tray 12 emergency lines.', assignee: 'D. Miller (Mechanical Tech)' },
      { type: 'long-term', action: 'Implement dual redundant reflux pumps with automatic transfer switch.', assignee: 'R. Davis (Operations Manager)' }
    ]
  }
];

export const mockGraph: { nodes: GraphNode[]; edges: GraphEdge[] } = {
  nodes: [
    { id: 'node-eq-b3', label: 'Steam Boiler Unit 3', type: 'equipment', status: 'warning', details: { Location: 'Thermal Power Block B', Health: '74%', Model: 'Industrial HP-3' } },
    { id: 'node-doc-pid', label: 'P&ID Schematic - Boiler 3', type: 'document', details: { Code: 'PM-PID-PWR-B3-001', Version: 'v3.2' } },
    { id: 'node-sop-402', label: 'SOP-402: Emergency Heat Dissipation', type: 'sop', details: { RegulatoryCode: 'OSHA-1910.119', LastAudit: '2026-03' } },
    { id: 'node-eng-chen', label: 'Sarah Chen (Reliability Eng)', type: 'engineer', details: { Title: 'Senior Reliability Engineer', Certifications: 'CRE, PHA Leader' } },
    { id: 'node-inc-089', label: 'Boiler 3 Anomaly (INC-2026-089)', type: 'incident', status: 'investigating', details: { Severity: 'High', Date: '2026-07-12' } },
    
    { id: 'node-eq-gt01', label: 'Gas Turbine GT-01', type: 'equipment', status: 'healthy', details: { Location: 'Co-generation Unit 1', Health: '96%', Model: 'SGT-800' } },
    { id: 'node-doc-man', label: 'GT-01 Siemens Manual', type: 'document', details: { Code: 'SI-MAN-GT01-V4', Format: 'PDF' } },
    
    { id: 'node-eq-rc2', label: 'Refinery Column C-102', type: 'equipment', status: 'critical', details: { Location: 'Hydrocracking Sector 2', Health: '48%', Model: 'Fractional-C' } },
    { id: 'node-doc-hzp', label: 'HAZOP - Column C-102', type: 'document', details: { Code: 'PM-HAZOP-REF-RC2', Year: '2025' } },
    { id: 'node-sop-109', label: 'SOP-109: Overpressure Mitigation', type: 'sop', details: { RegulatoryCode: 'API-521', Status: 'Pending Review' } },
    { id: 'node-inc-077', label: 'C-102 Runaway (INC-2026-077)', type: 'incident', status: 'open', details: { Severity: 'Critical', Date: '2026-07-05' } },
    { id: 'node-eng-marcus', label: 'J. Marcus (Safety Lead)', type: 'engineer', details: { Title: 'Director of Process Safety', Experience: '18 Years' } }
  ],
  edges: [
    { id: 'e1', source: 'node-eq-b3', target: 'node-doc-pid', label: 'documented in' },
    { id: 'e2', source: 'node-eq-b3', target: 'node-sop-402', label: 'operated under', animated: true },
    { id: 'e3', source: 'node-eq-b3', target: 'node-inc-089', label: 'affected by', animated: true },
    { id: 'e4', source: 'node-eng-chen', target: 'node-inc-089', label: 'investigating' },
    { id: 'e5', source: 'node-eng-chen', target: 'node-eq-b3', label: 'system owner' },
    { id: 'e6', source: 'node-sop-402', target: 'node-inc-089', label: 'violated during' },
    
    { id: 'e7', source: 'node-eq-gt01', target: 'node-doc-man', label: 'refers manual' },
    { id: 'e8', source: 'node-eng-chen', target: 'node-eq-gt01', label: 'inspects' },
    
    { id: 'e9', source: 'node-eq-rc2', target: 'node-doc-hzp', label: 'risk assessed in' },
    { id: 'e10', source: 'node-eq-rc2', target: 'node-sop-109', label: 'requires safety' },
    { id: 'e11', source: 'node-eq-rc2', target: 'node-inc-077', label: 'failed in', animated: true },
    { id: 'e12', source: 'node-eng-marcus', target: 'node-inc-077', label: 'approving RCA' },
    { id: 'e13', source: 'node-eng-marcus', target: 'node-sop-109', label: 'author' }
  ]
};

export const mockCompliance = {
  globalScore: 84, // 0-100
  missingSOPs: [
    { id: 'MSOP-1', task: 'Turbine GT-01 Generator Phase Balancing Sync', category: 'High-Voltage Operations', missingSince: '2026-04-10', riskImpact: 'high', affectedEquipment: 'Gas Turbine GT-01' },
    { id: 'MSOP-2', task: 'Feedwater Chemical Dosing Calibration', category: 'Chemical Integrity Control', missingSince: '2026-06-01', riskImpact: 'medium', affectedEquipment: 'Steam Boiler Unit 3' },
    { id: 'MSOP-3', task: 'Reactor Room Ammonia Line Flange Torque Verification', category: 'Fugitive Emissions Prevention', missingSince: '2026-07-02', riskImpact: 'critical', affectedEquipment: 'Refinery Column C-102' }
  ],
  auditStatus: [
    { agency: 'OSHA PSM (1910.119)', scope: 'Process Safety Management Audit', date: '2026-07-25', status: 'Upcoming', daysLeft: 12 },
    { agency: 'EPA RMP (40 CFR 68)', scope: 'Risk Management Plan Ingestion', date: '2026-09-14', status: 'Scheduled', daysLeft: 63 },
    { agency: 'Internal HSE Directive 12', scope: 'Vibration & Thermal Interlock Controls', date: '2026-07-10', status: 'Completed (88% compliance)', daysLeft: 0 }
  ],
  recommendations: [
    { priority: 'critical', action: 'Upload approved SOP-109 revision to clear compliance gap for Column C-102 overpressure control.', standardRef: 'API Standard 521' },
    { priority: 'high', action: 'Complete HAZOP audit review cycle for Boiler Unit 3 bypass lines before July 20.', standardRef: 'OSHA 1910.119(e)' },
    { priority: 'medium', action: 'Link Siemens SGT-800 manufacturer technical guidelines directly with internal rotor balancing SOP-231.', standardRef: 'ISO 21940 (Vibration Standard)' }
  ]
};

export const copilotPresetChats = [
  {
    role: 'user',
    content: 'Why did the Steam Boiler Unit 3 trigger a pressure warning on July 12?'
  },
  {
    role: 'assistant',
    content: 'On July 12, Steam Boiler Unit 3 experienced a thermal expansion and pressure excursion (reaching 168 bar, close to its 180 bar limit). I have analyzed the historian logs and cross-referenced the documentation:\n\n1. **Root Cause**: Valve FC-301 feedback was mismatched (42% commanded, but only 12% actual mechanical lift). This restricted reflux flow, triggering a tube metal temperature spike to 542°C.\n2. **Documentation Mismatch**: SOP-402 (Emergency Heat Dissipation) was initiated 4 minutes after the initial alarm occurred, causing a lag in stabilization.\n\nI recommend immediate recalibration of the FC-301 valve actuator.',
    confidence: 94,
    thinkingSteps: [
      { id: 't1', title: 'Searching Incident Records', duration: '0.4s', desc: 'Retrieved incident INC-2026-089 matching Steam Boiler Unit 3 on July 12.' },
      { id: 't2', title: 'Analyzing SCADA Telemetry', duration: '1.2s', desc: 'Identified actuator feedback mismatch on Valve FC-301 (commanded: 42%, actual: 12%).' },
      { id: 't3', title: 'Cross-referencing SOP-402 Logs', duration: '0.8s', desc: 'Calculated operator response time of 4 minutes against the required 1-minute standard in PM-SOP-SFT-402.' },
      { id: 't4', title: 'Generating Mitigations', duration: '0.5s', desc: 'Formulated short-term actuator recalibration and DCS interlock rule adjustments.' }
    ],
    sources: [
      { id: 's1', title: 'INC-2026-089 Incident File', code: 'INC-089', match: '98%' },
      { id: 's2', title: 'PM-PID-PWR-B3-001 (Steam Boiler P&ID)', code: 'DOC-PID-003', match: '92%' },
      { id: 's3', title: 'SOP-402: Emergency Heat Dissipation Protocol', code: 'DOC-SOP-402', match: '95%' }
    ]
  }
];

export const mockUploadPipeline = [
  { id: 'ocr', label: 'OCR Extraction', status: 'completed', text: 'Scanned 14 pages of PDF, extracted text and schematics' },
  { id: 'entity', label: 'Entity Linking', status: 'completed', text: 'Identified entities: Boiler Unit 3, Valve FC-301, Superheater' },
  { id: 'vector', label: 'Vector Embeddings', status: 'completed', text: 'Generated 1,536-dimensional embeddings for semantic search' },
  { id: 'graph', label: 'Graph Synthesis', status: 'active', text: 'Creating relational edges between SOP-402 and Valve FC-301...' },
  { id: 'done', label: 'System Ingestion', status: 'pending', text: 'Waiting to declare node active in PlantMind Graph' }
];

export const mockRecentActivities = [
  { id: 'act1', type: 'incident', text: 'Incident INC-2026-089 (Boiler 3) updated to "Investigating"', time: '10 mins ago', user: 'Sarah Chen' },
  { id: 'act2', type: 'upload', text: 'New document "SOP-109 Overpressure Mitigation" uploaded', time: '1 hour ago', user: 'R. Davis' },
  { id: 'act3', type: 'compliance', text: 'OSHA Audit checklist generated for power block sector', time: '4 hours ago', user: 'PlantMind AI' },
  { id: 'act4', type: 'maintenance', text: 'Refinery Column C-102 health degraded to 48% (Critical Temperature)', time: '5 hours ago', user: 'Telemetry System' },
  { id: 'act5', type: 'copilot', text: 'Operator asked Copilot: "Check rotor vibration trends on Turbine GT-01"', time: '1 day ago', user: 'A. Patel' }
];
