import type { Project, ProjectVideoType } from "@/components/active-videos/types";
import { activeVideoProjects } from "@/data/active-videos/mockData";
import {
  clients as populatedClients,
  getClientInitials,
  makeClientId,
  type Client,
  type ClientContact,
  type NewClientInput,
} from "@/data/clients";
import { createInitialBriefFields, type BriefFields, type BriefVideoTypeId } from "@/data/brief";
import {
  cloneStudioBriefConfiguration,
  createRecommendedStudioBriefConfiguration,
  createStudioBrandColours,
  getStudioBrandColours,
  type StudioBrandColour,
  type StudioFollowUpAnswers,
  type StudioFollowUpStepId,
  type StudioBriefConfiguration,
  type StudioCustomVideoType,
  type StudioOnboardingAnswer,
  type StudioReviewDraft,
} from "@/data/studio-onboard";

export const northStarWorkspaceId = "northstar-films";
export const northStarWorkspaceName = "North Star Films";
export const prototypeStateStorageKey = "brisk-prototype-state-v1";

export type PrototypeFixtureKind = "populated-studio" | "onboarding-empty";
export type PrototypeUserRole = "Studio Staff" | "Studio Freelancer" | "Client";
export type PrototypeBriefStatus = "Not sent" | "Waiting on Client" | "In progress" | "Complete";
export type OnboardingStep =
  | "studio-setup"
  | "review-setup"
  | "first-client"
  | "first-project"
  | "client-preview"
  | "invite-client"
  | "complete";
export type PrototypeOnboardingView = "sign-in" | "welcome" | "ai-setup" | "first-project";
export type PrototypeOnboardingAiPhase = "question" | "analysing" | "follow-up" | "review-handoff";

export type PrototypeUser = {
  id: string;
  name: string;
  email: string;
  role: PrototypeUserRole;
  workspaceId: string;
  clientId: string | null;
};

export type PrototypeSession = {
  activeUserId: string;
  activeWorkspaceId: string;
  activeClientId: string | null;
};

export type PrototypeWorkspace = {
  id: string;
  name: string;
  status: "provisional" | "active";
  studioType: string;
  description: string;
  website: string;
  brandAccentId: "purple" | "cyan" | "pink";
  brandColours: StudioBrandColour[];
  logoPreviewUrl: string | null;
};

export type ScopedClient = Client & { workspaceId: string };
export type ScopedProject = Project & {
  workspaceId: string;
  briefStatus: PrototypeBriefStatus;
  clientMemberIds: string[];
};

export type StudioBriefTemplate = {
  id: string;
  workspaceId: string;
  name: string;
  fields: BriefFields;
  configuration: StudioBriefConfiguration;
  videoTypeIds: BriefVideoTypeId[];
  customVideoTypes?: StudioCustomVideoType[];
  customVideoType?: string | null;
};

export type ProjectBriefSnapshot = {
  id: string;
  workspaceId: string;
  clientId: string;
  projectId: string;
  sourceTemplateId: string;
  fields: BriefFields;
  configuration: StudioBriefConfiguration;
  customVideoTypes?: StudioCustomVideoType[];
  customVideoType?: string | null;
};

export type PrototypeInvitation = {
  id: string;
  workspaceId: string;
  clientId: string;
  projectIds: string[];
  userId: string;
  email: string;
  status: "Pending" | "Accepted" | "Expired";
  sentAt: string;
};

export type PrototypeOnboardingProgress = {
  step: OnboardingStep;
  view: PrototypeOnboardingView;
  aiPhase: PrototypeOnboardingAiPhase;
  followUpStepId: StudioFollowUpStepId;
  studioAnswer: StudioOnboardingAnswer | null;
  followUpAnswers: StudioFollowUpAnswers | null;
  reviewDraft: StudioReviewDraft | null;
  hasAnalysedStudio: boolean;
  hasCompletedFollowUps: boolean;
  studioSetupCommitted: boolean;
  clientId: string | null;
  projectId: string | null;
  clientPreviewed: boolean;
  clientInvited: boolean;
};

export type PrototypeState = {
  fixtureKind: PrototypeFixtureKind;
  session: PrototypeSession;
  users: PrototypeUser[];
  workspaces: PrototypeWorkspace[];
  clients: ScopedClient[];
  projects: ScopedProject[];
  studioBriefTemplates: StudioBriefTemplate[];
  projectBriefSnapshots: ProjectBriefSnapshot[];
  invitations: PrototypeInvitation[];
  onboarding: PrototypeOnboardingProgress;
};

