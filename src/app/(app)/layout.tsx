import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { SessionProvider } from "@/components/session-provider";
import { SidebarNav } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const settings = await getSettings();

  return (
    <SessionProvider value={{ user, orgName: settings.org_name, currency: settings.currency }}>
      <div className="min-h-dvh lg:pl-60 print:pl-0">
        <aside className="no-print fixed inset-y-0 left-0 z-40 hidden w-60 lg:block">
          <SidebarNav />
        </aside>
        <Topbar />
        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8 print:max-w-none print:p-0">{children}</main>
      </div>
    </SessionProvider>
  );
}
