import type { Metadata } from "next";
import { MasterPage } from "@/components/masters/master-page";

export const metadata: Metadata = { title: "Vendors" };

export default function VendorsPage() {
  return <MasterPage entity="vendors" />;
}
