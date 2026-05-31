import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { chatService, type ChatMessage, type ChatSource } from '@/services/chatService';

export function useChat() {
  const { accessToken } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (
    query: string, 
    sessionId: string = 'default',
    onAgentState?: (agent: string, status: 'starting' | 'done') => void,
    onReport?: (report: any) => void
  ) => {
    if (!accessToken) {
      setError('Not authenticated');
      return;
    }

    setIsProcessing(true);
    setError(null);

    // 1. Add user query to conversation
    setMessages((prev) => [...prev, { role: 'user', content: query }]);

    // 2. Add placeholder assistant response to stream into
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: '',
        agents: []
      }
    ]);

    try {
      await chatService.streamResearch(
        query,
        sessionId,
        accessToken,
        (token) => {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.role === 'assistant') {
              last.content += token;
              last.isStreaming = true;
            }
            return next;
          });
        },
        (meta) => {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.role === 'assistant') {
              if (meta.sources && meta.sources.length > 0) {
                last.sources = meta.sources;
              }
              if (meta.model) {
                last.model = meta.model;
              }
              if (meta.latency) {
                last.latency = meta.latency;
              }
            }
            return next;
          });
        },
        (agent, status) => {
          if (onAgentState) {
            onAgentState(agent, status);
          }
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.role === 'assistant') {
              if (!last.agents) last.agents = [];
              const agentLabel = agent.charAt(0).toUpperCase() + agent.slice(1) + ' Agent';
              if (status === 'starting' && !last.agents.includes(agentLabel)) {
                last.agents = [...last.agents, agentLabel];
              }
            }
            return next;
          });
        },
        (report) => {
          if (onReport) {
            onReport(report);
          }
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.role === 'assistant') {
              last.suggestions = (report.related_topics || []).map((topic: string, index: number) => ({
                id: `sug_${index}`,
                question: topic
              }));
              last.isStreaming = false;
            }
            return next;
          });
          setIsProcessing(false);
        },
        (err) => {
          setError(err);
          setIsProcessing(false);
        }
      );
    } catch (err: any) {
      setError(err?.message || 'Failed to send message.');
      setIsProcessing(false);
    }
  }, [accessToken]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isProcessing,
    error,
    sendMessage,
    clearChat,
    setMessages
  };
}
