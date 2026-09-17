export const STATUS_VALUES = ["available", "in_use", "damaged", "repair", "retired"] as const;
export type ComponentStatus = (typeof STATUS_VALUES)[number];

export const STATUSES: { value: ComponentStatus; label: string; hint: string }[] = [
  { value: "available", label: "Available", hint: "In stock and ready to use" },
  { value: "in_use", label: "In use", hint: "Assigned to a person or project" },
  { value: "damaged", label: "Damaged", hint: "Faulty, not usable" },
  { value: "repair", label: "In repair", hint: "Sent for repair or being fixed" },
  { value: "retired", label: "Retired", hint: "End of life, kept for records" },
];

export function statusLabel(s: string | null | undefined) {
  return STATUSES.find((x) => x.value === s)?.label ?? s ?? "—";
}

export const MOVEMENT_TYPES = [
  { value: "created", label: "Registered" },
  { value: "assigned", label: "Assigned" },
  { value: "transferred", label: "Ownership transferred" },
  { value: "returned", label: "Returned" },
  { value: "relocated", label: "Moved" },
  { value: "status_changed", label: "Status changed" },
  { value: "edited", label: "Details edited" },
  { value: "archived", label: "Archived" },
  { value: "restored", label: "Restored" },
] as const;

export type MovementType = (typeof MOVEMENT_TYPES)[number]["value"];

export function movementLabel(t: string) {
  return MOVEMENT_TYPES.find((m) => m.value === t)?.label ?? t;
}

export const FILE_KINDS = [
  { value: "image", label: "Image" },
  { value: "invoice", label: "Invoice" },
  { value: "datasheet", label: "Datasheet" },
  { value: "document", label: "Document" },
] as const;
export type FileKind = (typeof FILE_KINDS)[number]["value"];
export const FILE_KIND_VALUES = ["image", "invoice", "datasheet", "document"] as const;

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const PROJECT_STATUSES = [
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On hold" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export const SORTABLE_COLUMNS = {
  hw_id: "ID",
  name: "Name",
  category_name: "Category",
  quantity: "Quantity",
  status: "Status",
  current_owner: "Owner",
  received_date: "Received",
  total_value: "Value",
  updated_at: "Last updated",
} as const;
export type SortColumn = keyof typeof SORTABLE_COLUMNS;

export const CURRENCIES = ["INR", "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "SGD", "AED"] as const;

export const PAGE_SIZE = 25;
