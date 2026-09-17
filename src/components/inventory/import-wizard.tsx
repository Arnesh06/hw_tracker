"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, FileSpreadsheet, FileUp, Loader2, PlusCircle, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCan } from "@/components/session-provider";
import { cn, formatBytes, formatNumber } from "@/lib/utils";

type Issue = { row: number; name: string; errors: string[]; willCreate: string[] };
type Result = { total: number; valid: number; inserted: number; committed: boolean; issues: Issue[] };

export function ImportWizard({ fields }: { fields: { header: string; required: boolean; aliases: string[] }[] }) {
  const canCreateRefs = useCan("masters.manage");
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [autoCreate, setAutoCreate] = useState(false);
  const [busy, setBusy] = useState<"preview" | "commit" | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = async (mode: "preview" | "commit") => {
    if (!file) return;
    setBusy(mode);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("mode", mode);
      fd.set("autoCreate", String(autoCreate));
      const res = await fetch("/api/import", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Import failed.");
        setResult(null);
        return;
      }
      setResult(json as Result);
      if (mode === "commit") toast.success(`Imported ${formatNumber(json.inserted)} components`);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  };

  const choose = (f: File | null) => {
    setFile(f);
    setResult(null);
    setError(null);
  };

  const errorRows = result?.issues.filter((i) => i.errors.length) ?? [];
  const createRows = result?.issues.filter((i) => !i.errors.length && i.willCreate.length) ?? [];
  const newRefs = Array.from(new Set(createRows.flatMap((r) => r.willCreate)));

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>1. Choose a file</CardTitle>
            <CardDescription>CSV or Excel (.xlsx), first sheet only, up to 5,000 rows. The first row must contain column headers.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                choose(e.dataTransfer.files[0] ?? null);
              }}
              className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center transition-colors hover:border-primary/50 hover:bg-accent/40"
            >
              {file ? <FileSpreadsheet className="h-8 w-8 text-primary" /> : <FileUp className="h-8 w-8 text-muted-foreground" />}
              <span className="text-sm font-medium">{file ? file.name : "Click or drop a file here"}</span>
              <span className="text-xs text-muted-foreground">{file ? formatBytes(file.size) : ".csv or .xlsx"}</span>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              onChange={(e) => choose(e.target.files?.[0] ?? null)}
            />
            <div className="flex items-start gap-3 rounded-md border p-3">
              <Switch id="auto-create" checked={autoCreate} onCheckedChange={setAutoCreate} disabled={!canCreateRefs} />
              <div>
                <Label htmlFor="auto-create">Create missing reference data</Label>
                <p className="text-xs text-muted-foreground">
                  {canCreateRefs
                    ? "Unknown categories, sources, vendors, locations and projects are added automatically. Otherwise those rows are skipped."
                    : "You need the reference-data permission for this. Rows with unknown names are skipped."}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => send("preview")} disabled={!file || !!busy}>
                {busy === "preview" && <Loader2 className="animate-spin" />} Check file
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div role="alert" className="flex gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
            <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
            <p>{error}</p>
          </div>
        )}

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>{result.committed ? "3. Done" : "2. Review"}</CardTitle>
              <CardDescription>
                {result.committed
                  ? `${formatNumber(result.inserted)} of ${formatNumber(result.total)} rows were imported. Each got a new HW ID and a “Registered” history entry.`
                  : "Nothing has been saved yet."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-3 gap-3">
                <Stat label="Rows in file" value={result.total} />
                <Stat label={result.committed ? "Imported" : "Ready to import"} value={result.committed ? result.inserted : result.valid} tone="text-status-available" />
                <Stat label="With problems" value={errorRows.length} tone={errorRows.length ? "text-status-damaged" : undefined} />
              </div>

              {newRefs.length > 0 && !result.committed && (
                <div className="rounded-md border bg-accent/40 p-3 text-sm">
                  <p className="flex items-center gap-2 font-medium">
                    <PlusCircle className="h-4 w-4 text-primary" /> {newRefs.length} new reference {newRefs.length === 1 ? "record" : "records"} will be created
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{newRefs.slice(0, 20).join(", ")}{newRefs.length > 20 ? "…" : ""}</p>
                </div>
              )}

              {errorRows.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Rows that will be skipped</p>
                  <div className="max-h-96 overflow-auto rounded-md border">
                    <Table>
                      <TableHeader className="sticky top-0 bg-card">
                        <TableRow>
                          <TableHead className="w-16">Row</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Problems</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {errorRows.map((r) => (
                          <TableRow key={r.row}>
                            <TableCell className="tabular">{r.row}</TableCell>
                            <TableCell className="max-w-[12rem] truncate">{r.name || <span className="text-muted-foreground">—</span>}</TableCell>
                            <TableCell>
                              <ul className="list-inside list-disc text-xs text-destructive">
                                {r.errors.map((e) => (
                                  <li key={e}>{e}</li>
                                ))}
                              </ul>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {result.issues.length >= 500 && <p className="text-xs text-muted-foreground">Showing the first 500 problem rows.</p>}
                </div>
              )}

              {result.committed ? (
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="outline" onClick={() => choose(null)}>
                    Import another file
                  </Button>
                  <Button asChild>
                    <Link href="/inventory?sort=hw_id&dir=desc">
                      <CheckCircle2 /> View inventory
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-end gap-3">
                  {errorRows.length > 0 && <p className="text-xs text-muted-foreground">Fix the file and check it again, or import only the valid rows.</p>}
                  <Button onClick={() => send("commit")} disabled={!result.valid || !!busy}>
                    {busy === "commit" ? <Loader2 className="animate-spin" /> : <Upload />}
                    Import {formatNumber(result.valid)} {result.valid === 1 ? "row" : "rows"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <aside className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Template</CardTitle>
            <CardDescription>Start from the template to get the headers right.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href="/api/import/template?format=xlsx">Excel</a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="/api/import/template?format=csv">CSV</a>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recognised columns</CardTitle>
            <CardDescription>Header names are matched loosely, so “Qty” or “Serial No” work too.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-sm">
              {fields.map((f) => (
                <li key={f.header} className="flex items-baseline justify-between gap-3">
                  <span className={cn(f.required && "font-medium")}>
                    {f.header}
                    {f.required && <span className="text-destructive"> *</span>}
                  </span>
                  {f.aliases.length > 0 && (
                    <span className="truncate text-right text-xs text-muted-foreground" title={f.aliases.join(", ")}>
                      {f.aliases.slice(0, 2).join(", ")}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              Dates can be YYYY-MM-DD, DD/MM/YYYY or Excel dates. Status defaults to Available when blank.
            </p>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("tabular mt-1 text-2xl font-semibold", tone)}>{formatNumber(value)}</p>
    </div>
  );
}
