import {
  BarChart3, Boxes, FolderKanban, Handshake, LayoutDashboard, MapPin, ScrollText,
  Settings, ShieldCheck, Store, type LucideIcon,
} from "lucide-react";
import type { Permission } from "@/lib/permissions";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission?: Permission;
  superAdminOnly?: boolean;
};

export const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: "Inventory",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "inventory.view" },
      { href: "/inventory", label: "Inventory", icon: Boxes, permission: "inventory.view" },
      { href: "/projects", label: "Projects", icon: FolderKanban, permission: "inventory.view" },
      { href: "/providers", label: "Providers", icon: Handshake, permission: "inventory.view" },
      { href: "/vendors", label: "Vendors", icon: Store, permission: "inventory.view" },
      { href: "/locations", label: "Locations", icon: MapPin, permission: "inventory.view" },
    ],
  },
  {
    label: "Insights",
    items: [
      { href: "/reports", label: "Reports", icon: BarChart3, permission: "reports.view" },
      { href: "/audit-log", label: "Audit Log", icon: ScrollText, permission: "audit.view" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin", label: "Administration", icon: ShieldCheck, superAdminOnly: true },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];
