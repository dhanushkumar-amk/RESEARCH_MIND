import axiosInstance from './axios';

export interface ResearchHistoryItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface ResearchReport {
  id: string;
  session_id: string;
  title: string;
  created_at: string;
  report: any;
}

export const researchApi = {
  sendQuery: (question: string, sessionId: string, sourceIds: string[]) => {
    // Returns details for executing the POST SSE stream
    return {
      url: '/api/agents/research',
      method: 'POST',
      body: {
        question,
        session_id: sessionId,
        source_ids: sourceIds,
      },
    };
  },

  getHistory: async (sessionId: string): Promise<ResearchHistoryItem[]> => {
    const response = await axiosInstance.get<ResearchHistoryItem[]>(`/api/agents/history/${sessionId}`);
    return response.data;
  },

  clearHistory: async (sessionId: string): Promise<{ message: string }> => {
    const response = await axiosInstance.delete<{ message: string }>(`/api/agents/history/${sessionId}`);
    return response.data;
  },

  getReport: async (sessionId: string): Promise<any> => {
    const response = await axiosInstance.get<any>(`/api/agents/report/${sessionId}`);
    return response.data;
  },

  submitFeedback: async (sessionId: string, rating: number, comment?: string): Promise<{ message: string }> => {
    const response = await axiosInstance.post<{ message: string }>('/api/agents/feedback', {
      session_id: sessionId,
      rating,
      comment: comment || '',
    });
    return response.data;
  },

  getSessions: async (): Promise<any[]> => {
    const response = await axiosInstance.get<any[]>('/api/agents/sessions');
    return response.data;
  },
};

export default researchApi;

