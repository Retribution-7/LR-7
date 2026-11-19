import { HttpError } from '../errors';

export type Q = Record<string, unknown>;

export function str(q: Q, key: string): string | undefined {
  let v = q[key];
  if (Array.isArray(v)) v = v[0];
  if (typeof v !== 'string') return undefined;
  v = v.trim();
  return v === '' ? undefined : (v as string);
}

export function optInt(q: Q, key: string, min = 1, max = Number.MAX_SAFE_INTEGER): number | undefined {
  const s = str(q, key);
  if (s === undefined) return undefined;
  if (!/^-?\d+$/.test(s)) throw new HttpError(400, `Параметр ${key}: ожидается целое число`);
  const n = Number(s);
  if (n < min || n > max) throw new HttpError(400, `Параметр ${key}: допустимый диапазон ${min}–${max}`);
  return n;
}

export function parseDate(s: string, key: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || new Date(`${s}T00:00:00.000Z`).toISOString().slice(0, 10) !== s) {
    throw new HttpError(400, `Параметр ${key}: ожидается дата ГГГГ-ММ-ДД`);
  }
  return new Date(`${s}T00:00:00.000Z`);
}

export function parsePagination(q: Q) {
  const page = optInt(q, 'page', 1, 1_000_000) ?? 1;
  const limit = optInt(q, 'limit', 1, 100) ?? 10;
  return { page, limit, skip: (page - 1) * limit };
}

export function parseId(raw: string): number {
  if (!/^\d+$/.test(raw) || Number(raw) < 1 || Number(raw) > 2_147_483_647) {
    throw new HttpError(400, 'Некорректный id: ожидается положительное целое число');
  }
  return Number(raw);
}

export function nest(path: string, value: unknown): Record<string, unknown> {
  return path
    .split('.')
    .reverse()
    .reduce<unknown>((acc, key) => ({ [key]: acc }), value) as Record<string, unknown>;
}

export function setCond(where: Record<string, any>, path: string, cond: Record<string, unknown>) {
  const keys = path.split('.');
  let cur = where;
  for (let i = 0; i < keys.length - 1; i++) {
    cur[keys[i]] ??= {};
    cur = cur[keys[i]];
  }
  const last = keys[keys.length - 1];
  cur[last] = { ...(cur[last] ?? {}), ...cond };
}
