import { create } from 'zustand';
import { api, toApiError } from '@/lib/api';
import type { Paged } from '@/lib/types';
import { notifyError, notifySuccess } from './notify';
import { useLookups } from './lookups';

export interface ListParams {
  page: number;
  limit: number;
  search: string;
  sortBy: string;
  order: 'asc' | 'desc';
  filters: Record<string, string>;
}

export interface ListState<T> {
  items: T[];
  total: number;
  pages: number;
  loading: boolean;
  error: string | null;
  params: ListParams;
  load: () => Promise<void>;
  setParams: (p: Partial<ListParams>) => void;
  setFilter: (key: string, value: string) => void;
  resetParams: () => void;
  save: (id: number | null, payload: FormData | Record<string, unknown>) => Promise<T>;
  remove: (id: number) => Promise<boolean>;
}

export function createListStore<T>(
  resource: string,
  defaults: { sortBy: string; order?: 'asc' | 'desc' },
  labels: { saved: string; deleted: string },
) {
  const initial: ListParams = {
    page: 1,
    limit: 10,
    search: '',
    sortBy: defaults.sortBy,
    order: defaults.order ?? 'asc',
    filters: {},
  };
  let seq = 0; // защита от «гонки» ответов: учитывается только последний запрос

  return create<ListState<T>>((set, get) => ({
    items: [],
    total: 0,
    pages: 1,
    loading: false,
    error: null,
    params: initial,

    async load() {
      const mine = ++seq;
      set({ loading: true, error: null });
      const { page, limit, search, sortBy, order, filters } = get().params;
      const query: Record<string, string | number> = { page, limit, sortBy, order };
      if (search) query.search = search;
      for (const [k, v] of Object.entries(filters)) if (v) query[k] = v;

      try {
        const { data } = await api.get<Paged<T>>(`/${resource}`, { params: query });
        if (mine !== seq) return;
        if (page > data.pages) {
          set((s) => ({ params: { ...s.params, page: data.pages } }));
          return get().load();
        }
        set({ items: data.data, total: data.total, pages: data.pages, loading: false });
      } catch (e) {
        if (mine !== seq) return;
        set({ loading: false, error: toApiError(e).message });
      }
    },

    setParams(p) {
      set((s) => ({ params: { ...s.params, page: 1, ...p } }));
      void get().load();
    },

    setFilter(key, value) {
      set((s) => ({ params: { ...s.params, page: 1, filters: { ...s.params.filters, [key]: value } } }));
      void get().load();
    },

    resetParams() {
      set((s) => ({ params: { ...initial, limit: s.params.limit } }));
      void get().load();
    },

    async save(id, payload) {
      try {
        const res = id
          ? await api.put<T>(`/${resource}/${id}`, payload)
          : await api.post<T>(`/${resource}`, payload);
        notifySuccess(labels.saved);
        void get().load();
        void useLookups.getState().reload();
        return res.data;
      } catch (e) {
        throw toApiError(e);
      }
    },

    async remove(id) {
      try {
        await api.delete(`/${resource}/${id}`);
        notifySuccess(labels.deleted);
        await get().load();
        void useLookups.getState().reload();
        return true;
      } catch (e) {
        const err = toApiError(e);
        notifyError(err.status === 409 ? 'Удаление невозможно' : 'Не удалось удалить', err.message);
        return false;
      }
    },
  }));
}

export const useCategoriesStore = createListStore<import('@/lib/types').Category>(
  'categories',
  { sortBy: 'id' },
  { saved: 'Категория сохранена', deleted: 'Категория удалена' },
);
export const useEmployeesStore = createListStore<import('@/lib/types').Employee>(
  'employees',
  { sortBy: 'fullName' },
  { saved: 'Сотрудник сохранён', deleted: 'Сотрудник удалён' },
);
export const useCompaniesStore = createListStore<import('@/lib/types').Company>(
  'companies',
  { sortBy: 'name' },
  { saved: 'Предприятие сохранено', deleted: 'Предприятие удалено' },
);
export const useWorksStore = createListStore<import('@/lib/types').Work>(
  'works',
  { sortBy: 'workDate', order: 'desc' },
  { saved: 'Работа сохранена', deleted: 'Работа удалена' },
);
