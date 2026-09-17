export const AUDIT_ENTITIES = [
  { value: "components", label: "Components" },
  { value: "component_files", label: "Files" },
  { value: "categories", label: "Categories" },
  { value: "projects", label: "Projects" },
  { value: "providers", label: "Providers" },
  { value: "vendors", label: "Vendors" },
  { value: "locations", label: "Locations" },
  { value: "profiles", label: "Users and sign-ins" },
  { value: "role_permissions", label: "Role permissions" },
  { value: "user_permissions", label: "User permissions" },
  { value: "app_settings", label: "Organization settings" },
  { value: "reports", label: "Report exports" },
] as const;

export const AUDIT_ACTIONS = [
  { value: "INSERT", label: "Created" },
  { value: "UPDATE", label: "Updated" },
  { value: "DELETE", label: "Deleted" },
  { value: "auth.sign_in", label: "Signed in" },
  { value: "auth.sign_out", label: "Signed out" },
  { value: "data.export", label: "Exported data" },
  { value: "data.import", label: "Imported data" },
  { value: "report.export", label: "Exported report" },
  { value: "admin.user_created", label: "User created" },
  { value: "admin.user_disabled", label: "User disabled" },
  { value: "admin.user_enabled", label: "User enabled" },
  { value: "admin.password_reset", label: "Password reset" },
] as const;

export function auditActionLabel(a: string) {
  return AUDIT_ACTIONS.find((x) => x.value === a)?.label ?? a;
}

export function auditEntityLabel(e: string) {
  const map: Record<string, string> = {
    components: "Component",
    component_files: "File",
    categories: "Category",
    projects: "Project",
    providers: "Provider",
    vendors: "Vendor",
    locations: "Location",
    profiles: "User",
    role_permissions: "Role permission",
    user_permissions: "User permission",
    app_settings: "Settings",
    app: "Session",
    reports: "Report",
  };
  return map[e] ?? e;
}
