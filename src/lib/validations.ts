import { z } from "zod";
import { CURRENCIES, FILE_KIND_VALUES, STATUS_VALUES } from "@/lib/constants";
import { ASSIGNABLE_ROLE_VALUES, PERMISSION_KEYS } from "@/lib/permissions";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const blankToNull = (v: unknown) => {
  if (v === undefined || v === null) return null;
  if (typeof v === "string" && v.trim() === "") return null;
  return v;
};

export const optText = (max = 500) =>
  z.preprocess(blankToNull, z.string().trim().max(max, `Keep this under ${max} characters`).nullable()).default(null);

export const optUuid = () =>
  z.preprocess(blankToNull, z.string().uuid("Choose a valid option").nullable()).default(null);

export const optDate = () =>
  z.preprocess(blankToNull, z.string().regex(DATE_RE, "Use the format YYYY-MM-DD").nullable()).default(null);

export const optMoney = () =>
  z.preprocess((v) => {
    const b = blankToNull(v);
    if (b === null) return null;
    if (typeof b === "number") return b;
    return Number(String(b).replace(/[,\s₹$€£]/g, ""));
  }, z.number({ invalid_type_error: "Enter a number" }).finite("Enter a number").min(0, "Cost can't be negative").max(999_999_999_999).nullable()).default(null);

export const componentSchema = z.object({
  name: z.string({ required_error: "Component name is required" }).trim().min(1, "Component name is required").max(200),
  category_id: z.string({ required_error: "Choose a category" }).uuid("Choose a category"),
  quantity: z.coerce.number({ invalid_type_error: "Enter a whole number" }).int("Enter a whole number").min(0, "Quantity can't be negative").max(1_000_000),
  provider_id: z.string({ required_error: "Choose who provided this" }).uuid("Choose who provided this"),
  current_owner: z.string({ required_error: "Current owner is required" }).trim().min(1, "Current owner is required").max(200),
  status: z.enum(STATUS_VALUES, { errorMap: () => ({ message: "Choose a status" }) }),
  received_date: z.string({ required_error: "Received date is required" }).regex(DATE_RE, "Received date is required"),
  manufacturer: optText(200),
  model: optText(200),
  part_number: optText(200),
  serial_number: optText(200),
  vendor_id: optUuid(),
  purchase_date: optDate(),
  unit_cost: optMoney(),
  invoice_number: optText(100),
  warranty_expiry: optDate(),
  current_holder: optText(200),
  location_id: optUuid(),
  project_id: optUuid(),
  description: optText(5000),
  specifications: optText(10000),
  notes: optText(5000),
});
export type ComponentInput = z.infer<typeof componentSchema>;

export const moveSchema = z
  .object({
    componentId: z.string().uuid(),
    type: z.enum(["assigned", "transferred", "returned", "relocated", "status_changed"]),
    owner: optText(200),
    holder: optText(200),
    locationId: optUuid(),
    projectId: optUuid(),
    status: z.preprocess(blankToNull, z.enum(STATUS_VALUES).nullable()).default(null),
    notes: optText(1000),
  })
  .superRefine((v, ctx) => {
    if (v.type === "assigned" && !v.holder)
      ctx.addIssue({ code: "custom", path: ["holder"], message: "Who is receiving it?" });
    if (v.type === "transferred" && !v.owner)
      ctx.addIssue({ code: "custom", path: ["owner"], message: "Who is the new owner?" });
    if (v.type === "relocated" && !v.locationId)
      ctx.addIssue({ code: "custom", path: ["locationId"], message: "Choose the new location" });
    if (v.type === "status_changed" && !v.status)
      ctx.addIssue({ code: "custom", path: ["status"], message: "Choose the new status" });
  });
export type MoveInput = z.input<typeof moveSchema>;

export const registerFileSchema = z.object({
  componentId: z.string().uuid(),
  kind: z.enum(FILE_KIND_VALUES),
  path: z.string().min(1).max(500),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().max(150).nullable(),
  size: z.number().int().min(0).max(50 * 1024 * 1024),
});

// ─── Reference data ─────────────────────────────────────────────────
const name = z.string({ required_error: "Name is required" }).trim().min(1, "Name is required").max(200);
const email = z.preprocess(blankToNull, z.string().trim().email("Enter a valid email").max(200).nullable()).default(null);
const url = z.preprocess(blankToNull, z.string().trim().url("Enter a full URL, e.g. https://…").max(300).nullable()).default(null);

export const masterSchemas = {
  categories: z.object({ name, description: optText(1000) }),
  projects: z
    .object({
      name,
      code: optText(40),
      description: optText(2000),
      status: z.enum(["active", "on_hold", "completed", "cancelled"]).default("active"),
      lead_name: optText(200),
      start_date: optDate(),
      end_date: optDate(),
    })
    .refine((v) => !v.start_date || !v.end_date || v.end_date >= v.start_date, {
      path: ["end_date"],
      message: "End date must be after the start date",
    }),
  providers: z.object({
    name,
    provider_type: optText(60),
    contact_name: optText(200),
    email,
    phone: optText(40),
    notes: optText(2000),
  }),
  vendors: z.object({
    name,
    contact_name: optText(200),
    email,
    phone: optText(40),
    website: url,
    address: optText(500),
    tax_id: optText(40),
    notes: optText(2000),
  }),
  locations: z.object({
    name,
    building: optText(120),
    room: optText(120),
    description: optText(1000),
  }),
} as const;

export type MasterEntity = keyof typeof masterSchemas;
export const MASTER_ENTITIES = ["categories", "projects", "providers", "vendors", "locations"] as const;

// ─── Users & settings ───────────────────────────────────────────────
export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(72, "Use at most 72 characters")
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/\d/, "Include a number");

export const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  fullName: z.string().trim().min(1, "Name is required").max(200),
  role: z.enum(ASSIGNABLE_ROLE_VALUES),
  password: passwordSchema,
});

export const updateUserSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().trim().min(1, "Name is required").max(200),
  role: z.enum(ASSIGNABLE_ROLE_VALUES),
  isActive: z.boolean(),
});

export const userPermissionSchema = z.object({
  userId: z.string().uuid(),
  permission: z.enum(PERMISSION_KEYS),
  state: z.enum(["grant", "deny", "inherit"]),
});

export const rolePermissionSchema = z.object({
  role: z.enum(ASSIGNABLE_ROLE_VALUES),
  permission: z.enum(PERMISSION_KEYS),
  enabled: z.boolean(),
});

export const orgSettingsSchema = z.object({
  org_name: z.string().trim().min(1, "Organization name is required").max(120),
  currency: z.enum(CURRENCIES),
  warranty_alert_days: z.coerce.number().int().min(1).max(365),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match",
  });
