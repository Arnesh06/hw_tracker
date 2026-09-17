import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, type AppRole, type Permission, type SessionUser } from "@/lib/permissions";

export class AuthzError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "AuthzError";
  }
}

/** Current user + effective permissions, resolved from the database. Cached per request. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: perms }] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, role, is_active").eq("id", user.id).maybeSingle(),
    supabase.rpc("get_my_permissions"),
  ]);
  if (!profile) return null;

  return {
    id: profile.id as string,
    email: profile.email as string,
    fullName: (profile.full_name as string | null) ?? null,
    role: profile.role as AppRole,
    isActive: Boolean(profile.is_active),
    permissions: ((perms as string[] | null) ?? []) as Permission[],
  };
});

/** For pages/layouts: redirects when signed out or disabled. */
export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.isActive) redirect("/disabled");
  return user;
}

/** For server actions & route handlers: throws AuthzError. */
export async function authorize(permission?: Permission) {
  const user = await getSessionUser();
  if (!user) throw new AuthzError("Your session has expired. Sign in again.");
  if (!user.isActive) throw new AuthzError("Your account is disabled.");
  if (permission && !can(user, permission)) throw new AuthzError();
  return user;
}

export async function authorizeSuperAdmin() {
  const user = await authorize();
  if (user.role !== "super_admin") throw new AuthzError("Only the Super Admin can manage users.");
  return user;
}
