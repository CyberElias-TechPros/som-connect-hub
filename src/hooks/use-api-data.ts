import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '@/lib/api-client';

export interface UseApiDataResult<T> {
  /** API data when available, otherwise the seeded initial value. */
  data: T;
  loading: boolean;
  /** True while showing local/fallback data because the API is unreachable. */
  offline: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setData: (next: T | ((previous: T) => T)) => void;
}

/**
 * Small data-loading hook used across the app.
 *
 * It renders the supplied `initial` value immediately (mock data or a cached
 * snapshot) so every screen paints instantly, then swaps in live API data as
 * soon as it arrives. Errors never blank the UI — they are reported through
 * `error`/`offline` so screens can stay useful.
 */
export function useApiData<T>(
  loader: () => Promise<T>,
  initial: T,
  deps: unknown[] = [],
  options: { enabled?: boolean; pollMs?: number } = {},
): UseApiDataResult<T> {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async () => {
    if (options.enabled === false) return;
    setLoading(true);
    try {
      const result = await loaderRef.current();
      if (!mounted.current) return;
      if (result !== undefined && result !== null) setData(result);
      setError(null);
      setOffline(false);
    } catch (caught: any) {
      if (!mounted.current) return;
      const apiError = caught instanceof ApiError ? caught : new ApiError(caught?.message ?? 'Request failed');
      setError(apiError.friendly);
      setOffline(apiError.unavailable);
    } finally {
      if (mounted.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.enabled]);

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (!options.pollMs) return;
    const timer = setInterval(run, options.pollMs);
    return () => clearInterval(timer);
  }, [options.pollMs, run]);

  return { data, loading, offline, error, refresh: run, setData };
}

export default useApiData;
