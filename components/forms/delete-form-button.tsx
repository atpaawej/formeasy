"use client";

import { useState } from "react";

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

export function DeleteFormButton({
  formId,
  title,
}: {
  formId: string;
  title: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="ghost" size="sm" className="text-muted-foreground" />}
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
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <form action={deleteForm.bind(null, formId)}>
            <Button type="submit" variant="destructive" size="sm">
              Delete form
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
