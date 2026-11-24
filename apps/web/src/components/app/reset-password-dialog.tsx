import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetPasswordDialog({ onReset }: { onReset: (password: string) => void }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const id = useId();

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Reset password
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setPassword("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Reset password</DialogTitle>
            <DialogDescription>
              The student's current session will be signed out. Share the new password with them.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor={id}>New password</Label>
            <Input
              id={id}
              type="password"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={password.length < 8}
              onClick={() => {
                onReset(password);
                setPassword("");
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
