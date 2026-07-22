export type MediaAsset = {
  id: string;
  projectId: string;
  folderId: string | null;
  name: string;
  kind: "video" | "audio" | "image" | "document" | "other";
  status: "uploading" | "ready" | "failed";
  uploadedAt: string;
  sizeLabel: string;
  durationLabel?: string;
  ownerName: string;
  transcriptStatus: "none" | "processing" | "ready";
  commentCount: number;
  linkedScriptRowId?: string;
  thumbnailUrl?: string;
};

export type MediaFolder = {
  id: string;
  projectId: string;
  parentId: string | null;
  name: string;
};

export type MediaTranscriptNote = {
  assetId: string;
  timecode: string;
  text: string;
};

export const mediaFolders: MediaFolder[] = [
  { id: "interviews", projectId: "loom-launch-film", parentId: null, name: "Customer interviews" },
  { id: "product-captures", projectId: "loom-launch-film", parentId: null, name: "Product captures" },
  { id: "day-one", projectId: "loom-launch-film", parentId: "product-captures", name: "Day one" },
  { id: "client-assets", projectId: "loom-launch-film", parentId: null, name: "Client supplied" },
];

const loomImage = "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=80";
const officeImage = "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=900&q=80";
const productImage = "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=80";
const detailImage = "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80";

