"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  CheckIcon,
  ExternalLinkIcon,
  TriangleAlertIcon,
} from "lucide-react";

import { FieldCard } from "@/components/builder/field-card";
import { FieldPalette } from "@/components/builder/palette";
import { CopyLinkButton } from "@/components/forms/copy-link-button";
import { DeleteFormButton } from "@/components/forms/delete-form-button";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Spinner } from "@/components/ui/spinner";
import { cloneField, newField, type Field, type FieldType } from "@/lib/fields";
import { publishForm, saveForm, unpublishForm } from "@/lib/forms/actions";
import { enter, panel, riseIn } from "@/lib/motion";
import { cn } from "@/lib/utils";

type SaveState = "idle" | "saving" | "saved" | "error";

const AUTOSAVE_DELAY = 800;

const SAVE_LABEL: Record<Exclude<SaveState, "idle">, string> = {
  saving: "Saving…",
  saved: "Saved",
  error: "Couldn't save",
};

export function Builder({
  formId,
  initialTitle,
  initialDescription,
  initialFields,
  initialStatus,
}: {
  formId: string;
  initialTitle: string;
  initialDescription: string;
  initialFields: Field[];
  initialStatus: string;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [fields, setFields] = useState<Field[]>(initialFields);
  const [status, setStatus] = useState(initialStatus);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [problems, setProblems] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const isFirstRender = useRef(true);
  /*
   * The draft the debounce is holding, so it can be flushed verbatim if the page
   * unmounts before the timer fires. Without this, typing and immediately
   * switching to Responses would drop the last few keystrokes.
   */
  const draft = useRef({ title, description, fields });
  const unsaved = useRef(false);

  /*
   * Autosave writes the whole document after a pause. No validation here —
   * half-written questions are allowed to be saved. Publishing and submitting
   * are where the rules apply. See docs/design.md.
   */
  useEffect(() => {
    draft.current = { title, description, fields };

    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    unsaved.current = true;
    setSaveState("saving");

    const timer = setTimeout(async () => {
      try {
        await saveForm(formId, draft.current);
        unsaved.current = false;
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, AUTOSAVE_DELAY);

    return () => clearTimeout(timer);
  }, [formId, title, description, fields]);

  useEffect(() => {
    return () => {
      if (!unsaved.current) return;
      unsaved.current = false;
      void saveForm(formId, draft.current).catch(() => {});
    };
  }, [formId]);

  const published = status === "published";

  function updateField(id: string, next: Field) {
    setFields((prev) => prev.map((field) => (field.id === id ? next : field)));
  }

  function removeField(id: string) {
    setFields((prev) => prev.filter((field) => field.id !== id));
  }

  function duplicateField(id: string) {
    setFields((prev) => {
      const index = prev.findIndex((field) => field.id === id);
      if (index < 0) return prev;
      const next = [...prev];
      next.splice(index + 1, 0, cloneField(prev[index]));
      return next;
    });
  }

  function moveField(id: string, delta: number) {
    setFields((prev) => {
      const index = prev.findIndex((field) => field.id === id);
      const target = index + delta;
      if (index < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function handlePublish() {
    startTransition(async () => {
      const result = await publishForm(formId, { title, description, fields });
      if (result.ok) {
        setStatus("published");
        setProblems([]);
        return;
      }
      setProblems(result.problems);
    });
  }

  function handleUnpublish() {
    startTransition(async () => {
      await unpublishForm(formId);
      setStatus("draft");
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-h-7 items-center">
          <SaveIndicator state={saveState} />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          {published ? (
            <>
              <a
                href={`/f/${formId}`}
                target="_blank"
                rel="noreferrer"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                <ExternalLinkIcon />
                Open
              </a>
              <CopyLinkButton formId={formId} />
              <Button
                variant="outline"
                size="sm"
                loading={pending}
                onClick={handleUnpublish}
              >
                Unpublish
              </Button>
            </>
          ) : (
            <Button size="sm" loading={pending} onClick={handlePublish}>
              Publish
            </Button>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {problems.length > 0 ? (
          <motion.div
            key="problems"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={panel}
            className="overflow-hidden"
          >
            <div
              role="status"
              className="flex gap-3 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3.5 text-xs text-destructive"
            >
              <TriangleAlertIcon className="mt-px size-4 shrink-0" />
              <div>
                <p className="font-medium">
                  A few things to fix before publishing
                </p>
                <ul className="mt-1.5 flex list-disc flex-col gap-0.5 pl-4">
                  {problems.map((problem) => (
                    <li key={problem}>{problem}</li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="flex flex-col gap-1.5">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Untitled form"
          aria-label="Form title"
          className="w-full rounded-md border-0 bg-transparent px-0 py-1 font-serif text-2xl leading-tight outline-none transition-shadow placeholder:text-muted-foreground/60 focus-visible:ring-3 focus-visible:ring-ring/40"
        />
        <input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Add a description (optional)"
          aria-label="Form description"
          className="w-full rounded-md border-0 bg-transparent px-0 py-0.5 text-sm text-muted-foreground outline-none transition-shadow placeholder:text-muted-foreground/60 focus-visible:ring-3 focus-visible:ring-ring/40"
        />
      </div>

      <div className="grid gap-8 pb-16 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="flex flex-col gap-3">
          {fields.length === 0 ? (
            <motion.div
              initial={riseIn.initial}
              animate={riseIn.animate}
              transition={enter}
              className="rounded-2xl border border-dashed border-border px-6 py-16 text-center"
            >
              <p className="font-serif text-base">No questions yet.</p>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Add one from the palette to get started.
              </p>
            </motion.div>
          ) : (
            <AnimatePresence initial={false}>
              {fields.map((field, index) => (
                <motion.div
                  key={field.id}
                  layout="position"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={panel}
                  className="overflow-hidden"
                >
                  <FieldCard
                    field={field}
                    index={index}
                    total={fields.length}
                    onChange={(next) => updateField(field.id, next)}
                    onRemove={() => removeField(field.id)}
                    onDuplicate={() => duplicateField(field.id)}
                    onMove={(delta) => moveField(field.id, delta)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          )}

          <div className="flex justify-end pt-2">
            <DeleteFormButton formId={formId} title={title} />
          </div>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <FieldPalette
            onAdd={(type: FieldType) =>
              setFields((prev) => [...prev, newField(type)])
            }
          />
        </aside>
      </div>
    </div>
  );
}

/*
 * Remounts on every state change, so each one rises in rather than the text
 * swapping between frames. `idle` renders nothing — there is no state to report
 * when the form matches what is stored.
 */
function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "idle") return null;

  return (
    <motion.span
      key={state}
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={enter}
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
      aria-live="polite"
    >
      {state === "saving" ? <Spinner className="size-3" /> : null}
      {state === "saved" ? <CheckIcon className="size-3.5" /> : null}
      {state === "error" ? (
        <TriangleAlertIcon className="size-3.5 text-destructive" />
      ) : null}
      <span className={state === "error" ? "text-destructive" : undefined}>
        {SAVE_LABEL[state]}
      </span>
    </motion.span>
  );
}
