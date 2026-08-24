"use client";

import { createContext, useContext, useMemo, useState } from "react";
import {
  createMediaAssetViews,
  initialMediaAssets,
  initialMediaAssetVersions,
  initialMediaComments,
  initialMediaWorkspaceStorage,
  mediaManagedShadeRoots,
  mediaFolders,
  mediaSampleAudioUrl,
  mediaSampleVideoUrl,
  mediaStorageOptions,
  type MediaAsset,
  type MediaAssetComment,
  type MediaAssetVersion,
  type MediaAssetView,
  type MediaFolder,
  type MediaKind,
  type MediaStorageProvider,
  type MediaWorkspaceStorageSetting,
} from "@/data/media";

export type MediaUploadInput = {
  name: string;
  kind: MediaKind;
  sizeBytes: number;
  durationSeconds?: number;
  thumbnailUrl?: string;
  playbackUrl?: string;
  storageLocationId?: string;
  providerFileId?: string;
  sourceLocationLabel?: string;
  simulateFailure?: boolean;
};
type MediaLibraryContextValue = {
  assets: MediaAsset[];
  assetViews: MediaAssetView[];
  versions: MediaAssetVersion[];
  comments: MediaAssetComment[];
  folders: MediaFolder[];
  workspaceStorage: MediaWorkspaceStorageSetting;
  setWorkspaceStorageProvider: (provider: MediaStorageProvider) => void;
  createFolder: (projectId: string, parentId: string | null) => MediaFolder | null;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => boolean;
  moveFolder: (id: string, parentId: string | null) => boolean;
  renameAsset: (id: string, name: string) => void;
  addAssets: (projectId: string, folderId: string | null, files: MediaUploadInput[]) => string[];
  retryAssets: (ids: string[]) => void;
  moveAssets: (ids: string[], folderId: string | null) => void;
  archiveAssets: (ids: string[]) => void;
  restoreAssets: (ids: string[]) => void;
  deleteAssets: (ids: string[]) => void;
  addComment: (assetId: string, authorName: string, audience: MediaAssetComment["audience"], body: string) => void;
};

const MediaLibraryContext = createContext<MediaLibraryContextValue | null>(null);

