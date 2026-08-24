export type MediaKind = "video" | "audio" | "image" | "document" | "other";
export type MediaAssetStatus = "uploading" | "stored" | "preparing" | "ready" | "failed";
export type MediaCollection = "media" | "masters";
export type MediaStorageProvider = "google-drive" | "dropbox" | "brisk-storage" | "remote-studio";
export type MediaStoragePlanId = "starter" | "pro" | "studio";

export type MediaAsset = {
  id: string;
  projectId: string;
  folderId: string | null;
  archivedFolderId?: string | null;
  name: string;
  kind: MediaKind;
  collection: MediaCollection;
  status: MediaAssetStatus;
  processingProgress?: number;
  processingError?: string;
  currentVersionId: string;
  transcriptStatus: "none" | "processing" | "ready";
  linkedScriptRowId?: string;
  archivedAt?: string;
};

export type MediaAssetVersion = {
  id: string;
  assetId: string;
  number: number;
  uploadedAt: string;
  uploadedById: string;
  sizeBytes: number;
  durationSeconds?: number;
  thumbnailUrl?: string;
  playbackUrl?: string;
  muxPlaybackId?: string;
  storageLocationId: string;
  providerFileId: string;
  sourceLocationLabel: string;
  originalAvailable: boolean;
};

export type MediaAssetView = MediaAsset & {
  uploadedAt: string;
  uploadedByName: string;
  sizeBytes: number;
  durationSeconds?: number;
  thumbnailUrl?: string;
  playbackUrl?: string;
  muxPlaybackId?: string;
  storageLocationId: string;
  providerFileId: string;
  sourceLocationLabel: string;
  originalAvailable: boolean;
  commentCount: number;
  versionCount: number;
};

export type MediaFolder = { id: string; projectId: string; parentId: string | null; name: string };
export type MediaTranscriptNote = { assetId: string; timecode: string; text: string };
export type MediaAssetComment = { id: string; assetId: string; authorName: string; audience: "internal" | "external"; body: string; createdAt: string; timecodeSeconds?: number };
export type MediaStorageLocation = { id: string; provider: MediaStorageProvider; label: string; helper: string; limitBytes?: number };
export type MediaWorkspaceStorageSetting = { provider: MediaStorageProvider; planId: MediaStoragePlanId };
export type MediaStoragePlan = { id: MediaStoragePlanId; label: string; includedBytes: number; exampleUsedBytes: number };
export type MediaStorageOption = { provider: MediaStorageProvider; label: string; locationId: string; helper: string };
export type MediaManagedShadeRoot = { projectId: string; rootId: string; displayLabel: string };
export type MediaCloudProvider = "google-drive" | "dropbox";
export type MediaCloudFile = { id: string; provider: MediaCloudProvider; name: string; kind: MediaKind; sizeBytes: number; durationSeconds?: number; modifiedLabel: string; sourcePath: string; ownerName: string; thumbnailUrl?: string; playbackUrl?: string; simulateFailure?: boolean };

export const mediaPeople: Record<string, string> = {
  "tom-evans": "Tom Evans",
  "maddie-lee": "Maddie Lee",
  "sam-chen": "Sam Chen",
  "avery-taylor": "Avery Taylor",
};

export const mediaStorageLocations: MediaStorageLocation[] = [
  { id: "brisk-main", provider: "brisk-storage", label: "Brisk Storage", helper: "Original stored in Brisk Storage.", limitBytes: 100_000_000_000 },
  { id: "drive-main", provider: "google-drive", label: "Google Drive", helper: "Original stored in your connected Google Drive." },
  { id: "dropbox-main", provider: "dropbox", label: "Dropbox", helper: "Original stored in your connected Dropbox." },
  { id: "remote-studio-main", provider: "remote-studio", label: "Remote Studio", helper: "Original stored in Remote Studio." },
];

export const mediaStoragePlans: MediaStoragePlan[] = [
  { id: "starter", label: "Starter", includedBytes: 25_000_000_000, exampleUsedBytes: 14_000_000_000 },
  { id: "pro", label: "Pro", includedBytes: 100_000_000_000, exampleUsedBytes: 86_000_000_000 },
  { id: "studio", label: "Studio", includedBytes: 250_000_000_000, exampleUsedBytes: 171_000_000_000 },
];

