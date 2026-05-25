// ==========================================
// AUTH TYPES
// ==========================================

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  exp: number;
  iat: number;
}

// ==========================================
// CHAT TYPES
// ==========================================

export enum MessageRole {
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
  SYSTEM = 'SYSTEM',
}

export enum MessageStatus {
  PENDING = 'PENDING',
  STREAMING = 'STREAMING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR',
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  timestamp: string;
  sources?: Source[];
  reportId?: string;
  agentSteps?: AgentStep[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export interface StreamChunk {
  type: 'token' | 'source' | 'report' | 'done' | 'error';
  content: string;
  metadata?: any;
}

export interface ResearchQuery {
  query: string;
  sessionId?: string;
  includeExternal: boolean;
  maxSources: number;
}

// ==========================================
// DOCUMENT TYPES
// ==========================================

export enum DocumentType {
  PDF = 'PDF',
  WORD = 'WORD',
  EXCEL = 'EXCEL',
  TXT = 'TXT',
  URL = 'URL',
  YOUTUBE = 'YOUTUBE',
  TEXT = 'TEXT',
}

export enum DocumentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  FAILED = 'FAILED',
}

export interface Document {
  id: string;
  name: string;
  type: DocumentType;
  status: DocumentStatus;
  size?: number;
  url?: string;
  createdAt: string;
  updatedAt: string;
  chunkCount?: number;
  metadata?: Record<string, any>;
}

export interface UploadRequest {
  file: File;
  name?: string;
}

export interface IngestURLRequest {
  url: string;
  name?: string;
}

export interface IngestYouTubeRequest {
  url: string;
  name?: string;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  embedding?: number[];
  metadata?: Record<string, any>;
}

// ==========================================
// REPORT TYPES
// ==========================================

export enum ReportStatus {
  GENERATING = 'GENERATING',
  COMPLETE = 'COMPLETE',
  FAILED = 'FAILED',
}

export interface Source {
  id: string;
  title: string;
  url?: string;
  content: string;
  relevanceScore: number;
  documentId?: string;
  type: string;
}

export interface KeyFinding {
  id: string;
  title: string;
  description: string;
  importance: 'high' | 'medium' | 'low';
}

export interface ResearchReport {
  id: string;
  queryId: string;
  title: string;
  executiveSummary: string;
  keyFindings: KeyFinding[];
  sources: Source[];
  relatedTopics: string[];
  confidenceScore: number;
  status: ReportStatus;
  createdAt: string;
}

// ==========================================
// ANALYTICS TYPES
// ==========================================

export interface RAGASMetrics {
  faithfulness: number;
  answerRelevance: number;
  contextRelevance: number;
  timestamp: string;
}

export interface CostMetrics {
  totalCost: number;
  costPerRequest: number;
  tokensUsed: number;
  requestCount: number;
}

export interface LatencyMetrics {
  avgLatency: number;
  p95Latency: number;
  p99Latency: number;
  firstTokenLatency: number;
}

export interface CacheMetrics {
  hitRate: number;
  totalHits: number;
  totalMisses: number;
  savedCost: number;
}

export interface AnalyticsDashboard {
  ragas: RAGASMetrics;
  cost: CostMetrics;
  latency: LatencyMetrics;
  cache: CacheMetrics;
}

// ==========================================
// AGENTS TYPES
// ==========================================

export enum AgentName {
  RETRIEVAL = 'RETRIEVAL',
  RESEARCH = 'RESEARCH',
  CRITIC = 'CRITIC',
  SUMMARY = 'SUMMARY',
  MEMORY = 'MEMORY',
}

export enum AgentStatus {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  COMPLETE = 'COMPLETE',
  FAILED = 'FAILED',
}

export interface AgentStep {
  agent: AgentName;
  status: AgentStatus;
  startTime: string;
  endTime?: string;
  result?: string;
  error?: string;
}

export interface PipelineStatus {
  sessionId: string;
  steps: AgentStep[];
  overallStatus: AgentStatus;
  totalLatency?: number;
}

// ==========================================
// API TYPES
// ==========================================

export interface APIResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export interface APIError {
  success: false;
  error: string;
  code: number;
  details?: any;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ==========================================
// UI TYPES
// ==========================================

export enum ToastType {
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  WARNING = 'WARNING',
  INFO = 'INFO',
}

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

export interface ModalState {
  isOpen: boolean;
  type?: string;
  data?: any;
}

export interface SidebarState {
  isCollapsed: boolean;
  activeRoute: string;
}

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';
export type Theme = 'light';
