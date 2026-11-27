import { authUserSchema, type LoginRequest } from "@jaweb/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router";

import { PasswordInput } from "@/components/app/password-input";
import { useToast } from "@/components/app/toaster";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiRequest } from "@/lib/api";
import { meQueryKey } from "@/lib/auth";
import { clearAnswerDrafts } from "@/lib/drafts";

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: (input: LoginRequest) =>
      apiRequest("/auth/login", { method: "POST", body: JSON.stringify(input) }, authUserSchema),
    onSuccess: (user) => {
      // Clear before seeding the new identity: the previous user's cached
      // data must never be rendered for the user who just signed in.
      queryClient.clear();
      // Covers the session-expiry path, which redirects without calling logout.
      clearAnswerDrafts();
      queryClient.setQueryData(meQueryKey, user);
      navigate(user.role === "teacher" ? "/teacher" : "/student", { replace: true });
    },
    onError: () => toast("Sign-in failed. Check your credentials."),
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
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="font-serif text-3xl">Jaweb</CardTitle>
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
              <PasswordInput
                id="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            {message ? (
              <p className="text-sm text-destructive" role="alert">
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