export const mediaStorageOptions: MediaStorageOption[] = [
  { provider: "google-drive", label: "Google Drive", locationId: "drive-main", helper: "New Brisk uploads route to your connected Google Drive. Existing files still require Add to Brisk." },
  { provider: "dropbox", label: "Dropbox", locationId: "dropbox-main", helper: "New Brisk uploads route to your connected Dropbox. Existing files still require Add to Brisk." },
  { provider: "brisk-storage", label: "Brisk Storage", locationId: "brisk-main", helper: "Brisk manages the original in Cloudflare R2 and prepares a separate playback asset." },
  { provider: "remote-studio", label: "Remote Studio", locationId: "remote-studio-main", helper: "Original stored in Remote Studio. Editors mount the managed Shade project root while Brisk playback stays consistent." },
];

export const initialMediaWorkspaceStorage: MediaWorkspaceStorageSetting = { provider: "brisk-storage", planId: "pro" };

export const mediaManagedShadeRoots: MediaManagedShadeRoot[] = [
  { projectId: "loom-launch-film", rootId: "shade-root-prj-loom-launch-film", displayLabel: "Loom Launch Film" },
  { projectId: "deel-customer-story", rootId: "shade-root-prj-deel-customer-story", displayLabel: "Deel Customer Story" },
  { projectId: "hims-product-education", rootId: "shade-root-prj-hims-product-education", displayLabel: "Hims Product Education" },
  { projectId: "notion-workflows", rootId: "shade-root-prj-notion-workflows", displayLabel: "Notion Workflow Demo" },
  { projectId: "openai-partner-update", rootId: "shade-root-prj-openai-partner-update", displayLabel: "OpenAI Partner Update" },
  { projectId: "posthog-onboarding", rootId: "shade-root-prj-posthog-onboarding", displayLabel: "PostHog Onboarding Film" },
  { projectId: "ramp-finance-recap", rootId: "shade-root-prj-ramp-finance-recap", displayLabel: "Ramp Finance Recap" },
  { projectId: "canva-brand-refresh", rootId: "shade-root-prj-canva-brand-refresh", displayLabel: "Canva Brand Refresh" },
  { projectId: "linear-roadmap-film", rootId: "shade-root-prj-linear-roadmap-film", displayLabel: "Linear Roadmap Film" },
  { projectId: "figma-config-highlights", rootId: "shade-root-prj-figma-config-highlights", displayLabel: "Figma Config Highlights" },
];

export const mediaFolders: MediaFolder[] = [
  { id: "interviews", projectId: "loom-launch-film", parentId: null, name: "Customer interviews" },
  { id: "product-captures", projectId: "loom-launch-film", parentId: null, name: "Product captures" },
  { id: "day-one", projectId: "loom-launch-film", parentId: "product-captures", name: "Day one" },
  { id: "client-assets", projectId: "loom-launch-film", parentId: null, name: "Client supplied" },
  { id: "deel-interviews", projectId: "deel-customer-story", parentId: null, name: "Interviews" },
  { id: "deel-broll", projectId: "deel-customer-story", parentId: null, name: "B-roll" },
  { id: "deel-sydney", projectId: "deel-customer-story", parentId: "deel-broll", name: "Sydney office" },
  { id: "hims-product", projectId: "hims-product-education", parentId: null, name: "Product footage" },
  { id: "hims-voiceover", projectId: "hims-product-education", parentId: null, name: "Voiceover" },
  { id: "notion-ui", projectId: "notion-workflows", parentId: null, name: "UI captures" },
  { id: "notion-motion", projectId: "notion-workflows", parentId: null, name: "Motion tests" },
  { id: "openai-interviews", projectId: "openai-partner-update", parentId: null, name: "Partner interviews" },
  { id: "posthog-recordings", projectId: "posthog-onboarding", parentId: null, name: "Screen recordings" },
];

const peopleImage = "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=80";
const officeImage = "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=900&q=80";
const productImage = "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=80";
const detailImage = "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80";
export const mediaSampleVideoUrl = "https://videos.pexels.com/video-files/853800/853800-hd_1920_1080_30fps.mp4";
export const mediaSampleAudioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

