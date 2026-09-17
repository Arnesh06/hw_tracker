import "server-only";

export const AUDIT_ENTITIES = [
  { value: "components", label: "Components" },
  { value: "component_files", label: "Files" },
  { value: "categories", label: "Categories" },
  { value: "projects", label: "Projects" },
  { value: "providers", label: "Providers" },
  { value: "vendors", label: "Vendors" },
  { value: "locations", label: "Locations" },
  { value: "profiles", label: "Users and sign-ins" },
  { value: "role_permissions", label: "Role permissions" },
  { value: "user_permissions", label: "User permissions" },
  { value: "app_settings", label: "Organization settings" },
  { value: "reports", label: "Report exports" },
] as const;

export const AUDIT_ACTIONS = [
  { value: "INSERT", label: "Created" },
  { value: "UPDATE", label: "Updated" },
  { value: "DELETE", label: "Deleted" },
  { value: "auth.sign_in", label: "Signed in" },
  { value: "auth.sign_out", label: "Signed out" },
  { value: "data.export", label: "Exported data" },
  { value: "data.import", label: "Imported data" },
  { value: "report.export", label: "Exported report" },
  { value: "admin.user_created", label: "User created" },
  { value: "admin.user_enabled", label: "User enabled" },
  { value: "admin.user_disabled", label: "User disabled" },
  { value: "admin.password_reset", label: "Password reset" },
] as const;

export function actionLabel(a: string) {
  return AUDIT_ACTIONS.find((x) => x.value === a)?.label ?? a;
}
export function entityLabel(e: string) {
  return AUDIT_ENTITIES.find((x) => x.value === e)?.label ?? e;
}

export type AuditFilters = { q?: string; entity?: string; action?: string; from?: string; to?: string; page: number };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
type Raw = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseAuditParams(sp: Raw): AuditFilters {
  const entity = first(sp.entity);
  const action = first(sp.action);
  const from = first(sp.from);
  const to = first(sp.to);
  const page = Number(first(sp.page) ?? "1");
  return {
    // PostgREST "or" filters use , ( ) as syntax, so strip them from free text.
    q: first(sp.q)?.replace(/[,()\\%_*]/g, " ").trim().slice(0, 100) || undefined,
    entity: AUDIT_ENTITIES.some((e) => e.value === entity) ? entity : undefined,
    action: AUDIT_ACTIONS.some((a) => a.value === action) ? action : undefined,
    from: from && DATE_RE.test(from) ? from : undefined,
    to: to && DATE_RE.test(to) ? to : undefined,
    page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyAuditFilters(query: any, f: AuditFilters) {
  let q = query;
  if (f.q) {
    const t = `%${f.q}%`;
    q = q.or(`entity_label.ilike.${t},actor_email.ilike.${t},entity_id.ilike.${t}`);
  }
  if (f.entity) q = q.eq("entity", f.entity);
  if (f.action) q = q.eq("action", f.action);
  if (f.from) q = q.gte("occurred_at", `${f.from}T00:00:00`);
  if (f.to) {
    const next = new Date(`${f.to}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    q = q.lt("occurred_at", next.toISOString());
  }
  return q.order("occurred_at", { ascending: false }).order("id", { ascending: false });
}
