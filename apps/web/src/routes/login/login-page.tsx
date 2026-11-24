import { authUserSchema, type LoginRequest } from "@jaweb/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiRequest } from "@/lib/api";
import { meQueryKey } from "@/lib/auth";

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: (input: LoginRequest) =>
      apiRequest("/auth/login", { method: "POST", body: JSON.stringify(input) }, authUserSchema),
    onSuccess: (user) => {
      queryClient.setQueryData(meQueryKey, user);
      navigate(user.role === "teacher" ? "/teacher" : "/student", { replace: true });
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.mutate({ username, password });
  }

  const message =
    mutation.error instanceof ApiError
      ? mutation.error.envelope.error.message
      : mutation.error
        ? "Could not sign in. Try again."
        : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="font-display text-3xl">Jaweb</CardTitle>
          <CardDescription>جاوب — live classroom answers</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4" aria-label="Log in">
            <div className="flex flex-col gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                autoComplete="username"
                dir="auto"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            {message ? (
              <p className="text-sm text-danger" role="alert">
                {message}
              </p>
            ) : null}
            <Button type="submit" className="mt-2 w-full" disabled={mutation.isPending}>
              {mutation.isPending ? "Signing in" : "Log in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
