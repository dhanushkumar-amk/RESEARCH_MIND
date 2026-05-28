import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, Globe, Search, BookOpen, 
  Trash2, RefreshCw, FileText, CheckCircle2, 
  Clock, AlertTriangle, Database, Info, Filter,
  Layers, HardDrive, Plus, X
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';

// Custom SVG Youtube icon to bypass lucide-react export discrepancy
const YoutubeIcon = ({ className, ...props }: React.SVGProps<SVGSVGElement> & { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
    {...props}
  >
    <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.517 3.545 12 3.545 12 3.545s-7.517 0-9.388.507a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.871.507 9.388.507 9.388.507s7.517 0 9.388-.507a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

interface DocumentItem {
  id: string;
  name: string;
  type: 'PDF' | 'URL' | 'YouTube' | 'Word';
  status: 'indexed' | 'processing' | 'failed';
  dateAdded: string;
  size: string;
  chunks: number;
  progress?: number;
}

const LibraryPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'PDF' | 'URL' | 'YouTube' | 'Word'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'indexed' | 'processing' | 'failed'>('all');
  
  // URL & YouTube Input values
  const [urlInput, setUrlInput] = useState('');
  const [youtubeInput, setYoutubeInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Initial mock documents
  const [documents, setDocuments] = useState<DocumentItem[]>([
    { id: '1', name: 'Sulfide-electrolyte-interfaces-2026.pdf', type: 'PDF', status: 'indexed', dateAdded: 'May 27, 2026', size: '4.2 MB', chunks: 124 },
    { id: '2', name: 'NIST-SP-800-224-Draft.pdf', type: 'PDF', status: 'indexed', dateAdded: 'May 26, 2026', size: '12.8 MB', chunks: 382 },
    { id: '3', name: 'Toyota Pilot Production Updates - Q1.docx', type: 'Word', status: 'indexed', dateAdded: 'May 25, 2026', size: '840 KB', chunks: 18 },
    { id: '4', name: 'NIST PQ Cryptography Transition Standards', type: 'URL', status: 'indexed', dateAdded: 'May 24, 2026', size: 'Web Page', chunks: 42 },
    { id: '5', name: 'https://youtube.com/watch?v=bB29a5Xz-M', type: 'YouTube', status: 'failed', dateAdded: 'May 23, 2026', size: '15m Video', chunks: 0 },
  ]);

  // Handle file drops
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      addNewMockDoc(file.name, file.size);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      addNewMockDoc(file.name, formatBytes(file.size));
    }
  };

  // Helper to trigger file upload dialog
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const formatBytes = (bytes: number, decimals = 1) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Handle URL ingestion
  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    addNewMockDoc(urlInput, 'Web Page', 'URL');
    setUrlInput('');
  };

  // Handle YouTube ingestion
  const handleYoutubeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeInput.trim()) return;
    addNewMockDoc(youtubeInput, 'Video Transcript', 'YouTube');
    setYoutubeInput('');
  };

  const addNewMockDoc = (name: string, size: string, forceType?: 'PDF' | 'URL' | 'YouTube' | 'Word') => {
    let docType: 'PDF' | 'URL' | 'YouTube' | 'Word' = 'PDF';
    if (forceType) {
      docType = forceType;
    } else if (name.endsWith('.docx') || name.endsWith('.doc')) {
      docType = 'Word';
    }

    const newId = (documents.length + 1).toString();
    const newDoc: DocumentItem = {
      id: newId,
      name,
      type: docType,
      status: 'processing',
      dateAdded: 'Today',
      size: size,
      chunks: 0,
      progress: 10,
    };

    // Add to list
    setDocuments(prev => [newDoc, ...prev]);

    // Simulate ingestion progress bar increments
    let progress = 10;
    const interval = setInterval(() => {
      progress += 15;
      setDocuments(prev => 
        prev.map(d => d.id === newId ? { ...d, progress: Math.min(progress, 100) } : d)
      );

      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setDocuments(prev => 
            prev.map(d => d.id === newId ? { ...d, status: 'indexed', chunks: Math.floor(Math.random() * 80) + 10 } : d)
          );
        }, 500);
      }
    }, 600);
  };

  const deleteDoc = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  const reIngestDoc = (id: string) => {
    setDocuments(prev => 
      prev.map(d => d.id === id ? { ...d, status: 'processing', progress: 0 } : d)
    );

    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      setDocuments(prev => 
        prev.map(d => d.id === id ? { ...d, progress: Math.min(progress, 100) } : d)
      );

      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setDocuments(prev => 
            prev.map(d => d.id === id ? { ...d, status: 'indexed', chunks: Math.floor(Math.random() * 80) + 15 } : d)
          );
        }, 500);
      }
    }, 500);
  };

  // Filter logic
  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || doc.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Calculate live S3 Storage metrics
  const totalStorageMB = 28.5; // sum of MBs
  const storagePct = (totalStorageMB / 100) * 100; // E.g., limit of 100MB

  return (
    <AppShell>
      <div className="max-w-[1400px] mx-auto space-y-6 lg:space-y-8 font-sans antialiased">
        
        {/* Top Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-neutral-900 tracking-tight">
            Document Library
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Ingest PDFs, websites, Word documents, and YouTube videos into your unified vector space.
          </p>
        </div>

        {/* Input grids: Upload Drag-Drop, URL, YouTube & S3 Usage */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Column 1: File Upload Area */}
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={triggerFileInput}
            className={`border-2 border-dashed rounded-2xl p-6 text-center flex flex-col items-center justify-center cursor-pointer transition-all h-[200px] ${
              isDragging 
                ? 'border-emerald-500 bg-emerald-50/[0.15]' 
                : 'border-neutral-200 bg-white hover:border-neutral-350 hover:bg-neutral-50/30'
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept=".pdf,.docx,.doc,.txt"
            />
            <div className="p-3 bg-neutral-50 border border-neutral-100 rounded-xl mb-3 text-neutral-600">
              <Upload className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-neutral-800">Drag & Drop files here</p>
            <p className="text-xs text-neutral-450 mt-1">or click to browse. Supports PDF, DOCX, TXT (Max 50MB)</p>
          </div>

          {/* Column 2: Web & YouTube URL Ingestors */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex flex-col justify-between gap-4 h-[200px]">
            {/* URL Ingestion */}
            <form onSubmit={handleUrlSubmit} className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Website URL Ingestion</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                  <input
                    type="url"
                    placeholder="https://example.com/research-paper"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white transition-all text-neutral-900 placeholder-neutral-400"
                  />
                </div>
                <button type="submit" className="bg-neutral-950 hover:bg-neutral-850 text-white text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer transition-colors">
                  Ingest
                </button>
              </div>
            </form>

            {/* YouTube Ingestion */}
            <form onSubmit={handleYoutubeSubmit} className="space-y-1.5 border-t border-neutral-100 pt-3">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">YouTube Transcript Ingestion</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <YoutubeIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-rose-500" />
                  <input
                    type="url"
                    placeholder="https://youtube.com/watch?v=..."
                    value={youtubeInput}
                    onChange={(e) => setYoutubeInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white transition-all text-neutral-900 placeholder-neutral-400"
                  />
                </div>
                <button type="submit" className="bg-neutral-950 hover:bg-neutral-850 text-white text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer transition-colors">
                  Ingest
                </button>
              </div>
            </form>
          </div>

          {/* Column 3: Storage usage indicators */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex flex-col justify-between h-[200px]">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Storage Capacity (AWS S3)</span>
                <HardDrive className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-neutral-900 tracking-tight mt-1">{totalStorageMB} MB <span className="text-xs font-bold text-neutral-400">of 100 MB</span></p>
            </div>

            <div className="space-y-2">
              <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${storagePct}%` }} />
              </div>
              <div className="flex justify-between items-center text-[10px] text-neutral-400 font-semibold">
                <span>{storagePct}% USED</span>
                <span>{100 - totalStorageMB} MB AVAILABLE</span>
              </div>
            </div>

            <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-2.5 flex items-start gap-2">
              <Info className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-emerald-800 leading-normal">
                Files are indexed into vector chunks to allow semantic search queries within the Research workspace.
              </p>
            </div>
          </div>

        </div>

        {/* Filters and Search Bar Row */}
        <div className="bg-white border border-neutral-200 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search library documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white transition-all text-neutral-900 placeholder-neutral-400"
            />
          </div>

          {/* Type filter */}
          <div className="flex gap-1.5 w-full sm:w-auto">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider self-center hidden md:inline">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="px-3 py-1.5 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-neutral-700 cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="PDF">PDFs</option>
              <option value="URL">Web Links</option>
              <option value="YouTube">YouTube</option>
              <option value="Word">Word Docs</option>
            </select>
          </div>

          {/* Status filter */}
          <div className="flex gap-1.5 w-full sm:w-auto">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider self-center hidden md:inline">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-neutral-700 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="indexed">Indexed</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        {/* Live Ingestion Progress Bars for currently processing documents */}
        <AnimatePresence>
          {documents.some(d => d.status === 'processing') && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white border border-neutral-200 rounded-xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-3"
            >
              <p className="text-xs font-bold text-neutral-800">Processing Documents</p>
              {documents.filter(d => d.status === 'processing').map(doc => (
                <div key={doc.id} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-neutral-700 truncate max-w-sm">{doc.name}</span>
                    <span className="text-[10px] text-neutral-405 font-bold">{doc.progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-300" 
                      style={{ width: `${doc.progress}%` }} 
                    />
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Library Documents Grid */}
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-neutral-50/50 border-b border-neutral-200 text-neutral-450 uppercase font-semibold text-[10px] tracking-wider">
                  <th className="p-4">Name / Title</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Chunks Created</th>
                  <th className="p-4">Size</th>
                  <th className="p-4">Date Added</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-neutral-50/55 transition-colors">
                    
                    {/* Name */}
                    <td 
                      onClick={() => navigate(`/source/${doc.id}`)}
                      className="p-4 font-bold text-neutral-850 max-w-[280px] truncate hover:text-emerald-650 transition-colors cursor-pointer"
                    >
                      {doc.name}
                    </td>
                    
                    {/* Type icon/badge */}
                    <td className="p-4 text-neutral-600">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-[10px]">
                        {doc.type === 'PDF' && <FileText className="h-4 w-4 text-rose-500" />}
                        {doc.type === 'URL' && <Globe className="h-4 w-4 text-emerald-500" />}
                        {doc.type === 'YouTube' && <YoutubeIcon className="h-4 w-4 text-rose-500" />}
                        {doc.type === 'Word' && <FileText className="h-4 w-4 text-blue-500" />}
                        {doc.type}
                      </span>
                    </td>

                    {/* Status badge */}
                    <td className="p-4">
                      {doc.status === 'indexed' && (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold px-2 py-0.5 rounded">
                          Indexed
                        </span>
                      )}
                      {doc.status === 'processing' && (
                        <span className="bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-bold px-2 py-0.5 rounded animate-pulse">
                          Processing
                        </span>
                      )}
                      {doc.status === 'failed' && (
                        <span className="bg-rose-50 text-rose-700 border border-rose-100 text-[10px] font-bold px-2 py-0.5 rounded">
                          Failed
                        </span>
                      )}
                    </td>

                    {/* Chunks */}
                    <td className="p-4 text-neutral-500 font-mono font-semibold">
                      {doc.status === 'indexed' ? doc.chunks : '—'}
                    </td>

                    {/* Size */}
                    <td className="p-4 text-neutral-500 font-medium">
                      {doc.size}
                    </td>

                    {/* Date added */}
                    <td className="p-4 text-neutral-500 font-medium">
                      {doc.dateAdded}
                    </td>

                    {/* Action buttons */}
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        
                        {/* Re-ingest */}
                        <button 
                          onClick={() => reIngestDoc(doc.id)}
                          disabled={doc.status === 'processing'}
                          className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded transition-colors disabled:opacity-50"
                          title="Re-ingest Document"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                        
                        {/* Delete */}
                        <button 
                          onClick={() => deleteDoc(doc.id)}
                          className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Delete Document"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
                {filteredDocs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-neutral-450 font-medium">
                      No documents found matching the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </AppShell>
  );
};

export default LibraryPage;
