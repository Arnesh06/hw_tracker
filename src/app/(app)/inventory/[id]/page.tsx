import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Archive, ArrowLeftRight, ChevronLeft, Download, History, Info, Paperclip, Pencil, Printer, RotateCcw, ScrollText, UserRoundCheck,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getMasterOptions, getSettings } from "@/lib/data";
import { getPeopleSuggestions } from "@/lib/suggestions";
import { qrSvg, qrTarget } from "@/lib/qr";
import { env } from "@/lib/env";
import { cn, formatCurrency, formatDate, formatDateTime, formatNumber, timeAgo, todayISO } from "@/lib/utils";
import type { AuditLog, ComponentFile, ComponentView, Movement } from "@/types/database";
import { StatusBadge } from "@/components/shared/status-badge";
import { Forbidden } from "@/components/shared/forbidden";
import { FlashToast } from "@/components/shared/flash-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MoveDialog } from "@/components/inventory/move-dialog";
import { ArchiveButton } from "@/components/inventory/archive-button";
import { FilesPanel } from "@/components/inventory/files-panel";
import { HistoryTimeline } from "@/components/inventory/history-timeline";
import { ChangeList, createdFields } from "@/components/audit/change-list";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  if (!UUID_RE.test(id)) return { title: "Component" };
  const supabase = await createClient();
  const { data } = await supabase.from("components").select("hw_id, name").eq("id", id).maybeSingle();
  return { title: data ? `${data.hw_id} ${data.name}` : "Component" };
}

