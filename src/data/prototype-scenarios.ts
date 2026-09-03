import type { PrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import type { Project } from "@/components/active-videos/types";
import type { ScriptVersion } from "@/data/script";

export type PrototypeScenarioPersonaId =
  | "studio-owner"
  | "producer"
  | "freelancer"
  | "client";

export type PrototypeScenarioState = "new" | "active" | "edge";

export type PrototypeScenarioEntry =
  | "studio-sign-up"
  | "studio-invitation"
  | "freelancer-invitation"
  | "client-magic-link"
  | "workspace";

export type PrototypeScenario = {
  id: `${PrototypeScenarioPersonaId}-${PrototypeScenarioState}`;
  personaId: PrototypeScenarioPersonaId;
  personaLabel: string;
  state: PrototypeScenarioState;
  stateLabel: string;
  accessRole: PrototypeRole;
  participantName: string;
  workspaceId: string;
  workspaceLabel: string;
  clientId?: string;
  entry: PrototypeScenarioEntry;
  startHref: string;
  continuationHref: string;
  summary: string;
  supportedStates: readonly string[];
  fixtureProjectIds?: readonly string[];
  testOverrides?: {
    shootPlanStartsEmpty?: boolean;
  };
};

export const prototypeScenarioPersonas = [
  { id: "studio-owner", label: "Studio Staff", accessRole: "Studio Staff" },
  { id: "producer", label: "Studio Staff", accessRole: "Studio Staff" },
  { id: "freelancer", label: "Studio Freelancer", accessRole: "Studio Freelancer" },
  { id: "client", label: "Client", accessRole: "Customer" },
] as const satisfies readonly {
  id: PrototypeScenarioPersonaId;
  label: string;
  accessRole: PrototypeRole;
}[];

export const prototypeScenarioStates = [
  { id: "new", label: "New" },
  { id: "active", label: "Active" },
  { id: "edge", label: "Edge Case" },
] as const satisfies readonly { id: PrototypeScenarioState; label: string }[];

export const clientNewVideoProject: Project = {
  id: "loom-first-video",
  clientId: "loom",
  clientBadge: "LOOM",
  clientName: "Loom",
  name: "New video",
  videoType: "liveAction",
  videoLengthSeconds: 60,
  latestUpdate: {
    label: "Brief ready to start",
    daysAgo: 0,
    timestamp: "2026-08-25T09:00:00+10:00",
  },
  deadlineAt: "2026-09-30T17:00:00+10:00",
  isCritical: false,
  status: "Queued",
  file_locations: [],
  stages: {
    brief: { state: "not_started" },
    script: { state: "not_started" },
    shoot: { state: "not_started" },
    media: { state: "not_started" },
    edit: { state: "not_started" },
    masters: { state: "not_started" },
  },
  team: [],
  timeEntries: [],
};

export const clientNewVideoScriptProject: Project = {
  ...clientNewVideoProject,
  latestUpdate: {
    label: "Brief approved by Client",
    daysAgo: 0,
    timestamp: "2026-08-25T09:30:00+10:00",
  },
  status: "In Production",
  stages: {
    ...clientNewVideoProject.stages,
    brief: {
      state: "done",
      daysAgo: 0,
      approvedAt: "25 Aug",
      approvedBy: "Jess Taylor",
    },
    script: { state: "in_progress", daysAgo: 0 },
  },
};

export const clientNewScriptVersions: ScriptVersion[] = [
  {
    id: "v1",
    label: "v1",
    snapshotName: "Script v1 - Current",
    approvedSnapshot: false,
    createdBy: "Customer",
    createdAt: "25 Aug",
    rows: [],
  },
];

const northstarWorkspace = {
  workspaceId: "northstar-films",
  workspaceLabel: "North Star Films",
} as const;

const loomClientWorkspace = {
  workspaceId: "northstar-films",
  workspaceLabel: "North Star Films - Loom portal",
  clientId: "loom",
} as const;

export const prototypeScenarios: readonly PrototypeScenario[] = [
  {
    id: "studio-owner-new",
    personaId: "studio-owner",
    personaLabel: "Studio Staff",
    state: "new",
    stateLabel: "New",
    accessRole: "Studio Staff",
    participantName: "Tom Evans",
    ...northstarWorkspace,
    entry: "studio-sign-up",
    startHref: "/studio-onboard",
    continuationHref: "/studio-onboard",
    summary: "A first-time Studio Staff user with no projects or activity.",
    supportedStates: ["Studio sign-up", "AI-assisted Studio onboarding", "First-video empty states"],
  },
  {
    id: "studio-owner-active",
    personaId: "studio-owner",
    personaLabel: "Studio Staff",
    state: "active",
    stateLabel: "Active",
    accessRole: "Studio Staff",
    participantName: "Tom Evans",
    ...northstarWorkspace,
    entry: "workspace",
    startHref: "/today",
    continuationHref: "/today",
    summary: "A Studio Staff user with the complete North Star Films workspace and administration access.",
    supportedStates: ["Active videos", "Media and comments", "Notifications", "Studio administration"],
  },
  {
    id: "studio-owner-edge",
    personaId: "studio-owner",
    personaLabel: "Studio Staff",
    state: "edge",
    stateLabel: "Edge Case",
    accessRole: "Studio Staff",
    participantName: "Tom Evans",
    ...northstarWorkspace,
    entry: "workspace",
    startHref: "/media/media-failed-01",
    continuationHref: "/media/media-failed-01",
    summary: "A Studio owner starting on a failed media upload in an active project.",
    supportedStates: ["Failed upload", "Incomplete processing", "Archived projects", "Invoices to pay"],
  },
  {
    id: "producer-new",
    personaId: "producer",
    personaLabel: "Studio Staff",
    state: "new",
    stateLabel: "New",
    accessRole: "Studio Staff",
    participantName: "Sam Chen",
    ...northstarWorkspace,
    entry: "studio-invitation",
    startHref: "/prototype/journey-entry",
    continuationHref: "/today",
    summary: "An invited Studio team member before joining the workspace.",
    supportedStates: ["Studio invitation", "Empty Today view", "First assigned video empty state"],
  },
  {
    id: "producer-active",
    personaId: "producer",
    personaLabel: "Studio Staff",
    state: "active",
    stateLabel: "Active",
    accessRole: "Studio Staff",
    participantName: "Sam Chen",
    ...northstarWorkspace,
    entry: "workspace",
    startHref: "/today",
    continuationHref: "/today",
    summary: "A working producer using the existing Studio Staff access role.",
    supportedStates: ["Today planning", "Active videos", "Project chat", "Media and notifications"],
  },
  {
    id: "producer-edge",
    personaId: "producer",
    personaLabel: "Studio Staff",
    state: "edge",
    stateLabel: "Edge Case",
    accessRole: "Studio Staff",
    participantName: "Sam Chen",
    ...northstarWorkspace,
    entry: "workspace",
    startHref: "/active-videos?project=ramp-finance-recap",
    continuationHref: "/active-videos?project=ramp-finance-recap",
    summary: "A producer starting on paused work with a withdrawn freelancer invitation.",
    supportedStates: ["Paused video", "Withdrawn invitation", "Waiting Stage", "Unread project messages"],
  },
  {
    id: "freelancer-new",
    personaId: "freelancer",
    personaLabel: "Studio Freelancer",
    state: "new",
    stateLabel: "New",
    accessRole: "Studio Freelancer",
    participantName: "Jordan Lee",
    ...northstarWorkspace,
    entry: "freelancer-invitation",
    startHref: "/prototype/journey-entry",
    continuationHref: "/today",
    summary: "A contractor opening their first invitation with no existing work or activity.",
    supportedStates: ["Freelancer invitation", "No active jobs", "No conversations", "No notifications"],
  },
  {
    id: "freelancer-active",
    personaId: "freelancer",
    personaLabel: "Studio Freelancer",
    state: "active",
    stateLabel: "Active",
    accessRole: "Studio Freelancer",
    participantName: "Jordan Lee",
    ...northstarWorkspace,
    entry: "workspace",
    startHref: "/today",
    continuationHref: "/today",
    summary: "A contractor with accepted project work, time entries and payment activity.",
    supportedStates: ["Assigned Stages", "Time logging", "Contractor offers", "Invoice status"],
  },
  {
    id: "freelancer-edge",
    personaId: "freelancer",
    personaLabel: "Studio Freelancer",
    state: "edge",
    stateLabel: "Edge Case",
    accessRole: "Studio Freelancer",
    participantName: "Jordan Lee",
    ...northstarWorkspace,
    entry: "workspace",
    startHref: "/active-videos?scenario-view=offer-history",
    continuationHref: "/active-videos?scenario-view=offer-history",
    summary: "A contractor starting on offer history that includes a revoked assignment.",
    supportedStates: ["Revoked offer", "Invitation history", "Completed work", "Invoice required"],
  },
  {
    id: "client-new",
    personaId: "client",
    personaLabel: "Client",
    state: "new",
    stateLabel: "New",
    accessRole: "Customer",
    participantName: "Jess Taylor",
    ...loomClientWorkspace,
    entry: "client-magic-link",
    startHref: "/prototype/journey-entry",
    continuationHref: "/workspaces/northstar-films/clients/loom/portal",
    summary: "A first-time Client opening a Studio magic link with no videos or activity.",
    supportedStates: ["Magic-link access", "Name and email confirmation", "First-video empty state", "Client Brief creation", "First Shoot setup"],
    fixtureProjectIds: [clientNewVideoProject.id],
    testOverrides: {
      shootPlanStartsEmpty: true,
    },
  },
  {
    id: "client-active",
    personaId: "client",
    personaLabel: "Client",
    state: "active",
    stateLabel: "Active",
    accessRole: "Customer",
    participantName: "Jess Taylor",
    ...loomClientWorkspace,
    entry: "workspace",
    startHref: "/workspaces/northstar-films/clients/loom/portal",
    continuationHref: "/workspaces/northstar-films/clients/loom/portal",
    summary: "A Loom Client with an isolated portal, active videos, feedback and messages.",
    supportedStates: ["Client queue", "Approvals", "External comments", "Client notifications"],
  },
  {
    id: "client-edge",
    personaId: "client",
    personaLabel: "Client",
    state: "edge",
    stateLabel: "Edge Case",
    accessRole: "Customer",
    participantName: "Jess Taylor",
    ...loomClientWorkspace,
    entry: "workspace",
    startHref: "/review?project=loom-launch-film",
    continuationHref: "/review?project=loom-launch-film",
    summary: "A Client starting on unresolved feedback, with paused and archived work still available in their portal.",
    supportedStates: ["Unresolved feedback", "Paused video", "Archived video", "Waiting on Client"],
  },
] as const;

export function getPrototypeScenario(id: string | null | undefined) {
  return prototypeScenarios.find((scenario) => scenario.id === id) ?? null;
}

export function getPrototypeScenarioBySelection(
  personaId: PrototypeScenarioPersonaId,
  state: PrototypeScenarioState,
) {
  return prototypeScenarios.find(
    (scenario) => scenario.personaId === personaId && scenario.state === state,
  ) ?? null;
}
