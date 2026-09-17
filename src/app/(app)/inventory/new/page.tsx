import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getMasterOptions } from "@/lib/data";
import { getPeopleSuggestions } from "@/lib/suggestions";
import { createComponent } from "@/lib/actions/components";
import { PageHeader } from "@/components/shared/page-header";
import { Forbidden } from "@/components/shared/forbidden";
import { ComponentForm } from "@/components/inventory/component-form";

export const metadata: Metadata = { title: "Add component" };

export default async function NewComponentPage() {
  const user = await requireUser();
  if (!can(user, "inventory.create")) return <Forbidden what="adding components" />;
  const [options, suggestions] = await Promise.all([getMasterOptions(), getPeopleSuggestions()]);

  return (
    <>
      <PageHeader title="Add component" description="Only the essentials are required. Add the rest now or later.">
        <BackLink href="/inventory" label="Inventory" />
      </PageHeader>
      <ComponentForm action={createComponent} options={options} suggestions={suggestions} cancelHref="/inventory" />
    </>
  );
}

function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ChevronLeft className="h-4 w-4" /> {label}
    </Link>
  );
}
