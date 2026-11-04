"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { EditingDialog } from "../../../Brisk DS/src/app/components/EditingDialog";
import { SettingsSummaryRow } from "./SettingsSummaryRow";
import { BriskSelect } from "@/components/form/BriskSelect";
import { useMediaLibrary } from "@/components/media/MediaLibraryContext";
import { DsIcon } from "@/components/video-review/DsIcon";
import { activeVideoProjects } from "@/data/active-videos/mockData";
import { mediaStorageOptions, mediaStoragePlans, type MediaStorageProvider } from "@/data/media";

const remoteStudioProjectIds = ["loom-launch-film", "deel-customer-story", "hims-product-education"];
const storageProviderLogos: Partial<Record<MediaStorageProvider, string>> = {
  "google-drive": "https://www.gstatic.com/marketing-cms/assets/images/a1/a6/49e0b7d9453b9b2a56526c0df3ff/drive.webp=s80-fcrop64=1,00000000ffffffff-rw",
  dropbox: "https://cdn.prod.website-files.com/66c503d081b2f012369fc5d2/674000d6c0a42d41f8c331be_dropbox-2-logo-png-transparent.png",
  "brisk-storage": "/assets/logos/brisk.svg",
};

export function MediaStorageSettingsPage() {
  const library = useMediaLibrary();
  const [draftProvider, setDraftProvider] = useState<MediaStorageProvider | null>(null);
  const [saved, setSaved] = useState(false);
  const option = mediaStorageOptions.find((candidate) => candidate.provider === library.workspaceStorage.provider) ?? mediaStorageOptions[2];
  const plan = mediaStoragePlans.find((candidate) => candidate.id === library.workspaceStorage.planId) ?? mediaStoragePlans[1];
  const percentage = Math.min(100, (plan.exampleUsedBytes / plan.includedBytes) * 100);
  const nearLimit = percentage >= 80;

  return (
    <main className="media-storage-settings-page">
      <div className="studio-setup-settings-panel">
        <SettingsSummaryRow title="Where files are saved" headingAs="h2" action={<Button size="S" variant="secondary" onClick={() => { setDraftProvider(option.provider); setSaved(false); }}>Change storage</Button>}>
          <strong className="label-m-semibold">{option.label}</strong>
          <p className="paragraph-s">{storageOptionDescription(option.provider)}</p>
          <p className="paragraph-s">Applies to new uploads. Existing files stay where they are.</p>
        </SettingsSummaryRow>
      </div>
      {saved ? <p className="paragraph-s" role="status">Storage default saved for new uploads.</p> : null}
      {draftProvider !== null ? <EditingDialog title="Change storage" description="Choose where new uploads are saved. Existing files will not move." onCancel={() => setDraftProvider(null)} actions={<>
        <Button size="S" variant="secondary" onClick={() => setDraftProvider(null)}>Cancel</Button>
        <Button size="S" disabled={draftProvider === option.provider} onClick={() => { library.setWorkspaceStorageProvider(draftProvider); setDraftProvider(null); setSaved(true); }}>Save storage</Button>
      </>}>
        <div className="studio-editor-fields">
          <label className="studio-settings-select-field"><span className="label-s-semibold">Storage provider</span>
            <BriskSelect<MediaStorageProvider> ariaLabel="Storage provider" clearable={false} searchable={false} placeholder="Choose storage"
              options={mediaStorageOptions.map((item) => ({ value: item.provider, label: item.label, logoSrc: storageProviderLogos[item.provider], icon: item.provider === "remote-studio" ? "film-strip" : undefined }))}
              value={draftProvider} onChange={(provider) => { if (provider) setDraftProvider(provider); }} />
          </label>
          <p className="paragraph-s">{storageOptionDescription(draftProvider)}</p>
          {draftProvider !== "brisk-storage" ? <p className="paragraph-s studio-review-dialog-note">Prototype selection only. No external account is connected or files transferred.</p> : null}
        </div>
      </EditingDialog> : null}

      {option.provider === "brisk-storage" ? (
        <section className="media-storage-settings-card" aria-labelledby="media-storage-usage-title">
          <div className="media-storage-settings-heading"><div><h2 className="headings-xs-bold" id="media-storage-usage-title">Storage usage</h2><p className="paragraph-s">You are using {formatWholeGigabytes(plan.exampleUsedBytes)} of the {formatWholeGigabytes(plan.includedBytes)} included with your plan.</p></div></div>
          <div className={`media-storage-settings-meter ${nearLimit ? "is-warning" : ""}`} role="progressbar" aria-label="Brisk Storage usage" aria-valuemin={0} aria-valuemax={plan.includedBytes} aria-valuenow={plan.exampleUsedBytes}><span style={{ width: `${percentage}%` }} /></div>
          <p className="media-storage-usage-note label-s"><DsIcon name="info" size={16} /><span>This only counts files stored by Brisk. Files kept in Google Drive, Dropbox or Remote Studio do not use this allowance.</span></p>
          {nearLimit ? <div className="media-storage-limit-warning"><DsIcon name="alert-triangle" size={18} /><div><strong className="label-s-semibold">You’re close to your storage limit</strong><p className="paragraph-s">Uploads will keep working. Remove older files or increase your allowance.</p><Link className="customer-message-templates-back label-s-semibold" href="/settings/plan-billing?compare=plans">Compare plans</Link></div></div> : null}
        </section>
      ) : null}

      {option.provider === "remote-studio" ? (
        <section className="media-storage-settings-card" aria-labelledby="remote-projects-title">
          <div className="media-storage-settings-heading"><div><h2 className="headings-xs-bold" id="remote-projects-title">Your projects</h2><p className="paragraph-s">Brisk creates a protected folder for each project. Editors can organise files inside it, while Brisk keeps the main project folder safe.</p></div></div>
          <div className="media-remote-project-list">{remoteStudioProjectIds.map((projectId) => {
            const project = activeVideoProjects.find((candidate) => candidate.id === projectId);
            return <article key={projectId}><span className="media-remote-project-icon"><DsIcon name="folder-open" size={16} /></span><div><strong className="label-s-semibold">{project?.name ?? "Project"}</strong><span className="label-xs"><b>Project status:</b> Ready for editing</span></div></article>;
          })}</div>
        </section>
      ) : null}
      <p className="paragraph-s studio-review-dialog-note">Your team uploads, watches and shares files in Brisk whichever storage provider you choose.</p>
    </main>
  );
}

function storageOptionDescription(provider: MediaStorageProvider) {
  if (provider === "remote-studio") return "Files are saved in a shared online workspace for editors. They can access and edit the same files from anywhere without downloading everything first.";
  if (provider === "google-drive") return "New files uploaded to Brisk are saved in your connected Google Drive. You can also add files to Brisk that are already in Google Drive.";
  if (provider === "dropbox") return "New files uploaded to Brisk are saved in your connected Dropbox. You can also add files to Brisk that are already in Dropbox.";
  return "Brisk stores your files for you. You do not need to connect another storage account.";
}

function formatWholeGigabytes(bytes: number) {
  return `${Math.round(bytes / 1_000_000_000)} GB`;
}
