import { Ban } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Account disabled" };

export default function DisabledPage() {
  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <div className="max-w-sm text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg border bg-muted">
          <Ban className="h-5 w-5 text-destructive" />
        </div>
        <h1 className="mt-4 text-xl font-semibold">This account is disabled</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your administrator has turned off access for this account. Contact them if you think this is a mistake.
        </p>
        <form action={signOut} className="mt-6">
          <Button type="submit" variant="outline">
            Sign out
          </Button>
        </form>
      </div>
    </main>
  );
}
