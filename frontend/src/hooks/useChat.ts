import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { chatService, type ChatMessage, type ChatSource } from '@/services/chatService';

export function useChat() {
  const { accessToken } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (query: string, sessionId: string = 'default') => {
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
        agents: ['Retrieval Agent', 'Research Agent', 'Critic Agent', 'Summary Agent']
      }
    ]);

    try {
      await chatService.streamChat(
        query,
        sessionId,
        accessToken,
        (token) => {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.role === 'assistant') {
              last.content += token;
            }
            return next;
          });
        },
        (meta) => {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.role === 'assistant') {
              last.sources = meta.sources;
              last.model = meta.model;
              last.latency = meta.latency;
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
