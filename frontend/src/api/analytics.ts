import axiosInstance from './axios';

export interface ScoreTrend {
  date: string;
  avg_faithfulness: number;
  avg_answer_relevance: number;
  avg_context_relevance: number;
  avg_composite: number;
}

export interface EvaluationSummary {
  period: string;
  daily_trends: ScoreTrend[];
  quality_distribution: {
    excellent: number;
    good: number;
    acceptable: number;
    poor: number;
  };
  trend: 'stable' | 'improving' | 'declining';
}

export interface QualityAlert {
  id: string;
  session_id: string;
  metric: string;
  score: number;
  threshold: number;
  timestamp: string;
  details?: string;
}

export const analyticsApi = {
  getScores: async (sessionId: string): Promise<any[]> => {
    const response = await axiosInstance.get<any[]>(`/api/evaluation/scores/${sessionId}`);
    return response.data;
  },

  getDailySummary: async (): Promise<EvaluationSummary> => {
    const response = await axiosInstance.get<EvaluationSummary>('/api/evaluation/summary');
    return response.data;
  },

  getAlerts: async (): Promise<QualityAlert[]> => {
    const response = await axiosInstance.get<QualityAlert[]>('/api/evaluation/alerts');
    return response.data;
  },

  getDailyReport: async (date: string): Promise<any> => {
    const response = await axiosInstance.get<any>(`/api/evaluation/daily/${date}`);
    return response.data;
  }
};

export default analyticsApi;
