import { Navigate, Outlet } from 'react-router-dom';
// @ts-ignore
import * as authStoreModule from '@/store/authStore';

export const ProtectedRoute = () => {
  let isAuthenticated = true;

  try {
    const useAuthStore = (authStoreModule as any).useAuthStore;
    const authStore = (authStoreModule as any).authStore;
    const defaultExport = (authStoreModule as any).default;

    // 1. Try useAuthStore hook (Zustand style)
    if (typeof useAuthStore === 'function') {
      const state = useAuthStore();
      if (state && typeof state === 'object' && 'isAuthenticated' in state) {
        isAuthenticated = !!state.isAuthenticated;
      }
    }
    // 2. Try named authStore object
    else if (authStore && typeof authStore === 'object' && 'isAuthenticated' in authStore) {
      isAuthenticated = !!authStore.isAuthenticated;
    }
    // 3. Try default export (object or hook)
    else if (defaultExport) {
      if (typeof defaultExport === 'function') {
        const state = (defaultExport as Function)();
        if (state && typeof state === 'object' && 'isAuthenticated' in state) {
          isAuthenticated = !!state.isAuthenticated;
        }
      } else if (typeof defaultExport === 'object' && 'isAuthenticated' in defaultExport) {
        isAuthenticated = !!defaultExport.isAuthenticated;
      }
    }
  } catch (error) {
    // Fallback to true if evaluation fails or throws
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;

