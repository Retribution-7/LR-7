import axios from 'axios';
import { getRefreshToken, getToken, setRefreshToken, setToken } from './session';

const baseURL = import.meta.env.VITE_API_URL ?? '/api';

export const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const t = getToken();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

interface TokenPair {
  token: string;
  refreshToken: string;
}

let refreshInFlight: Promise<TokenPair> | null = null;

const refreshSession = (): Promise<TokenPair> => {
  refreshInFlight ??= (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) throw new Error('Refresh-токен отсутствует');
    const { data } = await axios.post<TokenPair>(`${baseURL}/auth/refresh`, { refreshToken });
    setToken(data.token);
    setRefreshToken(data.refreshToken);
    return data;
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
};

api.interceptors.response.use(undefined, async (error) => {
  const original = error.config;
  if (axios.isAxiosError(error) && error.response?.status === 401 && original && !original._retry) {
    const url = original.url ?? '';
    if (!url.includes('/auth/')) {
      original._retry = true;
      try {
        const { token } = await refreshSession();
        original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
        return api.request(original);
      } catch {
        import('@/stores/authStore').then(({ useAuthStore }) => useAuthStore.getState().logout());
      }
    }
  }
  return Promise.reject(error);
});

export interface FieldIssue {
  path: string;
  message: string;
}

export interface ApiError {
  message: string;
  status?: number;
  details?: FieldIssue[];
}

export function toApiError(e: unknown): ApiError {
  if (axios.isAxiosError(e)) {
    if (!e.response) return { message: 'Нет связи с сервером. Проверьте, что API запущен.' };
    const d = e.response.data as { message?: string; details?: unknown } | undefined;
    return {
      status: e.response.status,
      message: d?.message ?? `Ошибка запроса (${e.response.status})`,
      details: Array.isArray(d?.details) ? (d!.details as FieldIssue[]) : undefined,
    };
  }
  return { message: e instanceof Error ? e.message : 'Неизвестная ошибка' };
}

export const fileUrl = (path?: string | null) =>
  path ? `${import.meta.env.VITE_FILES_URL ?? ''}${path}` : null;
