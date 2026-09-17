import "server-only";
import { NextResponse } from "next/server";
import { AuthzError } from "@/lib/auth";

/** Consistent JSON error responses for route handlers. */
export function apiError(e: unknown) {
  if (e instanceof AuthzError) {
    const status = e.message.includes("session") ? 401 : 403;
    return NextResponse.json({ error: e.message }, { status });
  }
  const message = e instanceof Error ? e.message : "Something went wrong.";
  console.error(e);
  return NextResponse.json({ error: message }, { status: 500 });
}

export function attachmentName(base: string, ext: string) {
  const stamp = new Date().toISOString().slice(0, 10);
  return `${base}-${stamp}.${ext}`;
}

export const NO_STORE = { "Cache-Control": "private, no-store" } as const;
