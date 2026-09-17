import { NextResponse } from "next/server";
import { authorize } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/data";
import { formatDate, todayISO } from "@/lib/utils";
import { apiError, NO_STORE } from "../_shared";

export const dynamic = "force-dynamic";

type Alert = { id: string; kind: "warranty" | "repair" | "damaged" | "expired"; title: string; detail: string; href: string };
type Row = { id: string; hw_id: string; name: string; warranty_expiry: string };

export async function GET() {
  try {
    await authorize("inventory.view");
    const supabase = await createClient();
    const settings = await getSettings();
    const today = todayISO();
    const until = new Date(Date.now() + settings.warranty_alert_days * 86400000).toISOString().slice(0, 10);
    const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

    const base = () =>
      supabase.from("components").select("id, hw_id, name, warranty_expiry", { count: "exact" }).is("archived_at", null);
    const countStatus = (status: string) =>
      supabase.from("components").select("id", { count: "exact", head: true }).is("archived_at", null).eq("status", status);

    const [expiring, expired, repair, damaged] = await Promise.all([
      base().gte("warranty_expiry", today).lte("warranty_expiry", until).order("warranty_expiry").limit(5),
      base().gte("warranty_expiry", since).lt("warranty_expiry", today).order("warranty_expiry", { ascending: false }).limit(3),
      countStatus("repair"),
      countStatus("damaged"),
    ]);

    const alerts: Alert[] = [];
    for (const c of (expiring.data as Row[] | null) ?? []) {
      alerts.push({
        id: `w-${c.id}`,
        kind: "warranty",
        title: `Warranty ends ${formatDate(c.warranty_expiry)}`,
        detail: `${c.hw_id}, ${c.name}`,
        href: `/inventory/${c.id}`,
      });
    }
    const moreExpiring = (expiring.count ?? 0) - 5;
    if (moreExpiring > 0) {
      alerts.push({
        id: "w-more",
        kind: "warranty",
        title: `${moreExpiring} more warranties ending soon`,
        detail: `Within ${settings.warranty_alert_days} days`,
        href: "/inventory?warranty=expiring",
      });
    }
    for (const c of (expired.data as Row[] | null) ?? []) {
      alerts.push({
        id: `x-${c.id}`,
        kind: "expired",
        title: `Warranty ended ${formatDate(c.warranty_expiry)}`,
        detail: `${c.hw_id}, ${c.name}`,
        href: `/inventory/${c.id}`,
      });
    }
    if (repair.count) {
      alerts.push({
        id: "repair",
        kind: "repair",
        title: `${repair.count} ${repair.count === 1 ? "component is" : "components are"} in repair`,
        detail: "Follow up on expected return dates",
        href: "/inventory?status=repair",
      });
    }
    if (damaged.count) {
      alerts.push({
        id: "damaged",
        kind: "damaged",
        title: `${damaged.count} damaged ${damaged.count === 1 ? "component" : "components"}`,
        detail: "Send for repair or retire",
        href: "/inventory?status=damaged",
      });
    }
    return NextResponse.json({ alerts }, { headers: NO_STORE });
  } catch (e) {
    return apiError(e);
  }
}
