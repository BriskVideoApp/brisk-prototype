"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { Project, StageKey, StageStatus } from "@/components/active-videos/types";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import {
  getClientPortalDestination,
  getScopedRoleHome,
} from "@/components/navigation/prototypeNavigation";
import { useMediaLibrary } from "@/components/media/MediaLibraryContext";
import { useProjectCompletion } from "@/components/project/ProjectCompletionContext";
import { useProjectFlow } from "@/components/project/ProjectFlowContext";
import { useProjectStageStatus } from "@/components/project/ProjectStageStatusContext";
import { ProjectFlowAdjuster } from "@/components/production-flow/ProjectFlowAdjuster";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { DsIcon } from "@/components/video-review/DsIcon";
import { getProjectStageHref } from "@/data/project-fixtures";
import {
  getProductionFlowStageDefinition,
  type ProductionFlowStageKey,
} from "@/data/production-flow";

type ProjectStageHeaderProps = {
  actions?: ReactNode;
  project: Project;
  activeStage?: StageKey;
  activeUtility?: "media" | "files" | "costs" | "chat" | "people" | "settings";
  mediaCount?: number;
  showUtilities?: boolean;
};

export function ProjectStageHeader({ actions, activeStage, activeUtility, mediaCount, project }: ProjectStageHeaderProps) {
  const dashboardTooltipId = `project-stage-dashboard-tooltip-${project.id}`;
  const { completionRecords } = useProjectCompletion();
  const { assetViews } = useMediaLibrary();
  const { getProjectStages } = useProjectStageStatus();
  const { getProjectFlow } = useProjectFlow();
  const projectStages = getProjectStages(project);
  const projectFlow = getProjectFlow(project);
  const projectHeaderStages = projectFlow.stages.map((stage) => getProductionFlowStageDefinition(stage, projectFlow.postProductionTerm));
  const hasApprovedStageFlow = Object.values(projectStages).every((status) => status.state === "done");
  const isProjectDelivered = project.status === "Completed" || (Boolean(completionRecords[project.id]) && hasApprovedStageFlow);
  const currentStageKey = activeUtility ? undefined : activeStage ?? getCurrentProjectStage(projectHeaderStages, projectStages)?.key;
  const { selectedRole } = usePrototypeRole();
  const { state } = usePrototypeState();
  const studioName = state.workspaces.find((workspace) => workspace.id === state.session.activeWorkspaceId)?.name ?? "Studio";
  const homeHref = getScopedRoleHome(selectedRole, getClientPortalDestination(state));
  const projectMediaCount = mediaCount ?? assetViews.filter((asset) => asset.projectId === project.id && !asset.archivedAt && asset.collection === "media").length;
  const mediaStatus: StageStatus = isProjectDelivered ? { state: "done" } : projectStages.media;
  const mediaStatusLabel = getProjectStageStatusLabel(mediaStatus.state, project.clientName, studioName);
  const mediaTooltip = projectMediaCount > 0
    ? `${projectMediaCount} media ${projectMediaCount === 1 ? "file" : "files"}`
    : "No media uploaded";
  const mediaLabel = `Media${projectMediaCount > 0 ? ` (${projectMediaCount})` : ""}`;
  const mediaHref = getProjectStageHref(project.id, "media");

  return (
      <header className="project-stage-header" aria-label="Project stage progress">
        <div className="project-stage-brand-strip" aria-label={`${project.clientBadge} / ${project.name}`}>
          <div className="project-stage-identity">
            <Link
              className="project-stage-dashboard-link"
              href={selectedRole === "Customer" ? homeHref : "/active-videos"}
              aria-label="Back to dashboard"
              aria-describedby={dashboardTooltipId}
            >
              <DsIcon name="arrow-left" size={18} />
              <span className="project-stage-dashboard-tooltip" id={dashboardTooltipId} role="tooltip">
                Back to dashboard
              </span>
            </Link>
            <span className="project-stage-client-badge label-xs-semibold">{project.clientBadge}</span>
            <span className="project-stage-identity-divider" aria-hidden="true">
              /
            </span>
            <span className="project-stage-project-title">{project.name}</span>
          </div>
          {actions ? <div className="project-stage-header-actions">{actions}</div> : null}
        </div>
        <div className="project-stage-flow-area" aria-label={`${project.clientBadge} ${project.name}`}>
          <div className="project-stage-flow-navigation">
            <ol
              className="project-stage-track"
              aria-label="Sequential production stages"
              style={{ gridTemplateColumns: `repeat(${Math.max(projectHeaderStages.length, 1)}, minmax(0, 1fr))` }}
            >
              {projectHeaderStages.map((stage, index) => {
                const storedStatus = stage.key === "storyboard" ? { state: "not_started" as const } : projectStages[stage.key];
                const status: StageStatus = isProjectDelivered ? { state: "done" } : storedStatus;
                const href = stage.key === "storyboard" ? null : getProjectStageHref(project.id, stage.key);
                const isCurrentStage = stage.key === currentStageKey;
                const statusLabel = getProjectStageStatusLabel(status.state, project.clientName, studioName);
                const chipContent = (
                  <span className="project-stage-icon-surface" aria-hidden="true">
                    <DsIcon name={stage.icon} size={24} />
                  </span>
                );

                return (
                  <li
                    className={`project-stage-step is-${status.state} ${isCurrentStage ? "is-current" : ""}`}
                    key={stage.key}
                  >
                    {href ? (
                      <Link
                        className="project-stage-chip"
                        data-tooltip={statusLabel}
                        href={href}
                        aria-label={`${getProjectStageLinkLabel(stage.key, stage.label)}: ${statusLabel}`}
                        aria-current={isCurrentStage ? "step" : undefined}
                      >
                        {chipContent}
                      </Link>
                    ) : (
                      <span
                        className="project-stage-chip"
                        data-tooltip={statusLabel}
                        aria-label={`${stage.label}: ${statusLabel}`}
                        role="img"
                      >
                        {chipContent}
                      </span>
                    )}
                    <span className="project-stage-label label-xs-semibold">{stage.label}</span>
                    {index < projectHeaderStages.length - 1 ? (
                      <span className="project-stage-connector" aria-hidden="true">
                        <DsIcon name="caret-right" size={24} />
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ol>
            <div className={`project-stage-step project-stage-media-step is-${mediaStatus.state} ${activeUtility === "media" ? "is-current" : ""}`}>
              {mediaHref ? <Link
                className="project-stage-chip"
                data-tooltip={mediaStatusLabel}
                href={mediaHref}
                aria-current={activeUtility === "media" ? "page" : undefined}
                aria-label={`${mediaLabel}: ${mediaStatusLabel}. ${mediaTooltip}`}
              >
                <span className="project-stage-icon-surface" aria-hidden="true">
                  <DsIcon name="image-square" size={24} />
                </span>
              </Link> : <span
                className="project-stage-chip"
                data-tooltip={mediaStatusLabel}
                aria-label={`${mediaLabel}: ${mediaStatusLabel}. ${mediaTooltip}`}
                role="img"
              >
                <span className="project-stage-icon-surface" aria-hidden="true">
                  <DsIcon name="image-square" size={24} />
                </span>
              </span>}
              <span className="project-stage-label label-xs-semibold">{mediaLabel}</span>
            </div>
          </div>
          {selectedRole === "Studio Staff" ? (
            <div className="project-stage-flow-adjuster">
              <ProjectFlowAdjuster project={project} />
            </div>
          ) : null}
        </div>
      </header>
  );
}

function getCurrentProjectStage(
  flowStages: Array<{ key: ProductionFlowStageKey }>,
  statuses: Record<StageKey, StageStatus>,
) {
  return flowStages.find((stage) => stage.key === "storyboard" || statuses[stage.key].state !== "done")
    ?? flowStages[flowStages.length - 1];
}

function getProjectStageLinkLabel(stage: ProductionFlowStageKey, label: string) {
  return stage === "edit" ? "Video Review" : label;
}

function getProjectStageStatusLabel(
  state: StageStatus["state"],
  clientName: string,
  studioName: string,
) {
  if (state === "waiting") {
    return `Waiting on ${clientName || "Client"}`;
  }

  if (state === "in_progress") {
    return `Waiting on ${studioName || "Studio"}`;
  }

  if (state === "done") {
    return "Approved";
  }

  return "Not started";
}
