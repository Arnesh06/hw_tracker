import type { ComponentStatus } from "@/lib/constants";

/** Row shape returned by fetchInventoryPage(). */
export type InventoryRow = {
  id: string;
  hw_id: string;
  name: string;
  manufacturer: string | null;
  model: string | null;
  category_name: string;
  quantity: number;
  status: ComponentStatus;
  current_owner: string;
  current_holder: string | null;
  location_name: string | null;
  project_name: string | null;
  provider_name: string;
  received_date: string;
  total_value: number | string;
  unit_cost: number | string | null;
  serial_number: string | null;
  archived_at: string | null;
  updated_at: string;
};
