import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { Forbidden } from "@/components/shared/forbidden";
import { QrScanner } from "@/components/inventory/qr-scanner";

export const metadata: Metadata = { title: "Scan QR label" };

export default async function ScanPage() {
  const user = await requireUser();
  if (!can(user, "inventory.view")) return <Forbidden what="the inventory" />;
  return (
    <>
      <PageHeader title="Scan a label" description="Open any component instantly from its QR label." />
      <QrScanner />
    </>
  );
}
