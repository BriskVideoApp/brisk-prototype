"use client";

import { usePathname } from "next/navigation";
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
import { useBriskAi } from "@/components/ai/BriskAiContext";
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
type SourcePickerView = "menu" | "files" | "mentions";
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

export function BriskAiAssistant() {
  const pathname = usePathname();
  const { selectedRole } = usePrototypeRole();
  const { studio } = useStudioSettings();
  const {
    applyResponseDraft,
    closeAssistant,
    conversationModeId,
    openAssistant,
    openRequest,
    playbook,
    view,
  } = useBriskAi();
  const routeContext = useMemo(() => getCurrentAiContext(pathname), [pathname]);
  const [conversationContext, setConversationContext] = useState<CurrentAiContext>(routeContext);
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>(() => mockBriskAiChatHistory.map(hydrateMockChat));
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isHistoricalConversation, setIsHistoricalConversation] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyQuery, setHistoryQuery] = useState("");
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [manualSources, setManualSources] = useState<BriskAiSource[]>(() => optionalBriskAiSources.map(cloneSource));
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
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
    clientName: conversationContext.clientName,
    projectName: conversationContext.projectName,
    stage: conversationContext.stage,
    studioName: studio.details.name,
  }), [conversationContext.clientName, conversationContext.projectName, conversationContext.stage, studio.details.name]);
  const visibleAutomaticSources = automaticSources.filter((source) => selectedRole !== "Customer" || source.clientVisible);
  const visibleManualSources = manualSources.filter((source) => selectedRole !== "Customer" || source.clientVisible);
  const visibleChatHistory = chatHistory.filter((chat) => selectedRole !== "Customer" || chat.clientName === routeContext.clientName);
  const activeChatTitle = activeChatId ? chatHistory.find((chat) => chat.id === activeChatId)?.title ?? "New chat" : "New chat";
  const allVisibleSources = [...visibleAutomaticSources, ...visibleManualSources];
  const selectedSources = allVisibleSources.filter((source) => source.selected && source.available);
  const visibleContextSources = selectedSources.filter((source) => !hiddenContextSourceIds.includes(source.id));
  const selectedApproach = getSelectedApproach(conversationModeId, playbook.customModeName, playbook.customModeBehaviour);
  const previewSource = previewSourceId ? allVisibleSources.find((source) => source.id === previewSourceId) ?? null : null;
  const helperCopy = getStageHelperCopy(conversationContext.stage);
  const shownContextSources = getCompactContextSources(visibleContextSources, promotedSourceId).slice(0, 3);
  const previewIsAnchoredToChip = previewSource ? shownContextSources.some((source) => source.id === previewSource.id) : false;
  const hasConversationContent = messages.length > 0 || isProcessing || conversationState !== "default";

  const submitPrompt = useCallback((requestedPrompt?: string) => {
    const prompt = (requestedPrompt ?? inputValue).trim();
    if (!prompt || isProcessing) return;

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

      const isRestrictedClientPrompt = selectedRole === "Customer" && (
        normalisedPrompt.includes("two weeks")
        || normalisedPrompt.includes("not moved")
        || normalisedPrompt.includes("internal comment")
        || normalisedPrompt.includes("other client")
      );
      const response = isRestrictedClientPrompt
        ? {
            title: "That information is not available here",
            body: `This Client portal can only use ${conversationContext.clientName ? `${conversationContext.clientName}'s` : "its own"} AI Brand Profile, assigned projects, released work and Client-visible comments. Ask Studio Staff if you need information from elsewhere.`,
            citations: [],
          }
        : limitResponseToSelectedSources(
            applyCreativeApproach(getMockBriskAiResponse(prompt, conversationContext.stage), selectedApproach),
            selectedSources,
          );
      const assistantMessage: AssistantMessage = {
        id: `brisk-ai-assistant-${Date.now()}`,
        role: "assistant",
        response,
        status: "ready",
        editableDraft: response.draft ?? "",
        committedDraft: response.draft ?? "",
      };

      setMessages((current) => {
        const completedMessages = [...current, assistantMessage];
        setChatHistory((history) => history.map((chat) => chat.id === chatId ? { ...chat, messages: cloneMessages(completedMessages) } : chat));
        return completedMessages;
      });
      setIsProcessing(false);
    }, 720);
  }, [activeChatId, conversationContext, inputValue, isProcessing, manualSources, messages, selectedApproach, selectedRole, selectedSources]);

  useEffect(() => {
    if (!openRequest || handledRequestIdRef.current === openRequest.id) return;
    handledRequestIdRef.current = openRequest.id;
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
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [isProcessing, messages]);

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
    if (!isHistoricalConversation && messages.length === 0) setConversationContext(routeContext);
  }, [pathname, selectedRole]);

  useEffect(() => {
    const handleGlobalKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLocaleLowerCase("en-AU") === "b") {
        event.preventDefault();
        openAssistant();
      }

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
  }, [closeAssistant, isHistoryOpen, openAssistant, previewSourceId, sourcePickerView, view]);

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
    if (!sourcePickerView) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || sourceAnchorRef.current?.contains(event.target)) return;
      setSourcePickerView(null);
      setSourceQuery("");
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [sourcePickerView]);

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

  const startNewChat = () => {
    if (inputValue.trim() && !window.confirm("Discard your unsent message and start a new chat?")) return;
    saveCurrentConversation();
    resetConversationToCurrentScreen();
  };

  const openHistoryChat = (chatId: string) => {
    if (chatId === activeChatId) {
      setIsHistoryOpen(false);
      setHistoryQuery("");
      window.requestAnimationFrame(() => promptRef.current?.focus());
      return;
    }
    if (inputValue.trim() && !window.confirm("Discard your unsent message and open this chat?")) return;

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

  const deleteHistoryChat = (chat: ChatHistoryItem) => {
    if (!window.confirm(`Delete “${chat.title}”? This only removes the mocked chat history.`)) return;
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

  const addMockedFile = () => {
    const nextSource = visibleManualSources.find((source) => source.available && !source.selected && isFileSource(source));
    if (!nextSource) {
      setToast("All available mocked files are already included.");
      return;
    }
    selectSource(nextSource.id);
  };

  const handlePromptChange = (value: string) => {
    setInputValue(value);
    const mentionMatch = value.match(/(?:^|\s)@([^@\s]*)$/u);
    if (!mentionMatch) return;
    setSourceQuery(mentionMatch[1] ?? "");
    setSourcePickerView("mentions");
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

  const composer = (
    <div className="brisk-ai-composer">
      <ContextChips
        sources={visibleContextSources}
        promotedSourceId={promotedSourceId}
        previewSource={previewIsAnchoredToChip ? previewSource : null}
        onClosePreview={() => setPreviewSourceId(null)}
        onOpenOverflow={() => setSourcePickerView("mentions")}
        onOpenSource={(sourceId) => setPreviewSourceId((current) => current === sourceId ? null : sourceId)}
        onRemoveSource={removeContextChip}
        onUpdateVideoRange={(sourceId, range) => updateVideoRange(sourceId, range)}
      />
      <label className="brisk-ai-prompt-field">
        <span className="sr-only">Ask Brisk AI</span>
        <textarea
          ref={promptRef}
          className="paragraph-s"
          disabled={isProcessing}
          placeholder={helperCopy.placeholder}
          rows={2}
          value={inputValue}
          onChange={(event) => handlePromptChange(event.target.value)}
          onKeyDown={(event) => handleComposerKeyDown(event, () => submitPrompt())}
        />
      </label>
      <div className="brisk-ai-composer-actions">
        <div className="brisk-ai-add-source-anchor" ref={sourceAnchorRef}>
          <button
            className="brisk-ai-add-source label-xs-semibold"
            type="button"
            aria-expanded={Boolean(sourcePickerView)}
            aria-haspopup="menu"
            onClick={() => {
              setSourceQuery("");
              setSourcePickerView((current) => current ? null : "menu");
            }}
          >
            <DsIcon name="plus" size={13} />
            Add source
          </button>
          {sourcePickerView === "menu" ? (
            <AddSourceMenu
              onChooseFiles={() => setSourcePickerView("files")}
              onChooseMentions={() => setSourcePickerView("mentions")}
            />
          ) : null}
          {sourcePickerView === "files" ? (
            <SourcePicker
              mode="files"
              sources={visibleManualSources.filter(isFileSource)}
              query={sourceQuery}
              onBack={() => {
                setSourceQuery("");
                setSourcePickerView("menu");
              }}
              onClose={closeSourcePicker}
              onQueryChange={setSourceQuery}
              onSelect={selectSource}
              onUpload={addMockedFile}
            />
          ) : null}
          {sourcePickerView === "mentions" ? (
            <SourcePicker
              mode="mentions"
              sources={[...visibleAutomaticSources.filter(isMentionSource), ...visibleManualSources.filter(isMentionSource)]}
              query={sourceQuery}
              onBack={() => {
                setSourceQuery("");
                setSourcePickerView("menu");
              }}
              onClose={closeSourcePicker}
              onQueryChange={setSourceQuery}
              onSelect={selectSource}
            />
          ) : null}
        </div>
        <button
          className="brisk-ai-send-button label-xs-semibold"
          type="button"
          disabled={!inputValue.trim() || isProcessing}
          onClick={() => submitPrompt()}
        >
          {isProcessing ? <span className="brisk-ai-spinner" aria-hidden="true" /> : <DsIcon name="paper-plane-tilt" size={14} />}
          {isProcessing ? "Working" : "Send"}
        </button>
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
      {view === "closed" || view === "minimised" ? (
        <button
          ref={launcherRef}
          className={`brisk-ai-launcher ${isLauncherDragging ? "is-dragging" : ""}`}
          type="button"
          aria-label="Ask Brisk AI"
          data-tooltip="Ask Brisk AI"
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
        </button>
      ) : null}

      {view === "compact" || view === "panel" ? (
        <aside className={`brisk-ai-floating ${hasConversationContent ? "has-conversation" : "is-empty"}`} aria-label="Brisk AI conversation">
          <AssistantHeader
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
          <div className="brisk-ai-thread" ref={threadRef} aria-live="polite">
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
                onAction={() => setSourcePickerView("menu")}
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
                  onDraftChange={(draft) => updateMessage(message.id, (current) => ({ ...current, editableDraft: draft }))}
                  onAction={(action) => runResponseAction(message.id, action)}
                />
              ))
            )}
            {isProcessing ? <ProcessingState /> : null}
          </div>
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
  onNewChat,
  onOpenChat,
  onRenameValueChange,
  onToggleHistory,
}: {
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
  onNewChat: () => void;
  onOpenChat: (chatId: string) => void;
  onRenameValueChange: (value: string) => void;
  onToggleHistory: () => void;
}) {
  return (
    <header className="brisk-ai-header">
      <div className="brisk-ai-heading">
        <span className="brisk-ai-heading-icon"><DsIcon name="sparkle" size={17} /></span>
        <div className="brisk-ai-history-anchor" ref={historyAnchorRef}>
          <button
            className="brisk-ai-history-trigger"
            type="button"
            aria-expanded={isHistoryOpen}
            aria-haspopup="dialog"
            onClick={onToggleHistory}
          >
            <strong className="label-s-semibold">{chatTitle}</strong>
            <DsIcon name="caret-down" size={13} />
          </button>
          {isHistoryOpen ? (
            <ChatHistoryPopover
              activeChatId={activeChatId}
              chats={chatHistory}
              editingChatId={editingChatId}
              query={historyQuery}
              renameValue={renameValue}
              onBeginRename={onBeginRename}
              onDeleteChat={onDeleteChat}
              onFinishRename={onFinishRename}
              onNewChat={onNewChat}
              onOpenChat={onOpenChat}
              onQueryChange={onHistoryQueryChange}
              onRenameValueChange={onRenameValueChange}
            />
          ) : null}
        </div>
      </div>
      <div className="brisk-ai-header-actions">
        <button type="button" aria-label="Start new chat" data-tooltip="Start new chat" onClick={onNewChat}>
          <DsIcon name="pencil-simple-ds" size={16} />
        </button>
        <button type="button" aria-label="Close Brisk AI" data-tooltip="Close" onClick={onClose}>
          <DsIcon name="x-close-cross" size={16} />
        </button>
      </div>
    </header>
  );
}

