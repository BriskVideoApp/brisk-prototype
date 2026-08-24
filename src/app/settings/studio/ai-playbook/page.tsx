import { StudioAiPlaybookPage } from "@/components/settings/StudioAiPlaybookPage";
import { StudioSettingsShell } from "@/components/settings/StudioSettingsShell";

export default function StudioAiPlaybookRoute() {
  return (
    <StudioSettingsShell sectionId="ai-playbook">
      <StudioAiPlaybookPage />
    </StudioSettingsShell>
  );
}