type Seed = Omit<MediaAsset, "currentVersionId"> & Omit<MediaAssetVersion, "id" | "assetId" | "number" | "providerFileId" | "sourceLocationLabel" | "originalAvailable"> & {
  versionNumber?: number;
  providerFileId?: string;
  sourceLocationLabel?: string;
  originalAvailable?: boolean;
};
const seeds: Seed[] = [
  { id: "media-01", projectId: "loom-launch-film", folderId: "interviews", name: "Mia-interview-camera-a.mov", kind: "video", collection: "media", status: "ready", transcriptStatus: "ready", linkedScriptRowId: "script-03", uploadedAt: "2026-07-08T14:24:00+10:00", uploadedById: "maddie-lee", sizeBytes: 4_800_000_000, durationSeconds: 1122, thumbnailUrl: peopleImage, playbackUrl: mediaSampleVideoUrl, storageLocationId: "brisk-main", versionNumber: 3 },
  { id: "media-02", projectId: "loom-launch-film", folderId: "interviews", name: "Mia-interview-camera-b.mov", kind: "video", collection: "media", status: "preparing", processingProgress: 72, transcriptStatus: "processing", uploadedAt: "2026-07-08T14:21:00+10:00", uploadedById: "maddie-lee", sizeBytes: 3_900_000_000, durationSeconds: 1119, thumbnailUrl: officeImage, playbackUrl: mediaSampleVideoUrl, storageLocationId: "brisk-main" },
  { id: "media-03", projectId: "loom-launch-film", folderId: "interviews", name: "Mia-lapel-audio.wav", kind: "audio", collection: "media", status: "ready", transcriptStatus: "ready", linkedScriptRowId: "script-03", uploadedAt: "2026-07-08T14:18:00+10:00", uploadedById: "sam-chen", sizeBytes: 862_400_000, durationSeconds: 1144, playbackUrl: mediaSampleAudioUrl, storageLocationId: "brisk-main" },
  { id: "media-04", projectId: "loom-launch-film", folderId: "day-one", name: "Dashboard-wide-take-03.mov", kind: "video", collection: "media", status: "ready", transcriptStatus: "none", linkedScriptRowId: "script-07", uploadedAt: "2026-07-08T12:41:00+10:00", uploadedById: "sam-chen", sizeBytes: 2_200_000_000, durationSeconds: 258, thumbnailUrl: productImage, playbackUrl: mediaSampleVideoUrl, storageLocationId: "brisk-main" },
  { id: "media-05", projectId: "loom-launch-film", folderId: "day-one", name: "Sales-team-collaboration-01.mov", kind: "video", collection: "media", status: "ready", transcriptStatus: "processing", uploadedAt: "2026-07-08T12:12:00+10:00", uploadedById: "sam-chen", sizeBytes: 1_700_000_000, durationSeconds: 186, thumbnailUrl: detailImage, playbackUrl: mediaSampleVideoUrl, storageLocationId: "brisk-main" },
  { id: "media-06", projectId: "loom-launch-film", folderId: "product-captures", name: "Pipeline-screen-recording.mp4", kind: "video", collection: "media", status: "uploading", processingProgress: 28, transcriptStatus: "none", uploadedAt: "2026-07-08T11:58:00+10:00", uploadedById: "tom-evans", sizeBytes: 306_600, durationSeconds: 42, thumbnailUrl: productImage, storageLocationId: "brisk-main" },
  { id: "media-07", projectId: "loom-launch-film", folderId: "client-assets", name: "Loom-wordmark-black.png", kind: "image", collection: "media", status: "ready", transcriptStatus: "none", uploadedAt: "2026-07-07T16:30:00+10:00", uploadedById: "avery-taylor", sizeBytes: 184_200, thumbnailUrl: detailImage, storageLocationId: "drive-main", providerFileId: "gdrive-file-01HZZP7K4M", sourceLocationLabel: "My Drive / Loom launch / Brand" },
  { id: "media-08", projectId: "loom-launch-film", folderId: "client-assets", name: "Launch-campaign-key-art.jpg", kind: "image", collection: "media", status: "ready", transcriptStatus: "none", uploadedAt: "2026-07-07T16:24:00+10:00", uploadedById: "avery-taylor", sizeBytes: 8_400_000, thumbnailUrl: peopleImage, storageLocationId: "drive-main", providerFileId: "gdrive-file-01HZZP8C7A", sourceLocationLabel: "My Drive / Loom launch / Brand" },
  { id: "media-09", projectId: "loom-launch-film", folderId: "client-assets", name: "Brand-guidelines-2026.pdf", kind: "document", collection: "media", status: "ready", transcriptStatus: "none", uploadedAt: "2026-07-07T16:18:00+10:00", uploadedById: "avery-taylor", sizeBytes: 12_700_000, storageLocationId: "drive-main", providerFileId: "gdrive-file-01HZZP9D2B", sourceLocationLabel: "Shared with me / Loom Brand" },
  { id: "media-10", projectId: "loom-launch-film", folderId: null, name: "Room-tone-studio.wav", kind: "audio", collection: "media", status: "ready", transcriptStatus: "none", uploadedAt: "2026-07-06T17:06:00+10:00", uploadedById: "sam-chen", sizeBytes: 48_600_000, durationSeconds: 130, playbackUrl: mediaSampleAudioUrl, storageLocationId: "brisk-main" },
  { id: "media-16", projectId: "loom-launch-film", folderId: "interviews", name: "Avery-customer-interview.mov", kind: "video", collection: "media", status: "ready", transcriptStatus: "ready", uploadedAt: "2026-07-08T13:52:00+10:00", uploadedById: "maddie-lee", sizeBytes: 2_800_000_000, durationSeconds: 736, thumbnailUrl: officeImage, playbackUrl: mediaSampleVideoUrl, storageLocationId: "brisk-main" },
  { id: "media-17", projectId: "loom-launch-film", folderId: "interviews", name: "Care-team-roundtable.wav", kind: "audio", collection: "media", status: "ready", transcriptStatus: "ready", uploadedAt: "2026-07-08T13:28:00+10:00", uploadedById: "sam-chen", sizeBytes: 624_700_000, durationSeconds: 522, playbackUrl: mediaSampleAudioUrl, storageLocationId: "brisk-main" },
  { id: "media-master-01", projectId: "loom-launch-film", folderId: null, name: "Loom-launch-film-master-v6.mp4", kind: "video", collection: "masters", status: "ready", transcriptStatus: "ready", uploadedAt: "2026-08-03T10:12:00+10:00", uploadedById: "maddie-lee", sizeBytes: 1_900_000_000, durationSeconds: 126, thumbnailUrl: peopleImage, playbackUrl: mediaSampleVideoUrl, storageLocationId: "brisk-main" },
  { id: "media-archived-01", projectId: "loom-launch-film", folderId: null, archivedFolderId: "day-one", archivedAt: "2026-08-05T09:00:00+10:00", name: "Dashboard-wide-take-01.mov", kind: "video", collection: "media", status: "ready", transcriptStatus: "none", uploadedAt: "2026-07-05T12:00:00+10:00", uploadedById: "sam-chen", sizeBytes: 1_600_000_000, durationSeconds: 241, thumbnailUrl: productImage, storageLocationId: "brisk-main" },
  { id: "deel-01", projectId: "deel-customer-story", folderId: "deel-interviews", name: "Deel-founder-interview.mov", kind: "video", collection: "media", status: "ready", transcriptStatus: "ready", uploadedAt: "2026-07-28T10:20:00+10:00", uploadedById: "maddie-lee", sizeBytes: 3_200_000_000, durationSeconds: 948, thumbnailUrl: officeImage, playbackUrl: mediaSampleVideoUrl, storageLocationId: "dropbox-main", providerFileId: "dbid:AADeelFounder01", sourceLocationLabel: "Dropbox / Deel / Interviews" },
  { id: "deel-02", projectId: "deel-customer-story", folderId: "deel-sydney", name: "Sydney-office-b-roll.mov", kind: "video", collection: "media", status: "ready", transcriptStatus: "none", uploadedAt: "2026-07-27T14:30:00+10:00", uploadedById: "sam-chen", sizeBytes: 2_700_000_000, durationSeconds: 386, thumbnailUrl: detailImage, playbackUrl: mediaSampleVideoUrl, storageLocationId: "dropbox-main", providerFileId: "dbid:AADeelSydney02", sourceLocationLabel: "Dropbox / Deel / Shoot day one" },
  { id: "deel-master", projectId: "deel-customer-story", folderId: null, name: "Deel-customer-story-master.mp4", kind: "video", collection: "masters", status: "ready", transcriptStatus: "ready", uploadedAt: "2026-08-02T15:00:00+10:00", uploadedById: "maddie-lee", sizeBytes: 1_400_000_000, durationSeconds: 92, thumbnailUrl: officeImage, playbackUrl: mediaSampleVideoUrl, storageLocationId: "brisk-main" },
  { id: "hims-01", projectId: "hims-product-education", folderId: "hims-product", name: "Product-application-close-up.mov", kind: "video", collection: "media", status: "ready", transcriptStatus: "none", uploadedAt: "2026-07-24T11:00:00+10:00", uploadedById: "sam-chen", sizeBytes: 2_100_000_000, durationSeconds: 304, thumbnailUrl: productImage, playbackUrl: mediaSampleVideoUrl, storageLocationId: "brisk-main" },
  { id: "hims-02", projectId: "hims-product-education", folderId: "hims-voiceover", name: "Approved-voiceover-v2.wav", kind: "audio", collection: "media", status: "ready", transcriptStatus: "ready", uploadedAt: "2026-07-23T16:40:00+10:00", uploadedById: "maddie-lee", sizeBytes: 128_000_000, durationSeconds: 188, playbackUrl: mediaSampleAudioUrl, storageLocationId: "brisk-main" },
  { id: "notion-01", projectId: "notion-workflows", folderId: "notion-ui", name: "Workflow-builder-capture.mp4", kind: "video", collection: "media", status: "ready", transcriptStatus: "none", uploadedAt: "2026-07-20T13:25:00+10:00", uploadedById: "tom-evans", sizeBytes: 890_000_000, durationSeconds: 154, thumbnailUrl: productImage, playbackUrl: mediaSampleVideoUrl, storageLocationId: "drive-main", providerFileId: "gdrive-file-notion-workflow-01", sourceLocationLabel: "My Drive / Notion / UI captures" },
  { id: "notion-02", projectId: "notion-workflows", folderId: "notion-motion", name: "Title-animation-test.mov", kind: "video", collection: "media", status: "ready", transcriptStatus: "none", uploadedAt: "2026-07-19T09:18:00+10:00", uploadedById: "maddie-lee", sizeBytes: 640_000_000, durationSeconds: 38, thumbnailUrl: detailImage, playbackUrl: mediaSampleVideoUrl, storageLocationId: "remote-studio-main", providerFileId: "shade-asset-notion-title-02", sourceLocationLabel: "Notion Workflow Demo / Motion tests" },
  { id: "openai-01", projectId: "openai-partner-update", folderId: "openai-interviews", name: "Partner-interview-camera-a.mov", kind: "video", collection: "media", status: "ready", transcriptStatus: "ready", uploadedAt: "2026-07-18T11:10:00+10:00", uploadedById: "sam-chen", sizeBytes: 4_100_000_000, durationSeconds: 1218, thumbnailUrl: peopleImage, playbackUrl: mediaSampleVideoUrl, storageLocationId: "dropbox-main", providerFileId: "dbid:AAOpenAIPartner01", sourceLocationLabel: "Dropbox / OpenAI / Partner interviews" },
  { id: "posthog-01", projectId: "posthog-onboarding", folderId: "posthog-recordings", name: "Onboarding-flow-capture.mp4", kind: "video", collection: "media", status: "ready", transcriptStatus: "none", uploadedAt: "2026-07-16T15:42:00+10:00", uploadedById: "tom-evans", sizeBytes: 720_000_000, durationSeconds: 196, thumbnailUrl: productImage, playbackUrl: mediaSampleVideoUrl, storageLocationId: "drive-main", providerFileId: "gdrive-file-posthog-onboarding-01", sourceLocationLabel: "My Drive / PostHog / Screen recordings" },
  { id: "media-failed-01", projectId: "loom-launch-film", folderId: "product-captures", name: "Product-demo-playback-test.mov", kind: "video", collection: "media", status: "failed", processingProgress: 68, processingError: "Playback preparation failed", transcriptStatus: "none", uploadedAt: "2026-08-19T10:44:00+10:00", uploadedById: "tom-evans", sizeBytes: 1_180_000_000, durationSeconds: 178, thumbnailUrl: productImage, playbackUrl: mediaSampleVideoUrl, storageLocationId: "brisk-main" },
  { id: "media-stored-01", projectId: "deel-customer-story", folderId: "deel-broll", name: "Office-arrivals-camera-b.mov", kind: "video", collection: "media", status: "stored", processingProgress: 48, transcriptStatus: "none", uploadedAt: "2026-08-19T10:22:00+10:00", uploadedById: "sam-chen", sizeBytes: 2_340_000_000, durationSeconds: 312, thumbnailUrl: officeImage, playbackUrl: mediaSampleVideoUrl, storageLocationId: "dropbox-main", providerFileId: "dbid:AADeelArrivals03", sourceLocationLabel: "Dropbox / Deel / B-roll" },
  { id: "media-missing-original", projectId: "figma-config-highlights", folderId: null, name: "Config-keynote-selects.mov", kind: "video", collection: "media", status: "ready", transcriptStatus: "ready", uploadedAt: "2026-08-18T15:14:00+10:00", uploadedById: "maddie-lee", sizeBytes: 3_480_000_000, durationSeconds: 688, thumbnailUrl: peopleImage, playbackUrl: mediaSampleVideoUrl, storageLocationId: "drive-main", providerFileId: "gdrive-file-config-keynote-01", sourceLocationLabel: "My Drive / Figma Config / Keynote", originalAvailable: false },
  { id: "ramp-01", projectId: "ramp-finance-recap", folderId: null, name: "Finance-team-roundtable.mov", kind: "video", collection: "media", status: "ready", transcriptStatus: "ready", uploadedAt: "2026-08-17T11:05:00+10:00", uploadedById: "sam-chen", sizeBytes: 3_760_000_000, durationSeconds: 1042, thumbnailUrl: peopleImage, playbackUrl: mediaSampleVideoUrl, storageLocationId: "remote-studio-main", providerFileId: "shade-asset-ramp-roundtable-01", sourceLocationLabel: "Ramp Finance Recap / Interviews" },
  { id: "ramp-02", projectId: "ramp-finance-recap", folderId: null, name: "Q2-finance-summary.pdf", kind: "document", collection: "media", status: "ready", transcriptStatus: "none", uploadedAt: "2026-08-17T10:18:00+10:00", uploadedById: "tom-evans", sizeBytes: 16_800_000, storageLocationId: "remote-studio-main", providerFileId: "shade-asset-ramp-summary-02", sourceLocationLabel: "Ramp Finance Recap / Client supplied" },
  { id: "canva-01", projectId: "canva-brand-refresh", folderId: null, name: "Canva-brand-colour-study.png", kind: "image", collection: "media", status: "ready", transcriptStatus: "none", uploadedAt: "2026-08-16T14:50:00+10:00", uploadedById: "maddie-lee", sizeBytes: 9_800_000, thumbnailUrl: detailImage, storageLocationId: "drive-main", providerFileId: "gdrive-file-canva-colour-01", sourceLocationLabel: "My Drive / Canva / Brand assets" },
  { id: "canva-02", projectId: "canva-brand-refresh", folderId: null, name: "Designer-profile-b-roll.mov", kind: "video", collection: "media", status: "ready", transcriptStatus: "none", uploadedAt: "2026-08-16T13:42:00+10:00", uploadedById: "sam-chen", sizeBytes: 2_240_000_000, durationSeconds: 244, thumbnailUrl: officeImage, playbackUrl: mediaSampleVideoUrl, storageLocationId: "dropbox-main", providerFileId: "dbid:AACanvaDesigner02", sourceLocationLabel: "Dropbox / Canva / B-roll" },
  { id: "linear-01", projectId: "linear-roadmap-film", folderId: null, name: "Roadmap-product-capture.mp4", kind: "video", collection: "media", status: "ready", transcriptStatus: "none", uploadedAt: "2026-08-15T16:36:00+10:00", uploadedById: "tom-evans", sizeBytes: 980_000_000, durationSeconds: 206, thumbnailUrl: productImage, playbackUrl: mediaSampleVideoUrl, storageLocationId: "brisk-main" },
  { id: "figma-01", projectId: "figma-config-highlights", folderId: null, name: "Config-stage-reference.jpg", kind: "image", collection: "media", status: "ready", transcriptStatus: "none", uploadedAt: "2026-08-15T09:12:00+10:00", uploadedById: "maddie-lee", sizeBytes: 12_400_000, thumbnailUrl: detailImage, storageLocationId: "remote-studio-main", providerFileId: "shade-asset-figma-stage-01", sourceLocationLabel: "Figma Config Highlights / References" },
  { id: "media-archived-02", projectId: "deel-customer-story", folderId: null, archivedFolderId: "deel-broll", archivedAt: "2026-08-14T13:30:00+10:00", name: "Sydney-office-b-roll-take-01.mov", kind: "video", collection: "media", status: "ready", transcriptStatus: "none", uploadedAt: "2026-07-26T15:02:00+10:00", uploadedById: "sam-chen", sizeBytes: 2_180_000_000, durationSeconds: 302, thumbnailUrl: officeImage, playbackUrl: mediaSampleVideoUrl, storageLocationId: "dropbox-main", providerFileId: "dbid:AADeelArchived01", sourceLocationLabel: "Dropbox / Deel / B-roll" },
  { id: "media-archived-03", projectId: "notion-workflows", folderId: null, archivedFolderId: "notion-motion", archivedAt: "2026-08-13T11:20:00+10:00", name: "Title-animation-test-v1.mov", kind: "video", collection: "media", status: "ready", transcriptStatus: "none", uploadedAt: "2026-07-18T09:18:00+10:00", uploadedById: "maddie-lee", sizeBytes: 612_000_000, durationSeconds: 36, thumbnailUrl: detailImage, playbackUrl: mediaSampleVideoUrl, storageLocationId: "remote-studio-main", providerFileId: "shade-asset-notion-title-v1", sourceLocationLabel: "Notion Workflow Demo / Motion tests" },
];

