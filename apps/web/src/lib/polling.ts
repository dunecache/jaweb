import { type QueryKey, useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { dispatchUnauthorized } from "./unauthorized";

// Adaptive polling with a change token (AGENTS §7.6): back off while the
// payload is unchanged, reset on change, and pause entirely when hidden.
// The ETag round-trip keeps unchanged polls cheap: the server returns 304 with
// no body and we reuse the last payload so React Query sees no data change.
export function usePolledQuery<T extends { rev: string }>(
  queryKey: QueryKey,
  path: string,
  baseMs = 5_000,
  maxMs = 30_000,
) {
  const lastRev = useRef<string | null>(null);
  const cached = useRef<T | null>(null);
  const intervalMs = useRef(baseMs);

  // Doubling only happens when the rev did not change — including 304s, where
  // the rev is by definition the one we already have, and non-ETag endpoints
  // (the monitor) that answer 200 with an identical payload.
  function applyBackoff(rev: string): void {
    if (rev === lastRev.current) {
      intervalMs.current = Math.min(intervalMs.current * 2, maxMs);
    } else {
      lastRev.current = rev;
      intervalMs.current = baseMs;
    }
  }

  const query = useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const headers: Record<string, string> = {};
      if (cached.current) {
        // The server quotes the rev in the ETag and strips quotes on read.
        headers["If-None-Match"] = `"${cached.current.rev}"`;
      }

      const response = await fetch(`/api${path}`, {
        credentials: "same-origin",
        signal,
        headers,
      });

      if (response.status === 401) {
        dispatchUnauthorized();
        throw new Error("Unauthenticated");
      }

      if (response.status === 304) {
        if (!cached.current) throw new Error("Unexpected 304 without a cached payload");
        applyBackoff(cached.current.rev);
        return cached.current;
      }

      if (!response.ok) throw new Error("Request failed");

      const data = (await response.json()) as T;
      cached.current = data;
      applyBackoff(data.rev);
      return data;
    },
    refetchInterval: () => (document.hidden ? false : intervalMs.current),
    refetchIntervalInBackground: false,
    retry: 1,
  });

  useEffect(() => {
    function onFocus() {
      if (!document.hidden) void query.refetch();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [query.refetch]);

  return query;
}
