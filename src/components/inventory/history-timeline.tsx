import {
  Archive, ArchiveRestore, ArrowLeftRight, CircleDot, MapPin, PackagePlus, Pencil, RotateCcw, UserRoundCheck,
} from "lucide-react";
import { movementLabel } from "@/lib/constants";
import { formatDateTime, timeAgo } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/status-badge";
import type { Movement } from "@/types/database";

const ICONS = {
  created: PackagePlus,
  assigned: UserRoundCheck,
  transferred: ArrowLeftRight,
  returned: RotateCcw,
  relocated: MapPin,
  status_changed: CircleDot,
  edited: Pencil,
  archived: Archive,
  restored: ArchiveRestore,
} as const;

function Change({ label, from, to }: { label: string; from: React.ReactNode; to: React.ReactNode }) {
  return (
    <p className="text-sm">
      <span className="text-muted-foreground">{label}: </span>
      {from !== null && from !== undefined && from !== "" ? (
        <>
          <span className="text-muted-foreground">{from}</span>
          <span className="px-1.5 text-muted-foreground">→</span>
        </>
      ) : null}
      <span className="font-medium">{to ?? "—"}</span>
    </p>
  );
}

export function HistoryTimeline({ movements }: { movements: Movement[] }) {
  if (!movements.length) return <p className="py-6 text-sm text-muted-foreground">No history recorded yet.</p>;
  return (
    <ol className="relative space-y-6 before:absolute before:bottom-2 before:left-[15px] before:top-2 before:w-px before:bg-border">
      {movements.map((m) => {
        const Icon = ICONS[m.movement_type] ?? CircleDot;
        const created = m.movement_type === "created";
        const ownerChanged = m.from_owner !== m.to_owner;
        const holderChanged = m.from_holder !== m.to_holder;
        const locationChanged = m.from_location_name !== m.to_location_name;
        const projectChanged = m.from_project_name !== m.to_project_name;
        const statusChanged = m.from_status !== m.to_status;
        return (
          <li key={m.id} className="relative flex gap-4">
            <span className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border bg-card">
              <Icon className="h-4 w-4 text-primary" />
            </span>
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className="font-medium">{movementLabel(m.movement_type)}</p>
                <time className="text-xs text-muted-foreground" dateTime={m.created_at} title={formatDateTime(m.created_at)}>
                  {formatDateTime(m.created_at)} ({timeAgo(m.created_at)})
                </time>
              </div>
              <p className="text-xs text-muted-foreground">by {m.performed_by_email ?? "system"}</p>
              <div className="mt-2 space-y-0.5">
                {created ? (
                  <>
                    <Change label="Owner" from={null} to={m.to_owner} />
                    {m.to_holder && <Change label="Holder" from={null} to={m.to_holder} />}
                    {m.to_location_name && <Change label="Location" from={null} to={m.to_location_name} />}
                    {m.to_project_name && <Change label="Project" from={null} to={m.to_project_name} />}
                    <Change label="Quantity" from={null} to={m.quantity} />
                  </>
                ) : (
                  <>
                    {ownerChanged && <Change label="Owner" from={m.from_owner} to={m.to_owner} />}
                    {holderChanged && <Change label="Holder" from={m.from_holder ?? "nobody"} to={m.to_holder ?? "nobody"} />}
                    {locationChanged && <Change label="Location" from={m.from_location_name ?? "none"} to={m.to_location_name ?? "none"} />}
                    {projectChanged && <Change label="Project" from={m.from_project_name ?? "none"} to={m.to_project_name ?? "none"} />}
                    {statusChanged && m.to_status && (
                      <div className="flex items-center gap-1.5 text-sm">
                        <span className="text-muted-foreground">Status:</span>
                        {m.from_status && <StatusBadge status={m.from_status} />}
                        {m.from_status && <span className="text-muted-foreground">→</span>}
                        <StatusBadge status={m.to_status} />
                      </div>
                    )}
                  </>
                )}
                {m.notes && <p className="mt-1.5 rounded-md bg-muted/60 px-3 py-2 text-sm">{m.notes}</p>}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
