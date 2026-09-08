"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { StageStatus } from "@/components/active-videos/types";
import type { ReviewComment } from "@/components/video-review/types";
import type { ScriptVersion } from "@/data/script";
import {
  cloneStoryboardRecords,
  createStoryboardRecord,
  initialStoryboardRecords,
  type StoryboardFrame,
  type StoryboardRecord,
  type StoryboardVersion,
} from "@/data/storyboard";

type StoryboardContextValue = {
  addFrame: (projectId: string) => void;
  approveStoryboard: (projectId: string, approvedBy: string) => void;
  createBlankVersion: (projectId: string, createdBy: StoryboardVersion["createdBy"]) => void;
  createStoryboard: (
    projectId: string,
    createdBy: StoryboardVersion["createdBy"],
    sourceVersion?: ScriptVersion,
  ) => void;
  deleteFrame: (projectId: string, frameId: string) => void;
  deleteVersion: (projectId: string, versionId: string) => void;
  duplicateVersion: (projectId: string, versionId: string, createdBy: StoryboardVersion["createdBy"]) => void;
  duplicateFrame: (projectId: string, frameId: string) => void;
  getStoryboard: (projectId: string) => StoryboardRecord | null;
  getStoryboardStatus: (projectId: string) => StageStatus;
  insertFrame: (projectId: string, frameId: string, position: "before" | "after") => void;
  makeEditableVersion: (projectId: string, createdBy: StoryboardVersion["createdBy"]) => void;
  reorderFrame: (
    projectId: string,
    frameId: string,
    targetFrameId: string,
    position: "before" | "after",
  ) => void;
  requestStoryboardReview: (projectId: string) => void;
  redoStoryboard: (projectId: string) => void;
  renameVersion: (projectId: string, versionId: string, displayName: string) => void;
  selectVersion: (projectId: string, versionId: string) => void;
  undoStoryboard: (projectId: string) => void;
  unapproveStoryboard: (projectId: string) => void;
  updateFrame: (projectId: string, frameId: string, update: (frame: StoryboardFrame) => StoryboardFrame) => void;
  updateFrameComments: (projectId: string, frameId: string, comments: ReviewComment[]) => void;
};

const storyboardStorageKey = "brisk-storyboards-v1";
const StoryboardContext = createContext<StoryboardContextValue | null>(null);

