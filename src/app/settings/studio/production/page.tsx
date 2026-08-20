import { StudioProductionDefaultsPage } from "@/components/settings/StudioProductionDefaultsPage";
import { StudioSettingsShell } from "@/components/settings/StudioSettingsShell";

export default function StudioProductionDefaultsRoute() {
  return (
    <StudioSettingsShell sectionId="production">
      <StudioProductionDefaultsPage />
    </StudioSettingsShell>
  );
}
