"use client";
import { useState, useTransition } from "react";
import { ArrowLeftRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/shared/field";
import { OptionSelect } from "@/components/shared/option-select";
import { moveComponent } from "@/lib/actions/components";
import { STATUSES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Option } from "@/types/database";

type MoveType = "assigned" | "transferred" | "returned" | "relocated" | "status_changed";

const TYPES: { value: MoveType; label: string; hint: string }[] = [
  { value: "assigned", label: "Assign", hint: "Hand it to a person; ownership stays the same." },
  { value: "transferred", label: "Transfer", hint: "Change who owns it." },
  { value: "returned", label: "Return", hint: "Back to stock; clears the holder." },
  { value: "relocated", label: "Move", hint: "Change the storage location." },
  { value: "status_changed", label: "Status", hint: "Mark damaged, in repair, retired…" },
];

export function MoveDialog({
  component,
  locations,
  projects,
  people,
  initialType = "assigned",
  trigger,
}: {
  component: {
    id: string;
    hw_id: string;
    name: string;
    current_owner: string;
    current_holder: string | null;
    location_id: string | null;
    project_id: string | null;
    status: string;
  };
  locations: Option[];
  projects: Option[];
  people: string[];
  initialType?: MoveType;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<MoveType>(initialType);
  const [owner, setOwner] = useState("");
  const [holder, setHolder] = useState("");
  const [locationId, setLocationId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [pending, start] = useTransition();

  const reset = () => {
    setOwner("");
    setHolder("");
    setLocationId("");
    setProjectId("");
    setStatus("");
    setNotes("");
    setErrors({});
  };

  const submit = () =>
    start(async () => {
      const res = await moveComponent({
        componentId: component.id,
        type,
        owner,
        holder,
        locationId,
        projectId,
        status,
        notes,
      });
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error);
        return;
      }
      toast.success(res.message ?? "Saved");
      reset();
      setOpen(false);
    });

  const statusDefault = type === "assigned" ? "in_use" : type === "returned" ? "available" : "";

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setType(initialType);
        else reset();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <ArrowLeftRight /> Assign / transfer
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Record a movement</DialogTitle>
          <DialogDescription>
            <span className="hw-id text-foreground">{component.hw_id}</span> {component.name}. Owned by{" "}
            {component.current_owner}
            {component.current_holder ? `, currently with ${component.current_holder}` : ", not assigned to anyone"}.
          </DialogDescription>
        </DialogHeader>

        <div role="radiogroup" aria-label="Movement type" className="grid grid-cols-5 gap-1 rounded-lg bg-muted p-1">
          {TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={type === t.value}
              onClick={() => {
                setType(t.value);
                setErrors({});
              }}
              className={cn(
                "rounded-md px-1 py-1.5 text-xs font-medium text-muted-foreground transition-colors sm:text-sm",
                type === t.value ? "bg-card text-foreground shadow-sm" : "hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="-mt-2 text-xs text-muted-foreground">{TYPES.find((t) => t.value === type)?.hint}</p>

        <div className="grid gap-4 sm:grid-cols-2">
          {type === "transferred" && (
            <Field label="New owner" htmlFor="mv-owner" required error={errors.owner} className="sm:col-span-2">
              <Input id="mv-owner" value={owner} onChange={(e) => setOwner(e.target.value)} list="mv-people" maxLength={200} autoFocus />
            </Field>
          )}
          {(type === "assigned" || type === "transferred") && (
            <Field
              label={type === "assigned" ? "Assign to" : "New holder"}
              htmlFor="mv-holder"
              required={type === "assigned"}
              error={errors.holder}
              hint={type === "transferred" ? "Optional. Leave blank to keep the current holder." : undefined}
            >
              <Input
                id="mv-holder"
                value={holder}
                onChange={(e) => setHolder(e.target.value)}
                list="mv-people"
                maxLength={200}
                autoFocus={type === "assigned"}
              />
            </Field>
          )}
          {(type === "assigned" || type === "transferred") && (
            <Field label="Project" htmlFor="mv-project" error={errors.projectId} hint="Optional">
              <OptionSelect id="mv-project" value={projectId} onChange={setProjectId} options={projects} allowNone noneLabel="Keep current" placeholder="Keep current" />
            </Field>
          )}
          {type !== "status_changed" && (
            <Field
              label={type === "relocated" ? "New location" : "Location"}
              htmlFor="mv-location"
              required={type === "relocated"}
              error={errors.locationId}
              hint={type === "relocated" ? undefined : "Optional"}
            >
              <OptionSelect
                id="mv-location"
                value={locationId}
                onChange={setLocationId}
                options={locations.filter((l) => l.id !== component.location_id || type !== "relocated")}
                allowNone={type !== "relocated"}
                noneLabel="Keep current"
                placeholder={type === "relocated" ? "Choose a location" : "Keep current"}
              />
            </Field>
          )}
          <Field
            label="Status"
            htmlFor="mv-status"
            required={type === "status_changed"}
            error={errors.status}
            hint={statusDefault ? `Defaults to “${STATUSES.find((s) => s.value === statusDefault)?.label}”` : type === "status_changed" ? undefined : "Optional"}
          >
            <Select value={status || "__keep__"} onValueChange={(v) => setStatus(v === "__keep__" ? "" : v)}>
              <SelectTrigger id="mv-status" aria-invalid={errors.status ? true : undefined}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__keep__" className="text-muted-foreground">
                  {type === "status_changed" ? "Choose a status" : statusDefault ? "Use default" : "Keep current"}
                </SelectItem>
                {STATUSES.filter((s) => type !== "status_changed" || s.value !== component.status).map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Notes" htmlFor="mv-notes" error={errors.notes} className="sm:col-span-2" hint="Reason, ticket number, expected return date…">
            <Textarea id="mv-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={1000} />
          </Field>
        </div>

        <datalist id="mv-people">
          {people.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={pending}>
            {pending && <Loader2 className="animate-spin" />} Record movement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
