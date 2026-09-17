import type { Metadata } from "next";
import { ShieldCheck, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { Forbidden } from "@/components/shared/forbidden";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UsersPanel } from "@/components/admin/users-panel";
import { RoleMatrix } from "@/components/admin/role-matrix";
import type { AdminUser, PermissionDef, RoleGrant, UserOverride } from "@/components/admin/types";

export const metadata: Metadata = { title: "Administration" };

export default async function AdminPage() {
  const user = await requireUser();
  if (user.role !== "super_admin") return <Forbidden what="administration" />;

  const supabase = await createClient();
  const [usersRes, permsRes, grantsRes, overridesRes] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, role, is_active, created_at").order("role").order("email"),
    supabase.from("permissions").select("*").order("sort_order"),
    supabase.from("role_permissions").select("role, permission"),
    supabase.from("user_permissions").select("user_id, permission, granted"),
  ]);
  for (const r of [usersRes, permsRes, grantsRes, overridesRes]) if (r.error) throw new Error(r.error.message);

  const users = (usersRes.data as AdminUser[]) ?? [];
  const permissions = (permsRes.data as PermissionDef[]) ?? [];
  const roleGrants = (grantsRes.data as RoleGrant[]) ?? [];
  const overrides = (overridesRes.data as UserOverride[]) ?? [];
  const active = users.filter((u) => u.is_active).length;

  return (
    <>
      <PageHeader
        title="Administration"
        description={`You are the Super Admin. ${users.length} ${users.length === 1 ? "account" : "accounts"}, ${active} active. Every change here is recorded in the audit log.`}
      />
      <Tabs defaultValue="users">
        <TabsList className="mb-5 w-full justify-start">
          <TabsTrigger value="users">
            <Users /> Users
          </TabsTrigger>
          <TabsTrigger value="roles">
            <ShieldCheck /> Roles and permissions
          </TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <Card className="overflow-hidden">
            <UsersPanel users={users} permissions={permissions} roleGrants={roleGrants} overrides={overrides} currentUserId={user.id} />
          </Card>
        </TabsContent>
        <TabsContent value="roles">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>What each role can do</CardTitle>
              <CardDescription>
                Changes apply to everyone with that role immediately and are enforced by the server and database, not just hidden in the interface.
                Individual users can be given exceptions from the Users tab.
              </CardDescription>
            </CardHeader>
            <RoleMatrix permissions={permissions} roleGrants={roleGrants} />
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