function ChatHistoryPopover({
  activeChatId,
  chats,
  editingChatId,
  query,
  renameValue,
  onBeginRename,
  onDeleteChat,
  onFinishRename,
  onNewChat,
  onOpenChat,
  onQueryChange,
  onRenameValueChange,
}: {
  activeChatId: string | null;
  chats: ChatHistoryItem[];
  editingChatId: string | null;
  query: string;
  renameValue: string;
  onBeginRename: (chat: ChatHistoryItem) => void;
  onDeleteChat: (chat: ChatHistoryItem) => void;
  onFinishRename: (chatId: string) => void;
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
      <button className="brisk-ai-history-new label-s-semibold" type="button" onClick={onNewChat}>
        <DsIcon name="pencil-simple-ds" size={16} />
        Start new chat
      </button>
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
  message,
  onAction,
  onDraftChange,
  stage,
}: {
  message: Extract<AssistantMessage, { role: "assistant" }>;
  onAction: (action: ResponseAction) => void;
  onDraftChange: (draft: string) => void;
  stage: BriskAiStage;
}) {
  const primaryActionLabel = getPrimaryResponseAction(stage);
  const hasReviewableOutput = Boolean(message.response.draft);

  return (
    <article className={`brisk-ai-message is-assistant is-${message.status}`}>
      <header><span><DsIcon name="sparkle" size={14} /></span><strong className="label-s-semibold">Brisk AI</strong></header>
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
              <button className="brisk-ai-try-again-button label-xs-semibold" type="button" onClick={() => onAction("retry")}>{message.status === "retrying" ? "Trying again..." : "Try again"}</button>
            </>
          )}
        </div>
      ) : null}
    </article>
  );
}

