import { NextResponse, type NextRequest } from "next/server";
import { authorize } from "@/lib/auth";
import { IMPORT_FIELDS, templateRows } from "@/lib/import";
import { toCsv, toXlsx } from "@/lib/spreadsheet";
import { apiError } from "../../_shared";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await authorize("inventory.import");
    const headers = IMPORT_FIELDS.map((f) => ({ key: f.key, header: f.header }));
    const rows = templateRows();
    if (request.nextUrl.searchParams.get("format") === "csv") {
      return new NextResponse(toCsv(headers, rows), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="hw-track-import-template.csv"',
        },
      });
    }
    const body = await toXlsx("Components", headers, rows);
    return new NextResponse(body as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="hw-track-import-template.xlsx"',
      },
    });
  } catch (e) {
    return apiError(e);
  }
}