export type PortalAccess = { kind: "studio-preview" } | { kind: "external" };

export type ClientPortalData = {
  workspace: PrototypeWorkspace;
  client: ScopedClient;
  projects: ScopedProject[];
};

const studioUser: PrototypeUser = {
  id: "user-tom",
  name: "Tom Mitchell",
  email: "tom@northstarfilms.com.au",
  role: "Studio Staff",
  workspaceId: northStarWorkspaceId,
  clientId: null,
};

const emptyOnboarding: PrototypeOnboardingProgress = {
  step: "studio-setup",
  view: "sign-in",
  aiPhase: "question",
  followUpStepId: "contextual",
  studioAnswer: null,
  followUpAnswers: null,
  reviewDraft: null,
  hasAnalysedStudio: false,
  hasCompletedFollowUps: false,
  studioSetupCommitted: false,
  clientId: null,
  projectId: null,
  clientPreviewed: false,
  clientInvited: false,
};

export function createOnboardingEmptyFixture(): PrototypeState {
  return {
    fixtureKind: "onboarding-empty",
    session: {
      activeUserId: studioUser.id,
      activeWorkspaceId: northStarWorkspaceId,
      activeClientId: null,
    },
    users: [{ ...studioUser }],
    workspaces: [{
      id: northStarWorkspaceId,
      name: northStarWorkspaceName,
      status: "provisional",
      studioType: "",
      description: "",
      website: "",
      brandAccentId: "purple",
      brandColours: createStudioBrandColours("purple"),
      logoPreviewUrl: null,
    }],
    clients: [],
    projects: [],
    studioBriefTemplates: [],
    projectBriefSnapshots: [],
    invitations: [],
    onboarding: { ...emptyOnboarding },
  };
}

export function createPopulatedStudioFixture(): PrototypeState {
  const harbourClient = createClientRecord({
    name: "Harbour Health",
    website: "harbourhealth.com.au",
    primaryContactName: "Mia Chen",
    primaryContactEmail: "mia@harbourhealth.com.au",
  }, "harbour-health");
  const clients = [...populatedClients.map(cloneClient), harbourClient]
    .map((client) => ({ ...client, workspaceId: northStarWorkspaceId }));
  const harbourProject = makeHarbourProject();
  const projects = [...activeVideoProjects.map(cloneProject), harbourProject]
    .map((project) => ({
      ...project,
      workspaceId: northStarWorkspaceId,
      briefStatus: project.stages.brief.state === "done" ? "Complete" as const : "Waiting on Client" as const,
      clientMemberIds: clients
        .find((client) => client.id === project.clientId)?.contacts
        .filter((contact) => contact.projectIds.includes(project.id))
        .map((contact) => contact.id) ?? [],
    }));
  const users: PrototypeUser[] = [
    { ...studioUser },
    ...clients.flatMap((client) => client.contacts.map((contact) => ({
      id: contact.id,
      name: contact.name,
      email: contact.email,
      role: "Client" as const,
      workspaceId: northStarWorkspaceId,
      clientId: client.id,
    }))),
  ];
  const studioTemplate = createDefaultStudioTemplate();
  const invitations = clients.flatMap((client) => client.contacts
    .filter((contact) => contact.projectIds.length > 0)
    .map((contact) => ({
      id: `invitation-${contact.id}`,
      workspaceId: northStarWorkspaceId,
      clientId: client.id,
      projectIds: [...contact.projectIds],
      userId: contact.id,
      email: contact.email,
      status: contact.portalAccess === "Invited" ? "Pending" as const : "Accepted" as const,
      sentAt: "2026-08-01T09:00:00+10:00",
    })));

  return {
    fixtureKind: "populated-studio",
    session: {
      activeUserId: studioUser.id,
      activeWorkspaceId: northStarWorkspaceId,
      activeClientId: null,
    },
    users,
    workspaces: [{
      id: northStarWorkspaceId,
      name: northStarWorkspaceName,
      status: "active",
      studioType: "Full-service production Studio",
      description: "Films for ambitious teams and purpose-driven organisations.",
      website: "https://northstarfilms.com.au",
      brandAccentId: "purple",
      brandColours: createStudioBrandColours("purple"),
      logoPreviewUrl: null,
    }],
    clients,
    projects,
    studioBriefTemplates: [studioTemplate],
    projectBriefSnapshots: projects.map((project) => ({
      id: `brief-${project.id}`,
      workspaceId: northStarWorkspaceId,
      clientId: project.clientId,
      projectId: project.id,
      sourceTemplateId: studioTemplate.id,
      fields: cloneBriefFields(studioTemplate.fields),
      configuration: cloneStudioBriefConfiguration(studioTemplate.configuration),
      customVideoTypes: studioTemplate.customVideoTypes?.map((videoType) => ({ ...videoType })) ?? [],
      customVideoType: studioTemplate.customVideoType ?? null,
    })),
    invitations,
    onboarding: {
      ...emptyOnboarding,
      step: "complete",
      studioSetupCommitted: true,
    },
  };
}

