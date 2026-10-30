"use client";

import { useConfirmation } from "../../../Brisk DS/src/app/components/ConfirmationDialog";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { IconButton } from "../../../Brisk DS/src/app/components/IconButton";
import { AskBriskInsights } from "./AskBriskInsights";
import { ApprovalReminderReview } from "./ApprovalReminderReview";
import { getAskInsights, getAskProjectResponse, type AskInsight } from "@/data/ask-brisk";
import { getProjectStageHref } from "@/data/project-fixtures";
import { briefClarifyingQuestions } from "@/data/brief";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { Popover } from "../../../Brisk DS/src/app/components/Popover";
import { Input } from "../../../Brisk DS/src/app/components/Input";
import { useBriskAi, useScopedAiState } from "@/components/ai/BriskAiContext";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { useStudioSettings } from "@/components/settings/StudioSettingsContext";
import { DsIcon, type DsIconName } from "@/components/video-review/DsIcon";
import {
  filmmakerModes,
  getAutomaticBriskAiSources,
  getMockBriskAiResponse,
  mockBriskAiChatHistory,
  optionalBriskAiSources,
  type BriskAiResponse,
  type BriskAiSource,
  type BriskAiSourceKind,
  type BriskAiStage,
  type FilmmakerMode,
  type FilmmakerModeId,
  type MockBriskAiChat,
} from "@/data/brisk-ai";
import { canActOnProject } from "@/data/prototype-access";
import { getDemoProject } from "@/data/projects";

type AssistantMessageStatus = "ready" | "using" | "used" | "editing" | "retrying";
type ResponseAction = "use" | "edit" | "save_edit" | "cancel_edit" | "retry";

type AssistantMessage =
  | {
      id: string;
      role: "user";
      body: string;
    }
  | {
      id: string;
      role: "assistant";
      response: BriskAiResponse;
      status: AssistantMessageStatus;
      editableDraft: string;
      committedDraft: string;
    };

type ConversationStateId = "default" | "failure" | "insufficient" | "profile-learning";
type SourcePickerView = "sources";
type ChatHistoryPeriod = MockBriskAiChat["period"];

type ChatHistoryItem = Omit<MockBriskAiChat, "messages"> & {
  messages: AssistantMessage[];
};

type CurrentAiContext = {
  projectId: string | null;
  projectName: string | null;
  clientName: string | null;
  stage: BriskAiStage;
};

type LauncherPosition = {
  x: number;
  y: number;
};

type LauncherDrag = {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  width: number;
  height: number;
  moved: boolean;
};

const launcherPositionStorageKey = "brisk-ai-launcher-position-v1";
const launcherDragThreshold = 5;