export const mediaAssets: MediaAsset[] = [
  { id: "media-01", projectId: "loom-launch-film", folderId: "interviews", name: "Mia-interview-camera-a.mov", kind: "video", status: "ready", uploadedAt: "2026-07-08T14:24:00+10:00", sizeLabel: "4.8 GB", durationLabel: "18:42", ownerName: "Maddie Lee", transcriptStatus: "ready", commentCount: 4, linkedScriptRowId: "script-03", thumbnailUrl: loomImage },
  { id: "media-02", projectId: "loom-launch-film", folderId: "interviews", name: "Mia-interview-camera-b.mov", kind: "video", status: "ready", uploadedAt: "2026-07-08T14:21:00+10:00", sizeLabel: "3.9 GB", durationLabel: "18:39", ownerName: "Maddie Lee", transcriptStatus: "processing", commentCount: 0, thumbnailUrl: officeImage },
  { id: "media-03", projectId: "loom-launch-film", folderId: "interviews", name: "Mia-lapel-audio.wav", kind: "audio", status: "ready", uploadedAt: "2026-07-08T14:18:00+10:00", sizeLabel: "862.4 MB", durationLabel: "19:04", ownerName: "Sam Chen", transcriptStatus: "ready", commentCount: 2, linkedScriptRowId: "script-03" },
  { id: "media-04", projectId: "loom-launch-film", folderId: "day-one", name: "Dashboard-wide-take-03.mov", kind: "video", status: "ready", uploadedAt: "2026-07-08T12:41:00+10:00", sizeLabel: "2.2 GB", durationLabel: "04:18", ownerName: "Sam Chen", transcriptStatus: "none", commentCount: 0, linkedScriptRowId: "script-07", thumbnailUrl: productImage },
  { id: "media-05", projectId: "loom-launch-film", folderId: "day-one", name: "Sales-team-collaboration-01.mov", kind: "video", status: "ready", uploadedAt: "2026-07-08T12:12:00+10:00", sizeLabel: "1.7 GB", durationLabel: "03:06", ownerName: "Sam Chen", transcriptStatus: "processing", commentCount: 1, thumbnailUrl: detailImage },
  { id: "media-06", projectId: "loom-launch-film", folderId: "product-captures", name: "Pipeline-screen-recording.mp4", kind: "video", status: "uploading", uploadedAt: "2026-07-08T11:58:00+10:00", sizeLabel: "306.6 KB", durationLabel: "00:42", ownerName: "Tom Evans", transcriptStatus: "none", commentCount: 0, thumbnailUrl: productImage },
  { id: "media-07", projectId: "loom-launch-film", folderId: "client-assets", name: "Loom-wordmark-black.png", kind: "image", status: "ready", uploadedAt: "2026-07-07T16:30:00+10:00", sizeLabel: "184.2 KB", ownerName: "Avery Taylor", transcriptStatus: "none", commentCount: 0, thumbnailUrl: detailImage },
  { id: "media-08", projectId: "loom-launch-film", folderId: "client-assets", name: "Launch-campaign-key-art.jpg", kind: "image", status: "ready", uploadedAt: "2026-07-07T16:24:00+10:00", sizeLabel: "8.4 MB", ownerName: "Avery Taylor", transcriptStatus: "none", commentCount: 0, thumbnailUrl: loomImage },
  { id: "media-09", projectId: "loom-launch-film", folderId: "client-assets", name: "Brand-guidelines-2026.pdf", kind: "document", status: "ready", uploadedAt: "2026-07-07T16:18:00+10:00", sizeLabel: "12.7 MB", ownerName: "Avery Taylor", transcriptStatus: "none", commentCount: 0 },
  { id: "media-10", projectId: "loom-launch-film", folderId: "client-assets", name: "Sales-narrative-v4.docx", kind: "document", status: "ready", uploadedAt: "2026-07-07T15:54:00+10:00", sizeLabel: "922.8 KB", ownerName: "Tom Evans", transcriptStatus: "none", commentCount: 0 },
  { id: "media-11", projectId: "loom-launch-film", folderId: null, name: "Room-tone-studio.wav", kind: "audio", status: "ready", uploadedAt: "2026-07-06T17:06:00+10:00", sizeLabel: "48.6 MB", durationLabel: "02:10", ownerName: "Sam Chen", transcriptStatus: "none", commentCount: 0 },
  { id: "media-12", projectId: "loom-launch-film", folderId: null, name: "Loom-sonic-logo.wav", kind: "audio", status: "ready", uploadedAt: "2026-07-06T16:48:00+10:00", sizeLabel: "3.1 MB", durationLabel: "00:08", ownerName: "Maddie Lee", transcriptStatus: "none", commentCount: 0 },
  { id: "media-13", projectId: "loom-launch-film", folderId: "product-captures", name: "Feature-callouts.csv", kind: "document", status: "ready", uploadedAt: "2026-07-06T15:31:00+10:00", sizeLabel: "84.9 KB", ownerName: "Tom Evans", transcriptStatus: "none", commentCount: 0 },
  { id: "media-14", projectId: "loom-launch-film", folderId: null, name: "On-set-camera-report.xml", kind: "other", status: "ready", uploadedAt: "2026-07-06T14:02:00+10:00", sizeLabel: "241.3 KB", ownerName: "Sam Chen", transcriptStatus: "none", commentCount: 0 },
  { id: "media-15", projectId: "loom-launch-film", folderId: "day-one", name: "Office-establishing-wide.mov", kind: "video", status: "ready", uploadedAt: "2026-07-06T12:44:00+10:00", sizeLabel: "1.4 GB", durationLabel: "02:37", ownerName: "Maddie Lee", transcriptStatus: "processing", commentCount: 0, thumbnailUrl: officeImage },
];

export const mediaTranscriptNotes: MediaTranscriptNote[] = [
  { assetId: "media-01", timecode: "00:08", text: "The best sales conversations start with genuine curiosity." },
  { assetId: "media-01", timecode: "00:24", text: "Loom gives the whole team a clear view of what the customer needs." },
  { assetId: "media-01", timecode: "01:12", text: "We can share context quickly and keep momentum through every hand-off." },
  { assetId: "media-03", timecode: "00:08", text: "The best sales conversations start with genuine curiosity." },
  { assetId: "media-03", timecode: "00:24", text: "Loom gives the whole team a clear view of what the customer needs." },
  { assetId: "media-03", timecode: "01:12", text: "We can share context quickly and keep momentum through every hand-off." },
];