export function setFixtureClientSession(state: PrototypeState, clientId: string): PrototypeState {
  const user = state.users.find((candidate) => candidate.clientId === clientId);
  if (!user) return state;
  return {
    ...state,
    session: {
      activeUserId: user.id,
      activeWorkspaceId: user.workspaceId,
      activeClientId: clientId,
    },
  };
}

export function commitStudioSetupState(state: PrototypeState, draft: StudioReviewDraft): PrototypeState {
  const workspaceId = state.session.activeWorkspaceId;
  const template: StudioBriefTemplate = {
    id: `${workspaceId}-default-brief`,
    workspaceId,
    name: "Default Client Brief",
    fields: createInitialBriefFields(),
    configuration: cloneStudioBriefConfiguration(draft.briefConfiguration),
    videoTypeIds: [...draft.videoTypeIds],
    customVideoTypes: draft.customVideoTypes?.map((videoType) => ({ ...videoType })) ?? [],
    customVideoType: draft.customVideoType ?? null,
  };
  return {
    ...state,
    workspaces: state.workspaces.map((workspace) => workspace.id === workspaceId ? {
      ...workspace,
      name: draft.studioName,
      status: "active",
      studioType: draft.studioType,
      description: draft.studioDescription,
      website: draft.studioWebsite ?? "",
      brandAccentId: draft.brandAccentId,
      brandColours: getStudioBrandColours(draft),
      logoPreviewUrl: draft.logoPreviewUrl,
    } : workspace),
    studioBriefTemplates: [
      ...state.studioBriefTemplates.filter((candidate) => candidate.workspaceId !== workspaceId),
      template,
    ],
    onboarding: {
      ...state.onboarding,
      step: "first-client",
      studioSetupCommitted: true,
    },
  };
}

export function updateWorkspaceDetailsState(
  state: PrototypeState,
  details: { name: string; studioType: string; description: string; website: string },
): PrototypeState {
  const workspaceId = state.session.activeWorkspaceId;
  return {
    ...state,
    workspaces: state.workspaces.map((workspace) => workspace.id === workspaceId ? {
      ...workspace,
      name: details.name,
      studioType: details.studioType,
      description: details.description,
      website: details.website,
    } : workspace),
  };
}

export function updateWorkspaceBrandingState(
  state: PrototypeState,
  branding: Pick<PrototypeWorkspace, "brandAccentId" | "brandColours" | "logoPreviewUrl">,
): PrototypeState {
  const workspaceId = state.session.activeWorkspaceId;
  return {
    ...state,
    workspaces: state.workspaces.map((workspace) => workspace.id === workspaceId ? {
      ...workspace,
      brandAccentId: branding.brandAccentId,
      brandColours: getStudioBrandColours(branding),
      logoPreviewUrl: branding.logoPreviewUrl,
    } : workspace),
  };
}

export function updateStudioBriefTemplateState(
  state: PrototypeState,
  update: Pick<StudioBriefTemplate, "configuration" | "videoTypeIds" | "customVideoTypes" | "customVideoType">,
): PrototypeState {
  const workspaceId = state.session.activeWorkspaceId;
  return {
    ...state,
    studioBriefTemplates: state.studioBriefTemplates.map((template) => template.workspaceId === workspaceId ? {
      ...template,
      configuration: cloneStudioBriefConfiguration(update.configuration),
      videoTypeIds: [...update.videoTypeIds],
      customVideoTypes: update.customVideoTypes?.map((videoType) => ({ ...videoType })) ?? [],
      customVideoType: update.customVideoType ?? null,
    } : template),
  };
}

