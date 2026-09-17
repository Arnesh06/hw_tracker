import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SORTABLE_COLUMNS, STATUS_VALUES, type SortColumn } from "@/lib/constants";
import { escapeLike } from "@/lib/utils";

export type InventoryFilters = {
  q?: string;
  status?: string;
  category?: string;
  project?: string;
  provider?: string;
  vendor?: string;
  location?: string;
  archived?: "active" | "archived" | "all";
  warranty?: "expiring" | "expired";
  sort: SortColumn;
  dir: "asc" | "desc";
  page: number;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RawParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export function parseInventoryParams(sp: RawParams): InventoryFilters {
  const uuid = (k: string) => {
    const v = first(sp[k]);
    return v && UUID_RE.test(v) ? v : undefined;
  };
  const status = first(sp.status);
  const sort = first(sp.sort);
  const archived = first(sp.archived);
  const warranty = first(sp.warranty);
  const page = Number(first(sp.page) ?? "1");
  return {
    q: first(sp.q)?.trim().slice(0, 120) || undefined,
    status: status && (STATUS_VALUES as readonly string[]).includes(status) ? status : undefined,
    category: uuid("category"),
    project: uuid("project"),
    provider: uuid("provider"),
    vendor: uuid("vendor"),
    location: uuid("location"),
    archived: archived === "archived" || archived === "all" ? archived : "active",
    warranty: warranty === "expiring" || warranty === "expired" ? warranty : undefined,
    sort: sort && sort in SORTABLE_COLUMNS ? (sort as SortColumn) : "updated_at",
    dir: first(sp.dir) === "asc" ? "asc" : "desc",
    page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Query = any;

/** Applies inventory filters to a query on v_components. */
export function applyInventoryFilters(query: Query, f: InventoryFilters, warrantyDays = 30): Query {
  let q = query;
  if (f.q) {
    for (const term of f.q.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6)) {
      q = q.ilike("search_text", `%${escapeLike(term)}%`);
    }
  }
  if (f.status) q = q.eq("status", f.status);
  if (f.category) q = q.eq("category_id", f.category);
  if (f.project) q = q.eq("project_id", f.project);
  if (f.provider) q = q.eq("provider_id", f.provider);
  if (f.vendor) q = q.eq("vendor_id", f.vendor);
  if (f.location) q = q.eq("location_id", f.location);
  if (f.archived === "active") q = q.is("archived_at", null);
  if (f.archived === "archived") q = q.not("archived_at", "is", null);
  if (f.warranty) {
    const today = new Date().toISOString().slice(0, 10);
    if (f.warranty === "expired") {
      q = q.lt("warranty_expiry", today);
    } else {
      const until = new Date(Date.now() + warrantyDays * 86400000).toISOString().slice(0, 10);
      q = q.gte("warranty_expiry", today).lte("warranty_expiry", until);
    }
  }
  q = q.order(f.sort, { ascending: f.dir === "asc", nullsFirst: false });
  if (f.sort !== "hw_id") q = q.order("hw_id", { ascending: false });
  return q;
}

export async function fetchInventoryPage(
  supabase: SupabaseClient,
  f: InventoryFilters,
  pageSize: number,
  warrantyDays: number,
) {
  const from = (f.page - 1) * pageSize;
  const base = supabase
    .from("v_components")
    .select(
      "id, hw_id, name, manufacturer, model, category_name, quantity, status, current_owner, current_holder, location_name, project_name, provider_name, received_date, total_value, unit_cost, serial_number, archived_at, updated_at",
      { count: "exact" },
    );
  const { data, count, error } = await applyInventoryFilters(base, f, warrantyDays).range(from, from + pageSize - 1);
  return { data: data ?? [], count: count ?? 0, error };
}

export const EXPORT_COLUMNS: { key: string; header: string }[] = [
  { key: "hw_id", header: "HW ID" },
  { key: "name", header: "Component Name" },
  { key: "category_name", header: "Category" },
  { key: "quantity", header: "Quantity" },
  { key: "provider_name", header: "Given By/Source" },
  { key: "current_owner", header: "Current Owner" },
  { key: "status", header: "Status" },
  { key: "received_date", header: "Received Date" },
  { key: "manufacturer", header: "Manufacturer" },
  { key: "model", header: "Model" },
  { key: "part_number", header: "Part Number" },
  { key: "serial_number", header: "Serial Number" },
  { key: "vendor_name", header: "Vendor" },
  { key: "purchase_date", header: "Purchase Date" },
  { key: "unit_cost", header: "Unit Cost" },
  { key: "total_value", header: "Total Value" },
  { key: "invoice_number", header: "Invoice Number" },
  { key: "warranty_expiry", header: "Warranty Expiry" },
  { key: "current_holder", header: "Current Holder" },
  { key: "location_name", header: "Location" },
  { key: "project_name", header: "Project" },
  { key: "description", header: "Description" },
  { key: "specifications", header: "Specifications" },
  { key: "notes", header: "Notes" },
  { key: "archived_at", header: "Archived At" },
  { key: "created_at", header: "Created At" },
  { key: "updated_at", header: "Updated At" },
];
