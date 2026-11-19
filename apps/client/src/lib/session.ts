const KEY = 'audit.token';

export const getToken = (): string | null => localStorage.getItem(KEY);

export const setToken = (t: string | null) => {
  if (t) localStorage.setItem(KEY, t);
  else localStorage.removeItem(KEY);
};
