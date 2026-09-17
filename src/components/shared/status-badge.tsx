import { cn } from "@/lib/utils";
import { statusLabel } from "@/lib/constants";

const DOT: Record<string, string> = {
  available: "bg-status-available",
  in_use: "bg-status-inuse",
  damaged: "bg-status-damaged",
  repair: "bg-status-repair",
  retired: "bg-status-retired",
};
const TEXT: Record<string, string> = {
  available: "text-status-available",
  in_use: "text-status-inuse",
  damaged: "text-status-damaged",
  repair: "text-status-repair",
  retired: "text-muted-foreground",
};

export function StatusBadge({ status, className }: { status: string | null | undefined; className?: string }) {
  const s = status ?? "";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border bg-card px-2 py-0.5 text-xs font-medium",
        TEXT[s],
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", DOT[s] ?? "bg-muted-foreground")} aria-hidden />
      {statusLabel(s)}
    </span>
  );
}

export const STATUS_FILL: Record<string, string> = {
  available: "hsl(var(--status-available))",
  in_use: "hsl(var(--status-inuse))",
  damaged: "hsl(var(--status-damaged))",
  repair: "hsl(var(--status-repair))",
  retired: "hsl(var(--status-retired))",
};
