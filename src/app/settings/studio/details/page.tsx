import { StudioDetailsPage } from "@/components/settings/StudioDetailsPage";
import { StudioSettingsShell } from "@/components/settings/StudioSettingsShell";

export default function StudioDetailsRoute() {
  return (
    <StudioSettingsShell sectionId="details">
      <StudioDetailsPage />
    </StudioSettingsShell>
  );
}
