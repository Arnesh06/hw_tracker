"use client";
import Link from "next/link";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function QrCard({ id, hwId, name, svg, target }: { id: string; hwId: string; name: string; svg: string; target: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>QR label</CardTitle>
        <CardDescription>Scan to open this record. The code never changes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="mx-auto w-full max-w-[220px] rounded-lg border bg-white p-3 text-black">
          {/* SVG is generated server-side by the qrcode library from our own URL. */}
          <div className="[&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
          <p className="mt-1 text-center font-mono text-sm font-semibold tracking-tight">{hwId}</p>
          <p className="truncate text-center text-[11px] text-neutral-600">{name}</p>
        </div>
        <p className="break-all text-center font-mono text-[11px] text-muted-foreground">{target}</p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={`/api/qr/${id}?format=png&download=1`}>
              <Download /> PNG
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/inventory/labels?ids=${id}`}>
              <Printer /> Print label
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
