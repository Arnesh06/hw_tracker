import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Boxes, CalendarClock, CheckCircle2, CircleSlash, PackageOpen, Plus, Upload, Wrench, AlertTriangle, Wallet, Cable } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/data";
import { STATUSES, movementLabel } from "@/lib/constants";
import { cn, formatCurrency, formatNumber, timeAgo } from "@/lib/utils";
import type { DashboardStats } from "@/types/database";
import { PageHeader } from "@/components/shared/page-header";
import { Forbidden } from "@/components/shared/forbidden";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HorizontalBars, MonthlyArea, StatusDonut } from "@/components/charts/chart-kit";

export const metadata: Metadata = { title: "Dashboard" };

const TILE_ICONS = {
  available: CheckCircle2,
  in_use: Cable,
  damaged: AlertTriangle,
  repair: Wrench,
  retired: CircleSlash,
} as const;

const TILE_TONE = {
  available: "text-status-available",
  in_use: "text-status-inuse",
  damaged: "text-status-damaged",
  repair: "text-status-repair",
  retired: "text-status-retired",
} as const;

export default async function DashboardPage() {
  const user = await requireUser();
  if (!can(user, "inventory.view")) return <Forbidden what="the dashboard" />;

  const supabase = await createClient();
  const [{ data, error }, settings] = await Promise.all([supabase.rpc("dashboard_stats"), getSettings()]);
  if (error) throw new Error(error.message);
  const stats = data as DashboardStats;
  const cur = settings.currency;

  const statusData = STATUSES.map((s) => ({
    status: s.value,
    label: s.label,
    units: Number(stats.by_status[s.value]?.units ?? 0),
    records: Number(stats.by_status[s.value]?.records ?? 0),
  }));

  const firstName = (user.fullName ?? "").split(" ")[0];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`${firstName ? `Welcome back, ${firstName}. ` : ""}Inventory at a glance for ${settings.org_name}.`}
        actions={
          <>
            {can(user, "inventory.import") && (
              <Button variant="outline" asChild>
                <Link href="/inventory/import">
                  <Upload /> Import
                </Link>
              </Button>
            )}
            {can(user, "inventory.create") && (
              <Button asChild>
                <Link href="/inventory/new">
                  <Plus /> Add component
                </Link>
              </Button>
            )}
          </>
        }
      />

      {stats.total_records === 0 ? (
        <Card>
          <EmptyState
            icon={PackageOpen}
            title="No components yet"
            description="Register your first board, sensor or instrument, or import an existing spreadsheet."
            action={
              can(user, "inventory.create") ? (
                <Button asChild>
                  <Link href="/inventory/new">
                    <Plus /> Add component
                  </Link>
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Headline numbers */}
          <div className="grid gap-4 md:grid-cols-3">
            <HeadlineCard
              icon={Boxes}
              label="Total components"
              value={formatNumber(stats.total_units)}
              sub={`${formatNumber(stats.total_records)} records${stats.archived ? `, ${formatNumber(stats.archived)} archived` : ""}`}
              href="/inventory"
            />
            <HeadlineCard
              icon={Wallet}
              label="Inventory value"
              value={formatCurrency(stats.total_value, cur)}
              sub="Unit cost × quantity, active records"
              href="/reports"
            />
            <HeadlineCard
              icon={CalendarClock}
              label="Warranties ending soon"
              value={formatNumber(stats.warranty_expiring)}
              sub={`Within ${settings.warranty_alert_days} days`}
              href="/inventory?warranty=expiring"
              tone={stats.warranty_expiring > 0 ? "text-status-repair" : undefined}
            />
          </div>

          {/* Status tiles */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {statusData.map((s) => {
              const Icon = TILE_ICONS[s.status];
              return (
                <Link
                  key={s.status}
                  href={`/inventory?status=${s.status}`}
                  className="group rounded-lg border bg-card p-4 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{s.label}</span>
                    <Icon className={cn("h-4 w-4", TILE_TONE[s.status])} />
                  </div>
                  <p className="tabular mt-2 text-2xl font-semibold">{formatNumber(s.units)}</p>
                  <p className="tabular text-xs text-muted-foreground">
                    {formatNumber(s.records)} {s.records === 1 ? "record" : "records"}
                  </p>
                </Link>
              );
            })}
          </div>

          {/* Charts */}
          <div className="grid gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Status breakdown</CardTitle>
                <CardDescription>Units across all active records</CardDescription>
              </CardHeader>
              <CardContent>
                <StatusDonut data={statusData} />
                <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  {statusData.map((s) => (
                    <li key={s.status} className="flex items-center justify-between gap-2">
                      <StatusBadge status={s.status} className="border-0 bg-transparent px-0" />
                      <span className="tabular text-muted-foreground">
                        {stats.total_units ? Math.round((s.units / stats.total_units) * 100) : 0}%
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Units received</CardTitle>
                <CardDescription>By received date, last 12 months</CardDescription>
              </CardHeader>
              <CardContent>
                <MonthlyArea data={stats.monthly} />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top categories</CardTitle>
                <CardDescription>Units per category</CardDescription>
              </CardHeader>
              <CardContent>
                <HorizontalBars data={stats.by_category} valueKey="units" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Value by project</CardTitle>
                <CardDescription>Where the money sits</CardDescription>
              </CardHeader>
              <CardContent>
                <HorizontalBars data={stats.by_project} valueKey="value" currency={cur} />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Recent movements</CardTitle>
                  <CardDescription>Assignments, transfers and status changes</CardDescription>
                </div>
                {can(user, "audit.view") && (
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/audit-log">
                      Audit log <ArrowRight />
                    </Link>
                  </Button>
                )}
              </CardHeader>
              <CardContent className="px-0 pb-2">
                {stats.recent_movements.length === 0 ? (
                  <p className="px-5 pb-4 text-sm text-muted-foreground">No movements recorded yet.</p>
                ) : (
                  <ul className="divide-y">
                    {stats.recent_movements.map((m) => (
                      <li key={m.id}>
                        <Link href={`/inventory/${m.component_id}`} className="flex items-start gap-3 px-5 py-3 hover:bg-muted/50">
                          <span className="hw-id mt-0.5 w-[5.5rem] shrink-0 text-muted-foreground">{m.hw_id}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{m.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {movementLabel(m.movement_type)}
                              {m.to_holder && m.movement_type === "assigned" ? ` to ${m.to_holder}` : ""}
                              {m.to_owner && m.movement_type === "transferred" ? ` to ${m.to_owner}` : ""}
                              {m.to_location_name && m.movement_type === "relocated" ? ` to ${m.to_location_name}` : ""}
                              {m.performed_by_email ? ` by ${m.performed_by_email}` : ""}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(m.created_at)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>By location</CardTitle>
                <CardDescription>Units per storage location</CardDescription>
              </CardHeader>
              <CardContent>
                <HorizontalBars data={stats.by_location} valueKey="units" height={260} />
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}

function HeadlineCard({
  icon: Icon,
  label,
  value,
  sub,
  href,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  href: string;
  tone?: string;
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-lg border bg-card p-5 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className={cn("h-4 w-4", tone ?? "text-primary")} />
        {label}
      </div>
      <p className={cn("tabular mt-3 text-3xl font-semibold tracking-tight", tone)}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
      <ArrowRight className="absolute right-4 top-5 h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}
