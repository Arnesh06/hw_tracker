import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Download, FileSpreadsheet } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/data";
import { REPORT_GROUPS, parseReportGroup, reportGroupLabel } from "@/lib/reports";
import { statusLabel } from "@/lib/constants";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import type { GroupedReportRow } from "@/types/database";
import { PageHeader } from "@/components/shared/page-header";
import { Forbidden } from "@/components/shared/forbidden";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HorizontalBars, StackedStatusBars } from "@/components/charts/chart-kit";

export const metadata: Metadata = { title: "Reports" };

const GROUP_FILTER: Partial<Record<string, string>> = {
  category: "category",
  project: "project",
  location: "location",
  provider: "provider",
  vendor: "vendor",
};

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ group?: string; archived?: string }> }) {
  const user = await requireUser();
  if (!can(user, "reports.view")) return <Forbidden what="reports" />;

  const sp = await searchParams;
  const group = parseReportGroup(sp.group);
  const includeArchived = sp.archived === "1";
  const label = reportGroupLabel(group);

  const supabase = await createClient();
  const [{ data, error }, settings] = await Promise.all([
    supabase.rpc("report_grouped", { p_group: group, p_include_archived: includeArchived }),
    getSettings(),
  ]);
  if (error) throw new Error(error.message);
  const cur = settings.currency;

  const rows = ((data as GroupedReportRow[] | null) ?? []).map((r) => ({
    ...r,
    group_label: group === "status" ? statusLabel(r.group_label) : r.group_label,
    records: Number(r.records),
    units: Number(r.units),
    available: Number(r.available),
    in_use: Number(r.in_use),
    damaged: Number(r.damaged),
    repair: Number(r.repair),
    retired: Number(r.retired),
    total_value: Number(r.total_value),
  }));
  const totals = rows.reduce(
    (t, r) => ({
      records: t.records + r.records,
      units: t.units + r.units,
      available: t.available + r.available,
      in_use: t.in_use + r.in_use,
      damaged: t.damaged + r.damaged,
      repair: t.repair + r.repair,
      retired: t.retired + r.retired,
      total_value: t.total_value + r.total_value,
    }),
    { records: 0, units: 0, available: 0, in_use: 0, damaged: 0, repair: 0, retired: 0, total_value: 0 },
  );

  const byUnits = [...rows].sort((a, b) => b.units - a.units).slice(0, 12);
  const byValue = [...rows].filter((r) => r.total_value > 0).sort((a, b) => b.total_value - a.total_value).slice(0, 10);
  const href = (patch: { group?: string; archived?: string }) => {
    const p = new URLSearchParams({ group, ...(includeArchived ? { archived: "1" } : {}), ...patch });
    if (p.get("archived") === "0") p.delete("archived");
    return `/reports?${p.toString()}`;
  };
  const exportHref = (format: "csv" | "xlsx") =>
    `/api/reports/export?group=${group}&format=${format}${includeArchived ? "&archived=1" : ""}`;
  const filterParam = GROUP_FILTER[group];

  return (
    <>
      <PageHeader
        title="Reports"
        description="Summaries of quantity, condition and value, grouped the way you need."
        actions={
          <>
            <Button variant="outline" asChild>
              <a href={exportHref("csv")} download>
                <Download /> CSV
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href={exportHref("xlsx")} download>
                <FileSpreadsheet /> Excel
              </a>
            </Button>
          </>
        }
      />

      <div className="no-print mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="Group by" className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
          {REPORT_GROUPS.map((g) => (
            <Link
              key={g.value}
              href={href({ group: g.value })}
              scroll={false}
              aria-current={g.value === group ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors",
                g.value === group ? "bg-card text-foreground shadow-sm" : "hover:text-foreground",
              )}
            >
              {g.label}
            </Link>
          ))}
        </nav>
        <Link href={href({ archived: includeArchived ? "0" : "1" })} scroll={false} className="text-sm text-primary hover:underline">
          {includeArchived ? "Exclude archived records" : "Include archived records"}
        </Link>
      </div>

      {rows.length === 0 ? (
        <Card>
          <EmptyState icon={BarChart3} title="Nothing to report yet" description="Reports fill in once components are registered." />
        </Card>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-4">
            <Summary label={`${label} groups`} value={formatNumber(rows.length)} />
            <Summary label="Records" value={formatNumber(totals.records)} />
            <Summary label="Units" value={formatNumber(totals.units)} />
            <Summary label="Total value" value={formatCurrency(totals.total_value, cur)} />
          </div>

          <div className="grid gap-4 xl:grid-cols-5">
            <Card className="xl:col-span-3">
              <CardHeader>
                <CardTitle>Condition by {label.toLowerCase()}</CardTitle>
                <CardDescription>Units per status{rows.length > 12 ? ", top 12 groups" : ""}</CardDescription>
              </CardHeader>
              <CardContent>
                <StackedStatusBars
                  data={byUnits.map((r) => ({
                    name: r.group_label,
                    available: r.available,
                    in_use: r.in_use,
                    damaged: r.damaged,
                    repair: r.repair,
                    retired: r.retired,
                  }))}
                />
              </CardContent>
            </Card>
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Value by {label.toLowerCase()}</CardTitle>
                <CardDescription>Unit cost × quantity</CardDescription>
              </CardHeader>
              <CardContent>
                <HorizontalBars
                  data={byValue.map((r) => ({ name: r.group_label, value: r.total_value }))}
                  valueKey="value"
                  currency={cur}
                  height={320}
                />
              </CardContent>
            </Card>
          </div>

          <Card className="print-area overflow-hidden">
            <CardHeader>
              <CardTitle>Inventory by {label.toLowerCase()}</CardTitle>
              <CardDescription>
                {includeArchived ? "Active and archived records." : "Active records only."} Generated for {settings.org_name}.
              </CardDescription>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>{label}</TableHead>
                    <TableHead className="text-right">Records</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead className="hidden text-right md:table-cell">Available</TableHead>
                    <TableHead className="hidden text-right md:table-cell">In use</TableHead>
                    <TableHead className="hidden text-right lg:table-cell">Damaged</TableHead>
                    <TableHead className="hidden text-right lg:table-cell">In repair</TableHead>
                    <TableHead className="hidden text-right lg:table-cell">Retired</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.group_label}>
                      <TableCell className="max-w-[16rem] truncate font-medium">{r.group_label}</TableCell>
                      <Num v={r.records} />
                      <Num v={r.units} strong />
                      <Num v={r.available} className="hidden md:table-cell" />
                      <Num v={r.in_use} className="hidden md:table-cell" />
                      <Num v={r.damaged} className="hidden lg:table-cell" tone={r.damaged ? "text-status-damaged" : undefined} />
                      <Num v={r.repair} className="hidden lg:table-cell" tone={r.repair ? "text-status-repair" : undefined} />
                      <Num v={r.retired} className="hidden lg:table-cell" />
                      <TableCell className="tabular whitespace-nowrap text-right">{formatCurrency(r.total_value, cur)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-semibold hover:bg-muted/50">
                    <TableCell>Total</TableCell>
                    <Num v={totals.records} />
                    <Num v={totals.units} />
                    <Num v={totals.available} className="hidden md:table-cell" />
                    <Num v={totals.in_use} className="hidden md:table-cell" />
                    <Num v={totals.damaged} className="hidden lg:table-cell" />
                    <Num v={totals.repair} className="hidden lg:table-cell" />
                    <Num v={totals.retired} className="hidden lg:table-cell" />
                    <TableCell className="tabular whitespace-nowrap text-right">{formatCurrency(totals.total_value, cur)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            {filterParam && (
              <p className="no-print border-t px-5 py-3 text-xs text-muted-foreground">
                Tip: filter the <Link href="/inventory" className="text-primary hover:underline">inventory</Link> by {label.toLowerCase()} to see the individual components.
              </p>
            )}
          </Card>
        </div>
      )}
    </>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="tabular mt-1 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function Num({ v, strong, className, tone }: { v: number; strong?: boolean; className?: string; tone?: string }) {
  return (
    <TableCell className={cn("tabular text-right", strong && "font-medium", !v && "text-muted-foreground", tone, className)}>
      {formatNumber(v)}
    </TableCell>
  );
}
