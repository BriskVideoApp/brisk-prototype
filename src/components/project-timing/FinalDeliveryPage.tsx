"use client";

import { useRouter } from "next/navigation";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { usePrototypeViewer } from "@/components/prototype-state/usePrototypeViewer";
import { getActiveClientPortalDestination } from "@/components/navigation/prototypeNavigation";
import { ProjectDeadlineDialog } from "./ProjectDeadlineDialog";

/** Existing bookmarks and Chat links open the same editor as the Videos table. */
export function FinalDeliveryPage({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { state } = usePrototypeState();
  const viewer = usePrototypeViewer();
  const backHref = viewer?.role === "Customer" ? getActiveClientPortalDestination(state, viewer) ?? "/prototype/scenarios" : "/active-videos";
  return <ProjectDeadlineDialog key={`${projectId}:${viewer?.id}:${viewer?.role}`} projectId={projectId} onClose={() => router.replace(backHref)} />;
}
