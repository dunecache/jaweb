import {
  classSchema,
  type ExerciseStatus,
  exerciseSchema,
  moduleSchema,
  questionSchema,
  studentSafeQuestionSchema,
} from "@jaweb/shared";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { apiRequest } from "./api";

export const modulesKey = ["teacher", "modules"] as const;
export const exercisesKey = ["teacher", "exercises"] as const;
export const classesKey = ["teacher", "classes"] as const;

export function useModules(includeArchived = false) {
  return useQuery({
    queryKey: [...modulesKey, includeArchived],
    queryFn: () =>
      apiRequest(
        `/teacher/modules${includeArchived ? "?archived=1" : ""}`,
        undefined,
        z.array(moduleSchema),
      ),
  });
}

export function useTeacherClasses() {
  return useQuery({
    queryKey: classesKey,
    queryFn: () => apiRequest("/teacher/classes", undefined, z.array(classSchema)),
  });
}

export function useExercises(filters: { moduleId?: string; status?: ExerciseStatus } = {}) {
  return useQuery({
    queryKey: [...exercisesKey, filters.moduleId ?? "", filters.status ?? ""],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.moduleId) params.set("moduleId", filters.moduleId);
      if (filters.status) params.set("status", filters.status);
      const query = params.toString();
      return apiRequest(
        `/teacher/exercises${query ? `?${query}` : ""}`,
        undefined,
        z.array(exerciseSchema),
      );
    },
  });
}

export function useQuestions(exerciseId: string) {
  return useQuery({
    queryKey: ["teacher", "exercises", exerciseId, "questions"],
    queryFn: () =>
      apiRequest(`/teacher/exercises/${exerciseId}/questions`, undefined, z.array(questionSchema)),
  });
}

export const previewSchema = z.object({
  exercise: exerciseSchema,
  questions: z.array(studentSafeQuestionSchema),
  ready: z.boolean(),
  issues: z.array(
    z.object({ path: z.array(z.union([z.string(), z.number()])), message: z.string() }),
  ),
});

export function usePreview(exerciseId: string) {
  return useQuery({
    queryKey: ["teacher", "exercises", exerciseId, "preview"],
    queryFn: () => apiRequest(`/teacher/exercises/${exerciseId}/preview`, undefined, previewSchema),
  });
}
