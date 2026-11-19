import { create } from 'zustand';
import { api, toApiError } from '@/lib/api';
import { clearSession, getRefreshToken, getToken, setRefreshToken, setToken } from '@/lib/session';
import type { User } from '@/lib/types';

interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}

interface AuthState {
  user: User | null;
  initializing: boolean;
  init: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  initializing: !!getToken(),

  init: async () => {
    if (!getToken()) {
      set({ initializing: false });
      return;
    }
    try {
      const { data } = await api.get<User>('/auth/me');
      set({ user: data, initializing: false });
    } catch {
      clearSession();
      set({ user: null, initializing: false });
    }
  },

  login: async (username, password) => {
    try {
      const { data } = await api.post<AuthResponse>('/auth/login', { username, password });
      setToken(data.token);
      setRefreshToken(data.refreshToken);
      set({ user: data.user });
    } catch (e) {
      throw toApiError(e);
    }
  },

  register: async (username, password) => {
    try {
      const { data } = await api.post<AuthResponse>('/auth/register', { username, password });
      setToken(data.token);
      setRefreshToken(data.refreshToken);
      set({ user: data.user });
    } catch (e) {
      throw toApiError(e);
    }
  },

  logout: () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) void api.post('/auth/logout', { refreshToken }).catch(() => undefined);
    clearSession();
    set({ user: null });
  },

  changePassword: async (oldPassword, newPassword) => {
    try {
      const { data } = await api.post<Partial<AuthResponse> & { message: string }>('/auth/change-password', {
        oldPassword,
        newPassword,
      });
      if (data.token && data.refreshToken) {
        setToken(data.token);
        setRefreshToken(data.refreshToken);
      }
    } catch (e) {
      throw toApiError(e);
    }
  },
}));
