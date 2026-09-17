import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { authorize } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { parseSpreadsheet } from "@/lib/spreadsheet";
import { IMPORT_MAX_ROWS, validateImport } from "@/lib/import";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";
import { apiError, NO_STORE } from "../_shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const user = await authorize("inventory.import");
    const form = await request.formData();
    const file = form.get("file");
    const commit = form.get("mode") === "commit";
    const autoCreate = form.get("autoCreate") === "true";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose a .csv or .xlsx file." }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "The file is larger than 10 MB. Split it into smaller files." }, { status: 400 });
    }
    if (autoCreate && !can(user, "masters.manage")) {
      return NextResponse.json(
        { error: "Creating missing categories, providers, vendors, locations or projects needs the reference-data permission." },
        { status: 403 },
      );
    }

    const { rows } = await parseSpreadsheet(file);
    if (rows.length === 0) {
      return NextResponse.json({ error: "The file has no data rows." }, { status: 400 });
    }
    if (rows.length > IMPORT_MAX_ROWS) {
      return NextResponse.json(
        { error: `Import up to ${IMPORT_MAX_ROWS.toLocaleString()} rows at a time. This file has ${rows.length.toLocaleString()}.` },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const result = await validateImport(supabase, rows, { autoCreate, commit });
    if (result.fatal) return NextResponse.json({ error: result.fatal }, { status: 400 });

    if (commit) {
      await supabase.rpc("log_app_event", {
        p_action: "data.import",
        p_entity: "components",
        p_label: `${result.inserted} components from ${file.name}`,
        p_metadata: { file: file.name, rows: rows.length, inserted: result.inserted, skipped: rows.length - result.inserted },
      });
      revalidatePath("/inventory");
      revalidatePath("/dashboard");
    }

    return NextResponse.json(
      {
        total: result.results.length,
        valid: result.valid,
        inserted: result.inserted,
        committed: commit,
        // Only rows that need attention, to keep the payload small.
        issues: result.results.filter((r) => r.errors.length || r.willCreate.length).slice(0, 500),
      },
      { headers: NO_STORE },
    );
  } catch (e) {
    return apiError(e);
  }
}
