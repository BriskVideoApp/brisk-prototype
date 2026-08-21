import { CustomerMessageTemplatesPage } from "@/components/settings/CustomerMessageTemplatesPage";
import { StudioSettingsShell } from "@/components/settings/StudioSettingsShell";

export default function CustomerMessageTemplatesRoute() {
  return (
    <StudioSettingsShell sectionId="notifications">
      <CustomerMessageTemplatesPage />
    </StudioSettingsShell>
  );
}
