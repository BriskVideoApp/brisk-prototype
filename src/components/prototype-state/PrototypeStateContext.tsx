"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { usePrototypeScenario } from "@/components/prototype-scenarios/PrototypeScenarioContext";
import type { BriefFields } from "@/data/brief";
import type { RoleSlot } from "@/components/active-videos/types";
import type { Client, NewClientInput } from "@/data/clients";
import {
  cloneStudioBriefConfiguration,
  getStudioBrandColours,
  type StudioBriefConfiguration,
  type StudioReviewDraft,
} from "@/data/studio-onboard";
import {
  addClientToPrototypeState,
  clonePrototypeState,
  createClientVideoState,
  commitStudioSetupState,
  completeOnboardingState,
  createOnboardingEmptyFixture,
  createPopulatedStudioFixture,
  createProjectFromStudioTemplateState,
  inviteClientTeammateState,
  inviteClientToProjectState,
  markClientPreviewedState,
  prototypeStateStorageKey,
  selectWorkspaceClients,
  setFixtureClientSession,
  updateStudioBriefTemplateState,
  updateOnboardingProgressState,
  updateOnboardingOwnerState,
  updateProjectBriefState,
  updateProjectStatusState,
  updateProjectTagsState,
  updateProjectTeamState,
  updateWorkspaceBrandingState,
  updateWorkspaceDetailsState,
  type PrototypeOnboardingProgress,
  type PrototypeState,
  type ScopedClient,
  type ScopedProject,
  type StudioBriefTemplate,
} from "@/data/prototype-state";
import type { StudioBranding, StudioDetails } from "@/data/studio-settings";

type CreateProjectInput = {
  clientId: string;
  name: string;
  fields?: BriefFields;
  configuration?: StudioBriefConfiguration;
};

type PrototypeStateContextValue = {
  state: PrototypeState;
  hasHydrated: boolean;
  commitStudioSetup: (draft: StudioReviewDraft) => void;
  createClient: (input: NewClientInput) => ScopedClient;
  createProject: (input: CreateProjectInput) => ScopedProject | null;
  createClientVideo: (input: { clientId: string; userId: string; name: string; fields?: BriefFields }) => ScopedProject | null;
  inviteClientTeammate: (input: { clientId: string; name: string; email: string }) => void;
  inviteClient: (input: { clientId: string; projectId: string; name: string; email: string }) => void;
  setClientMemberProjects: (input: { clientId: string; memberId: string; projectIds: string[]; role?: "Client Admin" | "Client Member" }) => void;
  markClientPreviewed: () => void;
  completeOnboarding: () => void;
  updateOnboardingProgress: (update: Partial<PrototypeOnboardingProgress>) => void;
  updateOnboardingOwner: (name: string, email: string) => void;
  updateProjectBrief: (projectId: string, fields: BriefFields) => void;
  updateProjectStatus: (projectId: string, status: ScopedProject["status"]) => void;
  updateProjectTags: (projectId: string, tags: string[]) => void;
  updateProjectTeam: (projectId: string, team: RoleSlot[]) => void;
  updateStudioTemplate: (update: Pick<StudioBriefTemplate, "configuration" | "videoTypeIds" | "customVideoTypes" | "customVideoType">) => void;
  updateWorkspaceBranding: (branding: StudioBranding) => void;
  updateWorkspaceDetails: (details: StudioDetails) => void;
  replaceWorkspaceClients: (clients: Client[]) => void;
};

const PrototypeStateContext = createContext<PrototypeStateContextValue | null>(null);

