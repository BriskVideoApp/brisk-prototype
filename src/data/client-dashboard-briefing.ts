import type { CustomerDashboardProject } from "./customer-dashboard";

// Action references contain no URLs. The dashboard resolves permitted destinations.
export type ClientDashboardBriefingAction =
  | { action: "start"; label: string }
  | { action: "brief" | "project"; label: string; projectId: string }
  | { action: "invite"; label: string; projectId?: string };

export type ClientDashboardBriefingPart = string | ClientDashboardBriefingAction;

export type ClientDashboardBriefing = {
  title: string;
  body: readonly ClientDashboardBriefingPart[];
};

// This front-end briefing describes recorded mock state. It makes no AI request.
export function getClientDashboardBriefing({ clientName, studioName, isStudio, hasInvitation, canInviteClient, projects, briefsWithContent }: {
  clientName: string;
  studioName: string;
  isStudio: boolean;
  hasInvitation: boolean;
  canInviteClient: boolean;
  projects: readonly CustomerDashboardProject[];
  briefsWithContent: readonly string[];
}): ClientDashboardBriefing {
  if (!projects.length) return {
    title: isStudio ? "Start their first video" : "Start your first video",
    body: isStudio ? !hasInvitation
      ? [`${clientName} hasn't been invited yet. You can `, { action: "start", label: "start their first video" },
        ...(canInviteClient ? [" yourself, or ", { action: "invite", label: `invite ${clientName}` }, " to complete the Brief."] satisfies ClientDashboardBriefingPart[] : ["."])]
      : [{ action: "start", label: `Start a video for ${clientName}` }, ". We'll guide you through the Brief."]
      : [{ action: "start", label: "Give your video a name" }, ", then we'll guide you through the Brief."],
  };

  const liveProjects = projects.filter((project) => !["Completed", "Paused", "Archived"].includes(project.status));
  const briefProject = liveProjects.find((project) => project.stages.brief.state !== "done"
    && project.stages.brief.assignedTo === (isStudio ? studioName : clientName))
    ?? liveProjects.find((project) => project.stages.brief.state !== "done");
  if (briefProject) {
    const clientTurn = briefProject.stages.brief.state === "waiting" && briefProject.stages.brief.assignedTo === clientName;
    const inputRequired = briefProject.stages.brief.inputRequired;
    const reviewRequired = briefProject.stages.brief.state === "waiting" && !inputRequired;
    const ownTurn = isStudio ? !clientTurn : clientTurn;
    const title = !ownTurn ? `Brief is waiting on ${isStudio ? clientName : "the Studio"}`
      : !inputRequired ? reviewRequired ? "Review the Brief" : "Continue the Brief"
      : !isStudio ? "Complete your Brief" : briefsWithContent.includes(briefProject.id) ? "Continue the Brief" : "Start the Brief";
    const briefLink = (label: string): ClientDashboardBriefingAction => ({ action: "brief", label, projectId: briefProject.id });
    const body: ClientDashboardBriefingPart[] = isStudio && !hasInvitation
      ? [`${clientName} hasn't been invited yet. You can `,
        briefLink(`${inputRequired && !briefsWithContent.includes(briefProject.id) ? "start" : "continue"} the Brief for ${briefProject.name}`),
        ...(canInviteClient ? [", or ", { action: "invite", label: `invite ${clientName}`, projectId: briefProject.id }, " to contribute."] satisfies ClientDashboardBriefingPart[] : ["."])]
      : !ownTurn ? [`${isStudio ? clientName : studioName} has the next step on the Brief for ${briefProject.name}. `,
        briefLink("Open the Brief"), " to see the current details."]
      : !inputRequired ? reviewRequired ? [`The Brief for ${briefProject.name} is ready for your review. `, briefLink("Review the Brief"), " and respond."]
        : [briefLink(`Open the Brief for ${briefProject.name}`), " to check what needs to be completed."]
      : isStudio ? [`The Brief for ${briefProject.name} is waiting on the Studio. `, briefLink("Open the Brief"), " to continue."]
      : [`Your team needs to complete the Brief for ${briefProject.name}. `, briefLink("Open the Brief"), " to add your details."];
    return {
      title, body,
    };
  }

  const waitingOnClient = liveProjects.filter((project) => project.status === "In Production" && project.statusDetail === "Waiting on you");
  const nextProject = (!isStudio ? waitingOnClient[0] : undefined) ?? liveProjects[0];
  const inProduction = projects.filter((project) => project.status === "In Production").length;
  const queued = projects.filter((project) => project.status === "Queued").length;
  return {
    title: waitingOnClient.length ? isStudio ? "Client input is needed" : "Your team has the next step" : "Your video overview",
    body: [`${inProduction} ${inProduction === 1 ? "video is" : "videos are"} in production and ${queued} ${queued === 1 ? "is" : "are"} queued.${waitingOnClient.length
      ? ` ${waitingOnClient.length} ${waitingOnClient.length === 1 ? "video needs" : "videos need"} ${isStudio ? `${clientName}'s` : "your team's"} input.`
      : ""} `, nextProject ? { action: "project", label: `Open ${nextProject.name}`, projectId: nextProject.id }
        : { action: "start", label: "Start a new video" }, nextProject ? " to check the next step." : " when you're ready."],
  };
}
