"use client";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQueryParams } from "@/components/inventory/use-query-params";
import { PrintButton } from "@/components/inventory/print-button";
import { REPORT_GROUPS, type ReportGroup } from "@/lib/reports";

export function ReportControls({ group, archived, canExport }: { group: ReportGroup; archived: boolean; canExport: boolean }) {
  const { set, pending } = useQueryParams();
  const exportHref = (format: "csv" | "xlsx") =>
    `/api/reports/export?group=${group}&format=${format}${archived ? "&archived=1" : ""}`;

  return (
    <div className="no-print flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <Label htmlFor="report-group" className="text-sm font-normal text-muted-foreground">
          Group by
        </Label>
        <Select value={group} onValueChange={(v) => set({ group: v === "category" ? null : v })}>
          <SelectTrigger id="report-group" className="h-9 w-44" disabled={pending}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REPORT_GROUPS.map((g) => (
              <SelectItem key={g.value} value={g.value}>
                {g.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="report-archived" checked={archived} onCheckedChange={(v) => set({ archived: v ? "1" : null })} disabled={pending} />
        <Label htmlFor="report-archived" className="text-sm font-normal text-muted-foreground">
          Include archived
        </Label>
      </div>
      <div className="flex gap-2 sm:ml-auto">
        <PrintButton label="Print" />
        {canExport && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <a href={exportHref("xlsx")} download>
                  <FileSpreadsheet /> Excel (.xlsx)
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={exportHref("csv")} download>
                  <FileText /> CSV (.csv)
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
