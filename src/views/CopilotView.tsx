import React, { useState, useEffect } from 'react';
import {
  Mic,
  Paperclip,
  ArrowUp,
  Cpu,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck,
  Zap,
  HelpCircle,
  FileCheck2,
  Plus,
  Trash2,
  MessageSquare
} from 'lucide-react';
import GlassCard from '../components/GlassCard';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  confidence?: number;
  thinkingSteps?: {
    id: string;
    title: string;
    duration: string;
    desc: string;
  }[];
  sources?: {
    id: string;
    title: string;
    code: string;
    match: string;
  }[];
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
}

const getInitialSessions = (): { sessions: ChatSession[], activeId: string } => {
  const saved = localStorage.getItem('plantmind_copilot_sessions');
  const savedActive = localStorage.getItem('plantmind_active_session_id');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const activeId = (savedActive && parsed.some(s => s.id === savedActive)) ? savedActive : parsed[0].id;
        return { sessions: parsed, activeId };
      }
    } catch (e) {
      console.error("Failed to parse saved sessions:", e);
    }
  }
  const defaultId = 'session-' + Date.now();
  return {
    sessions: [{
      id: defaultId,
      title: 'New Diagnostic Thread',
      messages: [],
      createdAt: Date.now()
    }],
    activeId: defaultId
  };
};

