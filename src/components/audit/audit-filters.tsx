"use client";
import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryParams } from "@/components/inventory/use-query-params";

const ALL = "__all__";

export function AuditFilters({
  entities,
  actions,
}: {
  entities: readonly { value: string; label: string }[];
  actions: readonly { value: string; label: string }[];
}) {
  const { params, set } = useQueryParams();
  const urlQ = params.get("q") ?? "";
  const [q, setQ] = useState(urlQ);

  useEffect(() => {
    setQ((cur) => (cur.trim() === urlQ ? cur : urlQ));
  }, [urlQ]);
  useEffect(() => {
    if (q.trim() === urlQ) return;
    const t = setTimeout(() => set({ q: q.trim() || null }), 350);
    return () => clearTimeout(t);
  }, [q, urlQ, set]);

  const any = ["q", "entity", "action", "from", "to"].some((k) => params.get(k));

  return (
    <div className="grid gap-3 border-b p-4 sm:grid-cols-2 lg:grid-cols-[1fr_11rem_11rem_9.5rem_9.5rem_auto] lg:items-end">
      <div className="space-y-1.5">
        <Label htmlFor="audit-q" className="text-xs text-muted-foreground">Search</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="audit-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Record, HW ID or user email" className="h-9 pl-9" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Area</Label>
        <Select value={params.get("entity") ?? ALL} onValueChange={(v) => set({ entity: v === ALL ? null : v })}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Everything</SelectItem>
            {entities.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Action</Label>
        <Select value={params.get("action") ?? ALL} onValueChange={(v) => set({ action: v === ALL ? null : v })}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any action</SelectItem>
            {actions.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="audit-from" className="text-xs text-muted-foreground">From</Label>
        <Input id="audit-from" type="date" className="h-9" value={params.get("from") ?? ""} onChange={(e) => set({ from: e.target.value || null })} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="audit-to" className="text-xs text-muted-foreground">To</Label>
        <Input id="audit-to" type="date" className="h-9" value={params.get("to") ?? ""} onChange={(e) => set({ to: e.target.value || null })} />
      </div>
      {any && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9"
          onClick={() => {
            setQ("");
            set({ q: null, entity: null, action: null, from: null, to: null });
          }}
        >
          <X /> Clear
        </Button>
      )}
    </div>
  );
}
