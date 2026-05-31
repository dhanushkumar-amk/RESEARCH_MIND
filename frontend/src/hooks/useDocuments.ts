import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import documentsApi, { DocumentSource } from '@/api/documents';
import { useToast } from '@/hooks/useToast';

export function useDocuments() {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  // 1. Fetch and dynamically poll using React Query refetchInterval
  const { data: documents = [], isLoading, error, refetch } = useQuery<DocumentSource[], Error>({
    queryKey: ['documents'],
    queryFn: documentsApi.getDocuments,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      const hasProcessing = data.some(d => 
        ['uploaded', 'extracting', 'chunking', 'embedding', 'indexing'].includes(d.status)
      );
      // Poll every 3 seconds if any doc is processing
      return hasProcessing ? 3000 : false;
    }
  });

  // 2. Mutations using Axios endpoints
  const uploadMutation = useMutation({
    mutationFn: documentsApi.uploadFile,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['documents'] });
      success('Upload complete - indexing started');
    },
    onError: (err: any) => {
      toastError(err.response?.data?.detail || err.message || 'Failed to upload document');
    }
  });

  const urlMutation = useMutation({
    mutationFn: documentsApi.ingestURL,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['documents'] });
      success('URL scraping submitted');
    },
    onError: (err: any) => {
      toastError(err.response?.data?.detail || err.message || 'Failed to ingest URL');
    }
  });

  const youtubeMutation = useMutation({
    mutationFn: documentsApi.ingestYouTube,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['documents'] });
      success('YouTube transcript parser queued');
    },
    onError: (err: any) => {
      toastError(err.response?.data?.detail || err.message || 'Failed to ingest YouTube video');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: documentsApi.deleteDocument,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['documents'] });
      success('Document deleted successfully');
    },
    onError: (err: any) => {
      toastError(err.response?.data?.detail || err.message || 'Failed to delete document');
    }
  });

  return {
    documents,
    isLoading,
    error: error ? error.message : null,
    refreshDocuments: refetch,
    uploadDocument: uploadMutation.mutateAsync,
    ingestUrl: urlMutation.mutateAsync,
    ingestYoutube: youtubeMutation.mutateAsync,
    deleteDocument: deleteMutation.mutateAsync
  };
}

export default useDocuments;
