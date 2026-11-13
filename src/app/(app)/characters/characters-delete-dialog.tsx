"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { CharacterRecord } from "@/lib/characters";
import { characterDeletionDetail } from "./characters-mutations";

export function CharacterDeleteDialog({
  record,
  onCancel,
  onConfirm,
}: {
  record: CharacterRecord | null;
  onCancel: () => void;
  onConfirm: (record: CharacterRecord) => void;
}) {
  return (
    <AlertDialog open={record !== null} onOpenChange={(open) => (open ? null : onCancel())}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {record?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            {record ? characterDeletionDetail(record) : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="secondary">Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => (record ? onConfirm(record) : null)}
          >
            Delete character
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
