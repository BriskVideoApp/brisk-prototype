import type { StageStatus } from "@/components/active-videos/types";
import type { ReviewComment } from "@/components/video-review/types";
import {
  scriptVersions,
  type ScriptMediaType,
  type ScriptRow,
  type ScriptVersion,
} from "@/data/script";

export type StoryboardImage = {
  id: string;
  source: ScriptMediaType;
  label: string;
  assetId?: string;
  sourceUrl?: string;
};

export type StoryboardFrame = {
  id: string;
  sourceScriptRowId?: string;
  words: string;
  visuals: string;
  durationSeconds: number;
  image: StoryboardImage | null;
  comments: ReviewComment[];
};

export type StoryboardVersion = {
  id: string;
  label: string;
  displayName?: string;
  snapshotName: string;
  sourceScriptVersionId: string;
  sourceScriptVersionLabel: string;
  approvedSnapshot: boolean;
  approvedAt?: string;
  approvedBy?: string;
  createdAt: string;
  createdBy: "Studio" | "Customer";
  frames: StoryboardFrame[];
};

export type StoryboardRecord = {
  projectId: string;
  status: StageStatus;
  currentVersionId: string;
  versions: StoryboardVersion[];
};

const sourceScriptVersion = getLatestApprovedScriptVersion();

export const initialStoryboardRecords: Record<string, StoryboardRecord> = {
  "notion-workflows": {
    projectId: "notion-workflows",
    status: {
      state: "done",
      daysAgo: 8,
      approvedAt: "31 Aug",
      approvedBy: "Avery Taylor",
    },
    currentVersionId: "notion-storyboard-v1",
    versions: [
      {
        id: "notion-storyboard-v1",
        label: "v1",
        snapshotName: "Storyboard v1 - Approved",
        sourceScriptVersionId: sourceScriptVersion.id,
        sourceScriptVersionLabel: sourceScriptVersion.label,
        approvedSnapshot: true,
        approvedAt: "31 Aug",
        approvedBy: "Avery Taylor",
        createdAt: "29 Aug",
        createdBy: "Studio",
        frames: createStoryboardFrames(sourceScriptVersion.rows).map((frame, index) => ({
          ...frame,
          image: index < 8
            ? {
                id: `notion-board-image-${index + 1}`,
                source: "library",
                label: index % 2 === 0 ? "Workflow builder capture" : "Title animation test",
                assetId: index % 2 === 0 ? "notion-01" : "notion-02",
              }
            : null,
          comments: index === 1
            ? [
                {
                  id: "storyboard-comment-notion-02",
                  authorId: "user-david",
                  visibility: "external",
                  createdAgo: "2d",
                  body: "Can we make the cursor movement clearer before the panel opens?",
                  resolved: false,
                  framePin: { x: 62, y: 44 },
                  replies: [],
                },
              ]
            : [],
        })),
      },
    ],
  },
};

export function getLatestApprovedScriptVersion() {
  return [...scriptVersions].reverse().find((version) => version.approvedSnapshot)
    ?? scriptVersions[scriptVersions.length - 1];
}

export function createStoryboardRecord(
  projectId: string,
  createdBy: StoryboardVersion["createdBy"],
  sourceVersion: ScriptVersion = getLatestApprovedScriptVersion(),
): StoryboardRecord {
  const versionId = `${projectId}-storyboard-v1-${Date.now()}`;
  return {
    projectId,
    status: { state: "in_progress", daysAgo: 0 },
    currentVersionId: versionId,
    versions: [
      {
        id: versionId,
        label: "v1",
        snapshotName: "Storyboard v1 - Current",
        sourceScriptVersionId: sourceVersion.id,
        sourceScriptVersionLabel: sourceVersion.label,
        approvedSnapshot: false,
        createdAt: "Just now",
        createdBy,
        frames: createStoryboardFrames(sourceVersion.rows),
      },
    ],
  };
}

export function createStoryboardFrames(rows: ScriptRow[]): StoryboardFrame[] {
  return rows.map((row, index) => ({
    id: `storyboard-frame-${row.id}-${index + 1}`,
    sourceScriptRowId: row.id,
    words: row.words,
    visuals: row.visuals,
    durationSeconds: row.durationSeconds,
    image: null,
    comments: [],
  }));
}

export function cloneStoryboardRecords(records: Record<string, StoryboardRecord>) {
  return structuredClone(records);
}
