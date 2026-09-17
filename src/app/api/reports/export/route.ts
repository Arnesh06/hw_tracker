import { NextResponse, type NextRequest } from "next/server";
import { authorize } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toCsv, toXlsx, type Row } from "@/lib/spreadsheet";
import { parseReportGroup, reportGroupLabel } from "@/lib/reports";
import { statusLabel } from "@/lib/constants";
import { apiError, attachmentName, NO_STORE } from "../../_shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await authorize("reports.view");
    const sp = request.nextUrl.searchParams;
    const group = parseReportGroup(sp.get("group"));
    const includeArchived = sp.get("archived") === "1";
    const format = sp.get("format") === "xlsx" ? "xlsx" : "csv";
    const label = reportGroupLabel(group);

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("report_grouped", { p_group: group, p_include_archived: includeArchived });
    if (error) throw error;

    const rows: Row[] = ((data as Row[] | null) ?? []).map((r) => ({
      ...r,
      group_label: group === "status" ? statusLabel(r.group_label as string) : r.group_label,
      total_value: Number(r.total_value ?? 0),
    }));
    const headers = [
      { key: "group_label", header: label },
      { key: "records", header: "Records" },
      { key: "units", header: "Units" },
      { key: "available", header: "Available" },
      { key: "in_use", header: "In use" },
      { key: "damaged", header: "Damaged" },
      { key: "repair", header: "In repair" },
      { key: "retired", header: "Retired" },
      { key: "total_value", header: "Total value" },
    ];

    await supabase.rpc("log_app_event", {
      p_action: "report.export",
      p_entity: "reports",
      p_label: `Inventory by ${label.toLowerCase()} (${format.toUpperCase()})`,
      p_metadata: { group, includeArchived, format },
    });

    const base = `hw-track-report-by-${group}`;
    if (format === "xlsx") {
      const body = await toXlsx(`By ${label}`, headers, rows);
      return new NextResponse(body as unknown as BodyInit, {
        headers: {
          ...NO_STORE,
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${attachmentName(base, "xlsx")}"`,
        },
      });
    }
    return new NextResponse(toCsv(headers, rows), {
      headers: {
        ...NO_STORE,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${attachmentName(base, "csv")}"`,
      },
    });
  } catch (e) {
    return apiError(e);
  }
}
