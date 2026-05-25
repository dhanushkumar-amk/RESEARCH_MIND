export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  ONBOARDING: '/onboarding',
  DASHBOARD: '/dashboard',
  RESEARCH: '/research',
  LIBRARY: '/library',
  REPORT: '/report/:id',
  ANALYTICS: '/analytics',
  SETTINGS: '/settings',
  NOT_FOUND: '*',
} as const

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
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
    description: 'Searches vector database',
    color: '#3B82F6',
    icon: 'Database',
  },
  {
    name: 'RESEARCH',
    label: 'Research Agent',
    description: 'Fetches external sources',
    color: '#8B5CF6',
    icon: 'Globe',
  },
  {
    name: 'CRITIC',
    label: 'Critic Agent',
    description: 'Validates answer quality',
    color: '#F59E0B',
    icon: 'ShieldCheck',
  },
  {
    name: 'SUMMARY',
    label: 'Summary Agent',
    description: 'Generates research report',
    color: '#10B981',
    icon: 'FileText',
  },
  {
    name: 'MEMORY',
    label: 'Memory Agent',
    description: 'Manages conversation context',
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
    USER: ['auth', 'user'] as const,
  },
  DOCUMENTS: {
    ALL: ['documents'] as const,
    DETAIL: (id: string) => ['documents', id] as const,
  },
  REPORTS: {
    ALL: ['reports'] as const,
    DETAIL: (id: string) => ['reports', id] as const,
  },
  ANALYTICS: {
    METRICS: ['analytics', 'metrics'] as const,
    HEALTH: ['analytics', 'health'] as const,
  },
  CHAT: {
    SESSIONS: ['chat', 'sessions'] as const,
    SESSION: (id: string) => ['chat', 'sessions', id] as const,
  },
} as const

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
