import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { MasterEntity } from "@/lib/validations";

/** All rows of a reference table plus how many active components use each. */
export async function loadMaster(entity: MasterEntity) {
  const supabase = await createClient();
  const [rowsRes, usageRes] = await Promise.all([
    supabase.from(entity).select("*").order("name", { ascending: true }).limit(5000),
    supabase.rpc("master_usage", { p_entity: entity }),
  ]);
  if (rowsRes.error) throw new Error(rowsRes.error.message);
  const usage: Record<string, { records: number; units: number }> = {};
  for (const u of (usageRes.data as { ref_id: string; records: number; units: number }[] | null) ?? []) {
    usage[u.ref_id] = { records: Number(u.records), units: Number(u.units) };
  }
  return {
    rows: (rowsRes.data ?? []) as (Record<string, unknown> & { id: string; name: string; is_active: boolean })[],
    usage,
  };
}
