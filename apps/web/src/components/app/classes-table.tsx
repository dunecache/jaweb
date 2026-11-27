import type { ClassDto } from "@jaweb/shared";
import { ArrowDown, ArrowUp } from "lucide-react";

import { ConfirmButton } from "@/components/app/confirm-dialog";
import { RenameDialog } from "@/components/app/rename-dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function moveIds(items: ClassDto[], from: number, to: number): string[] {
  const ids = items.map((item) => item.id);
  const moved = ids[from];
  if (!moved) return ids;
  ids.splice(from, 1);
  ids.splice(to, 0, moved);
  return ids;
}

export function ClassesTable({
  items,
  counts,
  showCounts,
  reorderPending,
  onReorder,
  onRename,
  onArchive,
}: {
  items: ClassDto[];
  counts: Map<string, number>;
  showCounts: boolean;
  reorderPending: boolean;
  onReorder: (ids: string[]) => void;
  onRename: (id: string, name: string) => void;
  onArchive: (id: string) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Order</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item, index) => {
          const previous = index > 0 ? items[index - 1] : undefined;
          const next = index < items.length - 1 ? items[index + 1] : undefined;
          const count = counts.get(item.id) ?? 0;
          return (
            <TableRow key={item.id}>
              <TableCell className="font-medium">
                {item.name}
                {showCounts ? (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {count} {count === 1 ? "student" : "students"}
                  </span>
                ) : null}
              </TableCell>
              <TableCell className="text-muted-foreground">{item.position}</TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Move ${item.name} up`}
                    title="Move up"
                    disabled={!previous || reorderPending}
                    onClick={() => onReorder(moveIds(items, index, index - 1))}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Move ${item.name} down`}
                    title="Move down"
                    disabled={!next || reorderPending}
                    onClick={() => onReorder(moveIds(items, index, index + 1))}
                  >
                    <ArrowDown />
                  </Button>
                  <RenameDialog
                    title="Rename class"
                    description="Students stay in this class."
                    initialValue={item.name}
                    onSave={(value) => onRename(item.id, value)}
                  />
                  <ConfirmButton
                    label="Archive"
                    title="Archive this class?"
                    description="It will disappear from selection. Existing history is kept."
                    confirmLabel="Archive"
                    destructive
                    onConfirm={() => onArchive(item.id)}
                  />
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export function ArchivedClassesTable({ items }: { items: ClassDto[] }) {
  if (!items.length) return null;

  return (
    <div className="space-y-3">
      <h2 className="font-serif text-lg font-semibold text-foreground">Archived classes</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Order</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">
                {item.name}
                <span className="ml-2 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  archived
                </span>
              </TableCell>
              <TableCell className="text-muted-foreground">{item.position}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
