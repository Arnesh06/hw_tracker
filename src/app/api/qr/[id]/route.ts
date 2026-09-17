import { NextResponse, type NextRequest } from "next/server";
import QRCode from "qrcode";
import { authorize } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { qrTarget } from "@/lib/qr";
import { apiError } from "../../_shared";

export const runtime = "nodejs";

/** QR code image for a component: ?format=png|svg (default png), &download to save. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await authorize("inventory.view");
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const supabase = await createClient();
    const { data } = await supabase.from("components").select("hw_id").eq("id", id).maybeSingle();
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const hwId = data.hw_id as string;
    const url = qrTarget(hwId);
    const sp = request.nextUrl.searchParams;
    const disposition = sp.has("download") ? "attachment" : "inline";
    const common = { "Cache-Control": "private, max-age=86400" };

    if (sp.get("format") === "svg") {
      const svg = await QRCode.toString(url, { type: "svg", margin: 2, errorCorrectionLevel: "M" });
      return new NextResponse(svg, {
        headers: { ...common, "Content-Type": "image/svg+xml", "Content-Disposition": `${disposition}; filename="${hwId}.svg"` },
      });
    }
    const png = await QRCode.toBuffer(url, { type: "png", width: 600, margin: 2, errorCorrectionLevel: "M" });
    return new NextResponse(new Uint8Array(png) as unknown as BodyInit, {
      headers: { ...common, "Content-Type": "image/png", "Content-Disposition": `${disposition}; filename="${hwId}.png"` },
    });
  } catch (e) {
    return apiError(e);
  }
}
