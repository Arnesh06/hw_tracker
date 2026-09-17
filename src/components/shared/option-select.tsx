"use client";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Option } from "@/types/database";

const NONE = "__none__";

/**
 * Radix Select with an optional "None" entry and a hidden input so it posts
 * with native forms. Inactive options stay selectable only if already chosen.
 */
export function OptionSelect({
  id,
  name,
  value,
  onChange,
  options,
  placeholder = "Select…",
  allowNone = false,
  noneLabel = "None",
  invalid,
  disabled,
  className,
}: {
  id?: string;
  name?: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  allowNone?: boolean;
  noneLabel?: string;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const visible = options.filter((o) => o.is_active !== false || o.id === value);
  return (
    <>
      <Select
        value={value || (allowNone ? NONE : undefined)}
        onValueChange={(v) => onChange(v === NONE ? "" : v)}
        disabled={disabled}
      >
        <SelectTrigger id={id} aria-invalid={invalid || undefined} className={className}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {allowNone && (
            <>
              <SelectItem value={NONE} className="text-muted-foreground">
                {noneLabel}
              </SelectItem>
              {visible.length > 0 && <SelectSeparator />}
            </>
          )}
          {visible.length === 0 && !allowNone && (
            <div className="px-2 py-3 text-sm text-muted-foreground">No options yet</div>
          )}
          {visible.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.name}
              {o.is_active === false ? " (inactive)" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {name && <input type="hidden" name={name} value={value} />}
    </>
  );
}
