import { StudioNotificationSettingsPage } from "@/components/settings/StudioNotificationSettingsPage";
import { StudioSettingsShell } from "@/components/settings/StudioSettingsShell";

export default function StudioNotificationSettingsRoute() {
  return (
    <StudioSettingsShell sectionId="notifications">
      <StudioNotificationSettingsPage />
    </StudioSettingsShell>
  );
}
