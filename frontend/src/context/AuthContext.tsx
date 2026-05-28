import { createContext, useEffect, useState, type ReactNode } from 'react';

import { API_ENDPOINTS } from '@/constants';
import { authService, type AuthSession, type AuthUser, type RegisterPayload } from '@/services/authService';

type VerifyEmailPayload = {
  email: string;
  code: string;
};

type VerifyResetPayload = {
  email: string;
  code: string;
};

type ResetPasswordPayload = {
  newPassword: string;
  confirmPassword: string;
  resetToken?: string;
  email?: string;
  code?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (email: string, password: string) => Promise<AuthSession>;
  register: (payload: RegisterPayload) => Promise<{ message: string; requiresVerification: boolean }>;
  verifyEmail: (payload: VerifyEmailPayload) => Promise<AuthSession>;
  resendVerification: (email: string) => Promise<{ message: string }>;
  forgotPassword: (email: string) => Promise<{ message: string }>;
  verifyResetCode: (payload: VerifyResetPayload) => Promise<{ message: string; resetToken: string }>;
  resetPassword: (payload: ResetPasswordPayload) => Promise<{ message: string }>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: Partial<AuthUser>) => void;
};

const ACCESS_TOKEN_KEY = 'researchmind.accessToken';
const REFRESH_TOKEN_KEY = 'researchmind.refreshToken';
const USER_KEY = 'researchmind.user';

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());
  const [accessToken, setAccessToken] = useState<string | null>(() => localStorage.getItem(ACCESS_TOKEN_KEY));
  const [refreshToken, setRefreshToken] = useState<string | null>(() => localStorage.getItem(REFRESH_TOKEN_KEY));
  const [isInitializing, setIsInitializing] = useState(true);

  const isAuthenticated = Boolean(user && accessToken);

  function persistSession(session: AuthSession) {
    const stored = readStoredUser();
    const mergedUser: AuthUser = {
      ...session.user,
      avatar: stored?.avatar || session.user.avatar,
      bio: stored?.bio || session.user.bio,
      title: stored?.title || session.user.title,
      name: stored?.name || session.user.name,
      email: stored?.email || session.user.email,
    };
    setUser(mergedUser);
    setAccessToken(session.accessToken);
    setRefreshToken(session.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(mergedUser));
    localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
  }

  function clearSession() {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  useEffect(() => {
    let mounted = true;

    async function bootstrapAuth() {
      if (!accessToken) {
        if (mounted) {
          setIsInitializing(false);
        }
        return;
      }

      try {
        const currentUser = await authService.getCurrentUser(accessToken);
        if (!mounted) {
          return;
        }
        const stored = readStoredUser();
        const mergedUser: AuthUser = {
          ...currentUser,
          avatar: stored?.avatar || currentUser.avatar,
          bio: stored?.bio || currentUser.bio,
          title: stored?.title || currentUser.title,
          name: stored?.name || currentUser.name,
          email: stored?.email || currentUser.email,
        };
        setUser(mergedUser);
        localStorage.setItem(USER_KEY, JSON.stringify(mergedUser));
      } catch {
        if (!refreshToken) {
          clearSession();
          if (mounted) {
            setIsInitializing(false);
          }
          return;
        }

        try {
          const refreshed = await authService.refresh(refreshToken);
          if (!mounted) {
            return;
          }
          persistSession(refreshed);
        } catch {
          clearSession();
        }
      } finally {
        if (mounted) {
          setIsInitializing(false);
        }
      }
    }

    void bootstrapAuth();

    return () => {
      mounted = false;
    };
  }, [accessToken, refreshToken]);

  const updateUser = (updatedFields: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = {
        ...prev,
        ...updatedFields,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const value: AuthContextValue = {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    isInitializing,
    login: async (email, password) => {
      const session = await authService.login(email, password);
      persistSession(session);
      return session;
    },
    register: async (payload) => authService.register(payload),
    verifyEmail: async (payload) => {
      const session = await authService.verifyEmail(payload.email, payload.code);
      persistSession(session);
      return session;
    },
    resendVerification: async (email) => authService.resendVerification(email),
    forgotPassword: async (email) => authService.forgotPassword(email),
    verifyResetCode: async (payload) => authService.verifyResetCode(payload.email, payload.code),
    resetPassword: async (payload) =>
      authService.resetPassword({
        new_password: payload.newPassword,
        confirm_password: payload.confirmPassword,
        reset_token: payload.resetToken,
        email: payload.email,
        code: payload.code,
      }),
    logout: async () => {
      const currentRefreshToken = refreshToken;
      clearSession();

      if (currentRefreshToken) {
        try {
          await authService.logout(currentRefreshToken);
        } catch {
          // Ignore logout network failures after local session cleanup.
        }
      }
    },
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const authStore = {
  get isAuthenticated() {
    return Boolean(localStorage.getItem(ACCESS_TOKEN_KEY) && localStorage.getItem(USER_KEY));
  },
};

export const authStorageKeys = {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  USER_KEY,
  ME_ENDPOINT: API_ENDPOINTS.AUTH.ME,
};
