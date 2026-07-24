"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import type { Project, StageKey, StageStatus } from "@/components/active-videos/types";
import { ProjectMemberSettings } from "@/components/chat/ChatOverlays";
import { CommentAvatar } from "@/components/comments/CommentPrimitives";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { DsIcon, type DsIconName } from "@/components/video-review/DsIcon";
import { chatClients, chatProjects, chatUsers } from "@/data/chat";

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
  const { selectedRole } = usePrototypeRole();
  const [isAccessOpen, setIsAccessOpen] = useState(false);
  const [accessProject, setAccessProject] = useState(() => chatProjects.find((candidate) => candidate.id === project.id) ?? null);
  const accessMembers = accessProject
    ? accessProject.memberIds
        .map((memberId) => chatUsers.find((user) => user.id === memberId))
        .filter((user): user is (typeof chatUsers)[number] => Boolean(user))
    : [];
  const visibleAccessMembers = accessMembers.slice(0, 5);
  const remainingAccessMembers = Math.max(0, accessMembers.length - visibleAccessMembers.length);
  const client = accessProject ? chatClients.find((candidate) => candidate.name === accessProject.clientName) : null;
  const companyUsers = client ? chatUsers.filter((user) => client.userIds.includes(user.id)) : [];

  return (
    <>
      <header className="project-stage-header" aria-label="Project stage progress">
        <div className="project-stage-brand-strip" aria-label={`${project.clientBadge} / ${project.name}`}>
          <div className="project-stage-identity">
            <Link
              className="project-stage-dashboard-link"
              href="/active-videos"
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
          {accessProject || actions ? (
            <div className="project-stage-header-actions">
              {accessProject ? (
                <button
                  className="project-stage-access-button"
                  type="button"
                  aria-label={`${selectedRole === "Studio Staff" ? "Manage" : "View"} people with access to this project`}
                  title={`${selectedRole === "Studio Staff" ? "Manage" : "View"} people with access`}
                  onClick={() => setIsAccessOpen(true)}
                >
                  <span className="project-stage-access-stack" aria-hidden="true">
                    {visibleAccessMembers.map((user) => <CommentAvatar compact key={user.id} user={user} />)}
                    {remainingAccessMembers > 0 ? <span className="project-stage-access-more label-xs-semibold">+{remainingAccessMembers}</span> : null}
                  </span>
                </button>
              ) : null}
              {actions}
            </div>
          ) : null}
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
      {isAccessOpen && accessProject ? (
        <ProjectMemberSettings
          project={accessProject}
          users={chatUsers}
          companyUsers={companyUsers}
          canManage={selectedRole === "Studio Staff"}
          onClose={() => setIsAccessOpen(false)}
          onProjectChange={setAccessProject}
        />
      ) : null}
    </>
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

  if (stage === "masters") {
    return `/projects/${projectId}/stages/masters`;
  }

  return "";
}

function getProjectStageLinkLabel(stage: StageKey, label: string) {
  return stage === "edit" ? "Video Review" : label;
}