export function BriskAiAssistant({ showLauncher = false }: { showLauncher?: boolean }) {
  const { confirm, confirmationDialog } = useConfirmation();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedRole } = usePrototypeRole();
  const { studio } = useStudioSettings();
  const {
    assistantName, model, insights: workloadInsights, markInsightsSeen, briefStates, setBriefState, getBriefHandler,
    handoffToBrief, setAssistantView, dismissedInsightKeys,
    applyResponseDraft,
    closeAssistant,
    conversationModeId,
    openAssistant,
    openRequest,
    playbook,
    view,
  } = useBriskAi();
  const routeContext = useMemo(() => {
    const context = getCurrentAiContext(pathname);
    if (pathname === "/chat" && searchParams.get("project")) { context.projectId = searchParams.get("project"); context.stage = "project"; }
    const project = model.projects.find((entry) => entry.id === context.projectId);
    return { ...context, projectName: project?.name ?? null, clientName: project?.clientName ?? null };
  }, [model.projects, pathname, searchParams]);
  const [scope, setScope] = useScopedAiState("scope", "current");
  const [chooseReminder, setChooseReminder] = useState(false);
  const [showBriefing, setShowBriefing] = useState(false);
  const [reminder, setReminder] = useState<AskInsight | null>(null);
  const [conversationContext, setConversationContext] = useScopedAiState<CurrentAiContext>("context", routeContext);
  const [chatHistory, setChatHistory] = useScopedAiState<ChatHistoryItem[]>("history", () => selectedRole === "Studio Staff" ? mockBriskAiChatHistory.map(hydrateMockChat) : []);
  const [activeChatId, setActiveChatId] = useScopedAiState<string | null>("active", null);
  const [isHistoricalConversation, setIsHistoricalConversation] = useScopedAiState("historical", false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyQuery, setHistoryQuery] = useState("");
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [manualSources, setManualSources] = useScopedAiState<BriskAiSource[]>("sources", () => optionalBriskAiSources.map((source) => ({ ...source, selected: false })));
  const [messages, setMessages] = useScopedAiState<AssistantMessage[]>("messages", []);
  const [inputValue, setInputValue] = useScopedAiState("input", "");
  const [isProcessing, setIsProcessing] = useState(false);
  const [sourcePickerView, setSourcePickerView] = useState<SourcePickerView | null>(null);
  const [sourceQuery, setSourceQuery] = useState("");
  const [promotedSourceId, setPromotedSourceId] = useState<string | null>(null);
  const [hiddenContextSourceIds, setHiddenContextSourceIds] = useState<string[]>([]);
  const [previewSourceId, setPreviewSourceId] = useState<string | null>(null);
  const [conversationState, setConversationState] = useState<ConversationStateId>("default");
  const [toast, setToast] = useState("");
  const [launcherPosition, setLauncherPosition] = useState<LauncherPosition | null>(null);
  const [isLauncherDragging, setIsLauncherDragging] = useState(false);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const sourceAnchorRef = useRef<HTMLDivElement>(null);
  const historyAnchorRef = useRef<HTMLDivElement>(null);
  const handledRequestIdRef = useRef<number | null>(null);
  const responseTimerRef = useRef<number | null>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const launcherDragRef = useRef<LauncherDrag | null>(null);
  const suppressLauncherClickRef = useRef(false);
  const isStandaloneDocument = pathname.startsWith("/print/") || pathname.startsWith("/share/call-sheet/");
  const automaticSources = useMemo(() => getAutomaticBriskAiSources({
    clientName: scope === "current" ? conversationContext.clientName : null,
    projectName: scope === "current" ? conversationContext.projectName : null,
    stage: scope === "current" ? conversationContext.stage : "workspace",
    studioName: studio.details.name,
  }), [conversationContext.clientName, conversationContext.projectName, conversationContext.stage, scope, studio.details.name]);
  const contextProject = model.projects.find((project) => project.id === conversationContext.projectId);
  const scopedProjects = scope === "everywhere" ? model.projects : scope === "workload" || !conversationContext.projectId ? model.workloadProjects : contextProject ? [contextProject] : [];
  const allScopedInsights = getAskInsights(scopedProjects, selectedRole === "Customer", model.priorities);
  const scopedInsights = allScopedInsights.filter((insight) => !dismissedInsightKeys.includes(`${insight.id}:${insight.fingerprint}`));
  const workloadSource: BriskAiSource = { id: "permitted-projects", label: "Project statuses", kind: "record", context: "automatic", required: true,
    selected: true, available: true, clientVisible: true, preview: `${scopedProjects.length} permitted projects in this scope`, detail: "Uses the current Stage statuses and production flow of the projects available to you. This prototype does not monitor external services." };
  const visibleAutomaticSources = (scope !== "current" || !conversationContext.projectId ? [workloadSource] : automaticSources).filter((source) =>
    (scope !== "current" || !conversationContext.projectId || contextProject)
    && (selectedRole === "Studio Staff" || source.clientVisible)
    && (selectedRole === "Studio Staff" || !["current-script", "current-edit", "current-brief"].includes(source.id) || source.id === `current-${conversationContext.stage}`))
    .map((source) => {
      if (source.id === "current-project") return { ...source, preview: contextProject?.name ?? "Current project", detail: "Project status and production flow. Open the linked Stage in an answer to inspect its source." };
      if (["current-brief", "current-script", "current-edit"].includes(source.id)) return { ...source, detail: "The work available to you in this project. Its status is shown on the project Stage; no version or approval is inferred." };
      return source;
    });
  const manualSourceScope = scope === "current" ? conversationContext.projectId ?? "workspace" : scope;
  const visibleManualSources = manualSources.filter((source) => (source.id.startsWith("added-link:") || source.id.startsWith("added-file:"))
    ? (source.id.startsWith(`added-link:${manualSourceScope}:`) || source.id.startsWith(`added-file:${manualSourceScope}:`)) && (scope !== "current" || !conversationContext.projectId || Boolean(contextProject))
    : scope === "current" && conversationContext.projectId === "loom-launch-film" && contextProject
      && (selectedRole === "Studio Staff" || source.clientVisible));
  const visibleChatHistory = chatHistory.filter((chat) => chat.projectId ? model.projects.some((project) => project.id === chat.projectId) : chat.id.startsWith("brisk-ai-chat-"));
  const sharedBrief = scope === "current" && conversationContext.stage === "brief" && contextProject
    ? briefStates[contextProject.id] : undefined;
  const briefMessages = sharedBrief?.messages ?? [];
  const canEditBrief = Boolean(contextProject && model.viewer && (model.viewer.role !== "Studio Freelancer"
    || canActOnProject(model.viewer, contextProject, model.state, "edit", "brief")));
  const isSharedBrief = scope === "current" && conversationContext.stage === "brief" && Boolean(contextProject);
  const scopeLabel = scope === "everywhere" ? "All permitted projects" : scope === "workload" || !conversationContext.projectId
    ? selectedRole === "Customer" ? "Your projects" : "Your workload" : contextProject
      ? `${contextProject.clientName} · ${contextProject.name} · ${conversationContext.stage === "edit" && contextProject.videoType === "animation" ? "Animation" : contextProject.assistantStages.find((stage) => stage.key === conversationContext.stage)?.label ?? "Project"}` : "Project unavailable";
  const insightSeenKeys = scopedInsights.slice(0, 6).map((insight) => `${insight.id}:${insight.fingerprint}`).join("\n");
  useEffect(() => {
    if ((view === "compact" || view === "panel") && showBriefing && insightSeenKeys) markInsightsSeen(insightSeenKeys.split("\n"));
  }, [insightSeenKeys, markInsightsSeen, showBriefing, view]);
  const activeChatTitle = activeChatId ? chatHistory.find((chat) => chat.id === activeChatId)?.title ?? "New chat" : "New chat";
  const allVisibleSources = [...visibleAutomaticSources, ...visibleManualSources];
  const selectedSources = allVisibleSources.filter((source) => source.selected && source.available);
  const visibleContextSources = selectedSources.filter((source) => !hiddenContextSourceIds.includes(source.id));
  const selectedApproach = getSelectedApproach(conversationModeId, playbook.customModeName, playbook.customModeBehaviour);
  const previewSource = previewSourceId ? allVisibleSources.find((source) => source.id === previewSourceId) ?? null : null;
  const composerSources = visibleContextSources.filter((source) => source.context === "manual");
  const shownContextSources = getCompactContextSources(composerSources, promotedSourceId).slice(0, 3);
  const previewIsAnchoredToChip = previewSource ? shownContextSources.some((source) => source.id === previewSource.id) : false;
  const hasConversationContent = (isSharedBrief ? briefMessages.length : messages.length) > 0 || isProcessing || conversationState !== "default";

  const submitPrompt = useCallback((requestedPrompt?: string) => {
    const prompt = (requestedPrompt ?? inputValue).trim();
    if (!prompt || isProcessing) return;

    setAssistantView("panel");
    setShowBriefing(false);
    if (isSharedBrief && contextProject && (!canEditBrief || /where.*(?:project|up to)|what.*(?:next|waiting|approve|attention)|summari[sz]e|deadline|internal|costs|rates/iu.test(prompt))) {
      const restricted = selectedRole !== "Studio Staff" && /internal|staff.only|costs|rates|other client|owner|management/iu.test(prompt);
      const response = restricted ? { body: "I can only use the information available to you. Internal notes and restricted business information are excluded.", links: [] }
        : getAskProjectResponse(prompt, [contextProject], allScopedInsights, selectedRole === "Customer");
      const answer = !canEditBrief && !/where|what|summari[sz]e|deadline|internal|costs|rates/iu.test(prompt)
        ? "This Brief is read only for your assignment. I have not changed its answers. You can ask about project progress."
        : [response.body, ...("categoryRows" in response ? response.categoryRows?.map((row) => `${row.label}: ${row.body}`) ?? [] : [])].join("\n\n");
      setBriefState(contextProject.id, (current) => ({ ...current, messages: [...(current.messages ?? []),
        { id: `brief-question-${Date.now()}`, role: "client", body: prompt, authorLabel: "You", createdAt: "Now", scope: "project" },
        { id: `brief-answer-${Date.now()}`, role: "ai", body: answer, createdAt: "Now", scope: "project", sources: response.links },
      ] }));
      setInputValue(""); return;
    }
    if (isSharedBrief && contextProject) {
      const handler = getBriefHandler(contextProject.id);
      if (!canEditBrief) return;
      if (handler) handler.submit(prompt, visibleManualSources.filter((source) => source.selected && source.available && !briefMessages.some((message) => message.attachments?.some((attachment) => attachment.id === source.id))).map((source) => ({
        id: source.id, kind: source.kind === "video" ? "reference_video" as const : "document" as const, label: source.label, source: source.preview,
      })));
      else {
        handoffToBrief(contextProject.id, prompt);
        router.push(getProjectStageHref(contextProject.id, "brief"));
      }
      setInputValue("");
      return;
    }
    if (/\b(draft|create|build|write|fill)\b.*\bbrief\b/iu.test(prompt) && contextProject && canEditBrief) {
      handoffToBrief(contextProject.id, prompt);
      router.push(getProjectStageHref(contextProject.id, "brief"));
      setInputValue("");
      return;
    }
    if (/remind|reminder/iu.test(prompt)) {
      const candidates = allScopedInsights.filter((insight) => insight.reviewStage);
      if (selectedRole === "Studio Staff" && candidates.length === 1) {
        setReminder(candidates[0]); setInputValue(""); return;
      }
      if (selectedRole === "Studio Staff" && candidates.length > 1) { setChooseReminder(true); setInputValue(""); return; }
    }
    const userMessage: AssistantMessage = {
      id: `brisk-ai-user-${Date.now()}`,
      role: "user",
      body: prompt,
    };
    const chatId = activeChatId ?? `brisk-ai-chat-${Date.now()}`;
    const nextMessages = [...messages, userMessage];
    const manualSourceIds = manualSources.filter((source) => source.selected).map((source) => source.id);

    setMessages(nextMessages);
    setActiveChatId(chatId);
    setChatHistory((current) => upsertChatHistoryItem(current, {
      id: chatId,
      title: current.find((chat) => chat.id === chatId)?.title ?? generateMockChatTitle(prompt),
      period: "Today",
      clientName: conversationContext.clientName ?? "Studio workspace",
      projectId: conversationContext.projectId,
      projectName: conversationContext.projectName ?? "General project work",
      stage: conversationContext.stage,
      manualSourceIds,
      messages: nextMessages,
    }));
    setInputValue("");
    setConversationState("default");
    setIsProcessing(true);

    if (responseTimerRef.current) window.clearTimeout(responseTimerRef.current);
    responseTimerRef.current = window.setTimeout(() => {
      const normalisedPrompt = prompt.toLocaleLowerCase("en-AU");

      if (normalisedPrompt.includes("fail")) {
        setConversationState("failure");
        setIsProcessing(false);
        return;
      }

      if (normalisedPrompt.includes("insufficient source") || normalisedPrompt.includes("not enough source")) {
        setConversationState("insufficient");
        setIsProcessing(false);
        return;
      }

      if (normalisedPrompt.includes("profile still learning")) {
        setConversationState("profile-learning");
        setIsProcessing(false);
        return;
      }

      const isRestrictedPrompt = selectedRole !== "Studio Staff" && /internal|staff.only|costs|rates|other client|owner|management/iu.test(prompt);
      const isCreativeRequest = /rewrite|pacing|review this edit|alternative opening|draft.*script|suggest.*angle|concise|call to action|brand profile/iu.test(prompt);
      const response = isRestrictedPrompt ? { title: "That information is not available here",
        body: "I can only use the projects and information available to you in this workspace. Internal notes and restricted business information are excluded.", citations: [] }
        : isCreativeRequest && selectedRole === "Studio Staff" && contextProject?.id === "loom-launch-film"
          ? limitResponseToSelectedSources(applyCreativeApproach(getMockBriskAiResponse(prompt, conversationContext.stage, contextProject.id), selectedApproach), selectedSources)
          : getAskProjectResponse(prompt, scopedProjects, allScopedInsights, selectedRole === "Customer");
      const assistantMessage: AssistantMessage = {
        id: `brisk-ai-assistant-${Date.now()}`,
        role: "assistant",
        response,
        status: "ready",
        editableDraft: response.draft ?? "",
        committedDraft: response.draft ?? "",
      };

      const completedMessages = [...nextMessages, assistantMessage];
      setMessages(completedMessages);
      setChatHistory((history) => history.map((chat) => chat.id === chatId ? { ...chat, messages: cloneMessages(completedMessages) } : chat));
      setIsProcessing(false);
    }, 720);
  }, [activeChatId, conversationContext, inputValue, isProcessing, manualSources, messages, selectedApproach, selectedRole, selectedSources, scopedProjects, scopedInsights, contextProject, isSharedBrief, getBriefHandler, handoffToBrief, router, setAssistantView, canEditBrief, visibleManualSources, setBriefState, briefMessages, allScopedInsights]);

  useEffect(() => {
    if (!openRequest || handledRequestIdRef.current === openRequest.id) return;
    handledRequestIdRef.current = openRequest.id;
    setShowBriefing(false);
    setConversationState("default");
    if (openRequest.prompt) setInputValue(openRequest.prompt);
    if (openRequest.prompt && openRequest.submit) {
      window.setTimeout(() => submitPrompt(openRequest.prompt), 0);
    }
  }, [openRequest, submitPrompt]);

  useEffect(() => {
    if (view !== "compact" && view !== "panel") return;
    window.requestAnimationFrame(() => promptRef.current?.focus());
  }, [view]);

  useEffect(() => {
    const thread = threadRef.current;
    if (thread) thread.scrollTo({ top: messages.length || briefMessages.length ? thread.scrollHeight : 0, behavior: "smooth" });
  }, [isProcessing, messages.length, briefMessages.length]);

  useEffect(() => {
    setSourcePickerView(null);
    setSourceQuery("");
    setIsHistoryOpen(false);
    setHistoryQuery("");
    setEditingChatId(null);
    setPromotedSourceId(null);
    setHiddenContextSourceIds([]);
    setPreviewSourceId(null);
    setConversationState("default");
    setReminder(null); setChooseReminder(false); setShowBriefing(false);
    if (!isHistoricalConversation && messages.length === 0) setConversationContext(routeContext);
  }, [pathname, selectedRole, routeContext.projectId]);

  useEffect(() => {
    const handleGlobalKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (previewSourceId) setPreviewSourceId(null);
      else if (isHistoryOpen) {
        setIsHistoryOpen(false);
        setHistoryQuery("");
        setEditingChatId(null);
      }
      else if (sourcePickerView) {
        setSourcePickerView(null);
        setSourceQuery("");
      }
      else if (view === "compact" || view === "panel") closeAssistant();
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [closeAssistant, isHistoryOpen, previewSourceId, sourcePickerView, view]);

  useEffect(() => {
    if (!isHistoryOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || historyAnchorRef.current?.contains(event.target)) return;
      setIsHistoryOpen(false);
      setHistoryQuery("");
      setEditingChatId(null);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isHistoryOpen]);


  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => () => {
    if (responseTimerRef.current) window.clearTimeout(responseTimerRef.current);
  }, []);

  useEffect(() => {
    const storedPosition = window.sessionStorage.getItem(launcherPositionStorageKey);
    if (!storedPosition) return;

    try {
      const parsedPosition: unknown = JSON.parse(storedPosition);
      if (!isLauncherPosition(parsedPosition)) return;

      window.requestAnimationFrame(() => {
        const launcher = launcherRef.current;
        setLauncherPosition(clampLauncherPosition(
          parsedPosition,
          launcher?.offsetWidth ?? 0,
          launcher?.offsetHeight ?? 0,
        ));
      });
    } catch {
      window.sessionStorage.removeItem(launcherPositionStorageKey);
    }
  }, []);

  useEffect(() => {
    if (!launcherPosition) return;
    window.sessionStorage.setItem(launcherPositionStorageKey, JSON.stringify(launcherPosition));
  }, [launcherPosition]);

  useEffect(() => {
    const keepLauncherInViewport = () => {
      const launcher = launcherRef.current;
      setLauncherPosition((currentPosition) => currentPosition
        ? clampLauncherPosition(currentPosition, launcher?.offsetWidth ?? 0, launcher?.offsetHeight ?? 0)
        : currentPosition);
    };

    window.addEventListener("resize", keepLauncherInViewport);
    return () => window.removeEventListener("resize", keepLauncherInViewport);
  }, []);

  if (isStandaloneDocument) return null;

  const saveCurrentConversation = () => {
    if (!activeChatId || messages.length === 0) return;
    const manualSourceIds = manualSources.filter((source) => source.selected).map((source) => source.id);
    setChatHistory((current) => current.map((chat) => chat.id === activeChatId ? {
      ...chat,
      clientName: conversationContext.clientName ?? chat.clientName,
      projectId: conversationContext.projectId,
      projectName: conversationContext.projectName ?? chat.projectName,
      stage: conversationContext.stage,
      manualSourceIds,
      messages: cloneMessages(messages),
    } : chat));
  };

  const resetConversationToCurrentScreen = () => {
    setShowBriefing(false);
    if (responseTimerRef.current) window.clearTimeout(responseTimerRef.current);
    setActiveChatId(null);
    setMessages([]);
    setInputValue("");
    setIsProcessing(false);
    setConversationState("default");
    setConversationContext(routeContext);
    setManualSources(optionalBriskAiSources.map((source) => ({ ...source, selected: false })));
    setPromotedSourceId(null);
    setHiddenContextSourceIds([]);
    setPreviewSourceId(null);
    setSourcePickerView(null);
    setSourceQuery("");
    setIsHistoryOpen(false);
    setHistoryQuery("");
    setEditingChatId(null);
    setIsHistoricalConversation(false);
    window.requestAnimationFrame(() => promptRef.current?.focus());
  };

  const startNewChat = async () => {
    if (inputValue.trim() && !(await confirm({ title: "Discard your unsent message?", description: "Start a new chat without sending this message.", tone: "danger", confirmLabel: "Discard and start chat" }))) return;
    saveCurrentConversation();
    resetConversationToCurrentScreen();
  };

  const openHistoryChat = async (chatId: string) => {
    setShowBriefing(false);
    if (chatId === activeChatId) {
      setIsHistoryOpen(false);
      setHistoryQuery("");
      window.requestAnimationFrame(() => promptRef.current?.focus());
      return;
    }
    if (inputValue.trim() && !(await confirm({ title: "Discard your unsent message?", description: "Open the selected chat without sending this message.", tone: "danger", confirmLabel: "Discard and open chat" }))) return;

    const chat = chatHistory.find((candidate) => candidate.id === chatId);
    if (!chat) return;
    saveCurrentConversation();
    if (responseTimerRef.current) window.clearTimeout(responseTimerRef.current);
    setActiveChatId(chat.id);
    setMessages(cloneMessages(chat.messages));
    setInputValue("");
    setIsProcessing(false);
    setConversationState("default");
    setConversationContext({
      projectId: chat.projectId,
      projectName: chat.projectName,
      clientName: chat.clientName,
      stage: chat.stage,
    });
    setManualSources(optionalBriskAiSources.map((source) => ({ ...source, selected: chat.manualSourceIds.includes(source.id) })));
    setPromotedSourceId("current-project");
    setHiddenContextSourceIds([]);
    setPreviewSourceId(null);
    setSourcePickerView(null);
    setSourceQuery("");
    setIsHistoryOpen(false);
    setHistoryQuery("");
    setEditingChatId(null);
    setIsHistoricalConversation(true);
    window.requestAnimationFrame(() => promptRef.current?.focus());
  };

  const beginRenamingChat = (chat: ChatHistoryItem) => {
    setEditingChatId(chat.id);
    setRenameValue(chat.title);
  };

  const finishRenamingChat = (chatId: string) => {
    const nextTitle = renameValue.trim();
    if (nextTitle) setChatHistory((current) => current.map((chat) => chat.id === chatId ? { ...chat, title: nextTitle } : chat));
    setEditingChatId(null);
    setRenameValue("");
  };

  const deleteHistoryChat = async (chat: ChatHistoryItem) => {
    if (!(await confirm({ title: `Delete “${chat.title}”?`, description: "This only removes the mocked chat history.", tone: "danger", confirmLabel: "Delete chat" }))) return;
    setChatHistory((current) => current.filter((candidate) => candidate.id !== chat.id));
    if (chat.id === activeChatId) resetConversationToCurrentScreen();
  };

  const toggleManualSource = (sourceId: string) => {
    setPromotedSourceId((current) => current === sourceId ? null : current);
    setManualSources((current) => current.map((source) => {
      if (source.id !== sourceId || !source.available) return source;
      const selected = !source.selected;
      setToast(selected ? `${source.label} added.` : `${source.label} removed.`);
      return { ...source, selected };
    }));
  };

  const removeContextChip = (sourceId: string) => {
    const source = allVisibleSources.find((candidate) => candidate.id === sourceId);
    if (!source) return;

    if (source.context === "manual") {
      toggleManualSource(sourceId);
      return;
    }

    setPromotedSourceId((current) => current === sourceId ? null : current);
    setHiddenContextSourceIds((current) => current.includes(sourceId) ? current : [...current, sourceId]);
    setToast(`${source.label} removed from the context row.`);
  };

  const closeSourcePicker = () => {
    setSourcePickerView(null);
    setSourceQuery("");
    window.requestAnimationFrame(() => sourceAnchorRef.current?.querySelector<HTMLButtonElement>("button")?.focus());
  };

  const selectSource = (sourceId: string) => {
    const source = allVisibleSources.find((candidate) => candidate.id === sourceId);
    if (!source?.available) return;

    if (source.context === "manual") {
      setManualSources((current) => current.map((candidate) => candidate.id === sourceId ? { ...candidate, selected: true } : candidate));
      setToast(`${source.label} added.`);
    } else {
      setToast(`${source.label} is already included automatically.`);
    }

    setPromotedSourceId(sourceId);
    setHiddenContextSourceIds((current) => current.filter((id) => id !== sourceId));
    setInputValue((current) => current.replace(/(^|\s)@[^@\s]*$/u, "$1"));
    closeSourcePicker();
    window.requestAnimationFrame(() => promptRef.current?.focus());
  };

  const addFileSources = (files: FileList) => {
    const sources = Array.from(files).map((file): BriskAiSource => ({
      id: `added-file:${manualSourceScope}:${file.name}:${file.size}:${file.lastModified}`,
      label: file.name, kind: file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "document",
      context: "manual", required: false, selected: true, available: true, clientVisible: true,
      preview: file.name, detail: "Attached to this private conversation. File contents are not processed in this prototype.",
    }));
    if (!sources.length) return;
    const ids = new Set(sources.map((source) => source.id));
    setManualSources((current) => [...current.filter((source) => !ids.has(source.id)), ...sources]);
    setPromotedSourceId(sources[0].id);
    setHiddenContextSourceIds((current) => current.filter((id) => !ids.has(id)));
    setToast("File attached. Its contents are not processed in this prototype.");
    closeSourcePicker();
    window.requestAnimationFrame(() => promptRef.current?.focus());
  };

  const addLinkSource = (url: URL) => {
    const id = `added-link:${manualSourceScope}:${url.href}`;
    const source: BriskAiSource = {
      id, label: `${url.hostname}${url.pathname === "/" ? "" : url.pathname}`,
      kind: "page", context: "manual", required: false, selected: true,
      available: true, clientVisible: true, preview: url.href, detail: url.href,
    };
    setManualSources((current) => [...current.filter((entry) => entry.id !== id), source]);
    setPromotedSourceId(id);
    setHiddenContextSourceIds((current) => current.filter((entry) => entry !== id));
    setToast("Link added. Its contents are not fetched in this prototype.");
    closeSourcePicker();
    window.requestAnimationFrame(() => promptRef.current?.focus());
  };

  const handlePromptChange = (value: string) => {
    setInputValue(value);
    const mentionMatch = value.match(/(?:^|\s)@([^@\s]*)$/u);
    if (!mentionMatch) return;
    setSourceQuery(mentionMatch[1] ?? "");
    setSourcePickerView("sources");
  };

  const updateVideoRange = (sourceId: string, referenceRange: string) => {
    setManualSources((current) => current.map((source) => source.id === sourceId ? { ...source, referenceRange } : source));
    setToast(`${referenceRange} selected.`);
  };

  const updateMessage = (messageId: string, update: (message: Extract<AssistantMessage, { role: "assistant" }>) => Extract<AssistantMessage, { role: "assistant" }>) => {
    setMessages((current) => current.map((message) => message.id === messageId && message.role === "assistant" ? update(message) : message));
  };

  const runResponseAction = (messageId: string, action: ResponseAction) => {
    if (action === "edit") {
      updateMessage(messageId, (message) => ({ ...message, status: "editing", editableDraft: message.committedDraft ?? message.editableDraft }));
      return;
    }

    if (action === "cancel_edit") {
      updateMessage(messageId, (message) => ({ ...message, status: "ready", editableDraft: message.committedDraft ?? message.editableDraft }));
      return;
    }

    if (action === "save_edit") {
      updateMessage(messageId, (message) => ({
        ...message,
        status: "ready",
        committedDraft: message.editableDraft,
        response: { ...message.response, draft: message.editableDraft },
      }));
      setToast("Changes saved.");
      return;
    }

    if (action === "use") {
      const message = messages.find((candidate) => candidate.id === messageId);
      const responseApplied = message?.role === "assistant" && message.editableDraft.trim()
        ? applyResponseDraft({
            draft: message.editableDraft,
            stage: conversationContext.stage,
          })
        : false;

      if (conversationContext.stage === "script" && !responseApplied) {
        return;
      }

      updateMessage(messageId, (message) => ({ ...message, status: "using" }));
      window.setTimeout(() => updateMessage(messageId, (message) => ({ ...message, status: "used" })), 520);
      return;
    }

    updateMessage(messageId, (message) => ({ ...message, status: "retrying" }));
    window.setTimeout(() => {
      updateMessage(messageId, (message) => ({
        ...message,
        status: "ready",
        response: {
          ...message.response,
          title: message.response.title ? `${message.response.title} - alternative` : "",
          body: `${message.response.body} This alternative is tighter and gives the audience cue greater priority.`,
          draft: message.response.draft ? `${message.editableDraft}\n\nAlternative: Open on the audience pressure, then reveal the product response.` : undefined,
        },
        editableDraft: message.response.draft ? `${message.editableDraft}\n\nAlternative: Open on the audience pressure, then reveal the product response.` : "",
        committedDraft: message.response.draft ? `${message.editableDraft}\n\nAlternative: Open on the audience pressure, then reveal the product response.` : "",
      }));
    }, 620);
  };

  const askAboutInsight = (prompt: string) => {
    const insight = scopedInsights.find((entry) => prompt.includes(entry.projectName));
    if (insight) {
      const project = model.projects.find((entry) => entry.id === insight.projectId);
      setConversationContext({ projectId: insight.projectId, projectName: project?.name ?? null, clientName: project?.clientName ?? null, stage: "project" });
      setScope("current"); setMessages([]); setActiveChatId(null); setIsHistoricalConversation(false);
    }
    setInputValue(prompt); setShowBriefing(false); setAssistantView("panel");
  };
  const isCurrentPageContext = conversationContext.projectId === routeContext.projectId
    && conversationContext.stage === routeContext.stage;
  const currentStageLabel = contextProject?.assistantStages.find((stage) => stage.key === conversationContext.stage)?.label ?? "project";
  const compactScopeLabel = scope === "current" && contextProject && isCurrentPageContext
    ? `This ${conversationContext.stage === "edit" && contextProject.videoType === "animation" ? "Animation" : currentStageLabel}`
    : scopeLabel;


  const composer = (
    <div className="brisk-ai-composer">
      <div className="ask-brisk-message-box">
        {composerSources.some((source) => source.selected && source.available) ? <ContextChips
          sources={composerSources}
          promotedSourceId={promotedSourceId}
          previewSource={previewIsAnchoredToChip ? previewSource : null}
          onClosePreview={() => setPreviewSourceId(null)}
          onOpenOverflow={() => setSourcePickerView("sources")}
          onOpenSource={(sourceId) => setPreviewSourceId((current) => current === sourceId ? null : sourceId)}
          onRemoveSource={removeContextChip}
          onUpdateVideoRange={(sourceId, range) => updateVideoRange(sourceId, range)}
        /> : null}
        <label className="brisk-ai-prompt-field">
          <span className="sr-only">{assistantName}</span>
          <textarea
            ref={promptRef}
            className="paragraph-s"
            disabled={isProcessing}
            placeholder="What would you like to know?"
            rows={2}
            value={inputValue}
            onChange={(event) => handlePromptChange(event.target.value)}
            onKeyDown={(event) => handleComposerKeyDown(event, () => submitPrompt())}
          />
        </label>
        <div className="brisk-ai-composer-actions">
          <div className="brisk-ai-add-source-anchor" ref={sourceAnchorRef}>
            <Popover open={Boolean(sourcePickerView)} title="Add source"
              onOpenChange={(open) => { setSourcePickerView(open ? "sources" : null); if (!open) setSourceQuery(""); }}
              trigger={(props) => <Button {...props} size="S" variant="ghost" aria-label="Add a source"
                onClick={(event) => { if (!sourcePickerView) setSourceQuery(""); props.onClick?.(event); }}>
                <DsIcon name="plus" size={16} />Add source
              </Button>}
            >
              <SourcePicker
                sources={allVisibleSources}
                query={sourceQuery}
                onQueryChange={setSourceQuery}
                onSelect={selectSource}
                onUpload={scope !== "current" || !conversationContext.projectId || contextProject ? addFileSources : undefined}
                onAddLink={scope !== "current" || !conversationContext.projectId || contextProject ? addLinkSource : undefined}

              />
            </Popover>
          </div>
          <span className="ask-brisk-scope-label label-xs" title={scopeLabel}>{compactScopeLabel}</span>
          <Button size="S" variant="primary"
            className="brisk-ai-send-button"
            type="button"
            disabled={!inputValue.trim() || isProcessing}
            onClick={() => submitPrompt()}
          >
            {isProcessing ? <span className="brisk-ai-spinner" aria-hidden="true" /> : <DsIcon name="paper-plane-tilt" size={14} />}
            {isProcessing ? "Working" : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );

  const handleLauncherPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    launcherDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: bounds.left,
      originY: bounds.top,
      width: bounds.width,
      height: bounds.height,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleLauncherPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = launcherDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(deltaX, deltaY) < launcherDragThreshold) return;

    drag.moved = true;
    setIsLauncherDragging(true);
    setLauncherPosition(clampLauncherPosition(
      { x: drag.originX + deltaX, y: drag.originY + deltaY },
      drag.width,
      drag.height,
    ));
  };

  const finishLauncherDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = launcherDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    suppressLauncherClickRef.current = drag.moved;
    if (drag.moved) {
      window.setTimeout(() => {
        suppressLauncherClickRef.current = false;
      }, 0);
    }
    launcherDragRef.current = null;
    setIsLauncherDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <>
      {confirmationDialog}
      {showLauncher && (view === "closed" || view === "minimised") ? (
        <button
          ref={launcherRef}
          className={`brisk-ai-launcher ${isLauncherDragging ? "is-dragging" : ""}`}
          type="button"
          aria-label={assistantName}
          data-tooltip={assistantName}
          style={{
            position: "fixed",
            top: launcherPosition ? `${launcherPosition.y}px` : "auto",
            right: launcherPosition ? "auto" : "var(--brisk-space-2xl)",
            bottom: launcherPosition ? "auto" : "calc(var(--brisk-space-3xl) * 3)",
            left: launcherPosition ? `${launcherPosition.x}px` : "auto",
            zIndex: 1000,
          }}
          onClick={() => {
            if (suppressLauncherClickRef.current) {
              suppressLauncherClickRef.current = false;
              return;
            }
            openAssistant();
          }}
          onPointerCancel={finishLauncherDrag}
          onPointerDown={handleLauncherPointerDown}
          onPointerMove={handleLauncherPointerMove}
          onPointerUp={finishLauncherDrag}
        >
          <DsIcon name="sparkle" size={22} />
          <span className="brisk-ai-launcher-label label-s-semibold">Plan with Brisk AI</span>
        </button>
      ) : null}

      {view === "compact" || view === "panel" ? (
        <aside className={`brisk-ai-floating ask-brisk-panel ${hasConversationContent || reminder || chooseReminder || showBriefing ? "is-expanded" : "is-preview"} ${hasConversationContent ? "has-conversation" : "is-empty"}`} aria-label={`${assistantName} conversation`}>
          <AssistantHeader
            assistantName={assistantName}
            isBriefConversation={isSharedBrief}
            activeChatId={activeChatId}
            chatTitle={activeChatTitle}
            chatHistory={visibleChatHistory}
            editingChatId={editingChatId}
            historyAnchorRef={historyAnchorRef}
            historyQuery={historyQuery}
            isHistoryOpen={isHistoryOpen}
            renameValue={renameValue}
            onBeginRename={beginRenamingChat}
            onClose={() => {
              setIsHistoryOpen(false);
              closeAssistant();
            }}
            onDeleteChat={deleteHistoryChat}
            onFinishRename={finishRenamingChat}
            onHistoryQueryChange={setHistoryQuery}
            onShowBriefing={() => { setIsHistoryOpen(false); setShowBriefing(true); }}
            onNewChat={startNewChat}
            onOpenChat={openHistoryChat}
            onRenameValueChange={setRenameValue}
            onToggleHistory={() => {
              setSourcePickerView(null);
              setIsHistoryOpen((current) => !current);
              setHistoryQuery("");
              setEditingChatId(null);
            }}
          />
          <div className="brisk-ai-thread" ref={threadRef} aria-live="polite" hidden={!hasConversationContent && !showBriefing && !reminder && !chooseReminder}>
            {chooseReminder ? <section className="ask-brisk-reminder" aria-label="Choose reminder project">
              <h2 className="headings-2xs-bold">Which review should I follow up?</h2>
              <p className="paragraph-s">Choose a project to review the recipients and message. Nothing has been sent.</p>
              {allScopedInsights.filter((insight) => insight.reviewStage).map((insight) => <Button key={insight.id} size="S" variant="secondary" onClick={() => { setChooseReminder(false); setReminder(insight); }}>{insight.projectName} · {insight.sourceLabel}</Button>)}
              <Button size="S" variant="ghost" onClick={() => setChooseReminder(false)}>Cancel</Button>
            </section> : null}
            {reminder ? <ApprovalReminderReview key={reminder.id} insight={reminder} onCancel={() => setReminder(null)} /> : null}
            {!chooseReminder && !reminder && showBriefing ? <>
              <Button size="S" variant="ghost" onClick={() => setShowBriefing(false)}>Back to conversation</Button>
              <AskBriskInsights insights={scopedInsights} compact={false} onAsk={askAboutInsight} onRemind={(insight) => { setShowBriefing(false); setReminder(insight); }} />
            </> : null}
            {!chooseReminder && !reminder && !showBriefing && isSharedBrief ? <section className="ask-brisk-brief-thread" aria-label="Shared Brief conversation">
              {briefMessages.map((message) => <article key={message.id} className={`brisk-ai-message ${message.role === "client" ? "is-user" : "is-assistant"}`}>
                <strong className="label-xs-semibold">{message.role === "client" ? "You" : assistantName}</strong>
                <p className="paragraph-s">{message.body}</p>
                {message.sources?.map((source) => <Link className="label-xs-semibold" key={source.href} href={source.href}>{source.label}</Link>)}
                {message.attachments?.map((attachment) => <span className="label-xs" key={attachment.id}>Source: {attachment.label}</span>)}
              </article>)}
              {(sharedBrief?.answerCount ?? 0) >= briefClarifyingQuestions.length && !sharedBrief?.drafted ? <Button size="S" onClick={() => getBriefHandler(contextProject!.id)?.draft()}>Draft my Brief</Button> : null}
              {sharedBrief?.drafting ? <p className="paragraph-s" role="status">Drafting your Brief…</p> : null}
              {sharedBrief?.drafted && !sharedBrief.drafting ? <Button size="S" variant="secondary" onClick={() => { getBriefHandler(contextProject!.id)?.reveal(); closeAssistant(); }}>Review Brief</Button> : null}
            </section> : null}
            {!chooseReminder && !reminder && !showBriefing && !isSharedBrief ? <>

            {conversationState === "failure" ? (
              <ConversationState
                icon="alert-triangle"
                title="Brisk AI could not finish that response"
                body="Your prompt and selected sources are still here."
                actionLabel="Retry"
                onAction={() => {
                  setConversationState("default");
                  const lastUserPrompt = [...messages].reverse().find((message) => message.role === "user");
                  if (lastUserPrompt?.role === "user") submitPrompt(lastUserPrompt.body.replace(/fail/giu, "retry"));
                }}
              />
            ) : conversationState === "insufficient" ? (
              <ConversationState
                icon="info"
                title="Add a little more context"
                body="Add a Brief, Script, Edit version or supporting file for a useful review."
                actionLabel="Add source"
                onAction={() => setSourcePickerView("sources")}
              />
            ) : conversationState === "profile-learning" ? (
              <ConversationState
                icon="sparkle"
                title="The AI Brand Profile is still learning"
                body="Brisk AI will improve its understanding as more work is completed for this Client."
                actionLabel="Continue"
                onAction={() => setConversationState("default")}
              />
            ) : messages.length === 0 && !isProcessing ? (
              null
            ) : (
              messages.map((message) => message.role === "user" ? (
                <article className="brisk-ai-message is-user" key={message.id}>
                  <span className="label-xs-semibold">You</span>
                  <p className="paragraph-s">{message.body}</p>
                </article>
              ) : (
                <AssistantResponse
                  key={message.id}
                  message={message}
                  stage={conversationContext.stage}
                  assistantName={assistantName}
                  onDraftChange={(draft) => updateMessage(message.id, (current) => ({ ...current, editableDraft: draft }))}
                  onAction={(action) => runResponseAction(message.id, action)}
                />
              ))
            )}
            {isProcessing ? <ProcessingState assistantName={assistantName} /> : null}
            </> : null}
          </div>
          {hasConversationContent ? <p className="ask-brisk-demo-note label-xs">Prototype assistant · mock answers</p> : null}
          {composer}
        </aside>
      ) : null}

      {previewSource && !previewIsAnchoredToChip ? (
        <SourcePreview
          source={previewSource}
          onClose={() => setPreviewSourceId(null)}
          onUpdateVideoRange={(range) => updateVideoRange(previewSource.id, range)}
        />
      ) : null}

      {toast ? <div className="brisk-ai-toast label-s-semibold" role="status"><DsIcon name="check-circle" size={16} />{toast}</div> : null}
    </>
  );
}

