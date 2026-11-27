import type { ClassDto, PatchStudentRequest } from "@jaweb/shared";
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
  const nameId = useId();
  const classIdField = useId();
  const passwordId = useId();

  function openDialog() {
    setDisplayName(student.displayName);
    setClassId(student.classId ?? "");
    setPassword("");
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
              const patch: PatchStudentRequest = {
                displayName: displayName.trim(),
                classId: classId || null,
              };
              if (password) patch.password = password;
              onSave(patch);
              setOpen(false);
            }}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor={nameId}>Display name</Label>
              <Input
                id={nameId}
                dir="auto"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                required
              />
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
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Leave blank to keep the current one"
              />
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
