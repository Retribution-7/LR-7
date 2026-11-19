import { create } from 'zustand';
import { api, toApiError } from '@/lib/api';
import { getToken, setToken } from '@/lib/session';
import type { User } from '@/lib/types';

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
      setToken(null);
      set({ user: null, initializing: false });
    }
  },

  login: async (username, password) => {
    try {
      const { data } = await api.post<{ token: string; user: User }>('/auth/login', { username, password });
      setToken(data.token);
      set({ user: data.user });
    } catch (e) {
      throw toApiError(e);
    }
  },

  register: async (username, password) => {
    try {
      const { data } = await api.post<{ token: string; user: User }>('/auth/register', { username, password });
      setToken(data.token);
      set({ user: data.user });
    } catch (e) {
      throw toApiError(e);
    }
  },

  logout: () => {
    setToken(null);
    set({ user: null });
  },

  changePassword: async (oldPassword, newPassword) => {
    try {
      await api.post('/auth/change-password', { oldPassword, newPassword });
    } catch (e) {
      throw toApiError(e);
    }
  },
}));
