import { create } from 'zustand';
import { api } from '@/lib/api';
import type { Category, Company, Employee, Paged } from '@/lib/types';

interface LookupsState {
  categories: Category[];
  companies: Company[];
  employees: Employee[];
  loaded: boolean;
  load: () => Promise<void>;
  reload: () => Promise<void>;
}

const all = async <T,>(resource: string, sortBy: string) =>
  (await api.get<Paged<T>>(`/${resource}`, { params: { limit: 100, sortBy } })).data.data;

export const useLookups = create<LookupsState>((set, get) => ({
  categories: [],
  companies: [],
  employees: [],
  loaded: false,
  async reload() {
    try {
      const [categories, companies, employees] = await Promise.all([
        all<Category>('categories', 'name'),
        all<Company>('companies', 'name'),
        all<Employee>('employees', 'fullName'),
      ]);
      set({ categories, companies, employees, loaded: true });
    } catch {
    }
  },
  async load() {
    if (!get().loaded) await get().reload();
  },
}));
