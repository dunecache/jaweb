import { type AuthUser, authUserSchema } from "@jaweb/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "./api";
import { clearAnswerDrafts } from "./drafts";

export const meQueryKey = ["auth", "me"] as const;

export function useMe() {
  return useQuery({
    queryKey: meQueryKey,
    queryFn: () => apiRequest("/auth/me", undefined, authUserSchema),
    retry: false,
  });
}

export function useLogout(): () => Promise<void> {
  const queryClient = useQueryClient();
  return async () => {
    await apiRequest("/auth/logout", { method: "POST" });
    // Drop every cached payload (student answers/verdicts, teacher data,
    // leaderboards) and local answer drafts so a different user on a shared
    // device cannot see them.
    clearAnswerDrafts();
    queryClient.clear();
    queryClient.setQueryData(meQueryKey, null);
  };
}

export function setMe(queryClient: ReturnType<typeof useQueryClient>, user: AuthUser | null): void {
  queryClient.setQueryData(meQueryKey, user);
}
