import { NextResponse, type NextRequest } from "next/server";
import { authorize } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { apiError } from "../../_shared";

export const dynamic = "force-dynamic";

/** Redirects to a short-lived signed URL. Storage RLS re-checks access. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await authorize("inventory.view");
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const supabase = await createClient();
    const { data: file } = await supabase
      .from("component_files")
      .select("storage_path, file_name")
      .eq("id", id)
      .maybeSingle();
    if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const download = request.nextUrl.searchParams.has("download");
    const { data, error } = await supabase.storage
      .from(env.bucket())
      .createSignedUrl(file.storage_path as string, 60, download ? { download: file.file_name as string } : undefined);
    if (error || !data) throw error ?? new Error("Could not create a download link.");

    const res = NextResponse.redirect(data.signedUrl);
    res.headers.set("Cache-Control", "private, no-store");
    return res;
  } catch (e) {
    return apiError(e);
  }
}
