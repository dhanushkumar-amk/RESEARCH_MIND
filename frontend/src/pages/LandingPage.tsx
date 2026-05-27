import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/constants';
import * as Lucide from 'lucide-react';
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

// Radar data comparing ResearchMind with Standard RAG
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

// Demo query data for interactive showcase
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

const LandingPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'radar' | 'throughput'>('radar');
  const [selectedDemo, setSelectedDemo] = useState(DEMO_QUERIES[0]);
  const [demoStepIndex, setDemoStepIndex] = useState(0);
  const [demoRunning, setDemoRunning] = useState(true);

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
      
      {/* Background Decorative Glows (Soft Light Theme) */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/[0.03] rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="absolute top-[800px] right-1/4 w-[500px] h-[500px] bg-emerald-500/[0.02] rounded-full blur-[130px] pointer-events-none z-0" />
      <div className="absolute bottom-[400px] left-10 w-96 h-96 bg-emerald-500/[0.01] rounded-full blur-[120px] pointer-events-none z-0" />

      {/* Navigation Header */}
      <header className="border-b border-neutral-200 sticky top-0 bg-white/95 backdrop-blur-md z-50">
        <div className="max-w-[1100px] mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 text-white p-1.5 rounded-[6px] shadow-[0_4px_12px_rgba(16,185,129,0.15)]">
              <Lucide.Brain className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight text-[#0a0a0a] flex items-center gap-1.5">
              ResearchMind
              <span className="text-[10px] font-mono font-medium bg-emerald-50 text-emerald-600 border border-emerald-200 px-1.5 py-0.5 rounded">
                Beta
              </span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-neutral-500 hover:text-emerald-600 transition-colors">Features</a>
            <a href="#analytics" className="text-sm font-medium text-neutral-500 hover:text-emerald-600 transition-colors">Analytics</a>
            <a href="#demo" className="text-sm font-medium text-neutral-500 hover:text-emerald-600 transition-colors">Interactive Demo</a>
            <a href="#workflow" className="text-sm font-medium text-neutral-500 hover:text-emerald-600 transition-colors">Pipeline</a>
          </nav>

          <div className="flex items-center gap-2.5">
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
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 lg:py-28 border-b border-neutral-200 relative z-10">
        <div className="max-w-[1100px] mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
            
            {/* Left Column: Hero Text */}
            <div className="lg:col-span-7 flex flex-col items-start text-left">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <span className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3.5 py-1 rounded-full text-xs font-mono border border-emerald-100 mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Agentic Multi-Agent RAG Orchestrator
                </span>
              </motion.div>

              <motion.h1 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-[48px] font-extrabold tracking-tight leading-[1.05] text-[#0a0a0a] mb-6"
              >
                Supercharge research with <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-500">collaborative AI agents</span>.
              </motion.h1>

              <motion.p 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-[16px] leading-[1.6] text-neutral-500 mb-8 max-w-[500px]"
              >
                ResearchMind automates deep literature reviews, market intelligence, and citation audits. It assigns specialized agents to search, verify, and write reports with zero hallucinations.
              </motion.p>

              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto"
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

              {/* Stats Widgets */}
              <div className="grid grid-cols-3 gap-6 mt-12 pt-8 border-t border-neutral-200 w-full">
                <div>
                  <p className="text-2xl font-bold text-[#0a0a0a]">98.7%</p>
                  <p className="text-[11px] font-mono uppercase text-neutral-400 tracking-wider">Grounding Accuracy</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#0a0a0a]">4.8x</p>
                  <p className="text-[11px] font-mono uppercase text-neutral-400 tracking-wider">Time Saved</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#0a0a0a]">100%</p>
                  <p className="text-[11px] font-mono uppercase text-neutral-400 tracking-wider">Local Option</p>
                </div>
              </div>
            </div>

            {/* Right Column: Dynamic Agentic Bubble Animation */}
            <div className="lg:col-span-5 flex items-center justify-center relative">
              
              {/* Outer Spinning Rings */}
              <div className="absolute w-[360px] h-[360px] rounded-full border border-emerald-500/5 animate-[spin_60s_linear_infinite] pointer-events-none" />
              <div className="absolute w-[240px] h-[240px] rounded-full border border-dashed border-emerald-500/5 animate-[spin_40s_linear_infinite_reverse] pointer-events-none" />

              <div className="relative w-full aspect-square max-w-[380px] bg-white border border-neutral-200 rounded-[16px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex items-center justify-center select-none overflow-hidden p-6">
                
                {/* SVG Connections with data flow animation */}
                <svg className="w-full h-full absolute inset-0 pointer-events-none" viewBox="0 0 400 400" fill="none">
                  {/* Lines linking to center */}
                  {['M 200 200 L 90 90', 'M 200 200 L 310 90', 'M 200 200 L 90 310', 'M 200 200 L 310 310'].map((d, index) => (
                    <g key={index}>
                      <path d={d} stroke="#e2e8f0" strokeWidth="2" />
                      <motion.path
                        d={d}
                        stroke="#10b981"
                        strokeWidth="2"
                        strokeDasharray="6 12"
                        animate={{ strokeDashoffset: [0, -36] }}
                        transition={{ repeat: Infinity, duration: 2.5 + index * 0.5, ease: "linear" }}
                      />
                    </g>
                  ))}
                </svg>

                {/* Central Query Node */}
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute z-20"
                >
                  <div className="bg-white border-2 border-emerald-500 rounded-full w-24 h-24 flex flex-col items-center justify-center shadow-[0_4px_20px_rgba(16,185,129,0.15)]">
                    <Lucide.Search className="h-6 w-6 text-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-mono text-emerald-500 font-bold mt-1">CORE</span>
                  </div>
                </motion.div>

                {/* Agent Bubble 1: Planner (Top-Left) */}
                <motion.div
                  animate={{ y: [0, -10, 0], x: [0, 4, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute left-[22%] top-[22%] -translate-x-1/2 -translate-y-1/2 z-10"
                >
                  <div className="bg-white border border-neutral-200 hover:border-emerald-500/50 p-3 rounded-full flex items-center justify-center transition-all group cursor-default shadow-md hover:shadow-lg">
                    <Lucide.ListChecks className="h-5 w-5 text-neutral-500 group-hover:text-emerald-500 transition-colors" />
                    <span className="max-w-0 overflow-hidden group-hover:max-w-[80px] group-hover:ml-2 text-xs font-mono font-bold transition-all text-emerald-600">Planner</span>
                  </div>
                </motion.div>

                {/* Agent Bubble 2: Researcher (Top-Right) */}
                <motion.div
                  animate={{ y: [0, 8, 0], x: [0, -6, 0] }}
                  transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
                  className="absolute left-[78%] top-[22%] -translate-x-1/2 -translate-y-1/2 z-10"
                >
                  <div className="bg-white border border-neutral-200 hover:border-emerald-500/50 p-3 rounded-full flex items-center justify-center transition-all group cursor-default shadow-md hover:shadow-lg">
                    <Lucide.Globe className="h-5 w-5 text-neutral-500 group-hover:text-emerald-500 transition-colors" />
                    <span className="max-w-0 overflow-hidden group-hover:max-w-[80px] group-hover:ml-2 text-xs font-mono font-bold transition-all text-emerald-600">Research</span>
                  </div>
                </motion.div>

                {/* Agent Bubble 3: Critic (Bottom-Left) */}
                <motion.div
                  animate={{ y: [0, -8, 0], x: [0, -4, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
                  className="absolute left-[22%] top-[78%] -translate-x-1/2 -translate-y-1/2 z-10"
                >
                  <div className="bg-white border border-neutral-200 hover:border-emerald-500/50 p-3 rounded-full flex items-center justify-center transition-all group cursor-default shadow-md hover:shadow-lg">
                    <Lucide.ShieldCheck className="h-5 w-5 text-neutral-500 group-hover:text-emerald-500 transition-colors" />
                    <span className="max-w-0 overflow-hidden group-hover:max-w-[80px] group-hover:ml-2 text-xs font-mono font-bold transition-all text-emerald-600">Critic</span>
                  </div>
                </motion.div>

                {/* Agent Bubble 4: Summarizer (Bottom-Right) */}
                <motion.div
                  animate={{ y: [0, 10, 0], x: [0, 5, 0] }}
                  transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 0.9 }}
                  className="absolute left-[78%] top-[78%] -translate-x-1/2 -translate-y-1/2 z-10"
                >
                  <div className="bg-white border border-neutral-200 hover:border-emerald-500/50 p-3 rounded-full flex items-center justify-center transition-all group cursor-default shadow-md hover:shadow-lg">
                    <Lucide.FileText className="h-5 w-5 text-neutral-500 group-hover:text-emerald-500 transition-colors" />
                    <span className="max-w-0 overflow-hidden group-hover:max-w-[80px] group-hover:ml-2 text-xs font-mono font-bold transition-all text-emerald-600">Writer</span>
                  </div>
                </motion.div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Supported Integrations Ticker */}
      <section className="py-8 border-b border-neutral-200 bg-[#f9fafb]">
        <div className="max-w-[1100px] mx-auto px-4 lg:px-8">
          <div className="flex flex-wrap items-center justify-center md:justify-between gap-6 md:gap-4">
            <span className="text-[12px] font-mono font-medium text-neutral-400 uppercase tracking-wider">Compatibilities:</span>
            <div className="flex flex-wrap items-center justify-center gap-6 font-mono text-sm text-neutral-500 font-semibold">
              <span className="hover:text-emerald-600 cursor-default transition-colors">ollama</span>
              <span className="text-neutral-200">•</span>
              <span className="hover:text-emerald-600 cursor-default transition-colors">qdrant</span>
              <span className="text-neutral-200">•</span>
              <span className="hover:text-emerald-600 cursor-default transition-colors">tavily</span>
              <span className="text-neutral-200">•</span>
              <span className="hover:text-emerald-600 cursor-default transition-colors">arxiv</span>
              <span className="text-neutral-200">•</span>
              <span className="hover:text-emerald-600 cursor-default transition-colors">github</span>
            </div>
          </div>
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
              <h3 className="text-lg font-bold text-[#0a0a0a] mb-2">Dual RAG Pipelines</h3>
              <p className="text-neutral-500 text-xs leading-relaxed">
                Seamlessly merges static local database lookups (Qdrant semantic search) with real-time web querying (Tavily & DuckDuckGo protocols).
              </p>
            </div>

            {/* Feature Card 2 */}
            <div className="bg-[#f9fafb] border border-neutral-200 hover:border-emerald-500/30 p-6 rounded-[12px] transition-all duration-300 hover:-translate-y-1 hover:shadow-md group relative overflow-hidden">
              <div className="bg-emerald-50 text-emerald-600 p-3 rounded-[8px] w-fit mb-5 group-hover:scale-110 transition-transform">
                <Lucide.ShieldAlert className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-[#0a0a0a] mb-2">Automated Audit & Critique</h3>
              <p className="text-neutral-500 text-xs leading-relaxed">
                Our active Critic Agent scores generated contents using RAGAS thresholds. Rejects and rewrites answers with poor citation grounding.
              </p>
            </div>

            {/* Feature Card 3 */}
            <div className="bg-[#f9fafb] border border-neutral-200 hover:border-emerald-500/30 p-6 rounded-[12px] transition-all duration-300 hover:-translate-y-1 hover:shadow-md group relative overflow-hidden">
              <div className="bg-emerald-50 text-emerald-600 p-3 rounded-[8px] w-fit mb-5 group-hover:scale-110 transition-transform">
                <Lucide.Blocks className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-[#0a0a0a] mb-2">Model Agnostic Design</h3>
              <p className="text-neutral-500 text-xs leading-relaxed">
                Run fully local offline LLM pipelines via Ollama, or switch dynamically to Anthropic, Gemini, Groq, or DeepSeek API endpoints.
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
                  className={`flex items-start gap-4 p-4 rounded-[8px] text-left transition-all ${
                    activeTab === 'radar' 
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
                  className={`flex items-start gap-4 p-4 rounded-[8px] text-left transition-all ${
                    activeTab === 'throughput' 
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
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="efficiencyGlowLight" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.05}/>
                          <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
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

      {/* Interactive Agent Demo Playground */}
      <section id="demo" className="py-24 border-b border-neutral-200 relative bg-white">
        <div className="max-w-[1100px] mx-auto px-4 lg:px-8">
          <div className="text-center max-w-[600px] mx-auto mb-16">
            <span className="text-emerald-600 text-xs font-mono tracking-widest uppercase bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
              Live Simulation
            </span>
            <h2 className="text-[36px] font-bold text-[#0a0a0a] tracking-tight mt-4">
              Watch the Agents Think
            </h2>
            <p className="text-neutral-500 text-sm mt-3 leading-relaxed">
              Select a research category below to trigger a simulated planning and execution loop in the agent sandbox.
            </p>
          </div>

          {/* Interactive Shell */}
          <div className="border border-neutral-200 rounded-[12px] bg-white overflow-hidden flex flex-col md:grid md:grid-cols-12 md:h-[480px] shadow-[0_4px_30px_rgba(0,0,0,0.02)]">
            
            {/* Left menu (tabs) */}
            <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-neutral-200 p-6 flex flex-col justify-between bg-[#f9fafb]">
              <div>
                <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-widest block mb-4">Select Template:</span>
                <div className="space-y-2">
                  {DEMO_QUERIES.map((demo) => {
                    const Icon = (Lucide as any)[demo.icon] || Lucide.HelpCircle;
                    const isSelected = demo.id === selectedDemo.id;
                    return (
                      <button
                        key={demo.id}
                        onClick={() => handleDemoSelect(demo)}
                        className={`w-full flex items-center gap-3 p-3 rounded-[8px] border text-left transition-all ${
                          isSelected 
                            ? 'bg-white border-neutral-200 text-emerald-600 font-semibold shadow-sm' 
                            : 'bg-transparent border-transparent text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-xs font-mono">{demo.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Control info */}
              <div className="mt-8 pt-4 border-t border-neutral-200 hidden md:block">
                <div className="flex items-center justify-between text-xs text-neutral-400 font-mono">
                  <span>Demo Loop</span>
                  <button 
                    onClick={() => setDemoRunning(!demoRunning)}
                    className="hover:text-neutral-950 flex items-center gap-1"
                  >
                    {demoRunning ? (
                      <>
                        <Lucide.Pause className="h-3 w-3 text-emerald-500" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Lucide.Play className="h-3 w-3 text-emerald-500" />
                        Resume
                      </>
                    )}
                  </button>
                </div>
                <div className="w-full bg-neutral-200 h-1.5 rounded-full mt-2 overflow-hidden">
                  <motion.div 
                    key={selectedDemo.id + '-' + demoStepIndex}
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 2.5, ease: 'linear' }}
                    className="h-full bg-emerald-500" 
                  />
                </div>
              </div>
            </div>

            {/* Right log screen */}
            <div className="md:col-span-8 p-6 font-mono text-[12px] bg-white flex flex-col justify-between min-h-[300px]">
              
              {/* Top query show */}
              <div className="border-b border-neutral-100 pb-4 mb-4">
                <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">User Query:</span>
                <p className="text-neutral-800 text-xs mt-1.5 font-semibold leading-relaxed">"{selectedDemo.query}"</p>
              </div>

              {/* Log body (shows current running steps) */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                <AnimatePresence mode="popLayout">
                  {selectedDemo.steps.map((step, idx) => {
                    const isVisible = idx <= demoStepIndex;
                    const isRunning = idx === demoStepIndex;

                    if (!isVisible) return null;

                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className={`flex gap-3 leading-relaxed p-2 rounded ${
                          isRunning ? 'bg-emerald-50/50 border border-emerald-100' : ''
                        }`}
                      >
                        <span className={`font-bold flex-shrink-0 ${
                          isRunning ? 'text-emerald-600' : 'text-neutral-400'
                        }`}>
                          [{step.agent}Agent]
                        </span>
                        <div className="flex-1">
                          <span className={isRunning ? 'text-emerald-700 font-semibold' : 'text-neutral-500'}>
                            {step.text}
                          </span>
                        </div>
                        {isRunning && (
                          <Lucide.Loader2 className="h-3.5 w-3.5 text-emerald-500 animate-spin self-center flex-shrink-0" />
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Bottom prompt status */}
              <div className="border-t border-neutral-100 pt-4 mt-4 flex items-center justify-between text-[11px] text-neutral-400">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>Research status: {demoStepIndex === selectedDemo.steps.length - 1 ? 'Report Completed' : 'Analyzing Context...'}</span>
                </div>
                <span>Step {demoStepIndex + 1} of {selectedDemo.steps.length}</span>
              </div>

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

      {/* Code Spec Trace */}
      <section id="code" className="py-24 border-b border-neutral-200 bg-white">
        <div className="max-w-[1100px] mx-auto px-4 lg:px-8">
          <div className="text-left mb-16">
            <span className="bg-[#f5f5f5] text-neutral-500 px-3 py-1 rounded-full text-xs font-mono border border-neutral-200 mb-4 inline-block">
              Code & Specs
            </span>
            <h2 className="text-[36px] font-semibold tracking-tight leading-[1.2] text-[#0a0a0a] mb-4">
              Agent Validation Parameters
            </h2>
            <p className="text-base text-neutral-500 max-w-[600px]">
              Developers can override thresholds dynamically. Review the validation loop configuration snippet.
            </p>
          </div>

          <div className="border border-neutral-200 rounded-[8px] bg-white overflow-hidden shadow-sm">
            <div className="bg-[#f9fafb] border-b border-neutral-200 px-6 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-neutral-200" />
                <span className="text-[12px] font-mono text-neutral-400 font-medium">critic_feedback_loop.py</span>
              </div>
              <span className="bg-white text-xs border border-neutral-200 px-2.5 py-0.5 rounded text-[11px] font-mono text-neutral-500 font-medium">PYTHON 3.11</span>
            </div>
            <pre className="p-6 overflow-x-auto text-[12px] font-mono text-neutral-700 bg-white leading-relaxed">
{`def evaluate_agent_synthesis(context_nodes, response_text):
    """
    RAGAS Metric: Evaluates faithfulness & answer relevance
    """
    faithfulness = calculate_faithfulness(context_nodes, response_text)
    relevance = calculate_answer_relevance(response_text)
    
    print(f"DEBUG: Faithfulness = {faithfulness:.2f}, Relevance = {relevance:.2f}")
    
    if faithfulness < RAGAS_THRESHOLDS.FAITHFULNESS_MIN:
        # Prompting the ResearchAgent to perform additional queries
        raise CriticRejectionException("Hallucination detected / lack of grounding.")
        
    return {
        "status": "APPROVED",
        "faithfulness": faithfulness,
        "relevance": relevance
    }`}
            </pre>
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
                className="flex-1 border border-neutral-200 rounded-[6px] px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 bg-white text-neutral-900 placeholder-neutral-400 transition-colors"
              />
              <button 
                onClick={() => navigate(ROUTES.REGISTER)}
                className="bg-[#0a0a0a] hover:bg-[#262626] text-white px-6 py-2.5 rounded-[6px] font-bold transition-all text-sm whitespace-nowrap"
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
              &copy; {new Date().getFullYear()} ResearchMind. All rights reserved. Open-source under MIT.
            </p>

            <div className="flex gap-6">
              <a href="#" className="text-xs text-neutral-400 hover:text-neutral-900 transition-colors">GitHub</a>
              <a href="#" className="text-xs text-neutral-400 hover:text-neutral-900 transition-colors">Terms</a>
              <a href="#" className="text-xs text-neutral-400 hover:text-neutral-900 transition-colors">Privacy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
