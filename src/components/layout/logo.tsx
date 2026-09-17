import { cn } from "@/lib/utils";

export function Logo({ className, withText = true }: { className?: string; withText?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 32 32" className="h-7 w-7 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="7" className="fill-primary" />
        <rect x="9" y="9" width="14" height="14" rx="2" fill="none" stroke="white" strokeWidth="2" />
        <path
          d="M12 5v4M16 5v4M20 5v4M12 23v4M16 23v4M20 23v4M5 12h4M5 16h4M5 20h4M23 12h4M23 16h4M23 20h4"
          stroke="white"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <circle cx="13" cy="13" r="1.3" fill="white" />
      </svg>
      {withText && <span className="text-[1.05rem] font-semibold tracking-tight">HW-Track</span>}
    </span>
  );
}
