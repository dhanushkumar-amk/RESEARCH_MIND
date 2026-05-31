import { useApp } from '@/context/AppContext';

export function useToast() {
  const { addToast } = useApp();

  return {
    toast: addToast,
    success: (message: string) => addToast(message, 'success'),
    error: (message: string) => addToast(message, 'error'),
    warning: (message: string) => addToast(message, 'warning'),
    info: (message: string) => addToast(message, 'info'),
  };
}

export default useToast;
