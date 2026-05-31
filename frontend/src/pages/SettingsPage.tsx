import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/constants';
import {
  Settings, Cpu, Database, ShieldAlert,
  RefreshCw, Bell, Key, Trash2, Shield, Info,
  CheckCircle, Loader2, AlertCircle
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import settingsApi, { UserSettings } from '@/api/settings';
import { useToast } from '@/hooks/useToast';

const SettingsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error, info } = useToast();

  // LLM Gateway settings
  const [primaryModel, setPrimaryModel] = useState('groq-llama-3.3-70b-versatile');
  const [maxTokens, setMaxTokens] = useState(4096);

  // RAG settings
  const [chunkSize, setChunkSize] = useState(512);
  const [chunkOverlap, setChunkOverlap] = useState(50);
  const [kValue, setKValue] = useState(5);
  const [reranking, setReranking] = useState(true);
  const [hybridWeight, setHybridWeight] = useState(70); // 70% vector, 30% BM25

  // Security Toggles
  const [guardrails, setGuardrails] = useState(true);
  const [piiDetection, setPiiDetection] = useState(false);
  const [topicFiltering, setTopicFiltering] = useState(true);

  // ETL Toggles
  const [nightlyRefresh, setNightlyRefresh] = useState(true);
  const [refreshTime, setRefreshTime] = useState('02:00');

  // Notification Toggles
  const [emailAlerts, setEmailAlerts] = useState(true);

  // Save feedback state
  const [isSaved, setIsSaved] = useState(false);
  const [isWiping, setIsWiping] = useState(false);

  // 1. Fetch settings from backend
  const { data: settingsData, isLoading, refetch } = useQuery<UserSettings, Error>({
    queryKey: ['userSettings'],
    queryFn: settingsApi.getSettings,
  });

  // Sync state with fetched settings
  useEffect(() => {
    if (settingsData) {
      if (settingsData.llm_preference) {
        setPrimaryModel(settingsData.llm_preference);
      }
      setEmailAlerts(settingsData.notifications_enabled ?? true);
    }
  }, [settingsData]);

  // 2. Update settings mutation
  const saveMutation = useMutation({
    mutationFn: settingsApi.updateSettings,
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['userSettings'] });
      setIsSaved(true);
      success('Settings saved successfully');
      setTimeout(() => setIsSaved(false), 3000);
    },
    onError: (err: any) => {
      error(err.response?.data?.detail || err.message || 'Failed to save settings');
    }
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    void saveMutation.mutateAsync({
      llm_preference: primaryModel,
      notifications_enabled: emailAlerts,
    });
  };

  const handleWipeData = async () => {
    const confirmed = confirm(
      'WARNING: This will permanently delete all your documents, search history, RAGAS scores, and session logs. This action is IRREVERSIBLE. Are you sure you want to proceed?'
    );

    if (confirmed) {
      setIsWiping(true);
      info('Purging workspace database...');
      try {
        await settingsApi.deleteAllData();
        success('All database histories and records deleted successfully.');
        // Clear local credentials and redirect
        localStorage.clear();
        window.location.href = '/login';
      } catch (err: any) {
        error(err.response?.data?.detail || err.message || 'Wipe operation failed');
      } finally {
        setIsWiping(false);
      }
    }
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="h-[70vh] flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#16a34a]" />
          <p className="text-xs font-semibold text-neutral-500">Loading user preferences...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-[1000px] mx-auto space-y-6 lg:space-y-8 font-sans antialiased">

        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-neutral-900 tracking-tight">
              Settings & Configurations
            </h1>
            <p className="text-sm text-neutral-500 mt-1 font-medium">
              Configure ResearchMind models routing, retrieval indices parameters, and security policies.
            </p>
          </div>

          {isSaved && (
            <div className="flex items-center gap-1.5 bg-green-50 border border-green-100 text-[#16a34a] px-3 py-1.5 rounded-lg text-xs font-bold animate-fade-in">
              <CheckCircle className="h-4 w-4 text-[#16a34a]" />
              <span>Configurations Saved!</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-6">

          {/* 1. Profile Settings Redirect Banner */}
          <div className="bg-gradient-to-r from-green-50/50 to-emerald-50/20 border border-neutral-200 rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="bg-[#16a34a] text-white p-2 rounded-lg mt-0.5 shadow-[0_4px_10px_rgba(22,163,74,0.15)] flex-shrink-0">
                <Cpu className="h-4.5 w-4.5 text-white" />
              </div>
              <div className="space-y-0.5">
                <h3 className="font-bold text-sm text-neutral-900">Personal Profile Settings</h3>
                <p className="text-xs text-neutral-500 font-medium">
                  Update your display name, contact email, profile picture, and professional bio on the dedicated Profile page.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate(ROUTES.PROFILE)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg text-xs transition-colors shrink-0 cursor-pointer shadow-sm"
            >
              Go to Profile
            </button>
          </div>

          {/* 2. LLM Gateway settings */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4">
            <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
              <Cpu className="h-4.5 w-4.5 text-[#16a34a]" />
              <h2 className="font-bold text-sm text-neutral-900">LLM Gateway Routing (LiteLLM)</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-600">Primary Model Selection</label>
                <select
                  value={primaryModel}
                  onChange={(e) => setPrimaryModel(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#16a34a] bg-white text-neutral-705 cursor-pointer"
                >
                  <option value="groq-llama-3.3-70b-versatile">Llama 3.3 70B Versatile (Groq - Default)</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro (Google)</option>
                  <option value="openrouter-claude-3-5-sonnet">Claude 3.5 Sonnet (Anthropic via OpenRouter)</option>
                  <option value="deepseek-chat">DeepSeek Chat V3</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-600">Max Tokens Limit per request</label>
                <input
                  type="number"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value) || 2048)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#16a34a] bg-white text-neutral-900"
                />
              </div>
            </div>

            {/* Fallback chain guide */}
            <div className="bg-neutral-50 border border-neutral-150 rounded-xl p-3 space-y-1.5">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Automatic Fallback Chain Order</span>
              <p className="text-xs text-neutral-600 font-semibold">
                Groq (Llama 3.3) → Gemini 1.5 Pro → OpenRouter (Claude 3.5) → DeepSeek V3
              </p>
              <p className="text-[10px] text-neutral-450 leading-relaxed font-semibold">
                If the primary provider experiences connection timeouts or rate limit failures, the request automatically falls back to secondary sources.
              </p>
            </div>
          </div>

          {/* 3. RAG parameters settings */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4">
            <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
              <Database className="h-4.5 w-4.5 text-[#16a34a]" />
              <h2 className="font-bold text-sm text-neutral-900">Retrieval & Indexing Settings (RAG)</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-600">Chunk Size (Tokens)</label>
                <input
                  type="number"
                  value={chunkSize}
                  onChange={(e) => setChunkSize(parseInt(e.target.value) || 256)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#16a34a] bg-white text-neutral-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-600">Chunk Overlap (Tokens)</label>
                <input
                  type="number"
                  value={chunkOverlap}
                  onChange={(e) => setChunkOverlap(parseInt(e.target.value) || 10)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#16a34a] bg-white text-neutral-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-600">Top-k Results (Retrieval k)</label>
                <input
                  type="number"
                  value={kValue}
                  onChange={(e) => setKValue(parseInt(e.target.value) || 3)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#16a34a] bg-white text-neutral-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1.5">
              {/* Reranking switch */}
              <div className="flex items-center justify-between p-2 bg-neutral-50 rounded-xl border border-neutral-100">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-neutral-755">Rerank Retrieved Chunks</span>
                  <p className="text-[10px] text-neutral-450 font-semibold">Runs FlashRank reranker to filter out low-match text</p>
                </div>
                <input
                  type="checkbox"
                  checked={reranking}
                  onChange={(e) => setReranking(e.target.checked)}
                  className="w-8 h-4 rounded-full border-neutral-350 text-[#16a34a] focus:ring-green-500/10 cursor-pointer"
                />
              </div>

              {/* Hybrid search weights */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-neutral-605">
                  <span>Hybrid Weights Selection</span>
                  <span>{hybridWeight}% Vector vs {100 - hybridWeight}% BM25</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={hybridWeight}
                  onChange={(e) => setHybridWeight(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-neutral-100 rounded-lg appearance-none cursor-pointer accent-[#16a34a]"
                />
              </div>
            </div>
          </div>

          {/* 4. Security guardrails */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4">
            <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
              <Shield className="h-4.5 w-4.5 text-[#16a34a]" />
              <h2 className="font-bold text-sm text-neutral-900">Security Guardrails & Filters</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl border border-neutral-100 cursor-pointer select-none">
                <div className="space-y-0.5 pr-2">
                  <p className="text-xs font-bold text-neutral-750">LLM Guardrails</p>
                  <p className="text-[9px] text-neutral-455 leading-tight font-semibold">Enforces safe output bounds</p>
                </div>
                <input
                  type="checkbox"
                  checked={guardrails}
                  onChange={(e) => setGuardrails(e.target.checked)}
                  className="rounded border-neutral-350 text-[#16a34a] focus:ring-green-500/10 h-4 w-4 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl border border-neutral-100 cursor-pointer select-none">
                <div className="space-y-0.5 pr-2">
                  <p className="text-xs font-bold text-neutral-750">PII De-identification</p>
                  <p className="text-[9px] text-neutral-455 leading-tight font-semibold">Scrubs names, emails, phones</p>
                </div>
                <input
                  type="checkbox"
                  checked={piiDetection}
                  onChange={(e) => setPiiDetection(e.target.checked)}
                  className="rounded border-neutral-350 text-[#16a34a] focus:ring-green-500/10 h-4 w-4 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl border border-neutral-100 cursor-pointer select-none">
                <div className="space-y-0.5 pr-2">
                  <p className="text-xs font-bold text-neutral-755">Topic Filtering</p>
                  <p className="text-[9px] text-neutral-455 leading-tight font-semibold">Blocks non-research topics</p>
                </div>
                <input
                  type="checkbox"
                  checked={topicFiltering}
                  onChange={(e) => setTopicFiltering(e.target.checked)}
                  className="rounded border-neutral-350 text-[#16a34a] focus:ring-green-500/10 h-4 w-4 cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* 5. ETL settings & Notification settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* ETL Sync configurations */}
            <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4">
              <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
                <RefreshCw className="h-4.5 w-4.5 text-[#16a34a]" />
                <h2 className="font-bold text-sm text-neutral-900">ETL Refresh Configurations</h2>
              </div>

              <div className="flex items-center justify-between py-1">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-neutral-750">Nightly Data Refresh</p>
                  <p className="text-[10px] text-neutral-450 font-semibold">Triggers re-parsing of failed URL pages</p>
                </div>
                <input
                  type="checkbox"
                  checked={nightlyRefresh}
                  onChange={(e) => setNightlyRefresh(e.target.checked)}
                  className="w-8 h-4 rounded-full border-neutral-350 text-[#16a34a] focus:ring-green-500/10 cursor-pointer"
                />
              </div>

              {nightlyRefresh && (
                <div className="space-y-1.5 pt-1.5 border-t border-neutral-50">
                  <label className="text-xs font-bold text-neutral-600">Daily Trigger Time</label>
                  <input
                    type="time"
                    value={refreshTime}
                    onChange={(e) => setRefreshTime(e.target.value)}
                    className="px-3 py-1.5 border border-neutral-200 rounded-lg text-xs bg-white text-neutral-705 cursor-pointer w-full"
                  />
                </div>
              )}
            </div>

            {/* Notifications */}
            <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4">
              <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
                <Bell className="h-4.5 w-4.5 text-[#16a34a]" />
                <h2 className="font-bold text-sm text-neutral-900">Workspace Alerts</h2>
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-neutral-755">Email Alerts</p>
                  <p className="text-[10px] text-neutral-455 font-semibold">Get summaries of compiled research reports</p>
                </div>
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="w-8 h-4 rounded-full border-neutral-350 text-[#16a34a] focus:ring-green-500/10 cursor-pointer"
                />
              </div>
            </div>

          </div>

          {/* 6. LLMGate API key display */}
          <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4">
            <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
              <Key className="h-4.5 w-4.5 text-[#16a34a]" />
              <h2 className="font-bold text-sm text-neutral-900">Developer Integrations</h2>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-600">LLMGate Router Key</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value="sk-llmgate-f823a9d72b2203e0c0"
                  readOnly
                  className="flex-1 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs text-neutral-500 font-mono animate-pulse"
                />
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText('sk-llmgate-f823a9d72b2203e0c0');
                    info('Copied sk-llmgate key to clipboard');
                  }}
                  className="bg-white border border-neutral-200 hover:border-neutral-350 text-neutral-705 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Copy
                </button>
              </div>
              <p className="text-[10px] text-neutral-400 mt-1 font-semibold">Used to authenticates client API calls via custom MCP micro-services.</p>
            </div>
          </div>

          {/* 7. Danger zone */}
          <div className="bg-red-50/30 border border-red-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-red-200 pb-3">
              <ShieldAlert className="h-4.5 w-4.5 text-red-650" />
              <h2 className="font-bold text-sm text-red-755">Danger Zone</h2>
            </div>

            <p className="text-xs text-neutral-600 leading-normal font-semibold">
              Irreversible actions that purge indices, database records, and authentication states from local storage.
            </p>

            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={handleWipeData}
                disabled={isWiping}
                className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg text-xs cursor-pointer transition-colors shadow-sm disabled:opacity-50"
              >
                {isWiping ? 'Wiping Database...' : 'Wipe All Workspace Data'}
              </button>
            </div>
          </div>

          {/* Form Submit Row */}
          <div className="flex justify-end pt-3">
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="bg-neutral-950 hover:bg-neutral-850 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {saveMutation.isPending ? 'Saving...' : 'Save Configurations'}
            </button>
          </div>

        </form>

      </div>
    </AppShell>
  );
};

export default SettingsPage;
