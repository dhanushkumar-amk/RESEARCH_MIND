import { motion } from 'framer-motion';
import { 
  BarChart2, ShieldCheck, Cpu, Clock, DollarSign, 
  Database, Activity, Zap, TrendingUp, Sparkles,
  ArrowUpRight, RefreshCw, BarChart, PieChart
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';

const AnalyticsPage = () => {
  
  // RAG Quality metrics
  const ragMetrics = [
    { label: 'RAGAS Faithfulness', value: '96.2%', threshold: 'Min Target: 85%', score: 96 },
    { label: 'RAGAS Answer Relevance', value: '94.5%', threshold: 'Min Target: 80%', score: 94 },
    { label: 'RAGAS Context Relevance', value: '91.8%', threshold: 'Min Target: 75%', score: 91 },
  ];

  // LLM Gateway metrics
  const gatewayStats = [
    { label: 'Total Requests Today', value: '184', icon: Cpu },
    { label: 'Cache Hit Rate', value: '42.8%', icon: Database },
    { label: 'Token Cost Saved', value: '$84.50', icon: DollarSign },
    { label: 'Fallback Triggers', value: '2 times', icon: Zap },
  ];

  // Model usage breakdown
  const modelUsage = [
    { name: 'Llama 3.3 70B (Groq)', pct: 55, tokens: '1.2M tokens', color: 'bg-green-600' },
    { name: 'Gemini 1.5 Pro', pct: 30, tokens: '640K tokens', color: 'bg-green-400' },
    { name: 'Claude 3.5 Sonnet', pct: 10, tokens: '210K tokens', color: 'bg-neutral-850' },
    { name: 'DeepSeek Chat', pct: 5, pctLabel: '5%', tokens: '105K tokens', color: 'bg-neutral-400' },
  ];

  // Agent Performance metrics
  const agentStats = [
    { label: 'Avg Response Time', value: '4.8s', icon: Clock },
    { label: 'Agent Success Rate', value: '99.1%', icon: ShieldCheck },
    { label: 'Critic Rejection Rate', value: '3.4%', icon: Activity },
  ];

  // Query analytics topics
  const topTopics = [
    { topic: 'Solid-State Battery Anodes', count: 18, pct: 80 },
    { topic: 'Post-Quantum Cryptography', count: 12, pct: 60 },
    { topic: 'Large Language Models (KV Cache)', count: 9, pct: 45 },
    { topic: 'Green Biofuel Propellants', count: 7, pct: 35 },
  ];

  return (
    <AppShell>
      <div className="max-w-[1400px] mx-auto space-y-6 lg:space-y-8 font-sans antialiased">
        
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-neutral-900 tracking-tight">
              Analytics & Diagnostics
            </h1>
            <p className="text-sm text-neutral-500 mt-1 font-medium">
              Real-time monitoring of RAG quality, LiteLLM gateway performance, agent execution success, and costs.
            </p>
          </div>
          
          <button className="bg-white border border-neutral-200 hover:border-neutral-300 text-neutral-700 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all shadow-sm cursor-pointer">
            <RefreshCw className="h-3.5 w-3.5 text-neutral-500" />
            <span>Refresh Diagnostics</span>
          </button>
        </div>

        {/* Section 1: RAG Quality Metrics */}
        <div className="space-y-3.5">
          <h2 className="font-bold text-base text-neutral-800 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="h-4.5 w-4.5 text-[#16a34a]" />
            RAG Evaluation Quality (RAGAS)
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {ragMetrics.map((m, idx) => (
              <div key={idx} className="bg-white border border-neutral-200 rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-505">{m.label}</span>
                  <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded">{m.threshold}</span>
                </div>
                <h3 className="text-2xl font-black text-neutral-900 tracking-tight">{m.value}</h3>
                
                <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#16a34a] rounded-full" style={{ width: `${m.score}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: LLM Gateway & Agent Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Gateway column */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="font-bold text-base text-neutral-800 uppercase tracking-wider flex items-center gap-2">
              <Cpu className="h-4.5 w-4.5 text-[#16a34a]" />
              LLM Gateway Performance (LiteLLM Router)
            </h2>

            <div className="grid grid-cols-2 gap-4">
              {gatewayStats.map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <div key={idx} className="bg-white border border-neutral-200 rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-neutral-450 uppercase block">{stat.label}</span>
                      <span className="text-2xl font-black text-neutral-900 tracking-tight">{stat.value}</span>
                    </div>
                    <div className="p-3 bg-neutral-50 border border-neutral-100 rounded-xl text-neutral-600">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Model Usage breakdown list */}
            <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4">
              <span className="text-xs font-bold text-neutral-455 uppercase block">Model Share & Tokens Consumed</span>
              <div className="space-y-3.5">
                {modelUsage.map((m, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-neutral-800">{m.name}</span>
                      <span className="text-[10px] text-neutral-400 font-semibold">{m.pct}% ({m.tokens})</span>
                    </div>
                    <div className="w-full h-2 bg-neutral-50 rounded-full overflow-hidden border border-neutral-100">
                      <div className={`h-full ${m.color} rounded-full`} style={{ width: `${m.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right column: Agent Health & Top Research Topics */}
          <div className="space-y-6">
            
            {/* Agent performance metrics */}
            <div className="space-y-3.5">
              <h2 className="font-bold text-base text-neutral-800 uppercase tracking-wider flex items-center gap-2">
                <Clock className="h-4.5 w-4.5 text-[#16a34a]" />
                Agent Network Execution
              </h2>

              <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4">
                {agentStats.map((agent, idx) => {
                  const Icon = agent.icon;
                  return (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-neutral-50 border border-neutral-100 rounded-lg text-neutral-600">
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                        <span className="text-xs font-bold text-neutral-700">{agent.label}</span>
                      </div>
                      <span className="text-sm font-black text-neutral-900">{agent.value}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Topics queries */}
            <div className="space-y-3.5">
              <h2 className="font-bold text-base text-neutral-800 uppercase tracking-wider flex items-center gap-2">
                <BarChart className="h-4.5 w-4.5 text-[#16a34a]" />
                Top Research Topics
              </h2>

              <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-3">
                {topTopics.map((topic, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-neutral-700 truncate max-w-[200px]">{topic.topic}</span>
                      <span className="text-[10px] text-neutral-400 font-bold">{topic.count} queries</span>
                    </div>
                    <div className="w-full h-1 bg-neutral-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#16a34a] rounded-full" style={{ width: `${topic.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

        {/* Cost Tracker Block */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-[#16a34a]" />
              <h2 className="font-bold text-base text-neutral-900">Workspace Cost Tracker</h2>
            </div>
            <span className="text-[10px] font-bold text-green-705 bg-green-50 px-2 py-0.5 rounded">All APIs Billed via LLMGate</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Total Tokens Consumed</span>
              <p className="text-xl font-black text-neutral-900 font-mono">2,154,820</p>
              <p className="text-[10px] text-neutral-450 mt-1 font-semibold">Across all models & agents</p>
            </div>
            
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Cached Savings Saved</span>
              <p className="text-xl font-black text-[#16a34a] font-mono">+$84.50</p>
              <p className="text-[10px] text-neutral-450 mt-1 font-semibold">42.8% queries served from database cache</p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Avg Cost Per Deep Research</span>
              <p className="text-xl font-black text-neutral-900 font-mono">$0.28</p>
              <p className="text-[10px] text-neutral-450 mt-1 font-semibold">Using optimized hybrid models routing</p>
            </div>
          </div>
        </div>

      </div>
    </AppShell>
  );
};

export default AnalyticsPage;
