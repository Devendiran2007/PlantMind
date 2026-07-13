import React, { useState, useEffect } from 'react';
import { Bell, Search, ShieldCheck, Terminal, AlertTriangle, Info } from 'lucide-react';
import { mockRecentActivities } from '../data/mockData';

interface TopBarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  openRcaWithId: (id: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  searchTerm,
  setSearchTerm,
  openRcaWithId
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour12: false });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const handleNotificationClick = (activity: typeof mockRecentActivities[0]) => {
    setNotificationsOpen(false);
    if (activity.type === 'incident') {
      openRcaWithId('INC-2026-089');
    }
  };

  return (
    <header className="flex justify-between items-center py-4 px-6 border-b border-border/30 sticky top-0 bg-background/80 backdrop-blur-md z-30">
      {/* Left side: Heading */}
      <div className="flex flex-col">
        <h1 className="text-xl font-bold tracking-wider font-heading flex items-center gap-2">
          <span>Plant</span><span className="text-primary">Mind</span>
          <span className="text-[10px] py-0.5 px-2 bg-primary/10 border border-primary/20 text-primary font-code rounded font-normal uppercase tracking-widest">
            Operating System
          </span>
        </h1>
        <p className="text-[11px] text-text-muted mt-0.5 hidden sm:block">
          AI-Powered Industrial Knowledge Intelligence Platform
        </p>
      </div>

      {/* Middle: Live telemetry clock and search */}
      <div className="flex items-center gap-6 flex-1 justify-center max-w-xl mx-4">
        {/* Search */}
        <div className="relative w-full group hidden md:block">
          <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-secondary transition-colors" />
          <input
            type="text"
            placeholder="Search assets, SOPs, active RCA, manuals... (Ctrl+/)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-card/60 border border-border/60 hover:border-border rounded-xl text-xs text-white placeholder-text-muted focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/20 transition-all duration-300 shadow-inner"
          />
        </div>

        {/* Live Clock */}
        <div className="flex items-center gap-2 bg-card-secondary/40 border border-border/30 rounded-xl px-4 py-1.5 font-code text-xs text-text-secondary select-none">
          <Terminal className="w-3.5 h-3.5 text-secondary animate-pulse" />
          <span>{formatDate(currentTime)}</span>
          <span className="text-primary font-bold">{formatTime(currentTime)}</span>
        </div>
      </div>

      {/* Right side: Alert notification, User Profile */}
      <div className="flex items-center gap-4">
        {/* Notifications Center */}
        <div className="relative">
          <button
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
              setUnreadCount(0);
            }}
            className={`
              p-2.5 rounded-xl border transition-all duration-300 relative cursor-pointer
              ${notificationsOpen 
                ? 'bg-primary/10 border-primary text-primary' 
                : 'border-border/60 text-text-secondary hover:text-white hover:bg-card'
              }
            `}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {notificationsOpen && (
            <div className="absolute right-0 mt-3 w-80 glass-panel-heavy rounded-xl p-4 border border-border/80 shadow-2xl z-50">
              <div className="flex justify-between items-center pb-2 border-b border-border/30 mb-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Live System Alarms</span>
                <span className="text-[10px] text-text-muted">Real-time OT/IT logs</span>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {mockRecentActivities.slice(0, 4).map((activity) => {
                  const isIncident = activity.type === 'incident';
                  const isMaintenance = activity.type === 'maintenance';
                  return (
                    <div
                      key={activity.id}
                      onClick={() => handleNotificationClick(activity)}
                      className="p-2.5 rounded-lg bg-card/50 hover:bg-card border border-border/30 hover:border-primary/20 transition-all duration-200 cursor-pointer flex gap-3 text-left"
                    >
                      {isIncident && <AlertTriangle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />}
                      {isMaintenance && <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />}
                      {!isIncident && !isMaintenance && <Info className="w-4 h-4 text-secondary flex-shrink-0 mt-0.5" />}
                      <div>
                        <p className="text-xs text-text-secondary line-clamp-2">{activity.text}</p>
                        <div className="flex justify-between mt-1 text-[9px] text-text-muted">
                          <span>{activity.user}</span>
                          <span>{activity.time}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-3 border-l border-border/30">
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-secondary p-0.5 flex items-center justify-center font-bold text-white text-xs select-none">
              SC
            </div>
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-success rounded-full border border-background shadow" />
          </div>
          <div className="hidden lg:flex flex-col text-left">
            <span className="text-xs font-bold text-white leading-tight flex items-center gap-1">
              Sarah Chen
              <ShieldCheck className="w-3.5 h-3.5 text-secondary" />
            </span>
            <span className="text-[10px] text-text-muted leading-tight font-mono">
              Process Safety Authority // L4
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
