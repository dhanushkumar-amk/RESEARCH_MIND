import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FileText, Download, Share2, Trash2, ArrowLeft,
  Calendar, Clock, BookOpen, ShieldCheck, ExternalLink,
  ChevronRight, Sparkles, AlertCircle
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';

interface ReportData {
  id: string;
  title: string;
  query: string;
  date: string;
  readTime: string;
  groundingScore: number;
  model: string;
  summary: string;
  contentMarkdown: string;
  citations: string[];
}

const ReportPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Mock list of generated reports
  const mockReports: Record<string, ReportData> = {
    'rep_1': {
      id: 'rep_1',
      title: 'Solid-State Battery Anode Interfaces & Sulfide-Based Electrolytes',
      query: 'Analyze the current state of sulfide-based solid-state battery anodes in 2026 pilot lines.',
      date: 'May 28, 2026',
      readTime: '8 min read',
      groundingScore: 98,
      model: 'Llama 3.3 70B (Groq)',
      summary: 'An in-depth chemical and operational evaluation of sulfide-based solid-state batteries. Details interface kinetics, dendrite formation mitigation protocols, and pilot factory outgassing controls.',
      contentMarkdown: `### 1. Executive Summary
Sulfide-based solid electrolytes (specifically Li10GeP2S12 and LPS-type glass-ceramics) demonstrate ionic conductivities exceeding $10^{-2} \\text{ S/cm}$ at room temperature, directly rivaling liquid organic carbonates. As of early 2026 pilot evaluations, cell-level energy densities have reached 510 Wh/kg. However, major degradation at the lithium metal anode interface remains a barrier to gigawatt-scale production.

### 2. Interface Kinetics & Dendrite Growth
Interfacial resistance between the lithium metal anode and sulfide electrolyte arises due to:
* **Chemical Reduction:** Sulfides are thermodynamically unstable against metallic lithium, forming resistive decomposition layers ($Li_2S$, $Li_3P$).
* **Mechanical Inhomogeneities:** Void formation during striping leads to current hot-spots, accelerating dendritic short-circuits during high-rate charging (>3C rate).

### 3. Outgassing Mitigation Protocols
Exposure of sulfide electrolytes to ambient moisture generates toxic Hydrogen Sulfide ($H_2S$) gas. Pilot facilities mitigate this via:
1. Dry-room environments maintained below -40°C dew point.
2. Inert gas purging (Argon or Dry Nitrogen) within high-exposure loading locks.
3. Incorporating oxygen/fluorine substitutions (e.g., $Li_3PS_4$ doped with oxygen) to suppress reaction rates.`,
      citations: [
        'Toyota Battery Corp Annual Report (Q2 2026) - Pilot production lines specifications',
        'Sulfide-based electrolyte interfaces - ArXiv (March 2026)',
        'NIST Safety Standard SP-800-224-Draft: Chemical Outgassing Protocols'
      ]
    },
    'rep_2': {
      id: 'rep_2',
      title: 'Post-Quantum Cryptography: NIST Standards & Enterprise Transition',
      query: 'NIST post-quantum cryptographic standards transition timeline and impact on SSH/TLS.',
      date: 'May 27, 2026',
      readTime: '12 min read',
      groundingScore: 94,
      model: 'Claude 3.5 Sonnet',
      summary: 'Examines standard quantum-resistant algorithms (ML-KEM, ML-DSA) and provides a concrete migration checklist for enterprise SSH/TLS server protocols.',
      contentMarkdown: `### 1. NIST Algorithmic Standards
The National Institute of Standards and Technology (NIST) finalized its primary standards:
* **ML-KEM (Kyber):** Key encapsulation mechanism recommended for general encryption.
* **ML-DSA (Dilithium):** Primary signature scheme for digital handshakes.

### 2. Hybrid Negotiation in SSH/TLS
To ensure confidentiality against "harvest now, decrypt later" attacks, modern enterprise nodes must implement hybrid key exchanges (e.g., X25519 combined with ML-KEM).

### 3. Migration Milestones
* **Phase 1 (Discovery):** Inventory all public-key configurations across servers.
* **Phase 2 (Hybrid Implementation):** Deploy dual-key handshakes on edge endpoints.
* **Phase 3 (Full Compliance):** Enforce strict PQ-safe key sizes by Q4 2027.`,
      citations: [
        'NIST Special Publication 800-205: Transitioning to Quantum-Resistant Cryptography',
        'IETF Draft: Hybrid Key Exchange in TLS 1.3 (April 2026)'
      ]
    }
  };

  const handleExportPDF = () => {
    alert("Exporting report as PDF... (Simulated Action)");
  };

  const handleShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Public shareable link copied to clipboard!");
  };

  const handleDelete = (reportId: string) => {
    alert(`Report ${reportId} deleted successfully. (Simulated Action)`);
    navigate('/dashboard');
  };

  // If no ID match or no ID provided, render the Report Directory List
  const report = id ? mockReports[id] : null;

  if (!report) {
    return (
      <AppShell>
        <div className="max-w-[1200px] mx-auto space-y-6 lg:space-y-8 font-sans antialiased">
          <div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-neutral-900 tracking-tight">
              Synthesized Research Reports
            </h1>
            <p className="text-sm text-neutral-500 mt-1 font-medium">
              Access and export past comprehensive research reports synthesized by ResearchMind.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.values(mockReports).map((rep) => (
              <div 
                key={rep.id} 
                className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.03)] hover:border-neutral-350 transition-all flex flex-col justify-between gap-5 cursor-pointer"
                onClick={() => navigate(`/report/${rep.id}`)}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {rep.date}</span>
                    <span>{rep.readTime}</span>
                  </div>
                  <h3 className="font-extrabold text-base text-neutral-900 line-clamp-1">{rep.title}</h3>
                  <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed font-semibold">{rep.summary}</p>
                </div>

                <div className="flex items-center justify-between border-t border-neutral-100 pt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-green-700 bg-green-50 px-1.5 py-0.5 rounded font-bold">
                      Accuracy: {rep.groundingScore}%
                    </span>
                    <span className="text-[10px] text-neutral-450 font-semibold">{rep.model}</span>
                  </div>
                  
                  <span className="text-xs font-bold text-[#16a34a] flex items-center gap-1 group">
                    View Report
                    <ChevronRight className="h-4.5 w-4.5 group-hover:translate-x-0.5 transition-all" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  // Render Single Report Viewer Details
  return (
    <AppShell>
      <div className="max-w-[1000px] mx-auto space-y-6 lg:space-y-8 font-sans antialiased">
        
        {/* Back navigation & Actions row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-4">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-xs font-bold text-neutral-550 hover:text-green-655 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Directory
          </button>
          
          <div className="flex items-center gap-2.5">
            <button 
              onClick={handleExportPDF}
              className="bg-white border border-neutral-200 hover:border-neutral-350 text-neutral-705 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all shadow-sm cursor-pointer"
            >
              <Download className="h-4 w-4 text-neutral-500" />
              <span>Export PDF</span>
            </button>
            <button 
              onClick={handleShareLink}
              className="bg-white border border-neutral-200 hover:border-neutral-350 text-neutral-705 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all shadow-sm cursor-pointer"
            >
              <Share2 className="h-4 w-4 text-neutral-500" />
              <span>Share Link</span>
            </button>
            <button 
              onClick={() => handleDelete(report.id)}
              className="bg-red-50 hover:bg-red-100 text-red-700 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all border border-red-100 cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete</span>
            </button>
          </div>
        </div>

        {/* Report metadata block */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/[0.01] rounded-full blur-[80px] pointer-events-none" />
          
          <div className="flex flex-wrap items-center gap-3 text-[10px] text-neutral-450 font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {report.date}</span>
            <span>•</span>
            <span>{report.readTime}</span>
            <span>•</span>
            <span className="text-green-700 bg-green-50 px-1.5 py-0.5 rounded flex items-center gap-1 font-bold">
              <ShieldCheck className="h-3 w-3 text-[#16a34a]" />
              {report.groundingScore}% Grounding Accuracy
            </span>
          </div>

          <h1 className="text-2xl lg:text-3xl font-black text-neutral-900 tracking-tight leading-tight">
            {report.title}
          </h1>

          <div className="border-t border-neutral-100 pt-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-semibold">
            <p className="text-neutral-500 italic">
              <strong>Query:</strong> "{report.query}"
            </p>
            <p className="text-neutral-400 whitespace-nowrap">
              <strong>Model:</strong> {report.model}
            </p>
          </div>
        </div>

        {/* Report Body Content (Markdown mock) */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 lg:p-8 shadow-[0_2px_8px_rgba(0,0,0,0.01)] prose prose-neutral max-w-none">
          <div className="space-y-6 text-sm text-neutral-800 leading-relaxed whitespace-pre-wrap font-medium">
            {report.contentMarkdown}
          </div>
        </div>

        {/* Citations section */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4">
          <h2 className="font-bold text-sm text-neutral-900 border-b border-neutral-100 pb-3 flex items-center gap-2">
            <BookOpen className="h-4.5 w-4.5 text-[#16a34a]" />
            Citations & Grounded Sources
          </h2>

          <div className="space-y-2">
            {report.citations.map((cite, idx) => (
              <div 
                key={idx}
                className="flex items-start gap-2.5 p-3 hover:bg-neutral-50 rounded-xl transition-colors border border-neutral-100 text-xs font-semibold text-neutral-705"
              >
                <span className="h-5 w-5 bg-neutral-100 rounded-full flex items-center justify-center font-bold text-[10px] text-neutral-500 flex-shrink-0">
                  {idx + 1}
                </span>
                <span className="flex-1">{cite}</span>
                <ExternalLink className="h-3.5 w-3.5 text-neutral-405 hover:text-neutral-605 transition-colors cursor-pointer" />
              </div>
            ))}
          </div>
        </div>

      </div>
    </AppShell>
  );
};

export default ReportPage;
