"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type SetStateAction,
  type Dispatch,
} from "react";
import {
  cloneStudioAiPlaybook,
  initialStudioAiPlaybook,
  type BriskAiStage,
  type FilmmakerModeId,
  type StudioAiPlaybook,
} from "@/data/brisk-ai";

import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { usePrototypeViewer } from "@/components/prototype-state/usePrototypeViewer";
import { usePrototypeScenario } from "@/components/prototype-scenarios/PrototypeScenarioContext";
import { useAskBriskModel } from "./useAskBriskModel";
import type { InputAttachment } from "@/data/brief";
import type { BriefAssistantState } from "@/data/ask-brisk";

export type BriefAssistantHandler = {
  projectId: string;
  submit: (prompt: string, attachments?: InputAttachment[]) => void;
  draft: () => void;
  reveal: () => void;
};

type AskViewerState = {
  seen: string[];
  dismissed: string[];
  priorities: Record<string, string>;
};
const emptyViewerState: AskViewerState = { seen: [], dismissed: [], priorities: {} };

export type BriskAiView = "closed" | "compact" | "panel" | "minimised";

export type BriskAiOpenRequest = {
  id: number;
  prompt?: string;
  submit?: boolean;
};

export type BriskAiResponseDraft = {
  draft: string;
  stage: BriskAiStage;
};

type BriskAiResponseDraftHandler = (response: BriskAiResponseDraft) => boolean;

type OpenAssistantOptions = {
  expanded?: boolean;
  prompt?: string;
  submit?: boolean;
};

type BriskAiContextValue = {
  sessionKey: string;
  assistantName: string;
  model: ReturnType<typeof useAskBriskModel>;
  insights: ReturnType<typeof useAskBriskModel>["insights"];
  unreadInsightCount: number;
  dismissedInsightKeys: string[];
  markInsightsSeen: (keys: string[]) => void;
  dismissInsight: (key: string) => void;
  setPriority: (projectId: string, text: string) => void;
  assistantState: Record<string, unknown>;
  setAssistantState: (field: string, update: (current: unknown) => unknown) => void;
  briefStates: Record<string, Partial<BriefAssistantState>>;
  setBriefState: (projectId: string, update: (current: Partial<BriefAssistantState>) => Partial<BriefAssistantState>) => void;
  registerBriefHandler: (handler: BriefAssistantHandler) => () => void;
  getBriefHandler: (projectId: string) => BriefAssistantHandler | null;
  briefHandoff: { projectId: string; prompt: string; id: number } | null;
  handoffToBrief: (projectId: string, prompt: string) => void;
  consumeBriefHandoff: () => void;
  view: BriskAiView;
  openRequest: BriskAiOpenRequest | null;
  playbook: StudioAiPlaybook;
  conversationModeId: FilmmakerModeId;
  applyResponseDraft: (response: BriskAiResponseDraft) => boolean;
  openAssistant: (options?: OpenAssistantOptions) => void;
  registerResponseDraftHandler: (handler: BriskAiResponseDraftHandler) => () => void;
  closeAssistant: () => void;
  minimiseAssistant: () => void;
  setAssistantView: (view: BriskAiView) => void;
  setConversationModeId: (modeId: FilmmakerModeId) => void;
  updatePlaybook: (playbook: StudioAiPlaybook) => void;
};

const BriskAiContext = createContext<BriskAiContextValue | null>(null);
const playbookStorageKey = "brisk-ai-playbook-v1";