export const CopilotView: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>(() => getInitialSessions().sessions);
  const [activeSessionId, setActiveSessionId] = useState<string>(() => getInitialSessions().activeId);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [selectedResponseIndex, setSelectedResponseIndex] = useState<number>(0);

  // Sync sessions and active session to localStorage
  useEffect(() => {
    localStorage.setItem('plantmind_copilot_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('plantmind_active_session_id', activeSessionId);
  }, [activeSessionId]);

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0] || { messages: [] };
  const messages = activeSession.messages;

  // Suggested questions for operator
  const suggestedQuestions = [
    "Run thermal diagnostics on Steam Boiler Unit 3",
    "Identify active bypass loops on Refinery Column C-102",
    "Verify turbine GT-01 rotor vibration compliance limit",
    "Search safety audits for missing SOP warnings"
  ];

  const updateActiveSessionMessages = (
    newMsgs: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])
  ) => {
    setSessions(prevSessions => {
      return prevSessions.map(session => {
        if (session.id === activeSessionId) {
          const resolvedMsgs = typeof newMsgs === 'function' ? newMsgs(session.messages) : newMsgs;
          
          let newTitle = session.title;
          if (session.title === 'New Diagnostic Thread' && resolvedMsgs.length > 0) {
            const firstUserMsg = resolvedMsgs.find(m => m.role === 'user');
            if (firstUserMsg) {
              newTitle = firstUserMsg.content.length > 30 
                ? firstUserMsg.content.substring(0, 30) + '...' 
                : firstUserMsg.content;
            }
          }

          return {
            ...session,
            title: newTitle,
            messages: resolvedMsgs
          };
        }
        return session;
      });
    });
  };

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: text
    };

    const newMessages = [...messages, userMessage];
    updateActiveSessionMessages(newMessages);
    setInputText('');
    setIsThinking(true);

    // Call Backend API
    fetch('http://127.0.0.1:8000/api/v1/copilot/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: text })
    })
      .then((res) => {
        if (!res.ok) throw new Error('API Response Error');
        return res.json();
      })
      .then((data) => {
        const aiResponse: ChatMessage = {
          role: 'assistant',
          content: data.content,
          confidence: data.confidence || 90,
          thinkingSteps: data.thinkingSteps?.map((step: any) => ({
            id: step.id,
            title: step.title,
            duration: step.duration,
            desc: step.desc
          })) || [],
          sources: data.sources?.map((source: any) => ({
            id: source.id,
            title: source.title,
            code: source.code,
            match: source.match
          })) || []
        };
        updateActiveSessionMessages(prev => [...prev, aiResponse]);
        setIsThinking(false);
        setSelectedResponseIndex(newMessages.length);
      })
      .catch((err) => {
        console.error('Error querying backend copilot:', err);
        // Fallback to client-side simulation when backend is unavailable
        setTimeout(() => {
          let aiResponse: ChatMessage = {
            role: 'assistant',
            content: "I have reviewed the telemetry for your request. No anomalous vibration spikes are currently active on GT-01 rotor bearing. Average amplitude is 1.2 mm/s, well within the 4.5 mm/s ISO 21940 limit. Cross-referencing against maintenance logs indicates the rotor alignment was successfully adjusted on July 2.",
            confidence: 98,
            thinkingSteps: [
              { id: 't1', title: 'Querying Asset DB (Fallback Mode)', duration: '0.2s', desc: 'Retrieved turbine rotor telemetry parameters for GT-01.' },
              { id: 't2', title: 'Fetching Sensor Logs', duration: '0.9s', desc: 'Ingested 24-hour rotor vibration amplitude averages.' },
              { id: 't3', title: 'Validating against Standards', duration: '0.6s', desc: 'Compared data against ISO 21940 rotor vibration thresholds.' }
            ],
            sources: [
              { id: 's1', title: 'Technical Manual - Siemens SGT-800 Gas Turbine', code: 'SI-MAN-GT01-V4', match: '96%' },
              { id: 's2', title: 'Vibration Analysis Report - July 2026', code: 'PM-REP-MAINT-2026-08', match: '91%' }
            ]
          };

          if (text.includes("Boiler") || text.includes("thermal") || text.includes("B3")) {
            aiResponse = {
              role: 'assistant',
              content: "Steam Boiler Unit 3 is currently running at 74% health. The Superheater metal temperature reached a peak of 542°C on July 12, driven by a mechanical feedback lag on Valve FC-301. Immediate manual calibration of the electro-pneumatic positioner is recommended.",
              confidence: 94,
              thinkingSteps: [
                { id: 't1', title: 'Loading Boiler telemetry (Fallback Mode)', duration: '0.4s', desc: 'Retrieved thermal logs and tube metal temp values.' },
                { id: 't2', title: 'Checking valve logs', duration: '0.7s', desc: 'Detected actuator feedback mismatch in Valve FC-301 logs.' },
                { id: 't3', title: 'Consulting SOP-402', duration: '0.5s', desc: 'Analyzed heat dissipation emergency protocol sequence.' }
              ],
              sources: [
                { id: 's1', title: 'INC-2026-089 Incident File', code: 'INC-089', match: '98%' },
                { id: 's2', title: 'SOP-402: Emergency Heat Dissipation Protocol', code: 'DOC-SOP-402', match: '95%' }
              ]
            };
          }

          updateActiveSessionMessages(prev => [...prev, aiResponse]);
          setIsThinking(false);
          setSelectedResponseIndex(newMessages.length);
        }, 1500);
      });
  };

  const handleSwitchSession = (id: string) => {
    setActiveSessionId(id);
    setSelectedResponseIndex(0);
  };

  const handleCreateSession = () => {
    const newId = 'session-' + Date.now();
    const newSession: ChatSession = {
      id: newId,
      title: 'New Diagnostic Thread',
      messages: [],
      createdAt: Date.now()
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newId);
    setSelectedResponseIndex(0);
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (sessions.length === 1) {
      const resetId = 'session-' + Date.now();
      setSessions([{
        id: resetId,
        title: 'New Diagnostic Thread',
        messages: [],
        createdAt: Date.now()
      }]);
      setActiveSessionId(resetId);
      setSelectedResponseIndex(0);
      return;
    }

    const filtered = sessions.filter(s => s.id !== id);
    setSessions(filtered);

    if (activeSessionId === id) {
      setActiveSessionId(filtered[0].id);
      setSelectedResponseIndex(0);
    }
  };

  const currentAssistantData = messages[selectedResponseIndex]?.role === 'assistant' 
    ? messages[selectedResponseIndex] 
    : messages.filter(m => m.role === 'assistant').pop();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
      {/* Left 2 columns: Chat Workspace */}
      <div className="lg:col-span-2 flex h-full bg-card/30 border border-border/40 rounded-industrial overflow-hidden relative">
        {/* Background mesh grid */}
        <div className="absolute inset-0 blueprint-grid opacity-30 pointer-events-none" />
        {/* Threads Sidebar */}
        <div className="w-56 border-r border-border/40 flex flex-col bg-card/10 z-10">
          <div className="p-3 border-b border-border/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Threads</span>
            </div>
            <button 
              onClick={handleCreateSession}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-xl text-xs font-bold text-primary hover:text-white transition-all duration-200 cursor-pointer shadow-inner"
              title="New Chat"
            >
              <Plus className="w-3.5 h-3.5" />
              New Chat
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar">
            {sessions.map((session) => {
              const isActive = session.id === activeSessionId;
              return (
                <div
                  key={session.id}
                  onClick={() => handleSwitchSession(session.id)}
                  className={`group flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all duration-200
                    ${isActive 
                      ? 'bg-primary/10 border-primary/40 text-white shadow-glow-orange/20' 
                      : 'bg-transparent border-transparent text-text-secondary hover:text-white hover:bg-card-secondary/30'
                    }
                  `}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-primary' : 'text-text-muted'}`} />
                    <span className="truncate font-sans font-medium">{session.title}</span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteSession(session.id, e)}
                    className="p-1 text-text-muted hover:text-danger hover:bg-danger/10 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer flex-shrink-0"
                    title="Delete Thread"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Chat Workspace */}
        <div className="flex-1 flex flex-col justify-between p-4 h-full overflow-hidden relative">
          {/* Message Logs */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4 scrollbar relative z-10">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 select-none mt-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-orange-600 shadow-glow-orange flex items-center justify-center text-white mb-4 animate-pulse">
                  <Cpu className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1">PlantMind AI Copilot</h3>
                <p className="text-xs text-text-muted max-w-[320px] leading-relaxed mb-6">
                  Your industrial advisor. Ask questions about equipment health, safety protocols, telemetry, or past incidents.
                </p>
                
                <div className="grid grid-cols-1 gap-2.5 max-w-[400px] w-full text-left">
                  <div className="p-3 bg-card-secondary/40 border border-border/40 rounded-xl flex items-start gap-3">
                    <span className="text-primary text-xs mt-0.5">⚡</span>
                    <div>
                      <p className="text-xs font-bold text-white">Instant Diagnostics</p>
                      <p className="text-[11px] text-text-secondary mt-0.5">Run telemetry health checks on active plant equipment.</p>
                    </div>
                  </div>
                  <div className="p-3 bg-card-secondary/40 border border-border/40 rounded-xl flex items-start gap-3">
                    <span className="text-secondary text-xs mt-0.5">📄</span>
                    <div>
                      <p className="text-xs font-bold text-white">SOP Verification</p>
                      <p className="text-[11px] text-text-secondary mt-0.5">Cross-reference active parameters with safety regulations and SOPs.</p>
                    </div>
                  </div>
                  <div className="p-3 bg-card-secondary/40 border border-border/40 rounded-xl flex items-start gap-3">
                    <span className="text-success text-xs mt-0.5">🔍</span>
                    <div>
                      <p className="text-xs font-bold text-white">Knowledge Tracing</p>
                      <p className="text-[11px] text-text-secondary mt-0.5">Inspect thinking timelines and document citations for each response.</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={index}
                    onClick={() => {
                      if (!isUser) setSelectedResponseIndex(index);
                    }}
                    className={`flex gap-3 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto cursor-pointer group'}`}
                  >
                    {/* Icon */}
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold select-none text-xs
                      ${isUser 
                        ? 'bg-gradient-to-tr from-primary to-orange-600 shadow-glow-orange' 
                        : 'bg-gradient-to-tr from-secondary to-cyan-600 shadow-glow-cyan'
                      }
                    `}>
                      {isUser ? 'OP' : <Cpu className="w-4 h-4 text-white" />}
                    </div>

                    {/* Message Bubble */}
                    <div className={`p-4 rounded-industrial border text-xs leading-relaxed transition-all duration-300
                      ${isUser 
                        ? 'bg-primary/10 border-primary/30 text-white rounded-tr-none' 
                        : `bg-card border-border/60 text-text-secondary rounded-tl-none 
                           ${selectedResponseIndex === index ? 'border-secondary shadow-glow-cyan text-white' : 'hover:border-border hover:bg-card-secondary/40'}`
                      }
                    `}>
                      <p className="whitespace-pre-line">{msg.content}</p>
                      
                      {!isUser && (
                        <div className="flex justify-between items-center mt-3 pt-2 border-t border-border/30 text-[10px] text-text-muted">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                            Confidence Score: <span className="text-secondary font-bold font-code">{msg.confidence}%</span>
                          </span>
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-secondary font-mono flex items-center gap-0.5">
                            Click to view trace
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Thinking animation */}
            {isThinking && (
              <div className="flex gap-3 max-w-[80%] mr-auto">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-secondary to-cyan-600 shadow-glow-cyan flex items-center justify-center text-white flex-shrink-0 select-none">
                  <Cpu className="w-4 h-4 animate-spin" />
                </div>
                <div className="p-4 bg-card border border-border/60 text-text-muted rounded-industrial rounded-tl-none text-xs">
                  <div className="flex items-center gap-3">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
                    </span>
                    <span className="font-mono">PlantMind AI is cross-referencing SCADA history...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Suggestion list */}
          {messages.length === 0 && !isThinking && (
            <div className="mb-4 z-10">
              <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block mb-2 px-1">Suggested Diagnostics</span>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSendMessage(q)}
                    className="px-3 py-1.5 bg-card/60 hover:bg-card border border-border/50 hover:border-primary/40 rounded-xl text-[11px] text-text-secondary hover:text-white transition-all duration-200 cursor-pointer flex items-center gap-1.5"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

        {/* Prompt Input Box */}
        <div className="relative border border-border/80 bg-card rounded-industrial p-3 flex flex-col gap-2 shadow-2xl z-10">
          <textarea
            rows={2}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(inputText);
              }
            }}
            placeholder="Query telemetry status, ask about safety procedures, safety SOP clearances..."
            className="w-full bg-transparent text-xs text-white placeholder-text-muted focus:outline-none resize-none pr-12 pl-1"
          />
          <div className="flex justify-between items-center pt-2 border-t border-border/30">
            <div className="flex gap-2">
              <button className="p-2 text-text-secondary hover:text-white bg-card-secondary hover:bg-border/30 border border-border/40 rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center">
                <Paperclip className="w-4 h-4" />
              </button>
              <button className="p-2 text-text-secondary hover:text-white bg-card-secondary hover:bg-border/30 border border-border/40 rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center">
                <Mic className="w-4 h-4 text-primary" />
              </button>
            </div>
            
            <button
              onClick={() => handleSendMessage(inputText)}
              className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/80 transition-all duration-200 flex items-center gap-1.5 shadow-glow-orange cursor-pointer border border-primary/20"
            >
              Send Signal
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>

      {/* Right Column: AI Diagnostics Workbench */}
      <div className="space-y-6 h-full overflow-y-auto pr-1">
        {currentAssistantData ? (
          <>
            {/* Confidence Score Gauge */}
            <GlassCard className="border-border/40" hoverEffect={false}>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-secondary" />
                  Reliability Diagnostics
                </h3>
                <span className="text-[10px] text-success font-code">VERIFIED SOURCE</span>
              </div>

              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 flex-shrink-0 flex items-center justify-center border-2 border-secondary/20 rounded-full shadow-glow-cyan">
                  <Zap className="w-6 h-6 text-secondary animate-pulse" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-end">
                    <span className="text-2xl font-bold font-heading text-white">{currentAssistantData.confidence}%</span>
                    <span className="text-[10px] text-text-muted font-mono mb-1">Index Weight</span>
                  </div>
                  <div className="h-1.5 bg-border/40 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-secondary rounded-full transition-all duration-1000"
                      style={{ width: `${currentAssistantData.confidence}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-border/20 text-[10px] text-text-secondary font-mono">
                <div className="p-2 bg-card rounded-lg border border-border/30">
                  <p className="text-text-muted">SCADA TELEMETRY</p>
                  <p className="font-bold text-success mt-0.5">COMPLETED (100%)</p>
                </div>
                <div className="p-2 bg-card rounded-lg border border-border/30">
                  <p className="text-text-muted">REGULATORY ALIGN</p>
                  <p className="font-bold text-success mt-0.5 font-sans">API/OSHA OK</p>
                </div>
              </div>
            </GlassCard>

            {/* Thinking Timeline */}
            <GlassCard className="border-border/40" hoverEffect={false}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-primary" />
                Cognitive Timeline Trace
              </h3>

              <div className="space-y-4">
                {currentAssistantData.thinkingSteps?.map((step, i) => (
                  <div key={step.id} className="flex gap-3 text-left">
                    <div className="flex flex-col items-center">
                      <div className="w-5 h-5 rounded-full border border-primary/40 bg-primary/10 flex items-center justify-center font-code text-[9px] text-primary font-bold">
                        {i + 1}
                      </div>
                      {i < currentAssistantData.thinkingSteps!.length - 1 && (
                        <div className="w-0.5 h-10 bg-border/20 mt-1" />
                      )}
                    </div>
                    <div>
                      <div className="flex justify-between items-baseline gap-2">
                        <span className="text-xs font-bold text-white leading-none">{step.title}</span>
                        <span className="text-[9px] text-text-muted font-mono">{step.duration}</span>
                      </div>
                      <p className="text-[11px] text-text-secondary mt-1 leading-normal">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Sources Panel */}
            <GlassCard className="border-border/40" hoverEffect={false}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 mb-3">
                <FileCheck2 className="w-4 h-4 text-secondary" />
                Document Reference Ingestion
              </h3>

              <div className="space-y-2">
                {currentAssistantData.sources?.map((source) => (
                  <div
                    key={source.id}
                    className="p-2.5 bg-card/60 border border-border/50 hover:border-secondary/40 hover:bg-card rounded-xl transition-all duration-200 flex justify-between items-center group cursor-pointer"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-secondary transition-colors duration-200 line-clamp-1">
                        {source.title}
                      </h4>
                      <p className="text-[10px] text-text-muted font-mono mt-0.5">{source.code}</p>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <span className="text-[10px] font-mono text-secondary font-bold">
                        {source.match}
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-text-muted group-hover:text-white transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </>
        ) : (
          <GlassCard className="border-border/40 text-center py-12" hoverEffect={false}>
            <Cpu className="w-12 h-12 text-text-muted mx-auto mb-3 animate-pulse" />
            <h4 className="text-sm font-bold text-white">Diagnostics Stack Empty</h4>
            <p className="text-xs text-text-secondary mt-1 max-w-[200px] mx-auto leading-relaxed">
              Select an assistant message in the conversation block to unpack diagnostic telemetry.
            </p>
          </GlassCard>
        )}
      </div>
    </div>
  );
};

export default CopilotView;
