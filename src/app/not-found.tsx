import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <div className="max-w-sm text-center">
        <p className="hw-id text-muted-foreground">404</p>
        <h1 className="mt-2 text-2xl font-semibold">This page doesn&apos;t exist</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The link may be old, or the record may have been moved. Search the inventory to find what you need.
        </p>
        <Button asChild className="mt-6">
          <Link href="/inventory">Open inventory</Link>
        </Button>
      </div>
    </main>
  );
}
