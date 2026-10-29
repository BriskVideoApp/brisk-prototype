import type { StageStatus } from "@/components/active-videos/types";
import type { BriskAiResponse } from "@/data/brisk-ai";
import type { BriefFields, BriefStepId, ChatMessage, Logline } from "@/data/brief";
import type { ScopedProject } from "@/data/prototype-state";
import type { ProductionFlowStageKey } from "@/data/production-flow";
import { getProjectStageHref } from "@/data/project-fixtures";

export type BriefAssistantState = {
  messages: ChatMessage[];
  started: boolean;
  answerCount: number;
  drafted: boolean;
  drafting: boolean;
  sourcePrompt: string;
  mode: "landing" | "steps";
  step: BriefStepId;
  fields: BriefFields;
  logline: Logline;
};

export type AskProject = ScopedProject & {
  assistantStages: Array<{ key: ProductionFlowStageKey; label: string; status: StageStatus }>;
};

export type AskInsight = {
  id: string;
  fingerprint: string;
  projectId: string;
  projectName: string;
  title: string;
  body: string;
  href: string;
  sourceLabel: string;
  reviewStage?: ProductionFlowStageKey;
  priority?: string;
};

export function getAskInsights(projects: AskProject[], isClient: boolean, priorities: Record<string, string>): AskInsight[] {
  return projects.filter((project) => project.status === "In Production").flatMap((project) => {
    const current = project.assistantStages.find((stage) => stage.status.state === "waiting" || stage.status.state === "in_progress");
    if (!current) return [];
    const waiting = current.status.state === "waiting";
    const clientTurn = waiting && current.status.assignedTo === project.clientName;
    const priority = !isClient ? priorities[project.id] : undefined;
    const title = priority ? "Producer priority" : waiting
      ? clientTurn ? isClient ? "Waiting on you" : `Follow up ${project.clientName}`
        : current.status.assignedTo ? `Waiting on ${current.status.assignedTo}` : `Check ${current.label}`
      : `${current.label} is in progress`;
    const body = (waiting
      ? current.status.assignedTo ? `${current.label}${current.status.reviewVersion ? ` ${current.status.reviewVersion}` : ""} is waiting on ${isClient && clientTurn ? "your team" : current.status.assignedTo}.`
        : `${current.label} is waiting. Open the Stage to check what is needed; no responsible party is recorded.`
      : `${current.label} is waiting on ${current.status.assignedTo ?? "the Studio"}.`);
    const href = getProjectStageHref(project.id, current.key);
    const reviewStage = clientTurn && ["brief", "script", "storyboard", "edit", "masters"].includes(current.key) ? current.key : undefined;
    return [{ id: `${project.id}:${current.key}`, fingerprint: JSON.stringify([current.status, priority, project.status]),
      projectId: project.id, projectName: project.name, title, body, href, sourceLabel: `${current.label} status`, reviewStage, priority }];
  }).sort((a, b) => Number(Boolean(b.priority)) - Number(Boolean(a.priority))
    || Number(Boolean(b.reviewStage)) - Number(Boolean(a.reviewStage)) || a.projectName.localeCompare(b.projectName, "en-AU"));
}

export const askWorkloadQuestions = ["What should I focus on first?", "What am I waiting on?", "Who needs a follow-up?"] as const;
export const askProjectQuestions = ["Where is this project up to?", "What happens next?", "What are we waiting on?"] as const;

export function getAskProjectResponse(prompt: string, projects: AskProject[], insights: AskInsight[], isClient: boolean): BriskAiResponse {
  const query = prompt.toLocaleLowerCase("en-AU");
  const waitingOnly = /waiting|follow.up|chase|blocked|approve/u.test(query);
  const approvalsOnly = /approv/u.test(query);
  const selectedInsights = approvalsOnly ? insights.filter((insight) => insight.reviewStage)
    : /follow.up|chase/u.test(query) ? insights.filter((insight) => insight.reviewStage || insight.title.startsWith("Follow up"))
    : waitingOnly ? insights.filter((insight) => /waiting|follow up|check/iu.test(`${insight.title} ${insight.body}`)) : insights;
  if (!projects.length) return { title: "No projects available", body: "There are no projects available in this scope. Choose a project you can access to ask about its progress.", citations: [] };
  if (/move|reschedul|arrang|book|send|message|tell /u.test(query)) return {
    title: "Review an action first", body: "I have not changed anything or sent a message. This prototype can prepare an approval reminder for a Stage waiting on the Client. Other scheduling and messaging actions are not available yet.", citations: [],
  };
  const rows = approvalsOnly && !selectedInsights.length ? [] : projects.length === 1 ? projects.map((project) => {
    const current = project.assistantStages.find((stage) => stage.status.state === "waiting" || stage.status.state === "in_progress");
    const next = current && project.assistantStages.slice(project.assistantStages.indexOf(current) + 1).find((stage) => stage.status.state !== "done");
    const insight = insights.find((entry) => entry.projectId === project.id);
    const body = project.status !== "In Production" ? `This project is ${project.status.toLocaleLowerCase("en-AU")}.`
      : `${insight?.priority ? `Your priority: ${insight.priority} ` : ""}${insight?.body ?? "Check the current Stage for progress."}${next ? ` ${next.label} follows in this project's production flow; its start date is not confirmed here.` : ""}`;
    return { label: project.name, body, citationIds: [] };
  }) : selectedInsights.slice(0, 6).map((insight) => ({ label: insight.projectName, body: insight.priority ? `${insight.priority} ${insight.body}` : insight.body, citationIds: [] }));
  return {
    title: approvalsOnly ? "Client reviews" : waitingOnly ? "Outstanding work" : projects.length === 1 ? "Project progress" : "Your workload",
    body: rows.length ? isClient ? "Here is the status shared with your team. Open a source to review or respond."
      : projects.length === 1 ? "Here is the current project status." : "Start with the recorded priorities, then check the outstanding work below."
      : approvalsOnly ? "No Client approvals are currently recorded as pending in this scope." : "No outstanding items are recorded in this scope. Check the source Stages for the full picture.",
    categoryRows: rows,
    links: (projects.length === 1 ? insights : selectedInsights).slice(0, 6).map((insight) => ({ label: `${insight.projectName} · ${insight.sourceLabel}`, href: insight.href })),
    citations: [],
  };
}
