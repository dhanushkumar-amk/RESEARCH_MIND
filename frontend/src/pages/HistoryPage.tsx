import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, Search, ArrowRight, MessageSquare, 
  Calendar, Layers, Sparkles, Filter, ChevronRight,
  Database
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { ROUTES } from '@/constants';

interface SessionItem {
  id: string;
  firstQuestion: string;
  date: string;
  docCount: number;
  tokensUsed: string;
}

const HistoryPage = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  // Past sessions list mock
  const [sessions, setSessions] = useState<SessionItem[]>([
    { id: 'sess_1', firstQuestion: 'Analyze the current state of sulfide-based solid-state battery anodes in 2026 pilot lines.', date: 'May 28, 2026', docCount: 14, tokensUsed: '124K' },
    { id: 'sess_2', firstQuestion: 'NIST post-quantum cryptographic standards transition timeline and impact on SSH/TLS.', date: 'May 27, 2026', docCount: 9, tokensUsed: '88K' },
    { id: 'sess_3', firstQuestion: 'Compare methane/LOX vs biofuels in sub-orbital launch vehicles efficiency in 2026.', date: 'May 26, 2026', docCount: 22, tokensUsed: '210K' },
    { id: 'sess_4', firstQuestion: 'Overview of transformer model inference speed optimizations: KV caching vs quantization.', date: 'May 24, 2026', docCount: 6, tokensUsed: '56K' },
    { id: 'sess_5', firstQuestion: 'Market adoption rate of Level 3 autonomous driving software in Western Europe.', date: 'May 22, 2026', docCount: 12, tokensUsed: '144K' },
    { id: 'sess_6', firstQuestion: 'Quantum key distribution protocols vs post-quantum mathematical lattices.', date: 'May 18, 2026', docCount: 8, tokensUsed: '90K' },
  ]);

  const handleReopenSession = (session: SessionItem) => {
    // Navigate to research page with history question preloaded
    navigate(ROUTES.RESEARCH, { state: { initialQuery: session.firstQuestion } });
  };

  const filteredSessions = sessions.filter(sess => 
    sess.firstQuestion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppShell>
      <div className="max-w-[1200px] mx-auto space-y-6 lg:space-y-8 font-sans antialiased">
        
        {/* Top Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-neutral-900 tracking-tight">
            Research Session History
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Browse and reopen previous autonomous research conversations, vector contexts, and citations.
          </p>
        </div>

        {/* Filter bar and search */}
        <div className="bg-white border border-neutral-200 rounded-xl p-4 flex items-center gap-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search past session questions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#16a34a] bg-white transition-all text-neutral-900 placeholder-neutral-400"
            />
          </div>
        </div>

        {/* Sessions list */}
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
          <div className="divide-y divide-neutral-100">
            {filteredSessions.map((sess) => (
              <div 
                key={sess.id}
                onClick={() => handleReopenSession(sess)}
                className="p-4 sm:p-5 hover:bg-neutral-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group"
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {sess.date}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Layers className="h-3 w-3" />
                      {sess.docCount} Documents
                    </span>
                    <span>•</span>
                    <span>{sess.tokensUsed} Tokens</span>
                  </div>

                  <h3 className="font-extrabold text-sm sm:text-base text-neutral-850 group-hover:text-[#16a34a] transition-all line-clamp-2">
                    {sess.firstQuestion}
                  </h3>
                </div>

                <div className="flex items-center gap-2.5 self-end sm:self-center">
                  <span className="text-xs font-bold text-neutral-450 uppercase group-hover:text-[#16a34a] transition-colors whitespace-nowrap">Reopen Session</span>
                  <div className="h-8 w-8 rounded-full border border-neutral-200 flex items-center justify-center text-neutral-400 group-hover:border-[#16a34a]/30 group-hover:bg-[#16a34a]/5 group-hover:text-[#16a34a] transition-all">
                    <ChevronRight className="h-4.5 w-4.5" />
                  </div>
                </div>
              </div>
            ))}
            
            {filteredSessions.length === 0 && (
              <div className="text-center py-16 space-y-3">
                <Clock className="h-8 w-8 text-neutral-350 mx-auto" />
                <p className="text-sm font-semibold text-neutral-550">No search logs found</p>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto">Try modifying your query keyword or launch a new research session inside the chat workspace.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </AppShell>
  );
};

export default HistoryPage;