export function addClientToPrototypeState(
  state: PrototypeState,
  input: NewClientInput,
  requestedId?: string,
): { state: PrototypeState; client: ScopedClient } {
  const workspaceId = state.session.activeWorkspaceId;
  const baseId = requestedId ?? makeClientId(input.name);
  const clientId = makeUniqueId(baseId, state.clients.map((client) => client.id));
  const client: ScopedClient = {
    ...createClientRecord(input, clientId),
    workspaceId,
  };
  return {
    client,
    state: {
      ...state,
      clients: [...state.clients, client],
      onboarding: { ...state.onboarding, step: "first-project", clientId },
    },
  };
}

export function createProjectFromStudioTemplateState(
  state: PrototypeState,
  input: {
    clientId: string;
    name: string;
    videoType?: ProjectVideoType;
    videoLengthSeconds?: number;
    fields?: BriefFields;
    configuration?: StudioBriefConfiguration;
    requestedId?: string;
  },
): { state: PrototypeState; project: ScopedProject } | null {
  const workspaceId = state.session.activeWorkspaceId;
  const client = selectScopedClient(state, workspaceId, input.clientId);
  const template = state.studioBriefTemplates.find((candidate) => candidate.workspaceId === workspaceId);
  if (!client || !template) return null;
  const projectId = makeUniqueId(input.requestedId ?? makeClientId(input.name), state.projects.map((project) => project.id));
  const now = "2026-09-02T09:00:00+10:00";
  const project: ScopedProject = {
    id: projectId,
    workspaceId,
    clientId: client.id,
    clientBadge: client.badge,
    clientName: client.name,
    name: input.name.trim(),
    videoType: input.videoType ?? "liveAction",
    videoLengthSeconds: input.videoLengthSeconds ?? 60,
    latestUpdate: { label: "Project created", daysAgo: 0, timestamp: now },
    deadlineAt: "",
    isCritical: false,
    status: "Queued",
    briefStatus: "Not sent",
    clientMemberIds: [],
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
  const snapshot: ProjectBriefSnapshot = {
    id: `brief-${projectId}`,
    workspaceId,
    clientId: client.id,
    projectId,
    sourceTemplateId: template.id,
    fields: cloneBriefFields(input.fields ?? template.fields),
    configuration: cloneStudioBriefConfiguration(input.configuration ?? template.configuration),
    customVideoTypes: template.customVideoTypes?.map((videoType) => ({ ...videoType })) ?? [],
    customVideoType: template.customVideoType ?? null,
  };
  return {
    project,
    state: {
      ...state,
      projects: [...state.projects, project],
      projectBriefSnapshots: [...state.projectBriefSnapshots, snapshot],
      clients: state.clients.map((candidate) => candidate.id === client.id && candidate.workspaceId === workspaceId ? {
        ...candidate,
        latestActivity: { label: `${project.name} created`, occurredAt: now },
      } : candidate),
      onboarding: { ...state.onboarding, step: "client-preview", clientId: client.id, projectId },
    },
  };
}

export function markClientPreviewedState(state: PrototypeState): PrototypeState {
  return { ...state, onboarding: { ...state.onboarding, step: "invite-client", clientPreviewed: true } };
}

export function inviteClientTeammateState(
  state: PrototypeState,
  input: { clientId: string; name: string; email: string },
): PrototypeState {
  const workspaceId = state.session.activeWorkspaceId;
  const client = selectScopedClient(state, workspaceId, input.clientId);
  const normalisedEmail = input.email.trim().toLocaleLowerCase("en-AU");
  if (!client || !normalisedEmail) return state;

  const existingContact = client.contacts.find((contact) => (
    contact.email.toLocaleLowerCase("en-AU") === normalisedEmail
  ));
  const existingUser = state.users.find((user) => user.workspaceId === workspaceId
    && user.clientId === client.id && user.email.toLocaleLowerCase("en-AU") === normalisedEmail);
  const userId = existingUser?.id
    ?? existingContact?.id
    ?? makeUniqueId(`${client.id}-contact`, [
      ...state.users.map((user) => user.id),
      ...client.contacts.map((contact) => contact.id),
    ]);
  const sentAt = "2026-09-02T09:04:00+10:00";
  const contact: ClientContact = existingContact ? {
    ...existingContact,
    name: input.name.trim(),
    email: normalisedEmail,
    portalAccess: "Invited",
  } : {
    id: userId,
    name: input.name.trim(),
    email: normalisedEmail,
    portalAccess: "Invited",
    lastActive: null,
    projectIds: [],
    membershipRole: "Client Member",
  };
  const existingInvitation = state.invitations.find((invitation) => invitation.workspaceId === workspaceId
    && invitation.clientId === client.id && invitation.userId === userId);

  return {
    ...state,
    users: existingUser ? state.users.map((user) => user.id === existingUser.id ? {
      ...user,
      name: contact.name,
      email: contact.email,
    } : user) : [...state.users, {
      id: userId,
      name: contact.name,
      email: contact.email,
      role: "Client",
      workspaceId,
      clientId: client.id,
    }],
    clients: state.clients.map((candidate) => candidate.id === client.id && candidate.workspaceId === workspaceId ? {
      ...candidate,
      primaryContactId: candidate.primaryContactId ?? contact.id,
      contacts: existingContact
        ? candidate.contacts.map((candidateContact) => candidateContact.id === existingContact.id ? contact : candidateContact)
        : [...candidate.contacts, contact],
      latestActivity: { label: `Invite sent to ${contact.name}`, occurredAt: sentAt },
    } : candidate),
    invitations: existingInvitation ? state.invitations.map((invitation) => invitation.id === existingInvitation.id ? {
      ...invitation,
      email: normalisedEmail,
      status: "Pending",
      sentAt,
    } : invitation) : [...state.invitations, {
      id: `invitation-${userId}`,
      workspaceId,
      clientId: client.id,
      projectIds: [],
      userId,
      email: normalisedEmail,
      status: "Pending",
      sentAt,
    }],
  };
}

export function inviteClientToProjectState(
  state: PrototypeState,
  input: { clientId: string; projectId: string; name: string; email: string },
): PrototypeState {
  const workspaceId = state.session.activeWorkspaceId;
  const client = selectScopedClient(state, workspaceId, input.clientId);
  const project = state.projects.find((candidate) => candidate.workspaceId === workspaceId
    && candidate.clientId === input.clientId && candidate.id === input.projectId);
  if (!client || !project) return state;
  const normalisedEmail = input.email.trim().toLocaleLowerCase("en-AU");
  const existingUser = state.users.find((user) => user.workspaceId === workspaceId
    && user.clientId === client.id && user.email.toLocaleLowerCase("en-AU") === normalisedEmail);
  const userId = existingUser?.id ?? makeUniqueId(`${client.id}-contact`, state.users.map((user) => user.id));
  const contact: ClientContact = {
    id: userId,
    name: input.name.trim(),
    email: normalisedEmail,
    portalAccess: "Invited",
    lastActive: null,
    projectIds: [project.id],
    membershipRole: "Client Admin",
  };
  const sentAt = "2026-09-02T09:05:00+10:00";
  const existingInvitation = state.invitations.find((invitation) => invitation.workspaceId === workspaceId
    && invitation.clientId === client.id && invitation.userId === userId);
  return {
    ...state,
    users: existingUser ? state.users : [...state.users, {
      id: userId,
      name: contact.name,
      email: contact.email,
      role: "Client",
      workspaceId,
      clientId: client.id,
    }],
    clients: state.clients.map((candidate) => candidate.id === client.id && candidate.workspaceId === workspaceId ? {
      ...candidate,
      primaryContactId: candidate.primaryContactId ?? contact.id,
      contacts: candidate.contacts.some((candidateContact) => candidateContact.id === contact.id)
        ? candidate.contacts.map((candidateContact) => candidateContact.id === contact.id
          ? { ...candidateContact, projectIds: [...new Set([...candidateContact.projectIds, project.id])] }
          : candidateContact)
        : [...candidate.contacts, contact],
      latestActivity: { label: `Invite sent to ${contact.name}`, occurredAt: sentAt },
    } : candidate),
    projects: state.projects.map((candidate) => candidate.id === project.id && candidate.workspaceId === workspaceId ? {
      ...candidate,
      status: "In Production",
      briefStatus: "Waiting on Client",
      clientMemberIds: [...new Set([...candidate.clientMemberIds, userId])],
      stages: { ...candidate.stages, brief: { state: "waiting", daysAgo: 0 } },
      latestUpdate: { label: `Brief sent to ${contact.name}`, daysAgo: 0, timestamp: sentAt },
    } : candidate),
    invitations: existingInvitation ? state.invitations.map((invitation) => invitation.id === existingInvitation.id ? {
      ...invitation,
      projectIds: [...new Set([...invitation.projectIds, project.id])],
      email: normalisedEmail,
      status: "Pending",
      sentAt,
    } : invitation) : [...state.invitations, {
      id: `invitation-${userId}-${project.id}`,
      workspaceId,
      clientId: client.id,
      projectIds: [project.id],
      userId,
      email: normalisedEmail,
      status: "Pending",
      sentAt,
    }],
    onboarding: { ...state.onboarding, step: "complete", clientInvited: true },
  };
}

export function completeOnboardingState(state: PrototypeState): PrototypeState {
  return { ...state, onboarding: { ...state.onboarding, step: "complete" } };
}

export function updateOnboardingProgressState(
  state: PrototypeState,
  update: Partial<PrototypeOnboardingProgress>,
): PrototypeState {
  return { ...state, onboarding: { ...state.onboarding, ...update } };
}

export function updateProjectBriefState(
  state: PrototypeState,
  projectId: string,
  fields: BriefFields,
): PrototypeState {
  return {
    ...state,
    projectBriefSnapshots: state.projectBriefSnapshots.map((snapshot) => snapshot.projectId === projectId
      ? { ...snapshot, fields: cloneBriefFields(fields) }
      : snapshot),
  };
}

export function selectWorkspace(state: PrototypeState, workspaceId: string) {
  return state.workspaces.find((workspace) => workspace.id === workspaceId) ?? null;
}

export function selectScopedClient(state: PrototypeState, workspaceId: string, clientId: string) {
  return state.clients.find((client) => client.workspaceId === workspaceId && client.id === clientId) ?? null;
}

export function selectWorkspaceClients(state: PrototypeState, workspaceId: string) {
  return state.clients.filter((client) => client.workspaceId === workspaceId);
}

export function selectWorkspaceProjects(state: PrototypeState, workspaceId: string) {
  return state.projects.filter((project) => project.workspaceId === workspaceId);
}

export function selectClientProjects(state: PrototypeState, workspaceId: string, clientId: string) {
  if (!selectScopedClient(state, workspaceId, clientId)) return [];
  return state.projects.filter((project) => project.workspaceId === workspaceId && project.clientId === clientId);
}

export function selectProject(state: PrototypeState, projectId: string) {
  return state.projects.find((project) => project.id === projectId
    && project.workspaceId === state.session.activeWorkspaceId) ?? null;
}

export function selectProjectBrief(state: PrototypeState, projectId: string) {
  return state.projectBriefSnapshots.find((snapshot) => snapshot.projectId === projectId
    && snapshot.workspaceId === state.session.activeWorkspaceId) ?? null;
}

export function selectClientPortalData(
  state: PrototypeState,
  workspaceId: string,
  clientId: string,
  access: PortalAccess,
): ClientPortalData | null {
  const workspace = selectWorkspace(state, workspaceId);
  const client = selectScopedClient(state, workspaceId, clientId);
  if (!workspace || !client || state.session.activeWorkspaceId !== workspaceId) return null;
  const user = state.users.find((candidate) => candidate.id === state.session.activeUserId);
  if (!user) return null;
  if (access.kind === "studio-preview") {
    if (user.role !== "Studio Staff" && user.role !== "Studio Freelancer") return null;
    return { workspace, client, projects: selectClientProjects(state, workspaceId, clientId) };
  }
  if (user.role !== "Client" || user.workspaceId !== workspaceId || user.clientId !== clientId
    || state.session.activeClientId !== clientId) return null;
  const invitations = state.invitations.filter((invitation) => invitation.workspaceId === workspaceId
    && invitation.clientId === clientId && invitation.userId === user.id
    && invitation.status !== "Expired");
  if (invitations.length === 0) return null;
  const invitedProjectIds = new Set(invitations.flatMap((invitation) => invitation.projectIds));
  const projects = selectClientProjects(state, workspaceId, clientId)
    .filter((project) => invitedProjectIds.has(project.id) && project.clientMemberIds.includes(user.id));
  if (projects.length === 0) return null;
  return { workspace, client, projects };
}

export function getActiveProjectCount(projects: readonly Pick<Project, "status">[]) {
  return projects.filter((project) => project.status === "In Production").length;
}

export function clonePrototypeState(state: PrototypeState): PrototypeState {
  return JSON.parse(JSON.stringify(state)) as PrototypeState;
}

function createDefaultStudioTemplate(): StudioBriefTemplate {
  return {
    id: `${northStarWorkspaceId}-default-brief`,
    workspaceId: northStarWorkspaceId,
    name: "Default Client Brief",
    fields: createInitialBriefFields(),
    configuration: createRecommendedStudioBriefConfiguration(),
    videoTypeIds: ["Brand Film", "Case Study / Testimonial", "Documentary", "Live Action"],
    customVideoTypes: [],
    customVideoType: null,
  };
}

function createClientRecord(input: NewClientInput, id: string): Client {
  const primaryContactId = input.primaryContactEmail ? `${id}-contact-1` : null;
  const contacts: ClientContact[] = primaryContactId ? [{
    id: primaryContactId,
    name: input.primaryContactName?.trim() || "Primary contact",
    email: input.primaryContactEmail?.trim().toLocaleLowerCase("en-AU") ?? "",
    portalAccess: "Invited",
    lastActive: null,
    projectIds: [],
    membershipRole: "Client Admin",
  }] : [];
  return {
    id,
    name: input.name.trim(),
    badge: getClientInitials(input.name),
    type: input.type ?? "Organisation",
    status: "Active",
    website: input.website?.trim() ?? "",
    logoUrl: input.logoUrl ?? null,
    primaryContactId,
    contacts,
    latestActivity: { label: "Client added", occurredAt: "2026-09-02T08:55:00+10:00" },
    portal: { status: "Active", slug: id },
    defaultBrandKitSlug: null,
  };
}

function makeHarbourProject(): Project {
  return {
    id: "harbour-health-care-journey",
    clientId: "harbour-health",
    clientBadge: "HH",
    clientName: "Harbour Health",
    name: "Care Journey",
    videoType: "liveAction",
    videoLengthSeconds: 90,
    latestUpdate: { label: "Brief waiting on Mia", daysAgo: 1, timestamp: "2026-08-31T10:00:00+10:00" },
    deadlineAt: "2026-10-02T17:00:00+10:00",
    isCritical: false,
    status: "In Production",
    file_locations: [],
    stages: {
      brief: { state: "waiting", daysAgo: 1 },
      script: { state: "not_started" },
      shoot: { state: "not_started" },
      media: { state: "not_started" },
      edit: { state: "not_started" },
      masters: { state: "not_started" },
    },
    team: [],
    timeEntries: [],
  };
}

function cloneClient(client: Client): Client {
  return {
    ...client,
    contacts: client.contacts.map((contact) => ({ ...contact, projectIds: [...contact.projectIds] })),
    latestActivity: { ...client.latestActivity },
    portal: { ...client.portal },
  };
}

function cloneProject(project: Project): Project {
  return {
    ...project,
    latestUpdate: { ...project.latestUpdate },
    tags: project.tags ? [...project.tags] : undefined,
    deadline: project.deadline ? { ...project.deadline } : undefined,
    file_locations: project.file_locations.map((location) => ({ ...location })),
    stages: Object.fromEntries(Object.entries(project.stages).map(([key, status]) => [key, { ...status }])) as Project["stages"],
    team: project.team.map((slot) => ({
      ...slot,
      stages: slot.stages.map((stage) => ({ ...stage })),
      invitations: slot.invitations.map((invitation) => ({ ...invitation })),
    })),
    timeEntries: project.timeEntries.map((entry) => ({ ...entry })),
  };
}

function cloneBriefFields(fields: BriefFields): BriefFields {
  return Object.fromEntries(Object.entries(fields).map(([fieldId, field]) => [fieldId, { ...field }])) as BriefFields;
}

function makeUniqueId(baseId: string, existingIds: string[]) {
  if (!existingIds.includes(baseId)) return baseId;
  let index = 2;
  while (existingIds.includes(`${baseId}-${index}`)) index += 1;
  return `${baseId}-${index}`;
}
