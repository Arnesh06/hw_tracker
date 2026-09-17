"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, FileText, ImageIcon, Loader2, Paperclip, Receipt, Trash2, UploadCloud, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { EmptyState } from "@/components/shared/empty-state";
import { useCan } from "@/components/session-provider";
import { getBrowserClient } from "@/lib/supabase/client";
import { deleteFile, registerFile } from "@/lib/actions/components";
import { FILE_KINDS, MAX_UPLOAD_BYTES, type FileKind } from "@/lib/constants";
import { cn, formatBytes, formatDateTime } from "@/lib/utils";
import type { ComponentFile } from "@/types/database";

const BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET || "hw-files";
const ACCEPT =
  "image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain,text/csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip";
const KIND_ICON = { image: ImageIcon, invoice: Receipt, datasheet: FileSpreadsheet, document: FileText } as const;

function guessKind(file: File): FileKind {
  if (file.type.startsWith("image/")) return "image";
  if (/invoice|bill|receipt/i.test(file.name)) return "invoice";
  if (/datasheet|spec/i.test(file.name)) return "datasheet";
  return "document";
}

function safeName(name: string) {
  const dot = name.lastIndexOf(".");
  const base = (dot > 0 ? name.slice(0, dot) : name).normalize("NFKD").replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").slice(0, 80);
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) : "";
  return `${base || "file"}${ext ? `.${ext}` : ""}`;
}

export function FilesPanel({
  componentId,
  files,
  previews,
  archived,
}: {
  componentId: string;
  files: ComponentFile[];
  previews: Record<string, string>;
  archived: boolean;
}) {
  const router = useRouter();
  const canUpload = useCan("files.upload") && !archived;
  const canDelete = useCan("files.delete");
  const inputRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<FileKind | "auto">("auto");
  const [progress, setProgress] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [, startRefresh] = useTransition();

  const upload = async (list: FileList | File[]) => {
    const all = Array.from(list);
    if (!all.length) return;
    const supabase = getBrowserClient();
    let done = 0;
    for (const file of all) {
      if (file.size > MAX_UPLOAD_BYTES) {
        toast.error(`${file.name} is larger than ${formatBytes(MAX_UPLOAD_BYTES)}`);
        continue;
      }
      setProgress(`Uploading ${file.name}…`);
      const path = `components/${componentId}/${crypto.randomUUID()}-${safeName(file.name)}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
      if (error) {
        toast.error(`${file.name}: ${error.message}`);
        continue;
      }
      const res = await registerFile({
        componentId,
        kind: kind === "auto" ? guessKind(file) : kind,
        path,
        fileName: file.name.slice(0, 255),
        mimeType: file.type || null,
        size: file.size,
      });
      if (!res.ok) toast.error(`${file.name}: ${res.error}`);
      else done++;
    }
    setProgress(null);
    if (inputRef.current) inputRef.current.value = "";
    if (done) {
      toast.success(done === 1 ? "File uploaded" : `${done} files uploaded`);
      startRefresh(() => router.refresh());
    }
  };

  const images = files.filter((f) => f.kind === "image" && previews[f.id]);

  return (
    <div className="space-y-5">
      {canUpload && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (!progress) upload(e.dataTransfer.files);
          }}
          className={cn(
            "flex flex-col items-center gap-3 rounded-lg border border-dashed p-6 text-center transition-colors sm:flex-row sm:text-left",
            dragging && "border-primary bg-accent/50",
          )}
        >
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
            {progress ? <Loader2 className="h-5 w-5 animate-spin" /> : <UploadCloud className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{progress ?? "Drop photos, invoices, datasheets or documents"}</p>
            <p className="text-xs text-muted-foreground">Images, PDF, Office files, CSV or ZIP, up to {formatBytes(MAX_UPLOAD_BYTES)} each.</p>
          </div>
          <div className="flex gap-2">
            <Select value={kind} onValueChange={(v) => setKind(v as FileKind | "auto")}>
              <SelectTrigger className="w-36" aria-label="File type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Detect type</SelectItem>
                {FILE_KINDS.map((k) => (
                  <SelectItem key={k.value} value={k.value}>
                    {k.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" onClick={() => inputRef.current?.click()} disabled={!!progress}>
              <Paperclip /> Choose files
            </Button>
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT}
            className="sr-only"
            onChange={(e) => e.target.files && upload(e.target.files)}
          />
        </div>
      )}

      {files.length === 0 ? (
        <EmptyState icon={Paperclip} title="No files attached" description="Photos, invoices and datasheets you upload appear here." className="py-8" />
      ) : (
        <>
          {images.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {images.map((f) => (
                <a
                  key={f.id}
                  href={`/api/files/${f.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative aspect-[4/3] overflow-hidden rounded-lg border bg-muted"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previews[f.id]} alt={f.file_name} className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]" loading="lazy" />
                </a>
              ))}
            </div>
          )}
          <ul className="divide-y rounded-lg border">
            {files.map((f) => {
              const Icon = KIND_ICON[f.kind] ?? FileText;
              return (
                <li key={f.id} className="flex items-center gap-3 px-4 py-3">
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <a href={`/api/files/${f.id}`} target="_blank" rel="noreferrer" className="block truncate text-sm font-medium hover:underline">
                      {f.file_name}
                    </a>
                    <p className="text-xs text-muted-foreground">
                      {FILE_KINDS.find((k) => k.value === f.kind)?.label}, {formatBytes(f.size_bytes)}, added {formatDateTime(f.created_at)}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" asChild aria-label={`Download ${f.file_name}`}>
                    <a href={`/api/files/${f.id}?download=1`}>
                      <Download />
                    </a>
                  </Button>
                  {canDelete && (
                    <ConfirmButton
                      trigger={
                        <Button variant="ghost" size="icon" aria-label={`Delete ${f.file_name}`} className="text-muted-foreground hover:text-destructive">
                          <Trash2 />
                        </Button>
                      }
                      title="Delete this file?"
                      description={`${f.file_name} will be removed from storage. The deletion is recorded in the audit log.`}
                      confirmLabel="Delete file"
                      destructive
                      onConfirm={async () => {
                        const res = await deleteFile(f.id);
                        if (res.ok) {
                          toast.success(res.message);
                          startRefresh(() => router.refresh());
                        } else toast.error(res.error);
                        return res.ok;
                      }}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
