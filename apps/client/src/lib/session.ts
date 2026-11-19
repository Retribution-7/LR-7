const KEY = 'audit.token';
const REFRESH_KEY = 'audit.refreshToken';

export const getToken = (): string | null => localStorage.getItem(KEY);

export const setToken = (t: string | null) => {
  if (t) localStorage.setItem(KEY, t);
  else localStorage.removeItem(KEY);
};

export const getRefreshToken = (): string | null => localStorage.getItem(REFRESH_KEY);

export const setRefreshToken = (t: string | null) => {
  if (t) localStorage.setItem(REFRESH_KEY, t);
  else localStorage.removeItem(REFRESH_KEY);
};

export const clearSession = () => {
  setToken(null);
  setRefreshToken(null);
};
