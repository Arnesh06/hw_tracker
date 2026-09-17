import type { Metadata } from "next";
import Link from "next/link";
import { PackageSearch, Plus, ScanLine, Upload } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getMasterOptions, getSettings } from "@/lib/data";
import { fetchInventoryPage, parseInventoryParams } from "@/lib/inventory-query";
import { PAGE_SIZE } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Forbidden } from "@/components/shared/forbidden";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InventoryFilters } from "@/components/inventory/inventory-filters";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { ExportMenu } from "@/components/inventory/export-menu";
import type { InventoryRow } from "@/components/inventory/types";

export const metadata: Metadata = { title: "Inventory" };

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (!can(user, "inventory.view")) return <Forbidden what="the inventory" />;

  const filters = parseInventoryParams(await searchParams);
  const supabase = await createClient();
  const [settings, options] = await Promise.all([getSettings(), getMasterOptions()]);
  const { data, count, error } = await fetchInventoryPage(supabase, filters, PAGE_SIZE, settings.warranty_alert_days);
  if (error) throw new Error(error.message);
  const rows = data as unknown as InventoryRow[];
  const filtered = Boolean(
    filters.q || filters.status || filters.category || filters.project || filters.provider ||
      filters.vendor || filters.location || filters.warranty || filters.archived !== "active",
  );

  return (
    <>
      <PageHeader
        title="Inventory"
        description={`${formatNumber(count)} ${count === 1 ? "record" : "records"}${filtered ? " match your filters" : ""}. Click a row to view history, files and QR label.`}
        actions={
          <>
            <Button variant="outline" asChild className="hidden sm:inline-flex">
              <Link href="/inventory/scan">
                <ScanLine /> Scan
              </Link>
            </Button>
            {can(user, "inventory.import") && (
              <Button variant="outline" asChild>
                <Link href="/inventory/import">
                  <Upload /> Import
                </Link>
              </Button>
            )}
            {can(user, "inventory.export") && <ExportMenu />}
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

      <Card className="overflow-hidden">
        <InventoryFilters options={options} />
        {rows.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title={filtered ? "Nothing matches these filters" : "No components yet"}
            description={
              filtered
                ? "Try a shorter search term or clear some filters."
                : "Add your first component or import a spreadsheet to get started."
            }
            action={
              !filtered && can(user, "inventory.create") ? (
                <Button asChild>
                  <Link href="/inventory/new">
                    <Plus /> Add component
                  </Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <InventoryTable key={JSON.stringify(filters)} rows={rows} sort={filters.sort} dir={filters.dir} />
            <Pagination page={filters.page} pageSize={PAGE_SIZE} total={count} />
          </>
        )}
      </Card>
    </>
  );
}
