"use client";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Card>
      <EmptyState
        icon={AlertTriangle}
        title="This page couldn't load"
        description={
          error.digest
            ? `The server returned an error (reference ${error.digest}). Try again, and if it keeps happening, share the reference with your administrator.`
            : "Try again. If it keeps happening, check your connection."
        }
        action={<Button onClick={() => reset()}>Try again</Button>}
      />
    </Card>
  );
}
