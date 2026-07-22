import Link from "next/link";
import type { ReactNode } from "react";
import type { Project, StageKey, StageStatus } from "@/components/active-videos/types";
import { DsIcon, type DsIconName } from "@/components/video-review/DsIcon";

type ProjectStageHeaderProps = {
  actions?: ReactNode;
  project: Project;
  activeStage?: StageKey;
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
  { key: "media", label: "Media", icon: "image-square" },
  { key: "edit", label: "Edit", icon: "stage-edit" },
  { key: "masters", label: "Masters", icon: "film-strip" },
];

const stageStateLabels: Record<StageStatus["state"], string> = {
  done: "done",
  in_progress: "in production",
  not_started: "not started",
  waiting: "waiting",
};

export function ProjectStageHeader({ actions, activeStage, project }: ProjectStageHeaderProps) {
  const currentStageKey = activeStage ?? getCurrentProjectStage(project).key;

  return (
    <header className="project-stage-header" aria-label="Project stage progress">
      <div className="project-stage-brand-strip" aria-label={`${project.clientBadge} / ${project.name}`}>
        <div className="project-stage-identity">
          <span className="project-stage-client-badge label-xs-semibold">{project.clientBadge}</span>
          <span className="project-stage-identity-divider" aria-hidden="true">
            /
          </span>
          <span className="project-stage-project-title">{project.name}</span>
        </div>
        {actions ? <div className="project-stage-header-actions">{actions}</div> : null}
      </div>
      <div className="project-stage-flow-area" aria-label={`${project.clientBadge} ${project.name}`}>
        <ol className="project-stage-track" aria-label="Production stages">
          {projectHeaderStages.map((stage, index) => {
            const status = project.stages[stage.key];
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
      </div>
    </header>
  );
}

function getCurrentProjectStage(project: Project) {
  return projectHeaderStages.find((stage) => project.stages[stage.key].state !== "done") ?? projectHeaderStages[projectHeaderStages.length - 1];
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

  return "";
}

function getProjectStageLinkLabel(stage: StageKey, label: string) {
  return stage === "edit" ? "Video Review" : label;
}
