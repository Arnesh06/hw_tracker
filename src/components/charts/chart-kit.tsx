"use client";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { STATUS_FILL } from "@/components/shared/status-badge";
import { formatCompactCurrency, formatCurrency, formatNumber } from "@/lib/utils";

const AXIS = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };
const GRID = "hsl(var(--border))";
const PRIMARY = "hsl(var(--primary))";

function TooltipBox({ label, rows }: { label?: string; rows: { name: string; value: string; color?: string }[] }) {
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      {label && <p className="mb-1 font-medium text-foreground">{label}</p>}
      {rows.map((r) => (
        <p key={r.name} className="flex items-center gap-2 text-muted-foreground">
          {r.color && <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />}
          <span>{r.name}</span>
          <span className="tabular ml-auto pl-3 font-medium text-foreground">{r.value}</span>
        </p>
      ))}
    </div>
  );
}

export function StatusDonut({ data }: { data: { status: string; label: string; units: number }[] }) {
  const total = data.reduce((s, d) => s + d.units, 0);
  if (total === 0) return <ChartEmpty />;
  return (
    <div className="relative h-56">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="units" nameKey="label" innerRadius="62%" outerRadius="92%" paddingAngle={1.5} stroke="none">
            {data.map((d) => (
              <Cell key={d.status} fill={STATUS_FILL[d.status]} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) =>
              active && payload?.length ? (
                <TooltipBox
                  rows={[{ name: String(payload[0].name), value: `${formatNumber(Number(payload[0].value))} units`, color: STATUS_FILL[(payload[0].payload as { status: string }).status] }]}
                />
              ) : null
            }
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="tabular text-2xl font-semibold">{formatNumber(total)}</p>
          <p className="text-xs text-muted-foreground">units</p>
        </div>
      </div>
    </div>
  );
}

export function MonthlyArea({ data }: { data: { month: string; units: number; records: number }[] }) {
  const rows = data.map((d) => ({
    ...d,
    label: new Date(`${d.month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "short" }),
  }));
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="hw-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.28} />
              <stop offset="100%" stopColor={PRIMARY} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            content={({ active, payload }) =>
              active && payload?.length ? (
                <TooltipBox
                  label={(payload[0].payload as { month: string }).month}
                  rows={[
                    { name: "Units received", value: formatNumber(Number((payload[0].payload as { units: number }).units)) },
                    { name: "Records", value: formatNumber(Number((payload[0].payload as { records: number }).records)) },
                  ]}
                />
              ) : null
            }
          />
          <Area type="monotone" dataKey="units" stroke={PRIMARY} strokeWidth={2} fill="url(#hw-area)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HorizontalBars({
  data,
  valueKey,
  currency,
  height = 240,
}: {
  data: { name: string; [k: string]: string | number }[];
  valueKey: string;
  currency?: string;
  height?: number;
}) {
  if (!data.length || data.every((d) => Number(d[valueKey]) === 0)) return <ChartEmpty />;
  const fmt = (v: number) => (currency ? formatCompactCurrency(v, currency) : formatNumber(v));
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }} barCategoryGap={6}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={fmt} />
          <YAxis
            type="category"
            dataKey="name"
            tick={AXIS}
            tickLine={false}
            axisLine={false}
            width={120}
            tickFormatter={(v: string) => (v.length > 18 ? `${v.slice(0, 17)}…` : v)}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted))" }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <TooltipBox
                  label={String((payload[0].payload as { name: string }).name)}
                  rows={[
                    {
                      name: currency ? "Value" : "Units",
                      value: currency ? formatCurrency(Number(payload[0].value), currency) : formatNumber(Number(payload[0].value)),
                    },
                  ]}
                />
              ) : null
            }
          />
          <Bar dataKey={valueKey} fill={PRIMARY} radius={[0, 4, 4, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StackedStatusBars({
  data,
  height = 320,
}: {
  data: { name: string; available: number; in_use: number; damaged: number; repair: number; retired: number }[];
  height?: number;
}) {
  if (!data.length) return <ChartEmpty />;
  const keys = [
    ["available", "Available"],
    ["in_use", "In use"],
    ["damaged", "Damaged"],
    ["repair", "In repair"],
    ["retired", "Retired"],
  ] as const;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="name"
            tick={AXIS}
            tickLine={false}
            axisLine={false}
            interval={0}
            tickFormatter={(v: string) => (v.length > 12 ? `${v.slice(0, 11)}…` : v)}
          />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted))" }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <TooltipBox
                  label={String(label)}
                  rows={payload
                    .filter((p) => Number(p.value) > 0)
                    .map((p) => ({ name: String(p.name), value: formatNumber(Number(p.value)), color: STATUS_FILL[String(p.dataKey)] }))}
                />
              ) : null
            }
          />
          {keys.map(([k, label], i) => (
            <Bar
              key={k}
              dataKey={k}
              name={label}
              stackId="s"
              fill={STATUS_FILL[k]}
              maxBarSize={40}
              radius={i === keys.length - 1 ? ([4, 4, 0, 0] as [number, number, number, number]) : undefined}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ChartEmpty({ text = "No data yet" }: { text?: string }) {
  return (
    <div className="grid h-40 place-items-center rounded-md border border-dashed text-sm text-muted-foreground">{text}</div>
  );
}
