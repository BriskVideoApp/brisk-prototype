"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  cloneStudioAiPlaybook,
  initialStudioAiPlaybook,
  type FilmmakerModeId,
  type StudioAiPlaybook,
} from "@/data/brisk-ai";

export type BriskAiView = "closed" | "compact" | "panel" | "minimised";

export type BriskAiOpenRequest = {
  id: number;
  prompt?: string;
  submit?: boolean;
};

type OpenAssistantOptions = {
  expanded?: boolean;
  prompt?: string;
  submit?: boolean;
};

type BriskAiContextValue = {
  view: BriskAiView;
  openRequest: BriskAiOpenRequest | null;
  playbook: StudioAiPlaybook;
  conversationModeId: FilmmakerModeId;
  openAssistant: (options?: OpenAssistantOptions) => void;
  closeAssistant: () => void;
  minimiseAssistant: () => void;
  setAssistantView: (view: BriskAiView) => void;
  setConversationModeId: (modeId: FilmmakerModeId) => void;
  updatePlaybook: (playbook: StudioAiPlaybook) => void;
};

const BriskAiContext = createContext<BriskAiContextValue | null>(null);
const playbookStorageKey = "brisk-ai-playbook-v1";

export function BriskAiProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<BriskAiView>("closed");
  const [openRequest, setOpenRequest] = useState<BriskAiOpenRequest | null>(null);
  const [playbook, setPlaybook] = useState<StudioAiPlaybook>(() => cloneStudioAiPlaybook(initialStudioAiPlaybook));
  const [conversationModeId, setConversationModeId] = useState<FilmmakerModeId>(initialStudioAiPlaybook.defaultModeId);
  const requestIdRef = useRef(0);

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
    setView(options.expanded ? "panel" : "compact");
  }, []);

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

  const value = useMemo<BriskAiContextValue>(() => ({
    view,
    openRequest,
    playbook,
    conversationModeId,
    openAssistant,
    closeAssistant,
    minimiseAssistant,
    setAssistantView: setView,
    setConversationModeId,
    updatePlaybook,
  }), [closeAssistant, conversationModeId, minimiseAssistant, openAssistant, openRequest, playbook, updatePlaybook, view]);

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
      clientAccessEnabled: true,
    });
  } catch {
    window.localStorage.removeItem(playbookStorageKey);
    return null;
  }
}