export function StoryboardProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<Record<string, StoryboardRecord>>(() => cloneStoryboardRecords(initialStoryboardRecords));
  const frameHistoryRef = useRef<Record<string, { past: StoryboardFrame[][]; future: StoryboardFrame[][] }>>({});

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storyboardStorageKey);
      if (stored) setRecords(JSON.parse(stored) as Record<string, StoryboardRecord>);
    } catch {
      // Prototype-only persistence falls back to the current session.
    }
  }, []);

  const commitRecords = useCallback((update: (current: Record<string, StoryboardRecord>) => Record<string, StoryboardRecord>) => {
    setRecords((current) => {
      const next = update(current);
      try {
        window.localStorage.setItem(storyboardStorageKey, JSON.stringify(next));
      } catch {
        // Prototype-only persistence falls back to the current session.
      }
      return next;
    });
  }, []);

  const updateCurrentVersion = useCallback((
    projectId: string,
    update: (version: StoryboardVersion) => StoryboardVersion,
  ) => {
    commitRecords((current) => {
      const record = current[projectId];
      if (!record) return current;
      const currentVersion = record.versions.find((version) => version.id === record.currentVersionId);
      if (!currentVersion) return current;
      const nextVersion = update(currentVersion);
      if (nextVersion === currentVersion) return current;
      const historyKey = `${projectId}:${currentVersion.id}`;
      const history = frameHistoryRef.current[historyKey] ?? { past: [], future: [] };
      frameHistoryRef.current[historyKey] = {
        past: [...history.past, structuredClone(currentVersion.frames)].slice(-50),
        future: [],
      };
      return {
        ...current,
        [projectId]: {
          ...record,
          status: record.status.state === "waiting" ? { state: "in_progress", daysAgo: 0 } : record.status,
          versions: record.versions.map((version) => version.id === record.currentVersionId ? nextVersion : version),
        },
      };
    });
  }, [commitRecords]);

  const updateFrame = useCallback((projectId: string, frameId: string, update: (frame: StoryboardFrame) => StoryboardFrame) => {
    updateCurrentVersion(projectId, (version) => ({
      ...version,
      frames: version.frames.map((frame) => frame.id === frameId ? update(frame) : frame),
    }));
  }, [updateCurrentVersion]);

  const value = useMemo<StoryboardContextValue>(() => ({
    addFrame(projectId) {
      updateCurrentVersion(projectId, (version) => ({
        ...version,
        frames: [...version.frames, createEmptyStoryboardFrame()],
      }));
    },
    approveStoryboard(projectId, approvedBy) {
      const approvedAt = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short" }).format(new Date());
      commitRecords((current) => {
        const record = current[projectId];
        if (!record) return current;
        return {
          ...current,
          [projectId]: {
            ...record,
            status: { state: "done", daysAgo: 0, approvedAt, approvedBy },
            versions: record.versions.map((version) => version.id === record.currentVersionId
              ? {
                  ...version,
                  approvedSnapshot: true,
                  approvedAt,
                  approvedBy,
                  snapshotName: `${version.label} - Approved`,
                }
              : {
                  ...version,
                  approvedSnapshot: false,
                  approvedAt: undefined,
                  approvedBy: undefined,
                }),
          },
        };
      });
    },
    createBlankVersion(projectId, createdBy) {
      commitRecords((current) => {
        const record = current[projectId];
        const sourceVersion = record?.versions.find((version) => version.id === record.currentVersionId);
        if (!record || !sourceVersion) return current;
        const label = getNextStoryboardVersionLabel(record.versions);
        const version: StoryboardVersion = {
          id: `${projectId}-storyboard-${label}-${Date.now()}`,
          label,
          snapshotName: `Storyboard ${label} - Current`,
          sourceScriptVersionId: sourceVersion.sourceScriptVersionId,
          sourceScriptVersionLabel: sourceVersion.sourceScriptVersionLabel,
          approvedSnapshot: false,
          createdAt: "Just now",
          createdBy,
          frames: [createEmptyStoryboardFrame()],
        };
        return {
          ...current,
          [projectId]: {
            ...record,
            status: { state: "in_progress", daysAgo: 0 },
            currentVersionId: version.id,
            versions: [...record.versions, version],
          },
        };
      });
    },
    createStoryboard(projectId, createdBy, sourceVersion) {
      commitRecords((current) => current[projectId]
        ? current
        : { ...current, [projectId]: createStoryboardRecord(projectId, createdBy, sourceVersion) });
    },
    deleteFrame(projectId, frameId) {
      updateCurrentVersion(projectId, (version) => ({
        ...version,
        frames: version.frames.filter((frame) => frame.id !== frameId),
      }));
    },
    deleteVersion(projectId, versionId) {
      commitRecords((current) => {
        const record = current[projectId];
        const version = record?.versions.find((item) => item.id === versionId);
        if (!record || !version || version.approvedSnapshot || record.versions.length <= 1) return current;
        const versionIndex = record.versions.findIndex((item) => item.id === versionId);
        const versions = record.versions.filter((item) => item.id !== versionId);
        const fallbackVersion = versions[Math.max(0, versionIndex - 1)] ?? versions[versions.length - 1];
        if (!fallbackVersion) return current;
        delete frameHistoryRef.current[`${projectId}:${versionId}`];
        return {
          ...current,
          [projectId]: {
            ...record,
            currentVersionId: fallbackVersion.id,
            status: fallbackVersion.approvedSnapshot
              ? {
                  state: "done",
                  daysAgo: 0,
                  approvedAt: fallbackVersion.approvedAt,
                  approvedBy: fallbackVersion.approvedBy,
                }
              : { state: "in_progress", daysAgo: 0 },
            versions,
          },
        };
      });
    },
    duplicateFrame(projectId, frameId) {
      updateCurrentVersion(projectId, (version) => {
        const frameIndex = version.frames.findIndex((frame) => frame.id === frameId);
        if (frameIndex < 0) return version;
        const frames = [...version.frames];
        frames.splice(frameIndex + 1, 0, {
          ...structuredClone(version.frames[frameIndex]),
          id: `storyboard-frame-copy-${Date.now()}`,
          sourceScriptRowId: undefined,
          comments: [],
        });
        return { ...version, frames };
      });
    },
    duplicateVersion(projectId, versionId, createdBy) {
      commitRecords((current) => {
        const record = current[projectId];
        const sourceVersion = record?.versions.find((version) => version.id === versionId);
        if (!record || !sourceVersion) return current;
        const label = getNextStoryboardVersionLabel(record.versions);
        const version: StoryboardVersion = {
          ...structuredClone(sourceVersion),
          id: `${projectId}-storyboard-${label}-${Date.now()}`,
          label,
          displayName: sourceVersion.displayName,
          snapshotName: `Storyboard ${label} - Current`,
          approvedSnapshot: false,
          approvedAt: undefined,
          approvedBy: undefined,
          createdAt: "Just now",
          createdBy,
        };
        return {
          ...current,
          [projectId]: {
            ...record,
            status: { state: "in_progress", daysAgo: 0 },
            currentVersionId: version.id,
            versions: [...record.versions, version],
          },
        };
      });
    },
    getStoryboard(projectId) {
      return records[projectId] ?? null;
    },
    getStoryboardStatus(projectId) {
      return records[projectId]?.status ?? { state: "not_started" };
    },
    insertFrame(projectId, frameId, position) {
      updateCurrentVersion(projectId, (version) => {
        const referenceIndex = version.frames.findIndex((frame) => frame.id === frameId);
        if (referenceIndex < 0) return version;
        const frames = [...version.frames];
        frames.splice(referenceIndex + (position === "after" ? 1 : 0), 0, createEmptyStoryboardFrame());
        return { ...version, frames };
      });
    },
    makeEditableVersion(projectId, createdBy) {
      commitRecords((current) => {
        const record = current[projectId];
        const selectedVersion = record?.versions.find((version) => version.id === record.currentVersionId);
        if (!record || !selectedVersion || !selectedVersion.approvedSnapshot) return current;
        const label = getNextStoryboardVersionLabel(record.versions);
        const version: StoryboardVersion = {
          ...structuredClone(selectedVersion),
          id: `${projectId}-storyboard-${label}-${Date.now()}`,
          label,
          snapshotName: `Storyboard ${label} - Current`,
          approvedSnapshot: false,
          approvedAt: undefined,
          approvedBy: undefined,
          createdAt: "Just now",
          createdBy,
        };
        return {
          ...current,
          [projectId]: {
            ...record,
            status: { state: "in_progress", daysAgo: 0 },
            currentVersionId: version.id,
            versions: [...record.versions, version],
          },
        };
      });
    },
    reorderFrame(projectId, frameId, targetFrameId, position) {
      updateCurrentVersion(projectId, (version) => {
        const movingFrame = version.frames.find((frame) => frame.id === frameId);
        if (!movingFrame || frameId === targetFrameId) return version;
        const frames = version.frames.filter((frame) => frame.id !== frameId);
        const targetIndex = frames.findIndex((frame) => frame.id === targetFrameId);
        if (targetIndex < 0) return version;
        frames.splice(targetIndex + (position === "after" ? 1 : 0), 0, movingFrame);
        return { ...version, frames };
      });
    },
    requestStoryboardReview(projectId) {
      commitRecords((current) => current[projectId]
        ? {
            ...current,
            [projectId]: {
              ...current[projectId],
              status: { state: "waiting", daysAgo: 0 },
            },
          }
        : current);
    },
    redoStoryboard(projectId) {
      commitRecords((current) => {
        const record = current[projectId];
        const version = record?.versions.find((item) => item.id === record.currentVersionId);
        if (!record || !version) return current;
        const historyKey = `${projectId}:${version.id}`;
        const history = frameHistoryRef.current[historyKey];
        const nextFrames = history?.future[0];
        if (!history || !nextFrames) return current;
        frameHistoryRef.current[historyKey] = {
          past: [...history.past, structuredClone(version.frames)].slice(-50),
          future: history.future.slice(1),
        };
        return {
          ...current,
          [projectId]: {
            ...record,
            status: { state: "in_progress", daysAgo: 0 },
            versions: record.versions.map((item) => item.id === version.id
              ? { ...item, frames: structuredClone(nextFrames) }
              : item),
          },
        };
      });
    },
    renameVersion(projectId, versionId, displayName) {
      const trimmedName = displayName.trim();
      if (!trimmedName) return;
      commitRecords((current) => {
        const record = current[projectId];
        if (!record?.versions.some((version) => version.id === versionId)) return current;
        return {
          ...current,
          [projectId]: {
            ...record,
            versions: record.versions.map((version) => version.id === versionId
              ? { ...version, displayName: trimmedName }
              : version),
          },
        };
      });
    },
    selectVersion(projectId, versionId) {
      commitRecords((current) => current[projectId]?.versions.some((version) => version.id === versionId)
        ? { ...current, [projectId]: { ...current[projectId], currentVersionId: versionId } }
        : current);
    },
    undoStoryboard(projectId) {
      commitRecords((current) => {
        const record = current[projectId];
        const version = record?.versions.find((item) => item.id === record.currentVersionId);
        if (!record || !version) return current;
        const historyKey = `${projectId}:${version.id}`;
        const history = frameHistoryRef.current[historyKey];
        const previousFrames = history?.past.at(-1);
        if (!history || !previousFrames) return current;
        frameHistoryRef.current[historyKey] = {
          past: history.past.slice(0, -1),
          future: [structuredClone(version.frames), ...history.future].slice(0, 50),
        };
        return {
          ...current,
          [projectId]: {
            ...record,
            status: { state: "in_progress", daysAgo: 0 },
            versions: record.versions.map((item) => item.id === version.id
              ? { ...item, frames: structuredClone(previousFrames) }
              : item),
          },
        };
      });
    },
    unapproveStoryboard(projectId) {
      commitRecords((current) => {
        const record = current[projectId];
        if (!record) return current;
        return {
          ...current,
          [projectId]: {
            ...record,
            status: { state: "in_progress", daysAgo: 0 },
            versions: record.versions.map((version) => version.id === record.currentVersionId
              ? { ...version, approvedSnapshot: false, approvedAt: undefined, approvedBy: undefined }
              : version),
          },
        };
      });
    },
    updateFrame,
    updateFrameComments(projectId, frameId, comments) {
      updateFrame(projectId, frameId, (frame) => ({ ...frame, comments }));
    },
  }), [commitRecords, records, updateCurrentVersion, updateFrame]);

  return <StoryboardContext.Provider value={value}>{children}</StoryboardContext.Provider>;
}

export function useStoryboard() {
  const context = useContext(StoryboardContext);
  if (!context) throw new Error("useStoryboard must be used within StoryboardProvider");
  return context;
}

function createEmptyStoryboardFrame(): StoryboardFrame {
  return {
    id: `storyboard-frame-new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    words: "New storyboard frame",
    visuals: "Describe the visual direction for this frame.",
    durationSeconds: 3,
    image: null,
    comments: [],
  };
}

function getNextStoryboardVersionLabel(versions: StoryboardVersion[]) {
  const nextNumber = versions.reduce((highest, version) => {
    const parsedNumber = Number(version.label.replace(/^v/iu, ""));
    return Number.isFinite(parsedNumber) ? Math.max(highest, parsedNumber) : highest;
  }, 0) + 1;
  return `v${nextNumber}`;
}
