import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/constants';
import useAuth from '@/hooks/useAuth';
import {
  Brain,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Loader,
  ShieldCheck,
  Check,
  Layout,
  BookOpen,
  Cpu,
  Key,
  Info,
  FileText,
  Download,
  ShieldAlert,
  Blocks,
  TrendingUp,
  GraduationCap,
  Terminal,
  FolderLock,
  X,
  Loader2,
  Lock,
  HelpCircle,
  CreditCard,
  BarChart3,
  Microscope,
  ListChecks,
  Globe,
  Database
} from 'lucide-react';

const Lucide = {
  Brain,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Loader,
  ShieldCheck,
  Check,
  Layout,
  BookOpen,
  Cpu,
  Key,
  Info,
  FileText,
  Download,
  ShieldAlert,
  Blocks,
  TrendingUp,
  GraduationCap,
  Terminal,
  FolderLock,
  X,
  Loader2,
  Lock,
  HelpCircle,
  CreditCard,
  BarChart3,
  Microscope,
  ListChecks,
  Globe,
  Database
};
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

// Radar data comparing ResearchMind (PRD multi-agent) with Standard RAG
const radarData = [
  { metric: 'Faithfulness', ResearchMind: 96, StandardRAG: 72 },
  { metric: 'Relevance', ResearchMind: 94, StandardRAG: 68 },
  { metric: 'Context Coverage', ResearchMind: 90, StandardRAG: 55 },
  { metric: 'Citation Accuracy', ResearchMind: 98, StandardRAG: 60 },
  { metric: 'Speed', ResearchMind: 85, StandardRAG: 80 },
  { metric: 'Synthesis Quality', ResearchMind: 95, StandardRAG: 65 },
];

// Area data for research throughput / accuracy over time
const throughputData = [
  { month: 'Jan', Accuracy: 88, Efficiency: 60 },
  { month: 'Feb', Accuracy: 90, Efficiency: 65 },
  { month: 'Mar', Accuracy: 91, Efficiency: 74 },
  { month: 'Apr', Accuracy: 94, Efficiency: 82 },
  { month: 'May', Accuracy: 96, Efficiency: 89 },
  { month: 'Jun', Accuracy: 98, Efficiency: 95 },
];

// Demo query data based on PRD use cases
const DEMO_QUERIES = [
  {
    id: 'market',
    label: 'Market Trend',
    icon: 'BarChart3',
    query: 'Analyze EV solid-state battery commercialization timeline for 2026-2030.',
    steps: [
      { agent: 'Planner', text: 'Divided query into 3 research threads: Solid-state tech maturity, OEM contracts, and resource constraints.', status: 'done' },
      { agent: 'Retrieval', text: 'Retrieved 8 papers from ArXiv and 4 company annual reports from Qdrant vector store.', status: 'done' },
      { agent: 'Research', text: 'Fetched real-time Tavily search results for recent Toyota & Samsung SDI announcements.', status: 'done' },
      { agent: 'Critic', text: 'Flagged one source as outdated (2022 proposal). Prompted ResearchAgent for 2026 updates.', status: 'done' },
      { agent: 'Summary', text: 'Compiled report: "EV Solid-State Batteries: 2026-2030 Commercial Outlook" (12 citations).', status: 'done' }
    ]
  },
  {
    id: 'academic',
    label: 'Literature Review',
    icon: 'GraduationCap',
    query: 'Synthesize recent advancements in model pruning vs quantization for local LLM execution.',
    steps: [
      { agent: 'Planner', text: 'Identified core comparison aspects: Memory footprint, latency, and perplexity scores.', status: 'done' },
      { agent: 'Retrieval', text: 'Extracted 12 academic preprints from local storage index.', status: 'done' },
      { agent: 'Research', text: 'Queried arXiv and HuggingFace logs for latest llama.cpp quantization benchmarks.', status: 'done' },
      { agent: 'Critic', text: 'Verified that perplexity comparisons are grounded on same evaluation datasets (Wikitext-2).', status: 'done' },
      { agent: 'Summary', text: 'Synthesized report: "Pruning vs Quantization: Memory/Performance Trade-offs in Edge LLMs".', status: 'done' }
    ]
  },
  {
    id: 'clinical',
    label: 'Medical Science',
    icon: 'Microscope',
    query: 'Review therapeutic efficacy of GLP-1 agonists beyond glycemic control.',
    steps: [
      { agent: 'Planner', text: 'Mapped non-glycemic clinical trials: Cardiovascular, neurological, and kidney health outcomes.', status: 'done' },
      { agent: 'Retrieval', text: 'Retrieved 15 PubMed trial abstracts from local vector store.', status: 'done' },
      { agent: 'Research', text: 'Fetched latest FDA approval logs and NEJM publications from May 2026.', status: 'done' },
      { agent: 'Critic', text: 'Hallucination check: Confirmed all clinical outcome figures are directly mapped to specific trial citations.', status: 'done' },
      { agent: 'Summary', text: 'Compiled medical brief: "Cardiovascular and Renal Protective Profiles of GLP-1 Agonists".', status: 'done' }
    ]
  }
];

const DASHBOARD_MOCKS = {
  market: {
    query: 'Analyze EV solid-state battery commercialization timeline for 2026-2030.',
    reportTitle: 'EV Solid-State Batteries: 2026-2030 Commercial Outlook',
    reportContent: 'Toyota and Samsung SDI have locked in commercialization pathways for sulfide-based solid electrolyte batteries by late 2027. Pilot lines in Q1 2026 show cell-level energy densities exceeding 500 Wh/kg. Key bottlenecks remain in mass-scale manufacturing cost structures and cobalt raw material constraints.',
    sources: [
      { name: 'Toyota Battery Corp Annual Report (Q2 2026)', trust: '99%', type: 'Company Filing' },
      { name: 'Sulfide-based electrolyte interfaces - ArXiv v4', trust: '95%', type: 'Academic' },
      { name: 'Samsung SDI Roadmap (March 2026 Release)', trust: '98%', type: 'Press Release' },
      { name: 'Solid-State Battery Cost Modeling - IEEE Explorer', trust: '93%', type: 'Academic' }
    ],
    grounding: 96,
    citations: 12
  },
  academic: {
    query: 'Synthesize recent advancements in model pruning vs quantization for local LLM execution.',
    reportTitle: 'Pruning vs Quantization: Memory/Performance Trade-offs in Edge LLMs',
    reportContent: 'Recent benchmarks in llama.cpp indicate that 4-bit KV cache quantization combined with activation-aware weight pruning yields a 45% latency reduction on Apple M-series chips while maintaining Wikitext perplexity scores within 0.12 delta. Quantization remains the superior approach for memory compression, while structured pruning accelerates inference execution directly.',
    sources: [
      { name: 'Activation Pruning in Large Autoregressive Models - NeurIPS', trust: '97%', type: 'Academic' },
      { name: 'llama.cpp Benchmarks (HuggingFace Logs)', trust: '94%', type: 'Benchmark' },
      { name: 'KV Cache Quantization Protocols v2 - ArXiv', trust: '96%', type: 'Academic' },
      { name: 'Structured Pruning on Apple Metal - GitHub Core', trust: '92%', type: 'Documentation' }
    ],
    grounding: 94,
    citations: 10
  },
  clinical: {
    query: 'Review therapeutic efficacy of GLP-1 agonists beyond glycemic control.',
    reportTitle: 'Cardiovascular and Renal Protective Profiles of GLP-1 Agonists',
    reportContent: 'Clinical trials from PubMed and NEJM show that GLP-1 receptor agonists reduce major adverse cardiovascular events (MACE) by 20% in non-diabetic obese cohorts. In addition, secondary kidney safety parameters demonstrate a 15% reduction in chronic kidney disease progression, indicating systemic metabolic protection mechanisms beyond glycemic control.',
    sources: [
      { name: 'Cardiovascular Outcomes Trial of GLP-1 - NEJM (May 2026)', trust: '100%', type: 'Clinical Trial' },
      { name: 'GLP-1 Receptor Agonists & Kidney Protection - PubMed', trust: '99%', type: 'Clinical Review' },
      { name: 'FDA Approval Logs for Semaglutide MACE Protection', trust: '98%', type: 'Regulatory' },
      { name: 'Systemic Metabolic Pathway Analysis - Nature Medicine', trust: '96%', type: 'Academic' }
    ],
    grounding: 98,
    citations: 15
  }
};

