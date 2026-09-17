import { NextResponse, type NextRequest } from "next/server";
import { authorize } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/data";
import { applyInventoryFilters, EXPORT_COLUMNS, parseInventoryParams } from "@/lib/inventory-query";
import { toCsv, toXlsx, type Row } from "@/lib/spreadsheet";
import { statusLabel } from "@/lib/constants";
import { apiError, attachmentName, NO_STORE } from "../_shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_ROWS = 50_000;
const BATCH = 1000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  try {
    await authorize("inventory.export");
    const sp = Object.fromEntries(request.nextUrl.searchParams.entries());
    const format = sp.format === "xlsx" ? "xlsx" : "csv";
    const filters = parseInventoryParams(sp);
    const ids = (sp.ids ?? "").split(",").filter((id) => UUID_RE.test(id)).slice(0, 1000);

    const supabase = await createClient();
    const settings = await getSettings();
    const select = EXPORT_COLUMNS.map((c) => c.key).join(", ");

    const rows: Row[] = [];
    for (let from = 0; from < MAX_ROWS; from += BATCH) {
      let q = applyInventoryFilters(supabase.from("v_components").select(select), filters, settings.warranty_alert_days);
      if (ids.length) q = q.in("id", ids);
      const { data, error } = await q.range(from, from + BATCH - 1);
      if (error) throw error;
      const batch = (data as Row[] | null) ?? [];
      rows.push(
        ...batch.map((r) => ({
          ...r,
          status: statusLabel(r.status as string),
          unit_cost: toNum(r.unit_cost),
          total_value: toNum(r.total_value),
        })),
      );
      if (batch.length < BATCH) break;
    }

    const { page: _page, ...filterMeta } = filters;
    void _page;
    await supabase.rpc("log_app_event", {
      p_action: "data.export",
      p_entity: "components",
      p_label: `${rows.length} components (${format.toUpperCase()})`,
      p_metadata: { format, rows: rows.length, selected: ids.length || null, filters: filterMeta },
    });

    if (format === "xlsx") {
      const body = await toXlsx("Inventory", EXPORT_COLUMNS, rows);
      return new NextResponse(body as unknown as BodyInit, {
        headers: {
          ...NO_STORE,
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${attachmentName("hw-track-inventory", "xlsx")}"`,
        },
      });
    }
    return new NextResponse(toCsv(EXPORT_COLUMNS, rows), {
      headers: {
        ...NO_STORE,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${attachmentName("hw-track-inventory", "csv")}"`,
      },
    });
  } catch (e) {
    return apiError(e);
  }
}

function toNum(v: unknown) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
