"use client";
import { useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { saveMaster } from "@/lib/actions/masters";
import type { MasterEntity } from "@/lib/validations";
import type { Option } from "@/types/database";

const NOUN: Record<MasterEntity, string> = {
  categories: "category",
  projects: "project",
  providers: "source",
  vendors: "vendor",
  locations: "location",
};

/** Small "+" button next to a select that creates a reference record in place. */
export function QuickAdd({ entity, onCreated }: { entity: MasterEntity; onCreated: (o: Option) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const noun = NOUN[entity];

  const submit = () =>
    start(async () => {
      setError(null);
      const res = await saveMaster(entity, null, { name });
      if (!res.ok) {
        setError(res.fieldErrors?.name?.[0] ?? res.error);
        return;
      }
      if (res.data) onCreated({ id: res.data.id, name: res.data.name, is_active: true });
      toast.success(`Added ${noun} “${res.data?.name}”`);
      setName("");
      setOpen(false);
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="icon" className="shrink-0" aria-label={`Add a new ${noun}`}>
          <Plus />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New {noun}</DialogTitle>
          <DialogDescription>You can add more details later from its own page.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor={`quick-${entity}`}>Name</Label>
          <Input
            id={`quick-${entity}`}
            value={name}
            autoFocus
            maxLength={200}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            aria-invalid={!!error || undefined}
          />
          {error && <p className="text-xs font-medium text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={pending || !name.trim()}>
            {pending && <Loader2 className="animate-spin" />} Add {noun}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
