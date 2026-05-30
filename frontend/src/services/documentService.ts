import { apiClient } from '@/services/api';

export interface SourceResponse {
  id: string;
  user_id: string;
  filename: string;
  file_type: string;
  file_size?: number | null;
  s3_url?: string | null;
  source_url?: string | null;
  status: 'uploaded' | 'extracting' | 'chunking' | 'embedding' | 'indexing' | 'indexed' | 'failed';
  error_reason?: string | null;
  chunk_count?: number | null;
  created_at: string;
  updated_at: string;
}

export const documentService = {
  async listSources(token: string): Promise<SourceResponse[]> {
    return apiClient.get<SourceResponse[]>('/sources', { token });
  },

  async getSourceStatus(sourceId: string, token: string): Promise<SourceResponse> {
    return apiClient.get<SourceResponse>(`/sources/${sourceId}/status`, { token });
  },

  async uploadDocument(file: File, token: string): Promise<SourceResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<SourceResponse>('/upload', formData, { token });
  },

  async ingestUrl(url: string, token: string): Promise<SourceResponse> {
    return apiClient.post<SourceResponse>('/ingest/url', { url }, { token });
  },

  async ingestYoutube(url: string, token: string): Promise<SourceResponse> {
    return apiClient.post<SourceResponse>('/ingest/youtube', { url }, { token });
  },

  async deleteSource(sourceId: string, token: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/sources/${sourceId}`, { token });
  },
};
