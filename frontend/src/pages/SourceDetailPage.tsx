import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, FileText, Database, Send, RefreshCw, 
  Trash2, BookOpen, Clock, ShieldCheck, Play,
  CheckCircle, Globe, Layers, AlertCircle, Sparkles
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';

interface DocChunk {
  id: number;
  text: string;
  tokens: number;
  status: 'synced' | 'processing';
  vectorId: string;
}

const SourceDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Custom document details mock based on ID
  const docName = id === '1' 
    ? 'Sulfide-electrolyte-interfaces-2026.pdf' 
    : id === '2' 
    ? 'NIST-SP-800-224-Draft.pdf' 
    : 'ResearchMind Document';

  const docType = id === '4' ? 'URL' : 'PDF';

  // Ask question about this document state
  const [docQuery, setDocQuery] = useState('');
  const [chatLog, setChatLog] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Chunks mock list
  const [chunks, setChunks] = useState<DocChunk[]>([
    { id: 1, text: 'Sulfide-based solid electrolytes (specifically Li10GeP2S12 and LPS glass-ceramics) demonstrate high ionic conductivities exceeding 1e-2 S/cm at room temperature. This makes them active candidates for high-rate battery anodes...', tokens: 120, status: 'synced', vectorId: 'vec_f839a9c' },
    { id: 2, text: 'The interface instability between the lithium metal anode and the solid electrolyte layer arises due to rapid degradation, chemical reduction, and spatial current inhomogeneities leading to short circuits...', tokens: 142, status: 'synced', vectorId: 'vec_a773291' },
    { id: 3, text: 'Mitigation strategies involve dry-room assemblies kept strictly below -40C dew point and incorporating argon purging cycles inside loading locks. Doping with oxygen reduces moisture-induced H2S outgassing by 60%...', tokens: 110, status: 'synced', vectorId: 'vec_e838031' },
    { id: 4, text: 'Standard testing under NIST SP-800 guidelines necessitates environmental safety class 4 protocols to safely manage chemical outgassing inside commercial battery production plants...', tokens: 94, status: 'synced', vectorId: 'vec_d29103a' },
  ]);

  const handleReingest = () => {
    alert("Re-indexing document chunks and updating embedding models... (Simulated Action)");
  };

  const handleDelete = () => {
    alert("Purging document from S3 storage and cleaning Qdrant vector indices... (Simulated Action)");
    navigate('/library');
  };

  const handleDocChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docQuery.trim()) return;

    setChatLog(prev => [...prev, { role: 'user', text: docQuery }]);
    const queryBackup = docQuery;
    setDocQuery('');
    setIsSearching(true);

    setTimeout(() => {
      setIsSearching(false);
      setChatLog(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          text: `[Grounded search inside: ${docName}] Found matching chunk #2 (94% score): Interface instability arises from void formation during stripping phase. Doping the interface layer with oxygen or lithium fluoride reduces anode polarization and prevents dendrites.` 
        }
      ]);
    }, 1000);
  };

  return (
    <AppShell>
      <div className="max-w-[1400px] mx-auto space-y-6 lg:space-y-8 font-sans antialiased">
        
        {/* Back navigation & Actions row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-4">
          <button 
            onClick={() => navigate('/library')}
            className="flex items-center gap-1.5 text-xs font-bold text-neutral-550 hover:text-emerald-650 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Library
          </button>
          
          <div className="flex items-center gap-2.5">
            <button 
              onClick={handleReingest}
              className="bg-white border border-neutral-200 hover:border-neutral-300 text-neutral-700 font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all shadow-sm cursor-pointer"
            >
              <RefreshCw className="h-4 w-4 text-neutral-500" />
              <span>Re-ingest Source</span>
            </button>
            <button 
              onClick={handleDelete}
              className="bg-red-50 hover:bg-red-100 text-red-700 font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all border border-red-100 cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete Document</span>
            </button>
          </div>
        </div>

        {/* Source metadata overview */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-neutral-50 border border-neutral-150 rounded-xl text-neutral-600">
              {docType === 'URL' ? <Globe className="h-6 w-6 text-emerald-500" /> : <FileText className="h-6 w-6 text-rose-500" />}
            </div>
            <div>
              <h1 className="text-lg font-black text-neutral-900 tracking-tight leading-tight">{docName}</h1>
              <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-semibold uppercase mt-1">
                <span>{docType} Source</span>
                <span>•</span>
                <span>4 chunks parsed</span>
                <span>•</span>
                <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">Qdrant Indexed</span>
              </div>
            </div>
          </div>

          <div className="flex gap-4 text-xs font-semibold text-neutral-500">
            <div>
              <p className="text-[10px] text-neutral-400 uppercase">Embedding Model</p>
              <p className="text-neutral-850 font-bold">all-MiniLM-L6-v2</p>
            </div>
            <div className="border-l border-neutral-100 pl-4">
              <p className="text-[10px] text-neutral-400 uppercase">Chunk Strategy</p>
              <p className="text-neutral-850 font-bold">512 Semantic Overlap</p>
            </div>
          </div>
        </div>

        {/* Main layout: Document Preview (Left) vs Chunk Viewer & Local Chat (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Document Preview (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <h2 className="font-bold text-sm text-neutral-800 uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="h-4.5 w-4.5 text-emerald-600" />
              Source Content Preview
            </h2>

            <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-5 h-[500px] overflow-y-auto font-mono text-[11px] text-neutral-700 leading-relaxed space-y-4 shadow-inner">
              <div className="border-b border-neutral-200/50 pb-3 text-neutral-400 flex justify-between font-sans text-[10px] font-bold uppercase tracking-wider">
                <span>Document: {docName}</span>
                <span>Preview Mode</span>
              </div>
              <p>
                Sulfide-based solid electrolytes (specifically Li10GeP2S12 and LPS-type glass-ceramics) demonstrate ionic conductivities exceeding 1e-2 S/cm at room temperature, directly rivaling liquid organic carbonates. As of early 2026 pilot factory lines evaluation, cell-level energy densities have reached 510 Wh/kg. However, major degradation at the lithium metal anode interface remains a barrier to gigawatt-scale production.
              </p>
              <p>
                Interfacial resistance between the lithium metal anode and sulfide electrolyte arises due to chemical reduction and mechanical instabilities. Sulfides are thermodynamically unstable against metallic lithium, forming resistive decomposition layers containing Li2S and Li3P. Void formation during stripping leads to current hot-spots, accelerating dendritic short-circuits during high-rate charging (&gt;3C rate).
              </p>
              <p>
                Exposure of sulfide electrolytes to ambient moisture generates toxic Hydrogen Sulfide (H2S) gas. Pilot facilities mitigate this via dry-room environments maintained below -40C dew point, combined with inert gas purging (Argon or Dry Nitrogen) within high-exposure loading locks. Doping with oxygen reduces moisture-induced outgassing by 60%.
              </p>
              <p>
                Standard testing under NIST safety guidelines SP-800 necessitates environmental class 4 hazardous protocols to safely manage chemical outgassing inside battery manufacturing plants.
              </p>
            </div>
          </div>

          {/* Right Column: Chunk Viewer & Ask Document Chat (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6 h-[536px]">
            
            {/* Chunk Viewer section */}
            <div className="space-y-4 flex-1 flex flex-col min-h-0">
              <h2 className="font-bold text-sm text-neutral-800 uppercase tracking-wider flex items-center gap-2">
                <Layers className="h-4.5 w-4.5 text-emerald-600" />
                Parsed Vector Chunks
              </h2>

              <div className="bg-white border border-neutral-200 rounded-2xl divide-y divide-neutral-100 overflow-y-auto flex-1 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
                {chunks.map((chunk) => (
                  <div key={chunk.id} className="p-4 space-y-2 hover:bg-neutral-50/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Chunk #{chunk.id} • {chunk.tokens} tokens</span>
                      <span className="flex items-center gap-1 text-[9px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold font-mono">
                        <CheckCircle className="h-3 w-3 text-emerald-500" />
                        {chunk.vectorId}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-650 leading-relaxed font-semibold italic">
                      "{chunk.text}"
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Document Specific Chat */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-[0_4px_16px_rgba(0,0,0,0.01)] space-y-4">
              <span className="text-xs font-bold text-neutral-450 uppercase block">Query This Document Only</span>
              
              {/* Local chat log */}
              <div className="space-y-2 max-h-24 overflow-y-auto">
                {chatLog.map((chat, idx) => (
                  <div key={idx} className={`p-2 rounded-lg text-xs leading-normal font-medium ${
                    chat.role === 'user' ? 'bg-neutral-50 text-neutral-900 text-right' : 'bg-emerald-50/50 text-emerald-800'
                  }`}>
                    {chat.text}
                  </div>
                ))}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleDocChatSubmit} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ask a question about this document..."
                  value={docQuery}
                  disabled={isSearching}
                  onChange={(e) => setDocQuery(e.target.value)}
                  className="flex-1 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-neutral-900"
                />
                <button 
                  type="submit"
                  disabled={!docQuery.trim() || isSearching}
                  className="bg-neutral-950 hover:bg-neutral-850 disabled:bg-neutral-100 disabled:text-neutral-400 text-white p-2.5 rounded-xl transition-all cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>

          </div>

        </div>

      </div>
    </AppShell>
  );
};

export default SourceDetailPage;
