"use client";
import { Archive, ArchiveRestore } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { setComponentArchived } from "@/lib/actions/components";

export function ArchiveButton({ id, hwId, archived }: { id: string; hwId: string; archived: boolean }) {
  return (
    <ConfirmButton
      trigger={
        <Button variant="outline">
          {archived ? <ArchiveRestore /> : <Archive />} {archived ? "Restore" : "Archive"}
        </Button>
      }
      title={archived ? `Restore ${hwId}?` : `Archive ${hwId}?`}
      description={
        archived
          ? "The component becomes active again and can be edited, assigned and counted in totals."
          : "Archived components are hidden from totals and become read-only. Nothing is deleted; history and files are kept, and you can restore it later."
      }
      confirmLabel={archived ? "Restore" : "Archive"}
      destructive={!archived}
      withReason
      onConfirm={async (reason) => {
        const res = await setComponentArchived(id, !archived, reason);
        if (res.ok) toast.success(res.message);
        else toast.error(res.error);
        return res.ok;
      }}
    />
  );
}
