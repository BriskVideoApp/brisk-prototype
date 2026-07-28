import { DsIcon } from "@/components/video-review/DsIcon";
import type { StageKey, StageStatus } from "@/components/active-videos/types";

type StageIconName = Parameters<typeof DsIcon>[0]["name"];

export const stageOrder: Array<{ key: StageKey; label: string; icon: StageIconName }> = [
  { key: "brief", label: "Brief", icon: "clipboard-text" },
  { key: "script", label: "Script", icon: "pen-nib" },
  { key: "shoot", label: "Shoot", icon: "video-camera-ds" },
  { key: "media", label: "Media", icon: "image-square" },
  { key: "edit", label: "Edit", icon: "stage-edit" },
  { key: "masters", label: "Masters", icon: "film-strip" },
];

export function StageProgress({
  projectId,
  projectName,
  stages,
  studioName,
  customerName,
  compact = false,
  showAge = true,
}: {
  projectId: string;
  projectName: string;
  stages: Record<StageKey, StageStatus>;
  studioName: string;
  customerName: string;
  compact?: boolean;
  showAge?: boolean;
}) {
  return (
    <div
      className={`stage-track ${compact ? "stage-track-compact" : ""}`}
      aria-label={`${projectName} stage progress`}
    >
      {stageOrder.map((stage, index) => (
        <StageChip
          key={stage.key}
          stage={stage}
          status={stages[stage.key]}
          projectId={projectId}
          studioName={studioName}
          customerName={customerName}
          showConnector={index < stageOrder.length - 1}
          showAge={showAge}
        />
      ))}
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
}: {
  stage: { key: StageKey; label: string; icon: StageIconName };
  status: StageStatus;
  projectId: string;
  studioName: string;
  customerName: string;
  showConnector: boolean;
  showAge?: boolean;
}) {
  const stageHref = getProjectStageHref(projectId, stage.key);
  const stageLabel = getProjectStageLinkLabel(stage.key, stage.label);
  const chipContent = (
    <span className="stage-icon-surface" aria-hidden="true">
      <DsIcon name={stage.icon} size={21} />
    </span>
  );

  return (
    <div className="stage-step">
      {stageHref ? (
        <a
          className={`stage-chip stage-${status.state}`}
          href={stageHref}
          aria-label={`Open ${stageLabel}`}
          data-tooltip={getStageTooltip(stage.label, status.state, studioName, customerName)}
          onClick={(event) => event.stopPropagation()}
        >
          {chipContent}
        </a>
      ) : (
        <span
          className={`stage-chip stage-${status.state} is-static`}
          aria-label={`${stage.label} stage`}
          data-tooltip={getStageTooltip(stage.label, status.state, studioName, customerName)}
          onClick={(event) => event.stopPropagation()}
        >
          {chipContent}
        </span>
      )}
      <span className="stage-label label-xs">{stage.label}</span>
      {showAge ? (
        <span className="stage-age label-xs">
          {status.daysAgo !== undefined ? `${status.daysAgo}d ago` : "\u00a0"}
        </span>
      ) : null}
      {showConnector ? <span className="stage-connector" aria-hidden="true" /> : null}
    </div>
  );
}

function getProjectStageHref(projectId: string, stage: StageKey) {
  if (stage === "brief") {
    return `/projects/${projectId}/stages/brief`;
  }

  if (stage === "script") {
    return `/projects/${projectId}/script`;
  }

  if (stage === "media") {
    return `/projects/${projectId}/stages/media`;
  }

  if (stage === "edit") {
    return "/review";
  }

  if (stage === "masters") {
    return `/projects/${projectId}/stages/masters`;
  }

  return "";
}

function getProjectStageLinkLabel(stage: StageKey, label: string) {
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
