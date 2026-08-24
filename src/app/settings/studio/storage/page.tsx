import { MediaStorageSettingsPage } from "@/components/settings/MediaStorageSettingsPage";
import { StudioSettingsShell } from "@/components/settings/StudioSettingsShell";
import "@/components/settings/media-storage-settings.css";

export default function StudioStorageSettingsRoute() {
  return <StudioSettingsShell sectionId="storage"><MediaStorageSettingsPage /></StudioSettingsShell>;
}
