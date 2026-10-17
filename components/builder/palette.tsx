"use client";

import {
  AlignLeftIcon,
  CalendarIcon,
  ChevronDownIcon,
  CircleDotIcon,
  HashIcon,
  ListChecksIcon,
  TextIcon,
} from "lucide-react";
import type { ComponentType } from "react";

import { Button } from "@/components/ui/button";
import {
  FIELD_TYPE_LABELS,
  FIELD_TYPE_ORDER,
  type FieldType,
} from "@/lib/fields";

const ICONS: Record<FieldType, ComponentType<{ className?: string }>> = {
  short_text: TextIcon,
  long_text: AlignLeftIcon,
  single_choice: CircleDotIcon,
  multi_choice: ListChecksIcon,
  dropdown: ChevronDownIcon,
  number: HashIcon,
  date: CalendarIcon,
};

export function FieldPalette({
  onAdd,
}: {
  onAdd: (type: FieldType) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-muted-foreground">Add question</p>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
        {FIELD_TYPE_ORDER.map((type) => {
          const Icon = ICONS[type];
          return (
            <Button
              key={type}
              type="button"
              variant="outline"
              size="sm"
              /* Two columns on a phone is tight for the longer names, so the
                 label wraps and the cell grows instead of clipping. */
              className="h-auto min-h-7 w-full justify-start py-1.5 text-left whitespace-normal"
              onClick={() => onAdd(type)}
            >
              <Icon />
              {FIELD_TYPE_LABELS[type]}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
