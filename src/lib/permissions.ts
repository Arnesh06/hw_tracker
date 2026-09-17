export const PERMISSIONS = [
  { key: "inventory.view", label: "View inventory", group: "Inventory" },
  { key: "inventory.create", label: "Add components", group: "Inventory" },
  { key: "inventory.edit", label: "Edit components", group: "Inventory" },
  { key: "inventory.assign", label: "Assign & transfer", group: "Inventory" },
  { key: "inventory.archive", label: "Archive components", group: "Inventory" },
  { key: "inventory.import", label: "Import data", group: "Inventory" },
  { key: "inventory.export", label: "Export data", group: "Inventory" },
  { key: "files.upload", label: "Upload files", group: "Files" },
  { key: "files.delete", label: "Delete files", group: "Files" },
  { key: "masters.manage", label: "Manage reference data", group: "Reference data" },
  { key: "reports.view", label: "View reports", group: "Insights" },
  { key: "audit.view", label: "View audit log", group: "Insights" },
  { key: "settings.manage", label: "Manage organization", group: "Administration" },
] as const;

export type Permission = (typeof PERMISSIONS)[number]["key"];
export const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key) as [Permission, ...Permission[]];

export const ROLES = [
  { value: "super_admin", label: "Super Admin", description: "Controls every user and permission. Exactly one exists." },
  { value: "admin", label: "Admin", description: "Full access to inventory, reports, audit and settings." },
  { value: "inventory_manager", label: "Inventory Manager", description: "Runs day-to-day inventory, imports and reference data." },
  { value: "staff", label: "Staff", description: "Adds, edits and assigns components." },
  { value: "viewer", label: "Viewer", description: "Read-only access to inventory and reports." },
] as const;

export type AppRole = (typeof ROLES)[number]["value"];
export const ASSIGNABLE_ROLES = ROLES.filter((r) => r.value !== "super_admin");
export const ASSIGNABLE_ROLE_VALUES = ["admin", "inventory_manager", "staff", "viewer"] as const;

export function roleLabel(role: string) {
  return ROLES.find((r) => r.value === role)?.label ?? role;
}

export type SessionUser = {
  id: string;
  email: string;
  fullName: string | null;
  role: AppRole;
  isActive: boolean;
  permissions: Permission[];
};

export function can(user: Pick<SessionUser, "role" | "permissions"> | null | undefined, permission: Permission) {
  if (!user) return false;
  return user.role === "super_admin" || user.permissions.includes(permission);
}
