import axiosInstance from './axios';

export interface ResearchReportItem {
  id: string;
  session_id: string;
  title: string;
  created_at: string;
  report: any;
}

export const reportsApi = {
  getReports: async (): Promise<ResearchReportItem[]> => {
    const response = await axiosInstance.get<ResearchReportItem[]>('/api/agents/reports');
    return response.data;
  },

  getReport: async (id: string): Promise<any> => {
    const response = await axiosInstance.get<any>(`/api/agents/report/${id}`);
    return response.data;
  },

  deleteReport: async (id: string): Promise<{ message: string }> => {
    const response = await axiosInstance.delete<{ message: string }>(`/api/agents/report/${id}`);
    return response.data;
  }
};

export default reportsApi;
