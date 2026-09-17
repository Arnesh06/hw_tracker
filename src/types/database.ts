import type { ComponentStatus, FileKind, MovementType } from "@/lib/constants";
import type { AppRole } from "@/lib/permissions";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: AppRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Component = {
  id: string;
  hw_id: string;
  name: string;
  category_id: string;
  quantity: number;
  provider_id: string;
  current_owner: string;
  status: ComponentStatus;
  received_date: string;
  manufacturer: string | null;
  model: string | null;
  part_number: string | null;
  serial_number: string | null;
  vendor_id: string | null;
  purchase_date: string | null;
  unit_cost: number | null;
  invoice_number: string | null;
  warranty_expiry: string | null;
  current_holder: string | null;
  location_id: string | null;
  project_id: string | null;
  description: string | null;
  specifications: string | null;
  notes: string | null;
  archived_at: string | null;
  archived_by: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

export type ComponentView = Component & {
  category_name: string;
  provider_name: string;
  vendor_name: string | null;
  location_name: string | null;
  project_name: string | null;
  project_code: string | null;
  total_value: number;
};

export type Movement = {
  id: number;
  component_id: string;
  movement_type: MovementType;
  from_owner: string | null;
  to_owner: string | null;
  from_holder: string | null;
  to_holder: string | null;
  from_location_name: string | null;
  to_location_name: string | null;
  from_project_name: string | null;
  to_project_name: string | null;
  from_status: ComponentStatus | null;
  to_status: ComponentStatus | null;
  quantity: number | null;
  notes: string | null;
  performed_by: string | null;
  performed_by_email: string | null;
  created_at: string;
};

export type ComponentFile = {
  id: string;
  component_id: string;
  kind: FileKind;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by: string | null;
  created_at: string;
};

export type AuditLog = {
  id: number;
  occurred_at: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  entity_label: string | null;
  changed_fields: string[] | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
};

export type AppSettings = {
  id: number;
  org_name: string;
  currency: string;
  warranty_alert_days: number;
  updated_at: string;
};

export type Option = { id: string; name: string; is_active?: boolean };

export type MasterOptions = {
  categories: Option[];
  providers: Option[];
  vendors: Option[];
  locations: Option[];
  projects: Option[];
};

export type DashboardStats = {
  total_records: number;
  total_units: number;
  total_value: number;
  archived: number;
  by_status: Partial<Record<ComponentStatus, { records: number; units: number }>>;
  by_category: { name: string; records: number; units: number; value: number }[];
  by_project: { name: string; records: number; units: number; value: number }[];
  by_location: { name: string; records: number; units: number }[];
  monthly: { month: string; records: number; units: number }[];
  warranty_expiring: number;
  recent_movements: {
    id: number;
    movement_type: MovementType;
    created_at: string;
    performed_by_email: string | null;
    to_owner: string | null;
    to_holder: string | null;
    to_location_name: string | null;
    to_status: ComponentStatus | null;
    component_id: string;
    hw_id: string;
    name: string;
  }[];
};

export type GroupedReportRow = {
  group_label: string;
  records: number;
  units: number;
  available: number;
  in_use: number;
  damaged: number;
  repair: number;
  retired: number;
  total_value: number;
};
