import type { Metadata } from "next";
import { MasterPage } from "@/components/masters/master-page";

export const metadata: Metadata = { title: "Providers" };

export default function ProvidersPage() {
  return <MasterPage entity="providers" />;
}
