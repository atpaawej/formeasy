"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  CheckIcon,
  ExternalLinkIcon,
  LinkIcon,
} from "lucide-react";

import { FieldCard } from "@/components/builder/field-card";
import { FieldPalette } from "@/components/builder/palette";
import { DeleteFormButton } from "@/components/forms/delete-form-button";
import { Button } from "@/components/ui/button";
import { cloneField, newField, type Field, type FieldType } from "@/lib/fields";
import { publishForm, saveForm, unpublishForm } from "@/lib/forms/actions";

type SaveState = "idle" | "saving" | "saved" | "error";

const AUTOSAVE_DELAY = 800;

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
   * Autosave writes the whole document after a pause. No validation here —
   * half-written questions are allowed to be saved. Publishing and submitting
   * are where the rules apply. See docs/design.md.
   */
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    setSaveState("saving");
    const timer = setTimeout(async () => {
      try {
        await saveForm(formId, { title, description, fields });
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, AUTOSAVE_DELAY);

    return () => clearTimeout(timer);
  }, [formId, title, description, fields]);

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
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          Your forms
        </Link>

        <div className="flex items-center gap-3">
          <SaveIndicator state={saveState} />
          {published ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                render={<a href={`/f/${formId}`} target="_blank" rel="noreferrer" />}
              >
                <ExternalLinkIcon />
                Open
              </Button>
              <CopyLinkButton formId={formId} />
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={handleUnpublish}
              >
                Unpublish
              </Button>
            </>
          ) : (
            <Button size="sm" disabled={pending} onClick={handlePublish}>
              {pending ? "Publishing…" : "Publish"}
            </Button>
          )}
        </div>
      </div>

      {problems.length > 0 ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-xs text-destructive">
          <p className="font-medium">Fix these before publishing</p>
          <ul className="mt-1 list-disc pl-4">
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-col gap-1">
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

      <div className="grid gap-6 pb-16 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="flex flex-col gap-3">
          {fields.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-6 py-14 text-center">
              <p className="font-serif text-base">No questions yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add one from the palette to get started.
              </p>
            </div>
          ) : (
            fields.map((field, index) => (
              <FieldCard
                key={field.id}
                field={field}
                index={index}
                total={fields.length}
                onChange={(next) => updateField(field.id, next)}
                onRemove={() => removeField(field.id)}
                onDuplicate={() => duplicateField(field.id)}
                onMove={(delta) => moveField(field.id, delta)}
              />
            ))
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

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "idle") return null;

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      {state === "saved" ? <CheckIcon className="size-3.5" /> : null}
      {state === "saving" ? "Saving…" : null}
      {state === "saved" ? "Saved" : null}
      {state === "error" ? "Couldn't save" : null}
    </span>
  );
}

function CopyLinkButton({ formId }: { formId: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(
      `${window.location.origin}/f/${formId}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button variant="outline" size="sm" onClick={copy}>
      {copied ? <CheckIcon /> : <LinkIcon />}
      {copied ? "Copied" : "Copy link"}
    </Button>
  );
}
