import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { documentService, type SourceResponse } from '@/services/documentService';

export function useDocuments() {
  const { accessToken } = useAuth();
  const [documents, setDocuments] = useState<SourceResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Keep track of polling interval
  const pollIntervalRef = useRef<any>(null);

  const fetchDocuments = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await documentService.listSources(accessToken);
      setDocuments(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch documents.');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  // Ingestion status update function
  const checkProcessingStatus = useCallback(async () => {
    if (!accessToken) return;
    
    // Find documents that are currently processing
    const processingIds = documents
      .filter((d) => ['uploaded', 'extracting', 'chunking', 'embedding', 'indexing'].includes(d.status))
      .map((d) => d.id);

    if (processingIds.length === 0) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    try {
      const updatedDocs = await Promise.all(
        processingIds.map((id) => documentService.getSourceStatus(id, accessToken))
      );

      setDocuments((prev) =>
        prev.map((doc) => {
          const updated = updatedDocs.find((u) => u.id === doc.id);
          return updated ? updated : doc;
        })
      );
    } catch (err) {
      console.error('Error polling document status:', err);
    }
  }, [accessToken, documents]);

  // Poll processing documents
  useEffect(() => {
    const processingDocs = documents.some((d) =>
      ['uploaded', 'extracting', 'chunking', 'embedding', 'indexing'].includes(d.status)
    );

    if (processingDocs) {
      if (!pollIntervalRef.current) {
        pollIntervalRef.current = setInterval(() => {
          void checkProcessingStatus();
        }, 3000); // Poll every 3 seconds
      }
    } else {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [documents, checkProcessingStatus]);

  // Fetch documents on mount or token change
  useEffect(() => {
    void fetchDocuments();
  }, [fetchDocuments]);

  // Upload document
  const upload = async (file: File) => {
    if (!accessToken) throw new Error('Not authenticated');
    setError(null);
    try {
      const newDoc = await documentService.uploadDocument(file, accessToken);
      setDocuments((prev) => [newDoc, ...prev]);
      return newDoc;
    } catch (err: any) {
      setError(err?.message || 'Failed to upload document.');
      throw err;
    }
  };

  // Ingest URL
  const ingestUrl = async (url: string) => {
    if (!accessToken) throw new Error('Not authenticated');
    setError(null);
    try {
      const newDoc = await documentService.ingestUrl(url, accessToken);
      setDocuments((prev) => [newDoc, ...prev]);
      return newDoc;
    } catch (err: any) {
      setError(err?.message || 'Failed to ingest URL.');
      throw err;
    }
  };

  // Ingest YouTube
  const ingestYoutube = async (url: string) => {
    if (!accessToken) throw new Error('Not authenticated');
    setError(null);
    try {
      const newDoc = await documentService.ingestYoutube(url, accessToken);
      setDocuments((prev) => [newDoc, ...prev]);
      return newDoc;
    } catch (err: any) {
      setError(err?.message || 'Failed to ingest YouTube video.');
      throw err;
    }
  };

  // Delete document
  const deleteDocument = async (sourceId: string) => {
    if (!accessToken) throw new Error('Not authenticated');
    setError(null);
    try {
      await documentService.deleteSource(sourceId, accessToken);
      setDocuments((prev) => prev.filter((d) => d.id !== sourceId));
    } catch (err: any) {
      setError(err?.message || 'Failed to delete document.');
      throw err;
    }
  };

  return {
    documents,
    isLoading,
    error,
    refreshDocuments: fetchDocuments,
    uploadDocument: upload,
    ingestUrl,
    ingestYoutube,
    deleteDocument,
  };
}