export function MediaLibraryProvider({ children }: { children: React.ReactNode }) {
  const [assets, setAssets] = useState<MediaAsset[]>(initialMediaAssets);
  const [versions, setVersions] = useState<MediaAssetVersion[]>(initialMediaAssetVersions);
  const [comments, setComments] = useState<MediaAssetComment[]>(initialMediaComments);
  const [folders, setFolders] = useState<MediaFolder[]>(mediaFolders);
  const [workspaceStorage, setWorkspaceStorage] = useState<MediaWorkspaceStorageSetting>(initialMediaWorkspaceStorage);
  const assetViews = useMemo(() => createMediaAssetViews(assets, versions, comments), [assets, comments, versions]);

  const value = useMemo<MediaLibraryContextValue>(() => ({
    assets,
    assetViews,
    versions,
    comments,
    folders,
    workspaceStorage,
    setWorkspaceStorageProvider(provider) { setWorkspaceStorage((current) => ({ ...current, provider })); },
    createFolder(projectId, parentId) {
      if (parentId && folders.some((folder) => folder.id === parentId && folder.parentId !== null)) return null;
      const folder = { id: `folder-${Date.now()}`, projectId, parentId, name: "New folder" };
      setFolders((current) => [...current, folder]);
      return folder;
    },
    renameFolder(id, name) { setFolders((current) => current.map((folder) => folder.id === id ? { ...folder, name: name.trim() || folder.name } : folder)); },
    deleteFolder(id) {
      const isEmpty = !assets.some((asset) => asset.folderId === id && !asset.archivedAt) && !folders.some((folder) => folder.parentId === id);
      if (!isEmpty) return false;
      setFolders((current) => current.filter((folder) => folder.id !== id));
      return true;
    },
    moveFolder(id, parentId) {
      const folder = folders.find((candidate) => candidate.id === id);
      const parent = folders.find((candidate) => candidate.id === parentId);
      if (!folder || parentId === id || (parentId && folders.some((candidate) => candidate.parentId === id)) || (parentId && (!parent || parent.projectId !== folder.projectId || parent.parentId !== null))) return false;
      setFolders((current) => current.map((candidate) => candidate.id === id ? { ...candidate, parentId } : candidate));
      return true;
    },
    renameAsset(id, name) { setAssets((current) => current.map((asset) => asset.id === id ? { ...asset, name: name.trim() || asset.name } : asset)); },
    addAssets(projectId, folderId, files) {
      const stamp = Date.now();
      const configuredStorage = mediaStorageOptions.find((option) => option.provider === workspaceStorage.provider) ?? mediaStorageOptions[2];
      const newAssets: MediaAsset[] = files.map((file, index) => {
        const id = `upload-${stamp}-${index}`;
        return { id, projectId, folderId, name: file.name, kind: file.kind, collection: "media", status: "uploading", processingProgress: 12, currentVersionId: `${id}-v1`, transcriptStatus: "none" };
      });
      const newVersions: MediaAssetVersion[] = files.map((file, index) => {
        const assetId = `upload-${stamp}-${index}`;
        const storageLocationId = file.storageLocationId ?? configuredStorage.locationId;
        const identity = createUploadIdentity(storageLocationId, projectId, assetId);
        const isPlayable = file.kind === "video" || file.kind === "audio";
        return {
          id: `${assetId}-v1`,
          assetId,
          number: 1,
          uploadedAt: new Date().toISOString(),
          uploadedById: "tom-evans",
          sizeBytes: file.sizeBytes,
          durationSeconds: file.durationSeconds,
          thumbnailUrl: file.thumbnailUrl,
          playbackUrl: file.playbackUrl ?? (file.kind === "video" ? mediaSampleVideoUrl : file.kind === "audio" ? mediaSampleAudioUrl : undefined),
          muxPlaybackId: isPlayable ? `mux-playback-${assetId}` : undefined,
          storageLocationId,
          providerFileId: file.providerFileId ?? identity.providerFileId,
          sourceLocationLabel: file.sourceLocationLabel ?? identity.sourceLocationLabel,
          originalAvailable: true,
        };
      });
      const ids = newAssets.map((asset) => asset.id);
      setAssets((current) => [...newAssets, ...current]);
      setVersions((current) => [...newVersions, ...current]);
      scheduleProcessing(ids, files.map((file) => Boolean(file.simulateFailure)), setAssets);
      return ids;
    },
    retryAssets(ids) {
      const selected = new Set(ids);
      setAssets((current) => current.map((asset) => selected.has(asset.id) ? { ...asset, status: "stored", processingProgress: 48, processingError: undefined } : asset));
      window.setTimeout(() => setAssets((current) => current.map((asset) => selected.has(asset.id) ? { ...asset, status: "preparing", processingProgress: 76 } : asset)), 700);
      window.setTimeout(() => setAssets((current) => current.map((asset) => selected.has(asset.id) ? { ...asset, status: "ready", processingProgress: 100 } : asset)), 1700);
    },
    moveAssets(ids, folderId) { const selected = new Set(ids); setAssets((current) => current.map((asset) => selected.has(asset.id) ? { ...asset, folderId } : asset)); },
    archiveAssets(ids) { const selected = new Set(ids); setAssets((current) => current.map((asset) => selected.has(asset.id) ? { ...asset, archivedFolderId: asset.folderId, folderId: null, archivedAt: new Date().toISOString() } : asset)); },
    restoreAssets(ids) { const selected = new Set(ids); const folderIds = new Set(folders.map((folder) => folder.id)); setAssets((current) => current.map((asset) => selected.has(asset.id) ? { ...asset, folderId: asset.archivedFolderId && folderIds.has(asset.archivedFolderId) ? asset.archivedFolderId : null, archivedFolderId: undefined, archivedAt: undefined } : asset)); },
    deleteAssets(ids) { const selected = new Set(ids); setAssets((current) => current.filter((asset) => !selected.has(asset.id))); setVersions((current) => current.filter((version) => !selected.has(version.assetId))); setComments((current) => current.filter((comment) => !selected.has(comment.assetId))); },
    addComment(assetId, authorName, audience, body) { if (!body.trim()) return; setComments((current) => [...current, { id: `media-comment-${Date.now()}`, assetId, authorName, audience, body: body.trim(), createdAt: new Date().toISOString() }]); },
  }), [assetViews, assets, comments, folders, versions, workspaceStorage]);

  return <MediaLibraryContext.Provider value={value}>{children}</MediaLibraryContext.Provider>;
}

function scheduleProcessing(ids: string[], failures: boolean[], setAssets: React.Dispatch<React.SetStateAction<MediaAsset[]>>) {
  const selected = new Set(ids);
  window.setTimeout(() => setAssets((current) => current.map((asset) => selected.has(asset.id) ? { ...asset, status: "stored", processingProgress: 45 } : asset)), 700);
  window.setTimeout(() => setAssets((current) => current.map((asset) => selected.has(asset.id) ? { ...asset, status: "preparing", processingProgress: 72 } : asset)), 1500);
  window.setTimeout(() => setAssets((current) => current.map((asset) => {
    const index = ids.indexOf(asset.id);
    if (index < 0) return asset;
    return failures[index]
      ? { ...asset, status: "failed", processingProgress: 72, processingError: "Playback preparation failed" }
      : { ...asset, status: "ready", processingProgress: 100, processingError: undefined };
  })), 2800);
}

function createUploadIdentity(storageLocationId: string, projectId: string, assetId: string) {
  if (storageLocationId === "drive-main") return { providerFileId: `gdrive-file-${assetId}`, sourceLocationLabel: `My Drive / Brisk uploads / ${projectId}` };
  if (storageLocationId === "dropbox-main") return { providerFileId: `dbid:${assetId}`, sourceLocationLabel: `Dropbox / Brisk uploads / ${projectId}` };
  if (storageLocationId === "remote-studio-main") {
    const root = mediaManagedShadeRoots.find((candidate) => candidate.projectId === projectId);
    return { providerFileId: `shade-asset-${assetId}`, sourceLocationLabel: `${root?.displayLabel ?? projectId} / Managed project root` };
  }
  return { providerFileId: `r2-object-${assetId}`, sourceLocationLabel: `Brisk Storage / ${projectId}` };
}

export function useMediaLibrary() {
  const context = useContext(MediaLibraryContext);
  if (!context) throw new Error("useMediaLibrary must be used within MediaLibraryProvider");
  return context;
}
