import React, { useState, useEffect } from 'react';
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
import PidDrawingExplorer from '../components/PidDrawingExplorer';



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
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDrawingDoc, setSelectedDrawingDoc] = useState<any | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("plantmind_auth_token");
    fetch('http://127.0.0.1:8000/api/v1/documents', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then((res) => {
        if (!res.ok) throw new Error('API Response Error');
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((d: any) => {
            let type = 'Report';
            const docId = d.id;
            if (docId.startsWith('OEM')) type = 'Manual';
            else if (docId.startsWith('SOP') || docId.startsWith('TRN')) type = 'SOP';
            else if (docId.startsWith('RSK') || docId.startsWith('AUD') || docId.startsWith('CMP')) type = 'HAZOP';
            else if (docId.startsWith('PID')) type = 'P&ID';
            
            let fileSize = '0.0 KB';
            if (d.size > 1024 * 1024) {
              fileSize = (d.size / (1024 * 1024)).toFixed(1) + ' MB';
            } else if (d.size > 0) {
              fileSize = (d.size / 1024).toFixed(1) + ' KB';
            }
            
            let status = 'pending';
            if (d.ocr_status === 'completed') status = 'indexed';
            else if (d.ocr_status === 'processing') status = 'processing';
            
            const complianceLinked = docId.startsWith('CMP') || docId.startsWith('AUD') || (d.entities?.references && d.entities.references.length > 0);
            
            return {
              id: d.id,
              title: d.filename.replace(/\.pdf$/i, '').replace(/\.docx$/i, '').replace(/_/g, ' '),
              code: d.id,
              author: d.entities?.prepared_by || d.uploaded_by || 'System',
              type: type,
              fileSize: fileSize,
              status: status,
              lastUpdated: d.upload_date ? d.upload_date.split('T')[0] : '2026-07-14',
              complianceLinked: !!complianceLinked
            };
          });
          setDocuments(mapped);
        } else {
          setDocuments([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching documents from backend:', err);
        setDocuments([]);
        setLoading(false);
      });
  }, []);

  const activeSearch = localSearch || parentSearchTerm;

  const filteredDocs = documents.filter((doc) => {
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
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <GlassCard key={i} className="border-border/40 flex flex-col justify-between h-64 p-5 animate-pulse" hoverEffect={false}>
              <div className="space-y-4 w-full">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-3">
                    <div className="bg-card-secondary p-5 rounded-xl border border-border/80 w-10 h-10"></div>
                    <div className="space-y-2">
                      <div className="h-2.5 w-16 bg-white/10 rounded"></div>
                      <div className="h-3.5 w-32 bg-white/10 rounded"></div>
                    </div>
                  </div>
                  <div className="rounded-full bg-white/10 w-5 h-5"></div>
                </div>
                <div className="space-y-3 pt-3 border-t border-border/20">
                  <div className="flex justify-between"><div className="h-2 w-12 bg-white/5 rounded"></div><div className="h-2 w-20 bg-white/10 rounded"></div></div>
                  <div className="flex justify-between"><div className="h-2 w-16 bg-white/5 rounded"></div><div className="h-2 w-24 bg-white/10 rounded"></div></div>
                  <div className="flex justify-between"><div className="h-2 w-20 bg-white/5 rounded"></div><div className="h-2 w-16 bg-white/10 rounded"></div></div>
                </div>
              </div>
            </GlassCard>
          ))
        ) : (
          filteredDocs.map((doc) => (
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
                    onClick={() => setSelectedDrawingDoc(doc)}
                    title="View Interactive Drawing"
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
          ))
        )}

        {!loading && filteredDocs.length === 0 && (

          <div className="col-span-full py-16 text-center">
            <FileText className="w-12 h-12 text-text-muted mx-auto mb-3 animate-bounce" />
            <h4 className="text-sm font-bold text-white">No Engineering Records Located</h4>
            <p className="text-xs text-text-secondary mt-1">Try modifying your filter categories or query input.</p>
          </div>
        )}
      </div>
      {selectedDrawingDoc && (
        <PidDrawingExplorer 
          doc={selectedDrawingDoc} 
          onClose={() => setSelectedDrawingDoc(null)} 
          setActiveTab={setActiveTab} 
        />
      )}
    </div>
  );
};

export default DocumentsView;
