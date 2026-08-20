import { StudioSettingsShell } from "@/components/settings/StudioSettingsShell";
import { StudioTeamAccessPage } from "@/components/settings/StudioTeamAccessPage";

export default function StudioTeamAccessRoute() {
  return (
    <StudioSettingsShell sectionId="team">
      <StudioTeamAccessPage />
    </StudioSettingsShell>
  );
}