export const initialMediaAssets: MediaAsset[] = seeds.map(({
  uploadedAt: _uploadedAt,
  uploadedById: _uploadedById,
  sizeBytes: _sizeBytes,
  durationSeconds: _durationSeconds,
  thumbnailUrl: _thumbnailUrl,
  playbackUrl: _playbackUrl,
  muxPlaybackId: _muxPlaybackId,
  storageLocationId: _storageLocationId,
  providerFileId: _providerFileId,
  sourceLocationLabel: _sourceLocationLabel,
  originalAvailable: _originalAvailable,
  versionNumber = 1,
  ...asset
}) => ({ ...asset, currentVersionId: `${asset.id}-v${versionNumber}` }));
export const initialMediaAssetVersions: MediaAssetVersion[] = [
  ...seeds.map(({ id, projectId, kind, uploadedAt, uploadedById, sizeBytes, durationSeconds, thumbnailUrl, playbackUrl, muxPlaybackId, storageLocationId, providerFileId, sourceLocationLabel, originalAvailable, versionNumber = 1 }) => {
    const identity = getSourceIdentity(storageLocationId, projectId, id);
    return {
      id: `${id}-v${versionNumber}`,
      assetId: id,
      number: versionNumber,
      uploadedAt,
      uploadedById,
      sizeBytes,
      durationSeconds,
      thumbnailUrl,
      playbackUrl,
      muxPlaybackId: muxPlaybackId ?? (kind === "video" || kind === "audio" ? `mux-playback-${id}` : undefined),
      storageLocationId,
      providerFileId: providerFileId ?? identity.providerFileId,
      sourceLocationLabel: sourceLocationLabel ?? identity.sourceLocationLabel,
      originalAvailable: originalAvailable ?? true,
    };
  }),
  { id: "media-01-v2", assetId: "media-01", number: 2, uploadedAt: "2026-07-07T15:10:00+10:00", uploadedById: "maddie-lee", sizeBytes: 4_700_000_000, durationSeconds: 1117, thumbnailUrl: peopleImage, playbackUrl: mediaSampleVideoUrl, muxPlaybackId: "mux-playback-media-01-v2", storageLocationId: "brisk-main", providerFileId: "r2-object-loom-media-01-v2", sourceLocationLabel: "Brisk Storage / Loom Launch Film", originalAvailable: true },
  { id: "media-01-v1", assetId: "media-01", number: 1, uploadedAt: "2026-07-06T17:40:00+10:00", uploadedById: "sam-chen", sizeBytes: 4_600_000_000, durationSeconds: 1110, thumbnailUrl: peopleImage, playbackUrl: mediaSampleVideoUrl, muxPlaybackId: "mux-playback-media-01-v1", storageLocationId: "brisk-main", providerFileId: "r2-object-loom-media-01-v1", sourceLocationLabel: "Brisk Storage / Loom Launch Film", originalAvailable: true },
];

