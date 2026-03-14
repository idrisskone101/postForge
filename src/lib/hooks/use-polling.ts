"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export function usePolling<T>(
  fetchFn: () => Promise<T>,
  interval: number,
  shouldStop: (data: T) => boolean
): { data: T | null; isLoading: boolean; error: Error | null } {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [stopped, setStopped] = useState(false);
  const stoppedRef = useRef(false);

  const poll = useCallback(async () => {
    try {
      const result = await fetchFn();
      setData(result);
      setError(null);
      if (shouldStop(result)) {
        stoppedRef.current = true;
        setStopped(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [fetchFn, shouldStop]);

  useEffect(() => {
    if (stopped) return;

    let active = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const run = async () => {
      await poll();
      if (active && !stoppedRef.current) {
        timeoutId = setTimeout(run, interval);
      }
    };

    run();

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [poll, interval, stopped]);

  return { data, isLoading, error };
}
