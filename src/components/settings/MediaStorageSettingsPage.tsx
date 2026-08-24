"use client";

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
  const option = mediaStorageOptions.find((candidate) => candidate.provider === library.workspaceStorage.provider) ?? mediaStorageOptions[2];
  const plan = mediaStoragePlans.find((candidate) => candidate.id === library.workspaceStorage.planId) ?? mediaStoragePlans[1];
  const percentage = Math.min(100, (plan.exampleUsedBytes / plan.includedBytes) * 100);
  const nearLimit = percentage >= 80;

  return (
    <main className="media-storage-settings-page">
      <section className="media-storage-settings-card" aria-labelledby="media-storage-provider-title">
        <div className="media-storage-settings-heading">
          <div><h2 className="headings-xs-bold" id="media-storage-provider-title">Where files are saved</h2><p className="paragraph-s">Choose where Brisk should keep new uploads. This will not move files you have already added.</p></div>
        </div>
        <label className="media-storage-setting-field">
          <span className="label-xs-semibold">Storage option</span>
          <BriskSelect<MediaStorageProvider>
            ariaLabel="Choose storage option"
            clearable={false}
            options={mediaStorageOptions.map((storageOption) => ({ value: storageOption.provider, label: storageOption.label, logoSrc: storageProviderLogos[storageOption.provider], icon: storageOption.provider === "remote-studio" ? "film-strip" : undefined }))}
            placeholder="Choose storage"
            searchable={false}
            value={library.workspaceStorage.provider}
            onChange={(provider) => { if (provider) library.setWorkspaceStorageProvider(provider); }}
          />
        </label>
        <div className="media-storage-provider-summary">
          <span className="media-storage-provider-icon">{storageProviderLogos[option.provider] ? <img className="media-storage-provider-logo" src={storageProviderLogos[option.provider]} alt="" /> : <DsIcon name="film-strip" size={24} />}</span>
          <div><strong className="label-m-semibold">{option.label}</strong><p className="paragraph-s">{storageOptionDescription(option.provider)}</p></div>
        </div>
      </section>

      {option.provider === "brisk-storage" ? (
        <section className="media-storage-settings-card" aria-labelledby="media-storage-usage-title">
          <div className="media-storage-settings-heading"><div><h2 className="headings-xs-bold" id="media-storage-usage-title">Storage usage</h2><p className="paragraph-s">You are using {formatWholeGigabytes(plan.exampleUsedBytes)} of the {formatWholeGigabytes(plan.includedBytes)} included with your plan.</p></div></div>
          <div className={`media-storage-settings-meter ${nearLimit ? "is-warning" : ""}`} role="progressbar" aria-label="Brisk Storage usage" aria-valuemin={0} aria-valuemax={plan.includedBytes} aria-valuenow={plan.exampleUsedBytes}><span style={{ width: `${percentage}%` }} /></div>
          <p className="media-storage-usage-note label-s"><DsIcon name="info" size={16} /><span>This only counts files stored by Brisk. Files kept in Google Drive, Dropbox or Remote Studio do not use this allowance.</span></p>
          {nearLimit ? <div className="media-storage-limit-warning"><DsIcon name="alert-triangle" size={18} /><div><strong className="label-s-semibold">You’re close to your storage limit</strong><p className="paragraph-s">Uploads will keep working. Remove older files or compare plans before you reach your allowance.</p></div></div> : null}
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