export const initialMediaComments: MediaAssetComment[] = [
  { id: "comment-01", assetId: "media-01", authorName: "Maddie Lee", audience: "internal", body: "This is the strongest take. Keep the pause before the product reveal.", timecodeSeconds: 24, createdAt: "2026-07-09T09:30:00+10:00" },
  { id: "comment-02", assetId: "media-01", authorName: "Avery Taylor", audience: "external", body: "The customer story lands clearly here. Please hold on the final line.", timecodeSeconds: 72, createdAt: "2026-07-09T11:20:00+10:00" },
  { id: "comment-03", assetId: "media-03", authorName: "Sam Chen", audience: "internal", body: "Clean audio from this point onwards.", timecodeSeconds: 8, createdAt: "2026-07-09T09:40:00+10:00" },
];

export function createMediaAssetViews(assets: MediaAsset[], versions: MediaAssetVersion[], comments: MediaAssetComment[]): MediaAssetView[] {
  return assets.flatMap((asset) => {
    const assetVersions = versions.filter((version) => version.assetId === asset.id);
    const current = assetVersions.find((version) => version.id === asset.currentVersionId) ?? assetVersions.toSorted((a, b) => b.number - a.number)[0];
    if (!current) return [];
    return [{ ...asset, uploadedAt: current.uploadedAt, uploadedByName: mediaPeople[current.uploadedById] ?? "Brisk user", sizeBytes: current.sizeBytes, durationSeconds: current.durationSeconds, thumbnailUrl: current.thumbnailUrl, playbackUrl: current.playbackUrl, muxPlaybackId: current.muxPlaybackId, storageLocationId: current.storageLocationId, providerFileId: current.providerFileId, sourceLocationLabel: current.sourceLocationLabel, originalAvailable: current.originalAvailable, commentCount: comments.filter((comment) => comment.assetId === asset.id).length, versionCount: assetVersions.length }];
  });
}