export function BriskAiProvider({ children }: { children: ReactNode }) {
  const { activeScenario } = usePrototypeScenario();
  const [viewerStates, setViewerStates] = useState<Record<string, AskViewerState>>({});
  const { state: prototypeState } = usePrototypeState();
  const viewer = usePrototypeViewer();
  const sessionKey = `${prototypeState.session.activeWorkspaceId}:${activeScenario?.id ?? "default"}:${viewer?.role ?? "none"}:${viewer?.id ?? "none"}`;
  const viewerState = viewerStates[sessionKey] ?? emptyViewerState;
  const model = useAskBriskModel(viewerState.priorities);
  const workspaceName = model.state.workspaces.find((workspace) => workspace.id === model.viewer?.workspaceId)?.name ?? "your Studio";
  const assistantName = model.viewer?.role === "Customer" ? `Ask ${workspaceName}` : "Ask Brisk";
  const insights = model.insights.filter((insight) => !viewerState.dismissed.includes(`${insight.id}:${insight.fingerprint}`));
  const unreadInsightCount = insights.filter((insight) => !viewerState.seen.includes(`${insight.id}:${insight.fingerprint}`)).length;
  const updateViewer = useCallback((update: (current: AskViewerState) => AskViewerState) => {
    setViewerStates((current) => ({ ...current, [sessionKey]: update(current[sessionKey] ?? emptyViewerState) }));
  }, [sessionKey]);
  const markInsightsSeen = useCallback((keys: string[]) => updateViewer((current) => ({ ...current, seen: [...new Set([...current.seen, ...keys])] })), [updateViewer]);
  const dismissInsight = useCallback((key: string) => updateViewer((current) => ({ ...current, dismissed: [...current.dismissed, key] })), [updateViewer]);
  const setPriority = useCallback((projectId: string, text: string) => {
    if (model.viewer?.role !== "Studio Staff" || !model.projects.some((project) => project.id === projectId)) return;
    updateViewer((current) => ({ ...current, priorities: { ...current.priorities, [projectId]: text.trim() } }));
  }, [model.projects, model.viewer?.role, updateViewer]);
  const [assistantSessions, setAssistantSessions] = useState<Record<string, Record<string, unknown>>>({});
  const assistantState = assistantSessions[sessionKey] ?? {};
  const setAssistantState = useCallback((field: string, update: (current: unknown) => unknown) => {
    setAssistantSessions((current) => ({ ...current, [sessionKey]: { ...current[sessionKey], [field]: update(current[sessionKey]?.[field]) } }));
  }, [sessionKey]);
  const [allBriefStates, setAllBriefStates] = useState<Record<string, Record<string, Partial<BriefAssistantState>>>>({});
  const briefStates = allBriefStates[sessionKey] ?? {};
  const setBriefState = useCallback((projectId: string, update: (current: Partial<BriefAssistantState>) => Partial<BriefAssistantState>) => {
    setAllBriefStates((current) => ({ ...current, [sessionKey]: { ...current[sessionKey], [projectId]: update(current[sessionKey]?.[projectId] ?? {}) } }));
  }, [sessionKey]);
  const briefHandlerRef = useRef<{ key: string; handler: BriefAssistantHandler } | null>(null);
  const registerBriefHandler = useCallback((handler: BriefAssistantHandler) => {
    const registered = { key: sessionKey, handler };
    briefHandlerRef.current = registered;
    return () => { if (briefHandlerRef.current === registered) briefHandlerRef.current = null; };
  }, [sessionKey]);
  const getBriefHandler = useCallback((projectId: string) => briefHandlerRef.current?.key === sessionKey
    && briefHandlerRef.current.handler.projectId === projectId ? briefHandlerRef.current.handler : null, [sessionKey]);
  const [handoffs, setHandoffs] = useState<Record<string, { projectId: string; prompt: string; id: number }>>({});
  const briefHandoff = handoffs[sessionKey] ?? null;
  const handoffToBrief = useCallback((projectId: string, prompt: string) => {
    setHandoffs((current) => ({ ...current, [sessionKey]: { projectId, prompt, id: Date.now() } }));
    setView("panel");
  }, [sessionKey]);
  const consumeBriefHandoff = useCallback(() => setHandoffs((current) => {
    const next = { ...current }; delete next[sessionKey]; return next;
  }), [sessionKey]);
  const [view, setView] = useState<BriskAiView>("closed");
  const [openRequest, setOpenRequest] = useState<BriskAiOpenRequest | null>(null);
  const [playbook, setPlaybook] = useState<StudioAiPlaybook>(() => cloneStudioAiPlaybook(initialStudioAiPlaybook));
  const [conversationModeId, setConversationModeId] = useState<FilmmakerModeId>(initialStudioAiPlaybook.defaultModeId);
  const requestIdRef = useRef(0);
  const responseDraftHandlerRef = useRef<BriskAiResponseDraftHandler | null>(null);

  useEffect(() => {
    const storedPlaybook = readStoredPlaybook();
    if (!storedPlaybook) return;
    setPlaybook(storedPlaybook);
    setConversationModeId(storedPlaybook.defaultModeId);
  }, []);

  const openAssistant = useCallback((options: OpenAssistantOptions = {}) => {
    requestIdRef.current += 1;
    setOpenRequest({
      id: requestIdRef.current,
      prompt: options.prompt,
      submit: options.submit,
    });
    setView("panel");
  }, []);

  const registerResponseDraftHandler = useCallback((handler: BriskAiResponseDraftHandler) => {
    responseDraftHandlerRef.current = handler;

    return () => {
      if (responseDraftHandlerRef.current === handler) {
        responseDraftHandlerRef.current = null;
      }
    };
  }, []);

  const applyResponseDraft = useCallback((response: BriskAiResponseDraft) => (
    responseDraftHandlerRef.current?.(response) ?? false
  ), []);

  const closeAssistant = useCallback(() => setView("closed"), []);
  const minimiseAssistant = useCallback(() => setView("minimised"), []);

  const updatePlaybook = useCallback((nextPlaybook: StudioAiPlaybook) => {
    const clonedPlaybook = {
      ...cloneStudioAiPlaybook(nextPlaybook),
      clientAccessEnabled: true,
    };
    setPlaybook(clonedPlaybook);
    setConversationModeId((currentModeId) =>
      currentModeId === playbook.defaultModeId ? clonedPlaybook.defaultModeId : currentModeId,
    );
    window.localStorage.setItem(playbookStorageKey, JSON.stringify(clonedPlaybook));
  }, [playbook.defaultModeId]);

  const value: BriskAiContextValue = {
    sessionKey, assistantName, model, insights, unreadInsightCount, dismissedInsightKeys: viewerState.dismissed, markInsightsSeen, dismissInsight, setPriority,
    assistantState, setAssistantState, briefStates, setBriefState, registerBriefHandler, getBriefHandler, briefHandoff, handoffToBrief, consumeBriefHandoff,
    view,
    openRequest,
    playbook,
    conversationModeId,
    applyResponseDraft,
    openAssistant,
    registerResponseDraftHandler,
    closeAssistant,
    minimiseAssistant,
    setAssistantView: setView,
    setConversationModeId,
    updatePlaybook,
  };

  return <BriskAiContext.Provider value={value}>{children}</BriskAiContext.Provider>;
}

