import type { AppRole } from "@/lib/permissions";

export type AdminUser = {
  id: string;
  email: string;
  full_name: string | null;
  role: AppRole;
  is_active: boolean;
  created_at: string;
};

export type PermissionDef = { key: string; label: string; description: string; group_name: string; sort_order: number };
export type RoleGrant = { role: AppRole; permission: string };
export type UserOverride = { user_id: string; permission: string; granted: boolean };
