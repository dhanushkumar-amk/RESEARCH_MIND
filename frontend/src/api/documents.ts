import axiosInstance from './axios';

export interface DocumentSource {
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

export const documentsApi = {
  uploadFile: async (file: File): Promise<DocumentSource> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axiosInstance.post<DocumentSource>('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  ingestURL: async (url: string): Promise<DocumentSource> => {
    const response = await axiosInstance.post<DocumentSource>('/ingest/url', { url });
    return response.data;
  },

  ingestYouTube: async (url: string): Promise<DocumentSource> => {
    const response = await axiosInstance.post<DocumentSource>('/ingest/youtube', { url });
    return response.data;
  },

  getDocuments: async (): Promise<DocumentSource[]> => {
    const response = await axiosInstance.get<DocumentSource[]>('/sources');
    return response.data;
  },

  deleteDocument: async (id: string): Promise<{ message: string }> => {
    const response = await axiosInstance.delete<{ message: string }>(`/sources/${id}`);
    return response.data;
  },

  getStatus: async (id: string): Promise<DocumentSource> => {
    const response = await axiosInstance.get<DocumentSource>(`/sources/${id}/status`);
    return response.data;
  },
};

export default documentsApi;
