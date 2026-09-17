"use client";
import { createContext, useContext } from "react";
import { can, type Permission, type SessionUser } from "@/lib/permissions";

type Ctx = { user: SessionUser; orgName: string; currency: string };
const SessionContext = createContext<Ctx | null>(null);

export function SessionProvider({ value, children }: { value: Ctx; children: React.ReactNode }) {
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}

/** UI convenience only — the server and database enforce permissions independently. */
export function useCan(permission: Permission) {
  const { user } = useSession();
  return can(user, permission);
}
