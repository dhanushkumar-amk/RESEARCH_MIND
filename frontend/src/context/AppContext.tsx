import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import documentsApi, { DocumentSource } from '@/api/documents';
import { toast } from 'sonner';

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

interface AppContextType {
  currentSessionId: string;
  documents: DocumentSource[];
  isUploading: boolean;
  uploadProgress: number;
  toasts: ToastItem[];
  addToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  removeToast: (id: string) => void;
  setSession: (id: string) => void;
  refreshDocuments: () => Promise<void>;
  setIsUploading: (uploading: boolean) => void;
  setUploadProgress: (progress: number) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    const stored = localStorage.getItem('researchmind.currentSessionId');
    if (stored) return stored;
    const newId = crypto.randomUUID();
    localStorage.setItem('researchmind.currentSessionId', newId);
    return newId;
  });
  const [documents, setDocuments] = useState<DocumentSource[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    const id = crypto.randomUUID();
    
    // Trigger sonner toast
    if (type === 'success') {
      toast.success(message);
    } else if (type === 'error') {
      toast.error(message);
    } else if (type === 'warning') {
      toast.warning(message);
    } else {
      toast.info(message);
    }

    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto remove toast state tracking
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  const setSession = useCallback((id: string) => {
    setCurrentSessionId(id);
    localStorage.setItem('researchmind.currentSessionId', id);
  }, []);

  const refreshDocuments = useCallback(async () => {
    const token = localStorage.getItem('researchmind.accessToken');
    if (!token) return;
    try {
      const docs = await documentsApi.getDocuments();
      setDocuments(docs);
    } catch (err: any) {
      console.error('Failed to fetch documents:', err);
    }
  }, []);

  // Fetch documents on mount if authenticated
  useEffect(() => {
    const token = localStorage.getItem('researchmind.accessToken');
    if (token) {
      void refreshDocuments();
    }
  }, [refreshDocuments]);

  return (
    <AppContext.Provider
      value={{
        currentSessionId,
        documents,
        isUploading,
        uploadProgress,
        toasts,
        addToast,
        removeToast,
        setSession,
        refreshDocuments,
        setIsUploading,
        setUploadProgress,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
