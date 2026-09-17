import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";

export function Forbidden({ what = "this page" }: { what?: string }) {
  return (
    <Card>
      <EmptyState
        icon={Lock}
        title={`You don't have access to ${what}`}
        description="Ask your Super Admin to grant the permission if you need it."
        action={
          <Button asChild variant="outline">
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
        }
      />
    </Card>
  );
}
