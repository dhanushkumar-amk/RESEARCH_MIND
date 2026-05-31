import axiosInstance from './axios';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  is_email_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  user: AuthUser;
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export const authApi = {
  login: async (email: string, password?: string): Promise<AuthResponse> => {
    const response = await axiosInstance.post<AuthResponse>('/auth/login', {
      email,
      password: password || 'password', // Fallback to default password if not provided
    });
    return response.data;
  },

  verifyOTP: async (email: string, otp: string): Promise<AuthResponse> => {
    // Connect verifyOTP to backend verify-email endpoint
    const response = await axiosInstance.post<AuthResponse>('/auth/verify-email', {
      email,
      code: otp,
    });
    return response.data;
  },

  register: async (payload: { name: string; email: string; password?: string; confirmPassword?: string }) => {
    const response = await axiosInstance.post('/auth/register', {
      name: payload.name,
      email: payload.email,
      password: payload.password || 'password',
      confirm_password: payload.confirmPassword || 'password',
    });
    return response.data;
  },

  resendVerification: async (email: string) => {
    const response = await axiosInstance.post('/auth/resend-verification', { email });
    return response.data;
  },

  getMe: async (): Promise<AuthUser> => {
    const response = await axiosInstance.get<AuthUser>('/auth/me');
    return response.data;
  },

  refresh: async (refreshToken: string): Promise<AuthResponse> => {
    const response = await axiosInstance.post<AuthResponse>('/auth/refresh', {
      refresh_token: refreshToken,
    });
    return response.data;
  },

  logout: async (refreshToken?: string): Promise<{ message: string }> => {
    const token = refreshToken || localStorage.getItem('researchmind.refreshToken') || '';
    const response = await axiosInstance.post<{ message: string }>('/auth/logout', {
      refresh_token: token,
    });
    return response.data;
  },

  forgotPassword: async (email: string) => {
    const response = await axiosInstance.post('/auth/forgot-password', { email });
    return response.data;
  },

  verifyResetCode: async (email: string, code: string) => {
    const response = await axiosInstance.post('/auth/verify-reset-code', { email, code });
    return response.data;
  },

  resetPassword: async (payload: any) => {
    const response = await axiosInstance.post('/auth/reset-password', payload);
    return response.data;
  }
};

export default authApi;
