import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Search, BookOpen, Brain, ArrowRight, FileText, 
  Globe, ShieldCheck, Clock, Plus, Database, 
  Sparkles, Cpu, Server, CheckCircle, Upload, 
  TrendingUp, Activity, AlertCircle, RefreshCw
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import useAuth from '@/hooks/useAuth';
import { ROUTES } from '@/constants';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [quickQuery, setQuickQuery] = useState('');

  const userName = user?.name ?? 'Dhanush';

  // Stats row requested by the user
  const stats = [
    { label: 'Total Documents Ingested', value: '34', icon: BookOpen, subtext: '12 added this week' },
    { label: 'Total Research Queries Today', value: '18', icon: Search, subtext: 'Peak usage: 2 PM - 4 PM' },
    { label: 'Cache Hit Rate', value: '42.8%', icon: TrendingUp, subtext: '14 repeat queries saved' },
    { label: 'Token Cost Saved', value: '$84.50', icon: Sparkles, subtext: 'Through local cache hit' },
  ];

  // Recent research queries (last 5 questions asked)
  const recentQueries = [
    {
      id: 'q1',
      question: 'Analyze the current state of sulfide-based solid-state battery anodes in 2026 pilot lines.',
      timestamp: '2 hours ago',
      category: 'Battery Tech',
      accuracy: '98%',
    },
    {
      id: 'q2',
      question: 'NIST post-quantum cryptographic standards transition timeline and impact on SSH/TLS.',
      timestamp: '1 day ago',
      category: 'Cybersecurity',
      accuracy: '94%',
    },
    {
      id: 'q3',
      question: 'Compare methane/LOX vs biofuels in sub-orbital launch vehicles efficiency in 2026.',
      timestamp: '2 days ago',
      category: 'Aerospace',
      accuracy: '95%',
    },
    {
      id: 'q4',
      question: 'Overview of transformer model inference speed optimizations: KV caching vs quantization.',
      timestamp: '4 days ago',
      category: 'AI/ML',
      accuracy: '97%',
    },
    {
      id: 'q5',
      question: 'Market adoption rate of Level 3 autonomous driving software in Western Europe.',
      timestamp: '5 days ago',
      category: 'Automotive',
      accuracy: '92%',
    },
  ];

  // Recent documents (last 5 uploaded)
  const recentDocuments = [
    { name: 'Sulfide-electrolyte-interfaces-2026.pdf', type: 'PDF', size: '4.2 MB', time: '2 hours ago' },
    { name: 'NIST-SP-800-224-Draft.pdf', type: 'PDF', size: '12.8 MB', time: '1 day ago' },
    { name: 'https://arxiv.org/abs/2603.09115', type: 'URL', size: 'Web Page', time: '2 days ago' },
    { name: 'Toyota Pilot Production Updates - Q1.docx', type: 'DOCX', size: '840 KB', time: '4 days ago' },
    { name: 'https://youtube.com/watch?v=bB29a5Xz-M', type: 'YouTube', size: '15m Video', time: '5 days ago' },
  ];

  // System health — all services status (Qdrant, LLM Gateway, ETL)
  const systemServices = [
    { name: 'Qdrant Vector Database', status: 'healthy', version: 'v1.8.2', latency: '4ms' },
    { name: 'LLM Gateway (LiteLLM Router)', status: 'healthy', version: 'v1.35.4', latency: '180ms' },
    { name: 'ETL Pipeline (Parser & chunker)', status: 'healthy', version: 'v2.1.0', latency: 'Idle' },
  ];

  const handleQuickSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickQuery.trim()) return;
    navigate(ROUTES.RESEARCH, { state: { initialQuery: quickQuery } });
  };

  return (
    <AppShell>
      <div className="max-w-[1400px] mx-auto space-y-6 lg:space-y-8 font-sans antialiased">
        
        {/* Welcome Header & Quick Action Buttons */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-neutral-900 tracking-tight">
              Good morning, {userName}
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              Here is what's happening with ResearchMind today.
            </p>
          </div>
          
          {/* Quick actions row */}
          <div className="flex items-center gap-2.5">
            <button 
              onClick={() => navigate(ROUTES.LIBRARY, { state: { openUpload: true } })}
              className="bg-white border border-neutral-200 hover:border-neutral-300 text-neutral-700 font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all shadow-sm cursor-pointer"
            >
              <Upload className="h-4 w-4 text-neutral-500" />
              <span>Upload Document</span>
            </button>
            <button 
              onClick={() => navigate(ROUTES.RESEARCH)}
              className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all border border-emerald-100 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Start Research</span>
            </button>
            <button 
              onClick={() => navigate('/reports')}
              className="bg-neutral-950 text-white hover:bg-neutral-800 font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all shadow-sm cursor-pointer"
            >
              <FileText className="h-4 w-4" />
              <span>View Reports</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.04 }}
                className="bg-white border border-neutral-200 rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">{stat.label}</span>
                  <div className="p-2 rounded-lg bg-neutral-50 text-neutral-600">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                </div>
                <div className="mt-2.5">
                  <h3 className="text-2xl font-bold text-neutral-900 tracking-tight">{stat.value}</h3>
                  <p className="text-[10px] text-neutral-400 font-medium mt-1">{stat.subtext}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Columns (Span 2): Recent Research Queries */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-emerald-600" />
                <h2 className="font-bold text-lg text-neutral-900">Recent Research Queries</h2>
              </div>
              <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">Last 5 questions</span>
            </div>

            <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
              <div className="divide-y divide-neutral-100">
                {recentQueries.map((item, idx) => (
                  <div 
                    key={item.id}
                    onClick={() => navigate(ROUTES.RESEARCH, { state: { initialQuery: item.question } })}
                    className="p-4 hover:bg-neutral-50 transition-colors flex items-center justify-between gap-4 cursor-pointer group"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <p className="text-sm font-bold text-neutral-850 group-hover:text-emerald-650 transition-colors line-clamp-1">
                        {item.question}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-medium">
                        <span className="bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded">{item.category}</span>
                        <span>•</span>
                        <span>{item.timestamp}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Grounding</p>
                        <p className="text-xs font-extrabold text-emerald-600">{item.accuracy}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-neutral-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Recent Documents & System Health */}
          <div className="space-y-6">
            
            {/* Recent Documents */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-emerald-600" />
                  <h2 className="font-bold text-lg text-neutral-900">Recent Documents</h2>
                </div>
                <button 
                  onClick={() => navigate(ROUTES.LIBRARY)}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  Manage All
                </button>
              </div>

              <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
                <div className="divide-y divide-neutral-100">
                  {recentDocuments.map((doc, idx) => (
                    <div 
                      key={idx}
                      className="p-3 hover:bg-neutral-50 transition-colors flex items-center justify-between gap-3 cursor-pointer"
                      onClick={() => navigate(ROUTES.LIBRARY)}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-neutral-800 truncate">{doc.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[9px] text-neutral-400 font-semibold uppercase">
                          <span className="text-emerald-600">{doc.type}</span>
                          <span>•</span>
                          <span>{doc.size}</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-neutral-400 whitespace-nowrap">{doc.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* System Health */}
            <div className="space-y-3.5">
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-emerald-600" />
                <h2 className="font-bold text-lg text-neutral-900">System Health</h2>
              </div>

              <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-3">
                {systemServices.map((service, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs border-b border-neutral-50 last:border-0 pb-2.5 last:pb-0">
                    <div className="space-y-0.5">
                      <p className="font-bold text-neutral-800">{service.name}</p>
                      <div className="flex items-center gap-1 text-[9px] text-neutral-450">
                        <span>{service.version}</span>
                        <span>•</span>
                        <span>Latency: {service.latency}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="capitalize">{service.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>
    </AppShell>
  );
};

export default DashboardPage;
