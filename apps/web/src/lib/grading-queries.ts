import { gradingSettingsSchema, teacherSubmissionSchema } from "@jaweb/shared";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";

import { apiRequest } from "./api";

export const settingsKey = ["teacher", "settings", "grading"] as const;
export const reviewKey = ["teacher", "submissions"] as const;

const REVIEW_POLL_MS = 10_000;
const REVIEW_MAX_POLL_MS = 30_000;

export function useGradingSettings() {
  return useQuery({
    queryKey: settingsKey,
    queryFn: () => apiRequest("/teacher/settings/grading", undefined, gradingSettingsSchema),
  });
}

export function useReviewQueue() {
  const [intervalMs, setIntervalMs] = useState(REVIEW_POLL_MS);
  const lastSignature = useRef<string | null>(null);
  const query = useQuery({
    queryKey: reviewKey,
    queryFn: () => apiRequest("/teacher/submissions", undefined, z.array(teacherSubmissionSchema)),
    // §7.6: pause when the tab is hidden, back off while the queue is unchanged.
    refetchInterval: () => (document.hidden ? false : intervalMs),
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const signature = query.data?.map((item) => `${item.id}:${item.status}`).join("|") ?? "";
    if (signature === lastSignature.current) {
      setIntervalMs((current) => Math.min(current * 2, REVIEW_MAX_POLL_MS));
    } else {
      lastSignature.current = signature;
      setIntervalMs(REVIEW_POLL_MS);
    }
  }, [query.data]);

  return query;
}
