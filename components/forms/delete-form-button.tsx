"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteForm } from "@/lib/forms/actions";

/*
 * Deleting is destructive and irreversible, so it is behind a dialog that names
 * the form. The confirm button reports its own pending state: a second click
 * while the delete is in flight does nothing.
 */
export function DeleteFormButton({
  formId,
  title,
}: {
  formId: string;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      // Redirects to the dashboard on success.
      await deleteForm(formId);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
          />
        }
      >
        Delete form
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this form?</DialogTitle>
          <DialogDescription>
            “{title}” and every response to it will be deleted. This cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            loading={pending}
            onClick={confirm}
          >
            Delete form
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
