"use client";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EyeOff, FolderKanban, Handshake, MapPin, MoreHorizontal, Pencil, Plus, Power, PowerOff, Search, Shapes, Store, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { useCan } from "@/components/session-provider";
import { deleteMaster, setMasterActive } from "@/lib/actions/masters";
import { PROJECT_STATUSES } from "@/lib/constants";
import type { MasterColumn, MasterConfig } from "@/lib/masters-config";
import { MASTER_CONFIG } from "@/lib/masters-config";
import type { MasterEntity } from "@/lib/validations";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import { MasterFormDialog, type MasterRow } from "./master-form-dialog";

export type Usage = Record<string, { records: number; units: number }>;

const EMPTY_ICONS = { projects: FolderKanban, providers: Handshake, vendors: Store, locations: MapPin, categories: Shapes } as const;

const HIDE: Record<string, string> = { md: "hidden md:table-cell", lg: "hidden lg:table-cell", xl: "hidden xl:table-cell" };
const PROJECT_TONE: Record<string, string> = {
  active: "text-status-available",
  on_hold: "text-status-repair",
  completed: "text-status-inuse",
  cancelled: "text-muted-foreground",
};

export function MasterTable({
  entity,
  rows,
  usage,
  embedded = false,
}: {
  entity: MasterEntity;
  rows: MasterRow[];
  usage: Usage;
  embedded?: boolean;
}) {
  const config: MasterConfig = MASTER_CONFIG[entity];
  const router = useRouter();
  const canManage = useCan("masters.manage");
  const [q, setQ] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState<MasterRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<MasterRow | null>(null);
  const [pending, start] = useTransition();

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (!showInactive && !r.is_active) return false;
      if (!term) return true;
      return Object.values(r).some((v) => typeof v === "string" && v.toLowerCase().includes(term));
    });
  }, [rows, q, showInactive]);
  const inactiveCount = rows.filter((r) => !r.is_active).length;

  const openForm = (row: MasterRow | null) => {
    setEditing(row);
    setFormOpen(true);
  };

  const toggleActive = (row: MasterRow) =>
    start(async () => {
      const res = await setMasterActive(entity, row.id, !row.is_active);
      if (res.ok) {
        toast.success(`${row.name}: ${res.message?.toLowerCase()}`);
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
      } else {
        toast.error(res.error);
        setDeleting(null);
      }
    });

  return (
    <>
      <div className={cn("flex flex-col gap-3 p-4 sm:flex-row sm:items-center", !embedded && "border-b")}>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${config.title.toLowerCase()}…`} className="h-9 pl-9" />
        </div>
        {inactiveCount > 0 && (
          <div className="flex items-center gap-2">
            <Switch id={`inactive-${entity}`} checked={showInactive} onCheckedChange={setShowInactive} />
            <Label htmlFor={`inactive-${entity}`} className="text-sm font-normal text-muted-foreground">
              Show {inactiveCount} inactive
            </Label>
          </div>
        )}
        {canManage && (
          <Button onClick={() => openForm(null)} size={embedded ? "sm" : "default"}>
            <Plus /> New {config.singular}
          </Button>
        )}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={EMPTY_ICONS[entity]}
          title={rows.length ? `No ${config.title.toLowerCase()} match` : `No ${config.title.toLowerCase()} yet`}
          description={rows.length ? "Try a different search." : config.description}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Name</TableHead>
              {config.columns.map((c) => (
                <TableHead key={c.key} className={c.hideBelow ? HIDE[c.hideBelow] : undefined}>
                  {c.label}
                </TableHead>
              ))}
              <TableHead className="text-right">In use</TableHead>
              {canManage && <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((r) => {
              const u = usage[r.id];
              const subtitle = config.subtitle?.map((k) => r[k]).filter(Boolean).join(", ");
              return (
                <TableRow key={r.id} className={cn(!r.is_active && "opacity-60")}>
                  <TableCell className="max-w-[18rem]">
                    <div className="flex items-center gap-2">
                      {canManage ? (
                        <button type="button" onClick={() => openForm(r)} className="truncate text-left font-medium hover:underline">
                          {r.name}
                        </button>
                      ) : (
                        <span className="truncate font-medium">{r.name}</span>
                      )}
                      {!r.is_active && (
                        <Badge variant="muted" className="shrink-0">
                          <EyeOff className="h-3 w-3" /> Inactive
                        </Badge>
                      )}
                    </div>
                    {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
                  </TableCell>
                  {config.columns.map((c) => (
                    <TableCell key={c.key} className={cn("max-w-[16rem] truncate", c.hideBelow && HIDE[c.hideBelow])}>
                      <CellValue column={c} value={r[c.key]} />
                    </TableCell>
                  ))}
                  <TableCell className="tabular whitespace-nowrap text-right">
                    {u ? (
                      <Link href={`/inventory?${config.filterParam}=${r.id}`} className="text-primary hover:underline">
                        {formatNumber(u.records)} {u.records === 1 ? "record" : "records"}
                        <span className="hidden text-muted-foreground sm:inline">, {formatNumber(u.units)} units</span>
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">None</span>
                    )}
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Actions for ${r.name}`} disabled={pending}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => openForm(r)}>
                            <Pencil /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => toggleActive(r)}>
                            {r.is_active ? <PowerOff /> : <Power />} {r.is_active ? "Deactivate" : "Reactivate"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            disabled={Boolean(u)}
                            onSelect={() => setDeleting(r)}
                          >
                            <Trash2 /> {u ? "In use, can't delete" : "Delete"}
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

      <MasterFormDialog
        config={config}
        row={editing}
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) router.refresh();
        }}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This can&apos;t be undone. If archived components still refer to it, the delete is blocked; deactivate it instead to hide it from forms.
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
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function CellValue({ column, value }: { column: MasterColumn; value: unknown }) {
  if (value === null || value === undefined || value === "") return <span className="text-muted-foreground">—</span>;
  const s = String(value);
  switch (column.kind) {
    case "status":
      return (
        <span className={cn("text-sm font-medium", PROJECT_TONE[s])}>
          {PROJECT_STATUSES.find((p) => p.value === s)?.label ?? s}
        </span>
      );
    case "date":
      return <span className="tabular text-muted-foreground">{formatDate(s)}</span>;
    case "email":
      return (
        <a href={`mailto:${s}`} className="text-muted-foreground hover:underline">
          {s}
        </a>
      );
    default:
      return <span className="text-muted-foreground">{s}</span>;
  }
}