const FEATURE_TABS = [
  {
    id: 0,
    num: '01',
    label: 'Agent Planning',
    desc: 'Deconstruct complex search tasks',
    icon: 'ListChecks'
  },
  {
    id: 1,
    num: '02',
    label: 'Live Web Scraping',
    desc: 'Scrape real-time company reports',
    icon: 'Globe'
  },
  {
    id: 2,
    num: '03',
    label: 'Vector Lookup',
    desc: 'Semantic matching on Qdrant database',
    icon: 'Database'
  },
  {
    id: 3,
    num: '04',
    label: 'Citations Audit',
    desc: 'Validate grounding with RAGAS metrics',
    icon: 'ShieldCheck'
  },
  {
    id: 4,
    num: '05',
    label: 'Synthesis Output',
    desc: 'Generate PDF or Markdown reports',
    icon: 'FileText'
  }
];

const LandingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'radar' | 'throughput'>('radar');
  const [selectedDemo, setSelectedDemo] = useState(DEMO_QUERIES[0]);
  const [, setDemoStepIndex] = useState(0);
  const [demoRunning, setDemoRunning] = useState(true);

  // Payment/Checkout Modal States
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{name: string, price: string} | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Active Feature Showcase Tab State
  const [activeFeatureTab, setActiveFeatureTab] = useState(0);

  const handleUpgradeClick = (planName: string, planPrice: string) => {
    setSelectedPlan({ name: planName, price: planPrice });
    setIsPaymentModalOpen(true);
    setPaymentSuccess(false);
    setPaymentLoading(false);
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentLoading(true);
    setTimeout(() => {
      setPaymentLoading(false);
      setPaymentSuccess(true);
      setTimeout(() => {
        setIsPaymentModalOpen(false);
        setPaymentSuccess(false);
      }, 1500);
    }, 1500);
  };

  // Auto-advance the interactive demo steps
  useEffect(() => {
    if (!demoRunning) return;
    const interval = setInterval(() => {
      setDemoStepIndex((prev) => {
        if (prev >= selectedDemo.steps.length - 1) {
          return 0;
        }
        return prev + 1;
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [selectedDemo, demoRunning]);

  const handleDemoSelect = (demo: typeof DEMO_QUERIES[0]) => {
    setSelectedDemo(demo);
    setDemoStepIndex(0);
    setDemoRunning(true);
  };

  return (
    <div className="min-h-screen bg-white text-[#0a0a0a] font-sans antialiased selection:bg-emerald-50 selection:text-emerald-700">

      {/* Background Decorative Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/[0.03] rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="absolute top-[800px] right-1/4 w-[500px] h-[500px] bg-emerald-500/[0.02] rounded-full blur-[130px] pointer-events-none z-0" />
      <div className="absolute bottom-[400px] left-10 w-96 h-96 bg-emerald-500/[0.01] rounded-full blur-[120px] pointer-events-none z-0" />

      {/* Navigation Header */}
      <header className="border-b border-neutral-100 sticky top-0 bg-white/80 backdrop-blur-md z-50">
        <div className="max-w-[1100px] mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 text-white p-1.5 rounded-[6px] shadow-[0_4px_12px_rgba(16,185,129,0.15)]">
              <Lucide.Brain className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight text-[#0a0a0a]">
              ResearchMind
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-neutral-500 hover:text-emerald-600 transition-colors">Features</a>
            <a href="#analytics" className="text-sm font-medium text-neutral-500 hover:text-emerald-600 transition-colors">Diagnostics</a>
            <a href="#solutions" className="text-sm font-medium text-neutral-500 hover:text-emerald-600 transition-colors">Solutions</a>
            <a href="#pricing" className="text-sm font-medium text-neutral-500 hover:text-emerald-600 transition-colors">Pricing</a>
            <a href="#workflow" className="text-sm font-medium text-neutral-500 hover:text-emerald-600 transition-colors">Pipeline</a>
          </nav>

          <div className="flex items-center gap-2.5">
            {isAuthenticated ? (
              <button
                onClick={() => navigate(ROUTES.DASHBOARD)}
                className="bg-[#0a0a0a] hover:bg-[#262626] text-white px-4 py-1.5 rounded-[6px] font-semibold transition-all text-[13px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] flex items-center gap-2"
              >
                Go to Dashboard
                <Lucide.ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate(ROUTES.LOGIN)}
                  className="bg-transparent border border-neutral-200 hover:border-neutral-300 text-neutral-600 hover:text-neutral-900 px-4 py-1.5 rounded-[6px] font-medium transition-all text-[13px]"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate(ROUTES.REGISTER)}
                  className="bg-[#0a0a0a] hover:bg-[#262626] text-white px-4 py-1.5 rounded-[6px] font-semibold transition-all text-[13px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 lg:py-24 border-b border-neutral-200 relative overflow-hidden z-10">
        {/* Subtle Background Geometric Grid Lines */}
        <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none z-0" />
        {/* Subtle Background Glow behind the main text & Orbiting SVG graphic */}
        <div className="absolute top-[5%] left-1/2 -translate-x-1/2 w-[800px] h-[450px] pointer-events-none -z-10 flex items-center justify-center overflow-visible">
          {/* Main glowing radial background spotlight */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.07)_0%,rgba(20,184,166,0.02)_40%,transparent_70%)] rounded-full blur-[40px]" />
          
          {/* Ambient secondary glow */}
          <div className="absolute w-[450px] h-[250px] bg-gradient-to-r from-emerald-400/10 to-teal-400/5 rounded-full blur-[90px] animate-pulse" style={{ animationDuration: '6s' }} />

          {/* Slow Spinning Constellation Lines */}
          <svg width="640" height="640" viewBox="0 0 600 600" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute opacity-40 animate-[spin_180s_linear_infinite] select-none">
            {/* Outer dotted orbit */}
            <circle cx="300" cy="300" r="280" stroke="#10b981" strokeWidth="1" strokeDasharray="3 15" className="opacity-15" />
            {/* Middle dotted orbit */}
            <circle cx="300" cy="300" r="200" stroke="#0f766e" strokeWidth="1" strokeDasharray="2 10" className="opacity-25" />
            {/* Inner dotted orbit */}
            <circle cx="300" cy="300" r="130" stroke="#10b981" strokeWidth="0.75" strokeDasharray="1 6" className="opacity-35" />
            
            {/* Node markers orbiting along the tracks */}
            <circle cx="120" cy="300" r="3.5" fill="#10b981" className="opacity-60" />
            <circle cx="480" cy="300" r="4.5" fill="#0f766e" className="opacity-70" />
            <circle cx="300" cy="170" r="3" fill="#14b8a6" className="opacity-50" />
            <circle cx="300" cy="430" r="3.5" fill="#059669" className="opacity-60" />
            <circle cx="210" cy="210" r="2.5" fill="#34d399" className="opacity-40" />
            <circle cx="390" cy="390" r="3" fill="#2dd4bf" className="opacity-45" />
          </svg>
        </div>

        <div className="max-w-[1100px] mx-auto px-4 lg:px-8 relative z-10 text-center">
          
          {/* Tagline Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex justify-center"
          >
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3.5 py-1.2 rounded-full text-[11px] font-mono border border-emerald-100/70 mb-6 font-semibold shadow-xs select-none">
              <Lucide.Sparkles className="h-3.5 w-3.5 text-emerald-650 animate-pulse" />
              <span>Deep Research Agentic Workspace</span>
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-[44px] md:text-[56px] font-black tracking-tight leading-[1.08] text-[#0a0a0a] mb-6 max-w-4xl mx-auto"
          >
            Supercharge research with{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-500 drop-shadow-xs">
              collaborative AI agents
            </span>.
          </motion.h1>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="text-[15px] md:text-[16px] leading-[1.65] text-neutral-500 mb-8 max-w-2xl mx-auto"
          >
            A proprietary deep research workspace combining internal document knowledge (RAG) with real-time web search. Ingest documents and URLs to compile reports with zero hallucinations.
          </motion.p>

          {/* Call to Actions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="flex flex-col sm:flex-row gap-3 justify-center items-center w-full mb-10"
          >
            <button
              onClick={() => navigate(ROUTES.REGISTER)}
              className="bg-emerald-500 text-white hover:bg-emerald-600 px-6 py-3 rounded-[6px] font-bold transition-all text-sm flex items-center justify-center gap-2 group shadow-[0_4px_14px_rgba(16,185,129,0.25)] hover:shadow-[0_6px_18px_rgba(16,185,129,0.35)]"
            >
              Start Your First Report
              <Lucide.ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => navigate(ROUTES.LOGIN)}
              className="bg-white border border-neutral-200 hover:border-neutral-300 text-neutral-700 px-6 py-3 rounded-[6px] font-semibold transition-all text-sm flex items-center justify-center"
            >
              View Documentation
            </button>
          </motion.div>

          {/* Stats Bar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="grid grid-cols-3 gap-4 max-w-[550px] mx-auto mb-16 border-y border-neutral-200 py-4"
          >
            <div>
              <p className="text-xl font-extrabold text-[#0a0a0a]">98.7%</p>
              <p className="text-[9px] font-mono uppercase text-neutral-400 tracking-wider">Grounding Accuracy</p>
            </div>
            <div className="border-x border-neutral-200">
              <p className="text-xl font-extrabold text-[#0a0a0a]">4.8x</p>
              <p className="text-[9px] font-mono uppercase text-neutral-400 tracking-wider">Time Saved</p>
            </div>
            <div>
              <p className="text-xl font-extrabold text-[#0a0a0a]">100%</p>
              <p className="text-[9px] font-mono uppercase text-neutral-400 tracking-wider">Local Option</p>
            </div>
          </motion.div>

          {/* Catchy & Flashy Interactive Startup Browser Mockup with 3D Overlapping Layers */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="w-full max-w-[1050px] mx-auto relative z-10 px-2 sm:px-8 md:px-14 pb-12 pt-6"
          >
            {/* Visual glow backdrop for the browser */}
            <div className="absolute inset-0 -m-4 bg-gradient-to-r from-emerald-500 to-teal-400 opacity-[0.06] rounded-[20px] blur-[45px] -z-10 pointer-events-none" />

            {/* Floating Layer 1 (Left Overlapping): Agent Swarm Activity */}
            <motion.div
              initial={{ opacity: 0, x: -30, y: 20 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="absolute left-[8px] lg:left-[-16px] xl:left-[-32px] top-[140px] z-30 w-[230px] bg-white/95 backdrop-blur-xs border border-neutral-200/80 rounded-[12px] p-3.5 shadow-[0_12px_30px_rgba(0,0,0,0.06)] hidden lg:block text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_15px_35px_rgba(0,0,0,0.1)] group"
            >
              <div className="flex items-center justify-between border-b border-neutral-100 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <h4 className="text-[10px] font-mono font-bold text-[#0a0a0a] uppercase tracking-wider">Agent Swarm</h4>
                </div>
                <span className="text-[8px] font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">MONITOR</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Lucide.CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-neutral-800 leading-none">PlannerAgent</p>
                    <p className="text-[8px] text-neutral-455 mt-1 leading-tight">Prompt split into 4 parallel queries</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Lucide.CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-neutral-800 leading-none">WebSearchAgent</p>
                    <p className="text-[8px] text-neutral-455 mt-1 leading-tight">Crawled 12 financial filings & data tables</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Lucide.Loader className="h-4 w-4 text-emerald-500 animate-spin mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-neutral-850 leading-none animate-pulse">CriticAgent auditing...</p>
                    <p className="text-[8px] text-neutral-455 mt-1 leading-tight">Evaluating citation grounding metrics</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Floating Layer 2 (Right Overlapping): Citations Audit & RAGAS Shield */}
            <motion.div
              initial={{ opacity: 0, x: 30, y: -20 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="absolute right-[8px] lg:right-[-16px] xl:right-[-32px] bottom-[70px] z-30 w-[230px] bg-white/95 backdrop-blur-xs border border-neutral-200/80 rounded-[12px] p-3.5 shadow-[0_12px_30px_rgba(0,0,0,0.06)] hidden lg:block text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_15px_35px_rgba(0,0,0,0.1)]"
            >
              <div className="flex items-center justify-between border-b border-neutral-100 pb-2 mb-3">
                <div className="flex items-center gap-1.5">
                  <Lucide.ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <h4 className="text-[10px] font-mono font-bold text-[#0a0a0a] uppercase tracking-wider">Audit Shield</h4>
                </div>
                <span className="text-[9px] font-mono text-emerald-650 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">98% PASS</span>
              </div>
              <div className="space-y-2 text-[9px] text-neutral-600 font-mono">
                <div className="flex items-center gap-2">
                  <Lucide.Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Zero Hallucination Lock</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lucide.Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span>100% sentence-level audit</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lucide.Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Source trust validation</span>
                </div>
                <div className="mt-2.5 bg-neutral-50 p-2 rounded border border-neutral-150 text-[8px] text-neutral-450 leading-relaxed">
                  <strong>Verification details:</strong><br />
                  No grounding failures detected. Citations verified against 12 sources.
                </div>
              </div>
            </motion.div>

            {/* Main Browser Mockup Card */}
            <div className="border border-neutral-200 rounded-[14px] bg-white overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.06)] text-left flex flex-col h-[520px] scale-[0.99] hover:scale-[1.00] transition-transform duration-500">
              
              {/* Browser Header Bar */}
              <div className="bg-neutral-50 border-b border-neutral-200 px-4 py-3 flex items-center justify-between">
                {/* Window Controls */}
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-400/80" />
                  <span className="w-3 h-3 rounded-full bg-amber-400/80" />
                  <span className="w-3 h-3 rounded-full bg-emerald-450/80" />
                  <span className="text-[11px] font-mono text-neutral-450 ml-4 bg-white border border-neutral-200 px-3 py-0.5 rounded-[4px] shadow-xs">
                    researchmind.ai/workspace/project-delta
                  </span>
                </div>

                {/* State switch tabs for the User */}
                <div className="flex items-center gap-1.5 bg-neutral-200/50 p-0.5 rounded-[6px]">
                  {DEMO_QUERIES.map((demo) => {
                    const isSelected = demo.id === selectedDemo.id;
                    const Icon = (Lucide as any)[demo.icon] || Lucide.HelpCircle;
                    return (
                      <button
                        key={demo.id}
                        onClick={() => handleDemoSelect(demo)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-[4px] text-[11px] font-semibold transition-all ${
                          isSelected
                            ? 'bg-white text-emerald-700 shadow-xs'
                            : 'text-neutral-500 hover:text-neutral-800'
                        }`}
                      >
                        <Icon className="h-3 w-3" />
                        <span>{demo.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Workspace Layout */}
              <div className="flex flex-1 min-h-0">
                {/* Sidebar (Mock) */}
                <div className="w-44 bg-[#f9fafb] border-r border-neutral-200 p-4 hidden md:flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 rounded-[6px] text-[11px] font-bold shadow-xs">
                      <Lucide.Layout className="h-3.5 w-3.5" />
                      <span>Workspace</span>
                    </div>
                    <div className="flex items-center gap-2 px-2.5 py-1.5 text-neutral-500 hover:text-neutral-800 rounded-[6px] text-[11px] font-semibold cursor-pointer transition-colors">
                      <Lucide.BookOpen className="h-3.5 w-3.5" />
                      <span>Research Library</span>
                    </div>
                    <div className="flex items-center gap-2 px-2.5 py-1.5 text-neutral-500 hover:text-neutral-800 rounded-[6px] text-[11px] font-semibold cursor-pointer transition-colors">
                      <Lucide.Cpu className="h-3.5 w-3.5" />
                      <span>LLM Router</span>
                    </div>
                    <div className="flex items-center gap-2 px-2.5 py-1.5 text-neutral-500 hover:text-neutral-800 rounded-[6px] text-[11px] font-semibold cursor-pointer transition-colors">
                      <Lucide.Key className="h-3.5 w-3.5" />
                      <span>API Connectors</span>
                    </div>
                  </div>

                  <div className="border-t border-neutral-200 pt-3 flex items-center gap-2 px-1">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-[9px] font-bold text-emerald-700">
                      U
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-neutral-700 truncate">Researcher Profile</p>
                      <p className="text-[8px] text-neutral-400 truncate">Academic Plan</p>
                    </div>
                  </div>
                </div>

                {/* Workspace Main Area */}
                <div className="flex-1 flex flex-col min-h-0 bg-white">
                  {/* Informational banner to clarify interactive workspace features */}
                  <div className="bg-emerald-550/5 border-b border-emerald-100/60 px-4 py-2 flex items-center gap-2 text-[10px] text-neutral-650 font-medium">
                    <Lucide.Info className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 animate-pulse" />
                    <span><strong>Interactive Demo:</strong> Click the query tabs in the browser header (e.g., <em>Literature Review</em>) to simulate live agent runs.</span>
                  </div>

                  {/* Workspace Content Panels Grid */}
                  <div className="flex-1 grid grid-cols-12 min-h-0">
                    
                    {/* Left Column: Crawled Sources (col-span-5) */}
                    <div className="col-span-12 lg:col-span-5 border-b lg:border-b-0 lg:border-r border-neutral-150 p-4 bg-neutral-50/20 flex flex-col min-h-0">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 font-mono">Crawled Sources</span>
                        <span className="text-[9px] font-mono text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded font-bold">
                          {(DASHBOARD_MOCKS[selectedDemo.id as keyof typeof DASHBOARD_MOCKS] || DASHBOARD_MOCKS.market).citations} Sources
                        </span>
                      </div>
                      
                      <div className="space-y-2 overflow-y-auto flex-1 pr-1.5 scrollbar-thin">
                        <AnimatePresence mode="popLayout">
                          {(DASHBOARD_MOCKS[selectedDemo.id as keyof typeof DASHBOARD_MOCKS] || DASHBOARD_MOCKS.market).sources.map((source, idx) => (
                            <motion.div
                              key={source.name}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.2, delay: idx * 0.05 }}
                              className="p-2.5 rounded-[8px] border border-neutral-200/60 bg-white hover:border-emerald-500/20 hover:shadow-xs transition-all flex items-start gap-2.5"
                            >
                              <div className="bg-emerald-50 text-emerald-600 p-1.5 rounded-[6px] mt-0.5">
                                <Lucide.FileText className="h-3.5 w-3.5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-bold text-neutral-800 leading-tight truncate">{source.name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[9px] font-mono text-neutral-400">{source.type}</span>
                                  <span className="text-neutral-300">•</span>
                                  <span className="text-[9px] font-mono text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.2 rounded">
                                    {source.trust} Trust
                                  </span>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Right Column: Interactive Document Synthesis (col-span-7) */}
                    <div className="col-span-12 lg:col-span-7 p-5 flex flex-col justify-between min-h-0 bg-white">
                      
                      {/* Document Content View */}
                      <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={selectedDemo.id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.25 }}
                            className="space-y-3.5 text-left"
                          >
                            <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                              Synthesized Report Preview
                            </span>
                            <h2 className="text-lg font-extrabold text-[#0a0a0a] leading-tight">
                              {(DASHBOARD_MOCKS[selectedDemo.id as keyof typeof DASHBOARD_MOCKS] || DASHBOARD_MOCKS.market).reportTitle}
                            </h2>
                            <p className="text-[12px] leading-relaxed text-neutral-600 font-sans border-l-2 border-emerald-500 pl-3">
                              {(DASHBOARD_MOCKS[selectedDemo.id as keyof typeof DASHBOARD_MOCKS] || DASHBOARD_MOCKS.market).reportContent}
                            </p>
                            <div className="text-[10px] font-mono text-neutral-450 mt-2 bg-neutral-50 p-2.5 rounded border border-neutral-100 flex justify-between items-center">
                              <span>GROUNDING METRIC (RAGAS):</span>
                              <span className="text-emerald-600 font-bold flex items-center gap-1">
                                <Lucide.CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                {(DASHBOARD_MOCKS[selectedDemo.id as keyof typeof DASHBOARD_MOCKS] || DASHBOARD_MOCKS.market).grounding}% Grounding Rating
                              </span>
                            </div>
                          </motion.div>
                        </AnimatePresence>
                      </div>

                      {/* Mock UI bottom controls */}
                      <div className="border-t border-neutral-150 pt-4 mt-4 flex items-center justify-between text-[11px] text-neutral-500">
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-450 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <span className="font-mono text-neutral-400">Agentic loop status: Idle (Awaiting input)</span>
                        </div>
                        <div className="flex gap-2.5">
                          <button className="bg-[#0a0a0a] text-white hover:bg-neutral-800 text-[10px] font-bold px-3 py-1.5 rounded-[4px] transition-colors flex items-center gap-1 shadow-xs">
                            <Lucide.Download className="h-3 w-3" />
                            PDF Draft
                          </button>
                        </div>
                      </div>

                    </div>

                  </div>
                </div>

              </div>

            </div>
          </motion.div>

        </div>
      </section>


      {/* Feature Section with Hover Glow Cards */}
      <section id="features" className="py-24 border-b border-neutral-200 relative bg-white">
        <div className="max-w-[1100px] mx-auto px-4 lg:px-8">
          <div className="text-center max-w-[600px] mx-auto mb-20">
            <span className="text-emerald-600 text-xs font-mono tracking-widest uppercase bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
              Engineered Capabilities
            </span>
            <h2 className="text-[36px] font-bold text-[#0a0a0a] tracking-tight mt-4">
              Advanced Multi-Agent Synthesis
            </h2>
            <p className="text-neutral-500 text-sm mt-3 leading-relaxed">
              Unlike classic single-prompt search models, ResearchMind relies on a structured, self-correcting layout of parallel agent loops.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Feature Card 1 */}
            <div className="bg-[#f9fafb] border border-neutral-200 hover:border-emerald-500/30 p-6 rounded-[12px] transition-all duration-300 hover:-translate-y-1 hover:shadow-md group relative overflow-hidden">
              <div className="bg-emerald-50 text-emerald-600 p-3 rounded-[8px] w-fit mb-5 group-hover:scale-110 transition-transform">
                <Lucide.Cpu className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-[#0a0a0a] mb-2">Hybrid RAG Pipeline</h3>
              <p className="text-neutral-500 text-xs leading-relaxed">
                Merges vector semantic queries in Qdrant with BM25 searches and cross-encoder rerankers for precise context extraction.
              </p>
            </div>

            {/* Feature Card 2 */}
            <div className="bg-[#f9fafb] border border-neutral-200 hover:border-emerald-500/30 p-6 rounded-[12px] transition-all duration-300 hover:-translate-y-1 hover:shadow-md group relative overflow-hidden">
              <div className="bg-emerald-50 text-emerald-650 p-3 rounded-[8px] w-fit mb-5 group-hover:scale-110 transition-transform">
                <Lucide.ShieldAlert className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-[#0a0a0a] mb-2">5-Agent Collaboration</h3>
              <p className="text-neutral-500 text-xs leading-relaxed">
                Deconstructs queries through Retrieval, Research, Critic, Summary, and Memory agents scoring quality via RAGAS thresholds.
              </p>
            </div>

            {/* Feature Card 3 */}
            <div className="bg-[#f9fafb] border border-neutral-200 hover:border-emerald-500/30 p-6 rounded-[12px] transition-all duration-300 hover:-translate-y-1 hover:shadow-md group relative overflow-hidden">
              <div className="bg-emerald-50 text-emerald-600 p-3 rounded-[8px] w-fit mb-5 group-hover:scale-110 transition-transform">
                <Lucide.Blocks className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-[#0a0a0a] mb-2">Secured LLM Gateway</h3>
              <p className="text-neutral-500 text-xs leading-relaxed">
                Employs LiteLLM gateway routing with a 10-model fallback chain, semantic query caching, and Guardrails PII filters.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Analytics & Performance Metrics (Recharts Section) */}
      <section id="analytics" className="py-24 border-b border-neutral-200 relative bg-[#f9fafb]/50">
        <div className="max-w-[1100px] mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

            {/* Left side: descriptions & toggles */}
            <div className="lg:col-span-5 text-left">
              <span className="text-emerald-600 text-xs font-mono tracking-widest uppercase bg-emerald-550/5 border border-emerald-200 px-3 py-1 rounded-full">
                System Diagnostics
              </span>
              <h2 className="text-[36px] font-bold text-[#0a0a0a] tracking-tight mt-4 mb-6 leading-tight">
                Benchmark Accuracy & Performance
              </h2>
              <p className="text-neutral-500 text-sm leading-relaxed mb-8">
                Compare multi-agent synthesis vs standard vector search databases. See how model parameters adjust precision scores.
              </p>

              {/* Toggles */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setActiveTab('radar')}
                  className={`flex items-start gap-4 p-4 rounded-[8px] text-left transition-all ${activeTab === 'radar'
                      ? 'bg-white border border-neutral-200 text-[#0a0a0a] shadow-sm'
                      : 'border border-transparent text-neutral-400 hover:text-neutral-600'
                    }`}
                >
                  <Lucide.Sparkles className={`h-5 w-5 mt-0.5 ${activeTab === 'radar' ? 'text-emerald-500' : ''}`} />
                  <div>
                    <h4 className="font-semibold text-sm">Capability Radar Chart</h4>
                    <p className="text-[11px] text-neutral-400 mt-1">Multi-dimensional view of citation, speed, faithfulness, and depth.</p>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('throughput')}
                  className={`flex items-start gap-4 p-4 rounded-[8px] text-left transition-all ${activeTab === 'throughput'
                      ? 'bg-white border border-neutral-200 text-[#0a0a0a] shadow-sm'
                      : 'border border-transparent text-neutral-400 hover:text-neutral-600'
                    }`}
                >
                  <Lucide.TrendingUp className={`h-5 w-5 mt-0.5 ${activeTab === 'throughput' ? 'text-emerald-500' : ''}`} />
                  <div>
                    <h4 className="font-semibold text-sm">Optimization Trend Line</h4>
                    <p className="text-[11px] text-neutral-400 mt-1">Agent training accuracy improvement rates and search throughput logs.</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Right side: Active Chart representation */}
            <div className="lg:col-span-7 h-[360px] w-full bg-white border border-neutral-200 rounded-[12px] p-6 flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.02)] relative overflow-hidden">

              <div className="flex items-center justify-between mb-4 border-b border-neutral-100 pb-3">
                <span className="text-xs font-mono font-bold text-neutral-500 uppercase tracking-wider">
                  {activeTab === 'radar' ? 'Radar Comparison: Agentic RAG vs Baseline' : 'Chronological Training Accuracy Curve'}
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>

              <div className="w-full flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  {activeTab === 'radar' ? (
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                      <PolarGrid stroke="#f1f5f9" />
                      <PolarAngleAxis dataKey="metric" stroke="#64748b" fontSize={10} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#f1f5f9" fontSize={9} />
                      <Radar
                        name="ResearchMind"
                        dataKey="ResearchMind"
                        stroke="#10b981"
                        fill="#10b981"
                        fillOpacity={0.2}
                      />
                      <Radar
                        name="Standard RAG"
                        dataKey="StandardRAG"
                        stroke="#94a3b8"
                        fill="#94a3b8"
                        fillOpacity={0.06}
                      />
                    </RadarChart>
                  ) : (
                    <AreaChart data={throughputData}>
                      <defs>
                        <linearGradient id="accuracyGlowLight" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="efficiencyGlowLight" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.05} />
                          <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                      <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={11} domain={[50, 100]} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: '8px', color: '#000' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="Accuracy"
                        stroke="#10b981"
                        fillOpacity={1}
                        fill="url(#accuracyGlowLight)"
                      />
                      <Area
                        type="monotone"
                        dataKey="Efficiency"
                        stroke="#94a3b8"
                        fillOpacity={1}
                        fill="url(#efficiencyGlowLight)"
                      />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>

              {/* Legends */}
              <div className="flex gap-4 justify-center text-xs font-mono mt-3 pt-3 border-t border-neutral-100">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-neutral-500">ResearchMind Agents</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-neutral-300" />
                  <span className="text-neutral-400">Standard Baseline</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Target Audiences & Custom Solutions */}
      <section id="solutions" className="py-24 border-b border-neutral-200 relative bg-white">
        <div className="max-w-[1100px] mx-auto px-4 lg:px-8">
          <div className="text-center max-w-[650px] mx-auto mb-20">
            <span className="text-emerald-600 text-xs font-mono tracking-widest uppercase bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
              Industry Verticals
            </span>
            <h2 className="text-[36px] font-bold text-[#0a0a0a] tracking-tight mt-4">
              Tailored Research Intelligence
            </h2>
            <p className="text-neutral-500 text-sm mt-3 leading-relaxed">
              ResearchMind adapts to your specific document structures and querying needs, providing instant synthesized reports.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

            {/* Solution Card 1 */}
            <div className="bg-white border border-neutral-200 hover:border-emerald-500/30 p-6 rounded-[12px] transition-all duration-300 hover:shadow-[0_12px_30px_rgba(0,0,0,0.03)] group flex flex-col justify-between">
              <div>
                <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-[8px] w-fit mb-5 group-hover:scale-105 transition-transform">
                  <Lucide.GraduationCap className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-[#0a0a0a] mb-2">Academic Research</h3>
                <p className="text-neutral-500 text-xs leading-relaxed">
                  Synthesize scientific literature, aggregate arXiv & PubMed preprints, and verify citation references with zero hallucination risk.
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold text-neutral-400 mt-6 block uppercase tracking-wider">Literature reviews</span>
            </div>

            {/* Solution Card 2 */}
            <div className="bg-white border border-neutral-200 hover:border-emerald-500/30 p-6 rounded-[12px] transition-all duration-300 hover:shadow-[0_12px_30px_rgba(0,0,0,0.03)] group flex flex-col justify-between">
              <div>
                <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-[8px] w-fit mb-5 group-hover:scale-105 transition-transform">
                  <Lucide.TrendingUp className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-[#0a0a0a] mb-2">Market Intelligence</h3>
                <p className="text-neutral-500 text-xs leading-relaxed">
                  Crawl live financial blogs, competitor releases, and Qdrant-stored reports. Get dynamic charts and summaries in seconds.
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold text-neutral-400 mt-6 block uppercase tracking-wider">Competitor Tracking</span>
            </div>

            {/* Solution Card 3 */}
            <div className="bg-white border border-neutral-200 hover:border-emerald-500/30 p-6 rounded-[12px] transition-all duration-300 hover:shadow-[0_12px_30px_rgba(0,0,0,0.03)] group flex flex-col justify-between">
              <div>
                <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-[8px] w-fit mb-5 group-hover:scale-105 transition-transform">
                  <Lucide.Terminal className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-[#0a0a0a] mb-2">Developers & APIs</h3>
                <p className="text-neutral-500 text-xs leading-relaxed">
                  Connect local LLMs via Ollama, customize critic validation scripts in Python, and configure semantic database routers.
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold text-neutral-400 mt-6 block uppercase tracking-wider">Local & Cloud LLMs</span>
            </div>

            {/* Solution Card 4 */}
            <div className="bg-white border border-neutral-200 hover:border-emerald-500/30 p-6 rounded-[12px] transition-all duration-300 hover:shadow-[0_12px_30px_rgba(0,0,0,0.03)] group flex flex-col justify-between">
              <div>
                <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-[8px] w-fit mb-5 group-hover:scale-105 transition-transform">
                  <Lucide.FolderLock className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-[#0a0a0a] mb-2">Internal Knowledge</h3>
                <p className="text-neutral-500 text-xs leading-relaxed">
                  Securely parse internal PDFs, text corpora, and Notion workspaces. Ensure strict grounding on company intellectual property.
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold text-neutral-450 mt-6 block uppercase tracking-wider">Enterprise Security</span>
            </div>

          </div>
        </div>
      </section>

      {/* RAG pipeline - Vertical timeline scroll reveal */}
      <section id="workflow" className="py-24 border-b border-neutral-200 relative bg-[#f9fafb]/30">
        <div className="max-w-[1100px] mx-auto px-4 lg:px-8">
          <div className="text-center max-w-[600px] mx-auto mb-20">
            <span className="text-emerald-600 text-xs font-mono tracking-widest uppercase bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
              Full System Pipeline
            </span>
            <h2 className="text-[36px] font-bold text-[#0a0a0a] tracking-tight mt-4">
              Agent Execution Steps
            </h2>
            <p className="text-neutral-500 text-sm mt-3 leading-relaxed">
              See the exact processing sequence of our Agentic RAG engine as it executes behind the scenes.
            </p>
          </div>

          {/* Timeline */}
          <div className="relative max-w-[800px] mx-auto border-l-2 border-neutral-200 pl-8 space-y-12">

            {/* Step 1 */}
            <div className="relative">
              <div className="absolute -left-[41px] top-1.5 bg-white border-2 border-emerald-500 rounded-full w-5 h-5 flex items-center justify-center shadow-[0_2px_8px_rgba(16,185,129,0.2)]" />
              <div className="text-left">
                <span className="text-[10px] font-mono font-bold text-emerald-600 uppercase tracking-widest">Phase 01</span>
                <h4 className="text-lg font-semibold text-[#0a0a0a] mt-1">Multi-Agent Deconstruct</h4>
                <p className="text-neutral-500 text-xs leading-relaxed mt-2 max-w-[600px]">
                  The Planner agent interprets the core request, determines what databases need querying, sets constraints, and breaks down the search goals.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="absolute -left-[41px] top-1.5 bg-white border-2 border-neutral-300 rounded-full w-5 h-5 flex items-center justify-center" />
              <div className="text-left">
                <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-widest">Phase 02</span>
                <h4 className="text-lg font-semibold text-[#0a0a0a] mt-1">Hybrid Retrieval & Scraping</h4>
                <p className="text-neutral-500 text-xs leading-relaxed mt-2 max-w-[600px]">
                  Retrieval agents pull semantically matched text blocks from vector stores while WebSearch agents crawl Google/Tavily for live information.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="absolute -left-[41px] top-1.5 bg-white border-2 border-neutral-300 rounded-full w-5 h-5 flex items-center justify-center" />
              <div className="text-left">
                <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-widest">Phase 03</span>
                <h4 className="text-lg font-semibold text-[#0a0a0a] mt-1">Critic Validation Audit</h4>
                <p className="text-neutral-500 text-xs leading-relaxed mt-2 max-w-[600px]">
                  The Critic agent acts as a safety layer. It verifies all extracted claims against direct reference material and forces research retries when grounding fails.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="relative">
              <div className="absolute -left-[41px] top-1.5 bg-white border-2 border-neutral-300 rounded-full w-5 h-5 flex items-center justify-center" />
              <div className="text-left">
                <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-widest">Phase 04</span>
                <h4 className="text-lg font-semibold text-[#0a0a0a] mt-1">Structured Synthesis</h4>
                <p className="text-neutral-500 text-xs leading-relaxed mt-2 max-w-[600px]">
                  The Summarization agent compiles files, orders citations chronologically, groups bibliography links, and formats a markdown-based PDF draft.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 border-b border-neutral-200 bg-[#f9fafb]/50 relative z-10">
        <div className="max-w-[1100px] mx-auto px-4 lg:px-8">
          <div className="text-center max-w-[600px] mx-auto mb-16">
            <span className="text-emerald-600 text-xs font-mono tracking-widest uppercase bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
              Subscription Plans
            </span>
            <h2 className="text-[36px] font-bold text-[#0a0a0a] tracking-tight mt-4">
              Flexible pricing for any scale
            </h2>
            <p className="text-neutral-500 text-sm mt-3 leading-relaxed">
              Unlock autonomous multi-agent synthesis and professional citations auditing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-[950px] mx-auto">
            {/* Card 1 */}
            <div className="bg-white border border-neutral-200 rounded-[12px] p-6 flex flex-col justify-between hover:shadow-md transition-all">
              <div>
                <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-widest block mb-1">Starter</span>
                <h3 className="text-lg font-bold text-[#0a0a0a] mb-2">Individual</h3>
                <p className="text-xs text-neutral-400 mb-6">For students, researchers, and casual experimenters.</p>
                <div className="flex items-baseline gap-1 mb-6 border-b border-neutral-100 pb-6">
                  <span className="text-3xl font-extrabold text-[#0a0a0a]">$0</span>
                  <span className="text-xs text-neutral-400">/ month</span>
                </div>
                <ul className="space-y-3 mb-8 text-xs text-neutral-500">
                  <li className="flex items-center gap-2">
                    <Lucide.Check className="h-4 w-4 text-emerald-500" />
                    3 synthesized reports / month
                  </li>
                  <li className="flex items-center gap-2">
                    <Lucide.Check className="h-4 w-4 text-emerald-500" />
                    Standard web scraping sources
                  </li>
                  <li className="flex items-center gap-2">
                    <Lucide.Check className="h-4 w-4 text-emerald-500" />
                    1 active project library
                  </li>
                </ul>
              </div>
              <button 
                onClick={() => handleUpgradeClick('Starter', '$0')}
                className="w-full bg-white hover:bg-neutral-50 text-[#0a0a0a] border border-neutral-200 font-bold py-2 rounded-[6px] text-xs transition-colors text-center"
              >
                Sign Up Free
              </button>
            </div>

            {/* Card 2 */}
            <div className="bg-white border-2 border-emerald-500 rounded-[12px] p-6 flex flex-col justify-between hover:shadow-lg transition-all relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white font-mono text-[9px] font-bold uppercase px-3 py-0.5 rounded-full tracking-widest">
                Most Popular
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-emerald-600 uppercase tracking-widest block mb-1 mt-1">Professional</span>
                <h3 className="text-lg font-bold text-[#0a0a0a] mb-2">Researcher</h3>
                <p className="text-xs text-neutral-400 mb-6">For active scholars, industry analysts, and power users.</p>
                <div className="flex items-baseline gap-1 mb-6 border-b border-neutral-100 pb-6">
                  <span className="text-3xl font-extrabold text-[#0a0a0a]">$49</span>
                  <span className="text-xs text-neutral-400">/ month</span>
                </div>
                <ul className="space-y-3 mb-8 text-xs text-neutral-500">
                  <li className="flex items-center gap-2 font-medium text-neutral-700">
                    <Lucide.Check className="h-4 w-4 text-emerald-500" />
                    Unlimited report synthesis
                  </li>
                  <li className="flex items-center gap-2">
                    <Lucide.Check className="h-4 w-4 text-emerald-500" />
                    Deep Tavily web crawler
                  </li>
                  <li className="flex items-center gap-2">
                    <Lucide.Check className="h-4 w-4 text-emerald-500" />
                    Critic grounding audit loop
                  </li>
                  <li className="flex items-center gap-2">
                    <Lucide.Check className="h-4 w-4 text-emerald-500" />
                    5 active project libraries
                  </li>
                  <li className="flex items-center gap-2">
                    <Lucide.Check className="h-4 w-4 text-emerald-500" />
                    PDF & Markdown exports
                  </li>
                </ul>
              </div>
              <button 
                onClick={() => handleUpgradeClick('Professional', '$49')}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 rounded-[6px] text-xs transition-colors text-center shadow-xs"
              >
                Upgrade to Pro
              </button>
            </div>

            {/* Card 3 */}
            <div className="bg-white border border-neutral-200 rounded-[12px] p-6 flex flex-col justify-between hover:shadow-md transition-all">
              <div>
                <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-widest block mb-1">Enterprise</span>
                <h3 className="text-lg font-bold text-[#0a0a0a] mb-2">Research Labs</h3>
                <p className="text-xs text-neutral-400 mb-6">For venture funds, firms, and research departments.</p>
                <div className="flex items-baseline gap-1 mb-6 border-b border-neutral-100 pb-6">
                  <span className="text-3xl font-extrabold text-[#0a0a0a]">$149</span>
                  <span className="text-xs text-neutral-400">/ month</span>
                </div>
                <ul className="space-y-3 mb-8 text-xs text-neutral-500">
                  <li className="flex items-center gap-2">
                    <Lucide.Check className="h-4 w-4 text-emerald-500" />
                    Everything in Professional
                  </li>
                  <li className="flex items-center gap-2">
                    <Lucide.Check className="h-4 w-4 text-emerald-500" />
                    Local Ollama LLM integration
                  </li>
                  <li className="flex items-center gap-2">
                    <Lucide.Check className="h-4 w-4 text-emerald-500" />
                    Dedicated Qdrant vector index
                  </li>
                  <li className="flex items-center gap-2">
                    <Lucide.Check className="h-4 w-4 text-emerald-500" />
                    Custom Python critic rules
                  </li>
                  <li className="flex items-center gap-2">
                    <Lucide.Check className="h-4 w-4 text-emerald-500" />
                    24/7 Dedicated Support
                  </li>
                </ul>
              </div>
              <button 
                onClick={() => handleUpgradeClick('Enterprise', '$149')}
                className="w-full bg-[#0a0a0a] hover:bg-[#262626] text-white font-bold py-2 rounded-[6px] text-xs transition-colors text-center"
              >
                Get Enterprise
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Feature Showcase Section */}
      <section id="features-showcase" className="py-24 border-b border-neutral-200 bg-white relative z-10">
        <div className="max-w-[1100px] mx-auto px-4 lg:px-8">
          
          {/* Header */}
          <div className="text-center max-w-[650px] mx-auto mb-20">
            <span className="text-emerald-600 text-xs font-mono tracking-widest uppercase bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
              Interactive Workspace
            </span>
            <h2 className="text-[36px] font-bold text-[#0a0a0a] tracking-tight mt-4 leading-tight">
              Built for production-grade research
            </h2>
            <p className="text-neutral-500 text-sm mt-3 leading-relaxed">
              Explore how specialized agents collaborate at each phase of the deep retrieval and synthesis pipeline.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 bg-emerald-550/5 text-neutral-650 px-3.5 py-1.5 rounded-full text-xs font-medium border border-emerald-100/60 shadow-xs">
              <Lucide.Info className="h-3.5 w-3.5 text-emerald-550 flex-shrink-0 animate-pulse" />
              <span><strong>Interactive Showcase:</strong> Click the numbered phases below to inspect agent code files, logs, and outputs.</span>
            </div>
          </div>          {/* Feature Showcase Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Interactive Vertical Tabs (col-span-4) */}
            <div className="lg:col-span-4 space-y-3">
              {FEATURE_TABS.map((tab) => {
                const isActive = tab.id === activeFeatureTab;
                const Icon = (Lucide as any)[tab.icon] || Lucide.HelpCircle;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveFeatureTab(tab.id)}
                    className={`w-full flex items-start gap-4 p-4 rounded-[12px] text-left transition-all border-l-4 select-none ${
                      isActive
                        ? 'bg-neutral-50 border-emerald-500 text-neutral-900 shadow-[0_8px_30px_rgba(16,185,129,0.06)]'
                        : 'bg-white border-transparent text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50/50 hover:translate-x-1'
                    }`}
                  >
                    {/* Number label */}
                    <span className={`text-[10px] font-mono font-bold mt-1 ${isActive ? 'text-emerald-600' : 'text-neutral-350'}`}>
                      {tab.num}
                    </span>

                    {/* Colored Icon container */}
                    <div className={`p-2.5 rounded-[10px] mt-0.5 transition-all ${
                      isActive ? 'bg-emerald-500 text-white shadow-[0_4px_12px_rgba(16,185,129,0.2)]' : 'bg-neutral-50 text-neutral-400'
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>

                    {/* Tab labels */}
                    <div className="min-w-0">
                      <h4 className={`font-bold text-[14px] leading-tight transition-colors ${isActive ? 'text-[#0a0a0a]' : 'text-neutral-500'}`}>
                        {tab.label}
                      </h4>
                      <p className="text-[11px] text-neutral-450 mt-1 leading-normal truncate">{tab.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right Column: Dynamic Workspace viewport mockup (col-span-8) */}
            <div className="lg:col-span-8">
              <div className="border border-neutral-200 rounded-[14px] bg-[#f9fafb] p-6 min-h-[400px] shadow-[0_12px_30px_rgba(0,0,0,0.03)] flex flex-col justify-between relative overflow-hidden text-left">
                
                {/* Decorative glow backdrop */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/[0.03] rounded-full blur-[80px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/[0.02] rounded-full blur-[80px] pointer-events-none" />

                {/* Mock Window Bar Address */}
                <div className="flex items-center justify-between border-b border-neutral-200 pb-3.5 mb-5 relative z-10">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-450/80" />
                    <span className="text-[10px] font-mono text-neutral-500 ml-2">workspace // deep_researcher_agent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-450 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[9px] font-mono text-emerald-600 uppercase tracking-wider font-semibold">Agent Online</span>
                  </div>
                </div>

                {/* Viewport Content with transition */}
                <div className="flex-1 flex flex-col justify-center min-h-0 relative z-10">
                  <AnimatePresence mode="wait">
                    {activeFeatureTab === 0 && (
                      <motion.div
                        key="tab-0"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded uppercase">Planning Phase</span>
                          <span className="text-[10px] font-mono text-neutral-550">task_deconstruction.json</span>
                        </div>
                        <h3 className="text-base font-bold text-neutral-900">Swarm Task Decomposition</h3>
                        <p className="text-xs text-neutral-600 leading-relaxed max-w-[550px]">
                          The Planner Agent translates the user prompt into structured research paths, scheduling concurrent scraper queries and lookup threads.
                        </p>
                        
                        {/* High-tech json/code block */}
                        <div className="bg-white border border-neutral-200 rounded-[8px] p-4 font-mono text-[11px] text-neutral-700 space-y-2.5 max-w-[520px] shadow-xs">
                          <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="font-bold">PLANNER_EXECUTION:</span>
                            <span className="text-neutral-550 font-normal">"EV solid-state battery commercialization"</span>
                          </div>
                          <div className="pl-4 space-y-2 border-l border-neutral-200 ml-0.7">
                            <div className="flex items-center gap-2 text-neutral-600">
                              <Lucide.Check className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                              <span>Thread A: <span className="text-teal-700 font-semibold">Company filings search</span> (Toyota & Samsung SDI)</span>
                            </div>
                            <div className="flex items-center gap-2 text-neutral-600">
                              <Lucide.Check className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                              <span>Thread B: <span className="text-teal-700 font-semibold">Solid electrolyte patents</span> (Qdrant lookup)</span>
                            </div>
                            <div className="flex items-center gap-2 text-neutral-600">
                              <Lucide.Check className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                              <span>Thread C: <span className="text-teal-700 font-semibold">Supply chain analysis</span> (Raw cobalt resources)</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activeFeatureTab === 1 && (
                      <motion.div
                        key="tab-1"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded uppercase">Scraping Phase</span>
                          <span className="text-[10px] font-mono text-neutral-550">tavily_connector.go</span>
                        </div>
                        <h3 className="text-base font-bold text-neutral-900">Real-Time Search Crawler</h3>
                        <p className="text-xs text-neutral-600 leading-relaxed max-w-[550px]">
                          Scrapes live releases, clinical logs, and market journals, compiling real-time news to ensure the knowledge base is current up to the second.
                        </p>
                        
                        {/* Interactive list of crawlers */}
                        <div className="bg-white border border-neutral-200 rounded-[8px] p-3 font-mono text-[10px] text-neutral-700 space-y-2 max-w-[520px] shadow-xs">
                          <div className="flex justify-between items-center bg-[#f9fafb] p-2 rounded border border-neutral-200">
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span className="text-neutral-600">GET https://tavily.com/search?q=toyota+solid+state</span>
                            </div>
                            <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded text-[9px]">200 OK</span>
                          </div>
                          <div className="flex justify-between items-center bg-[#f9fafb] p-2 rounded border border-neutral-200">
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span className="text-neutral-600">PARSING https://arxiv.org/html/2604.09121v2</span>
                            </div>
                            <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded text-[9px]">94% GROUNDED</span>
                          </div>
                          <div className="flex justify-between items-center bg-[#f9fafb] p-2 rounded border border-neutral-200">
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="text-neutral-600">CRAWLING https://samsungsdi.com/news/roadmap</span>
                            </div>
                            <span className="text-amber-700 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[9px]">ACTIVE</span>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activeFeatureTab === 2 && (
                      <motion.div
                        key="tab-2"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded uppercase">Vector Retrieval</span>
                          <span className="text-[10px] font-mono text-neutral-550">qdrant_query.rs</span>
                        </div>
                        <h3 className="text-base font-bold text-neutral-900">Semantic Context Extraction</h3>
                        <p className="text-xs text-neutral-600 leading-relaxed max-w-[550px]">
                          Performs dense vector retrieval against local Qdrant collections. Matches document embeddings mathematically to isolate high-similarity chunks.
                        </p>
                        
                        {/* Cosine similarity metrics list */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-[520px]">
                          <div className="bg-white border border-neutral-200 rounded-[8px] p-3 shadow-xs">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[9px] font-mono text-neutral-400">MATCH #1</span>
                              <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">Cosine: 0.92</span>
                            </div>
                            <p className="text-[11px] text-neutral-700 leading-normal truncate">"...sulfide-based solid electrolytes show conductivity..."</p>
                            <span className="text-[8px] font-mono text-neutral-400 mt-2 block">source: patent_US-110291-B2.pdf</span>
                          </div>
                          
                          <div className="bg-white border border-neutral-200 rounded-[8px] p-3 shadow-xs">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[9px] font-mono text-neutral-400">MATCH #2</span>
                              <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">Cosine: 0.87</span>
                            </div>
                            <p className="text-[11px] text-neutral-700 leading-normal truncate">"...pilot lines scaled in Q1 2026 reached 500 Wh/kg..."</p>
                            <span className="text-[8px] font-mono text-neutral-400 mt-2 block">source: samsung-press-deck-2026.pdf</span>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activeFeatureTab === 3 && (
                      <motion.div
                        key="tab-3"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded uppercase">Critic Audit</span>
                          <span className="text-[10px] font-mono text-neutral-555">ragas_evaluator.py</span>
                        </div>
                        <h3 className="text-base font-bold text-neutral-900">Hallucination Verification Shield</h3>
                        <p className="text-xs text-neutral-600 leading-relaxed max-w-[550px]">
                          The Critic Agent runs automated RAGAS evaluations. Compares claims sentence-by-sentence to verify direct citation grounding.
                        </p>
                        
                        {/* RAGAS Checklist */}
                        <div className="bg-white border border-neutral-200 rounded-[8px] p-4 font-mono text-[10px] text-neutral-700 space-y-2.5 max-w-[520px] shadow-xs">
                          <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                            <span className="font-bold text-neutral-500">RAGAS Audit Checklist</span>
                            <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">Passed (98% Trust)</span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-start gap-2 text-neutral-600">
                              <Lucide.CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                              <span>Claim Grounded: "Toyota pilot line in 2027" matches [Toyota 2026 Rep. p.14]</span>
                            </div>
                            <div className="flex items-start gap-2 text-neutral-600">
                              <Lucide.CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                              <span>Claim Grounded: "Conductivity of electrolyte matches [ArXiv v4, p.2]"</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activeFeatureTab === 4 && (
                      <motion.div
                        key="tab-4"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded uppercase">Writer Phase</span>
                          <span className="text-[10px] font-mono text-neutral-555">synthesis_engine.go</span>
                        </div>
                        <h3 className="text-base font-bold text-neutral-900">Structured Report Compiler</h3>
                        <p className="text-xs text-neutral-600 leading-relaxed max-w-[550px]">
                          Writer Agent compiles the verified information, ordering claims chronologically and appending direct citation link references.
                        </p>
                        
                        {/* Report Draft Preview */}
                        <div className="bg-white border border-neutral-200 rounded-[8px] p-3.5 max-w-[520px] shadow-xs">
                          <div className="flex items-center justify-between border-b border-neutral-200 pb-2.5 mb-2.5">
                            <span className="text-xs font-bold text-neutral-800 font-mono">draft_report_ev.md</span>
                            <button className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1 rounded flex items-center gap-1 transition-colors">
                              <Lucide.Download className="h-3 w-3 animate-bounce" /> Download Report
                            </button>
                          </div>
                          <p className="text-[10px] text-neutral-600 leading-relaxed font-sans">
                            <strong className="text-neutral-900"># EV Solid-State Battery Commercialization Outlook</strong><br />
                            Toyota and Samsung SDI have locked in commercialization pathways for sulfide-based solid electrolyte batteries by late 2027 [1]. Pilot lines in Q1 2026 demonstrate cell densities exceeding 500 Wh/kg [2]...
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Status bar bottom */}
                <div className="border-t border-neutral-200 pt-3.5 flex items-center justify-between text-[10px] font-mono text-neutral-600 mt-4 relative z-10">
                  <span>Current Step: 0{activeFeatureTab + 1} of 05</span>
                  <span className="text-emerald-600 font-semibold">System Pipeline Verified</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Box (The section matching the user's uploaded image - Light Theme) */}
      <section className="py-20 bg-white relative z-10">
        <div className="max-w-[1100px] mx-auto px-4 lg:px-8">
          <div className="border border-neutral-200 rounded-[12px] bg-[#f5f5f5] p-8 lg:p-12 text-center flex flex-col items-center relative overflow-hidden">
            <div className="absolute inset-0 bg-emerald-500/[0.005] pointer-events-none" />

            <h2 className="text-[36px] font-semibold tracking-tight text-[#0a0a0a] mb-4 max-w-[600px]">
              Ready to automate deep-dive research?
            </h2>
            <p className="text-sm text-neutral-500 mb-8 max-w-[500px]">
              Sign up today and connect your knowledge libraries to our Agentic RAG engine.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-[420px] relative z-10">
              <input
                type="email"
                placeholder="Enter your work email"
                className="flex-1 border border-neutral-200 rounded-md px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-neutral-955 placeholder-neutral-400"
              />
              <button
                onClick={() => navigate(ROUTES.REGISTER)}
                className="bg-neutral-950 hover:bg-neutral-800 text-white px-6 py-2.5 rounded-md font-semibold transition-all text-sm whitespace-nowrap shadow-xs"
              >
                Sign Up Free
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 py-12 bg-[#f9fafb]">
        <div className="max-w-[1100px] mx-auto px-4 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500 text-white p-1 rounded-[4px]">
                <Lucide.Brain className="h-4 w-4" />
              </div>
              <span className="font-semibold text-sm text-[#0a0a0a]">ResearchMind</span>
            </div>

            <p className="text-xs text-neutral-400">
              &copy; {new Date().getFullYear()} ResearchMind. All rights reserved.
            </p>

            <div className="flex gap-6">
              <a href="#" className="text-xs text-neutral-400 hover:text-[#0a0a0a] transition-colors">GitHub</a>
              <a href="#" className="text-xs text-neutral-400 hover:text-[#0a0a0a] transition-colors">Terms</a>
              <a href="#" className="text-xs text-neutral-400 hover:text-[#0a0a0a] transition-colors">Privacy</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Checkout Payment Modal */}
      <AnimatePresence>
        {isPaymentModalOpen && selectedPlan && (
          <div className="fixed inset-0 bg-neutral-950/50 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-neutral-200 rounded-[12px] max-w-[400px] w-full p-6 shadow-2xl relative text-left"
            >
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="absolute top-4 right-4 text-neutral-450 hover:text-neutral-600 transition-colors"
              >
                <Lucide.X className="h-4 w-4" />
              </button>

              {paymentSuccess ? (
                <div className="py-8 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 animate-bounce">
                    <Lucide.CheckCircle2 className="h-8 w-8 text-emerald-500" />
                  </div>
                  <h3 className="text-base font-bold text-neutral-900 mb-1">Payment Successful!</h3>
                  <p className="text-xs text-neutral-500">Your account is being upgraded. Please wait...</p>
                </div>
              ) : (
                <form onSubmit={handlePaymentSubmit} className="space-y-4">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-emerald-600 uppercase tracking-widest block mb-0.5">Secure Checkout</span>
                    <h3 className="text-base font-bold text-neutral-900">Upgrade to {selectedPlan.name}</h3>
                    <p className="text-xs text-neutral-500 mt-0.5">Amount due: <strong className="text-neutral-850 font-bold">{selectedPlan.price} / month</strong></p>
                  </div>
                  
                  <div className="border-t border-neutral-100 pt-4 space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">Cardholder Name</label>
                      <input
                        type="text"
                        required
                        placeholder="John Doe"
                        className="w-full border border-neutral-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-neutral-955 shadow-xs transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">Card Number</label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          maxLength={19}
                          placeholder="•••• •••• •••• ••••"
                          className="w-full border border-neutral-200 rounded-md pl-3 pr-8 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-neutral-955 font-mono shadow-xs transition-all"
                        />
                        <Lucide.CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-700 mb-1">Expiration</label>
                        <input
                          type="text"
                          required
                          placeholder="MM/YY"
                          className="w-full border border-neutral-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-neutral-955 font-mono shadow-xs transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-neutral-700 mb-1">CVC</label>
                        <input
                          type="password"
                          required
                          maxLength={4}
                          placeholder="•••"
                          className="w-full border border-neutral-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-neutral-955 font-mono shadow-xs transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-neutral-100 pt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsPaymentModalOpen(false)}
                      className="flex-1 border border-neutral-200 hover:bg-neutral-50 text-neutral-600 rounded-md py-2 text-sm font-semibold text-center transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={paymentLoading}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-450 text-white rounded-md py-2 text-sm font-semibold text-center transition-colors flex items-center justify-center gap-1.5"
                    >
                      {paymentLoading ? (
                        <>
                          <Lucide.Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Lucide.Lock className="h-3 w-3" />
                          Pay {selectedPlan.price}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LandingPage;
