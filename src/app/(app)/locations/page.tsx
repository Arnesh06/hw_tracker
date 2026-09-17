import type { Metadata } from "next";
import { MasterPage } from "@/components/masters/master-page";

export const metadata: Metadata = { title: "Locations" };

export default function LocationsPage() {
  return <MasterPage entity="locations" />;
}