export function PrototypeStateProvider({ children }: { children: ReactNode }) {
  const { activeScenario, hasLoadedScenario } = usePrototypeScenario();
  const pathname = usePathname();
  const [state, setState] = useState<PrototypeState>(() => pathname === "/studio-onboard"
    ? createOnboardingEmptyFixture()
    : createPopulatedStudioFixture());
  const [hasHydrated, setHasHydrated] = useState(false);
  const stateRef = useRef(state);
  const fixtureKeyRef = useRef<string | null>(null);
  const lastPersistedStateRef = useRef<PrototypeState | null>(null);
  const persistState = useCallback((nextState: PrototypeState) => {
    const fixtureKey = fixtureKeyRef.current;
    if (!fixtureKey || !fixtureKey.endsWith(`:${nextState.fixtureKind}`)) return;
    // A committed update is already saved before its persistence effect runs.
    if (lastPersistedStateRef.current === nextState) return;
    window.localStorage.setItem(prototypeStateStorageKey, JSON.stringify(nextState));
    lastPersistedStateRef.current = nextState;
  }, []);
  const commitState = useCallback((update: (current: PrototypeState) => PrototypeState) => {
    const nextState = update(stateRef.current);
    stateRef.current = nextState;
    persistState(nextState);
    setState(nextState);
  }, [persistState]);

  useEffect(() => {
    if (!hasLoadedScenario) return;
    const storedState = readStoredState();
    const fixtureKind = activeScenario?.id === "studio-owner-new"
      || (!activeScenario && (pathname === "/studio-onboard" || storedState?.fixtureKind === "onboarding-empty"))
      ? "onboarding-empty"
      : "populated-studio";
    const fixtureKey = `${activeScenario?.id ?? "default"}:${fixtureKind}`;
    if (fixtureKeyRef.current === fixtureKey) return;
    fixtureKeyRef.current = fixtureKey;
    const stored = storedState?.fixtureKind === fixtureKind ? storedState : null;
    let nextState = stored ?? (fixtureKind === "onboarding-empty"
      ? createOnboardingEmptyFixture()
      : createPopulatedStudioFixture());
    if (activeScenario?.clientId) nextState = setFixtureClientSession(nextState, activeScenario.clientId);
    stateRef.current = nextState;
    setState(nextState);
    setHasHydrated(true);
  }, [activeScenario, hasLoadedScenario, pathname]);

  useEffect(() => {
    if (!hasLoadedScenario) return;
    persistState(state);
  }, [activeScenario, hasLoadedScenario, persistState, state]);

  const commitStudioSetup = useCallback((draft: StudioReviewDraft) => {
    commitState((current) => commitStudioSetupState(current, draft));
  }, [commitState]);

  const createClient = useCallback((input: NewClientInput) => {
    const result = addClientToPrototypeState(stateRef.current, input);
    stateRef.current = result.state;
    persistState(result.state);
    setState(result.state);
    return result.client;
  }, [persistState]);

  const createProject = useCallback((input: CreateProjectInput) => {
    const result = createProjectFromStudioTemplateState(stateRef.current, input);
    if (!result) return null;
    stateRef.current = result.state;
    persistState(result.state);
    setState(result.state);
    return result.project;
  }, [persistState]);

  const createClientVideo = useCallback((input: { clientId: string; userId: string; name: string; fields?: BriefFields }) => {
    const result = createClientVideoState(stateRef.current, input);
    if (!result) return null;
    stateRef.current = result.state;
    persistState(result.state);
    setState(result.state);
    return result.project;
  }, [persistState]);

  const inviteClient = useCallback((input: { clientId: string; projectId: string; name: string; email: string }) => {
    commitState((current) => inviteClientToProjectState(current, input));
  }, [commitState]);

  const inviteClientTeammate = useCallback((input: { clientId: string; name: string; email: string }) => {
    commitState((current) => inviteClientTeammateState(current, input));
  }, [commitState]);

  const setClientMemberProjects = useCallback((input: { clientId: string; memberId: string; projectIds: string[]; role?: "Client Admin" | "Client Member" }) => {
    commitState((current) => {
      const workspaceId = current.session.activeWorkspaceId;
      const client = current.clients.find((candidate) => candidate.id === input.clientId && candidate.workspaceId === workspaceId);
      const member = client?.contacts.find((contact) => contact.id === input.memberId);
      if (!client || !member) return current;
      const projectIds = [...new Set(input.projectIds)].filter((projectId) => current.projects.some((project) => (
        project.id === projectId && project.clientId === client.id && project.workspaceId === workspaceId
      )));
      const invitation = current.invitations.find((candidate) => candidate.clientId === client.id
        && candidate.userId === member.id && candidate.workspaceId === workspaceId);
      return {
        ...current,
        clients: current.clients.map((candidate) => candidate.id === client.id && candidate.workspaceId === workspaceId ? {
          ...candidate,
          contacts: candidate.contacts.map((contact) => contact.id === member.id ? {
            ...contact,
            projectIds,
            membershipRole: input.role ?? contact.membershipRole,
          } : contact),
        } : candidate),
        users: current.users.some((user) => user.id === member.id && user.workspaceId === workspaceId)
          ? current.users
          : [...current.users, { id: member.id, name: member.name, email: member.email, role: "Client" as const, workspaceId, clientId: client.id }],
        projects: current.projects.map((project) => project.clientId === client.id && project.workspaceId === workspaceId ? {
          ...project,
          clientMemberIds: projectIds.includes(project.id)
            ? [...new Set([...project.clientMemberIds, member.id])]
            : project.clientMemberIds.filter((id) => id !== member.id),
        } : project),
        invitations: invitation
          ? current.invitations.map((candidate) => candidate.id === invitation.id ? { ...candidate, projectIds } : candidate)
          : [...current.invitations, {
            id: `invitation-${member.id}`,
            workspaceId,
            clientId: client.id,
            projectIds,
            userId: member.id,
            email: member.email,
            status: "Pending" as const,
            sentAt: new Date().toISOString(),
          }],
      };
    });
  }, [commitState]);

  const replaceWorkspaceClients = useCallback((clients: Client[]) => {
    commitState((current) => {
      const workspaceId = current.session.activeWorkspaceId;
      return {
        ...current,
        clients: [
          ...current.clients.filter((client) => client.workspaceId !== workspaceId),
          ...clients.map((client) => ({ ...client, workspaceId })),
        ],
      };
    });
  }, [commitState]);

  const value = useMemo<PrototypeStateContextValue>(() => ({
    state,
    hasHydrated,
    commitStudioSetup,
    createClient,
    createProject,
    createClientVideo,
    inviteClientTeammate,
    inviteClient,
    setClientMemberProjects,
    markClientPreviewed: () => commitState(markClientPreviewedState),
    completeOnboarding: () => commitState(completeOnboardingState),
    updateOnboardingProgress: (update) => commitState((current) => updateOnboardingProgressState(current, update)),
    updateOnboardingOwner: (name, email) => commitState((current) => updateOnboardingOwnerState(current, name, email)),
    updateProjectBrief: (projectId, fields) => commitState((current) => updateProjectBriefState(current, projectId, fields)),
    updateProjectStatus: (projectId, status) => commitState((current) => updateProjectStatusState(current, projectId, status)),
    updateProjectTags: (projectId, tags) => commitState((current) => updateProjectTagsState(current, projectId, tags)),
    updateProjectTeam: (projectId, team) => commitState((current) => updateProjectTeamState(current, projectId, team)),
    updateStudioTemplate: (update) => commitState((current) => updateStudioBriefTemplateState(current, update)),
    updateWorkspaceBranding: (branding) => commitState((current) => updateWorkspaceBrandingState(current, branding)),
    updateWorkspaceDetails: (details) => commitState((current) => updateWorkspaceDetailsState(current, details)),
    replaceWorkspaceClients,
  }), [commitState, commitStudioSetup, createClient, createClientVideo, createProject, hasHydrated, inviteClient, inviteClientTeammate, replaceWorkspaceClients, setClientMemberProjects, state]);

  return <PrototypeStateContext.Provider value={value}>{children}</PrototypeStateContext.Provider>;
}

