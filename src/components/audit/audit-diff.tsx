"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const HIDDEN = new Set(["updated_at", "updated_by", "created_by", "archived_by", "search_text"]);

function show(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

/** Before/after view of an audit entry. */
export function AuditDiff({
  action,
  changed,
  oldData,
  newData,
  metadata,
  defaultOpen = false,
}: {
  action: string;
  changed: string[] | null;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  let rows: { key: string; before: unknown; after: unknown }[] = [];
  if (action === "UPDATE") {
    rows = (changed ?? []).filter((k) => !HIDDEN.has(k)).map((k) => ({ key: k, before: oldData?.[k], after: newData?.[k] }));
  } else if (action === "INSERT") {
    rows = Object.entries(newData ?? {})
      .filter(([k, v]) => !HIDDEN.has(k) && v !== null && v !== "")
      .map(([k, v]) => ({ key: k, before: undefined, after: v }));
  } else if (action === "DELETE") {
    rows = Object.entries(oldData ?? {})
      .filter(([k, v]) => !HIDDEN.has(k) && v !== null && v !== "")
      .map(([k, v]) => ({ key: k, before: v, after: undefined }));
  } else if (metadata) {
    rows = Object.entries(metadata).map(([k, v]) => ({ key: k, before: undefined, after: v }));
  }

  if (!rows.length) return <span className="text-xs text-muted-foreground">No field details</span>;

  const summary =
    action === "UPDATE"
      ? rows.slice(0, 4).map((r) => r.key).join(", ") + (rows.length > 4 ? ` +${rows.length - 4}` : "")
      : `${rows.length} ${rows.length === 1 ? "field" : "fields"}`;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex max-w-full items-center gap-1 text-left text-xs text-muted-foreground hover:text-foreground"
        aria-expanded={open}
      >
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", open && "rotate-180")} />
        <span className="truncate font-mono">{summary}</span>
      </button>
      {open && (
        <div className="mt-2 overflow-x-auto rounded-md border bg-muted/40">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-3 py-1.5 font-medium">Field</th>
                {action === "UPDATE" && <th className="px-3 py-1.5 font-medium">Before</th>}
                <th className="px-3 py-1.5 font-medium">{action === "UPDATE" ? "After" : "Value"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-b last:border-0 align-top">
                  <td className="whitespace-nowrap px-3 py-1.5 font-mono text-muted-foreground">{r.key}</td>
                  {action === "UPDATE" && (
                    <td className="max-w-[18rem] break-words px-3 py-1.5 text-status-damaged line-through decoration-1">{show(r.before)}</td>
                  )}
                  {action === "DELETE" ? (
                    <td className="max-w-[24rem] break-words px-3 py-1.5">{show(r.before)}</td>
                  ) : (
                    <td className="max-w-[24rem] break-words px-3 py-1.5 text-status-available">{show(r.after)}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
