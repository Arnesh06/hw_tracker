"use client";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/shared/field";
import { saveMaster } from "@/lib/actions/masters";
import type { MasterConfig } from "@/lib/masters-config";
import { cn } from "@/lib/utils";

export type MasterRow = { id: string; name: string; is_active: boolean; [key: string]: unknown };

const NONE = "__none__";

export function MasterFormDialog({
  config,
  row,
  open,
  onOpenChange,
}: {
  config: MasterConfig;
  row: MasterRow | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const initial = () =>
    Object.fromEntries(
      config.fields.map((f) => {
        const v = row?.[f.key];
        return [f.key, v === null || v === undefined ? (f.key === "status" ? "active" : "") : String(v)];
      }),
    ) as Record<string, string>;
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [pending, start] = useTransition();
  const [lastKey, setLastKey] = useState<string | null>(null);

  // Re-seed when the dialog opens for a different record.
  const key = `${open}-${row?.id ?? "new"}`;
  if (key !== lastKey) {
    setLastKey(key);
    if (open) {
      setValues(initial());
      setErrors({});
    }
  }

  const set = (k: string, v: string) => {
    setValues((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await saveMaster(config.entity, row?.id ?? null, values);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error);
        return;
      }
      toast.success(row ? `Saved ${res.data?.name}` : `Added ${res.data?.name}`);
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <form onSubmit={submit} noValidate className="space-y-5">
          <DialogHeader>
            <DialogTitle>{row ? `Edit ${row.name}` : `New ${config.singular}`}</DialogTitle>
            <DialogDescription>Only the name is required.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            {config.fields.map((f) => {
              const id = `m-${f.key}`;
              const common = {
                id,
                value: values[f.key] ?? "",
                "aria-invalid": errors[f.key] ? true : undefined,
                placeholder: f.placeholder,
              };
              return (
                <Field key={f.key} label={f.label} htmlFor={id} required={f.required} error={errors[f.key]} hint={f.hint} className={cn(f.wide && "sm:col-span-2")}>
                  {f.type === "textarea" ? (
                    <Textarea {...common} rows={3} maxLength={2000} onChange={(e) => set(f.key, e.target.value)} />
                  ) : f.type === "select" ? (
                    <Select
                      value={values[f.key] || NONE}
                      onValueChange={(v) => set(f.key, v === NONE ? "" : v)}
                    >
                      <SelectTrigger id={id}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {!f.required && (
                          <SelectItem value={NONE} className="text-muted-foreground">
                            Not set
                          </SelectItem>
                        )}
                        {f.options?.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      {...common}
                      type={f.type ?? "text"}
                      maxLength={300}
                      autoFocus={f.key === "name"}
                      className={cn(f.mono && "font-mono text-[0.8rem]")}
                      onChange={(e) => set(f.key, e.target.value)}
                    />
                  )}
                </Field>
              );
            })}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} {row ? "Save changes" : `Add ${config.singular}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
