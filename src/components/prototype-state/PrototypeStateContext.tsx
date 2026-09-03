"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { usePrototypeScenario } from "@/components/prototype-scenarios/PrototypeScenarioContext";
import type { BriefFields } from "@/data/brief";
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
  updateProjectBriefState,
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
  inviteClientTeammate: (input: { clientId: string; name: string; email: string }) => void;
  inviteClient: (input: { clientId: string; projectId: string; name: string; email: string }) => void;
  markClientPreviewed: () => void;
  completeOnboarding: () => void;
  updateOnboardingProgress: (update: Partial<PrototypeOnboardingProgress>) => void;
  updateProjectBrief: (projectId: string, fields: BriefFields) => void;
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
  const persistState = useCallback((nextState: PrototypeState) => {
    const fixtureKey = fixtureKeyRef.current;
    if (!fixtureKey || !fixtureKey.endsWith(`:${nextState.fixtureKind}`)) return;
    window.localStorage.setItem(prototypeStateStorageKey, JSON.stringify(nextState));
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
    if (!hasLoadedScenario || fixtureKeyRef.current === null) return;
    if (!fixtureKeyRef.current.endsWith(`:${state.fixtureKind}`)) return;
    window.localStorage.setItem(prototypeStateStorageKey, JSON.stringify(state));
  }, [activeScenario, hasLoadedScenario, state]);

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

  const inviteClient = useCallback((input: { clientId: string; projectId: string; name: string; email: string }) => {
    commitState((current) => inviteClientToProjectState(current, input));
  }, [commitState]);

  const inviteClientTeammate = useCallback((input: { clientId: string; name: string; email: string }) => {
    commitState((current) => inviteClientTeammateState(current, input));
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
    inviteClientTeammate,
    inviteClient,
    markClientPreviewed: () => commitState(markClientPreviewedState),
    completeOnboarding: () => commitState(completeOnboardingState),
    updateOnboardingProgress: (update) => commitState((current) => updateOnboardingProgressState(current, update)),
    updateProjectBrief: (projectId, fields) => commitState((current) => updateProjectBriefState(current, projectId, fields)),
    updateStudioTemplate: (update) => commitState((current) => updateStudioBriefTemplateState(current, update)),
    updateWorkspaceBranding: (branding) => commitState((current) => updateWorkspaceBrandingState(current, branding)),
    updateWorkspaceDetails: (details) => commitState((current) => updateWorkspaceDetailsState(current, details)),
    replaceWorkspaceClients,
  }), [commitState, commitStudioSetup, createClient, createProject, hasHydrated, inviteClient, inviteClientTeammate, replaceWorkspaceClients, state]);

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
