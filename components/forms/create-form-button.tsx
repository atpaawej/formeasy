"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { createForm } from "@/lib/forms/actions";

/*
 * Creating a form is a server action, and the redirect it ends in is not
 * instantaneous. `useFormStatus` reports the round-trip, so the button carries
 * its own loading state — a spinner in the label's place — instead of leaving
 * the click with no answer.
 */
export function CreateFormButton() {
  return (
    <form action={createForm}>
      <Submit />
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="sm" loading={pending}>
      New form
    </Button>
  );
}