function AssistantHeader({
  assistantName,
  isBriefConversation,
  activeChatId,
  chatTitle,
  chatHistory,
  editingChatId,
  historyAnchorRef,
  historyQuery,
  isHistoryOpen,
  renameValue,
  onBeginRename,
  onClose,
  onDeleteChat,
  onFinishRename,
  onHistoryQueryChange,
  onShowBriefing,
  onNewChat,
  onOpenChat,
  onRenameValueChange,
  onToggleHistory,
}: {
  assistantName: string;
  isBriefConversation: boolean;
  activeChatId: string | null;
  chatTitle: string;
  chatHistory: ChatHistoryItem[];
  editingChatId: string | null;
  historyAnchorRef: { current: HTMLDivElement | null };
  historyQuery: string;
  isHistoryOpen: boolean;
  renameValue: string;
  onBeginRename: (chat: ChatHistoryItem) => void;
  onClose: () => void;
  onDeleteChat: (chat: ChatHistoryItem) => void;
  onFinishRename: (chatId: string) => void;
  onHistoryQueryChange: (query: string) => void;
  onShowBriefing: () => void;
  onNewChat: () => void;
  onOpenChat: (chatId: string) => void;
  onRenameValueChange: (value: string) => void;
  onToggleHistory: () => void;
}) {
  return (
    <header className="brisk-ai-header">
      <div className="brisk-ai-heading">
        <DsIcon name="star-four" size={16} />
        <div className="brisk-ai-history-anchor" ref={historyAnchorRef}>
          <button
            className="brisk-ai-history-trigger"
            type="button"
            aria-expanded={isHistoryOpen}
            aria-haspopup="dialog"
            onClick={onToggleHistory}
          >
            <strong className="label-s-semibold">{assistantName}</strong>
            <DsIcon name="caret-down" size={13} />
          </button>
          {isHistoryOpen ? (
            <ChatHistoryPopover
              newChatLabel={isBriefConversation ? "Continue Brief conversation" : "Start new chat"}
              activeChatId={activeChatId}
              chats={chatHistory}
              editingChatId={editingChatId}
              query={historyQuery}
              renameValue={renameValue}
              onBeginRename={onBeginRename}
              onDeleteChat={onDeleteChat}
              onFinishRename={onFinishRename}
              onShowBriefing={onShowBriefing}
              onNewChat={onNewChat}
              onOpenChat={onOpenChat}
              onQueryChange={onHistoryQueryChange}
              onRenameValueChange={onRenameValueChange}
            />
          ) : null}
        </div>
      </div>
      <div className="brisk-ai-header-actions">
        {!isBriefConversation ? <IconButton aria-label="Start new chat" onClick={onNewChat}>
          <DsIcon name="pencil-simple-ds" size={16} />
        </IconButton> : null}
        <IconButton aria-label={`Close ${assistantName}`} tooltipAlign="end" onClick={onClose}>
          <DsIcon name="x-close-cross" size={16} />
        </IconButton>
      </div>
    </header>
  );
}

