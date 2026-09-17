import { NextResponse, type NextRequest } from "next/server";
import { authorize } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { escapeLike } from "@/lib/utils";
import { apiError, NO_STORE } from "../_shared";

export const dynamic = "force-dynamic";

const COLUMNS = "id, hw_id, name, status, current_owner, category_name";

export async function GET(request: NextRequest) {
  try {
    await authorize("inventory.view");
    const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 120);
    if (q.length < 2) return NextResponse.json({ results: [] }, { headers: NO_STORE });

    const supabase = await createClient();

    // Exact HW-ID first (accepts "HW-000123", "hw 123" or just "123").
    const idMatch = q.match(/^(?:hw[-\s]?)?0*(\d{1,9})$/i);
    const exact = idMatch
      ? await supabase
          .from("v_components")
          .select(COLUMNS)
          .eq("hw_id", `HW-${idMatch[1].padStart(6, "0")}`)
          .limit(1)
      : { data: [] as unknown[] };

    let query = supabase.from("v_components").select(COLUMNS);
    for (const term of q.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6)) {
      query = query.ilike("search_text", `%${escapeLike(term)}%`);
    }
    const { data, error } = await query
      .order("archived_at", { ascending: false, nullsFirst: true })
      .order("updated_at", { ascending: false })
      .limit(8);
    if (error) throw error;

    const seen = new Set<string>();
    const results = [...((exact.data as { id: string }[] | null) ?? []), ...((data as { id: string }[] | null) ?? [])]
      .filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)))
      .slice(0, 8);

    return NextResponse.json({ results }, { headers: NO_STORE });
  } catch (e) {
    return apiError(e);
  }
}
