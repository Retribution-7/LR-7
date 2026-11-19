import { useCallback, useEffect, useState } from 'react';
import { api, toApiError } from './api';

export function useDetail<T>(resource: string, id: number) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<T>(`/${resource}/${id}`);
      setData(res.data);
      setNotFound(false);
    } catch (e) {
      const err = toApiError(e);
      if (err.status === 404) setNotFound(true);
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [resource, id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, notFound, error, reload };
}
