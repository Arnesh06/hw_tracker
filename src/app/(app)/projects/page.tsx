import type { Metadata } from "next";
import { MasterPage } from "@/components/masters/master-page";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  return <MasterPage entity="projects" />;
}