export function usePrototypeState() {
  const context = useContext(PrototypeStateContext);
  if (!context) throw new Error("usePrototypeState must be used within PrototypeStateProvider");
  return context;
}

function readStoredState(): PrototypeState | null {
  const stored = window.localStorage.getItem(prototypeStateStorageKey);
  if (!stored) return null;
  try {
    const state = clonePrototypeState(JSON.parse(stored) as PrototypeState);
    const loomShooter = state.projects.find((project) => project.id === "loom-launch-film")?.team.find((slot) => slot.role === "shooter");
    const jordanInvitation = loomShooter?.invitations.find((invitation) => invitation.id === "loom-launch-film-shooter-jl-pending");
    if (jordanInvitation && (jordanInvitation.status === "invited" || jordanInvitation.status === "seen") && jordanInvitation.rateSnapshot === 95) {
      jordanInvitation.rateSnapshot = 122.5;
    }
    state.workspaces = state.workspaces.map((workspace) => ({
      ...workspace,
      website: workspace.website ?? "",
      brandColours: getStudioBrandColours(workspace),
    }));
    const fixtureDefaults = state.fixtureKind === "onboarding-empty"
      ? createOnboardingEmptyFixture()
      : createPopulatedStudioFixture();
    const storedOnboarding = state.onboarding as Partial<PrototypeOnboardingProgress>;
    const workspace = state.workspaces.find((candidate) => candidate.id === state.session.activeWorkspaceId);
    const template = state.studioBriefTemplates.find((candidate) => candidate.workspaceId === state.session.activeWorkspaceId);
    const reconstructedReviewDraft: StudioReviewDraft | null = workspace && template ? {
      view: "studio-setup",
      studioName: workspace.name,
      studioWebsite: workspace.website ?? "",
      logoPreviewUrl: workspace.logoPreviewUrl,
      logoOptions: [],
      brandAccentId: workspace.brandAccentId,
      brandColours: getStudioBrandColours(workspace),
      studioType: workspace.studioType,
      studioDescription: workspace.description,
      videoTypeIds: [...template.videoTypeIds],
      customVideoTypes: template.customVideoTypes?.map((videoType) => ({ ...videoType })) ?? [],
      customVideoType: template.customVideoType ?? null,
      briefConfiguration: cloneStudioBriefConfiguration(template.configuration),
    } : null;
    const shouldResumeFirstProject = storedOnboarding.studioSetupCommitted
      || ["first-client", "first-project", "client-preview", "invite-client"].includes(storedOnboarding.step ?? "");

    return {
      ...state,
      onboarding: {
        ...fixtureDefaults.onboarding,
        ...storedOnboarding,
        view: storedOnboarding.view ?? (shouldResumeFirstProject ? "first-project" : "sign-in"),
        reviewDraft: storedOnboarding.reviewDraft ?? reconstructedReviewDraft,
      },
    };
  } catch {
    window.localStorage.removeItem(prototypeStateStorageKey);
    return null;
  }
}
