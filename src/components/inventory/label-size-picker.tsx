"use client";
import { useQueryParams } from "./use-query-params";
import { cn } from "@/lib/utils";

const SIZES = [
  { value: "sm", label: "Small (4 per row)" },
  { value: "md", label: "Medium (3 per row)" },
  { value: "lg", label: "Large (2 per row)" },
];

export function LabelSizePicker({ value }: { value: string }) {
  const { set } = useQueryParams();
  return (
    <div role="radiogroup" aria-label="Label size" className="inline-flex rounded-lg bg-muted p-1">
      {SIZES.map((s) => (
        <button
          key={s.value}
          type="button"
          role="radio"
          aria-checked={value === s.value}
          onClick={() => set({ size: s.value === "md" ? null : s.value }, { keepPage: true })}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground",
            value === s.value ? "bg-card text-foreground shadow-sm" : "hover:text-foreground",
          )}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
