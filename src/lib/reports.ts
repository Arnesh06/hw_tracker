export const REPORT_GROUPS = [
  { value: "category", label: "Category" },
  { value: "project", label: "Project" },
  { value: "location", label: "Location" },
  { value: "provider", label: "Given By/Source" },
  { value: "vendor", label: "Vendor" },
  { value: "owner", label: "Owner" },
  { value: "holder", label: "Holder" },
  { value: "status", label: "Status" },
] as const;

export type ReportGroup = (typeof REPORT_GROUPS)[number]["value"];

export function parseReportGroup(v: string | null | undefined): ReportGroup {
  return REPORT_GROUPS.find((g) => g.value === v)?.value ?? "category";
}

export function reportGroupLabel(g: ReportGroup) {
  return REPORT_GROUPS.find((x) => x.value === g)?.label ?? g;
}