export function useBriskAi() {
  const context = useContext(BriskAiContext);
  if (!context) throw new Error("useBriskAi must be used within BriskAiProvider");
  return context;
}

function readStoredPlaybook(): StudioAiPlaybook | null {
  const storedValue = window.localStorage.getItem(playbookStorageKey);
  if (!storedValue) return null;

  try {
    const storedPlaybook = JSON.parse(storedValue) as Partial<StudioAiPlaybook>;
    if (
      !storedPlaybook.defaultModeId
      || !storedPlaybook.tone
      || !storedPlaybook.responseLength
      || !Array.isArray(storedPlaybook.exampleReferences)
      || typeof storedPlaybook.clientAccessEnabled !== "boolean"
    ) {
      throw new Error("Stored AI Playbook is incomplete");
    }

    return cloneStudioAiPlaybook({
      ...initialStudioAiPlaybook,
      ...storedPlaybook,
      exampleReferences: storedPlaybook.exampleReferences,
      referenceLinks: storedPlaybook.referenceLinks ?? [],
      clientAccessEnabled: true,
    });
  } catch {
    window.localStorage.removeItem(playbookStorageKey);
    return null;
  }
}

// Both Brief surfaces use the same in-memory, user-scoped state. It survives route changes.
export function useBriefAiState<K extends keyof BriefAssistantState>(
  projectId: string, field: K, initial: BriefAssistantState[K] | (() => BriefAssistantState[K]),
): [BriefAssistantState[K], Dispatch<SetStateAction<BriefAssistantState[K]>>] {
  const { briefStates, setBriefState } = useBriskAi();
  const [fallback] = useState(initial);
  const value = briefStates[projectId]?.[field] ?? fallback;
  const setValue = useCallback<Dispatch<SetStateAction<BriefAssistantState[K]>>>((update) => {
    setBriefState(projectId, (current) => ({ ...current, [field]: typeof update === "function"
      ? (update as (previous: BriefAssistantState[K]) => BriefAssistantState[K])(current[field] ?? fallback) : update }));
  }, [fallback, field, projectId, setBriefState]);
  return [value, setValue];
}

// Private assistant drafts and histories remain separate when the prototype role changes.
export function useScopedAiState<T>(field: string, initial: T | (() => T)): [T, Dispatch<SetStateAction<T>>] {
  const { assistantState, setAssistantState } = useBriskAi();
  const [fallback] = useState(initial);
  const value = (assistantState[field] as T | undefined) ?? fallback;
  const setValue = useCallback<Dispatch<SetStateAction<T>>>((update) => {
    setAssistantState(field, (current) => typeof update === "function"
      ? (update as (previous: T) => T)((current as T | undefined) ?? fallback) : update);
  }, [fallback, field, setAssistantState]);
  return [value, setValue];
}
