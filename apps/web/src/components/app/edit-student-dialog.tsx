import { type ClassDto, type PatchStudentRequest, patchStudentRequestSchema } from "@jaweb/shared";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type FieldErrors, fieldErrors } from "@/lib/form-validation";

export function EditStudentDialog({
  student,
  classes,
  onSave,
}: {
  student: { displayName: string; classId: string | null };
  classes: ClassDto[];
  onSave: (patch: PatchStudentRequest) => void;
}) {
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState(student.displayName);
  const [classId, setClassId] = useState(student.classId ?? "");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const nameId = useId();
  const classIdField = useId();
  const passwordId = useId();

  function patchFrom(name: string, cls: string, pass: string): PatchStudentRequest {
    return {
      displayName: name.trim(),
      classId: cls || null,
      ...(pass ? { password: pass } : {}),
    };
  }

  function syncError(field: string, name: string, cls: string, pass: string) {
    const messages = fieldErrors(patchStudentRequestSchema, patchFrom(name, cls, pass));
    setErrors((current) => {
      const next = { ...current };
      if (messages[field]) next[field] = messages[field] ?? "";
      else delete next[field];
      return next;
    });
  }

  function openDialog() {
    setDisplayName(student.displayName);
    setClassId(student.classId ?? "");
    setPassword("");
    setErrors({});
    setOpen(true);
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={openDialog}>
        Edit
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">Edit student</DialogTitle>
            <DialogDescription>
              Changing the password signs out their current session.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const patch = patchFrom(displayName, classId, password);
              const messages = fieldErrors(patchStudentRequestSchema, patch);
              setErrors(messages);
              if (Object.keys(messages).length > 0) return;
              onSave(patch);
              setOpen(false);
            }}
            noValidate
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor={nameId}>Display name</Label>
              <Input
                id={nameId}
                dir="auto"
                value={displayName}
                onChange={(event) => {
                  setDisplayName(event.target.value);
                  syncError("displayName", event.target.value, classId, password);
                }}
                aria-invalid={Boolean(errors.displayName)}
                aria-describedby={errors.displayName ? `${nameId}-error` : undefined}
              />
              {errors.displayName ? (
                <p id={`${nameId}-error`} className="text-xs text-destructive" role="alert">
                  {errors.displayName}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={classIdField}>Class</Label>
              <select
                id={classIdField}
                className="h-9 rounded-md border border-border bg-card px-3 text-sm"
                value={classId}
                onChange={(event) => setClassId(event.target.value)}
              >
                <option value="">No class</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={passwordId}>New password (optional)</Label>
              <PasswordInput
                id={passwordId}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  syncError("password", displayName, classId, event.target.value);
                }}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? `${passwordId}-error` : undefined}
                placeholder="Leave blank to keep the current one"
              />
              {errors.password ? (
                <p id={`${passwordId}-error`} className="text-xs text-destructive" role="alert">
                  {errors.password}
                </p>
              ) : null}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
