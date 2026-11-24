import { type AuthUser, authUserSchema } from "@jaweb/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "./api";

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
    queryClient.setQueryData(meQueryKey, null);
  };
}

export function setMe(queryClient: ReturnType<typeof useQueryClient>, user: AuthUser | null): void {
  queryClient.setQueryData(meQueryKey, user);
}
