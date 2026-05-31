import ENV from '@/config/env';

export interface ChatSource {
  id: string;
  name: string;
  type: string;
  matchScore: string;
}

export interface ChatSuggestion {
  id: string;
  question: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  agents?: string[];
  sources?: ChatSource[];
  model?: string;
  latency?: number;
  isStreaming?: boolean;
  suggestions?: ChatSuggestion[];
}

export const chatService = {
  async streamChat(
    query: string,
    sessionId: string,
    token: string,
    onToken: (token: string) => void,
    onMeta: (meta: { sources: ChatSource[]; model: string; latency: number }) => void,
    onError: (error: string) => void
  ) {
    try {
      const response = await fetch(`${ENV.API_BASE_URL}/chat/stream?query=${encodeURIComponent(query)}&session_id=${sessionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'text/event-stream'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to connect to stream.');
      }

      if (!response.body) {
        throw new Error('No response body received.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Save the last partial line back to the buffer
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine || !cleanLine.startsWith('data: ')) continue;
          
          const jsonStr = cleanLine.substring(6);
          if (jsonStr === '[DONE]') continue;

          try {
            const data = JSON.parse(jsonStr);
            if (data.token) {
              onToken(data.token);
            } else if (data.sources || data.model) {
              onMeta({
                sources: data.sources || [],
                model: data.model || 'Unknown',
                latency: data.latency || 0
              });
            }
          } catch (e) {
            console.error('Error parsing SSE JSON:', e);
          }
        }
      }
    } catch (err: any) {
      onError(err?.message || 'Connection lost.');
    }
  },

  async streamResearch(
    query: string,
    sessionId: string,
    token: string,
    onToken: (token: string) => void,
    onMeta: (meta: { sources: ChatSource[]; model: string; latency: number }) => void,
    onAgentState: (agent: string, status: 'starting' | 'done') => void,
    onReport: (report: any) => void,
    onError: (error: string) => void
  ) {
    try {
      const response = await fetch(`${ENV.API_BASE_URL}/api/agents/research`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({
          question: query,
          session_id: sessionId,
          source_ids: []
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to connect to agent research stream.');
      }

      if (!response.body) {
        throw new Error('No response body received.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let currentEvent = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine) continue;

          if (cleanLine.startsWith('event: ')) {
            currentEvent = cleanLine.substring(7);
          } else if (cleanLine.startsWith('data: ')) {
            const jsonStr = cleanLine.substring(6);
            try {
              const data = JSON.parse(jsonStr);
              if (currentEvent === 'token') {
                onToken(data.token || '');
              } else if (currentEvent === 'agent_start') {
                onAgentState(data.agent || '', 'starting');
              } else if (currentEvent === 'agent_complete') {
                onAgentState(data.agent || '', 'done');
              } else if (currentEvent === 'sources') {
                const mappedSources: ChatSource[] = (data.sources || []).map((src: any, idx: number) => ({
                  id: src.id || `src_${idx}`,
                  name: src.title || 'Source',
                  type: src.url ? 'URL' : 'PDF',
                  matchScore: src.score ? `${Math.round(src.score * 100)}%` : '—'
                }));
                onMeta({ sources: mappedSources, model: '', latency: 0 });
              } else if (currentEvent === 'metadata') {
                onMeta({
                  sources: [],
                  model: data.model_used || 'Unknown',
                  latency: data.latency_ms || 0
                });
              } else if (currentEvent === 'report') {
                onReport(data);
              } else if (currentEvent === 'error') {
                onError(data.message || 'An error occurred during agent execution.');
              }
            } catch (e) {
              console.error('Error parsing Agent SSE JSON:', e);
            }
          }
        }
      }
    } catch (err: any) {
      onError(err?.message || 'Connection lost.');
    }
  }
};
