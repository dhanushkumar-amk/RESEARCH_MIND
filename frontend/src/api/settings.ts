import axiosInstance from './axios';

export interface UserSettings {
  user_id: string;
  theme: 'light' | 'dark';
  llm_preference: string;
  topic_preferences: string[];
  notifications_enabled: boolean;
}

export const settingsApi = {
  getSettings: async (): Promise<UserSettings> => {
    const response = await axiosInstance.get<UserSettings>('/api/settings');
    return response.data;
  },

  updateSettings: async (data: Partial<UserSettings>): Promise<{ message: string; settings: UserSettings }> => {
    const response = await axiosInstance.put<{ message: string; settings: UserSettings }>('/api/settings', data);
    return response.data;
  },

  deleteAllData: async (): Promise<{ message: string }> => {
    const response = await axiosInstance.delete<{ message: string }>('/api/settings/data');
    return response.data;
  }
};

export default settingsApi;
