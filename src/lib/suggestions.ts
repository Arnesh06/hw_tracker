import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/** Distinct owner / holder names for form autocomplete. */
export const getPeopleSuggestions = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("components")
    .select("current_owner, current_holder")
    .order("updated_at", { ascending: false })
    .limit(2000);
  const owners = new Set<string>();
  const holders = new Set<string>();
  for (const r of (data as { current_owner: string; current_holder: string | null }[] | null) ?? []) {
    if (r.current_owner) owners.add(r.current_owner);
    if (r.current_holder) holders.add(r.current_holder);
  }
  const people = new Set([...owners, ...holders]);
  return {
    owners: Array.from(owners).slice(0, 300),
    holders: Array.from(people).slice(0, 300),
  };
});
