import type { ReactNode } from "react";
import { ProjectAccessGate } from "@/components/project/ProjectAccessGate";

export default async function ProjectLayout({ children, params }: { children: ReactNode; params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <ProjectAccessGate projectId={projectId}>{children}</ProjectAccessGate>;
}
