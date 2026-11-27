import { exerciseSchema } from "@jaweb/shared";
import { useQuery } from "@tanstack/react-query";

import { apiRequest } from "./api";

export function useExercise(id: string) {
  return useQuery({
    queryKey: ["teacher", "exercises", id],
    queryFn: () => apiRequest(`/teacher/exercises/${id}`, undefined, exerciseSchema),
    enabled: id.length > 0,
  });
}