// Compatibility view for Script, Shoot, Chat, Transcript and print consumers.
export const mediaAssets: MediaAssetView[] = createMediaAssetViews(initialMediaAssets, initialMediaAssetVersions, initialMediaComments);

export const mediaCloudFiles: MediaCloudFile[] = [
  { id: "drive-01", provider: "google-drive", name: "Founder-interview-selects.mov", kind: "video", sizeBytes: 2_800_000_000, durationSeconds: 768, modifiedLabel: "Today, 9:42am", sourcePath: "My Drive / Loom launch", ownerName: "Maddie Lee", thumbnailUrl: peopleImage, playbackUrl: mediaSampleVideoUrl },
  { id: "drive-02", provider: "google-drive", name: "Product-demo-clean.mp4", kind: "video", sizeBytes: 1_400_000_000, durationSeconds: 316, modifiedLabel: "Yesterday", sourcePath: "My Drive / Loom launch / Product", ownerName: "Sam Chen", thumbnailUrl: productImage, playbackUrl: mediaSampleVideoUrl },
  { id: "drive-03", provider: "google-drive", name: "Customer-story-room-tone.wav", kind: "audio", sizeBytes: 86_200_000, durationSeconds: 222, modifiedLabel: "Yesterday", sourcePath: "Shared with me", ownerName: "Avery Taylor", playbackUrl: mediaSampleAudioUrl },
  { id: "dropbox-01", provider: "dropbox", name: "Office-b-roll-camera-a.mov", kind: "video", sizeBytes: 3_600_000_000, durationSeconds: 561, modifiedLabel: "Today, 10:06am", sourcePath: "Dropbox / Loom / Shoot day one", ownerName: "Sam Chen", thumbnailUrl: officeImage, playbackUrl: mediaSampleVideoUrl },
  { id: "dropbox-02", provider: "dropbox", name: "Loom-brand-assets.zip", kind: "other", sizeBytes: 224_600_000, modifiedLabel: "31 Jul 2026", sourcePath: "Dropbox / Client supplied", ownerName: "Avery Taylor" },
  { id: "dropbox-failed", provider: "dropbox", name: "Campaign-cut-needs-retry.mov", kind: "video", sizeBytes: 1_120_000_000, durationSeconds: 148, modifiedLabel: "30 Jul 2026", sourcePath: "Dropbox / Loom / Review exports", ownerName: "Maddie Lee", thumbnailUrl: detailImage, playbackUrl: mediaSampleVideoUrl, simulateFailure: true },
];

