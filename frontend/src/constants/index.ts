export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  VERIFY_OTP: '/verify-otp',
  RESET_PASSWORD: '/reset-password',
  ONBOARDING: '/onboarding',
  DASHBOARD: '/dashboard',
  RESEARCH: '/research',
  LIBRARY: '/library',
  REPORT: '/report/:id',
  ANALYTICS: '/analytics',
  SETTINGS: '/settings',
  PROFILE: '/profile',
  SOURCE_DETAIL: '/source/:id',
  HISTORY: '/history',
  PRICING: '/pricing',
  HELP: '/help',
  ERROR: '/error',
  NOT_FOUND: '*',
} as const

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    VERIFY_EMAIL: '/auth/verify-email',
    RESEND_VERIFICATION: '/auth/resend-verification',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
    FORGOT_PASSWORD: '/auth/forgot-password',
    VERIFY_RESET_CODE: '/auth/verify-reset-code',
    RESET_PASSWORD: '/auth/reset-password',
  },
  CHAT: {
    SEND: '/chat',
    STREAM: '/chat/stream',
    HISTORY: '/chat/history',
    SESSION: '/chat/session/:id',
  },
  DOCUMENTS: {
    UPLOAD: '/upload',
    INGEST_URL: '/ingest/url',
    INGEST_YOUTUBE: '/ingest/youtube',
    LIST: '/sources',
    DELETE: '/sources/:id',
  },
  REPORTS: {
    GET: '/report/:id',
    LIST: '/reports',
  },
  ANALYTICS: {
    METRICS: '/metrics',
    HEALTH: '/health',
  },
} as const

export const NAV_ITEMS = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: 'LayoutDashboard',
    description: 'Overview and stats',
  },
  {
    label: 'Research',
    path: '/research',
    icon: 'Search',
    description: 'Ask research questions',
  },
  {
    label: 'Library',
    path: '/library',
    icon: 'BookOpen',
    description: 'Manage documents',
  },
  {
    label: 'Reports',
    path: '/reports',
    icon: 'FileText',
    description: 'Research report viewer',
  },
  {
    label: 'History',
    path: '/history',
    icon: 'Clock',
    description: 'Past sessions log',
  },
  {
    label: 'Analytics',
    path: '/analytics',
    icon: 'BarChart2',
    description: 'Metrics and monitoring',
  },
  {
    label: 'Settings',
    path: '/settings',
    icon: 'Settings',
    description: 'App configuration',
  },
  {
    label: 'Pricing',
    path: '/pricing',
    icon: 'CreditCard',
    description: 'SaaS subscription plans',
  },
  {
    label: 'Help / FAQ',
    path: '/help',
    icon: 'HelpCircle',
    description: 'Support and documentation',
  },
] as const

export const APP_CONFIG = {
  MAX_FILE_SIZE_MB: 50,
  MAX_FILE_SIZE_BYTES: 52428800,
  SUPPORTED_FILE_TYPES: ['.pdf', '.docx', '.xlsx', '.txt'],
  SUPPORTED_MIME_TYPES: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
  ],
  MAX_QUERY_LENGTH: 2000,
  MIN_QUERY_LENGTH: 10,
  MAX_SOURCES_PER_QUERY: 10,
  DEFAULT_SOURCES_PER_QUERY: 5,
  STREAM_TIMEOUT_MS: 60000,
  CACHE_STALE_TIME_MS: 300000,
  TOKEN_BUDGET_TOTAL: 8000,
} as const

export const AGENT_CONFIG = [
  {
    name: 'RETRIEVAL',
    label: 'Retrieval Agent',
    description: 'Searches vector database for relevant chunks',
    color: '#3B82F6',
    icon: 'Database',
  },
  {
    name: 'RESEARCH',
    label: 'Research Agent',
    description: 'Fetches real-time data from external sources',
    color: '#8B5CF6',
    icon: 'Globe',
  },
  {
    name: 'CRITIC',
    label: 'Critic Agent',
    description: 'Validates and scores answer quality',
    color: '#F59E0B',
    icon: 'ShieldCheck',
  },
  {
    name: 'SUMMARY',
    label: 'Summary Agent',
    description: 'Generates structured research report',
    color: '#10B981',
    icon: 'FileText',
  },
  {
    name: 'MEMORY',
    label: 'Memory Agent',
    description: 'Manages conversation history and context',
    color: '#6B7280',
    icon: 'Brain',
  },
] as const

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Connection failed. Please check your internet.',
  AUTH_FAILED: 'Invalid email or password.',
  SESSION_EXPIRED: 'Your session expired. Please login again.',
  FILE_TOO_LARGE: 'File exceeds 50MB limit.',
  UNSUPPORTED_FILE: 'File type not supported.',
  QUERY_TOO_SHORT: 'Query must be at least 10 characters.',
  QUERY_TOO_LONG: 'Query must be under 2000 characters.',
  UPLOAD_FAILED: 'Document upload failed. Please try again.',
  STREAM_FAILED: 'Streaming interrupted. Please try again.',
  GENERIC_ERROR: 'Something went wrong. Please try again.',
} as const

