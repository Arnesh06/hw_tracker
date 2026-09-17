"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, CameraOff, ImageUp, Keyboard, Loader2, SwitchCamera } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Scanner = {
  start: (camera: { facingMode: string } | string, config: object, onSuccess: (text: string) => void, onError: () => void) => Promise<unknown>;
  stop: () => Promise<void>;
  clear: () => void;
  scanFile: (file: File, showImage?: boolean) => Promise<string>;
  isScanning: boolean;
};

const READER_ID = "hw-qr-reader";
const FILE_READER_ID = "hw-qr-file-reader";

/** Extracts an HW-ID from a scanned label (URL or raw text). */
export function extractHwId(text: string): string | null {
  const m = text.match(/HW-?(\d{1,9})/i);
  if (!m) return null;
  return `HW-${m[1].padStart(6, "0")}`;
}

export function QrScanner() {
  const router = useRouter();
  const scannerRef = useRef<Scanner | null>(null);
  const handled = useRef(false);
  const [state, setState] = useState<"idle" | "starting" | "scanning" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [manual, setManual] = useState("");

  const open = useCallback(
    (text: string) => {
      const hwId = extractHwId(text);
      if (!hwId) {
        toast.error("That code isn't an HW-Track label.");
        return false;
      }
      handled.current = true;
      toast.success(`Found ${hwId}`);
      router.push(`/c/${hwId}`);
      return true;
    },
    [router],
  );

  const stop = useCallback(async () => {
    const s = scannerRef.current;
    if (s?.isScanning) {
      try {
        await s.stop();
        s.clear();
      } catch {
        /* already stopped */
      }
    }
    setState("idle");
  }, []);

  const start = useCallback(
    async (mode: "environment" | "user") => {
      setError(null);
      setState("starting");
      handled.current = false;
      try {
        if (!window.isSecureContext) throw new Error("The camera only works over HTTPS (or on localhost).");
        const { Html5Qrcode } = await import("html5-qrcode");
        if (scannerRef.current?.isScanning) await scannerRef.current.stop();
        const scanner = new Html5Qrcode(READER_ID, { verbose: false }) as unknown as Scanner;
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: mode },
          { fps: 10, qrbox: (w: number, h: number) => { const s = Math.floor(Math.min(w, h) * 0.7); return { width: s, height: s }; }, aspectRatio: 1 },
          (text) => {
            if (handled.current) return;
            if (open(text)) void stop();
          },
          () => undefined,
        );
        setState("scanning");
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(
          /permission|notallowed/i.test(msg)
            ? "Camera access was blocked. Allow camera access in your browser settings, or upload a photo of the label instead."
            : /notfound|no camera|requested device/i.test(msg)
              ? "No camera was found on this device. Upload a photo of the label or type the ID instead."
              : msg,
        );
        setState("error");
      }
    },
    [open, stop],
  );

  useEffect(() => {
    return () => {
      void stop();
    };
  }, [stop]);

  const scanImage = async (file: File) => {
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const reader = new Html5Qrcode(FILE_READER_ID, { verbose: false }) as unknown as Scanner;
      const text = await reader.scanFile(file, false);
      reader.clear();
      open(text);
    } catch {
      toast.error("No QR code found in that image. Try a sharper, closer photo.");
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="relative aspect-square max-h-[70vh] w-full bg-sidebar sm:aspect-video">
            <div id={READER_ID} className="h-full w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover" />
            {state !== "scanning" && (
              <div className="absolute inset-0 grid place-items-center p-6 text-center text-sidebar-foreground">
                <div className="max-w-sm space-y-4">
                  {state === "starting" ? (
                    <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                  ) : (
                    <Camera className="mx-auto h-10 w-10 text-sidebar-active" />
                  )}
                  <p className="text-sm text-sidebar-muted">
                    {error ?? "Point your camera at an HW-Track label. The component opens as soon as the code is read."}
                  </p>
                  {state !== "starting" && (
                    <Button onClick={() => start(facing)} className="bg-sidebar-active text-sidebar hover:bg-sidebar-active/90">
                      <Camera /> {state === "error" ? "Try again" : "Start camera"}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
          {state === "scanning" && (
            <div className="flex items-center justify-between gap-2 border-t p-3">
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="h-2 w-2 animate-pulse rounded-full bg-status-available" /> Scanning…
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const next = facing === "environment" ? "user" : "environment";
                    setFacing(next);
                    await start(next);
                  }}
                >
                  <SwitchCamera /> Flip
                </Button>
                <Button variant="outline" size="sm" onClick={stop}>
                  <CameraOff /> Stop
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageUp className="h-4 w-4" /> From a photo
            </CardTitle>
            <CardDescription>Upload a picture of the label if the camera isn&apos;t available.</CardDescription>
          </CardHeader>
          <CardContent>
            <Input type="file" accept="image/*" capture="environment" onChange={(e) => e.target.files?.[0] && scanImage(e.target.files[0])} />
            <div id={FILE_READER_ID} className="hidden" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Keyboard className="h-4 w-4" /> Type the ID
            </CardTitle>
            <CardDescription>The number printed under the code works too.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (manual.trim()) open(/^\d+$/.test(manual.trim()) ? `HW-${manual.trim()}` : manual);
              }}
            >
              <Label htmlFor="manual-id" className="sr-only">
                HW ID
              </Label>
              <Input id="manual-id" value={manual} onChange={(e) => setManual(e.target.value)} placeholder="HW-000123" className="font-mono" />
              <Button type="submit" variant="secondary">
                Open
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
