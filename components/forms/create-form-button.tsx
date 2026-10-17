import { Button } from "@/components/ui/button";
import { createForm } from "@/lib/forms/actions";

export function CreateFormButton() {
  return (
    <form action={createForm}>
      <Button type="submit" size="sm">
        New form
      </Button>
    </form>
  );
}
