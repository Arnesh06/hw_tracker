"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown, Archive, QrCode, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { useSession, useCan } from "@/components/session-provider";
import { cn, formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import type { SortColumn } from "@/lib/constants";
import { useQueryParams } from "./use-query-params";
import { ExportMenu } from "./export-menu";
import type { InventoryRow } from "./types";

export function InventoryTable({ rows, sort, dir }: { rows: InventoryRow[]; sort: SortColumn; dir: "asc" | "desc" }) {
  const router = useRouter();
  const { currency } = useSession();
  const canExport = useCan("inventory.export");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const ids = useMemo(() => rows.map((r) => r.id), [rows]);
  const selectedIds = ids.filter((id) => selected.has(id));
  const allChecked = selectedIds.length > 0 && selectedIds.length === ids.length;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b bg-accent/60 px-4 py-2 text-sm">
          <span className="font-medium">{selectedIds.length} selected</span>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
            <X /> Clear
          </Button>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/inventory/labels?ids=${selectedIds.join(",")}`}>
                <QrCode /> Print labels
              </Link>
            </Button>
            {canExport && <ExportMenu ids={selectedIds} size="sm" label="Export selected" />}
          </div>
        </div>
      )}

      {/* Desktop / tablet */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10">
                <Checkbox
                  aria-label="Select all on this page"
                  checked={allChecked ? true : selectedIds.length ? "indeterminate" : false}
                  onCheckedChange={(v) => setSelected(v ? new Set(ids) : new Set())}
                />
              </TableHead>
              <SortHead col="hw_id" sort={sort} dir={dir} className="w-[7.5rem]">ID</SortHead>
              <SortHead col="name" sort={sort} dir={dir}>Component</SortHead>
              <SortHead col="category_name" sort={sort} dir={dir} className="hidden lg:table-cell">Category</SortHead>
              <SortHead col="quantity" sort={sort} dir={dir} className="text-right">Qty</SortHead>
              <SortHead col="status" sort={sort} dir={dir}>Status</SortHead>
              <SortHead col="current_owner" sort={sort} dir={dir}>Owner / holder</SortHead>
              <TableHead className="hidden xl:table-cell">Location</TableHead>
              <SortHead col="received_date" sort={sort} dir={dir} className="hidden xl:table-cell">Received</SortHead>
              <SortHead col="total_value" sort={sort} dir={dir} className="hidden lg:table-cell text-right">Value</SortHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow
                key={r.id}
                data-state={selected.has(r.id) ? "selected" : undefined}
                className={cn("cursor-pointer", r.archived_at && "opacity-60")}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest("button,a,[role=checkbox]")) return;
                  router.push(`/inventory/${r.id}`);
                }}
              >
                <TableCell>
                  <Checkbox aria-label={`Select ${r.hw_id}`} checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} />
                </TableCell>
                <TableCell>
                  <Link href={`/inventory/${r.id}`} className="hw-id text-primary hover:underline">
                    {r.hw_id}
                  </Link>
                </TableCell>
                <TableCell className="max-w-[18rem]">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{r.name}</span>
                    {r.archived_at && (
                      <Badge variant="muted" className="shrink-0">
                        <Archive className="h-3 w-3" /> Archived
                      </Badge>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {[r.manufacturer, r.model].filter(Boolean).join(" ") || r.provider_name}
                    {r.serial_number ? `, S/N ${r.serial_number}` : ""}
                  </p>
                </TableCell>
                <TableCell className="hidden text-muted-foreground lg:table-cell">{r.category_name}</TableCell>
                <TableCell className="tabular text-right">{formatNumber(r.quantity)}</TableCell>
                <TableCell>
                  <StatusBadge status={r.status} />
                </TableCell>
                <TableCell className="max-w-[14rem]">
                  <p className="truncate">{r.current_owner}</p>
                  {r.current_holder && <p className="truncate text-xs text-muted-foreground">with {r.current_holder}</p>}
                </TableCell>
                <TableCell className="hidden max-w-[10rem] truncate text-muted-foreground xl:table-cell">
                  {r.location_name ?? "—"}
                </TableCell>
                <TableCell className="tabular hidden whitespace-nowrap text-muted-foreground xl:table-cell">
                  {formatDate(r.received_date)}
                </TableCell>
                <TableCell className="tabular hidden text-right lg:table-cell">
                  {Number(r.total_value) > 0 ? formatCurrency(r.total_value, currency) : <span className="text-muted-foreground">—</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile */}
      <ul className="divide-y md:hidden">
        {rows.map((r) => (
          <li key={r.id} className={cn("flex gap-3 px-4 py-3", r.archived_at && "opacity-60")}>
            <Checkbox className="mt-1" aria-label={`Select ${r.hw_id}`} checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} />
            <Link href={`/inventory/${r.id}`} className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="hw-id text-primary">{r.hw_id}</span>
                <StatusBadge status={r.status} />
              </div>
              <p className="mt-1 truncate font-medium">{r.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {r.category_name}, qty {formatNumber(r.quantity)}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {r.current_owner}
                {r.current_holder ? `, with ${r.current_holder}` : ""}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

function SortHead({
  col,
  sort,
  dir,
  className,
  children,
}: {
  col: SortColumn;
  sort: SortColumn;
  dir: "asc" | "desc";
  className?: string;
  children: React.ReactNode;
}) {
  const { set } = useQueryParams();
  const active = sort === col;
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  const nextDir = active && dir === "desc" ? "asc" : active ? "desc" : col === "name" || col === "hw_id" ? "asc" : "desc";
  return (
    <TableHead className={className} aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        onClick={() => set({ sort: col, dir: nextDir })}
        className={cn(
          "-mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 hover:text-foreground",
          active && "text-foreground",
          className?.includes("text-right") && "flex-row-reverse",
        )}
      >
        {children}
        <Icon className={cn("h-3.5 w-3.5", !active && "opacity-40")} />
      </button>
    </TableHead>
  );
}
