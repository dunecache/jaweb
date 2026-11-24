import { Button } from "../../components/ui/button";

export function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm rounded-card border border-hairline bg-surface p-6 shadow-modal">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-semibold text-ink">Jaweb</h1>
          <p className="mt-1 text-sm text-ink-muted">جاوب — live classroom answers</p>
        </div>
        <form
          onSubmit={(event) => event.preventDefault()}
          className="flex flex-col gap-4"
          aria-label="Log in"
        >
          <div className="flex flex-col gap-2">
            <label htmlFor="username" className="text-sm font-medium text-ink">
              Username
            </label>
            <input
              id="username"
              name="username"
              autoComplete="username"
              className="h-10 rounded-input border border-hairline bg-surface px-3 text-sm text-ink placeholder:text-ink-muted"
              placeholder="Your username"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-sm font-medium text-ink">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              className="h-10 rounded-input border border-hairline bg-surface px-3 text-sm text-ink placeholder:text-ink-muted"
              placeholder="Your password"
            />
          </div>
          <Button type="submit" className="mt-2 w-full">
            Log in
          </Button>
          <p className="text-center text-xs text-ink-muted">Sign-in arrives in Phase 1.</p>
        </form>
      </div>
    </div>
  );
}
