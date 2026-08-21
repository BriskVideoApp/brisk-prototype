"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { Project, StageKey, StageStatus } from "@/components/active-videos/types";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { useProjectCompletion } from "@/components/project/ProjectCompletionContext";
import { useProjectStageStatus } from "@/components/project/ProjectStageStatusContext";
import { DsIcon, type DsIconName } from "@/components/video-review/DsIcon";
import { mediaAssets } from "@/data/media";
import {
  getDemoProjectDestination,
  type DemoProjectExperience,
} from "@/data/projects";

type ProjectStageHeaderProps = {
  actions?: ReactNode;
  project: Project;
  activeStage?: StageKey;
  activeUtility?: "media" | "files" | "costs" | "chat" | "people" | "settings";
  mediaCount?: number;
  showUtilities?: boolean;
};

type ProjectHeaderStage = {
  key: StageKey;
  label: string;
  icon: DsIconName;
};

const projectHeaderStages: ProjectHeaderStage[] = [
  { key: "brief", label: "Brief", icon: "clipboard-text" },
  { key: "script", label: "Script", icon: "pen-nib" },
  { key: "shoot", label: "Shoot", icon: "video-camera-ds" },
  { key: "edit", label: "Edit", icon: "stage-edit" },
  { key: "masters", label: "Masters", icon: "film-strip" },
];

const stageStateLabels: Record<StageStatus["state"], string> = {
  done: "approved",
  in_progress: "waiting on Studio",
  not_started: "not started",
  waiting: "waiting on client",
};

export function ProjectStageHeader({ actions, activeStage, activeUtility, mediaCount, project }: ProjectStageHeaderProps) {
  const { completionRecords } = useProjectCompletion();
  const { getProjectStages } = useProjectStageStatus();
  const projectStages = getProjectStages(project);
  const hasApprovedStageFlow = Object.values(projectStages).every((status) => status.state === "done");
  const isProjectDelivered = project.status === "Completed" || (Boolean(completionRecords[project.id]) && hasApprovedStageFlow);
  const currentStageKey = activeUtility ? undefined : activeStage ?? getCurrentProjectStage(projectStages).key;
  const { selectedRole } = usePrototypeRole();
  const projectMediaCount = mediaCount ?? mediaAssets.filter((asset) => asset.projectId === project.id).length;
  const mediaStatus: StageStatus = isProjectDelivered ? { state: "done" } : projectStages.media;
  const mediaTooltip = projectMediaCount > 0
    ? `${projectMediaCount} media ${projectMediaCount === 1 ? "file" : "files"}`
    : "No media uploaded";
  const mediaLabel = `Media${projectMediaCount > 0 ? ` (${projectMediaCount})` : ""}`;

  return (
      <header className="project-stage-header" aria-label="Project stage progress">
        <div className="project-stage-brand-strip" aria-label={`${project.clientBadge} / ${project.name}`}>
          <div className="project-stage-identity">
            <Link
              className="project-stage-dashboard-link"
              href={selectedRole === "Customer" ? "/customer-dashboard" : "/active-videos"}
              aria-label="Back to dashboard"
              data-tooltip="Back to dashboard"
            >
              <DsIcon name="arrow-left" size={18} />
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
            <ol className="project-stage-track" aria-label="Sequential production stages">
              {projectHeaderStages.map((stage, index) => {
                const status: StageStatus = isProjectDelivered ? { state: "done" } : projectStages[stage.key];
                const href = getProjectStageHref(project.id, stage.key);
                const isCurrentStage = stage.key === currentStageKey;
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
                        href={href}
                        aria-label={`${getProjectStageLinkLabel(stage.key, stage.label)}: ${stageStateLabels[status.state]}`}
                        aria-current={isCurrentStage ? "step" : undefined}
                      >
                        {chipContent}
                      </Link>
                    ) : (
                      <span
                        className="project-stage-chip"
                        aria-label={`${stage.label}: ${stageStateLabels[status.state]}`}
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
              <Link
                className="project-stage-chip"
                href={`/projects/${project.id}/stages/media`}
                aria-current={activeUtility === "media" ? "page" : undefined}
                aria-label={`${mediaLabel}: ${stageStateLabels[mediaStatus.state]}. ${mediaTooltip}`}
              >
                <span className="project-stage-icon-surface" aria-hidden="true">
                  <DsIcon name="image-square" size={24} />
                </span>
              </Link>
              <span className="project-stage-label label-xs-semibold">{mediaLabel}</span>
            </div>
          </div>
        </div>
      </header>
  );
}

function getCurrentProjectStage(stages: Record<StageKey, StageStatus>) {
  return projectHeaderStages.find((stage) => stages[stage.key].state !== "done") ?? projectHeaderStages[projectHeaderStages.length - 1];
}

function getProjectStageHref(projectId: string, stage: StageKey) {
  const experienceByStage: Record<StageKey, DemoProjectExperience> = {
    brief: "brief",
    script: "script",
    shoot: "shoot",
    media: "media",
    edit: "edit",
    masters: "masters",
  };

  return getDemoProjectDestination(projectId, experienceByStage[stage])?.href ?? "";
}

function getProjectStageLinkLabel(stage: StageKey, label: string) {
  return stage === "edit" ? "Video Review" : label;
}
