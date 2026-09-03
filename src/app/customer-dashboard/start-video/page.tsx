"use client";

import { BriefPage } from "@/components/brief/BriefPage";
import { useStudioSettings } from "@/components/settings/StudioSettingsContext";
import { clientNewVideoProject } from "@/data/prototype-scenarios";

export default function ClientStartVideoRoute() {
  const { studio } = useStudioSettings();

  return (
    <BriefPage
      approvalDestination="/customer-dashboard/start-video/script"
      project={clientNewVideoProject}
      studioName={studio.details.name}
    />
  );
}
