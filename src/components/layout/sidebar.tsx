"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { can } from "@/lib/permissions";
import { useSession } from "@/components/session-provider";
import { NAV_SECTIONS } from "@/components/layout/nav-items";
import { Logo } from "@/components/layout/logo";

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user, orgName } = useSession();

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center px-5">
        <Link href="/dashboard" onClick={onNavigate} className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-active">
          <Logo />
        </Link>
      </div>
      {orgName && orgName !== "HW-Track" && (
        <p className="-mt-3 truncate px-5 pb-3 text-xs text-sidebar-muted">{orgName}</p>
      )}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2" aria-label="Main">
        {NAV_SECTIONS.map((section) => {
          const items = section.items.filter((item) =>
            item.superAdminOnly ? user.role === "super_admin" : !item.permission || can(user, item.permission),
          );
          if (!items.length) return null;
          return (
            <div key={section.label}>
              <p className="px-2 pb-1.5 text-xs font-medium text-sidebar-muted">{section.label}</p>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-active",
                          active
                            ? "bg-white/[0.07] font-medium text-white"
                            : "text-sidebar-foreground/75 hover:bg-white/[0.04] hover:text-white",
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "absolute -left-3 top-1.5 h-[calc(100%-12px)] w-[3px] rounded-r-full bg-sidebar-active transition-opacity",
                            active ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <Icon className={cn("h-4 w-4", active ? "text-sidebar-active" : "text-sidebar-muted group-hover:text-sidebar-foreground")} />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
      <div className="border-t border-white/10 px-5 py-4 text-xs text-sidebar-muted">
        Signed in as <span className="block truncate text-sidebar-foreground">{user.email}</span>
      </div>
    </div>
  );
}
