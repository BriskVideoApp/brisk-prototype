import { StudioSetupOverviewPage } from "@/components/settings/StudioSetupOverviewPage";
import { StudioSettingsShell } from "@/components/settings/StudioSettingsShell";

export default function StudioSetupRoute() {
  return (
    <StudioSettingsShell sectionId="overview">
      <StudioSetupOverviewPage />
    </StudioSettingsShell>
  );
}