export const QUERY_KEYS = {
  AUTH: {
    USER: ['auth', 'user'],
  },
  DOCUMENTS: {
    ALL: ['documents'],
    DETAIL: (id: string) => ['documents', id],
  },
  REPORTS: {
    ALL: ['reports'],
    DETAIL: (id: string) => ['reports', id],
  },
  ANALYTICS: {
    METRICS: ['analytics', 'metrics'],
    HEALTH: ['analytics', 'health'],
  },
  CHAT: {
    SESSIONS: ['chat', 'sessions'],
    SESSION: (id: string) => ['chat', 'sessions', id],
  },
}

export const FILE_ICONS = {
  pdf: 'FileText',
  docx: 'FileText',
  xlsx: 'Sheet',
  txt: 'File',
  url: 'Globe',
  youtube: 'Youtube',
  text: 'AlignLeft',
} as const

export const RAGAS_THRESHOLDS = {
  FAITHFULNESS_MIN: 0.85,
  ANSWER_RELEVANCE_MIN: 0.80,
  CONTEXT_RELEVANCE_MIN: 0.75,
  CACHE_HIT_TARGET: 0.40,
} as const

export const RAG_CONFIG = {
  EMBEDDING: {
    MODEL: 'all-MiniLM-L6-v2',
    DIMENSIONS: 384,
    BATCH_SIZE: 32,
  },
  CHUNKING: {
    CHUNK_SIZE: 512,
    CHUNK_OVERLAP: 50,
    MIN_CHUNK_SIZE: 100,
    MAX_CHUNK_SIZE: 1000,
    STRATEGY: 'semantic',
  },
  RETRIEVAL: {
    DEFAULT_TOP_K: 5,
    MAX_TOP_K: 20,
    MIN_SCORE_THRESHOLD: 0.5,
    BM25_WEIGHT: 0.3,
    VECTOR_WEIGHT: 0.7,
    RERANKER_TOP_N: 3,
  },
  SEARCH_TYPES: {
    VECTOR: 'vector',
    KEYWORD: 'keyword',
    HYBRID: 'hybrid',
  },
  CONTEXT_BUDGET: {
    TOTAL_TOKENS: 8000,
    SYSTEM_PROMPT_PCT: 0.20,
    CONVERSATION_HISTORY_PCT: 0.30,
    RETRIEVED_CONTEXT_PCT: 0.40,
    USER_QUERY_PCT: 0.10,
  },
} as const

export const MCP_TOOLS = [
  {
    id: 'tavily',
    name: 'Tavily Search',
    description: 'Real-time web search',
    category: 'search',
    icon: 'Globe',
    isEnabled: true,
  },
  {
    id: 'wikipedia',
    name: 'Wikipedia',
    description: 'Background knowledge base',
    category: 'knowledge',
    icon: 'BookOpen',
    isEnabled: true,
  },
  {
    id: 'arxiv',
    name: 'ArXiv',
    description: 'Academic research papers',
    category: 'academic',
    icon: 'GraduationCap',
    isEnabled: true,
  },
  {
    id: 'pubmed',
    name: 'PubMed',
    description: 'Medical and science papers',
    category: 'academic',
    icon: 'Microscope',
    isEnabled: true,
  },
  {
    id: 'hackernews',
    name: 'Hacker News',
    description: 'Tech discussions and news',
    category: 'community',
    icon: 'Code2',
    isEnabled: true,
  },
  {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    description: 'Web search fallback',
    category: 'search',
    icon: 'Search',
    isEnabled: true,
  },
  {
    id: 'youtube',
    name: 'YouTube Transcript',
    description: 'Video content extraction',
    category: 'media',
    icon: 'Youtube',
    isEnabled: true,
  },
  {
    id: 'reddit',
    name: 'Reddit',
    description: 'Community discussions',
    category: 'community',
    icon: 'MessageSquare',
    isEnabled: true,
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Code and technical docs',
    category: 'technical',
    icon: 'Github',
    isEnabled: true,
  },
  {
    id: 'newsapi',
    name: 'News API',
    description: 'Current news articles',
    category: 'news',
    icon: 'Newspaper',
    isEnabled: true,
  },
] as const

