import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { componentSchema, type ComponentInput } from "@/lib/validations";
import { STATUS_VALUES, type ComponentStatus } from "@/lib/constants";
import { todayISO } from "@/lib/utils";

export const IMPORT_MAX_ROWS = 5000;

type FieldKey =
  | "name" | "category" | "quantity" | "provider" | "current_owner" | "status" | "received_date"
  | "manufacturer" | "model" | "part_number" | "serial_number" | "vendor" | "purchase_date"
  | "unit_cost" | "invoice_number" | "warranty_expiry" | "current_holder" | "location"
  | "project" | "description" | "specifications" | "notes";

export const IMPORT_FIELDS: { key: FieldKey; header: string; required: boolean; aliases: string[]; example: string }[] = [
  { key: "name", header: "Component Name", required: true, aliases: ["name", "component", "item", "item name"], example: "ESP32 DevKit V1" },
  { key: "category", header: "Category", required: true, aliases: ["type", "category name"], example: "Microcontroller boards" },
  { key: "quantity", header: "Quantity", required: true, aliases: ["qty", "count", "units"], example: "5" },
  { key: "provider", header: "Given By/Source", required: true, aliases: ["given by", "source", "provider", "given by source", "provided by"], example: "Department purchase" },
  { key: "current_owner", header: "Current Owner", required: true, aliases: ["owner"], example: "ECE Department" },
  { key: "status", header: "Status", required: false, aliases: ["state", "condition"], example: "Available" },
  { key: "received_date", header: "Received Date", required: true, aliases: ["received", "received on", "date received"], example: "2026-08-14" },
  { key: "manufacturer", header: "Manufacturer", required: false, aliases: ["make", "brand"], example: "Espressif" },
  { key: "model", header: "Model", required: false, aliases: [], example: "ESP32-WROOM-32" },
  { key: "part_number", header: "Part Number", required: false, aliases: ["part no", "part", "mpn", "pn"], example: "ESP32-DEVKITC-32E" },
  { key: "serial_number", header: "Serial Number", required: false, aliases: ["serial", "serial no", "sn", "s n"], example: "" },
  { key: "vendor", header: "Vendor", required: false, aliases: ["supplier", "seller"], example: "Robu.in" },
  { key: "purchase_date", header: "Purchase Date", required: false, aliases: ["purchased", "purchased on"], example: "2026-08-10" },
  { key: "unit_cost", header: "Unit Cost", required: false, aliases: ["cost", "price", "unit price"], example: "450" },
  { key: "invoice_number", header: "Invoice Number", required: false, aliases: ["invoice", "invoice no", "bill no"], example: "INV-2291" },
  { key: "warranty_expiry", header: "Warranty Expiry", required: false, aliases: ["warranty", "warranty until", "warranty end"], example: "2027-08-10" },
  { key: "current_holder", header: "Current Holder", required: false, aliases: ["holder", "issued to", "assigned to"], example: "" },
  { key: "location", header: "Location", required: false, aliases: ["place", "store"], example: "Main store" },
  { key: "project", header: "Project", required: false, aliases: ["project name"], example: "" },
  { key: "description", header: "Description", required: false, aliases: [], example: "" },
  { key: "specifications", header: "Specifications", required: false, aliases: ["specs", "spec"], example: "Dual-core, Wi-Fi + BLE" },
  { key: "notes", header: "Notes", required: false, aliases: ["remarks", "comments"], example: "" },
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Maps arbitrary spreadsheet headers to HW-Track fields. */
export function mapHeaders(headers: string[]) {
  const map = new Map<string, FieldKey>();
  const lookup = new Map<string, FieldKey>();
  IMPORT_FIELDS.forEach((f) => {
    lookup.set(norm(f.header), f.key);
    lookup.set(norm(f.key), f.key);
    f.aliases.forEach((a) => lookup.set(norm(a), f.key));
  });
  const used = new Set<FieldKey>();
  headers.forEach((h) => {
    const key = lookup.get(norm(h));
    if (key && !used.has(key)) {
      map.set(h, key);
      used.add(key);
    }
  });
  const missingRequired = IMPORT_FIELDS.filter((f) => f.required && !used.has(f.key)).map((f) => f.header);
  return { map, missingRequired, unmapped: headers.filter((h) => !map.has(h)) };
}

const STATUS_ALIASES: Record<string, ComponentStatus> = {
  available: "available", "in stock": "available", stock: "available", free: "available", new: "available", working: "available",
  "in use": "in_use", inuse: "in_use", used: "in_use", assigned: "in_use", issued: "in_use", "in_use": "in_use",
  damaged: "damaged", broken: "damaged", faulty: "damaged", defective: "damaged",
  repair: "repair", "in repair": "repair", "under repair": "repair", servicing: "repair", maintenance: "repair",
  retired: "retired", disposed: "retired", scrapped: "retired", "end of life": "retired", eol: "retired",
};

function parseStatus(raw: string): ComponentStatus | null {
  if (!raw) return "available";
  const n = norm(raw);
  if ((STATUS_VALUES as readonly string[]).includes(raw.trim())) return raw.trim() as ComponentStatus;
  return STATUS_ALIASES[n] ?? null;
}

/** Accepts YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY, and ISO datetimes. */
export function parseDate(raw: string): string | null | "invalid" {
  const s = raw.trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/);
  let y: number, mo: number, d: number;
  if (m) {
    [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  } else if ((m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/))) {
    [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  } else if (/^\d{5}$/.test(s)) {
    // Excel serial date
    const date = new Date(Date.UTC(1899, 11, 30) + Number(s) * 86400000);
    return date.toISOString().slice(0, 10);
  } else {
    return "invalid";
  }
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return "invalid";
  return date.toISOString().slice(0, 10);
}

export type ImportRowResult = {
  row: number;
  name: string;
  errors: string[];
  willCreate: string[];
};

type RefTable = "categories" | "providers" | "vendors" | "locations" | "projects";

export async function validateImport(
  supabase: SupabaseClient,
  rawRows: Record<string, string>[],
  opts: { autoCreate: boolean; commit: boolean },
) {
  const headers = Array.from(new Set(rawRows.flatMap((r) => Object.keys(r))));
  const { map, missingRequired } = mapHeaders(headers);
  if (missingRequired.length) {
    return {
      fatal: `Missing required column(s): ${missingRequired.join(", ")}. Download the template to see the expected headers.`,
      results: [] as ImportRowResult[],
      valid: 0,
      inserted: 0,
    };
  }

  // Load reference data once.
  const tables: RefTable[] = ["categories", "providers", "vendors", "locations", "projects"];
  const refs = {} as Record<RefTable, Map<string, string>>;
  await Promise.all(
    tables.map(async (t) => {
      const { data } = await supabase.from(t).select("id, name").limit(10000);
      refs[t] = new Map(((data as { id: string; name: string }[] | null) ?? []).map((r) => [r.name.trim().toLowerCase(), r.id]));
    }),
  );
  const pendingCreate: Record<RefTable, Map<string, string>> = {
    categories: new Map(), providers: new Map(), vendors: new Map(), locations: new Map(), projects: new Map(),
  };

  const resolve = (table: RefTable, label: string, name: string, required: boolean, errors: string[], willCreate: string[]) => {
    const clean = name.trim();
    if (!clean) {
      if (required) errors.push(`${label} is required`);
      return null;
    }
    const id = refs[table].get(clean.toLowerCase());
    if (id) return id;
    if (opts.autoCreate) {
      pendingCreate[table].set(clean.toLowerCase(), clean);
      willCreate.push(`${label}: ${clean}`);
      return `pending:${table}:${clean.toLowerCase()}`;
    }
    errors.push(`${label} "${clean}" doesn't exist`);
    return null;
  };

  const results: ImportRowResult[] = [];
  const candidates: { index: number; input: Record<string, unknown> }[] = [];

  rawRows.slice(0, IMPORT_MAX_ROWS).forEach((raw, i) => {
    const v: Partial<Record<FieldKey, string>> = {};
    for (const [header, key] of map) v[key] = (raw[header] ?? "").toString().trim();
    const errors: string[] = [];
    const willCreate: string[] = [];

    const status = parseStatus(v.status ?? "");
    if (!status) errors.push(`Unknown status "${v.status}"`);

    const dates: Record<string, string | null> = {};
    for (const [k, label] of [["received_date", "Received date"], ["purchase_date", "Purchase date"], ["warranty_expiry", "Warranty expiry"]] as const) {
      const parsed = parseDate(v[k] ?? "");
      if (parsed === "invalid") errors.push(`${label} "${v[k]}" isn't a valid date (use YYYY-MM-DD or DD/MM/YYYY)`);
      dates[k] = parsed === "invalid" ? null : parsed;
    }

    const input: Record<string, unknown> = {
      name: v.name ?? "",
      category_id: resolve("categories", "Category", v.category ?? "", true, errors, willCreate),
      quantity: v.quantity ?? "",
      provider_id: resolve("providers", "Given By/Source", v.provider ?? "", true, errors, willCreate),
      current_owner: v.current_owner ?? "",
      status: status ?? "available",
      received_date: dates.received_date ?? "",
      manufacturer: v.manufacturer,
      model: v.model,
      part_number: v.part_number,
      serial_number: v.serial_number,
      vendor_id: resolve("vendors", "Vendor", v.vendor ?? "", false, errors, willCreate),
      purchase_date: dates.purchase_date,
      unit_cost: v.unit_cost,
      invoice_number: v.invoice_number,
      warranty_expiry: dates.warranty_expiry,
      current_holder: v.current_holder,
      location_id: resolve("locations", "Location", v.location ?? "", false, errors, willCreate),
      project_id: resolve("projects", "Project", v.project ?? "", false, errors, willCreate),
      description: v.description,
      specifications: v.specifications,
      notes: v.notes,
    };

    // Validate everything except pending references (placeholder UUID for the check).
    const PLACEHOLDER = "00000000-0000-4000-8000-000000000000";
    const probe = Object.fromEntries(
      Object.entries(input).map(([k, val]) => [k, typeof val === "string" && val.startsWith("pending:") ? PLACEHOLDER : val]),
    );
    const parsed = componentSchema.safeParse(probe);
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      Object.entries(fe).forEach(([field, msgs]) => {
        if (["category_id", "provider_id"].includes(field) && errors.some((e) => e.includes("required"))) return;
        msgs?.forEach((m) => errors.push(m));
      });
    }

    const result: ImportRowResult = { row: i + 2, name: v.name ?? "", errors: Array.from(new Set(errors)), willCreate };
    results.push(result);
    if (result.errors.length === 0) candidates.push({ index: i, input });
  });

  let inserted = 0;
  if (opts.commit && candidates.length > 0) {
    // Create missing reference records first.
    for (const t of tables) {
      const names = Array.from(pendingCreate[t].values());
      if (!names.length) continue;
      const { data, error } = await supabase
        .from(t)
        .insert(names.map((name) => ({ name })))
        .select("id, name");
      if (error) throw error;
      ((data as { id: string; name: string }[] | null) ?? []).forEach((r) => refs[t].set(r.name.trim().toLowerCase(), r.id));
    }

    const rows: ComponentInput[] = candidates.map(({ input }) => {
      const resolved = Object.fromEntries(
        Object.entries(input).map(([k, val]) => {
          if (typeof val === "string" && val.startsWith("pending:")) {
            const [, table, ...rest] = val.split(":");
            return [k, refs[table as RefTable].get(rest.join(":")) ?? null];
          }
          return [k, val];
        }),
      );
      return componentSchema.parse(resolved);
    });

    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200);
      const { error } = await supabase.from("components").insert(chunk);
      if (error) throw error;
      inserted += chunk.length;
    }
  }

  return { fatal: null as string | null, results, valid: candidates.length, inserted };
}

export function templateRows() {
  return [
    Object.fromEntries(IMPORT_FIELDS.map((f) => [f.key, f.key === "received_date" ? todayISO() : f.example])),
  ];
}