function getSourceIdentity(storageLocationId: string, projectId: string, assetId: string) {
  if (storageLocationId === "drive-main") return { providerFileId: `gdrive-file-${assetId}`, sourceLocationLabel: `My Drive / ${projectId}` };
  if (storageLocationId === "dropbox-main") return { providerFileId: `dbid:${assetId}`, sourceLocationLabel: `Dropbox / ${projectId}` };
  if (storageLocationId === "remote-studio-main") return { providerFileId: `shade-asset-${assetId}`, sourceLocationLabel: `${projectId} / Managed project root` };
  return { providerFileId: `r2-object-${assetId}`, sourceLocationLabel: `Brisk Storage / ${projectId}` };
}

export const mediaTranscriptNotes: MediaTranscriptNote[] = [
  { assetId: "media-01", timecode: "00:08", text: "The best sales conversations start with genuine curiosity." },
  { assetId: "media-01", timecode: "00:24", text: "Loom gives the whole team a clear view of what the customer needs." },
  { assetId: "media-01", timecode: "01:12", text: "We can share context quickly and keep momentum through every hand-off." },
  { assetId: "media-03", timecode: "00:08", text: "The best sales conversations start with genuine curiosity." },
  { assetId: "media-03", timecode: "00:24", text: "Loom gives the whole team a clear view of what the customer needs." },
  { assetId: "media-03", timecode: "01:12", text: "We can share context quickly and keep momentum through every hand-off." },
  { assetId: "media-16", timecode: "00:18", text: "The workflow is much clearer when everyone can see the latest context." },
  { assetId: "media-17", timecode: "00:32", text: "We use the shared recording to keep the whole care team aligned." },
];
