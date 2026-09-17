import { fieldLabel } from "@/lib/field-labels";
import { statusLabel } from "@/lib/constants";
import { roleLabel } from "@/lib/permissions";

function display(key: string, value: unknown, names: Record<string, string>): string {
  if (value === null || value === undefined || value === "") return "—";
  if (key === "status") return statusLabel(String(value));
  if (key === "role") return roleLabel(String(value));
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && names[value]) return names[value];
  if (typeof value === "object") return JSON.stringify(value);
  const s = String(value);
  return s.length > 180 ? `${s.slice(0, 177)}…` : s;
}

/** Before/after table for an audit entry. `names` maps reference ids to display names. */
export function ChangeList({
  fields,
  oldData,
  newData,
  names = {},
}: {
  fields: string[];
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  names?: Record<string, string>;
}) {
  if (!fields.length) return null;
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-xs">
        <thead className="bg-muted/60 text-muted-foreground">
          <tr>
            <th className="px-3 py-1.5 text-left font-medium">Field</th>
            <th className="px-3 py-1.5 text-left font-medium">Before</th>
            <th className="px-3 py-1.5 text-left font-medium">After</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {fields.map((f) => (
            <tr key={f} className="align-top">
              <td className="whitespace-nowrap px-3 py-1.5 font-medium">{fieldLabel(f)}</td>
              <td className="break-words px-3 py-1.5 text-muted-foreground line-through decoration-muted-foreground/40">
                {display(f, oldData?.[f], names)}
              </td>
              <td className="break-words px-3 py-1.5">{display(f, newData?.[f], names)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Columns worth showing when a record is created (skips ids and bookkeeping). */
export function createdFields(data: Record<string, unknown> | null) {
  if (!data) return [];
  const skip = new Set(["id", "created_at", "updated_at", "created_by", "updated_by", "archived_at", "archived_by", "storage_path", "component_id", "uploaded_by"]);
  return Object.keys(data).filter((k) => !skip.has(k) && data[k] !== null && data[k] !== "");
}
