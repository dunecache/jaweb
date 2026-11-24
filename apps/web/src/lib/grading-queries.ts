import { gradingSettingsSchema, teacherSubmissionSchema } from "@jaweb/shared";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { apiRequest } from "./api";

export const settingsKey = ["teacher", "settings", "grading"] as const;
export const reviewKey = ["teacher", "submissions"] as const;

export function useGradingSettings() {
  return useQuery({
    queryKey: settingsKey,
    queryFn: () => apiRequest("/teacher/settings/grading", undefined, gradingSettingsSchema),
  });
}

export function useReviewQueue() {
  return useQuery({
    queryKey: reviewKey,
    queryFn: () => apiRequest("/teacher/submissions", undefined, z.array(teacherSubmissionSchema)),
  });
}