export const MCP_TOOL_CATEGORIES = {
  search: ['tavily', 'duckduckgo'],
  knowledge: ['wikipedia'],
  academic: ['arxiv', 'pubmed'],
  community: ['hackernews', 'reddit'],
  technical: ['github'],
  media: ['youtube'],
  news: ['newsapi'],
} as const

export const LLM_PROVIDERS = {
  GROQ: 'groq',
  GEMINI: 'gemini',
  OPENROUTER: 'openrouter',
  DEEPSEEK: 'deepseek',
  PERPLEXITY: 'perplexity',
} as const

export const LLM_FALLBACK_ORDER = [
  'groq',
  'gemini',
  'openrouter',
  'deepseek',
  'perplexity',
] as const

export const LLM_MODELS = [
  // Groq Models (5)
  {
    id: 'groq-llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B Versatile',
    provider: 'groq',
    contextWindow: 32768,
    isFreeTier: true,
    priority: 1,
  },
  {
    id: 'groq-llama3-70b',
    name: 'Groq Llama 3 70B',
    provider: 'groq',
    contextWindow: 8192,
    isFreeTier: true,
    priority: 2,
  },
  {
    id: 'groq-mixtral-8x7b',
    name: 'Groq Mixtral 8x7B',
    provider: 'groq',
    contextWindow: 32768,
    isFreeTier: true,
    priority: 3,
  },
  {
    id: 'groq-llama3-8b',
    name: 'Groq Llama 3 8B',
    provider: 'groq',
    contextWindow: 8192,
    isFreeTier: true,
    priority: 4,
  },
  {
    id: 'groq-gemma-7b',
    name: 'Groq Gemma 7B',
    provider: 'groq',
    contextWindow: 8192,
    isFreeTier: true,
    priority: 5,
  },

  // Gemini Models (3)
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'gemini',
    contextWindow: 2097152,
    isFreeTier: true,
    priority: 1,
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'gemini',
    contextWindow: 1048576,
    isFreeTier: true,
    priority: 2,
  },
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    provider: 'gemini',
    contextWindow: 30720,
    isFreeTier: true,
    priority: 3,
  },

  // OpenRouter Models (5)
  {
    id: 'openrouter-claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'openrouter',
    contextWindow: 200000,
    isFreeTier: false,
    priority: 1,
  },
  {
    id: 'openrouter-llama-3-70b',
    name: 'Llama 3 70B',
    provider: 'openrouter',
    contextWindow: 8192,
    isFreeTier: false,
    priority: 2,
  },
  {
    id: 'openrouter-gpt-4o',
    name: 'GPT-4o',
    provider: 'openrouter',
    contextWindow: 128000,
    isFreeTier: false,
    priority: 3,
  },
  {
    id: 'openrouter-command-r-plus',
    name: 'Command R+',
    provider: 'openrouter',
    contextWindow: 128000,
    isFreeTier: false,
    priority: 4,
  },
  {
    id: 'openrouter-mistral-large',
    name: 'Mistral Large',
    provider: 'openrouter',
    contextWindow: 32768,
    isFreeTier: false,
    priority: 5,
  },

  // DeepSeek Models (2)
  {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat',
    provider: 'deepseek',
    contextWindow: 64000,
    isFreeTier: false,
    priority: 1,
  },
  {
    id: 'deepseek-coder',
    name: 'DeepSeek Coder',
    provider: 'deepseek',
    contextWindow: 64000,
    isFreeTier: false,
    priority: 2,
  },

  // Perplexity Models (2)
  {
    id: 'perplexity-sonar-large',
    name: 'Sonar Large Online',
    provider: 'perplexity',
    contextWindow: 32768,
    isFreeTier: false,
    priority: 1,
  },
  {
    id: 'perplexity-sonar-medium',
    name: 'Sonar Medium Chat',
    provider: 'perplexity',
    contextWindow: 16384,
    isFreeTier: false,
    priority: 2,
  },
] as const

export const LLM_MODEL_COUNT = {
  groq: 5,
  gemini: 3,
  openrouter: 5,
  deepseek: 2,
  perplexity: 2,
  total: 17,
} as const

export const VECTOR_DB_CONFIG = {
  HOST: 'localhost',
  PORT: 6333,
  COLLECTION_NAME: 'researchmind',
  DISTANCE_METRIC: 'Cosine',
  VECTOR_SIZE: 384,
} as const

export const EVALUATION_CONFIG = {
  RAGAS: {
    FAITHFULNESS_THRESHOLD: 0.85,
    ANSWER_RELEVANCE_THRESHOLD: 0.80,
    CONTEXT_RELEVANCE_THRESHOLD: 0.75,
  },
  CRITIC_AGENT: {
    MIN_QUALITY_SCORE: 0.70,
    RETRY_THRESHOLD: 0.50,
    MAX_RETRIES: 2,
  },
} as const
