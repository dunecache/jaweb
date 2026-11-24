import { type QueryKey, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

// Adaptive polling with a change token (AGENTS §7.6): back off while the
// payload is unchanged, reset on change, and pause entirely when hidden.
export function usePolledQuery<T extends { rev: string }>(
  queryKey: QueryKey,
  path: string,
  baseMs = 5_000,
  maxMs = 30_000,
) {
  const [intervalMs, setIntervalMs] = useState(baseMs);
  const lastRev = useRef<string | null>(null);
  const query = useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api${path}`, { credentials: "same-origin", signal });
      if (response.status === 304) throw new Error("Unexpected 304 without a cached payload");
      if (!response.ok) throw new Error("Request failed");
      return (await response.json()) as T;
    },
    refetchInterval: () => (document.hidden ? false : intervalMs),
    refetchIntervalInBackground: false,
    retry: 1,
  });

  useEffect(() => {
    const rev = query.data?.rev;
    if (!rev) return;
    if (rev === lastRev.current) {
      setIntervalMs((current) => Math.min(current * 2, maxMs));
    } else {
      lastRev.current = rev;
      setIntervalMs(baseMs);
    }
  }, [query.data?.rev, baseMs, maxMs]);

  useEffect(() => {
    function onFocus() {
      if (!document.hidden) void query.refetch();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [query.refetch]);

  return query;
}
