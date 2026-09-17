"use client";
import { useSearchParams } from "next/navigation";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Exports whatever the current filters show (or only the selected ids). */
export function ExportMenu({ ids, size = "default", label = "Export" }: { ids?: string[]; size?: "default" | "sm"; label?: string }) {
  const params = useSearchParams();
  const href = (format: "csv" | "xlsx") => {
    const sp = new URLSearchParams(params.toString());
    sp.delete("page");
    sp.set("format", format);
    if (ids?.length) sp.set("ids", ids.join(","));
    return `/api/export?${sp.toString()}`;
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={size}>
          <Download /> {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          {ids?.length ? `${ids.length} selected ${ids.length === 1 ? "component" : "components"}` : "All results matching the current filters"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href={href("xlsx")} download>
            <FileSpreadsheet /> Excel workbook (.xlsx)
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={href("csv")} download>
            <FileText /> CSV file (.csv)
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
