import { useState, useEffect, useRef, useCallback } from 'react';
import ENV from '@/config/env';

export interface SSESource {
  id: string;
  name: string;
  type: string;
  matchScore: string;
}

export interface SSEOptions {
  onToken?: (token: string) => void;
  onAgentStatus?: (status: string) => void;
  onSources?: (sources: SSESource[]) => void;
  onReport?: (report: any) => void;
  onMetadata?: (metadata: any) => void;
  onDone?: () => void;
  onError?: (err: string) => void;
}

export function useSSE() {
  const [message, setMessage] = useState<string>('');
  const [sources, setSources] = useState<SSESource[]>([]);
  const [report, setReport] = useState<any>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [agentStatus, setAgentStatus] = useState<string>('idle');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const activeReaderRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  const cleanup = useCallback(() => {
    if (activeReaderRef.current) {
      activeReaderRef.current.cancel().catch(() => {});
      activeReaderRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const startStream = useCallback(async (
    url: string,
    body: { question: string; session_id: string; source_ids?: string[] },
    options?: SSEOptions
  ) => {
    cleanup();

    setMessage('');
    setSources([]);
    setReport(null);
    setMetadata(null);
    setAgentStatus('starting');
    setIsStreaming(true);
    setIsComplete(false);
    setError('');

    const token = localStorage.getItem('researchmind.accessToken');

    try {
      const response = await fetch(`${ENV.API_BASE_URL}${url}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || 'Failed to connect to stream.');
      }

      if (!response.body) {
        throw new Error('Response body is empty.');
      }

      const reader = response.body.getReader();
      activeReaderRef.current = reader;
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let currentEvent = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          setIsComplete(true);
          setIsStreaming(false);
          if (options?.onDone) options.onDone();
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine) continue;

          if (cleanLine.startsWith('event: ')) {
            currentEvent = cleanLine.substring(7);
          } else if (cleanLine.startsWith('data: ')) {
            const dataStr = cleanLine.substring(6);
            if (dataStr === '[DONE]') {
              setIsComplete(true);
              setIsStreaming(false);
              if (options?.onDone) options.onDone();
              break;
            }

            try {
              const parsed = JSON.parse(dataStr);

              switch (currentEvent) {
                case 'token':
                  setMessage((prev) => {
                    const val = prev + (parsed.token || '');
                    if (options?.onToken) options.onToken(parsed.token || '');
                    return val;
                  });
                  break;

                case 'agent_start':
                  setAgentStatus(parsed.agent || 'running');
                  if (options?.onAgentStatus) options.onAgentStatus(parsed.agent || 'running');
                  break;

                case 'agent_complete':
                  // Handled individually or kept
                  break;

                case 'sources': {
                  const mapped: SSESource[] = (parsed.sources || []).map((src: any, idx: number) => ({
                    id: src.id || `src_${idx}`,
                    name: src.title || 'Source Document',
                    type: src.url ? 'URL' : 'PDF',
                    matchScore: src.score ? `${Math.round(src.score * 100)}%` : '—',
                  }));
                  setSources(mapped);
                  if (options?.onSources) options.onSources(mapped);
                  break;
                }

                case 'metadata':
                  setMetadata(parsed);
                  if (options?.onMetadata) options.onMetadata(parsed);
                  break;

                case 'report':
                  setReport(parsed);
                  if (options?.onReport) options.onReport(parsed);
                  break;

                case 'error':
                  setError(parsed.message || 'Stream error occurred.');
                  setIsStreaming(false);
                  if (options?.onError) options.onError(parsed.message || 'Stream error occurred.');
                  break;

                case 'done':
                  setIsComplete(true);
                  setIsStreaming(false);
                  setAgentStatus('idle');
                  if (options?.onDone) options.onDone();
                  break;

                default:
                  break;
              }
            } catch (err) {
              console.error('Error parsing SSE JSON:', err);
            }
          }
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Connection error.');
      setIsStreaming(false);
      if (options?.onError) options.onError(err?.message || 'Connection error.');
    }
  }, [cleanup]);

  return {
    message,
    sources,
    report,
    metadata,
    agentStatus,
    isStreaming,
    isComplete,
    error,
    startStream,
    cleanup,
  };
}

export default useSSE;
