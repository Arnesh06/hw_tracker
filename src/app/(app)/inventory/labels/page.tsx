import type { Metadata } from "next";
import Link from "next/link";
import { QrCode } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { qrSvg } from "@/lib/qr";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Forbidden } from "@/components/shared/forbidden";
import { EmptyState } from "@/components/shared/empty-state";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/inventory/print-button";

export const metadata: Metadata = { title: "Print labels" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_LABELS = 200;

type Size = "small" | "medium" | "large";
const GRID: Record<Size, string> = {
  small: "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 print:grid-cols-5",
  medium: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-3",
  large: "grid-cols-1 sm:grid-cols-2 print:grid-cols-2",
};

export default async function LabelsPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string; size?: string; name?: string }>;
}) {
  const user = await requireUser();
  if (!can(user, "inventory.view")) return <Forbidden what="the inventory" />;

  const sp = await searchParams;
  const size: Size = sp.size === "small" || sp.size === "large" ? sp.size : "medium";
  const showName = sp.name !== "0";
  const ids = (sp.ids ?? "").split(",").filter((id) => UUID_RE.test(id)).slice(0, MAX_LABELS);

  let labels: { id: string; hw_id: string; name: string; svg: string }[] = [];
  if (ids.length) {
    const supabase = await createClient();
    const { data } = await supabase.from("components").select("id, hw_id, name").in("id", ids).order("hw_id");
    const rows = (data as { id: string; hw_id: string; name: string }[] | null) ?? [];
    labels = await Promise.all(rows.map(async (r) => ({ ...r, svg: await qrSvg(r.hw_id, 0) })));
  }

  const link = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ ids: ids.join(","), size, name: showName ? "1" : "0", ...patch });
    return `/inventory/labels?${p.toString()}`;
  };

  return (
    <>
      <PageHeader
        title="Print QR labels"
        description={
          labels.length
            ? `${labels.length} ${labels.length === 1 ? "label" : "labels"}. Use sticker paper and set margins to “None” for best results.`
            : "Select components in the inventory list, then choose Print labels."
        }
        actions={labels.length ? <PrintButton label="Print labels" /> : undefined}
      />

      {labels.length === 0 ? (
        <Card>
          <EmptyState
            icon={QrCode}
            title="No components selected"
            description={`Tick the rows you want in the inventory table (up to ${MAX_LABELS} at a time).`}
            action={
              <Button asChild>
                <Link href="/inventory">Go to inventory</Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <div className="no-print mb-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Label size</span>
            {(["small", "medium", "large"] as const).map((s) => (
              <Button key={s} size="sm" variant={s === size ? "secondary" : "ghost"} asChild>
                <Link href={link({ size: s })} scroll={false} className="capitalize">
                  {s}
                </Link>
              </Button>
            ))}
            <span className="mx-2 h-4 w-px bg-border" />
            <Button size="sm" variant="ghost" asChild>
              <Link href={link({ name: showName ? "0" : "1" })} scroll={false}>
                {showName ? "Hide names" : "Show names"}
              </Link>
            </Button>
          </div>
          <div className={cn("print-area grid gap-3 rounded-lg border bg-white p-4 print:gap-2 print:p-0", GRID[size])}>
            {labels.map((l) => (
              <div
                key={l.id}
                className="flex break-inside-avoid flex-col items-center rounded-md border border-dashed border-neutral-300 p-2 text-black print:border-neutral-400"
              >
                <div className="w-full [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: l.svg }} />
                <p className={cn("mt-1 font-mono font-semibold", size === "small" ? "text-[10px]" : "text-sm")}>{l.hw_id}</p>
                {showName && (
                  <p className={cn("line-clamp-2 text-center leading-tight text-neutral-600", size === "small" ? "text-[8px]" : "text-xs")}>
                    {l.name}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
