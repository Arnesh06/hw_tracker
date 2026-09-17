import type { MasterEntity } from "@/lib/validations";
import { PROJECT_STATUSES } from "@/lib/constants";

export type MasterField = {
  key: string;
  label: string;
  type?: "text" | "textarea" | "email" | "url" | "tel" | "date" | "select";
  options?: readonly { value: string; label: string }[];
  placeholder?: string;
  hint?: string;
  wide?: boolean;
  mono?: boolean;
};

export type MasterConfig = {
  entity: MasterEntity;
  singular: string;
  plural: string;
  description: string;
  filterParam: string;
  fields: MasterField[];
  /** Extra table columns (besides name and usage). */
  columns: { key: string; label: string; className?: string; mono?: boolean }[];
};

export const MASTER_CONFIG: Record<MasterEntity, MasterConfig> = {
  projects: {
    entity: "projects",
    singular: "project",
    plural: "projects",
    description: "Group components by the project or course that uses them.",
    filterParam: "project",
    fields: [
      { key: "name", label: "Project name", placeholder: "e.g. Smart irrigation prototype" },
      { key: "code", label: "Code", placeholder: "e.g. PRJ-24", mono: true },
      { key: "status", label: "Status", type: "select", options: PROJECT_STATUSES },
      { key: "lead_name", label: "Lead", placeholder: "Who runs it" },
      { key: "start_date", label: "Start date", type: "date" },
      { key: "end_date", label: "End date", type: "date" },
      { key: "description", label: "Description", type: "textarea", wide: true },
    ],
    columns: [
      { key: "code", label: "Code", mono: true },
      { key: "status", label: "Status" },
      { key: "lead_name", label: "Lead", className: "hidden lg:table-cell" },
    ],
  },
  providers: {
    entity: "providers",
    singular: "source",
    plural: "providers",
    description: "Who gave or supplied components: departments, sponsors, donors, labs or purchases.",
    filterParam: "provider",
    fields: [
      { key: "name", label: "Name", placeholder: "e.g. IEEE Student Branch" },
      { key: "provider_type", label: "Type", placeholder: "Department, sponsor, donor…" },
      { key: "contact_name", label: "Contact person" },
      { key: "email", label: "Email", type: "email" },
      { key: "phone", label: "Phone", type: "tel" },
      { key: "notes", label: "Notes", type: "textarea", wide: true },
    ],
    columns: [
      { key: "provider_type", label: "Type" },
      { key: "contact_name", label: "Contact", className: "hidden lg:table-cell" },
      { key: "email", label: "Email", className: "hidden xl:table-cell" },
    ],
  },
  vendors: {
    entity: "vendors",
    singular: "vendor",
    plural: "vendors",
    description: "Shops and distributors you buy from.",
    filterParam: "vendor",
    fields: [
      { key: "name", label: "Vendor name", placeholder: "e.g. Robu.in" },
      { key: "contact_name", label: "Contact person" },
      { key: "email", label: "Email", type: "email" },
      { key: "phone", label: "Phone", type: "tel" },
      { key: "website", label: "Website", type: "url", placeholder: "https://" },
      { key: "tax_id", label: "GSTIN / Tax ID", mono: true },
      { key: "address", label: "Address", type: "textarea", wide: true },
      { key: "notes", label: "Notes", type: "textarea", wide: true },
    ],
    columns: [
      { key: "contact_name", label: "Contact" },
      { key: "phone", label: "Phone", className: "hidden lg:table-cell" },
      { key: "website", label: "Website", className: "hidden xl:table-cell" },
    ],
  },
  locations: {
    entity: "locations",
    singular: "location",
    plural: "locations",
    description: "Stores, labs, cabinets and shelves where components are kept.",
    filterParam: "location",
    fields: [
      { key: "name", label: "Location name", placeholder: "e.g. Embedded Lab, Cabinet B" },
      { key: "building", label: "Building" },
      { key: "room", label: "Room" },
      { key: "description", label: "Description", type: "textarea", wide: true },
    ],
    columns: [
      { key: "building", label: "Building" },
      { key: "room", label: "Room" },
    ],
  },
  categories: {
    entity: "categories",
    singular: "category",
    plural: "categories",
    description: "Kinds of hardware, used for filtering and reports.",
    filterParam: "category",
    fields: [
      { key: "name", label: "Category name", placeholder: "e.g. Sensors" },
      { key: "description", label: "Description", type: "textarea", wide: true },
    ],
    columns: [{ key: "description", label: "Description", className: "hidden md:table-cell" }],
  },
};
