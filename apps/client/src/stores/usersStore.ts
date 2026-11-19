import { create } from 'zustand';
import { api, toApiError, type ApiError } from '@/lib/api';
import type { Paged, Role, User } from '@/lib/types';
import { notifyError } from './notify';

interface UsersState {
  items: User[];
  total: number;
  loading: boolean;
  load: () => Promise<void>;
  setRole: (id: number, role: Role) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

export const useUsersStore = create<UsersState>((set, get) => ({
  items: [],
  total: 0,
  loading: false,

  load: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get<Paged<User>>('/users', { params: { limit: 100 } });
      set({ items: data.data, total: data.total, loading: false });
    } catch (e) {
      set({ loading: false });
      notifyError('Не удалось загрузить пользователей', toApiError(e).message);
    }
  },

  setRole: async (id, role) => {
    try {
      const { data } = await api.patch<User>(`/users/${id}`, { role });
      set({ items: get().items.map((u) => (u.id === id ? data : u)) });
    } catch (e) {
      const err = e as ApiError;
      notifyError('Не удалось изменить роль', err.message);
      throw e;
    }
  },

  remove: async (id) => {
    try {
      await api.delete(`/users/${id}`);
      set({ items: get().items.filter((u) => u.id !== id), total: get().total - 1 });
    } catch (e) {
      const err = e as ApiError;
      notifyError('Не удалось удалить пользователя', err.message);
      throw e;
    }
  },
}));
