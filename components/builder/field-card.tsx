"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  CopyIcon,
  Trash2Icon,
} from "lucide-react";

import { FieldRenderer } from "@/components/fields/field-renderer";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { Field } from "@/lib/fields";

/*
 * Builder chrome around a question: reorder, duplicate, delete, required.
 * The question itself is FieldRenderer in edit mode, so what you edit is the
 * same component a respondent will answer.
 */
export function FieldCard({
  field,
  index,
  total,
  onChange,
  onRemove,
  onDuplicate,
  onMove,
}: {
  field: Field;
  index: number;
  total: number;
  onChange: (field: Field) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMove: (delta: number) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-colors focus-within:border-ring/60">
      <FieldRenderer mode="edit" field={field} onFieldChange={onChange} />

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
          <Switch
            size="sm"
            checked={field.required}
            onCheckedChange={(checked) => onChange({ ...field, required: checked })}
          />
          Required
        </label>

        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Move question up"
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            <ArrowUpIcon />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Move question down"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
          >
            <ArrowDownIcon />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Duplicate question"
            onClick={onDuplicate}
          >
            <CopyIcon />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Delete question"
            onClick={onRemove}
          >
            <Trash2Icon />
          </Button>
        </div>
      </div>
    </div>
  );
}
