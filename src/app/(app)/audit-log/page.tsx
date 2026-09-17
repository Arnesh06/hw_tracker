import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Download, ScrollText, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getMasterOptions } from "@/lib/data";
import { AUDIT_ACTIONS, AUDIT_ENTITIES, actionLabel, applyAuditFilters, entityLabel, parseAuditParams } from "@/lib/audit-query";
import { cn, formatDateTime } from "@/lib/utils";
import type { AuditLog } from "@/types/database";
import { PageHeader } from "@/components/shared/page-header";
import { Forbidden } from "@/components/shared/forbidden";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AuditFilters } from "@/components/audit/audit-filters";
import { ChangeList, createdFields } from "@/components/audit/change-list";

export const metadata: Metadata = { title: "Audit log" };

const PAGE = 50;
const TONE: Record<string, string> = {
  INSERT: "bg-status-available/10 text-status-available",
  UPDATE: "bg-status-inuse/10 text-status-inuse",
  DELETE: "bg-status-damaged/10 text-status-damaged",
};

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (!can(user, "audit.view")) return <Forbidden what="the audit log" />;

  const raw = await searchParams;
  const filters = parseAuditParams(raw);
  const supabase = await createClient();
  const from = (filters.page - 1) * PAGE;
  const [{ data, count, error }, options] = await Promise.all([
    applyAuditFilters(supabase.from("audit_logs").select("*", { count: "exact" }), filters).range(from, from + PAGE - 1),
    getMasterOptions(),
  ]);
  if (error) throw new Error(error.message);
  const logs = (data as AuditLog[] | null) ?? [];

  const names: Record<string, string> = {};
  for (const list of Object.values(options)) for (const o of list) names[o.id] = o.name;

  const exportQs = new URLSearchParams(
    Object.entries({ q: filters.q, entity: filters.entity, action: filters.action, from: filters.from, to: filters.to }).filter(
      (e): e is [string, string] => Boolean(e[1]),
    ),
  ).toString();

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Every create, update and delete, plus sign-ins, imports and exports. Entries are written by the database and can't be edited or removed."
        actions={
          <Button variant="outline" asChild>
            <a href={`/api/audit/export${exportQs ? `?${exportQs}` : ""}`} download>
              <Download /> Export CSV
            </a>
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <AuditFilters entities={AUDIT_ENTITIES} actions={AUDIT_ACTIONS} />
        {logs.length === 0 ? (
          <EmptyState icon={ScrollText} title="No entries" description="Nothing matches these filters." />
        ) : (
          <>
            <ul className="divide-y">
              {logs.map((a) => {
                const fields =
                  a.action === "INSERT" ? createdFields(a.new_data) : a.action === "DELETE" ? createdFields(a.old_data) : (a.changed_fields ?? []);
                const expandable = ["INSERT", "UPDATE", "DELETE"].includes(a.action) || a.metadata;
                const componentId =
                  a.entity === "components"
                    ? a.entity_id
                    : a.entity === "component_files"
                      ? ((a.new_data?.component_id ?? a.old_data?.component_id) as string | undefined)
                      : undefined;
                const summary = (
                  <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", TONE[a.action] ?? "bg-muted text-muted-foreground")}>
                      {actionLabel(a.action)}
                    </span>
                    <span className="text-muted-foreground">{entityLabel(a.entity)}</span>
                    {a.entity_label && <span className={cn("min-w-0 truncate font-medium", a.entity === "components" && "hw-id")}>{a.entity_label}</span>}
                    {a.action === "UPDATE" && fields.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {fields.length} {fields.length === 1 ? "field" : "fields"}
                      </span>
                    )}
                    <span className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="truncate">{a.actor_email ?? "system"}</span>
                      <time dateTime={a.occurred_at} className="tabular whitespace-nowrap">{formatDateTime(a.occurred_at)}</time>
                    </span>
                  </div>
                );
                return (
                  <li key={a.id}>
                    {expandable ? (
                      <details className="group">
                        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 hover:bg-muted/40 [&::-webkit-details-marker]:hidden">
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
                          {summary}
                        </summary>
                        <div className="space-y-3 px-4 pb-4 pl-10">
                          {fields.length > 0 && (
                            <ChangeList
                              fields={fields}
                              oldData={a.action === "INSERT" ? null : a.old_data}
                              newData={a.action === "DELETE" ? null : a.new_data}
                              names={names}
                            />
                          )}
                          {a.metadata && (
                            <pre className="overflow-x-auto rounded-md bg-muted/60 p-3 text-xs">{JSON.stringify(a.metadata, null, 2)}</pre>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Entry #{a.id}
                            {a.entity_id ? `, record ${a.entity_id}` : ""}
                            {componentId && (
                              <>
                                {" "}
                                <Link href={`/inventory/${componentId}`} className="text-primary hover:underline">
                                  Open component
                                </Link>
                              </>
                            )}
                          </p>
                        </div>
                      </details>
                    ) : (
                      <div className="flex items-center gap-2 px-4 py-3">
                        <ShieldCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
                        {summary}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <Pagination page={filters.page} pageSize={PAGE} total={count ?? 0} />
          </>
        )}
      </Card>
    </>
  );
}
