import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { MASTER_CONFIG } from "@/lib/masters-config";
import type { MasterEntity } from "@/lib/validations";
import { PageHeader } from "@/components/shared/page-header";
import { Forbidden } from "@/components/shared/forbidden";
import { Card } from "@/components/ui/card";
import { MasterTable, type Usage } from "./master-table";
import type { MasterRow } from "./master-form-dialog";

export async function loadMaster(entity: MasterEntity) {
  const supabase = await createClient();
  const [{ data: rows, error }, { data: usageRows }] = await Promise.all([
    supabase.from(entity).select("*").order("is_active", { ascending: false }).order("name").limit(5000),
    supabase.rpc("master_usage", { p_entity: entity }),
  ]);
  if (error) throw new Error(error.message);
  const usage: Usage = {};
  for (const u of (usageRows as { ref_id: string; records: number; units: number }[] | null) ?? []) {
    usage[u.ref_id] = { records: Number(u.records), units: Number(u.units) };
  }
  return { rows: (rows as MasterRow[] | null) ?? [], usage };
}

/** Shared server page for projects, providers, vendors and locations. */
export async function MasterPage({ entity }: { entity: MasterEntity }) {
  const user = await requireUser();
  const config = MASTER_CONFIG[entity];
  if (!can(user, "inventory.view")) return <Forbidden what={config.title.toLowerCase()} />;
  const { rows, usage } = await loadMaster(entity);
  const active = rows.filter((r) => r.is_active).length;

  return (
    <>
      <PageHeader
        title={config.title}
        description={`${config.description} ${active} active${rows.length > active ? `, ${rows.length - active} inactive` : ""}.`}
      />
      <Card className="overflow-hidden">
        <MasterTable entity={entity} rows={rows} usage={usage} />
      </Card>
    </>
  );
}
