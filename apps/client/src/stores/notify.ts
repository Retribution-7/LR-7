import { create } from 'zustand';

export interface Toast {
  id: number;
  type: 'success' | 'error';
  title: string;
  description?: string;
}

interface NotifyState {
  toasts: Toast[];
  push: (t: Omit<Toast, 'id'>) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useNotify = create<NotifyState>((set) => ({
  toasts: [],
  push: (t) => set((s) => ({ toasts: [...s.toasts, { ...t, id: nextId++ }] })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const notifySuccess = (title: string, description?: string) =>
  useNotify.getState().push({ type: 'success', title, description });
export const notifyError = (title: string, description?: string) =>
  useNotify.getState().push({ type: 'error', title, description });
