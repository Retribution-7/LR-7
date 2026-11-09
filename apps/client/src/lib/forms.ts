import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import type { ApiError } from './api';

/** Переносит ошибки валидации сервера в поля формы. Возвращает true, если хоть одна ошибка привязана к полю. */
export function applyServerErrors<T extends FieldValues>(
  err: ApiError,
  setError: UseFormSetError<T>,
  fields: string[],
): boolean {
  let applied = false;
  for (const d of err.details ?? []) {
    if (fields.includes(d.path)) {
      setError(d.path as Path<T>, { type: 'server', message: d.message });
      applied = true;
    }
  }
  return applied;
}
