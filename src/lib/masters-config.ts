import { PROJECT_STATUSES } from "@/lib/constants";
import type { MasterEntity } from "@/lib/validations";

export type MasterField = {
  key: string;
  label: string;
  type?: "text" | "textarea" | "date" | "email" | "url" | "tel" | "select";
  options?: readonly { value: string; label: string }[];
  placeholder?: string;
  hint?: string;
  required?: boolean;
  wide?: boolean;
  mono?: boolean;
};

export type MasterColumn = { key: string; label: string; kind?: "text" | "status" | "date" | "link" | "email"; hideBelow?: "md" | "lg" | "xl" };

export type MasterConfig = {
  entity: MasterEntity;
  title: string;
  singular: string;
  description: string;
  filterParam: string;
  fields: MasterField[];
  columns: MasterColumn[];
  subtitle?: string[];
};

export const PROVIDER_TYPES = [
  { value: "Purchase", label: "Purchase" },
  { value: "Donation", label: "Donation" },
  { value: "Grant", label: "Grant" },
  { value: "Loan", label: "Loan" },
  { value: "Sponsor", label: "Sponsor" },
  { value: "Internal", label: "Internal" },
  { value: "Other", label: "Other" },
] as const;

export const MASTER_CONFIG: Record<MasterEntity, MasterConfig> = {
  projects: {
    entity: "projects",
    title: "Projects",
    singular: "project",
    description: "Group components by the project they are used for.",
    filterParam: "project",
    subtitle: ["code"],
    fields: [
      { key: "name", label: "Project name", required: true, wide: true },
      { key: "code", label: "Code", placeholder: "e.g. PRJ-24", mono: true },
      { key: "status", label: "Status", type: "select", options: PROJECT_STATUSES, required: true },
      { key: "lead_name", label: "Project lead" },
      { key: "start_date", label: "Start date", type: "date" },
      { key: "end_date", label: "End date", type: "date" },
      { key: "description", label: "Description", type: "textarea", wide: true },
    ],
    columns: [
      { key: "status", label: "Status", kind: "status" },
      { key: "lead_name", label: "Lead", hideBelow: "md" },
      { key: "start_date", label: "Start", kind: "date", hideBelow: "lg" },
      { key: "end_date", label: "End", kind: "date", hideBelow: "lg" },
    ],
  },
  providers: {
    entity: "providers",
    title: "Providers",
    singular: "provider",
    description: "Who gave or supplied each component: departments, sponsors, donors, grants.",
    filterParam: "provider",
    subtitle: ["provider_type"],
    fields: [
      { key: "name", label: "Provider name", required: true, wide: true },
      { key: "provider_type", label: "Type", type: "select", options: PROVIDER_TYPES },
      { key: "contact_name", label: "Contact person" },
      { key: "email", label: "Email", type: "email" },
      { key: "phone", label: "Phone", type: "tel" },
      { key: "notes", label: "Notes", type: "textarea", wide: true },
    ],
    columns: [
      { key: "contact_name", label: "Contact", hideBelow: "md" },
      { key: "email", label: "Email", kind: "email", hideBelow: "lg" },
      { key: "phone", label: "Phone", hideBelow: "xl" },
    ],
  },
  vendors: {
    entity: "vendors",
    title: "Vendors",
    singular: "vendor",
    description: "Shops and suppliers you buy hardware from.",
    filterParam: "vendor",
    subtitle: ["website"],
    fields: [
      { key: "name", label: "Vendor name", required: true, wide: true },
      { key: "contact_name", label: "Contact person" },
      { key: "email", label: "Email", type: "email" },
      { key: "phone", label: "Phone", type: "tel" },
      { key: "website", label: "Website", type: "url", placeholder: "https://" },
      { key: "tax_id", label: "Tax ID / GSTIN", mono: true },
      { key: "address", label: "Address", type: "textarea", wide: true },
      { key: "notes", label: "Notes", type: "textarea", wide: true },
    ],
    columns: [
      { key: "contact_name", label: "Contact", hideBelow: "md" },
      { key: "email", label: "Email", kind: "email", hideBelow: "lg" },
      { key: "phone", label: "Phone", hideBelow: "xl" },
    ],
  },
  locations: {
    entity: "locations",
    title: "Locations",
    singular: "location",
    description: "Labs, stores, cabinets and shelves where hardware is kept.",
    filterParam: "location",
    fields: [
      { key: "name", label: "Location name", required: true, wide: true, placeholder: "e.g. Embedded Lab, Cabinet B" },
      { key: "building", label: "Building" },
      { key: "room", label: "Room" },
      { key: "description", label: "Description", type: "textarea", wide: true },
    ],
    columns: [
      { key: "building", label: "Building", hideBelow: "md" },
      { key: "room", label: "Room", hideBelow: "md" },
    ],
  },
  categories: {
    entity: "categories",
    title: "Categories",
    singular: "category",
    description: "Types of hardware, used for filtering and reports.",
    filterParam: "category",
    fields: [
      { key: "name", label: "Category name", required: true, wide: true },
      { key: "description", label: "Description", type: "textarea", wide: true },
    ],
    columns: [{ key: "description", label: "Description", hideBelow: "md" }],
  },
};
