import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { IMPORT_FIELDS } from "@/lib/import";
import { PageHeader } from "@/components/shared/page-header";
import { Forbidden } from "@/components/shared/forbidden";
import { ImportWizard } from "@/components/inventory/import-wizard";

export const metadata: Metadata = { title: "Import components" };

export default async function ImportPage() {
  const user = await requireUser();
  if (!can(user, "inventory.import")) return <Forbidden what="importing data" />;
  const fields = IMPORT_FIELDS.map((f) => ({ header: f.header, required: f.required, aliases: f.aliases }));
  return (
    <>
      <PageHeader title="Import components" description="Bring in an existing spreadsheet. The file is checked first; nothing is saved until you confirm.">
        <Link href="/inventory" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Inventory
        </Link>
      </PageHeader>
      <ImportWizard fields={fields} />
    </>
  );
}