export default async function ComponentPage({ params }: Props) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const user = await requireUser();
  if (!can(user, "inventory.view")) return <Forbidden what="the inventory" />;

  const supabase = await createClient();
  const { data } = await supabase.from("v_components").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const c = data as ComponentView;
  const showAudit = can(user, "audit.view");

  const [movementsRes, filesRes, auditRes, settings, options, people, svg] = await Promise.all([
    supabase.from("component_movements").select("*").eq("component_id", id).order("created_at", { ascending: false }).limit(300),
    supabase.from("component_files").select("*").eq("component_id", id).order("created_at", { ascending: false }),
    showAudit
      ? supabase
          .from("audit_logs")
          .select("*")
          .in("entity", ["components", "component_files"])
          .or(`entity_id.eq.${id},new_data->>component_id.eq.${id},old_data->>component_id.eq.${id}`)
          .order("occurred_at", { ascending: false })
          .limit(100)
      : Promise.resolve({ data: [] }),
    getSettings(),
    getMasterOptions(),
    getPeopleSuggestions(),
    qrSvg(c.hw_id),
  ]);

  const movements = (movementsRes.data as Movement[] | null) ?? [];
  const files = (filesRes.data as ComponentFile[] | null) ?? [];
  const audit = (auditRes.data as AuditLog[] | null) ?? [];

  // Short-lived preview URLs for image thumbnails.
  const imageFiles = files.filter((f) => f.kind === "image");
  const previews: Record<string, string> = {};
  if (imageFiles.length) {
    const { data: signed } = await supabase.storage
      .from(env.bucket())
      .createSignedUrls(imageFiles.map((f) => f.storage_path), 3600);
    signed?.forEach((s, i) => {
      if (s.signedUrl) previews[imageFiles[i].id] = s.signedUrl;
    });
  }

  // Id → name map so audit diffs read naturally.
  const names: Record<string, string> = {};
  for (const list of Object.values(options)) for (const o of list) names[o.id] = o.name;

  const archived = Boolean(c.archived_at);
  const canAssign = can(user, "inventory.assign") && !archived;
  const today = todayISO();
  const warrantyState = !c.warranty_expiry
    ? null
    : c.warranty_expiry < today
      ? "expired"
      : new Date(c.warranty_expiry).getTime() - Date.now() < settings.warranty_alert_days * 86400000
        ? "soon"
        : "ok";
  const moveComponentProps = {
    id: c.id,
    hw_id: c.hw_id,
    name: c.name,
    current_owner: c.current_owner,
    current_holder: c.current_holder,
    location_id: c.location_id,
    project_id: c.project_id,
    status: c.status,
  };

  return (
    <>
      <FlashToast messages={{ created: `${c.hw_id} registered`, updated: "Changes saved" }} />

      <Link href="/inventory" className="no-print mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Inventory
      </Link>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="hw-id rounded-md border bg-card px-2 py-0.5 text-sm">{c.hw_id}</span>
            <StatusBadge status={c.status} />
            {archived && (
              <Badge variant="muted">
                <Archive className="h-3 w-3" /> Archived {formatDate(c.archived_at)}
              </Badge>
            )}
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-[1.75rem]">{c.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {c.category_name}
            {[c.manufacturer, c.model].filter(Boolean).length ? `, ${[c.manufacturer, c.model].filter(Boolean).join(" ")}` : ""}
            . Last updated {timeAgo(c.updated_at)}.
          </p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          {canAssign && (
            <>
              {c.current_holder ? (
                <MoveDialog
                  component={moveComponentProps}
                  locations={options.locations}
                  projects={options.projects}
                  people={people.holders}
                  initialType="returned"
                  trigger={
                    <Button variant="outline">
                      <RotateCcw /> Return
                    </Button>
                  }
                />
              ) : (
                <MoveDialog
                  component={moveComponentProps}
                  locations={options.locations}
                  projects={options.projects}
                  people={people.holders}
                  initialType="assigned"
                  trigger={
                    <Button variant="outline">
                      <UserRoundCheck /> Assign
                    </Button>
                  }
                />
              )}
              <MoveDialog
                component={moveComponentProps}
                locations={options.locations}
                projects={options.projects}
                people={people.holders}
                initialType="transferred"
                trigger={
                  <Button variant="outline">
                    <ArrowLeftRight /> Move or transfer
                  </Button>
                }
              />
            </>
          )}
          {can(user, "inventory.edit") && !archived && (
            <Button asChild>
              <Link href={`/inventory/${c.id}/edit`}>
                <Pencil /> Edit
              </Link>
            </Button>
          )}
          {can(user, "inventory.archive") && <ArchiveButton id={c.id} hwId={c.hw_id} archived={archived} />}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <Tabs defaultValue="overview">
            <TabsList className="no-print mb-5 w-full justify-start">
              <TabsTrigger value="overview">
                <Info /> Overview
              </TabsTrigger>
              <TabsTrigger value="history">
                <History /> History <span className="tabular text-xs text-muted-foreground">{movements.length}</span>
              </TabsTrigger>
              <TabsTrigger value="files">
                <Paperclip /> Files <span className="tabular text-xs text-muted-foreground">{files.length}</span>
              </TabsTrigger>
              {showAudit && (
                <TabsTrigger value="audit">
                  <ScrollText /> Audit
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="overview" className="space-y-5">
              <DetailCard
                title="Essentials"
                rows={[
                  ["Quantity", <span key="q" className="tabular">{formatNumber(c.quantity)}</span>],
                  ["Category", c.category_name],
                  ["Given by / source", <Link key="p" className="hover:underline" href={`/inventory?provider=${c.provider_id}`}>{c.provider_name}</Link>],
                  ["Current owner", c.current_owner],
                  ["Received", formatDate(c.received_date)],
                  ["Status", <StatusBadge key="s" status={c.status} />],
                ]}
              />
              <DetailCard
                title="Assignment"
                rows={[
                  ["Current holder", c.current_holder],
                  ["Location", c.location_id ? <Link key="l" className="hover:underline" href={`/inventory?location=${c.location_id}`}>{c.location_name}</Link> : null],
                  [
                    "Project",
                    c.project_id ? (
                      <Link key="pr" className="hover:underline" href={`/inventory?project=${c.project_id}`}>
                        {c.project_name}
                        {c.project_code ? <span className="ml-1 text-muted-foreground">({c.project_code})</span> : null}
                      </Link>
                    ) : null,
                  ],
                ]}
              />
              <DetailCard
                title="Identification"
                rows={[
                  ["Manufacturer", c.manufacturer],
                  ["Model", c.model],
                  ["Part number", c.part_number ? <span key="pn" className="font-mono text-[0.8rem]">{c.part_number}</span> : null],
                  ["Serial number", c.serial_number ? <span key="sn" className="font-mono text-[0.8rem]">{c.serial_number}</span> : null],
                ]}
              />
              <DetailCard
                title="Purchase and warranty"
                rows={[
                  ["Vendor", c.vendor_id ? <Link key="v" className="hover:underline" href={`/inventory?vendor=${c.vendor_id}`}>{c.vendor_name}</Link> : null],
                  ["Purchase date", c.purchase_date ? formatDate(c.purchase_date) : null],
                  ["Unit cost", c.unit_cost !== null ? <span key="uc" className="tabular">{formatCurrency(c.unit_cost, settings.currency)}</span> : null],
                  ["Total value", c.unit_cost !== null ? <span key="tv" className="tabular font-medium">{formatCurrency(c.total_value, settings.currency)}</span> : null],
                  ["Invoice number", c.invoice_number],
                  [
                    "Warranty until",
                    c.warranty_expiry ? (
                      <span
                        key="w"
                        className={cn(
                          warrantyState === "expired" && "text-muted-foreground line-through",
                          warrantyState === "soon" && "font-medium text-status-repair",
                        )}
                      >
                        {formatDate(c.warranty_expiry)}
                        {warrantyState === "expired" ? " (expired)" : warrantyState === "soon" ? " (ending soon)" : ""}
                      </span>
                    ) : null,
                  ],
                ]}
              />
              {(c.description || c.specifications || c.notes) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Description and notes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    {c.description && <TextBlock label="Description">{c.description}</TextBlock>}
                    {c.specifications && (
                      <TextBlock label="Specifications" mono>
                        {c.specifications}
                      </TextBlock>
                    )}
                    {c.notes && <TextBlock label="Notes">{c.notes}</TextBlock>}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>Ownership and movement history</CardTitle>
                  <CardDescription>Every assignment, transfer, relocation and status change. This history cannot be edited.</CardDescription>
                </CardHeader>
                <CardContent>
                  <HistoryTimeline movements={movements} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="files">
              <Card>
                <CardHeader>
                  <CardTitle>Files</CardTitle>
                  <CardDescription>Stored privately in Supabase Storage. Links expire after a short time.</CardDescription>
                </CardHeader>
                <CardContent>
                  <FilesPanel componentId={c.id} files={files} previews={previews} archived={archived} />
                </CardContent>
              </Card>
            </TabsContent>

            {showAudit && (
              <TabsContent value="audit">
                <Card>
                  <CardHeader>
                    <CardTitle>Audit trail</CardTitle>
                    <CardDescription>Field-level changes to this record and its files.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {audit.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No audit entries.</p>
                    ) : (
                      <ol className="space-y-5">
                        {audit.map((a) => {
                          const fields = a.action === "INSERT" ? createdFields(a.new_data) : a.action === "DELETE" ? createdFields(a.old_data) : (a.changed_fields ?? []);
                          return (
                            <li key={a.id} className="space-y-2">
                              <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                                <p>
                                  <span className="font-medium">{auditVerb(a)}</span>{" "}
                                  <span className="text-muted-foreground">by {a.actor_email ?? "system"}</span>
                                </p>
                                <time className="text-xs text-muted-foreground" dateTime={a.occurred_at}>
                                  {formatDateTime(a.occurred_at)}
                                </time>
                              </div>
                              {a.action !== "DELETE" && (
                                <ChangeList
                                  fields={fields}
                                  oldData={a.action === "INSERT" ? null : a.old_data}
                                  newData={a.new_data}
                                  names={names}
                                />
                              )}
                            </li>
                          );
                        })}
                      </ol>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>

        <aside className="space-y-5">
          <Card className="print-area">
            <CardHeader>
              <CardTitle>QR label</CardTitle>
              <CardDescription>Scan to open this component. The code never changes.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mx-auto max-w-[220px] rounded-lg border bg-white p-3">
                <div className="[&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
                <p className="mt-1 text-center font-mono text-sm font-semibold text-black">{c.hw_id}</p>
              </div>
              <p className="mt-3 break-all text-center text-xs text-muted-foreground">{qrTarget(c.hw_id)}</p>
              <div className="no-print mt-4 grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={`/api/qr/${c.id}?format=png&download=1`}>
                    <Download /> PNG
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={`/api/qr/${c.id}?format=svg&download=1`}>
                    <Download /> SVG
                  </a>
                </Button>
                <Button variant="secondary" size="sm" asChild className="col-span-2">
                  <Link href={`/inventory/labels?ids=${c.id}`}>
                    <Printer /> Print label
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Record</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Meta label="Created" value={formatDateTime(c.created_at)} />
              <Meta label="Last updated" value={formatDateTime(c.updated_at)} />
              <Meta label="Movements" value={formatNumber(movements.length)} />
              <Meta label="Files" value={formatNumber(files.length)} />
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}

function auditVerb(a: AuditLog) {
  const target = a.entity === "component_files" ? `file ${a.entity_label ?? ""}`.trim() : "record";
  if (a.action === "INSERT") return a.entity === "component_files" ? `Uploaded ${target}` : "Created record";
  if (a.action === "DELETE") return `Deleted ${target}`;
  if (a.changed_fields?.includes("archived_at")) return a.new_data?.archived_at ? "Archived record" : "Restored record";
  return `Updated ${target}`;
}

function DetailCard({ title, rows }: { title: string; rows: [string, React.ReactNode][] }) {
  const filled = rows.filter(([, v]) => v !== null && v !== undefined && v !== "");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {filled.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing recorded.</p>
        ) : (
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            {filled.map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-0.5 break-words text-sm">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

function TextBlock({ label, mono, children }: { label: string; mono?: boolean; children: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-1 whitespace-pre-wrap break-words", mono && "font-mono text-[0.8rem]")}>{children}</p>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular text-right">{value}</span>
    </div>
  );
}
