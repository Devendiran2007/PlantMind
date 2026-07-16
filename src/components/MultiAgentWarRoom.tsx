import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Send, 
  Terminal, 
  Sparkles,
  RefreshCw,
  UserCheck
} from 'lucide-react';

interface Message {
  agent: string;
  role: string;
  content: string;
  isUser?: boolean;
}

interface MultiAgentWarRoomProps {
  incidentId: string;
  incidentTitle: string;
  equipmentName: string;
  liveTelemetry: { temperature: number; pressure: number; vibration: number; flow_rate?: number | null };
  onClose: () => void;
}

const AGENT_PROFILES: Record<string, { avatar: string; color: string; bg: string; border: string }> = {
  'Sarah Chen': {
    avatar: '👩‍💻',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30'
  },
  'J. Marcus': {
    avatar: '👨‍💼',
    color: 'text-secondary',
    bg: 'bg-secondary/10',
    border: 'border-secondary/30'
  },
  'M. Vance': {
    avatar: '👨‍🔧',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30'
  },
  'Operator': {
    avatar: '👷',
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/30'
  }
};

export const MultiAgentWarRoom: React.FC<MultiAgentWarRoomProps> = ({
  incidentId,
  incidentTitle,
  equipmentName,
  liveTelemetry,
  onClose
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingTurns, setPendingTurns] = useState<Message[]>([]);
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  
  const streamTimer = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll chat to bottom when messages list updates
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Load initial debate from backend
  useEffect(() => {
    fetchDebate([], null);
    return () => {
      if (streamTimer.current) clearTimeout(streamTimer.current);
    };
  }, [incidentId]);

  const fetchDebate = (currentHistory: Message[], operatorMsg: string | null) => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem("plantmind_auth_token");
    
    // Prepare history payload mapping
    const historyPayload = currentHistory.map(m => ({
      agent: m.isUser ? 'Operator' : m.agent,
      role: m.isUser ? 'Control Operator' : m.role,
      content: m.content
    }));

    fetch(`http://127.0.0.1:8000/api/v1/incidents/${incidentId}/war-room`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        history: historyPayload,
        message: operatorMsg,
        live_telemetry: liveTelemetry
      })
    })
      .then((res) => {
        if (!res.ok) throw new Error('API Request Failure');
        return res.json();
      })
      .then((data) => {
        if (data && Array.isArray(data.debate) && data.debate.length > 0) {
          // Put the incoming messages in a queue to stream them sequentially
          setPendingTurns(data.debate);
        } else {
          throw new Error('Invalid debate schema returned');
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching war-room debate:', err);
        setError('Failed to connect to the AI War Room. Running fallback simulator.');
        setLoading(false);
      });
  };

  // Sequential message streaming processor
  useEffect(() => {
    if (pendingTurns.length === 0 || isTyping) return;

    // Take the first message from the queue
    const nextMsg = pendingTurns[0];
    setPendingTurns(prev => prev.slice(1));

    setActiveSpeaker(nextMsg.agent);
    setIsTyping(true);

    // Simulate speech generation delay (typing...)
    const delay = Math.min(1500 + nextMsg.content.length * 4, 3500);
    streamTimer.current = setTimeout(() => {
      setMessages(prev => [...prev, nextMsg]);
      setIsTyping(false);
      setActiveSpeaker(null);
    }, delay);

  }, [pendingTurns, isTyping]);

  // Send Operator comment
  const handleSendIntervention = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || loading || pendingTurns.length > 0 || isTyping) return;

    const userMessage: Message = {
      agent: 'Operator',
      role: 'Control Operator',
      content: inputText,
      isUser: true
    };

    const updatedHistory = [...messages, userMessage];
    setMessages(updatedHistory);
    const msgCopy = inputText;
    setInputText('');

    // Query backend for next turns with operator input
    fetchDebate(updatedHistory, msgCopy);
  };

  const isDebating = isTyping || pendingTurns.length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-[#040608]/92 backdrop-blur-md flex items-center justify-center p-4 md:p-6 overflow-hidden select-none">
      <div className="w-full h-full max-w-[1200px] max-h-[850px] flex flex-col glass-panel-heavy border border-border/80 rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.9)]">
        
        {/* Header bar */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-border/40 bg-card-secondary/20">
          <div className="flex items-center gap-3">
            <div className="bg-danger/15 p-2.5 rounded-lg border border-danger/20 text-danger animate-pulse">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-heading font-extrabold text-white tracking-wide uppercase flex items-center gap-2">
                Multi-Agent Root Cause Analysis (RCA) War Room
              </h2>
              <p className="text-[10px] text-text-muted font-mono uppercase mt-0.5">
                INCIDENT ID // {incidentId} // TARGET ASSET: {equipmentName}
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

        {/* Project Target details */}
        <div className="bg-[#0b1016]/45 px-6 py-3 border-b border-border/20 text-xs flex justify-between items-center text-text-secondary">
          <span className="font-medium">Incident Subject: <span className="text-white font-bold">{incidentTitle}</span></span>
          <span className="text-[10px] font-mono bg-danger/10 text-danger border border-danger/20 px-2 py-0.5 rounded uppercase font-bold animate-pulse">
            RCA ANALYZER ONLINE
          </span>
        </div>

        {/* Main Interface Layout */}
        <div className="flex-1 flex flex-col min-h-0 relative bg-[#06090d]">
          <div className="absolute inset-0 blueprint-grid opacity-10 pointer-events-none" />

          {/* Top Row: AI Agent Avatars with active state indicators */}
          <div className="px-6 py-4 border-b border-border/20 flex justify-center gap-6 md:gap-12 bg-card-secondary/15 relative z-10">
            {['Sarah Chen', 'J. Marcus', 'M. Vance'].map((name) => {
              const profile = AGENT_PROFILES[name];
              const isActive = activeSpeaker === name;
              
              return (
                <motion.div
                  key={name}
                  animate={{ scale: isActive ? 1.05 : 1 }}
                  className={`
                    flex items-center gap-3 px-4 py-2.5 rounded-2xl border transition-all duration-300 min-w-[180px] text-left
                    ${isActive 
                      ? `${profile.border} ${profile.bg} shadow-[0_0_20px_rgba(249,115,22,0.05)] border-primary` 
                      : 'border-border/30 bg-card/40 opacity-75'
                    }
                  `}
                >
                  <span className="text-2xl">{profile.avatar}</span>
                  <div className="flex-1 min-w-0">
                    <span className={`text-[10px] font-bold uppercase tracking-wider block font-mono ${profile.color}`}>
                      {name === 'Sarah Chen' ? 'Reliability Lead' : name === 'J. Marcus' ? 'Process Safety' : 'Controls Specialist'}
                    </span>
                    <span className="text-xs font-bold text-white block truncate">{name}</span>
                  </div>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Dialogue Log area */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 min-h-0 flex flex-col">
            
            {messages.length === 0 && loading && (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
                <RefreshCw className="w-8 h-8 text-primary animate-spin mb-3" />
                <p className="text-xs text-text-secondary font-mono">Simulating agent communication node connections...</p>
              </div>
            )}

            {/* Rendered Dialogue Bubble Stream */}
            <div className="space-y-4 flex-1">
              <AnimatePresence>
                {messages.map((msg, idx) => {
                  const isUser = msg.isUser;
                  const profile = AGENT_PROFILES[msg.agent] || AGENT_PROFILES['Operator'];
                  
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-3 max-w-[80%] ${isUser ? 'ml-auto flex-row-reverse text-right' : 'mr-auto text-left'}`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${profile.bg} border ${profile.border}`}>
                        {profile.avatar}
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[10px] font-mono text-text-muted justify-start">
                          <span className={`font-bold uppercase ${profile.color}`}>{msg.agent}</span>
                          <span>•</span>
                          <span>{msg.role}</span>
                        </div>
                        
                        <div className={`
                          p-3.5 rounded-2xl text-xs leading-relaxed border
                          ${isUser 
                            ? 'bg-primary/10 border-primary/20 text-white rounded-tr-none' 
                            : 'bg-card border-border/40 text-text-secondary rounded-tl-none'
                          }
                        `}>
                          {msg.content}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Typing indicator bubble */}
              {isTyping && activeSpeaker && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3 mr-auto items-start max-w-[80%] text-left"
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg bg-card-secondary border border-border/40 animate-pulse">
                    {AGENT_PROFILES[activeSpeaker]?.avatar}
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-text-muted uppercase font-bold tracking-wider">
                      {activeSpeaker} is typing...
                    </span>
                    <div className="p-3 bg-card border border-border/40 rounded-2xl rounded-tl-none flex items-center gap-1.5 min-h-[40px] px-4">
                      <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </motion.div>
              )}
              
              <div ref={chatEndRef} />
            </div>

          </div>

          {/* Bottom Controls panel */}
          <div className="p-4 border-t border-border/40 bg-card-secondary/25 relative z-10">
            <form onSubmit={handleSendIntervention} className="flex gap-3 items-center">
              
              <div className="relative flex-1 group">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={isDebating || loading}
                  placeholder={
                    isDebating 
                      ? 'Wait for agents to conclude active discussion...' 
                      : 'Intervene as Control Operator (e.g. "Check the valve solenoid")...'
                  }
                  className="w-full pl-4 pr-12 py-3 bg-card border border-border/80 rounded-xl text-xs text-white placeholder-text-muted focus:outline-none focus:border-primary disabled:opacity-50 transition-all duration-300"
                />
                
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-mono text-text-muted group-focus-within:text-primary transition-colors">
                  OPERATOR CTRL
                </span>
              </div>

              <button
                type="submit"
                disabled={!inputText.trim() || isDebating || loading}
                className="p-3 bg-gradient-to-tr from-primary to-secondary text-white rounded-xl border border-transparent disabled:opacity-40 hover:shadow-glow-orange cursor-pointer transition-all flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            
            {/* Disclaimer / Hints */}
            <div className="flex justify-between items-center mt-2.5 text-[9px] font-mono text-text-muted px-1.5">
              <span>SIMULATED MULTI-AGENT DISCUSSION LOOP // CO-PILOT ADVISOR LINKED</span>
              {isDebating ? (
                <span className="text-secondary flex items-center gap-1">
                  <Sparkles className="w-3 h-3 animate-spin" /> DEBATING ROOT CAUSE SEQUENCE
                </span>
              ) : (
                <span className="text-success flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5" /> AGENTS READY FOR FEEDBACK
                </span>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default MultiAgentWarRoom;
