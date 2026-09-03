import { StudioIntegrationsPage } from "@/components/settings/StudioIntegrationsPage";
import { StudioSettingsShell } from "@/components/settings/StudioSettingsShell";

export default function StudioIntegrationsRoute() {
  return (
    <StudioSettingsShell sectionId="integrations">
      <StudioIntegrationsPage />
    </StudioSettingsShell>
  );
}
