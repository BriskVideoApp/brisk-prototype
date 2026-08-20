import { StudioBrandingPage } from "@/components/settings/StudioBrandingPage";
import { StudioSettingsShell } from "@/components/settings/StudioSettingsShell";

export default function StudioBrandingRoute() {
  return (
    <StudioSettingsShell sectionId="branding">
      <StudioBrandingPage />
    </StudioSettingsShell>
  );
}
