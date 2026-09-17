import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getMasterOptions } from "@/lib/data";
import { getPeopleSuggestions } from "@/lib/suggestions";
import { updateComponent } from "@/lib/actions/components";
import { PageHeader } from "@/components/shared/page-header";
import { Forbidden } from "@/components/shared/forbidden";
import { ComponentForm } from "@/components/inventory/component-form";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Archive } from "lucide-react";
import type { Component } from "@/types/database";

export const metadata: Metadata = { title: "Edit component" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditComponentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const user = await requireUser();
  if (!can(user, "inventory.edit")) return <Forbidden what="editing components" />;

  const supabase = await createClient();
  const { data } = await supabase.from("components").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const component = data as Component;
  const [options, suggestions] = await Promise.all([getMasterOptions(), getPeopleSuggestions()]);

  return (
    <>
      <PageHeader title={`Edit ${component.name}`} description="Changes are recorded in the audit log with before and after values.">
        <Link href={`/inventory/${id}`} className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> <span className="hw-id">{component.hw_id}</span>
        </Link>
      </PageHeader>
      {component.archived_at ? (
        <Card>
          <EmptyState
            icon={Archive}
            title="This component is archived"
            description="Archived records are read-only. Restore it from the detail page to make changes."
            action={
              <Button asChild variant="outline">
                <Link href={`/inventory/${id}`}>Back to component</Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <ComponentForm
          action={updateComponent.bind(null, id)}
          options={options}
          component={component}
          suggestions={suggestions}
          cancelHref={`/inventory/${id}`}
        />
      )}
    </>
  );
}
