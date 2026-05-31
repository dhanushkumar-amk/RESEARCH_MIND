import axios from 'axios';
import ENV from '@/config/env';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.REACT_APP_API_URL || ENV.API_BASE_URL || 'http://localhost:8000';

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: add Bearer authorization token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('researchmind.accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: handle 401 token expiry, 500 errors, and network errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response ? error.response.status : null;

    if (status === 401) {
      // Clear token and user info
      localStorage.removeItem('researchmind.accessToken');
      localStorage.removeItem('researchmind.refreshToken');
      localStorage.removeItem('researchmind.user');
      
      // Redirect to login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    } else if (status === 500) {
      toast.error('Internal Server Error (500). Please try again later.');
    } else if (!error.response) {
      toast.error('Network Error. Please check your internet connection.');
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
