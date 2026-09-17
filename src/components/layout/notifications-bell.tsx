"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CalendarClock, Wrench, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Alert = { id: string; kind: "warranty" | "repair" | "damaged" | "expired"; title: string; detail: string; href: string };

const ICONS = { warranty: CalendarClock, expired: CalendarClock, repair: Wrench, damaged: AlertTriangle };
const TONES = {
  warranty: "text-status-repair",
  expired: "text-muted-foreground",
  repair: "text-status-repair",
  damaged: "text-status-damaged",
};

export function NotificationsBell() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/notifications");
        if (res.ok && !cancelled) setAlerts(((await res.json()) as { alerts: Alert[] }).alerts);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };
    load();
    const t = setInterval(load, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications (${alerts.length})`}>
          <Bell className="h-[18px] w-[18px]" />
          {alerts.length > 0 && (
            <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {alerts.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-semibold">Needs attention</p>
        </div>
        {!loaded ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Checking…</p>
        ) : alerts.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Nothing needs attention. Warranties, repairs and damaged items are all clear.</p>
        ) : (
          <ul className="max-h-96 divide-y overflow-y-auto">
            {alerts.map((a) => {
              const Icon = ICONS[a.kind];
              return (
                <li key={a.id}>
                  <Link href={a.href} className="flex gap-3 px-4 py-3 hover:bg-muted/60">
                    <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", TONES[a.kind])} />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{a.title}</span>
                      <span className="block text-xs text-muted-foreground">{a.detail}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
