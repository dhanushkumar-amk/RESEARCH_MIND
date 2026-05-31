import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, Search, MessageSquare, 
  Calendar, Layers, Sparkles, ChevronRight,
  Database, Trash2, Loader2, AlertCircle
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { ROUTES } from '@/constants';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import researchApi from '@/api/research';
import { useToast } from '@/hooks/useToast';
import { useApp } from '@/context/AppContext';

interface SessionItem {
  id: string;
  session_id: string;
  firstQuestion: string;
  date: string;
  docCount: number;
  tokensUsed: string;
}

const HistoryPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const { setSession } = useApp();
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Fetch sessions via React Query
  const { data: sessions = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['sessions'],
    queryFn: researchApi.getSessions,
  });

  // 2. Clear history mutation
  const clearMutation = useMutation({
    mutationFn: researchApi.clearHistory,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sessions'] });
      success('Session cleared successfully');
    },
    onError: (err: any) => {
      toastError(err.response?.data?.detail || err.message || 'Failed to clear session');
    }
  });

  const handleReopenSession = (sessId: string, firstQuestion: string) => {
    // Set current active session ID globally
    setSession(sessId);
    // Navigate to research workspace with this session active
    navigate(ROUTES.RESEARCH, { state: { initialQuery: firstQuestion } });
  };

  const handleClearSession = (e: React.MouseEvent, sessId: string) => {
    e.stopPropagation(); // Avoid triggering card click
    if (confirm('Are you sure you want to delete this session logs?')) {
      void clearMutation.mutateAsync(sessId);
    }
  };

  const filteredSessions = sessions.filter(sess => 
    sess.firstQuestion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppShell>
      <div className="max-w-[1200px] mx-auto space-y-6 lg:space-y-8 font-sans antialiased">
        
        {/* Top Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-neutral-900 tracking-tight flex items-center gap-2">
            Research Session History
            {isLoading && <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />}
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
              className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#16a34a] bg-white transition-all text-neutral-900 placeholder-neutral-400"
            />
          </div>
        </div>

        {isError && (
          <div className="p-4 bg-red-50 border border-red-150 rounded-xl text-red-700 flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <div className="text-xs">
              <span className="font-bold">Connection Alert:</span> Failed to retrieve chat sessions history database logs.
            </div>
          </div>
        )}

        {/* Sessions list */}
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
          <div className="divide-y divide-neutral-100">
            {filteredSessions.map((sess) => (
              <div 
                key={sess.id}
                onClick={() => handleReopenSession(sess.session_id, sess.firstQuestion)}
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
                      {sess.docCount} Filtered Docs
                    </span>
                    <span>•</span>
                    <span>{sess.tokensUsed} Tokens</span>
                  </div>

                  <h3 className="font-extrabold text-sm sm:text-base text-neutral-850 group-hover:text-[#16a34a] transition-all line-clamp-2">
                    {sess.firstQuestion}
                  </h3>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-center">
                  <button
                    onClick={(e) => handleClearSession(e, sess.session_id)}
                    className="p-2 text-neutral-400 hover:text-red-650 hover:bg-red-50 rounded-lg transition-all"
                    title="Delete History Logs"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <span className="text-xs font-bold text-neutral-455 uppercase group-hover:text-[#16a34a] transition-colors whitespace-nowrap">Reopen Session</span>
                  <div className="h-8 w-8 rounded-full border border-neutral-200 flex items-center justify-center text-neutral-400 group-hover:border-[#16a34a]/30 group-hover:bg-[#16a34a]/5 group-hover:text-[#16a34a] transition-all">
                    <ChevronRight className="h-4.5 w-4.5" />
                  </div>
                </div>
              </div>
            ))}
            
            {filteredSessions.length === 0 && !isLoading && (
              <div className="text-center py-16 space-y-3">
                <Clock className="h-8 w-8 text-neutral-350 mx-auto" />
                <p className="text-sm font-semibold text-neutral-555">No search logs found</p>
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
