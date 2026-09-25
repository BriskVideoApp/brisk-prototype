"use client";

import { DsIcon } from "@/components/video-review/DsIcon";
import type { ProjectVideoType, StageKey, StageStatus } from "@/components/active-videos/types";
import { useProjectFlow } from "@/components/project/ProjectFlowContext";
import { useProjectStageStatus } from "@/components/project/ProjectStageStatusContext";
import { useMediaLibrary } from "@/components/media/MediaLibraryContext";
import { useStoryboard } from "@/components/storyboard/StoryboardContext";
import { getProjectStageHref } from "@/data/project-fixtures";
import {
  getProductionFlowStageDefinition,
  type ProductionFlowStageKey,
} from "@/data/production-flow";

type StageIconName = Parameters<typeof DsIcon>[0]["name"];

export const stageOrder: Array<{ key: StageKey; label: string; icon: StageIconName }> = [
  { key: "brief", label: "Brief", icon: "clipboard-text" },
  { key: "script", label: "Script", icon: "pen-nib" },
  { key: "shoot", label: "Shoot", icon: "video-camera-ds" },
  { key: "media", label: "Media", icon: "image-square" },
  { key: "edit", label: "Edit", icon: "scissors" },
  { key: "masters", label: "Masters", icon: "film-strip" },
];

export function StageProgress({
  projectId,
  projectName,
  stages,
  studioName,
  customerName,
  videoType = "liveAction",
  compact = false,
  showAge = true,
}: {
  projectId: string;
  projectName: string;
  stages: Record<StageKey, StageStatus>;
  studioName: string;
  customerName: string;
  videoType?: ProjectVideoType;
  compact?: boolean;
  showAge?: boolean;
}) {
  const { getProjectStages } = useProjectStageStatus();
  const { assetViews } = useMediaLibrary();
  const { getStoryboardStatus } = useStoryboard();
  const { getProjectFlow } = useProjectFlow();
  const currentStages = getProjectStages({ id: projectId, stages });
  const flow = getProjectFlow({ id: projectId, videoType });
  const visibleStages = flow.stages.map((stage) => getProductionFlowStageDefinition(stage, flow.postProductionTerm));
  const mediaStage = { key: "media" as const, label: "Media", icon: "image-square" as const };
  const mediaCount = assetViews.filter((asset) => asset.projectId === projectId && !asset.archivedAt && asset.collection === "media").length;

  return (
    <div
      className={`stage-track ${compact ? "stage-track-compact" : ""}`}
      aria-label={`${projectName} stage progress`}
    >
      {visibleStages.map((stage, index) => (
        <StageChip
          key={stage.key}
          stage={stage}
          status={stage.key === "storyboard" ? getStoryboardStatus(projectId) : currentStages[stage.key]}
          projectId={projectId}
          studioName={studioName}
          customerName={customerName}
          showConnector={index < visibleStages.length - 1}
          showAge={showAge}
        />
      ))}
      <StageChip
        stage={mediaStage}
        status={currentStages.media}
        projectId={projectId}
        studioName={studioName}
        customerName={customerName}
        showConnector={false}
        showAge={showAge}
        mediaCount={mediaCount}
      />
    </div>
  );
}

export function StageChip({
  stage,
  status,
  projectId,
  studioName,
  customerName,
  showConnector,
  showAge = true,
  mediaCount,
}: {
  stage: { key: ProductionFlowStageKey | "media"; label: string; icon: StageIconName };
  status: StageStatus;
  projectId: string;
  studioName: string;
  customerName: string;
  showConnector: boolean;
  showAge?: boolean;
  mediaCount?: number;
}) {
  const isMedia = stage.key === "media";
  const displayLabel = isMedia ? `${stage.label} (${mediaCount ?? 0})` : stage.label;
  const tooltip = isMedia
    ? `${mediaCount ?? 0} media ${(mediaCount ?? 0) === 1 ? "file" : "files"}`
    : getStageTooltip(stage.label, status.state, studioName, customerName);
  const stageHref = getProjectStageHref(projectId, stage.key);
  const stageLabel = getProjectStageLinkLabel(stage.key, stage.label);
  const chipContent = (
    <span className="stage-icon-surface" aria-hidden="true">
      <DsIcon name={stage.icon} size={21} />
    </span>
  );

  return (
    <div className={`stage-step ${isMedia ? "is-media-pinned" : ""}`.trim()}>
      {stageHref ? (
        <a
          className={`stage-chip ${isMedia ? "stage-media" : `stage-${status.state}`}`}
          href={stageHref}
          aria-label={isMedia ? `Open ${displayLabel}. ${tooltip}` : `Open ${stageLabel}`}
          data-tooltip={tooltip}
          onClick={(event) => event.stopPropagation()}
        >
          {chipContent}
        </a>
      ) : (
        <span
          className={`stage-chip ${isMedia ? "stage-media" : `stage-${status.state}`} is-static`}
          aria-label={isMedia ? displayLabel : `${stage.label} stage`}
          data-tooltip={tooltip}
          onClick={(event) => event.stopPropagation()}
        >
          {chipContent}
        </span>
      )}
      <span className="stage-label label-xs">{displayLabel}</span>
      {showAge && !isMedia ? (
        <span className="stage-age label-xs">
          {status.daysAgo !== undefined ? `${status.daysAgo}d ago` : "\u00a0"}
        </span>
      ) : null}
      {showConnector ? <span className="stage-connector" aria-hidden="true" /> : null}
    </div>
  );
}

function getProjectStageLinkLabel(stage: ProductionFlowStageKey | "media", label: string) {
  return stage === "edit" ? "Video Review" : label;
}

function getStageStateLabel(
  state: StageStatus["state"],
  studioName: string,
  customerName: string,
) {
  if (state === "not_started") {
    return "Not started";
  }

  if (state === "in_progress") {
    return `Waiting on ${studioName}`;
  }

  if (state === "waiting") {
    return `Waiting on ${customerName}`;
  }

  return "Complete";
}

function getStageTooltip(
  stageLabel: string,
  state: StageStatus["state"],
  studioName: string,
  customerName: string,
) {
  return `${stageLabel} - ${getStageStateLabel(state, studioName, customerName)}`;
}
