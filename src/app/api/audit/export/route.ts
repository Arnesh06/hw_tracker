import { NextResponse, type NextRequest } from "next/server";
import { authorize } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { actionLabel, applyAuditFilters, entityLabel, parseAuditParams } from "@/lib/audit-query";
import { toCsv, type Row } from "@/lib/spreadsheet";
import { apiError, attachmentName, NO_STORE } from "../../_shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_ROWS = 20_000;
const BATCH = 1000;

export async function GET(request: NextRequest) {
  try {
    await authorize("audit.view");
    const filters = parseAuditParams(Object.fromEntries(request.nextUrl.searchParams.entries()));
    const supabase = await createClient();
    const rows: Row[] = [];
    for (let from = 0; from < MAX_ROWS; from += BATCH) {
      const { data, error } = await applyAuditFilters(
        supabase.from("audit_logs").select("id, occurred_at, actor_email, action, entity, entity_id, entity_label, changed_fields, old_data, new_data, metadata"),
        filters,
      ).range(from, from + BATCH - 1);
      if (error) throw error;
      const batch = (data as Record<string, unknown>[] | null) ?? [];
      for (const r of batch) {
        const changed = (r.changed_fields as string[] | null) ?? [];
        const oldData = r.old_data as Record<string, unknown> | null;
        const newData = r.new_data as Record<string, unknown> | null;
        rows.push({
          id: r.id as number,
          occurred_at: r.occurred_at as string,
          actor_email: (r.actor_email as string | null) ?? "system",
          action: actionLabel(r.action as string),
          entity: entityLabel(r.entity as string),
          entity_id: r.entity_id as string | null,
          entity_label: r.entity_label as string | null,
          changes: changed
            .map((f) => `${f}: ${JSON.stringify(oldData?.[f] ?? null)} -> ${JSON.stringify(newData?.[f] ?? null)}`)
            .join("; "),
          metadata: r.metadata ? JSON.stringify(r.metadata) : "",
        });
      }
      if (batch.length < BATCH) break;
    }
    const headers = [
      { key: "id", header: "Entry" },
      { key: "occurred_at", header: "When (UTC)" },
      { key: "actor_email", header: "User" },
      { key: "action", header: "Action" },
      { key: "entity", header: "Area" },
      { key: "entity_label", header: "Record" },
      { key: "entity_id", header: "Record ID" },
      { key: "changes", header: "Changes" },
      { key: "metadata", header: "Details" },
    ];
    return new NextResponse(toCsv(headers, rows), {
      headers: {
        ...NO_STORE,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${attachmentName("hw-track-audit-log", "csv")}"`,
      },
    });
  } catch (e) {
    return apiError(e);
  }
}
