"use client";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, MoreHorizontal, Pencil, Plus, Power, PowerOff, Search, Trash2, Inbox } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field } from "@/components/shared/field";
import { EmptyState } from "@/components/shared/empty-state";
import { useCan } from "@/components/session-provider";
import { deleteMaster, saveMaster, setMasterActive } from "@/lib/actions/masters";
import { PROJECT_STATUSES } from "@/lib/constants";
import { buttonVariants } from "@/components/ui/button";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import { MASTER_CONFIG } from "./config";
import type { MasterEntity } from "@/lib/validations";

export type MasterRow = Record<string, unknown> & { id: string; name: string; is_active: boolean };
type Usage = Record<string, { records: number; units: number }>;

function cellText(key: string, v: unknown) {
  if (v === null || v === undefined || v === "") return null;
  if (key === "status") return PROJECT_STATUSES.find((s) => s.value === v)?.label ?? String(v);
  if (key.endsWith("_date")) return formatDate(String(v));
  return String(v);
}

export function MasterManager({ entity, rows, usage }: { entity: MasterEntity; rows: MasterRow[]; usage: Usage }) {
  const cfg = MASTER_CONFIG[entity];
  const router = useRouter();
  const canManage = useCan("masters.manage");
  const [q, setQ] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState<MasterRow | "new" | null>(null);
  const [deleting, setDeleting] = useState<MasterRow | null>(null);
  const [pending, start] = useTransition();

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (showInactive || r.is_active) &&
        (!term || Object.values(r).some((v) => typeof v === "string" && v.toLowerCase().includes(term))),
    );
  }, [rows, q, showInactive]);
  const inactiveCount = rows.filter((r) => !r.is_active).length;

  const toggleActive = (r: MasterRow) =>
    start(async () => {
      const res = await setMasterActive(entity, r.id, !r.is_active);
      if (res.ok) {
        toast.success(`${r.name}: ${res.message?.toLowerCase()}`);
        router.refresh();
      } else toast.error(res.error);
    });

  const confirmDelete = () =>
    start(async () => {
      if (!deleting) return;
      const res = await deleteMaster(entity, deleting.id);
      if (res.ok) {
        toast.success(`Deleted ${deleting.name}`);
        setDeleting(null);
        router.refresh();
      } else toast.error(res.error);
    });

  return (
    <>
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${cfg.plural}…`} className="h-9 pl-9" aria-label={`Search ${cfg.plural}`} />
        </div>
        {inactiveCount > 0 && (
          <div className="flex items-center gap-2">
            <Switch id={`inactive-${entity}`} checked={showInactive} onCheckedChange={setShowInactive} />
            <Label htmlFor={`inactive-${entity}`} className="text-sm font-normal text-muted-foreground">
              Show inactive ({inactiveCount})
            </Label>
          </div>
        )}
        {canManage && (
          <Button onClick={() => setEditing("new")}>
            <Plus /> New {cfg.singular}
          </Button>
        )}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={rows.length ? `No ${cfg.plural} match` : `No ${cfg.plural} yet`}
          description={rows.length ? "Try a different search." : cfg.description}
          action={
            !rows.length && canManage ? (
              <Button onClick={() => setEditing("new")}>
                <Plus /> New {cfg.singular}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Name</TableHead>
              {cfg.columns.map((c) => (
                <TableHead key={c.key} className={cn("hidden sm:table-cell", c.className)}>
                  {c.label}
                </TableHead>
              ))}
              <TableHead className="text-right">In use</TableHead>
              {canManage && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((r) => {
              const u = usage[r.id];
              return (
                <TableRow key={r.id} className={cn(!r.is_active && "opacity-60")}>
                  <TableCell className="max-w-[16rem]">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{r.name}</span>
                      {!r.is_active && <Badge variant="muted">Inactive</Badge>}
                    </div>
                  </TableCell>
                  {cfg.columns.map((c) => {
                    const text = cellText(c.key, r[c.key]);
                    return (
                      <TableCell
                        key={c.key}
                        className={cn("hidden max-w-[14rem] truncate text-muted-foreground sm:table-cell", c.className, c.mono && "font-mono text-xs")}
                      >
                        {c.key === "website" && text ? (
                          <a href={text} target="_blank" rel="noreferrer noopener" className="text-primary hover:underline">
                            {text.replace(/^https?:\/\//, "")}
                          </a>
                        ) : (
                          text ?? "—"
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className="tabular text-right">
                    {u ? (
                      <Link href={`/inventory?${cfg.filterParam}=${r.id}`} className="text-primary hover:underline">
                        {formatNumber(u.records)} {u.records === 1 ? "record" : "records"}
                        <span className="hidden text-muted-foreground md:inline">, {formatNumber(u.units)} units</span>
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">Unused</span>
                    )}
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Actions for ${r.name}`} disabled={pending}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setEditing(r)}>
                            <Pencil /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => toggleActive(r)}>
                            {r.is_active ? <PowerOff /> : <Power />} {r.is_active ? "Deactivate" : "Reactivate"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={() => setDeleting(r)}
                            disabled={!!u}
                            destructive
                          >
                            <Trash2 /> {u ? "Delete (in use)" : "Delete"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {editing && (
        <MasterDialog
          entity={entity}
          row={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This {cfg.singular} isn&apos;t used by any active component. If archived components still reference it, deletion is
              refused and you can deactivate it instead. The deletion is recorded in the audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              disabled={pending}
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
            >
              {pending && <Loader2 className="animate-spin" />} Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function MasterDialog({
  entity,
  row,
  onClose,
  onSaved,
}: {
  entity: MasterEntity;
  row: MasterRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const cfg = MASTER_CONFIG[entity];
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      cfg.fields.map((f) => [
        f.key,
        row?.[f.key] !== undefined && row?.[f.key] !== null ? String(row[f.key]) : f.type === "select" ? (f.options?.[0]?.value ?? "") : "",
      ]),
    ),
  );
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await saveMaster(entity, row?.id ?? null, values);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error);
        return;
      }
      toast.success(row ? `Saved ${res.data?.name}` : `Created ${res.data?.name}`);
      onSaved();
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>{row ? `Edit ${row.name}` : `New ${cfg.singular}`}</DialogTitle>
            <DialogDescription>{cfg.description} Only the name is required.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            {cfg.fields.map((f) => {
              const id = `m-${f.key}`;
              const common = {
                id,
                value: values[f.key] ?? "",
                "aria-invalid": errors[f.key] ? true : undefined,
                placeholder: f.placeholder,
              };
              const onChange = (v: string) => {
                setValues((p) => ({ ...p, [f.key]: v }));
                if (errors[f.key]) setErrors((p) => ({ ...p, [f.key]: undefined }));
              };
              return (
                <Field
                  key={f.key}
                  label={f.label}
                  htmlFor={id}
                  required={f.key === "name"}
                  error={errors[f.key]}
                  hint={f.hint}
                  className={cn((f.wide || f.key === "name") && "sm:col-span-2")}
                >
                  {f.type === "textarea" ? (
                    <Textarea {...common} rows={3} onChange={(e) => onChange(e.target.value)} />
                  ) : f.type === "select" ? (
                    <Select value={values[f.key]} onValueChange={onChange}>
                      <SelectTrigger id={id}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
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
                      autoFocus={f.key === "name"}
                      className={cn(f.mono && "font-mono text-[0.8rem]")}
                      onChange={(e) => onChange(e.target.value)}
                    />
                  )}
                </Field>
              );
            })}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} {row ? "Save changes" : `Create ${cfg.singular}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
