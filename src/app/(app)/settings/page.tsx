import type { Metadata } from "next";
import { Building2, KeyRound, Shapes, UserRound } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { can, roleLabel } from "@/lib/permissions";
import { getSettings } from "@/lib/data";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrgForm, PasswordForm, ProfileForm } from "@/components/settings/settings-forms";
import { MasterTable } from "@/components/masters/master-table";
import { loadMaster } from "@/components/masters/master-page";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await requireUser();
  const { tab } = await searchParams;
  const canOrg = can(user, "settings.manage");
  const canCategories = can(user, "inventory.view");
  const [settings, categories] = await Promise.all([getSettings(), canCategories ? loadMaster("categories") : Promise.resolve(null)]);
  const tabs = ["profile", "password", ...(canOrg ? ["organization"] : []), ...(categories ? ["categories"] : [])];
  const defaultTab = tab && tabs.includes(tab) ? tab : "profile";

  return (
    <>
      <PageHeader title="Settings" description="Your account and, if you have access, organization-wide options." />
      <Tabs defaultValue={defaultTab}>
        <TabsList className="mb-5 w-full justify-start">
          <TabsTrigger value="profile">
            <UserRound /> Profile
          </TabsTrigger>
          <TabsTrigger value="password">
            <KeyRound /> Password
          </TabsTrigger>
          {canOrg && (
            <TabsTrigger value="organization">
              <Building2 /> Organization
            </TabsTrigger>
          )}
          {categories && (
            <TabsTrigger value="categories">
              <Shapes /> Categories
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Your name appears in movement history and the audit log.</CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileForm fullName={user.fullName ?? ""} email={user.email} roleName={roleLabel(user.role)} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle>Change password</CardTitle>
              <CardDescription>You&apos;ll stay signed in on this device.</CardDescription>
            </CardHeader>
            <CardContent>
              <PasswordForm />
            </CardContent>
          </Card>
        </TabsContent>

        {canOrg && (
          <TabsContent value="organization">
            <Card>
              <CardHeader>
                <CardTitle>Organization</CardTitle>
                <CardDescription>Applies to everyone using this HW-Track workspace.</CardDescription>
              </CardHeader>
              <CardContent>
                <OrgForm
                  initial={{
                    org_name: settings.org_name,
                    currency: settings.currency,
                    warranty_alert_days: settings.warranty_alert_days,
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {categories && (
          <TabsContent value="categories">
            <Card className="overflow-hidden">
              <CardHeader className="pb-0">
                <CardTitle>Categories</CardTitle>
                <CardDescription>Types of hardware used in forms, filters and reports.</CardDescription>
              </CardHeader>
              <MasterTable entity="categories" rows={categories.rows} usage={categories.usage} embedded />
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </>
  );
}
