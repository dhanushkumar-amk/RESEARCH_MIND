<div align="center">

# 🧠 ResearchMind

**Production-Grade AI Deep Research Agent Workspace**

> An intelligent research platform that combines internal document knowledge with real-time external research using a 5-agent LangGraph system, hybrid RAG pipeline, and 10 specialized MCP tools.

[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.x-61DAFB?style=flat&logo=react)](https://react.dev)
[![LangGraph](https://img.shields.io/badge/LangGraph-Multi--Agent-FF6B35?style=flat)](https://langchain-ai.github.io/langgraph)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat&logo=mongodb)](https://www.mongodb.com)
[![LiteLLM](https://img.shields.io/badge/LiteLLM-10--Model%20Fallback-7C3AED?style=flat)](https://litellm.ai)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python)](https://python.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.x-3178C6?style=flat&logo=typescript)](https://typescriptlang.org)

</div>

---

## 📋 Table of Contents

1. [What is ResearchMind?](#1-what-is-researchmind)
2. [Problem It Solves](#2-problem-it-solves)
3. [Key Features](#3-key-features)
4. [Tech Stack](#4-tech-stack)
5. [High-Level Design (HLD)](#5-high-level-design-hld)
6. [Low-Level Design (LLD)](#6-low-level-design-lld)
7. [System Architecture](#7-system-architecture)
8. [Data Flow Diagram](#8-data-flow-diagram)
9. [Sequence Diagrams](#9-sequence-diagrams)
10. [Database Schema](#10-database-schema)
11. [API Reference](#11-api-reference)
12. [Project Structure](#12-project-structure)
13. [Getting Started](#13-getting-started)
14. [Environment Variables](#14-environment-variables)
15. [Security Architecture](#15-security-architecture)
16. [RAG Pipeline](#16-rag-pipeline)
17. [Agent System](#17-agent-system)
18. [MCP Research Tools](#18-mcp-research-tools)
19. [Evaluation & Monitoring](#19-evaluation--monitoring)
20. [Performance Targets](#20-performance-targets)

---

## 1. What is ResearchMind?

ResearchMind is a **production-grade AI research workspace** that allows users to:

- Upload documents (PDF, DOCX, XLSX, TXT), paste URLs, or ingest YouTube videos
- Ask deep research questions answered from both **internal document knowledge** and **real-time external sources**
- Receive answers powered by a **5-agent LangGraph pipeline** with quality scoring
- View structured **research reports** with source citations
- Get responses **streamed token-by-token** via Server-Sent Events (SSE)

The system is designed for **zero-cost operation** using free-tier LLM providers, local embeddings, and a 10-model fallback chain to guarantee 99.9% uptime.

---

## 2. Problem It Solves

| Problem | Solution |
|---|---|
| Searching multiple sources manually | 10 MCP tools search automatically in parallel |
| Reading entire documents for one answer | RAG retrieves only relevant chunks |
| LLM hallucinations and fabrications | Critic Agent + RAGAS faithfulness scoring |
| No source grounding | Every answer has inline source citations |
| Repeated expensive LLM API calls | Semantic cache — up to 80% cost reduction |
| Pipeline breakdowns in production | 10-model fallback chain — 99.9% uptime |
| Prompt injection & jailbreaks | Multi-layer input/output security guards |
| Large conversation context overflow | Token budget + ConversationSummaryMemory |

---

## 3. Key Features

| # | Feature | Description |
|---|---|---|
| 1 | **Document Ingestion** | PDF, Word, Excel, TXT, URLs, YouTube transcripts |
| 2 | **Hybrid RAG Pipeline** | BM25 + Vector search + Cross-encoder reranking |
| 3 | **5-Agent LangGraph System** | Retrieval, Research, Critic, Summary, Memory agents |
| 4 | **10 MCP Research Tools** | Tavily, ArXiv, PubMed, Wikipedia, GitHub, Reddit, HackerNews, DuckDuckGo, YouTube, NewsAPI |
| 5 | **LiteLLM Gateway** | 10-model fallback chain with Groq, Gemini, OpenRouter |
| 6 | **Security Layer** | Input/Output guardrails, prompt injection defense, PII scrubbing |
| 7 | **Context Engineering** | Token budget (8K), sliding window, ConversationSummaryMemory |
| 8 | **RAGAS Evaluation** | Faithfulness, Answer Relevance, Context Relevance scoring |
| 9 | **SSE Streaming** | Real-time token-by-token response delivery |
| 10 | **Research Reports** | Structured executive summaries with citations |

---

## 4. Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4 | UI and streaming display |
| **Backend** | FastAPI, Python 3.11+, Uvicorn | REST API and SSE |
| **Agents** | LangGraph | Multi-agent workflow orchestration |
| **RAG** | LangChain LCEL | Retrieval-augmented generation pipeline |
| **Vector DB** | MongoDB Atlas Vector Search | Semantic document search |
| **Keyword Search** | BM25Retriever (in-memory) | Lexical document search |
| **Embeddings** | HuggingFace `all-MiniLM-L6-v2` (local) | Zero-cost document embedding |
| **Reranker** | `cross-encoder/ms-marco-MiniLM-L-6-v2` (local) | Cross-encoder reranking |
| **LLM Gateway** | LiteLLM + LangChain | 10-model fallback routing |
| **Primary LLM** | Groq `llama-3.3-70b-versatile` | Fast free-tier inference |
| **Fallback LLMs** | OpenRouter (8 models) + Gemini | Failover chain |
| **Database** | MongoDB Atlas (async via Motor) | Primary persistence layer |
| **File Storage** | AWS S3 | Raw document storage |
| **Auth** | JWT (access + refresh tokens), bcrypt | Stateless authentication |
| **Email** | Resend API / SMTP | OTP verification, password reset |
| **Security** | Custom guardrails pipeline | Prompt injection, jailbreak, PII |
| **Evaluation** | RAGAS + LangSmith | Quality scoring and tracing |
| **Rate Limiting** | SlowAPI + Upstash Redis | Per-user request throttling |
| **Task Scheduler** | APScheduler | Nightly document re-ingestion |
| **ETL** | pdfplumber, python-docx, BeautifulSoup | Document text extraction |

---

## 5. High-Level Design (HLD)

### System Components Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER BROWSER                             │
│                   React 19 + TypeScript SPA                     │
│  Pages: Landing, Auth, Dashboard, Research, Library, Reports    │
│  Real-time SSE streaming | React Query | Zustand state          │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTPS / REST + SSE
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FASTAPI BACKEND                            │
│                       (Python 3.11+)                            │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │   Auth   │  │ Sources  │  │   Chat   │  │    Agents     │  │
│  │  Routes  │  │  Routes  │  │  Routes  │  │    Routes     │  │
│  └──────────┘  └──────────┘  └──────────┘  └───────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              SECURITY GUARD PIPELINE                    │   │
│  │  Input: Injection → Jailbreak → Topic → PII            │   │
│  │  Output: PII → Toxicity → Hallucination → Length       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │            HYBRID RAG PIPELINE (LCEL)                   │   │
│  │  BM25 + Vector → EnsembleRRF → Cross-Encoder → Context │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │           5-AGENT LANGGRAPH WORKFLOW                    │   │
│  │  Retrieval ║ Research → Critic → Summary → Memory       │   │
│  └─────────────────────────────────────────────────────────┘   │
└──────┬─────────────────┬──────────────────┬────────────────────┘
       │                 │                  │
       ▼                 ▼                  ▼
┌────────────┐   ┌──────────────┐   ┌──────────────────┐
│  MongoDB   │   │   AWS S3     │   │  LiteLLM Gateway │
│   Atlas    │   │  (Raw Files) │   │  10-Model Chain  │
│  Vector    │   │              │   │  Groq→OpenRouter │
│  Search    │   └──────────────┘   │  →Gemini         │
└────────────┘                      └──────────────────┘
                                            │
                                            ▼
                                   ┌──────────────────┐
                                   │  External LLMs   │
                                   │  Groq, Gemini,   │
                                   │  OpenRouter      │
                                   └──────────────────┘
```

### HLD Component Responsibilities

| Component | Responsibility |
|---|---|
| **React SPA** | User interaction, streaming display, state management |
| **FastAPI** | HTTP routing, SSE, request validation, auth middleware |
| **Security Pipeline** | Pre-execution input filtering, post-execution output validation |
| **RAG Pipeline (LCEL)** | Hybrid retrieval, reranking, context assembly |
| **LangGraph Agents** | Parallel research, quality evaluation, report synthesis |
| **MongoDB Atlas** | User data, documents, chunks, vector embeddings, sessions |
| **AWS S3** | Raw uploaded file storage |
| **LiteLLM Gateway** | Unified LLM interface with automatic fallback |
| **RAGAS** | Quality evaluation of every response |
| **LangSmith** | Full pipeline observability and tracing |

---

## 6. Low-Level Design (LLD)

### 6.1 Authentication Flow (LLD)

```
POST /auth/register
 └── AuthService.register()
      ├── validate(email, password)
      ├── bcrypt.hash(password, rounds=12)
      ├── db.users.insert_one({email, hashed_password, is_email_verified: false})
      ├── generate_otp(6 digits, expires_in=10min)
      ├── db.email_verifications.insert_one()
      └── EmailService.send_otp(email)

POST /auth/verify-email
 └── AuthService.verify_email()
      ├── db.email_verifications.find_one({email, code, expires_at: {$gt: now}})
      ├── db.users.update_one({is_email_verified: true})
      ├── generate_access_token(user_id, expires=60min)
      ├── generate_refresh_token(jti=uuid, expires=7days)
      ├── db.refresh_tokens.insert_one({jti, user_id, expires_at})
      └── return {access_token, refresh_token}

GET /api/* (protected)
 └── get_current_user() dependency
      ├── extract Bearer token from Authorization header
      ├── jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
      ├── db.users.find_one({_id: user_id})
      └── return user document
```

### 6.2 Document Ingestion Pipeline (LLD)

```
POST /upload (multipart/form-data)
 └── upload_document()
      ├── validate file extension (.pdf, .docx, .xlsx, .txt)
      ├── s3_service.upload_file(file, s3_key)
      ├── db.sources.insert_one({status: "uploaded"})
      └── background_tasks.add_task(run_ingestion_pipeline)

run_ingestion_pipeline(source_id, user_id, file_bytes, file_type)
 ├── Status: "extracting"
 │    └── ExtractorService.extract_text(bytes, file_type)
 │         ├── PDF  → pdfplumber → [{text, page_number}]
 │         ├── DOCX → python-docx → [{text, page_number}]
 │         ├── XLSX → openpyxl → [{text, page_number}]
 │         └── TXT  → direct read → [{text, page_number: 1}]
 │
 ├── Status: "chunking"
 │    └── ChunkerService.split_text(pages)
 │         ├── RecursiveCharacterTextSplitter
 │         │    chunk_size=512, overlap=50
 │         └── → [{text, page_number, chunk_index}]
 │
 ├── Status: "embedding"
 │    └── EmbeddingService.get_embeddings(chunk_texts)
 │         └── SentenceTransformer("all-MiniLM-L6-v2").encode()
 │              → [[384-dim float vector], ...]
 │
 ├── Status: "indexing"
 │    └── VectorService.save_chunks(source_id, user_id, chunks, embeddings)
 │         └── db.chunks.insert_many([{
 │               text, embedding (384-d), source_id, user_id,
 │               page_number, chunk_index, metadata
 │             }])
 │
 ├── Status: "indexed"
 └── init_bm25_retriever()  ← refresh in-memory BM25 index
```

### 6.3 Chat / RAG Pipeline (LLD)

```
GET /chat/stream?query=...&session_id=...
 └── chat_stream()
      ├── Security: execute_input_guards()
      ├── queue = asyncio.Queue()
      ├── callback = SSEStreamingCallbackHandler(queue)
      │
      └── LCEL Chain: lcel_chain.ainvoke(inputs)
           │
           ├── retrieval_step (RunnableParallel)
           │    ├── search_vector_async()
           │    │    ├── get_vector_store() [lazy, cached]
           │    │    └── MongoDBAtlasVectorSearch.asimilarity_search_with_score(query, k=20)
           │    │         pre_filter: {user_id, source_id: $in}
           │    │
           │    └── search_bm25_async()
           │         ├── get_user_bm25_retriever(user_id) [in-memory cache]
           │         └── BM25Retriever.invoke(query, k=20)
           │
           ├── hybrid_step (merge_hybrid_results)
           │    └── EnsembleRetriever(weights=[0.6, 0.4])
           │         └── Reciprocal Rank Fusion → top 20 docs
           │
           ├── rerank_step (rerank_step_runnable)
           │    └── CrossEncoderReranker [lazy, cached]
           │         model: cross-encoder/ms-marco-MiniLM-L-6-v2
           │         → top 5 reranked docs
           │
           ├── context_step (build_context_runnable)
           │    ├── format_chunks_with_lost_in_the_middle(docs, 3200 tokens)
           │    │    └── "Lost in the Middle" reordering
           │    ├── queue.put_nowait({event: "sources", ...})
           │    └── get_session_history_and_summary()
           │         └── ConversationSummaryMemory (if > 2400 tokens)
           │
           ├── prompt_template (ChatPromptTemplate)
           │    └── system + context + history + query → formatted prompt
           │
           └── resilient_llm (ChatLiteLLM.with_fallbacks)
                ├── primary: groq/llama-3.3-70b-versatile
                └── fallback[0..9]: 9 alternative models
```

### 6.4 LangGraph Multi-Agent Workflow (LLD)

```
POST /api/agents/research
 └── compiled_graph.ainvoke(inputs, config)
      │
      ├── [START]
      │    ├── → retrieval_agent (PARALLEL)
      │    └── → research_agent  (PARALLEL)
      │
      ├── retrieval_agent (Node 1)
      │    ├── get_user_bm25_retriever(user_id)
      │    ├── get_vector_store().similarity_search(question, k=20)
      │    └── → AgentState.retrieved_chunks
      │
      ├── research_agent (Node 2)
      │    ├── llm_with_tools.ainvoke(messages)  ← tool selection
      │    ├── execute_tool_with_logging() × N tools (asyncio.gather)
      │    │    tools: Tavily, Wikipedia, ArXiv, PubMed,
      │    │           HackerNews, DuckDuckGo, YouTube,
      │    │           Reddit, GitHub, NewsAPI
      │    ├── deduplicate by URL
      │    └── → AgentState.web_results (top 10)
      │
      ├── critic_agent (Node 3) ← fan-in from retrieval + research
      │    ├── score_doc() × all_docs (asyncio.gather)
      │    │    └── LLM scores 0-10 per chunk
      │    ├── filter docs ≥ 5, take top 5
      │    ├── generate candidate answer (LLM)
      │    ├── RAGASEvaluator.evaluate_response()
      │    │    ├── faithfulness + context_relevance
      │    │    └── composite = (faith + ctx_rel) / 2
      │    │
      │    └── route_from_critic()
      │         ├── composite < 0.50 AND retry_count < 2
      │         │    └── → retrieval_agent (RETRY)
      │         └── composite ≥ 0.50 OR retry_count ≥ 2
      │              └── → summary_agent
      │
      ├── summary_agent (Node 4)
      │    ├── format context from reranked_chunks
      │    ├── LLM generates structured report:
      │    │    {executive_summary, findings, analysis, sources}
      │    └── → AgentState.report, answer, sources
      │
      ├── memory_agent (Node 5)
      │    ├── db.sessions.update_one({session_id}, {$set: {report}})
      │    └── db.chat_history.insert_many([user_msg, assistant_msg])
      │
      └── [END]
```

### 6.5 Security Pipeline (LLD)

```
execute_input_guards(question, session_id, user_id, ip)
 ├── 1. enforce_token_limits(max=2000 tokens) → truncate if needed
 ├── 2. check_prompt_injection(text)
 │    └── Regex patterns: "ignore previous", "system:", "act as DAN"
 │         ✗ → 400 blocked + audit log
 ├── 3. classify_jailbreak(text)  [LLM-based]
 │    └── score ≥ 0.7 → blocked + audit log
 ├── 4. classify_topic_relevance(text)  [LLM-based]
 │    └── score < 0.3 → blocked + audit log
 └── 5. scrub_pii(text)  [Regex]
      └── emails, phones, SSNs → [REDACTED] + audit log (not blocked)

execute_output_guards(response, context, session_id, user_id, ip)
 ├── 1. scrub_pii_output(response)  [Regex] → sanitize
 ├── 2. check_toxicity(response)  [LLM-based]
 │    └── is_toxic → 500 blocked + audit log
 ├── 3. check_hallucination(response, context)  [LLM-based]
 │    └── faithfulness < 0.6 → blocked + audit log
 └── 4. check_length(response)
      └── len < 50 or > 3000 → blocked + audit log
```

---

## 7. System Architecture

### Backend Module Map

```
backend/app/
├── main.py                  ← FastAPI app, lifespan, middleware
├── core/
│   ├── config.py            ← Pydantic Settings (all env vars)
│   ├── database.py          ← Motor async MongoDB client
│   └── scheduler.py         ← APScheduler nightly re-ingestion
├── api/routes/
│   ├── auth.py              ← /auth/* endpoints
│   ├── sources.py           ← /upload, /ingest/*, /sources/*
│   ├── chat.py              ← /chat, /chat/stream (LCEL RAG)
│   ├── agents.py            ← /api/agents/* (LangGraph)
│   ├── settings.py          ← /api/settings/*
│   └── security.py          ← /api/security/*
├── agents/
│   ├── state.py             ← AgentState TypedDict
│   ├── graph.py             ← LangGraph workflow + MongoCheckpointer
│   ├── retrieval_agent.py   ← Node 1: internal RAG
│   ├── research_agent.py    ← Node 2: external tool calls
│   ├── critic_agent.py      ← Node 3: RAGAS quality gate
│   ├── summary_agent.py     ← Node 4: report generation
│   └── memory_agent.py      ← Node 5: session persistence
├── rag/
│   ├── chain.py             ← Full LCEL chain assembly
│   ├── retriever.py         ← Vector store + BM25 lazy loaders
│   ├── reranker.py          ← Cross-encoder compressor
│   ├── context.py           ← Token budget + LitM reordering
│   └── memory.py            ← ConversationSummaryMemory
├── services/
│   ├── auth_service.py      ← Registration, login, token mgmt
│   ├── extractor_service.py ← PDF/DOCX/URL/YouTube extraction
│   ├── chunker_service.py   ← RecursiveCharacterTextSplitter
│   ├── embedding_service.py ← SentenceTransformer lazy loader
│   ├── vector_service.py    ← MongoDB chunk CRUD
│   └── s3_service.py        ← AWS S3 upload/download/presign
├── tools/
│   ├── tool_registry.py     ← all_research_tools list + health check
│   ├── tavily_tool.py
│   ├── wikipedia_tool.py
│   ├── arxiv_tool.py
│   ├── pubmed_tool.py
│   ├── hackernews_tool.py
│   ├── duckduckgo_tool.py
│   ├── youtube_tool.py
│   ├── reddit_tool.py
│   ├── github_tool.py
│   └── news_tool.py
├── evaluation/
│   ├── metrics.py           ← RAGAS LLM/embeddings config
│   ├── ragas_evaluator.py   ← Faithfulness/Relevance scoring
│   └── evaluation_api.py    ← /api/evaluation/* endpoints
├── security/
│   ├── guard_pipeline.py    ← execute_input/output_guards
│   ├── input_guards.py      ← injection, jailbreak, PII, topic
│   ├── output_guards.py     ← toxicity, hallucination, length
│   ├── rate_limiter.py      ← SlowAPI + Redis/Upstash
│   └── audit_logger.py      ← Security event persistence
└── mlflow/
    ├── manager.py           ← BestConfigManager (RAG/Agent config)
    ├── runner.py            ← ExperimentRunner (RAGAS experiments)
    ├── scheduler.py         ← Scheduled experiment triggers
    └── endpoints.py         ← /api/mlflow/* experiment endpoints
```

### Frontend Module Map

```
frontend/src/
├── App.tsx                  ← Router + protected route guards
├── main.tsx                 ← QueryClientProvider + Toaster
├── pages/
│   ├── LandingPage.tsx      ← Public marketing page
│   ├── LoginPage.tsx        ← Email/password auth
│   ├── RegisterPage.tsx     ← Sign-up with OTP flow
│   ├── VerifyOtpPage.tsx    ← 6-digit OTP verification
│   ├── ForgotPasswordPage.tsx
│   ├── ResetPasswordPage.tsx
│   ├── OnboardingPage.tsx   ← First-run doc upload guidance
│   ├── DashboardPage.tsx    ← Main metrics dashboard
│   ├── ResearchPage.tsx     ← Chat + streaming research interface
│   ├── LibraryPage.tsx      ← Document management
│   ├── SourceDetailPage.tsx ← Individual source metadata
│   ├── HistoryPage.tsx      ← Session history list
│   ├── ReportPage.tsx       ← Research report viewer
│   ├── AnalyticsPage.tsx    ← RAGAS score charts
│   ├── SettingsPage.tsx     ← User + LLM preferences
│   ├── ProfilePage.tsx      ← Account management
│   ├── PricingPage.tsx      ← Tier comparison
│   ├── HelpPage.tsx         ← Documentation hub
│   └── NotFoundPage.tsx
├── context/
│   ├── AppContext.tsx        ← Document state + global context
│   └── AuthContext.tsx       ← JWT token lifecycle
├── hooks/
│   ├── useChat.ts           ← SSE streaming + message state
│   ├── useDocuments.ts      ← React Query document CRUD
│   └── useSSE.ts            ← EventSource abstraction
├── services/
│   └── chatService.ts       ← Chat API + SSE handling
├── api/
│   ├── auth.ts              ← Auth API calls
│   ├── research.ts          ← Research/agent API calls
│   ├── analytics.ts         ← RAGAS metrics API calls
│   └── reports.ts           ← Report fetch API calls
├── store/
│   └── *.ts                 ← Zustand state slices
└── types/
    └── index.ts             ← Global TypeScript interfaces
```

---

## 8. Data Flow Diagram

### DFD Level 0 — Context Diagram

```
                         ┌─────────────────┐
         User Input      │                 │    External Sources
    ─────────────────→   │   RESEARCHMIND  │  ←─────────────────
         Files/URLs      │     SYSTEM      │    Tavily, ArXiv,
    ─────────────────→   │                 │    PubMed, GitHub...
                         │                 │
    ←─────────────────   │                 │    LLM Providers
         Answers /        │                 │  ←─────────────────
         Reports          └─────────────────┘   Groq, Gemini,
                                                OpenRouter
```

### DFD Level 1 — Main Processes

```
                                  ┌──────────────┐
                   File/URL  →    │  1. Document  │ → Raw Text → MongoDB Chunks
   USER ───────────────────────→  │  Ingestion    │             MongoDB Sources
                                  └──────────────┘
                                        ↑ BM25 Refresh
                   Question  →    ┌──────────────┐
   USER ───────────────────────→  │  2. Security  │ → Blocked → 400 HTTP Response
                                  │  Guards       │
                                  └──────┬───────┘
                                         │ Clean Query
                                         ↓
                                  ┌──────────────┐
                              →   │  3. Hybrid   │ ← MongoDB Atlas Vector Search
                                  │  RAG Chain   │ ← BM25 In-Memory Index
                                  └──────┬───────┘
                                         │ Reranked Context
                                         ↓
                                  ┌──────────────┐
                              →   │  4. LangGraph │ ← External MCP Tools
                                  │  Agents      │ ← LiteLLM (10 models)
                                  └──────┬───────┘
                                         │ Draft Answer
                                         ↓
                                  ┌──────────────┐
                              →   │  5. Output   │ → Blocked → Regeneration
                                  │  Guards      │
                                  └──────┬───────┘
                                         │ Validated Response
                                         ↓
   USER ← ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ SSE Streaming Tokens + Report
```

### DFD Level 2 — Ingestion Detail

```
   File Bytes
       │
       ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Extractor  │────→│   Chunker   │────→│  Embedder   │────→│  Indexer    │
│  Service    │     │  Service    │     │  Service    │     │  Service    │
│             │     │             │     │             │     │             │
│ pdfplumber  │     │ Recursive   │     │ Sentence-   │     │ MongoDB     │
│ python-docx │     │ Character   │     │ Transformer │     │ chunks coll │
│ BeautifulS. │     │ Splitter    │     │ all-MiniLM  │     │             │
│ yt-dlp      │     │ 512/50      │     │ L6-v2       │     │ + S3 upload │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
     Pages []          Chunks []          Embeddings []         Saved ✓
```

---

## 9. Sequence Diagrams

### 9.1 User Registration & Email Verification

```
User          Frontend         FastAPI          MongoDB          Email Service
 │                │                │                │                │
 │──register()───→│                │                │                │
 │                │──POST /auth/register──→│         │                │
 │                │                │──insert user──→│                │
 │                │                │──generate OTP──│                │
 │                │                │──insert verification──→│        │
 │                │                │───────────────────────────send OTP email──→│
 │                │←──201 Created──│                │                │
 │←─show OTP page─│                │                │                │
 │                │                │                │                │
 │──enter OTP()──→│                │                │                │
 │                │──POST /auth/verify-email──→│    │                │
 │                │                │──find_one({code})──→│           │
 │                │                │──update is_verified──→│         │
 │                │                │──generate JWT tokens──          │
 │                │                │──insert refresh token──→│       │
 │                │←──200 + tokens─│                │                │
 │←──redirect dash│                │                │                │
```

### 9.2 Document Upload & Ingestion

```
User          Frontend         FastAPI          S3               MongoDB          BM25 Index
 │                │                │             │                   │                │
 │──upload PDF()─→│                │             │                   │                │
 │                │──POST /upload──→│            │                   │                │
 │                │                │──upload file───────────────→│  │                │
 │                │                │──insert sources(status=uploaded)────────────→│  │
 │                │←──201 pending──│             │                   │                │
 │←─show pending──│                │             │                   │                │
 │                │                │             │                   │                │
 │                │            [Background Task]                      │                │
 │                │                │──extract text (pdfplumber)       │                │
 │                │                │──chunk (512/50)                  │                │
 │                │                │──embed (all-MiniLM-L6-v2)        │                │
 │                │                │──insert chunks (384d)───────────→│               │
 │                │                │──update status=indexed──────────→│               │
 │                │                │──init_bm25_retriever()────────────────────────→│ │
 │                │                │             │                   │                │
 │──poll status()→│──GET /sources/{id}/status──→│                   │                │
 │←─show indexed──│←──200 indexed──│             │                   │                │
```

### 9.3 Research Query (RAG Chat Stream)

```
User     Frontend    FastAPI    Security    LCEL Chain   MongoDB     LiteLLM    Browser SSE
 │           │           │          │           │            │            │            │
 │─query()──→│           │          │           │            │            │            │
 │           │──GET /chat/stream──→│           │            │            │            │
 │           │           │──input guards──→│    │            │            │            │
 │           │           │          │──return clean query    │            │            │
 │           │           │──ainvoke(lcel_chain)──→│          │            │            │
 │           │           │          │     │──vector search───────────→│  │            │
 │           │           │          │     │──bm25 search (in-memory)  │            │  │
 │           │           │          │     │←──top 20 docs──────────────│            │  │
 │           │           │          │     │──EnsembleRRF merge (RRF)   │            │  │
 │           │           │          │     │──cross-encoder rerank      │            │  │
 │           │           │          │     │──format context + history  │            │  │
 │           │           │          │     │──prompt_template.format()  │            │  │
 │           │           │          │     │──resilient_llm.ainvoke()─────────────→│  │
 │           │           │          │     │                 │        token1│            │
 │           │           │          │     │                 │        token2│            │
 │←──────────────────────────────────────────────────────── SSE: event: token ─────→│ │
 │           │           │          │     │                 │            │            │ │
 │           │           │          │     │                 │        done │            │
 │←──────────────────────────────────────────────────────── SSE: event: done ──────→│ │
 │           │           │──save history──────────────────→│            │            │ │
```

### 9.4 Deep Research Agent Workflow

```
User     Frontend     FastAPI    Security   LangGraph    LiteLLM    MCP Tools   RAGAS
 │           │            │          │          │            │            │         │
 │─research()→│           │          │          │            │            │         │
 │           │──POST /api/agents/research──→│   │            │            │         │
 │           │            │──input guards──→│   │            │            │         │
 │           │            │──graph.ainvoke()──→│ │            │            │         │
 │           │            │          │    │──[PARALLEL]──────────────────────────────
 │           │            │          │    │   │──retrieval_agent──→vector+BM25 search
 │           │            │          │    │   │──research_agent──→│        │         │
 │           │            │          │    │   │          │──bind_tools(10)─────────→ │
 │           │            │          │    │   │          │──llm selects tools──→│    │
 │           │            │          │    │   │          │        │──Tavily search   │
 │           │            │          │    │   │          │        │──ArXiv search    │
 │           │            │          │    │   │          │        │──Wikipedia search│
 │           │            │          │    │   │          │←────results (deduped)──── │
 │←─SSE: agent_start(retrieval)────────────────────────── │            │         │
 │←─SSE: agent_start(research)────────────────────────── ─│            │         │
 │           │            │          │    │   │──[FAN-IN to critic_agent]──────────── │
 │           │            │          │    │   │──score chunks (LLM, parallel)──→│     │
 │           │            │          │    │   │──filter top 5 docs              │     │
 │           │            │          │    │   │──generate draft answer──→│      │     │
 │           │            │          │    │   │──evaluate response────────────────→│  │
 │           │            │          │    │   │←── faithfulness + ctx_relevance ──────│
 │           │            │          │    │   │──[route: composite ≥ 0.5 → summary]   │
 │←─SSE: agent_start(critic)────────────────── │            │         │         │
 │           │            │          │    │   │──summary_agent──→│     │         │
 │           │            │          │    │   │──structured report──→│  │         │
 │           │            │          │    │   │──memory_agent: save to MongoDB    │
 │           │            │          │    │   │──[END]                            │
 │←─SSE: event: result(report)───────────── ── │            │         │         │
 │←─SSE: event: done──────────────────────── ─ │            │         │         │
```

---

## 10. Database Schema

### MongoDB Collections

#### `users`
```json
{
  "_id": "ObjectId",
  "name": "string",
  "email": "string (unique index)",
  "hashed_password": "string",
  "is_email_verified": "boolean",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

#### `sources`
```json
{
  "_id": "ObjectId",
  "user_id": "string (ref: users._id)",
  "filename": "string",
  "file_type": "pdf | docx | xlsx | txt | url | youtube",
  "file_size": "int | null",
  "s3_url": "string (S3 key or source URL)",
  "source_url": "string | null",
  "status": "uploaded | extracting | chunking | embedding | indexing | indexed | failed",
  "chunk_count": "int | null",
  "error_reason": "string | null",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

#### `chunks`
```json
{
  "_id": "ObjectId",
  "source_id": "ObjectId (ref: sources._id)",
  "user_id": "string",
  "text": "string",
  "embedding": "[float × 384]  (Vector Search index: vector_index)",
  "chunk_index": "int",
  "page_number": "int",
  "metadata": {
    "filename": "string",
    "file_type": "string"
  }
}
```

#### `chat_history`
```json
{
  "_id": "ObjectId",
  "user_id": "string",
  "session_id": "string",
  "role": "user | assistant",
  "content": "string",
  "created_at": "datetime"
}
```

#### `sessions`
```json
{
  "_id": "ObjectId",
  "user_id": "string",
  "session_id": "string",
  "source_ids": ["string"],
  "report": {
    "executive_summary": "string",
    "findings": ["string"],
    "analysis": "string",
    "sources": [{"title": "string", "url": "string"}]
  },
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

#### `evaluation_scores`
```json
{
  "_id": "ObjectId",
  "session_id": "string",
  "question": "string",
  "answer": "string",
  "faithfulness": "float",
  "answer_relevance": "float",
  "context_relevance": "float",
  "composite_score": "float",
  "quality_level": "excellent | good | acceptable | poor",
  "model_used": "string",
  "latency_ms": "int",
  "timestamp": "datetime",
  "flagged": "boolean",
  "flag_reason": "string"
}
```

#### `security_events` (audit log)
```json
{
  "_id": "ObjectId",
  "user_id": "string",
  "session_id": "string",
  "event_type": "prompt_injection | jailbreak | topic_blocked | pii_input | pii_output | toxic_output | hallucination_flagged",
  "original_input": "string",
  "cleaned_input": "string",
  "severity": "low | medium | high",
  "blocked": "boolean",
  "ip_address": "string",
  "metadata": "object",
  "timestamp": "datetime"
}
```

#### `refresh_tokens`
```json
{
  "_id": "ObjectId",
  "jti": "string (unique, indexed)",
  "user_id": "string",
  "expires_at": "datetime (TTL index)"
}
```

#### `agent_checkpoints`
```json
{
  "_id": "ObjectId",
  "thread_id": "string (session_id)",
  "checkpoint_id": "string",
  "checkpoint": "bytes (pickled LangGraph state)",
  "metadata": "bytes (pickled metadata)",
  "parent_config": "bytes | null",
  "updated_at": "bytes"
}
```

---

## 11. API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | None | Create new account |
| `POST` | `/auth/verify-email` | None | Verify 6-digit OTP |
| `POST` | `/auth/resend-verification` | None | Resend OTP email |
| `POST` | `/auth/login` | None | Get JWT tokens |
| `POST` | `/auth/refresh` | None | Refresh access token |
| `POST` | `/auth/logout` | None | Invalidate refresh token |
| `GET` | `/auth/me` | Bearer | Get current user profile |
| `POST` | `/auth/forgot-password` | None | Send reset OTP |
| `POST` | `/auth/verify-reset-code` | None | Validate reset OTP |
| `POST` | `/auth/reset-password` | None | Set new password |

### Sources (Document Ingestion)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/upload` | Bearer | Upload PDF/DOCX/XLSX/TXT |
| `POST` | `/ingest/url` | Bearer | Scrape and ingest website URL |
| `POST` | `/ingest/youtube` | Bearer | Ingest YouTube video transcript |
| `GET` | `/sources` | Bearer | List all user documents |
| `GET` | `/sources/{id}/status` | Bearer | Get ingestion status |
| `DELETE` | `/sources/{id}` | Bearer | Delete source + chunks + S3 file |

### Chat (RAG Pipeline)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/chat` | Bearer | Single non-streaming query |
| `GET` | `/chat/stream` | Bearer | SSE streaming query response |

**SSE Event Types:**
- `sources` — Retrieved document sources JSON
- `token` — Individual response token
- `metadata` — Model used, tokens, latency
- `done` — Stream completed
- `error` — Stream error

### Agents (LangGraph Research)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/agents/research` | Bearer | Run full 5-agent research |
| `GET` | `/api/agents/status/{session_id}` | Bearer | Current active agent node |
| `GET` | `/api/agents/report/{session_id}` | Bearer | Fetch generated report |
| `GET` | `/api/agents/history/{session_id}` | Bearer | Session chat history |
| `DELETE` | `/api/agents/history/{session_id}` | Bearer | Clear session history |
| `GET` | `/api/agents/reports` | Bearer | List all research reports |
| `DELETE` | `/api/agents/report/{session_id}` | Bearer | Delete research report |
| `GET` | `/api/agents/sessions` | Bearer | List all user sessions |
| `POST` | `/api/agents/feedback` | Bearer | Save 1-5 star rating |

### Evaluation

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/evaluation/scores/{session_id}` | None | Paginated session scores |
| `GET` | `/api/evaluation/daily/{date}` | None | Daily RAGAS report |
| `GET` | `/api/evaluation/summary` | None | 7-day trend summary |
| `GET` | `/api/evaluation/alerts` | None | Quality alert events |
| `POST` | `/api/evaluation/manual` | None | Run ad-hoc RAGAS eval |

### System

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | None | API welcome message |
| `GET` | `/health` | None | Health check |
| `GET` | `/metrics` | None | RAGAS metric snapshot |

---

## 12. Project Structure

```
ResearchMind/
├── backend/
│   ├── app/                     ← FastAPI application
│   │   ├── main.py
│   │   ├── core/                ← Config, DB, Scheduler
│   │   ├── api/routes/          ← HTTP route handlers
│   │   ├── agents/              ← LangGraph nodes + graph
│   │   ├── rag/                 ← LCEL pipeline components
│   │   ├── services/            ← ETL, auth, storage
│   │   ├── tools/               ← MCP research tools
│   │   ├── evaluation/          ← RAGAS evaluator + API
│   │   ├── security/            ← Guard pipeline
│   │   ├── mlflow/              ← Experiment management
│   │   ├── context/             ← Context engineering
│   │   ├── dependencies/        ← FastAPI dependency injectors
│   │   ├── models/              ← Pydantic data models
│   │   └── schemas/             ← Request/Response schemas
│   ├── requirements.txt
│   ├── .env.example
│   ├── run_dev.ps1              ← PowerShell dev server script
│   └── venv/                    ← Python virtual environment
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx              ← Root router
│   │   ├── main.tsx             ← React entry point
│   │   ├── pages/               ← 20 page components
│   │   ├── components/          ← Reusable UI components
│   │   ├── context/             ← React contexts
│   │   ├── hooks/               ← Custom React hooks
│   │   ├── services/            ← API service layer
│   │   ├── api/                 ← Typed API call functions
│   │   ├── store/               ← Zustand stores
│   │   ├── types/               ← TypeScript interfaces
│   │   └── utils/               ← Helper utilities
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── .env.example
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## 13. Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+
- MongoDB Atlas cluster with Vector Search enabled
- AWS S3 bucket
- Groq API key (free tier)
- Resend API key (free tier for email)

### Backend Setup

```powershell
# Clone the repository
cd D:\Projects\ResearchMind\backend

# Create virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment variables
copy .env.example .env
# Edit .env with your keys

# Start the backend server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend Setup

```powershell
cd D:\Projects\ResearchMind\frontend

# Install dependencies
npm install

# Copy and configure environment variables
copy .env.example .env
# Edit .env with VITE_API_URL=http://localhost:8000

# Start the development server
npm run dev
```

### MongoDB Atlas Setup

1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a database `ResearchMind` with collection `chunks`
3. Create a **Vector Search Index** named `vector_index` on the `chunks` collection:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 384,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "user_id"
    },
    {
      "type": "filter",
      "path": "source_id"
    }
  ]
}
```

---

## 14. Environment Variables

### Backend `.env`

```dotenv
# App
JWT_SECRET=your-super-secret-key-min-32-chars
DEBUG=false

# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/ResearchMind

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=us-east-1

# LLM Providers
GROQ_API_KEY=gsk_...
GEMINI_API_KEY=AIza...
OPENROUTER_API_KEY=sk-or-...

# HuggingFace (optional — for private models only)
HF_TOKEN=hf_...

# MCP Research Tools
TAVILY_API_KEY=tvly-...
NEWS_API_KEY=your-newsapi-key
REDDIT_CLIENT_ID=your-reddit-id
REDDIT_CLIENT_SECRET=your-reddit-secret
GITHUB_TOKEN=ghp_...
PUBMED_EMAIL=your@email.com

# Email
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com

# LangSmith Observability (optional)
LANGCHAIN_API_KEY=lsv2_...
LANGCHAIN_PROJECT=researchmind
LANGCHAIN_TRACING_V2=true

# Rate Limiting
RATE_LIMIT_PER_MINUTE=20
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# RAGAS Evaluation
RAGAS_LLM=groq/llama-3.3-70b-versatile
RAGAS_FAITHFULNESS_THRESHOLD=0.6
RAGAS_COMPOSITE_THRESHOLD=0.5

# Security Thresholds
HALLUCINATION_THRESHOLD=0.6
JAILBREAK_THRESHOLD=0.7
TOPIC_RELEVANCE_THRESHOLD=0.3
MAX_INPUT_TOKENS=2000

# Token Budget
TOKEN_BUDGET_TOTAL=8000
TOKEN_BUDGET_SYSTEM=1600
TOKEN_BUDGET_HISTORY=2400
TOKEN_BUDGET_CONTEXT=3200
TOKEN_BUDGET_QUERY=800
```

### Frontend `.env`

```dotenv
VITE_API_URL=http://localhost:8000
VITE_APP_NAME=ResearchMind
```

---

## 15. Security Architecture

### Input Guard Pipeline

```
User Query
    │
    ▼
1. Token Limit Enforcer    → Truncate if > 2000 tokens
    │
    ▼
2. Prompt Injection Check  → Regex patterns (block "ignore previous", "system:", etc.)
    │
    ▼
3. Jailbreak Detector      → LLM-based scoring (threshold: 0.7)
    │
    ▼
4. Topic Relevance Filter  → LLM-based (threshold: 0.3 relevance)
    │
    ▼
5. PII Scrubber            → Regex: emails, SSNs, phones → [REDACTED]
    │
    ▼
Clean, Safe Query → RAG Pipeline
```

### Output Guard Pipeline

```
LLM Response
    │
    ▼
1. PII Output Scrubber     → Regex remove private data
    │
    ▼
2. Toxicity Check          → LLM-based (block toxic content)
    │
    ▼
3. Hallucination Check     → LLM faithfulness score (threshold: 0.6)
    │
    ▼
4. Length Validator        → Enforce 50-3000 char bounds
    │
    ▼
Validated Response → SSE Stream to User
```

All blocked events are persisted to `security_events` collection with full audit metadata.

---

## 16. RAG Pipeline

### Pipeline Overview

```
Query ──────────────────────────────────────────────────────────────────────────┐
                                                                                │
    ┌─── Vector Search ──────────────────────────────────────────────────┐      │
    │   MongoDB Atlas Vector Search                                       │      │
    │   all-MiniLM-L6-v2 embeddings (384d)                               │      │
    │   Pre-filter: user_id + source_ids                                  │      │
    │   k = 20 results                                                    │      │
    └─────────────────────────────────────────────────────────────────────┘      │
                                                                                │
    ┌─── BM25 Search ────────────────────────────────────────────────────┐      │
    │   In-memory BM25Retriever (langchain_community)                     │      │
    │   Cached per (user_id, source_ids) combination                      │      │
    │   k = 20 results                                                    │      │
    └─────────────────────────────────────────────────────────────────────┘      │
              │                           │                                       │
              └─────────── Merge ─────────┘                                      │
                               │                                                 │
                    EnsembleRetriever RRF                                        │
                    weights: [0.6 vector, 0.4 BM25]                             │
                    top 20 fused docs                                            │
                               │                                                 │
                    Cross-Encoder Reranker                                       │
                    cross-encoder/ms-marco-MiniLM-L-6-v2                        │
                    top 5 reranked docs                                          │
                               │                                                 │
                    Lost-in-the-Middle Reorder                                  │
                    [best] + [rest] + [2nd-best]                                │
                               │                                                 │
                    Token Budget Formatter                                       │
                    max 3200 tokens of context                                   │
                               │                                                 │
                    ConversationSummaryMemory                                    │
                    max 2400 tokens of history                                   │
                               │                                                 │
                    Prompt Template                                              │
                    System + Context + History + Query                          │
                               │                                                 │
                    LiteLLM resilient_llm.invoke()                              │
                    → Groq (primary) → 9 fallbacks                             │
                               │                                                 │
                    Streaming Response                        ←──────────────────┘
```

### Chunking Strategy

| Setting | Value |
|---|---|
| Splitter | `RecursiveCharacterTextSplitter` |
| Chunk Size | 512 characters |
| Chunk Overlap | 50 characters |
| Separators | `\n\n`, `\n`, `. `, ` ` |

### Embedding Model

| Property | Value |
|---|---|
| Model | `sentence-transformers/all-MiniLM-L6-v2` |
| Dimensions | 384 |
| Device | CPU (zero cloud cost) |
| Batch Size | 32 |
| Normalize | True |

---

## 17. Agent System

### LangGraph Workflow

```
               ┌──────┐
               │START │
               └──┬───┘
                  │
        ┌─────────┴──────────┐
        │                    │
   ┌────▼─────┐      ┌───────▼──────┐
   │Retrieval │      │  Research    │
   │  Agent   │      │   Agent      │
   │          │      │              │
   │Vector DB │      │10 MCP Tools  │
   │+ BM25    │      │(parallel)    │
   └────┬─────┘      └───────┬──────┘
        │                    │
        └─────────┬──────────┘
                  │ (fan-in)
           ┌──────▼──────┐
           │   Critic    │
           │   Agent     │
           │             │
           │RAGAS Score  │
           │composite≥0.5│
           └──────┬──────┘
          ┌───────┴────────┐
          │                │
     (retry <2)        (pass/done)
          │                │
   ┌──────▼─────┐   ┌──────▼──────┐
   │retrieval   │   │  Summary    │
   │agent again │   │   Agent     │
   └────────────┘   │             │
                    │Report+Srcs  │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   Memory    │
                    │   Agent     │
                    │             │
                    │Save MongoDB │
                    └──────┬──────┘
                           │
                        ┌──▼──┐
                        │ END │
                        └─────┘
```

### Agent Responsibilities

| Agent | Role | Tools Used |
|---|---|---|
| **Retrieval Agent** | Search internal document knowledge base | Vector store, BM25 index |
| **Research Agent** | Query external internet sources | 10 MCP tools via LLM tool binding |
| **Critic Agent** | Score document quality (0-10 LLM scoring) + RAGAS gate | LLM, RAGAS evaluator |
| **Summary Agent** | Synthesize structured research report | LLM with structured prompt |
| **Memory Agent** | Persist session context to database | MongoDB |

---

## 18. MCP Research Tools

| Tool Name | API Provider | Use Case | Timeout |
|---|---|---|---|
| `tavily_search` | Tavily AI | Real-time web search with relevance scoring | 5s |
| `wikipedia_search` | Wikipedia API | Background knowledge and definitions | 5s |
| `arxiv_search` | ArXiv API | Academic and scientific papers | 5s |
| `pubmed_search` | NCBI PubMed | Medical and biomedical research | 5s |
| `hackernews_search` | HN Algolia | Tech community discussions | 5s |
| `duckduckgo_search` | DuckDuckGo | Web search fallback (no API key required) | 5s |
| `youtube_transcript` | YouTube + yt-dlp | Video content extraction | 5s |
| `reddit_search` | Reddit API | Community opinions and discussions | 5s |
| `github_search` | GitHub API | Code repositories and technical docs | 5s |
| `news_search` | NewsAPI | Current news and recent events | 5s |

**Tool Selection Strategy:**
The Research Agent uses LLM-based tool selection via `bind_tools()`. The LLM autonomously decides which 3-5 tools are most relevant per query based on the system prompt heuristics (technical → GitHub/ArXiv, medical → PubMed, news → Tavily/NewsAPI, etc.)

---

## 19. Evaluation & Monitoring

### RAGAS Metrics

| Metric | Description | Threshold |
|---|---|---|
| **Faithfulness** | Is the answer grounded in the retrieved context? | ≥ 0.60 |
| **Answer Relevance** | Does the answer address the question asked? | ≥ 0.50 |
| **Context Relevance** (Precision) | Are the retrieved chunks relevant to the query? | ≥ 0.40 |
| **Context Recall** | (With ground truth) Were all relevant facts retrieved? | N/A |
| **Answer Correctness** | (With ground truth) Is the answer factually correct? | N/A |

**Composite Score Formula:**
```
composite = faithfulness × 0.35 + answer_relevance × 0.35 + context_relevance × 0.30
```

**Quality Levels:**
| Level | Composite Score |
|---|---|
| 🟢 Excellent | ≥ 0.80 |
| 🔵 Good | ≥ 0.65 |
| 🟡 Acceptable | ≥ 0.50 |
| 🔴 Poor | < 0.50 |

### LangSmith Tracing

Every request is traced end-to-end in LangSmith:
- Agent node execution (latency, inputs, outputs)
- Tool call results (tool name, query, results count)
- RAGAS evaluation runs (scores, flagged status)
- Token cost per request

### Experiment Management

The `BestConfigManager` in `app/mlflow/manager.py` tracks:
- **RAG Config**: `chunk_size`, `chunk_overlap`, `k_value`, `reranker_top_n`, `hybrid_vector_weight`, `hybrid_bm25_weight`
- **Agent Config**: `primary_model`, `temperature`, `max_tokens`, `tools_used`, `retry_count`

Experiments run RAGAS scoring across 20 sample questions and auto-promote the best-scoring configuration.

---

## 20. Performance Targets

| Metric | Target | Implementation |
|---|---|---|
| First token latency | < 3 seconds | Lazy loading, BM25 cache, async retrieval |
| Cache hit response | < 500 ms | BM25 in-memory cache per user |
| Backend startup | < 2 seconds | All ML models loaded lazily on first request |
| Embedding cost | $0 | Local SentenceTransformer on CPU |
| LLM cost | $0 | Groq + OpenRouter free tier |
| Uptime | 99.9% | 10-model fallback chain |
| Faithfulness score | > 0.85 | RAGAS evaluation + Critic Agent gate |
| Context precision | > 0.70 | Cross-encoder reranker |
| Security block rate | 100% injections blocked | Multi-layer guard pipeline |

### LLM Fallback Chain (in order)

```
1. groq/llama-3.3-70b-versatile          ← Primary (fastest)
2. openrouter/meta-llama/llama-3.3-70b-instruct:free
3. openrouter/deepseek/deepseek-r1:free
4. openrouter/nvidia/nemotron-3-super-120b:free
5. openrouter/qwen/qwen3-coder:free
6. openrouter/mistralai/mistral-7b-instruct:free
7. openrouter/microsoft/phi-3-medium-128k-instruct:free
8. openrouter/meta-llama/llama-3.1-8b-instruct:free
9. openrouter/openai/gpt-oss-120b:free
10. openrouter/deepseek/deepseek-v4-flash:free
11. gemini/gemini-1.5-flash               ← Final fallback
```

---

## 📄 License

**PROPRIETARY & CONFIDENTIAL** — All Rights Reserved.

This project is strictly proprietary and closed-source. Unauthorized copying, distribution, modification, or public release of this repository is strictly prohibited.

---

<div align="center">

**Built with ❤️ using FastAPI + LangGraph + React**

</div>
