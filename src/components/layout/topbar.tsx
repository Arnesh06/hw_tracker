"use client";
import { useState } from "react";
import Link from "next/link";
import { Menu, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SidebarNav } from "@/components/layout/sidebar";
import { GlobalSearch } from "@/components/layout/global-search";
import { NotificationsBell } from "@/components/layout/notifications-bell";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { useCan } from "@/components/session-provider";

export function Topbar() {
  const [open, setOpen] = useState(false);
  const canView = useCan("inventory.view");

  return (
    <header className="no-print sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:gap-3 lg:px-8">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="border-0 p-0 [&>button]:text-white">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarNav onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="min-w-0 flex-1">{canView && <GlobalSearch />}</div>

      <div className="flex items-center gap-1">
        {canView && (
          <Button variant="ghost" size="icon" asChild aria-label="Scan a QR label">
            <Link href="/inventory/scan">
              <ScanLine className="h-[18px] w-[18px]" />
            </Link>
          </Button>
        )}
        {canView && <NotificationsBell />}
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
