import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * QR landing route. Labels encode {APP_URL}/c/HW-000001 so the printed code
 * never changes. Middleware sends signed-out visitors to /login first.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ hwId: string }> }) {
  const { hwId } = await params;
  const origin = request.nextUrl.origin;
  const user = await getSessionUser();
  if (!user) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(`/c/${hwId}`)}`, origin));
  if (!user.isActive) return NextResponse.redirect(new URL("/disabled", origin));

  const normalized = decodeURIComponent(hwId).trim().toUpperCase();
  if (!/^HW-\d{6,}$/.test(normalized) || !can(user, "inventory.view")) {
    return NextResponse.redirect(new URL("/inventory", origin));
  }

  const supabase = await createClient();
  const { data } = await supabase.from("components").select("id").eq("hw_id", normalized).maybeSingle();
  if (!data) {
    return NextResponse.redirect(new URL(`/inventory?q=${encodeURIComponent(normalized)}&archived=all`, origin));
  }
  return NextResponse.redirect(new URL(`/inventory/${data.id}`, origin));
}
