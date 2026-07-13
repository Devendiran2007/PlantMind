import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './components/Sidebar';
import type { ActiveTab } from './components/Sidebar';
import TopBar from './components/TopBar';

// Views
import DashboardView from './views/DashboardView';
import CopilotView from './views/CopilotView';
import DocumentsView from './views/DocumentsView';
import UploadView from './views/UploadView';
import GraphView from './views/GraphView';
import RcaView from './views/RcaView';
import ComplianceView from './views/ComplianceView';
import SettingsView from './views/SettingsView';

function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  // Helper function to transition to the Root Cause Analysis view with a specific incident
  const openRcaWithId = (incidentId: string) => {
    setSelectedIncidentId(incidentId);
    setActiveTab('rca');
  };

  // Render active view component
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView setActiveTab={setActiveTab} openRcaWithId={openRcaWithId} />;
      case 'copilot':
        return <CopilotView />;
      case 'documents':
        return <DocumentsView setActiveTab={setActiveTab} searchTerm={searchTerm} />;
      case 'uploads':
        return <UploadView />;
      case 'graph':
        return <GraphView setActiveTab={setActiveTab} openRcaWithId={openRcaWithId} />;
      case 'rca':
        return (
          <RcaView 
            selectedIncidentId={selectedIncidentId} 
            setSelectedIncidentId={setSelectedIncidentId} 
          />
        );
      case 'compliance':
        return <ComplianceView setActiveTab={setActiveTab} />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView setActiveTab={setActiveTab} openRcaWithId={openRcaWithId} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background text-white blueprint-grid font-body overflow-x-hidden">
      {/* Navigation Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        collapsed={collapsed} 
        setCollapsed={setCollapsed} 
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 pr-5">
        <TopBar 
          searchTerm={searchTerm} 
          setSearchTerm={setSearchTerm} 
          openRcaWithId={openRcaWithId}
        />

        {/* Dynamic Inner Workspace Panel */}
        <main className="flex-1 p-6 overflow-y-auto max-h-[calc(100vh-100px)]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="h-full"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export default App;
