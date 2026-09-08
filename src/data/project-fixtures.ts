import type { Project, StageKey, StageStatus } from "@/components/active-videos/types";
import { activeVideoProjects } from "@/data/active-videos/mockData";
import {
  customerDashboardProjects,
  type CustomerDashboardProject,
} from "@/data/customer-dashboard";
import { clientNewVideoScriptProject } from "@/data/prototype-scenarios";

const fixtureReferenceDate = new Date("2026-07-27T09:00:00+10:00");
const millisecondsPerDay = 24 * 60 * 60 * 1000;
const stageOrder: StageKey[] = ["brief", "script", "shoot", "media", "edit", "masters"];

const customerProjectFixtures = customerDashboardProjects.map(toProjectFixture);
const projectsById = new Map(
  [clientNewVideoScriptProject, ...customerProjectFixtures, ...activeVideoProjects].map((project) => [project.id, project]),
);

export const projectFixtureIds = [...projectsById.keys()];

export function getProjectFixture(projectId: string) {
  return projectsById.get(projectId) ?? null;
}

export function getProjectEntryHref(project: Pick<Project, "id" | "stages">) {
  const currentStage = stageOrder.find((stage) => {
    const state = project.stages[stage].state;
    return state === "in_progress" || state === "waiting";
  }) ?? stageOrder.find((stage) => project.stages[stage].state === "not_started") ?? "masters";

  return getProjectStageHref(project.id, currentStage);
}

export function getProjectStageHref(projectId: string, stage: StageKey | "storyboard") {
  if (stage === "storyboard") {
    return `/projects/${encodeURIComponent(projectId)}/stages/storyboard`;
  }

  if (projectId === clientNewVideoScriptProject.id) {
    const newClientJourneyHrefs: Record<StageKey, string> = {
      brief: "/customer-dashboard/start-video",
      script: "/customer-dashboard/start-video/script",
      shoot: `/projects/${clientNewVideoScriptProject.id}/stages/shoot?preview=empty`,
      media: `/projects/${clientNewVideoScriptProject.id}/stages/media`,
      edit: `/projects/${clientNewVideoScriptProject.id}/stages/edit?preview=empty`,
      masters: `/projects/${clientNewVideoScriptProject.id}/stages/masters?preview=empty`,
    };

    return newClientJourneyHrefs[stage];
  }

  const encodedProjectId = encodeURIComponent(projectId);
  const hrefs: Record<StageKey, string> = {
    brief: `/projects/${encodedProjectId}/stages/brief`,
    script: `/projects/${encodedProjectId}/script`,
    shoot: `/projects/${encodedProjectId}/stages/shoot`,
    media: `/projects/${encodedProjectId}/stages/media`,
    edit: `/projects/${encodedProjectId}/stages/edit`,
    masters: `/projects/${encodedProjectId}/stages/masters`,
  };

  return hrefs[stage];
}

function toProjectFixture(project: CustomerDashboardProject): Project {
  return {
    id: project.id,
    clientId: "loom",
    clientBadge: "LOOM",
    clientName: "Loom",
    name: project.name,
    videoType: "liveAction",
    videoLengthSeconds: 60,
    latestUpdate: {
      label: project.latestAction.label,
      timestamp: project.latestAction.timestamp,
      daysAgo: getDaysAgo(project.latestAction.timestamp),
    },
    deadlineAt: project.createdAt,
    isCritical: false,
    unreadMessages: project.unreadMessages,
    status: project.status,
    file_locations: [],
    stages: cloneStages(project.stages),
    team: [],
    timeEntries: [],
  };
}

function getDaysAgo(timestamp: string) {
  return Math.max(
    0,
    Math.floor((fixtureReferenceDate.getTime() - new Date(timestamp).getTime()) / millisecondsPerDay),
  );
}

function cloneStages(stages: Record<StageKey, StageStatus>) {
  return Object.fromEntries(
    stageOrder.map((stage) => [stage, { ...stages[stage] }]),
  ) as Record<StageKey, StageStatus>;
}