function ProcessingState() {
  return (
    <div className="brisk-ai-processing" role="status">
      <span className="brisk-ai-spinner" aria-hidden="true" />
      <span className="label-s">Brisk AI is reviewing the request…</span>
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

function AddSourceMenu({
  onChooseFiles,
  onChooseMentions,
}: {
  onChooseFiles: () => void;
  onChooseMentions: () => void;
}) {
  return (
    <div className="brisk-ai-add-source-menu" role="menu" aria-label="Add a source">
      <button className="label-s-semibold" type="button" role="menuitem" onClick={onChooseFiles}>
        <span><DsIcon name="paperclip" size={18} /></span>
        <span>Add photos, video or files</span>
      </button>
      <button className="label-s-semibold" type="button" role="menuitem" onClick={onChooseMentions}>
        <span><DsIcon name="at-mail" size={18} /></span>
        <span>Mention pages, projects or people</span>
      </button>
    </div>
  );
}

function SourcePicker({
  mode,
  sources,
  query,
  onBack,
  onClose,
  onQueryChange,
  onSelect,
  onUpload,
}: {
  mode: "files" | "mentions";
  sources: BriskAiSource[];
  query: string;
  onBack: () => void;
  onClose: () => void;
  onQueryChange: (query: string) => void;
  onSelect: (sourceId: string) => void;
  onUpload?: () => void;
}) {
  const normalisedQuery = query.trim().toLocaleLowerCase("en-AU");
  const suggested = getSuggestedSources(mode, sources);
  const matches = sources.filter((source) => {
    const searchText = `${source.label} ${source.preview} ${source.detail ?? ""} ${getSourceSearchTerms(source.kind)}`.toLocaleLowerCase("en-AU");
    return searchText.includes(normalisedQuery);
  });
  const visibleSources = normalisedQuery ? matches : suggested;
  const hasResults = visibleSources.length > 0;

  return (
    <section className="brisk-ai-source-picker" role="dialog" aria-modal="false" aria-labelledby="brisk-ai-source-picker-title">
      <header>
        <div className="brisk-ai-source-picker-heading">
          <button type="button" aria-label="Back to source options" onClick={onBack}><DsIcon name="arrow-left" size={16} /></button>
          <h2 className="headings-2xs-bold" id="brisk-ai-source-picker-title">{mode === "files" ? "Add photos, video or files" : "Mention a source"}</h2>
        </div>
        <button type="button" aria-label="Close source picker" onClick={onClose}><DsIcon name="x-close-cross" size={17} /></button>
      </header>
      <div className="brisk-ai-source-picker-toolbar">
        <label>
          <span className="sr-only">{mode === "files" ? "Search photos, video or files" : "Search pages, projects or people"}</span>
          <DsIcon name="search" size={16} />
          <input
            autoFocus
            className="label-s"
            type="search"
            placeholder={mode === "files" ? "Search photos, video or files" : "Search pages, projects or people"}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </label>
        {mode === "files" && onUpload ? <Button size="S" variant="ghost" onClick={onUpload}><DsIcon name="plus" size={14} />Upload file</Button> : null}
      </div>
      <div className="brisk-ai-source-picker-list">
        {!hasResults ? (
          <div className="brisk-ai-source-empty"><DsIcon name="search" size={20} /><strong className="label-s-semibold">No sources found</strong><button className="brisk-ai-text-action label-xs-semibold" type="button" onClick={() => onQueryChange("")}>Clear search</button></div>
        ) : (
          <SourcePickerSection title={normalisedQuery ? "Search results" : "Suggested"} sources={visibleSources} onSelect={onSelect} />
        )}
      </div>
    </section>
  );
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

function isFileSource(source: BriskAiSource) {
  return source.kind === "document" || source.kind === "image" || source.kind === "video";
}

function isMentionSource(source: BriskAiSource) {
  return source.kind === "brief"
    || source.kind === "script"
    || source.kind === "edit"
    || source.kind === "project"
    || source.kind === "client"
    || source.kind === "page"
    || source.kind === "record"
    || source.kind === "person";
}

function getSuggestedSources(mode: "files" | "mentions", sources: BriskAiSource[]) {
  const priorityIds = mode === "files"
    ? ["brand-guidelines-pdf", "reference-image", "edit-v3", "product-dashboard-screenshot"]
    : ["current-script", "current-brief", "current-edit", "current-project", "current-client", "maddie-lee"];
  const availableSources = sources.filter((source) => source.available);
  const prioritised = priorityIds
    .map((id) => availableSources.find((source) => source.id === id))
    .filter((source): source is BriskAiSource => Boolean(source));
  return deduplicateSources([...prioritised, ...availableSources]).slice(0, 5);
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
