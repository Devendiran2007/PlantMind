import React from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  MessageSquareCode,
  FileText,
  Network,
  Activity,
  ShieldAlert,
  UploadCloud,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react';

export type ActiveTab = 'dashboard' | 'copilot' | 'documents' | 'graph' | 'rca' | 'compliance' | 'uploads' | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  setToken: (token: string | null) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
  setToken
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'copilot', label: 'AI Copilot', icon: MessageSquareCode },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'graph', label: 'Knowledge Graph', icon: Network },
    { id: 'rca', label: 'Root Cause Analysis', icon: Activity },
    { id: 'compliance', label: 'Compliance', icon: ShieldAlert },
    { id: 'uploads', label: 'Upload Center', icon: UploadCloud },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <motion.div
      animate={{ width: collapsed ? 80 : 260 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="glass-panel h-[calc(100vh-40px)] m-5 rounded-industrial flex flex-col justify-between sticky top-5 z-40 select-none overflow-hidden"
    >
      <div>
        {/* Logo and Brand */}
        <div className="flex items-center gap-3 p-6 border-b border-border/30 overflow-hidden whitespace-nowrap">
          <div className="w-10 h-10 rounded-[10px] shadow-glow-orange overflow-hidden flex items-center justify-center flex-shrink-0 border border-primary/20 bg-card">
            <img src="/logo.jpg" alt="PlantMind Logo" className="w-full h-full object-cover scale-110" />
          </div>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col"
            >
              <span className="font-heading text-base font-bold tracking-wider text-white">
                Plant<span className="text-primary">Mind</span>
              </span>
              <span className="text-[8px] text-text-muted font-mono tracking-tight uppercase">
                Knowledge Intel
              </span>
            </motion.div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`
                  w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 relative group
                  ${isActive 
                    ? 'text-white font-medium bg-gradient-to-r from-card-secondary to-card border border-border/80 shadow-inner' 
                    : 'text-text-secondary hover:text-white hover:bg-card-secondary/50 border border-transparent'
                  }
                `}
              >
                {/* Active Indicator Glow */}
                {isActive && (
                  <motion.div
                    layoutId="active-indicator"
                    className="absolute left-0 w-[4px] h-3/5 bg-primary rounded-full"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                
                <Icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 flex-shrink-0 ${isActive ? 'text-primary' : 'text-text-muted group-hover:text-secondary'}`} />
                
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-sm font-medium tracking-wide truncate"
                  >
                    {item.label}
                  </motion.span>
                )}

                {/* Tooltip for collapsed sidebar */}
                {collapsed && (
                  <div className="absolute left-20 bg-background border border-border text-white text-xs px-3 py-1.5 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 shadow-xl whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer controls: Logout + Collapse action toggle */}
      <div className="p-4 border-t border-border/20 space-y-2.5">
        <button
          onClick={() => {
            localStorage.removeItem("plantmind_auth_token");
            setToken(null);
          }}
          className={`
            w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 relative group
            text-text-secondary hover:text-danger hover:bg-danger/10 border border-transparent hover:border-danger/30 cursor-pointer
          `}
        >
          <LogOut className="w-5 h-5 text-text-muted group-hover:text-danger flex-shrink-0" />
          {!collapsed && (
            <span className="text-sm font-medium tracking-wide">Log Out</span>
          )}
          {collapsed && (
            <div className="absolute left-20 bg-background border border-border text-danger text-xs px-3 py-1.5 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 shadow-xl whitespace-nowrap z-50">
              Log Out
            </div>
          )}
        </button>

        <div className="flex justify-end">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2.5 rounded-lg border border-border/40 hover:border-primary/50 text-text-secondary hover:text-white hover:bg-card transition-all duration-200 cursor-pointer flex items-center justify-center"
          >
            {collapsed ? <ChevronRight className="w-4 h-4 text-secondary" /> : <ChevronLeft className="w-4 h-4 text-primary" />}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default Sidebar;
