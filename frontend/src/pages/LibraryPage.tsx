import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, Globe, Search, BookOpen,
  Trash2, RefreshCw, FileText, CheckCircle2,
  Clock, AlertTriangle, Database, Info, Filter,
  Layers, HardDrive, Plus, X, AlertCircle
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { useDocuments } from '@/hooks/useDocuments';

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
  const [localError, setLocalError] = useState<string | null>(null);

  const {
    documents: rawDocs,
    isLoading,
    error: apiError,
    uploadDocument,
    ingestUrl,
    ingestYoutube,
    deleteDocument,
  } = useDocuments();

  // Helper to format bytes
  const formatBytes = (bytes: number, decimals = 1) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Map backend rawDocs to DocumentItem format for the table view
  const documents: DocumentItem[] = rawDocs.map((doc) => {
    let mappedType: 'PDF' | 'URL' | 'YouTube' | 'Word' = 'PDF';
    const ext = doc.file_type.toLowerCase();
    if (ext === 'url') {
      mappedType = 'URL';
    } else if (ext === 'youtube') {
      mappedType = 'YouTube';
    } else if (ext === 'docx' || ext === 'doc') {
      mappedType = 'Word';
    } else {
      mappedType = 'PDF';
    }

    let mappedStatus: 'indexed' | 'processing' | 'failed' = 'indexed';
    if (doc.status === 'indexed') {
      mappedStatus = 'indexed';
    } else if (doc.status === 'failed') {
      mappedStatus = 'failed';
    } else {
      mappedStatus = 'processing';
    }

    let dateAdded = 'Unknown';
    try {
      const date = new Date(doc.created_at);
      dateAdded = date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      // fallback
    }

    let size = '—';
    if (doc.file_size) {
      size = formatBytes(doc.file_size);
    } else if (mappedType === 'URL') {
      size = 'Web Page';
    } else if (mappedType === 'YouTube') {
      size = 'Video Transcript';
    }

    return {
      id: doc.id,
      name: doc.filename,
      type: mappedType,
      status: mappedStatus,
      dateAdded,
      size,
      chunks: doc.chunk_count || 0,
      progress: doc.status === 'uploaded' ? 20
              : doc.status === 'extracting' ? 40
              : doc.status === 'chunking' ? 60
              : doc.status === 'embedding' ? 80
              : doc.status === 'indexing' ? 90
              : 100,
    };
  });

  // Handle file drops
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setLocalError(null);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      try {
        await uploadDocument(file);
      } catch (err: any) {
        setLocalError(err?.message || 'Failed to upload file.');
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalError(null);
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      try {
        await uploadDocument(file);
      } catch (err: any) {
        setLocalError(err?.message || 'Failed to upload file.');
      }
    }
  };

  // Helper to trigger file upload dialog
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Handle URL ingestion
  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setLocalError(null);
    try {
      await ingestUrl(urlInput.trim());
      setUrlInput('');
    } catch (err: any) {
      setLocalError(err?.message || 'Failed to ingest URL.');
    }
  };

  // Handle YouTube ingestion
  const handleYoutubeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeInput.trim()) return;
    setLocalError(null);
    try {
      await ingestYoutube(youtubeInput.trim());
      setYoutubeInput('');
    } catch (err: any) {
      setLocalError(err?.message || 'Failed to ingest YouTube video.');
    }
  };

  const deleteDoc = async (id: string) => {
    setLocalError(null);
    try {
      await deleteDocument(id);
    } catch (err: any) {
      setLocalError(err?.message || 'Failed to delete document.');
    }
  };

  const reIngestDoc = async (doc: DocumentItem) => {
    setLocalError(null);
    const originalDoc = rawDocs.find(d => d.id === doc.id);
    if (!originalDoc) return;
    
    if (doc.type === 'URL') {
      const url = originalDoc.source_url || originalDoc.s3_url || doc.name;
      try {
        await ingestUrl(url);
      } catch (err: any) {
        setLocalError(err?.message || 'Failed to re-ingest URL.');
      }
    } else if (doc.type === 'YouTube') {
      const url = originalDoc.source_url || originalDoc.s3_url || doc.name;
      try {
        await ingestYoutube(url);
      } catch (err: any) {
        setLocalError(err?.message || 'Failed to re-ingest YouTube video.');
      }
    } else {
      setLocalError('For files, please delete and upload the file again.');
    }
  };

  // Filter logic
  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || doc.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Calculate live S3 Storage metrics based on actual documents
  const totalStorageBytes = rawDocs.reduce((acc, doc) => acc + (doc.file_size || 0), 0);
  const totalStorageMB = parseFloat((totalStorageBytes / (1024 * 1024)).toFixed(2)) || 0.0;
  const storagePct = Math.min((totalStorageMB / 100) * 100, 100); // 100MB Limit

  return (
    <AppShell>
      <div className="max-w-[1400px] mx-auto space-y-6 lg:space-y-8 font-sans antialiased">

        {/* Top Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-neutral-900 tracking-tight">
            Document Library
          </h1>
          <p className="text-sm text-neutral-500 mt-1 font-medium">
            Ingest PDFs, websites, Word documents, and YouTube videos into your unified vector space.
          </p>
        </div>

        {/* API Error / Local Error Alert */}
        {(apiError || localError) && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-xs font-semibold text-red-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
            <span>{apiError || localError}</span>
          </div>
        )}

        {/* Input grids: Upload Drag-Drop, URL, YouTube & S3 Usage */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Column 1: File Upload Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={triggerFileInput}
            className={`border-2 border-dashed rounded-2xl p-6 text-center flex flex-col items-center justify-center cursor-pointer transition-all h-[200px] ${isDragging
                ? 'border-[#16a34a] bg-green-50/[0.15]'
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
            <p className="text-xs text-neutral-450 mt-1 font-semibold">or click to browse. Supports PDF, DOCX, TXT (Max 50MB)</p>
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
                    className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#16a34a] bg-white transition-all text-neutral-900 placeholder-neutral-400"
                  />
                </div>
                <button type="submit" className="bg-neutral-950 hover:bg-neutral-850 text-white text-xs font-bold px-3 py-2 rounded-lg cursor-pointer transition-colors">
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
                    className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#16a34a] bg-white transition-all text-neutral-900 placeholder-neutral-400"
                  />
                </div>
                <button type="submit" className="bg-neutral-950 hover:bg-neutral-850 text-white text-xs font-bold px-3 py-2 rounded-lg cursor-pointer transition-colors">
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
                <HardDrive className="h-4 w-4 text-[#16a34a]" />
              </div>
              <p className="text-2xl font-black text-neutral-900 tracking-tight mt-1">{totalStorageMB} MB <span className="text-xs font-bold text-neutral-400">of 100 MB</span></p>
            </div>

            <div className="space-y-2">
              <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#16a34a] rounded-full" style={{ width: `${storagePct}%` }} />
              </div>
              <div className="flex justify-between items-center text-[10px] text-neutral-405 font-bold">
                <span>{storagePct}% USED</span>
                <span>{100 - totalStorageMB} MB AVAILABLE</span>
              </div>
            </div>

            <div className="bg-green-50/50 border border-green-100 rounded-xl p-2.5 flex items-start gap-2">
              <Info className="h-4 w-4 text-[#16a34a] flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-green-850 leading-normal font-semibold">
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
              className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#16a34a] bg-white transition-all text-neutral-900 placeholder-neutral-400"
            />
          </div>

          {/* Type filter */}
          <div className="flex gap-1.5 w-full sm:w-auto">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider self-center hidden md:inline">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="px-3 py-1.5 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#16a34a] bg-white text-neutral-705 cursor-pointer"
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
              className="px-3 py-1.5 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#16a34a] bg-white text-neutral-705 cursor-pointer"
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
              <p className="text-xs font-bold text-neutral-850">Processing Documents</p>
              {documents.filter(d => d.status === 'processing').map(doc => (
                <div key={doc.id} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-neutral-700 truncate max-w-sm">{doc.name}</span>
                    <span className="text-[10px] text-neutral-405 font-bold">{doc.progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#16a34a] transition-all duration-300"
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
                <tr className="bg-neutral-50/50 border-b border-neutral-200 text-neutral-455 uppercase font-bold text-[10px] tracking-wider">
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
                      className="p-4 font-bold text-neutral-855 max-w-[280px] truncate hover:text-[#16a34a] transition-colors cursor-pointer"
                    >
                      {doc.name}
                    </td>

                    {/* Type icon/badge */}
                    <td className="p-4 text-neutral-600">
                      <span className="inline-flex items-center gap-1.5 font-bold text-[10px]">
                        {doc.type === 'PDF' && <FileText className="h-4 w-4 text-rose-500" />}
                        {doc.type === 'URL' && <Globe className="h-4 w-4 text-green-600" />}
                        {doc.type === 'YouTube' && <YoutubeIcon className="h-4 w-4 text-rose-500" />}
                        {doc.type === 'Word' && <FileText className="h-4 w-4 text-blue-500" />}
                        {doc.type}
                      </span>
                    </td>

                    {/* Status badge */}
                    <td className="p-4">
                      {doc.status === 'indexed' && (
                        <span className="bg-green-50 text-green-700 border border-green-100 text-[10px] font-bold px-2 py-0.5 rounded">
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
                    <td className="p-4 text-neutral-505 font-mono font-bold">
                      {doc.status === 'indexed' ? doc.chunks : '—'}
                    </td>

                    {/* Size */}
                    <td className="p-4 text-neutral-500 font-semibold">
                      {doc.size}
                    </td>

                    {/* Date added */}
                    <td className="p-4 text-neutral-500 font-semibold">
                      {doc.dateAdded}
                    </td>

                    {/* Action buttons */}
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1.5">

                        {/* Re-ingest */}
                        <button
                          onClick={() => reIngestDoc(doc)}
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
