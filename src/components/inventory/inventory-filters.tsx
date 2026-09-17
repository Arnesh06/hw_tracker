"use client";
import { useEffect, useState } from "react";
import { Filter, Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STATUSES } from "@/lib/constants";
import type { MasterOptions, Option } from "@/types/database";
import { useQueryParams } from "./use-query-params";
import { cn } from "@/lib/utils";

const ALL = "__all__";
const FILTER_KEYS = ["status", "category", "project", "provider", "vendor", "location", "warranty", "archived"] as const;

export function InventoryFilters({ options }: { options: MasterOptions }) {
  const { params, set, pending } = useQueryParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [showMore, setShowMore] = useState(
    () => ["provider", "vendor", "location", "warranty", "archived"].some((k) => params.get(k)),
  );

  // Keep the box in sync when the URL changes elsewhere (e.g. global search).
  const urlQ = params.get("q") ?? "";
  useEffect(() => {
    setQ((cur) => (cur.trim() === urlQ ? cur : urlQ));
  }, [urlQ]);

  useEffect(() => {
    if (q.trim() === urlQ) return;
    const t = setTimeout(() => set({ q: q.trim() || null }), 350);
    return () => clearTimeout(t);
  }, [q, urlQ, set]);

  const activeCount = FILTER_KEYS.filter((k) => params.get(k)).length;

  const pick = (key: string, placeholder: string, items: { value: string; label: string }[], className?: string) => (
    <Select value={params.get(key) ?? ALL} onValueChange={(v) => set({ [key]: v === ALL ? null : v })}>
      <SelectTrigger className={cn("h-9 w-full sm:w-44", className)} aria-label={placeholder}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{placeholder}</SelectItem>
        {items.map((i) => (
          <SelectItem key={i.value} value={i.value}>
            {i.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
  const opts = (list: Option[]) => list.map((o) => ({ value: o.id, label: o.is_active === false ? `${o.name} (inactive)` : o.name }));

  return (
    <div className="space-y-3 border-b p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search ID, name, serial, owner, holder, project, notes…"
            className="h-9 pl-9 pr-9"
            aria-label="Search inventory"
          />
          {pending ? (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : q ? (
            <button
              type="button"
              onClick={() => setQ("")}
              className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:bg-muted"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {pick("status", "All statuses", STATUSES.map((s) => ({ value: s.value, label: s.label })), "sm:w-36")}
          {pick("category", "All categories", opts(options.categories))}
          {pick("project", "All projects", opts(options.projects))}
          <Button
            variant={showMore ? "secondary" : "outline"}
            size="sm"
            className="h-9"
            onClick={() => setShowMore((v) => !v)}
            aria-expanded={showMore}
          >
            <Filter /> More
          </Button>
        </div>
      </div>

      {showMore && (
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {pick("provider", "Any source", opts(options.providers))}
          {pick("vendor", "Any vendor", opts(options.vendors))}
          {pick("location", "Any location", opts(options.locations))}
          {pick("warranty", "Any warranty", [
            { value: "expiring", label: "Warranty ending soon" },
            { value: "expired", label: "Warranty expired" },
          ])}
          {pick("archived", "Active only", [
            { value: "archived", label: "Archived only" },
            { value: "all", label: "Active and archived" },
          ])}
        </div>
      )}

      {(activeCount > 0 || params.get("q")) && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            {activeCount} {activeCount === 1 ? "filter" : "filters"} applied
          </span>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs"
            onClick={() => {
              setQ("");
              set(Object.fromEntries([...FILTER_KEYS, "q"].map((k) => [k, null])));
            }}
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
