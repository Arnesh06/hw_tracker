import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { AppSettings, MasterOptions, Option } from "@/types/database";

export const getSettings = cache(async (): Promise<AppSettings> => {
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("*").eq("id", 1).maybeSingle();
  return (
    (data as AppSettings | null) ?? {
      id: 1,
      org_name: "HW-Track",
      currency: "INR",
      warranty_alert_days: 30,
      updated_at: new Date().toISOString(),
    }
  );
});

/** Dropdown options for component forms and filters. */
export const getMasterOptions = cache(async (): Promise<MasterOptions> => {
  const supabase = await createClient();
  const q = (table: string) =>
    supabase.from(table).select("id, name, is_active").order("name", { ascending: true }).limit(2000);
  const [categories, providers, vendors, locations, projects] = await Promise.all([
    q("categories"),
    q("providers"),
    q("vendors"),
    q("locations"),
    q("projects"),
  ]);
  const rows = (r: { data: unknown }) => (r.data as Option[] | null) ?? [];
  return {
    categories: rows(categories),
    providers: rows(providers),
    vendors: rows(vendors),
    locations: rows(locations),
    projects: rows(projects),
  };
});
