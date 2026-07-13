import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  Download, 
  Cpu, 
  Eye, 
  Link2, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  FileCheck2
} from 'lucide-react';
import GlassCard from '../components/GlassCard';
import { mockDocuments } from '../data/mockData';

interface DocumentsViewProps {
  setActiveTab: (tab: any) => void;
  searchTerm: string;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  setActiveTab,
  searchTerm: parentSearchTerm
}) => {
  const [localSearch, setLocalSearch] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');

  const activeSearch = localSearch || parentSearchTerm;

  const filteredDocs = mockDocuments.filter((doc) => {
    const matchesSearch = 
      doc.title.toLowerCase().includes(activeSearch.toLowerCase()) ||
      doc.code.toLowerCase().includes(activeSearch.toLowerCase()) ||
      doc.author.toLowerCase().includes(activeSearch.toLowerCase());
    
    const matchesType = selectedTypeFilter === 'ALL' || doc.type === selectedTypeFilter;
    const matchesStatus = selectedStatusFilter === 'ALL' || doc.status === selectedStatusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Search and Filters Header */}
      <GlassCard className="border-border/40 p-4" hoverEffect={false}>
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80 group">
            <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Search code, title, engineer..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-card/60 border border-border/60 rounded-xl text-xs text-white placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all duration-300"
            />
          </div>

          <div className="flex flex-wrap gap-3 w-full md:w-auto items-center justify-end text-xs">
            {/* Type Filter */}
            <div className="flex items-center gap-1.5 bg-card/60 border border-border/60 rounded-xl px-3 py-1.5 text-text-secondary">
              <Filter className="w-3.5 h-3.5 text-primary" />
              <span>Type:</span>
              <select
                value={selectedTypeFilter}
                onChange={(e) => setSelectedTypeFilter(e.target.value)}
                className="bg-transparent border-none focus:outline-none text-white font-medium cursor-pointer"
              >
                <option value="ALL" className="bg-card text-white">All Formats</option>
                <option value="P&ID" className="bg-card text-white">P&ID Schematics</option>
                <option value="SOP" className="bg-card text-white">SOP Standards</option>
                <option value="Manual" className="bg-card text-white">Operator Manuals</option>
                <option value="HAZOP" className="bg-card text-white">HAZOP Reports</option>
                <option value="Report" className="bg-card text-white">Incident Reports</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-card/60 border border-border/60 rounded-xl px-3 py-1.5 text-text-secondary">
              <FileCheck2 className="w-3.5 h-3.5 text-secondary" />
              <span>Status:</span>
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="bg-transparent border-none focus:outline-none text-white font-medium cursor-pointer"
              >
                <option value="ALL" className="bg-card text-white">All States</option>
                <option value="indexed" className="bg-card text-white">Graph Indexed</option>
                <option value="processing" className="bg-card text-white">OCR Ingestion</option>
                <option value="pending" className="bg-card text-white">Pending Approval</option>
              </select>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDocs.map((doc) => (
          <GlassCard key={doc.id} className="border-border/40 flex flex-col justify-between" hoverEffect>
            <div className="space-y-4">
              {/* Card Title & Icon */}
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-center gap-3">
                  <div className="bg-card-secondary p-2.5 rounded-xl border border-border/85 text-secondary">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-code text-secondary tracking-wider font-semibold uppercase">
                      {doc.type} // {doc.id}
                    </span>
                    <h3 className="text-sm font-bold text-white line-clamp-1 mt-0.5" title={doc.title}>
                      {doc.title}
                    </h3>
                  </div>
                </div>

                {/* Index Status Badge */}
                <span className={`inline-flex items-center justify-center p-1 rounded-full
                  ${doc.status === 'indexed' ? 'text-success bg-success/10 border border-success/20' : 
                    doc.status === 'processing' ? 'text-warning bg-warning/10 border border-warning/20 animate-pulse' : 
                    'text-danger bg-danger/10 border border-danger/20'}
                `}>
                  {doc.status === 'indexed' && <CheckCircle className="w-3.5 h-3.5" />}
                  {doc.status === 'processing' && <Clock className="w-3.5 h-3.5" />}
                  {doc.status === 'pending' && <AlertCircle className="w-3.5 h-3.5" />}
                </span>
              </div>

              {/* Meta tags */}
              <div className="space-y-2 text-xs pt-1 border-t border-border/20">
                <div className="flex justify-between">
                  <span className="text-text-muted">Doc Code</span>
                  <span className="font-code font-bold text-text-secondary">{doc.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Process Engineer</span>
                  <span className="text-text-secondary font-medium">{doc.author}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Last Synchronized</span>
                  <span className="text-text-secondary">{doc.lastUpdated}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">File Payload</span>
                  <span className="text-text-secondary font-mono">{doc.fileSize}</span>
                </div>
              </div>
            </div>

            {/* Footer details & Actions */}
            <div className="mt-6 pt-3 border-t border-border/20 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                {doc.complianceLinked ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-success bg-success/5 border border-success/10 px-2.5 py-0.5 rounded-full font-mono">
                    <Link2 className="w-3 h-3" />
                    REG-LINKED
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-text-muted bg-card px-2.5 py-0.5 rounded-full font-mono">
                    NO-REG
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setActiveTab('copilot')}
                  title="Discuss document with Copilot"
                  className="p-2 text-text-secondary hover:text-primary bg-card hover:bg-card-secondary border border-border/50 rounded-lg transition-all duration-200 cursor-pointer"
                >
                  <Cpu className="w-4 h-4" />
                </button>
                <button
                  title="View PDF attachment"
                  className="p-2 text-text-secondary hover:text-white bg-card hover:bg-card-secondary border border-border/50 rounded-lg transition-all duration-200 cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  title="Download raw document"
                  className="p-2 text-text-secondary hover:text-secondary bg-card hover:bg-card-secondary border border-border/50 rounded-lg transition-all duration-200 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          </GlassCard>
        ))}

        {filteredDocs.length === 0 && (
          <div className="col-span-full py-16 text-center">
            <FileText className="w-12 h-12 text-text-muted mx-auto mb-3 animate-bounce" />
            <h4 className="text-sm font-bold text-white">No Engineering Records Located</h4>
            <p className="text-xs text-text-secondary mt-1">Try modifying your filter categories or query input.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentsView;