function ChatHistoryPopover({
  newChatLabel,
  activeChatId,
  chats,
  editingChatId,
  query,
  renameValue,
  onBeginRename,
  onDeleteChat,
  onFinishRename,
  onShowBriefing,
  onNewChat,
  onOpenChat,
  onQueryChange,
  onRenameValueChange,
}: {
  newChatLabel: string;
  activeChatId: string | null;
  chats: ChatHistoryItem[];
  editingChatId: string | null;
  query: string;
  renameValue: string;
  onBeginRename: (chat: ChatHistoryItem) => void;
  onDeleteChat: (chat: ChatHistoryItem) => void;
  onFinishRename: (chatId: string) => void;
  onShowBriefing: () => void;
  onNewChat: () => void;
  onOpenChat: (chatId: string) => void;
  onQueryChange: (query: string) => void;
  onRenameValueChange: (value: string) => void;
}) {
  const normalisedQuery = query.trim().toLocaleLowerCase("en-AU");
  const filteredChats = chats.filter((chat) => `${chat.title} ${chat.clientName} ${chat.projectName}`.toLocaleLowerCase("en-AU").includes(normalisedQuery));
  const periods: ChatHistoryPeriod[] = ["Today", "Past week", "Older"];

  return (
    <section className="brisk-ai-history-popover" role="dialog" aria-label="Brisk AI chat history">
      <div className="brisk-ai-history-search">
        <DsIcon name="search" size={15} />
        <input
          autoFocus
          className="label-s"
          type="search"
          aria-label="Search chats"
          placeholder="Search chats"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </div>
      <div className="ask-brisk-actions">
      <Button size="S" variant="ghost" onClick={onShowBriefing}>Your briefing</Button>
      <button className="brisk-ai-history-new label-s-semibold" type="button" onClick={onNewChat}>
        <DsIcon name="pencil-simple-ds" size={16} />
        {newChatLabel}
      </button>
      </div>
      <div className="brisk-ai-history-list">
        {filteredChats.length === 0 ? (
          <div className="brisk-ai-history-empty">
            <strong className="label-s-semibold">No chats found</strong>
            <span className="label-xs">Try another title, Client or project.</span>
          </div>
        ) : periods.map((period) => {
          const periodChats = filteredChats.filter((chat) => chat.period === period);
          if (periodChats.length === 0) return null;

          return (
            <section className="brisk-ai-history-group" key={period}>
              <h3 className="label-xs-semibold">{period}</h3>
              <div>
                {periodChats.map((chat) => (
                  <article className={`brisk-ai-history-item ${chat.id === activeChatId ? "is-active" : ""}`} key={chat.id}>
                    {editingChatId === chat.id ? (
                      <input
                        autoFocus
                        className="brisk-ai-history-rename label-s-semibold"
                        aria-label={`Rename ${chat.title}`}
                        value={renameValue}
                        onBlur={() => onFinishRename(chat.id)}
                        onChange={(event) => onRenameValueChange(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === "Escape") {
                            event.preventDefault();
                            onFinishRename(chat.id);
                          }
                        }}
                      />
                    ) : (
                      <button className="brisk-ai-history-item-main" type="button" onClick={() => onOpenChat(chat.id)}>
                        <span>
                          <strong className="label-s-semibold">{chat.title}</strong>
                          <small className="label-xs">{chat.clientName} · {chat.projectName}</small>
                        </span>
                        {chat.id === activeChatId ? <DsIcon name="check" size={15} /> : null}
                      </button>
                    )}
                    {editingChatId !== chat.id ? (
                      <div className="brisk-ai-history-item-actions">
                        <button type="button" aria-label={`Rename ${chat.title}`} title="Rename" onClick={() => onBeginRename(chat)}><DsIcon name="pencil-simple" size={14} /></button>
                        <button type="button" aria-label={`Delete ${chat.title}`} title="Delete" onClick={() => onDeleteChat(chat)}><DsIcon name="trash-simple" size={14} /></button>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}

function ContextChips({
  sources,
  promotedSourceId,
  previewSource,
  onClosePreview,
  onOpenOverflow,
  onOpenSource,
  onRemoveSource,
  onUpdateVideoRange,
}: {
  sources: BriskAiSource[];
  promotedSourceId: string | null;
  previewSource: BriskAiSource | null;
  onClosePreview: () => void;
  onOpenOverflow: () => void;
  onOpenSource: (sourceId: string) => void;
  onRemoveSource: (sourceId: string) => void;
  onUpdateVideoRange: (sourceId: string, range: string) => void;
}) {
  const compactSources = getCompactContextSources(sources, promotedSourceId).filter((source) => source.kind !== "stage");
  const shownSources = compactSources.slice(0, 3);
  const overflowCount = Math.max(0, compactSources.length - shownSources.length);

  return (
    <div className="brisk-ai-context-chips" aria-label="Current context">
      {shownSources.map((source) => (
        <div className={`brisk-ai-context-chip-wrap ${previewSource?.id === source.id ? "is-previewing" : ""}`} data-tooltip={source.label} key={source.id}>
          <div className={`brisk-ai-context-chip ${source.context === "manual" ? "is-manual" : ""}`}>
            <button className="brisk-ai-context-chip-main label-xs-semibold" type="button" aria-expanded={previewSource?.id === source.id} aria-label={`Preview ${source.label}`} onClick={() => onOpenSource(source.id)}>
              {source.thumbnailUrl && (source.kind === "image" || source.kind === "video") ? <img src={source.thumbnailUrl} alt="" /> : <DsIcon name={getSourceIcon(source.kind)} size={13} />}
              <span>{source.label}</span>
            </button>
            <button className="brisk-ai-context-chip-remove" type="button" aria-label={`Remove ${source.label} chip`} onClick={() => onRemoveSource(source.id)}>
              <DsIcon name="x-close-cross" size={10} />
            </button>
          </div>
          {previewSource?.id === source.id ? (
            <SourcePreview
              anchored
              source={previewSource}
              onClose={onClosePreview}
              onUpdateVideoRange={(range) => onUpdateVideoRange(previewSource.id, range)}
            />
          ) : null}
        </div>
      ))}
      {overflowCount ? (
        <button className="brisk-ai-context-chip is-overflow label-xs-semibold" type="button" aria-label={`Show ${overflowCount} more sources`} onClick={onOpenOverflow}>
          +{overflowCount}
        </button>
      ) : null}
    </div>
  );
}

function AssistantResponse({
  assistantName,
  message,
  onAction,
  onDraftChange,
  stage,
}: {
  assistantName: string;
  message: Extract<AssistantMessage, { role: "assistant" }>;
  onAction: (action: ResponseAction) => void;
  onDraftChange: (draft: string) => void;
  stage: BriskAiStage;
}) {
  const primaryActionLabel = getPrimaryResponseAction(stage);
  const hasReviewableOutput = Boolean(message.response.draft);

  return (
    <article className={`brisk-ai-message is-assistant is-${message.status}`}>
      <header><span><DsIcon name="sparkle" size={14} /></span><strong className="label-s-semibold">{assistantName}</strong></header>
      {message.response.title ? <h3 className="label-s-semibold">{message.response.title}</h3> : null}
      <p className="paragraph-s">{message.response.body}</p>
      {message.response.categoryRows ? (
        <div className="brisk-ai-review-categories">
          {message.response.categoryRows.map((row) => (
            <section key={row.label}>
              <strong className="label-xs-semibold">{row.label}</strong>
              <p className="paragraph-s">{row.body}</p>
            </section>
          ))}
        </div>
      ) : null}
      {message.response.links?.length ? <div className="ask-brisk-answer-sources">{message.response.links.map((link) => <Link className="label-xs-semibold" href={link.href} key={link.href}>{link.label}</Link>)}</div> : null}
      {message.response.draft ? (
        <div className="brisk-ai-draft-output">
          <span className="label-xs-semibold">Suggested editable copy</span>
          {message.status === "editing" ? (
            <textarea
              className="paragraph-s"
              autoFocus
              value={message.editableDraft}
              onChange={(event) => onDraftChange(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && message.editableDraft.trim()) {
                  event.preventDefault();
                  onAction("save_edit");
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  onAction("cancel_edit");
                }
              }}
            />
          ) : <p className="paragraph-s">{message.editableDraft}</p>}
        </div>
      ) : null}
      {hasReviewableOutput ? (
        <div className="brisk-ai-response-actions">
          {message.status === "editing" ? (
            <>
              <Button size="S" variant="secondary" onClick={() => onAction("cancel_edit")}>Cancel</Button>
              <Button size="S" disabled={!message.editableDraft.trim()} onClick={() => onAction("save_edit")}>Save changes</Button>
            </>
          ) : message.status === "used" ? (
            <span className="brisk-ai-response-status is-success label-xs-semibold"><DsIcon name="check-circle" size={14} />{getResponseSuccessLabel(stage)}</span>
          ) : (
            <>
              <Button className="brisk-ai-primary-response-action" size="S" onClick={() => onAction("use")}>{message.status === "using" ? "Adding..." : primaryActionLabel}</Button>
              <Button size="S" variant="secondary" onClick={() => onAction("edit")}>Edit</Button>
              <Button size="S" variant="ghost" className="brisk-ai-try-again-button" type="button" onClick={() => onAction("retry")}>{message.status === "retrying" ? "Trying again..." : "Try again"}</Button>
            </>
          )}
        </div>
      ) : null}
    </article>
  );
}

function ProcessingState({ assistantName }: { assistantName: string }) {
  return (
    <div className="brisk-ai-processing" role="status">
      <span className="brisk-ai-spinner" aria-hidden="true" />
      <span className="label-s">{assistantName} is reviewing the request…</span>
    </div>
  );
}

function ConversationState({ actionLabel, body, icon, onAction, title }: { actionLabel: string; body: string; icon: DsIconName; onAction: () => void; title: string }) {
  return (
    <div className="brisk-ai-conversation-state">
      <span><DsIcon name={icon} size={20} /></span>
      <div><h2 className="headings-2xs-bold">{title}</h2><p className="paragraph-s">{body}</p></div>
      <Button size="S" variant="secondary" onClick={onAction}>{actionLabel}</Button>
    </div>
  );
}

function SourcePicker({
  sources, query, onQueryChange, onSelect, onUpload, onAddLink,
}: {
  sources: BriskAiSource[];
  query: string;
  onQueryChange: (query: string) => void;
  onSelect: (sourceId: string) => void;
  onUpload?: (files: FileList) => void;
  onAddLink?: (url: URL) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [addingLink, setAddingLink] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const normalisedQuery = query.trim().toLocaleLowerCase("en-AU");
  const matches = sources.filter((source) => `${source.label} ${source.preview} ${source.detail ?? ""} ${getSourceSearchTerms(source.kind)}`.toLocaleLowerCase("en-AU").includes(normalisedQuery));
  const visibleSources = normalisedQuery ? matches : getSuggestedSources(sources);
  let linkUrl: URL | null = null;
  try {
    const url = new URL(linkValue);
    if (url.protocol === "http:" || url.protocol === "https:") linkUrl = url;
  } catch { /* Keep Add link disabled until a full web address is entered. */ }

  if (addingLink) return <form className="ask-brisk-link-form" onSubmit={(event) => {
    event.preventDefault();
    if (linkUrl) onAddLink?.(linkUrl);
  }}>
    <Input autoFocus label="Link" type="url" placeholder="https://…" value={linkValue} onChange={(event) => setLinkValue(event.target.value)} />
    <div className="ask-brisk-source-actions">
      <Button size="S" variant="secondary" onClick={() => setAddingLink(false)}>Cancel</Button>
      <Button size="S" type="submit" disabled={!linkUrl}>Add link</Button>
    </div>
  </form>;

  return <div className="ask-brisk-source-content">
    <div className="brisk-ai-source-picker-toolbar">
      <label>
        <span className="sr-only">Search sources</span>
        <DsIcon name="search" size={16} />
        <input autoFocus className="label-s" type="search" placeholder="Search sources" value={query}
          onChange={(event) => onQueryChange(event.target.value)} />
      </label>
    </div>
    <div className="ask-brisk-source-actions">
      {onUpload ? <>
        <input ref={fileInputRef} type="file" multiple hidden aria-label="Choose source files" onChange={(event) => {
          if (event.target.files) onUpload(event.target.files);
        }} />
        <Button size="S" variant="ghost" onClick={() => fileInputRef.current?.click()}>Upload file</Button>
      </> : null}
      {onAddLink ? <Button size="S" variant="ghost" onClick={() => setAddingLink(true)}>Add link</Button> : null}
    </div>
    {visibleSources.length ? <SourcePickerSection title={normalisedQuery ? "Search results" : "Suggested sources"} sources={visibleSources} onSelect={onSelect} />
      : <div className="brisk-ai-source-empty"><strong className="label-s-semibold">No sources found</strong>
        {query ? <Button size="S" variant="ghost" onClick={() => onQueryChange("")}>Clear search</Button> : null}
      </div>}

  </div>;
}

function SourcePickerSection({ onSelect, sources, title }: { onSelect: (sourceId: string) => void; sources: BriskAiSource[]; title: string }) {
  return (
    <section className="brisk-ai-source-section">
      <h3 className="label-xs-semibold">{title}</h3>
      <div>
        {sources.map((source) => (
          <button
            className={`brisk-ai-source-row ${source.selected ? "is-selected" : ""} ${!source.available ? "is-unavailable" : ""}`}
            type="button"
            aria-pressed={source.selected}
            disabled={!source.available}
            key={source.id}
            onClick={() => onSelect(source.id)}
          >
            <span className="brisk-ai-source-row-icon"><DsIcon name={getSourceIcon(source.kind)} size={17} /></span>
            <span className="brisk-ai-source-row-copy"><strong className="label-s-semibold">{source.label}</strong>{getSourcePickerSecondary(source) ? <small className="label-xs">{getSourcePickerSecondary(source)}</small> : null}</span>
            <span className="brisk-ai-source-row-state label-xs">{!source.available ? "Unavailable" : source.selected ? <DsIcon name="check" size={16} /> : null}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function SourcePreview({
  anchored = false,
  source,
  onClose,
  onUpdateVideoRange,
}: {
  anchored?: boolean;
  source: BriskAiSource;
  onClose: () => void;
  onUpdateVideoRange: (range: string) => void;
}) {
  return (
    <section className={`brisk-ai-source-preview ${anchored ? "is-chip-popover" : "is-floating-popover"}`} role="dialog" aria-modal="false" aria-label={`${source.label} preview`}>
      <header><span className="brisk-ai-source-row-icon"><DsIcon name={getSourceIcon(source.kind)} size={18} /></span><div><span className="label-xs">Source preview</span><h2 className="headings-2xs-bold">{source.label}</h2></div><button type="button" aria-label="Close source preview" onClick={onClose}><DsIcon name="x-close-cross" size={16} /></button></header>
      {source.thumbnailUrl ? (
        <div className={`brisk-ai-source-preview-media is-${source.kind}`}><img src={source.thumbnailUrl} alt={`Preview of ${source.label}`} />{source.kind === "video" ? <span><DsIcon name="play" size={22} /></span> : null}{source.duration ? <small className="label-xs-semibold">{source.duration}</small> : null}</div>
      ) : null}
      <div className="brisk-ai-source-preview-copy"><p className="paragraph-s">{source.detail ?? source.preview}</p><span className="label-xs">{source.context === "automatic" ? "Included automatically" : "Added by you"}</span></div>
      {source.kind === "video" ? (
        <fieldset className="brisk-ai-video-range"><legend className="label-s-semibold">Reference</legend><button className={source.referenceRange === "Whole video" ? "is-selected label-xs-semibold" : "label-xs-semibold"} type="button" onClick={() => onUpdateVideoRange("Whole video")}>Whole video</button><button className={source.referenceRange === "00:04-00:18" ? "is-selected label-xs-semibold" : "label-xs-semibold"} type="button" onClick={() => onUpdateVideoRange("00:04-00:18")}>00:04-00:18</button></fieldset>
      ) : null}
    </section>
  );
}

function hydrateMockChat(chat: MockBriskAiChat): ChatHistoryItem {
  return {
    ...chat,
    manualSourceIds: [...chat.manualSourceIds],
    messages: chat.messages.map((message): AssistantMessage => message.role === "user"
      ? { ...message }
      : {
          ...message,
          response: cloneResponse(message.response),
          status: "ready",
          editableDraft: message.response.draft ?? "",
          committedDraft: message.response.draft ?? "",
        }),
  };
}

function cloneMessages(messages: AssistantMessage[]) {
  return messages.map((message): AssistantMessage => message.role === "user"
    ? { ...message }
    : {
        ...message,
        response: cloneResponse(message.response),
      });
}

function cloneResponse(response: BriskAiResponse): BriskAiResponse {
  return {
    ...response,
    citations: response.citations.map((citation) => ({ ...citation })),
    categoryRows: response.categoryRows?.map((row) => ({ ...row, citationIds: [...row.citationIds] })),
  };
}

function upsertChatHistoryItem(history: ChatHistoryItem[], item: ChatHistoryItem) {
  const existingIndex = history.findIndex((chat) => chat.id === item.id);
  if (existingIndex === -1) return [item, ...history];
  return history.map((chat) => chat.id === item.id ? item : chat);
}

function generateMockChatTitle(prompt: string) {
  const normalisedPrompt = prompt.trim().toLocaleLowerCase("en-AU");
  if (normalisedPrompt.includes("approval") || normalisedPrompt.includes("approve")) return "Latest client approval";
  if (normalisedPrompt.includes("edit") && (normalisedPrompt.includes("feedback") || normalisedPrompt.includes("comment"))) return "Summarise edit feedback";
  if (normalisedPrompt.includes("opening") && normalisedPrompt.includes("script")) return "Review the opening script";

  const words = prompt.trim().replace(/[?!.]+$/u, "").split(/\s+/u).slice(0, 6);
  const title = words.join(" ");
  return title ? `${title.charAt(0).toLocaleUpperCase("en-AU")}${title.slice(1)}` : "New Brisk AI chat";
}

function getStageLabel(stage: BriskAiStage) {
  const labels: Record<BriskAiStage, string> = {
    brief: "Brief",
    script: "Script",
    shoot: "Shoot",
    media: "Media",
    edit: "Edit",
    masters: "Masters",
    project: "Project",
    workspace: "Workspace",
  };
  return labels[stage];
}

function isLauncherPosition(value: unknown): value is LauncherPosition {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<LauncherPosition>;
  return Number.isFinite(candidate.x) && Number.isFinite(candidate.y);
}

function clampLauncherPosition(position: LauncherPosition, width: number, height: number): LauncherPosition {
  return {
    x: Math.min(Math.max(position.x, 0), Math.max(window.innerWidth - width, 0)),
    y: Math.min(Math.max(position.y, 0), Math.max(window.innerHeight - height, 0)),
  };
}

function getCurrentAiContext(pathname: string): CurrentAiContext {
  const projectMatch = pathname.match(/^\/projects\/([^/]+)/);
  const projectId = projectMatch?.[1] ?? null;
  const project = projectId ? getDemoProject(projectId) : null;
  let stage: BriskAiStage = projectId ? "project" : "workspace";

  if (pathname.includes("/stages/brief")) stage = "brief";
  else if (pathname.includes("/script")) stage = "script";
  else if (pathname.includes("/stages/shoot")) stage = "shoot";
  else if (pathname.includes("/stages/media")) stage = "media";
  else if (pathname.includes("/stages/edit")) stage = "edit";
  else if (pathname.includes("/stages/masters")) stage = "masters";

  return { projectId, projectName: project?.name ?? null, clientName: project?.customerName ?? null, stage };
}

function getStageHelperCopy(stage: BriskAiStage) {
  if (stage === "script") {
    return {
      placeholder: "Do anything with AI",
    };
  }

  if (stage === "brief") {
    return {
      placeholder: "Ask Brisk AI to draft or improve this brief…",
    };
  }

  if (stage === "edit") {
    return {
      placeholder: "Ask Brisk AI to review this edit…",
    };
  }

  return {
    placeholder: "Ask Brisk AI about this project…",
  };
}

function getPrimaryResponseAction(stage: BriskAiStage) {
  if (stage === "brief") return "Use in brief";
  if (stage === "script") return "Use This Script";
  if (stage === "edit") return "Add as feedback";
  return "Use suggestion";
}

function getResponseSuccessLabel(stage: BriskAiStage) {
  if (stage === "brief") return "Added to the brief as editable copy";
  if (stage === "script") return "Script added to the Words column";
  if (stage === "edit") return "Added as editable feedback";
  return "Suggestion added as editable copy";
}

function getSourcePickerSecondary(source: BriskAiSource) {
  if (!source.available) return source.preview;
  if (source.kind === "video") return `${source.preview}${source.duration ? ` - ${source.duration}` : ""}`;
  if (source.kind === "person") return source.preview;
  return null;
}

function getSourceSearchTerms(kind: BriskAiSourceKind) {
  const terms: Record<BriskAiSourceKind, string> = {
    studio: "studio workspace",
    client: "client",
    brand_brain: "AI Brand Profile brand",
    project: "project record",
    stage: "Stage project",
    brief: "Brief Brisk page record",
    script: "Script Brisk page record",
    edit: "Edit video media",
    comments: "comments feedback",
    document: "document file files",
    image: "image screenshot media file files",
    video: "video media file files",
    page: "page pages Brisk",
    record: "record records project",
    person: "person people team",
  };
  return terms[kind];
}


function getSuggestedSources(sources: BriskAiSource[]) {
  const priorityIds = ["current-script", "current-brief", "current-edit", "current-project", "current-client", "maddie-lee"];
  const availableSources = sources.filter((source) => source.available);
  const prioritised = priorityIds.map((id) => availableSources.find((source) => source.id === id))
    .filter((source): source is BriskAiSource => Boolean(source));
  return deduplicateSources([...prioritised, ...availableSources]).slice(0, 4);
}

function getCompactContextSources(sources: BriskAiSource[], promotedSourceId?: string | null) {
  const selected = sources.filter((source) => source.selected && source.available);
  const promoted = promotedSourceId ? selected.find((source) => source.id === promotedSourceId) : undefined;
  const currentWork = ["current-edit", "current-script", "current-brief"]
    .map((id) => selected.find((source) => source.id === id))
    .find((source): source is BriskAiSource => Boolean(source));
  const primary = [
    selected.find((source) => source.id === "current-client"),
    currentWork,
    selected.find((source) => source.id === "brand-brain"),
  ].filter((source): source is BriskAiSource => Boolean(source));
  const manual = selected.filter((source) => source.context === "manual");
  const supporting = ["current-project", "current-stage"]
    .map((id) => selected.find((source) => source.id === id))
    .filter((source): source is BriskAiSource => Boolean(source));
  const fallback = primary.length || supporting.length ? [] : selected.filter((source) => source.context === "automatic");
  return deduplicateSources([...(promoted ? [promoted] : []), ...primary, ...manual, ...supporting, ...fallback]);
}

function deduplicateSources(sources: BriskAiSource[]) {
  const seen = new Set<string>();
  return sources.filter((source) => {
    if (seen.has(source.id)) return false;
    seen.add(source.id);
    return true;
  });
}

function getSelectedApproach(modeId: FilmmakerModeId, customName: string, customDescription: string): FilmmakerMode {
  const selected = filmmakerModes.find((mode) => mode.id === modeId) ?? filmmakerModes[0];
  return selected.id === "custom" ? { ...selected, label: customName || selected.label, description: customDescription || selected.description } : selected;
}

function applyCreativeApproach(response: BriskAiResponse, approach: FilmmakerMode): BriskAiResponse {
  if (!response.draft && !response.categoryRows) return response;
  const directionByApproach: Record<FilmmakerModeId, string> = {
    "cinematic-storyteller": "It stays visual and human-led.",
    "documentary-filmmaker": "It stays authentic and evidence-led.",
    "corporate-communicator": "It stays clear and stakeholder-safe.",
    "social-first-creator": "It prioritises a faster hook.",
    "campaign-strategist": "It keeps the audience and outcome clear.",
    custom: "It follows the Studio's custom direction.",
  };
  return { ...response, body: `${response.body} ${directionByApproach[approach.id]}` };
}

function getSourceIcon(kind: BriskAiSourceKind): DsIconName {
  const icons: Record<BriskAiSourceKind, DsIconName> = {
    studio: "square-logo",
    client: "users-three",
    brand_brain: "frame-corners",
    project: "grid-four",
    stage: "queue",
    brief: "clipboard-text",
    script: "pen-nib",
    edit: "stage-edit",
    comments: "chat-circle",
    document: "file-text",
    image: "image-square",
    video: "file-video",
    page: "book-open",
    record: "folder-open",
    person: "users-three",
  };
  return icons[kind];
}

function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>, onSubmit: () => void) {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    onSubmit();
  }
}

function cloneSource(source: BriskAiSource): BriskAiSource {
  return { ...source };
}

function limitResponseToSelectedSources(response: BriskAiResponse, selectedSources: BriskAiSource[]): BriskAiResponse {
  const selectedSourceIds = new Set(selectedSources.map((source) => source.id));
  const citations = response.citations.filter((citation) => selectedSourceIds.has(citation.sourceId));
  const citationIds = new Set(citations.map((citation) => citation.id));

  return {
    ...response,
    citations,
    categoryRows: response.categoryRows?.map((row) => ({ ...row, citationIds: row.citationIds.filter((citationId) => citationIds.has(citationId)) })),
  };
}
