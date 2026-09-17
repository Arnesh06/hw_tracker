"use client";
import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

/** Shows a toast for ?created=1 / ?updated=1 style flags, then strips them from the URL. */
export function FlashToast({ messages }: { messages: Record<string, string> }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current) return;
    const hits = Object.keys(messages).filter((k) => params.has(k));
    if (!hits.length) return;
    shown.current = true;
    hits.forEach((k) => toast.success(messages[k]));
    const sp = new URLSearchParams(params.toString());
    hits.forEach((k) => sp.delete(k));
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [messages, params, pathname, router]);

  return null;
}
