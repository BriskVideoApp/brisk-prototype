import type { Project } from "@/components/active-videos/types";
import type { PrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { prototypeCustomerSlug } from "@/components/navigation/PrototypeRoleContext";
import { freelancerPreviewViewer, getFreelancerEngagements } from "@/data/freelancer-videos";
import type { MediaAssetView } from "@/data/media";

export type MediaCapabilities = {
  canUpload: boolean;
  canManageFolders: boolean;
  canMoveAssets: boolean;
  canArchive: boolean;
  canDelete: boolean;
  canComment: boolean;
  canCopyLink: boolean;
  canDownload: boolean;
  canViewStorage: boolean;
};

export function getMediaProjectsForRole(role: PrototypeRole, projects: Project[], allPages = false) {
  if (allPages || role === "Studio Staff") return projects;
  if (role === "Customer") return projects.filter((project) => project.clientId === prototypeCustomerSlug);
  const ids = new Set(getFreelancerEngagements(projects, freelancerPreviewViewer.id)
    .filter((engagement) => engagement.invitationStatus === "accepted")
    .map((engagement) => engagement.project.id));
  return projects.filter((project) => ids.has(project.id));
}

export function getMediaCapabilities(role: PrototypeRole, projectId: string | null, projects: Project[], allPages = false): MediaCapabilities {
  if (allPages || role === "Studio Staff") {
    return { canUpload: Boolean(projectId), canManageFolders: Boolean(projectId), canMoveAssets: Boolean(projectId), canArchive: true, canDelete: true, canComment: true, canCopyLink: true, canDownload: true, canViewStorage: true };
  }
  if (role === "Customer") {
    return { canUpload: false, canManageFolders: false, canMoveAssets: false, canArchive: false, canDelete: false, canComment: true, canCopyLink: true, canDownload: true, canViewStorage: false };
  }
  const engagement = projectId ? getFreelancerEngagements(projects, freelancerPreviewViewer.id)
    .find((candidate) => candidate.project.id === projectId && candidate.invitationStatus === "accepted") : undefined;
  return { canUpload: Boolean(engagement?.toolAccess.files), canManageFolders: false, canMoveAssets: false, canArchive: false, canDelete: false, canComment: true, canCopyLink: true, canDownload: true, canViewStorage: false };
}

export function formatMediaBytes(value: number) {
  if (value < 1_000) return `${value} B`;
  if (value < 1_000_000) return `${(value / 1_000).toFixed(1)} KB`;
  if (value < 1_000_000_000) return `${(value / 1_000_000).toFixed(1)} MB`;
  return `${(value / 1_000_000_000).toFixed(1)} GB`;
}

export function formatMediaDuration(value?: number) {
  if (value === undefined) return "";
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const seconds = Math.floor(value % 60);
  return hours > 0
    ? [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":")
    : [minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

export type MediaSort = "newest" | "oldest" | "name-asc" | "largest";
export function compareMediaAssets(left: MediaAssetView, right: MediaAssetView, sort: MediaSort) {
  if (sort === "oldest") return Date.parse(left.uploadedAt) - Date.parse(right.uploadedAt);
  if (sort === "name-asc") return left.name.localeCompare(right.name);
  if (sort === "largest") return right.sizeBytes - left.sizeBytes;
  return Date.parse(right.uploadedAt) - Date.parse(left.uploadedAt);
}
