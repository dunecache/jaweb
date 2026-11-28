import { patchStudentRequestSchema } from "@jaweb/shared";
import { useId, useState } from "react";

import { PasswordInput } from "@/components/app/password-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { fieldErrors } from "@/lib/form-validation";

export function ResetPasswordDialog({ onReset }: { onReset: (password: string) => void }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const id = useId();

  function change(value: string) {
    setPassword(value);
    setError(fieldErrors(patchStudentRequestSchema, { password: value }).password);
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Reset password
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setPassword("");
            setError(undefined);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">Reset password</DialogTitle>
            <DialogDescription>
              The student's current session will be signed out. Share the new password with them.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor={id}>New password</Label>
            <PasswordInput
              id={id}
              value={password}
              onChange={(event) => change(event.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${id}-error` : undefined}
            />
            {error ? (
              <p id={`${id}-error`} className="text-xs text-destructive" role="alert">
                {error}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">At least 8 characters</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={Boolean(error) || password.length === 0}
              onClick={() => {
                onReset(password);
                setPassword("");
                setError(undefined);
                setOpen(false);
              }}
            >
              Set password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
