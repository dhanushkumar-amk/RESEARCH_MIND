import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Brain, Send, FileText, CheckCircle2,
  ThumbsUp, ThumbsDown, RotateCcw, ChevronRight,
  Database, Globe, ShieldCheck, Sparkles, Filter,
  BookOpen, HelpCircle, Loader2, Play, Plus
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { ROUTES } from '@/constants';
import { useSSE } from '@/hooks/useSSE';
import { researchApi } from '@/api/research';
import { useToast } from '@/hooks/useToast';
import { useApp } from '@/context/AppContext';
import { useQuery } from '@tanstack/react-query';

interface Source {
  id: string;
  name: string;
  type: string;
  matchScore: string;
}

interface Suggestion {
  id: string;
  question: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  agents?: string[];
  sources?: Source[];
  suggestions?: Suggestion[];
  isStreaming?: boolean;
}

const ResearchPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { success, error, info } = useToast();
  const { documents, refreshDocuments } = useApp();

  const [sessionId, setSessionId] = useState<string>(() => crypto.randomUUID());
  const [query, setQuery] = useState('');
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<'all' | 'specific'>('all');
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Hook up custom useSSE hook
  const {
    message: streamContent,
    sources: streamSources,
    report: streamReport,
    agentStatus,
    isStreaming,
    isComplete,
    error: streamError,
    startStream,
    cleanup
  } = useSSE();

  // 2. Fetch history of session on mount/sessionId change using React Query
  const { data: history = [], refetch: refetchHistory } = useQuery({
    queryKey: ['researchHistory', sessionId],
    queryFn: () => researchApi.getHistory(sessionId),
    enabled: !!sessionId
  });

  // Sync React Query history with page messages state
  useEffect(() => {
    if (history && history.length > 0) {
      const formatted: Message[] = history.map(h => ({
        role: h.role,
        content: h.content,
        // Since SSE metadata was processed in backend and reports are generated separately,
        // we can fetch report details or keep them empty in history view
      }));
      setMessages(formatted);
    } else {
      setMessages([]);
    }
  }, [history]);

  // Sync ongoing SSE stream tokens to the messages list
  useEffect(() => {
    if (isStreaming) {
      setMessages(prev => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last && last.role === 'assistant') {
          last.content = streamContent;
          last.isStreaming = true;
          
          if (!last.agents) last.agents = [];
          const agentLabel = agentStatus.charAt(0).toUpperCase() + agentStatus.slice(1) + ' Agent';
          if (agentStatus !== 'idle' && !last.agents.includes(agentLabel)) {
            last.agents = [...last.agents, agentLabel];
          }
        }
        return next;
      });
    }
  }, [streamContent, agentStatus, isStreaming]);

  // Sync stream completion states
  useEffect(() => {
    if (isComplete) {
      setMessages(prev => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last && last.role === 'assistant') {
          last.content = streamContent;
          last.isStreaming = false;
          last.sources = streamSources;
          
          if (streamReport?.related_topics) {
            last.suggestions = streamReport.related_topics.map((topic: string, index: number) => ({
              id: `sug_${index}`,
              question: topic
            }));
          }
        }
        return next;
      });
      success('Research query compilation complete');
      void refetchHistory();
    }
  }, [isComplete, streamSources, streamReport, refetchHistory]);

  useEffect(() => {
    if (streamError) {
      error(streamError);
    }
  }, [streamError]);

  // Handle incoming query from location state (dashboard quick action)
  useEffect(() => {
    const state = location.state as { initialQuery?: string };
    if (state?.initialQuery) {
      setQuery(state.initialQuery);
      void submitQuery(state.initialQuery);
    }
  }, [location.state]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, agentStatus]);

  // Refresh user documents on component mount
  useEffect(() => {
    void refreshDocuments();
  }, [refreshDocuments]);

  const submitQuery = async (queryText: string) => {
    if (!queryText.trim() || isStreaming) return;

    setQuery('');
    
    // Append User Query & initial Assistant message placeholder
    setMessages(prev => [
      ...prev,
      { role: 'user', content: queryText.trim() },
      { role: 'assistant', content: '', agents: [], isStreaming: true }
    ]);

    try {
      await startStream('/api/agents/research', {
        question: queryText.trim(),
        session_id: sessionId,
        source_ids: selectedSourceFilter === 'specific' ? selectedDocs : []
      });
    } catch (err: any) {
      error(err.message || 'Streaming failed');
    }
  };

  const handleNewChat = () => {
    cleanup();
    const newId = crypto.randomUUID();
    setSessionId(newId);
    setMessages([]);
    success('Started new research session');
  };

  const handleDocToggle = (docId: string) => {
    setSelectedDocs(prev =>
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
  };

  const handleFeedback = async (rating: number, comment: string) => {
    try {
      await researchApi.submitFeedback(sessionId, rating, comment);
      success('Thank you for your feedback!');
    } catch (err: any) {
      error('Failed to submit feedback');
    }
  };

  return (
    <AppShell>
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6 font-sans antialiased h-[calc(100vh-7rem)]">

        {/* Left Side: Controls, Document Filters & History */}
        <div className="lg:col-span-1 flex flex-col gap-5 h-full overflow-y-auto pr-1">

          {/* New Chat Button */}
          <button
            onClick={handleNewChat}
            className="w-full bg-[#16a34a] hover:bg-green-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>New Research Chat</span>
          </button>

          {/* Source Selector Panel */}
          <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
            <div className="flex items-center gap-2 text-neutral-800">
              <Filter className="h-4 w-4 text-[#16a34a]" />
              <span className="font-bold text-sm">Source Scope</span>
            </div>

            <div className="flex rounded-lg bg-neutral-50 p-1 text-xs">
              <button
                onClick={() => setSelectedSourceFilter('all')}
                className={`flex-1 py-1.5 rounded-md font-bold text-center transition-all cursor-pointer ${selectedSourceFilter === 'all'
                    ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200/50'
                    : 'text-neutral-500 hover:text-neutral-800'
                  }`}
              >
                All Library
              </button>
              <button
                onClick={() => setSelectedSourceFilter('specific')}
                className={`flex-1 py-1.5 rounded-md font-bold text-center transition-all cursor-pointer ${selectedSourceFilter === 'specific'
                    ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200/50'
                    : 'text-neutral-500 hover:text-neutral-800'
                  }`}
              >
                Select Specific
              </button>
            </div>

            {selectedSourceFilter === 'specific' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-2 pt-1.5"
              >
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Select libraries to search</p>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {documents.filter(d => d.status === 'indexed').map(doc => (
                    <label
                      key={doc.id}
                      className="flex items-center gap-2 text-xs text-neutral-700 hover:text-neutral-900 cursor-pointer p-1 rounded hover:bg-neutral-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDocs.includes(doc.id)}
                        onChange={() => handleDocToggle(doc.id)}
                        className="rounded border-neutral-350 text-[#16a34a] focus:ring-green-500/10 h-3.5 w-3.5 cursor-pointer"
                      />
                      <span className="truncate flex-1">{doc.filename}</span>
                    </label>
                  ))}
                  {documents.filter(d => d.status === 'indexed').length === 0 && (
                    <div className="text-[10px] text-neutral-450 italic text-center py-2">
                      No processed docs found.
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {/* Conversation history lists */}
          <div className="bg-white border border-neutral-200 rounded-xl p-4 flex-1 flex flex-col min-h-[220px] shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Current Session History</span>

            <div className="space-y-1 overflow-y-auto flex-1">
              {messages.filter(m => m.role === 'user').map((m, idx) => (
                <button
                  key={idx}
                  onClick={() => submitQuery(m.content)}
                  className="w-full text-left text-xs text-neutral-650 hover:text-neutral-900 hover:bg-neutral-50 p-2 rounded-lg truncate block font-semibold"
                >
                  {m.content}
                </button>
              ))}
              {messages.filter(m => m.role === 'user').length === 0 && (
                <div className="text-center py-8 text-neutral-405 text-xs font-medium">
                  No query history in this session
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Streaming Interface & Main Chat Box */}
        <div className="lg:col-span-3 flex flex-col bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.02)] h-full">

          {/* Top Panel: Agent Network Status Indicator */}
          <div className="bg-neutral-50/50 border-b border-neutral-100 p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-4.5 w-4.5 text-[#16a34a]" />
              <span className="text-sm font-bold text-neutral-800">Agent Network Activity</span>
            </div>

            {/* Live active states */}
            <div className="flex items-center gap-3">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded transition-all uppercase ${agentStatus === 'retrieval' ? 'bg-amber-100 text-amber-700 animate-pulse font-bold' : 'bg-neutral-100 text-neutral-400'
                }`}>
                Retrieval
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded transition-all uppercase ${agentStatus === 'research' ? 'bg-purple-100 text-purple-700 animate-pulse font-bold' : 'bg-neutral-100 text-neutral-400'
                }`}>
                Research
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded transition-all uppercase ${agentStatus === 'critic' ? 'bg-rose-100 text-rose-700 animate-pulse font-bold' : 'bg-neutral-100 text-neutral-400'
                }`}>
                Critic
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded transition-all uppercase ${agentStatus === 'summary' ? 'bg-green-100 text-green-700 animate-pulse font-bold' : 'bg-neutral-100 text-neutral-400'
                }`}>
                Summary
              </span>
            </div>
          </div>

          {/* Messages & Streaming responses Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
                <div className="bg-green-50 text-[#16a34a] p-4 rounded-2xl">
                  <Brain className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold text-neutral-900">How can I assist your research?</h3>
                <p className="text-xs text-neutral-450 leading-relaxed font-semibold">
                  Enter a research query, and our multi-agent architecture will pull relevant context from your library and Google search to compile a complete cited analysis.
                </p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div key={index} className="space-y-2">

                  {/* User message */}
                  {message.role === 'user' && (
                    <div className="flex justify-end">
                      <div className="bg-neutral-100 text-neutral-900 rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[80%] text-xs sm:text-sm font-semibold">
                        {message.content}
                      </div>
                    </div>
                  )}

                  {/* Assistant response */}
                  {message.role === 'assistant' && (
                    <div className="space-y-4 max-w-[90%] text-left">

                      {/* Subtitle listing running agents */}
                      {message.agents && message.agents.length > 0 && (
                        <div className="flex items-center gap-1 text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                          <CheckCircle2 className="h-3 w-3 text-[#16a34a]" />
                          <span>Generated by {message.agents.join(' → ')}</span>
                        </div>
                      )}

                      {/* Main response body */}
                      <div className="prose prose-neutral text-xs sm:text-sm text-neutral-850 leading-relaxed bg-white border border-neutral-150 rounded-2xl rounded-tl-sm p-4 shadow-sm whitespace-pre-wrap font-medium">
                        {message.content || (message.isStreaming && 'Agent initialization...')}
                        {message.isStreaming && (
                          <span className="inline-block w-1.5 h-4 bg-[#16a34a] ml-0.5 animate-pulse" />
                        )}
                      </div>

                      {/* Citations list (Only shown after streaming is done) */}
                      {!message.isStreaming && message.sources && message.sources.length > 0 && (
                        <div className="space-y-1.5 text-left">
                          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Sources & Citations</p>
                          <div className="flex flex-wrap gap-2">
                            {message.sources.map(src => (
                              <div
                                key={src.id}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-50 border border-neutral-200 text-neutral-700 text-xs font-semibold"
                              >
                                {src.type === 'PDF' ? <BookOpen className="h-3 w-3 text-rose-500" /> : <Globe className="h-3 w-3 text-green-600" />}
                                <span className="max-w-[150px] truncate">{src.name}</span>
                                <span className="text-[9px] font-extrabold text-neutral-400">{src.matchScore}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions row: report, feedback, regenerate */}
                      {!message.isStreaming && (
                        <div className="flex items-center justify-between border-t border-neutral-100 pt-3">

                          {/* Left: Feedback & regenerate */}
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleFeedback(5, 'Excellent helpful response')}
                              className="p-1.5 text-neutral-400 hover:text-[#16a34a] rounded-md hover:bg-neutral-50 transition-all cursor-pointer" 
                              title="Thumbs Up"
                            >
                              <ThumbsUp className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleFeedback(1, 'Inaccurate details or citations')}
                              className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-md hover:bg-neutral-50 transition-all cursor-pointer" 
                              title="Thumbs Down"
                            >
                              <ThumbsDown className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => submitQuery(messages[index - 1]?.content ?? '')}
                              className="p-1.5 text-neutral-400 hover:text-neutral-800 rounded-md hover:bg-neutral-50 transition-all flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                              title="Regenerate"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              <span>Regenerate</span>
                            </button>
                          </div>

                          {/* Right: Generate Full Report */}
                          <button
                            onClick={() => navigate('/reports')}
                            className="bg-neutral-900 hover:bg-neutral-850 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span>Create Full Report</span>
                          </button>
                        </div>
                      )}

                      {/* Follow-up suggestions */}
                      {!message.isStreaming && message.suggestions && (
                        <div className="space-y-2 pt-2 border-t border-dashed border-neutral-100 text-left">
                          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Suggested follow-ups</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {message.suggestions.map(sug => (
                              <button
                                key={sug.id}
                                onClick={() => submitQuery(sug.question)}
                                className="text-left text-xs text-neutral-700 bg-neutral-50 hover:bg-green-50/50 hover:text-green-800 p-2.5 rounded-xl border border-neutral-150 transition-all font-semibold flex items-center justify-between group cursor-pointer"
                              >
                                <span className="truncate">{sug.question}</span>
                                <ChevronRight className="h-3.5 w-3.5 text-neutral-400 group-hover:text-[#16a34a] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                </div>
              ))
            )}
            <div ref={scrollRef} />
          </div>

          {/* Search/Chat Input Area */}
          <div className="border-t border-neutral-100 p-4 bg-white space-y-3">

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitQuery(query);
              }}
              className="flex items-center gap-3"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Ask a deep research question..."
                  value={query}
                  disabled={isStreaming}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-4 pr-12 py-3 border border-neutral-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-[#16a34a] bg-white transition-all text-neutral-900 placeholder-neutral-400 shadow-inner disabled:bg-neutral-100"
                />

                {/* Floating spinner if agents are parsing */}
                {isStreaming && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-neutral-405">
                    <Loader2 className="h-4.5 w-4.5 animate-spin text-[#16a34a]" />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={!query.trim() || isStreaming}
                className="bg-neutral-950 text-white hover:bg-neutral-850 disabled:bg-neutral-100 disabled:text-neutral-400 font-bold p-3 rounded-xl transition-all shadow-sm flex items-center justify-center cursor-pointer"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>

        </div>

      </div>
    </AppShell>
  );
};

export default ResearchPage;
