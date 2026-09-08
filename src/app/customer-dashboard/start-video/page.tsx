"use client";

import { BriefPage } from "@/components/brief/BriefPage";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { clientNewVideoProject } from "@/data/prototype-scenarios";
import { northStarWorkspaceId, northStarWorkspaceName, selectWorkspace } from "@/data/prototype-state";

export default function ClientStartVideoRoute() {
  const { state } = usePrototypeState();
  const studioName = selectWorkspace(state, northStarWorkspaceId)?.name ?? northStarWorkspaceName;

  return (
    <BriefPage
      approvalDestination="/customer-dashboard/start-video/script"
      project={clientNewVideoProject}
      studioName={studioName}
    />
  );
}
