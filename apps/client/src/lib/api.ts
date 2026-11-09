import axios from 'axios';

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? '/api' });

export interface FieldIssue {
  path: string;
  message: string;
}

export interface ApiError {
  message: string;
  status?: number;
  details?: FieldIssue[];
}

/** Приводит любую ошибку Axios к единому виду для UI */
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

/** Адрес загруженного фото (путь вида /uploads/...) */
export const fileUrl = (path?: string | null) =>
  path ? `${import.meta.env.VITE_FILES_URL ?? ''}${path}` : null;
