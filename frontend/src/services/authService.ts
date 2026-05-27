import { apiClient } from '@/services/api';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
};

type BackendUser = {
  id: string;
  name: string;
  email: string;
  is_email_verified: boolean;
  created_at: string;
  updated_at: string;
};

type BackendAuthResponse = {
  user: BackendUser;
  access_token: string;
  refresh_token: string;
  token_type: string;
};

type BackendMessage = {
  message: string;
  requires_verification?: boolean;
  reset_token?: string;
};

export type AuthSession = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  tokenType: string;
};

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

function mapUser(user: BackendUser): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isEmailVerified: user.is_email_verified,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

function mapSession(response: BackendAuthResponse): AuthSession {
  return {
    user: mapUser(response.user),
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    tokenType: response.token_type,
  };
}

export const authService = {
  async register(payload: RegisterPayload) {
    const response = await apiClient.post<BackendMessage>('/auth/register', {
      name: payload.name,
      email: payload.email,
      password: payload.password,
      confirm_password: payload.confirmPassword,
    });

    return {
      message: response.message,
      requiresVerification: Boolean(response.requires_verification),
    };
  },

  async verifyEmail(email: string, code: string) {
    const response = await apiClient.post<BackendAuthResponse>('/auth/verify-email', {
      email,
      code,
    });
    return mapSession(response);
  },

  async resendVerification(email: string) {
    const response = await apiClient.post<BackendMessage>('/auth/resend-verification', { email });
    return { message: response.message };
  },

  async login(email: string, password: string) {
    const response = await apiClient.post<BackendAuthResponse>('/auth/login', {
      email,
      password,
    });
    return mapSession(response);
  },

  async getCurrentUser(token: string) {
    const response = await apiClient.get<BackendUser>('/auth/me', { token });
    return mapUser(response);
  },

  async refresh(refreshToken: string) {
    const response = await apiClient.post<BackendAuthResponse>('/auth/refresh', {
      refresh_token: refreshToken,
    });
    return mapSession(response);
  },

  async logout(refreshToken: string) {
    const response = await apiClient.post<BackendMessage>('/auth/logout', {
      refresh_token: refreshToken,
    });
    return { message: response.message };
  },

  async forgotPassword(email: string) {
    const response = await apiClient.post<BackendMessage>('/auth/forgot-password', { email });
    return { message: response.message };
  },

  async verifyResetCode(email: string, code: string) {
    const response = await apiClient.post<BackendMessage>('/auth/verify-reset-code', { email, code });
    return {
      message: response.message,
      resetToken: response.reset_token ?? '',
    };
  },

  async resetPassword(payload: {
    new_password: string;
    confirm_password: string;
    reset_token?: string;
    email?: string;
    code?: string;
  }) {
    const response = await apiClient.post<BackendMessage>('/auth/reset-password', payload);
    return { message: response.message };
  },
};
