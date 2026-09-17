"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { setRolePermission } from "@/lib/actions/admin";
import { ASSIGNABLE_ROLES, type AppRole, type Permission } from "@/lib/permissions";
import type { PermissionDef, RoleGrant } from "./types";

type Assignable = Exclude<AppRole, "super_admin">;

export function RoleMatrix({ permissions, roleGrants }: { permissions: PermissionDef[]; roleGrants: RoleGrant[] }) {
  const router = useRouter();
  const [grants, setGrants] = useState(() => new Set(roleGrants.map((g) => `${g.role}:${g.permission}`)));
  const [busy, setBusy] = useState<string | null>(null);

  const toggle = async (role: Assignable, permission: string, enabled: boolean) => {
    const key = `${role}:${permission}`;
    const next = new Set(grants);
    if (enabled) next.add(key);
    else next.delete(key);
    setGrants(next);
    setBusy(key);
    const res = await setRolePermission({ role, permission: permission as Permission, enabled });
    setBusy(null);
    if (!res.ok) {
      setGrants((g) => {
        const r = new Set(g);
        if (enabled) r.delete(key);
        else r.add(key);
        return r;
      });
      toast.error(res.error);
    } else router.refresh();
  };

  const groups = Array.from(new Set(permissions.map((p) => p.group_name)));

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="min-w-[16rem]">Permission</TableHead>
            <TableHead className="text-center">Super Admin</TableHead>
            {ASSIGNABLE_ROLES.map((r) => (
              <TableHead key={r.value} className="text-center" title={r.description}>
                {r.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((g) => (
            <GroupRows key={g} group={g}>
              {permissions
                .filter((p) => p.group_name === g)
                .map((p) => (
                  <TableRow key={p.key}>
                    <TableCell>
                      <p className="font-medium">{p.label}</p>
                      <p className="text-xs text-muted-foreground">{p.description}</p>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch checked disabled aria-label={`Super Admin always has ${p.label}`} />
                    </TableCell>
                    {ASSIGNABLE_ROLES.map((r) => {
                      const key = `${r.value}:${p.key}`;
                      return (
                        <TableCell key={r.value} className="text-center">
                          <Switch
                            checked={grants.has(key)}
                            disabled={busy === key}
                            onCheckedChange={(v) => toggle(r.value as Assignable, p.key, v)}
                            aria-label={`${r.label}: ${p.label}`}
                          />
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
            </GroupRows>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function GroupRows({ group, children }: { group: string; children: React.ReactNode }) {
  return (
    <>
      <TableRow className="bg-muted/50 hover:bg-muted/50">
        <TableCell colSpan={6} className="py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {group}
        </TableCell>
      </TableRow>
      {children}
    </>
  );
}
