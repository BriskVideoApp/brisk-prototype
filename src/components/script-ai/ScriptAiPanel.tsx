"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent as ReactMouseEvent } from "react";
import { DsIcon } from "@/components/video-review/DsIcon";
import type { ScriptGenre } from "@/data/script";

export type ScriptAiSource = {
  id: string;
  label: string;
  kind: "brief" | "transcript" | "past_scripts" | "brand_brain" | "script" | "comments" | "upload";
  attached: boolean;
};

export type ScriptAiMessage = {
  id: string;
  role: "user" | "assistant";
  body: string;
  createdAt: string;
  insertRequest?: ScriptAiInsertRequest;
};

type ScriptAiIntent =
  | "generate"
  | "rewrite"
  | "feedback"
  | "paperedit"
  | "visuals";

export type ScriptAiInsertRequest =
  | {
      mode: "replace_selection";
      text: string;
    }
  | {
      mode: "insert_after_active";
      rows: ScriptAiRowDraft[];
    }
  | {
      mode: "replace_script_new_version";
      rows: ScriptAiRowDraft[];
    }
  | {
      mode: "replace_row_visuals";
      visuals: string;
    };

export type ScriptAiRowDraft = {
  words: string;
  visuals: string;
};

type ScriptAiSelectionContext = {
  activeRowLabel: string | null;
  hasScriptContent: boolean;
  selectedText: string | null;
};

type PanelPosition = {
  x: number;
  y: number;
};

type ScriptAiPanelProps = {
  genre: ScriptGenre;
  isMinimised: boolean;
  isOpen: boolean;
  selectionContext: ScriptAiSelectionContext;
  onClose: () => void;
  onInsert: (request: ScriptAiInsertRequest) => void;
  onMinimise: (isMinimised: boolean) => void;
};

const sessionPositionKey = "brisk-script-ai-position";

const initialSources: ScriptAiSource[] = [
  { id: "brief", label: "Brief", kind: "brief", attached: true },
  { id: "transcript-v2", label: "Transcript v2", kind: "transcript", attached: true },
  { id: "past-scripts", label: "Past scripts", kind: "past_scripts", attached: true },
  { id: "brand-brain", label: "Brand Brain", kind: "brand_brain", attached: true },
  { id: "current-script", label: "Current script", kind: "script", attached: true },
  { id: "client-comments", label: "Client comments", kind: "comments", attached: true },
];

const generatedRows: ScriptAiRowDraft[] = [
  {
    words: "Meet Maya at the moment care decisions start to feel bigger than one family can hold alone.",
    visuals: "Morning light in a family kitchen, with Maya arriving calmly at the door.",
  },
  {
    words: "Harbour Health turns the plan, the people and the paperwork into one guided path.",
    visuals: "A simple care map forms from calendar cards, notes and provider names.",
  },
  {
    words: "So families can see what is happening now, what happens next and who is responsible.",
    visuals: "Over-the-shoulder shot of a clear shared dashboard on a tablet.",
  },
];

const paperEditRows: ScriptAiRowDraft[] = [
  {
    words: "Start with Avery naming the handover moment as the point where trust is either built or lost.",
    visuals: "Interview close-up, then cut to a quiet corridor outside a consultation room.",
  },
  {
    words: "Use Maya's line about calm, clear and human support as the emotional centre.",
    visuals: "Maya sits beside a family member, listening before pointing to the next step.",
  },
];

export function ScriptAiPanel({
  genre,
  isMinimised,
  isOpen,
  selectionContext,
  onClose,
  onInsert,
  onMinimise,
}: ScriptAiPanelProps) {
  const [sources, setSources] = useState<ScriptAiSource[]>(initialSources);
  const [messages, setMessages] = useState<ScriptAiMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSourcesPopoverOpen, setIsSourcesPopoverOpen] = useState(false);
  const [position, setPosition] = useState<PanelPosition>(() => getInitialPanelPosition());
  const [dragOffset, setDragOffset] = useState<PanelPosition | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [messages, isTyping]);

  useEffect(() => {
    sessionStorage.setItem(sessionPositionKey, JSON.stringify(position));
  }, [position]);

  useEffect(() => {
    if (!dragOffset) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      setPosition({
        x: Math.max(12, Math.min(window.innerWidth - 404, event.clientX - dragOffset.x)),
        y: Math.max(12, Math.min(window.innerHeight - 160, event.clientY - dragOffset.y)),
      });
    };

    const handlePointerUp = () => setDragOffset(null);

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragOffset]);

  if (!isOpen) {
    return null;
  }

  const submitPrompt = (prompt: string) => {
    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt) {
      return;
    }

    const userMessage: ScriptAiMessage = {
      id: `ai-user-${Date.now()}`,
      role: "user",
      body: trimmedPrompt,
      createdAt: "Just now",
    };

    setMessages((current) => [...current, userMessage]);
    setInputValue("");
    setIsTyping(true);

    window.setTimeout(() => {
      setMessages((current) => [
        ...current,
        createAssistantReply(inferIntent(trimmedPrompt, selectionContext), selectionContext, genre),
      ]);
      setIsTyping(false);
    }, 450);
  };

  const addSource = () => {
    const sourceNumber = sources.filter((source) => source.kind === "upload").length + 1;
    setSources((current) => [
      ...current,
      {
        id: `upload-${Date.now()}`,
        label: `Uploaded source ${sourceNumber}`,
        kind: "upload",
        attached: true,
      },
    ]);
  };

  const toggleSource = (sourceId: string) => {
    setSources((current) =>
      current.map((source) =>
        source.id === sourceId
          ? {
              ...source,
              attached: !source.attached,
            }
          : source,
      ),
    );
  };

  const startDrag = (event: ReactMouseEvent<HTMLElement>) => {
    const panelRect = panelRef.current?.getBoundingClientRect();

    if (!panelRect || event.target instanceof HTMLButtonElement) {
      return;
    }

    setDragOffset({
      x: event.clientX - panelRect.left,
      y: event.clientY - panelRect.top,
    });
  };

  if (isMinimised) {
    return (
      <aside
        className="script-ai-panel minimised"
        ref={panelRef}
        style={{ left: position.x, top: position.y }}
        aria-label="ChopChop AI minimised"
      >
        <button className="script-ai-minimised-main label-xs-semibold" type="button" onClick={() => onMinimise(false)}>
          ChopChop AI
        </button>
        <SourcesControl
          isOpen={isSourcesPopoverOpen}
          sources={sources}
          onAddSource={addSource}
          onToggleSource={toggleSource}
          onToggle={() => setIsSourcesPopoverOpen((isOpen) => !isOpen)}
          onClose={() => setIsSourcesPopoverOpen(false)}
        />
      </aside>
    );
  }

  return (
    <aside
      className="script-ai-panel chat-first"
      ref={panelRef}
      style={{ left: position.x, top: position.y }}
      aria-label="ChopChop AI panel"
    >
      <header className="script-ai-header" onMouseDown={startDrag}>
        <h2 className="heading-3xs">ChopChop AI</h2>
        <div className="script-ai-actions">
          <button className="script-quiet-icon" type="button" aria-label="Minimise AI" onClick={() => onMinimise(true)}>
            -
          </button>
          <button className="script-quiet-icon" type="button" aria-label="Close AI" onClick={onClose}>
            <DsIcon name="x-close-cross" size={14} />
          </button>
        </div>
      </header>

      {messages.length > 0 || isTyping ? (
        <div className="script-ai-thread" ref={threadRef} aria-label="ChopChop AI chat thread">
          {messages.map((message) => (
            <article className={`script-ai-message ${message.role}`} key={message.id}>
              <p className="paragraph-s">{message.body}</p>
              {message.role === "assistant" ? (
                <div className="script-ai-message-actions">
                  {message.insertRequest ? (
                    <button className="label-xs-semibold" type="button" onClick={() => onInsert(message.insertRequest!)}>
                      Insert
                    </button>
                  ) : null}
                  <button className="label-xs-semibold" type="button" onClick={() => copyMessage(message.body)}>
                    Copy
                  </button>
                </div>
              ) : null}
            </article>
          ))}
          {isTyping ? <p className="script-ai-typing label-xs">ChopChop AI is thinking…</p> : null}
        </div>
      ) : null}

      <div className="script-ai-input-wrap">
        <textarea
          className="script-ai-input label-s"
          placeholder="Ask ChopChop AI…"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={(event) => handleInputKeyDown(event, submitPrompt, inputValue)}
          onPaste={() => {
            if (!sources.some((source) => source.id === "pasted-image")) {
              setSources((current) => [
                ...current,
                { id: "pasted-image", label: "Pasted image", kind: "upload", attached: true },
              ]);
            }
          }}
        />
        <div className="script-ai-input-actions">
          <SourcesControl
            isOpen={isSourcesPopoverOpen}
            sources={sources}
            onAddSource={addSource}
            onToggleSource={toggleSource}
            onToggle={() => setIsSourcesPopoverOpen((isOpen) => !isOpen)}
            onClose={() => setIsSourcesPopoverOpen(false)}
          />
          <button
            className="script-ai-send-button label-xs-semibold"
            type="button"
            disabled={!inputValue.trim()}
            onClick={() => submitPrompt(inputValue)}
          >
            <DsIcon name="paper-plane-tilt" size={14} />
            Send
          </button>
        </div>
      </div>
    </aside>
  );
}

function SourcesControl({
  isOpen,
  sources,
  onAddSource,
  onToggleSource,
  onToggle,
  onClose,
}: {
  isOpen: boolean;
  sources: ScriptAiSource[];
  onAddSource: () => void;
  onToggleSource: (sourceId: string) => void;
  onToggle: () => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const controlRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const attachedCount = sources.filter((source) => source.attached).length;
  const filteredSources = useMemo(() => {
    const normalisedQuery = query.trim().toLowerCase();

    if (!normalisedQuery) {
      return sources;
    }

    return sources.filter((source) => source.label.toLowerCase().includes(normalisedQuery));
  }, [query, sources]);
  const chipLabel = attachedCount > 0 ? `Sources (${attachedCount})` : "Sources";
  const chipAriaLabel = attachedCount > 0 ? `+ Sources (${attachedCount})` : "+ Sources";

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setActiveIndex(0);
      return;
    }

    searchInputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (target instanceof Node && controlRef.current?.contains(target)) {
        return;
      }

      onClose();
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    setActiveIndex((currentIndex) => Math.min(currentIndex, Math.max(filteredSources.length - 1, 0)));
  }, [filteredSources.length]);

  const handlePickerKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((currentIndex) => (filteredSources.length === 0 ? 0 : (currentIndex + 1) % filteredSources.length));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((currentIndex) =>
        filteredSources.length === 0 ? 0 : (currentIndex - 1 + filteredSources.length) % filteredSources.length,
      );
      return;
    }

    if (event.key === "Enter" && filteredSources[activeIndex]) {
      event.preventDefault();
      onToggleSource(filteredSources[activeIndex].id);
    }
  };

  return (
    <div className="script-ai-sources-control" ref={controlRef}>
      <button
        className="script-source-chip add label-xs-semibold"
        type="button"
        aria-label={chipAriaLabel}
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        <DsIcon name="plus" size={12} />
        {chipLabel}
      </button>
      {isOpen ? (
        <div className="script-ai-sources-popover" role="listbox" aria-label="AI sources" onKeyDown={handlePickerKeyDown}>
          <input
            className="script-ai-source-search label-s"
            ref={searchInputRef}
            placeholder="Search sources…"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="script-ai-source-options">
            {filteredSources.length > 0 ? (
              filteredSources.map((source, index) => (
                <button
                  className={`script-ai-source-row label-s ${index === activeIndex ? "active" : ""}`}
                  type="button"
                  key={source.id}
                  role="option"
                  aria-selected={source.attached}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => onToggleSource(source.id)}
                >
                  <span className="script-ai-source-label">
                    <span className="script-ai-source-token" aria-hidden="true">
                      @
                    </span>
                    {source.label}
                  </span>
                  {source.attached ? <DsIcon name="check" size={14} /> : null}
                </button>
              ))
            ) : (
              <p className="script-ai-source-empty label-s">No sources found.</p>
            )}
          </div>
          <button
            className="script-ai-add-source label-s"
            type="button"
            onClick={() => {
              onAddSource();
              setQuery("");
            }}
          >
            <span className="script-ai-source-label">
              <span className="script-ai-source-token" aria-hidden="true">
                +
              </span>
              Add source
            </span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

function getInitialPanelPosition(): PanelPosition {
  if (typeof window === "undefined") {
    return { x: 824, y: 104 };
  }

  const storedPosition = sessionStorage.getItem(sessionPositionKey);

  if (storedPosition) {
    try {
      const parsedPosition = JSON.parse(storedPosition) as Partial<PanelPosition>;

      if (typeof parsedPosition.x === "number" && typeof parsedPosition.y === "number") {
        return parsedPosition as PanelPosition;
      }
    } catch {
      // Prototype-only: ignore malformed session storage.
    }
  }

  return {
    x: Math.max(12, window.innerWidth - 436),
    y: 104,
  };
}

function inferIntent(prompt: string, selectionContext: ScriptAiSelectionContext): ScriptAiIntent {
  const normalisedPrompt = prompt.toLowerCase();

  if (normalisedPrompt.includes("visual")) {
    return "visuals";
  }

  if (normalisedPrompt.includes("paper edit") || normalisedPrompt.includes("transcript")) {
    return "paperedit";
  }

  if (normalisedPrompt.includes("rewrite") || normalisedPrompt.includes("tone") || normalisedPrompt.includes("punch")) {
    return "rewrite";
  }

  if (selectionContext.selectedText) {
    return "rewrite";
  }

  if (normalisedPrompt.includes("generate") || normalisedPrompt.includes("draft")) {
    return "generate";
  }

  return "feedback";
}

function createAssistantReply(command: ScriptAiIntent, selectionContext: ScriptAiSelectionContext, genre: string): ScriptAiMessage {
  const timestamp = Date.now();
  const selectedText = selectionContext.selectedText ?? "this line";

  if (command === "generate") {
    return {
      id: `ai-assistant-${timestamp}`,
      role: "assistant",
      body: `Here is a ${genre.toLowerCase()} draft shaped from the brief. It opens on a family moment, then moves into the guided path.`,
      createdAt: "Just now",
      insertRequest: { mode: "replace_script_new_version", rows: generatedRows },
    };
  }

  if (command === "rewrite") {
    return {
      id: `ai-assistant-${timestamp}`,
      role: "assistant",
      body: `Rewrite suggestion: "${makePunchier(selectedText)}"`,
      createdAt: "Just now",
      insertRequest: { mode: "replace_selection", text: makePunchier(selectedText) },
    };
  }

  if (command === "visuals") {
    return {
      id: `ai-assistant-${timestamp}`,
      role: "assistant",
      body: "Visual idea: hold on a calm human detail first, then reveal the shared care plan on a tablet so the responsibility shift is visible.",
      createdAt: "Just now",
      insertRequest: {
        mode: "replace_row_visuals",
        visuals: "Hold on a calm human detail, then reveal the shared care plan on a tablet.",
      },
    };
  }

  if (command === "paperedit") {
    return {
      id: `ai-assistant-${timestamp}`,
      role: "assistant",
      body: "Paper edit from Transcript v2: lead with Avery's handover quote, then use Maya's calm, clear and human line as the emotional pivot.",
      createdAt: "Just now",
      insertRequest: { mode: "insert_after_active", rows: paperEditRows },
    };
  }

  return {
    id: `ai-assistant-${timestamp}`,
    role: "assistant",
    body: "Feedback: the strongest line is the shared view of care. The opening could start closer to the family uncertainty before naming the platform.",
    createdAt: "Just now",
  };
}

function makePunchier(text: string) {
  const trimmedText = text.replace(/^"|"$/g, "").trim();

  if (!trimmedText || trimmedText === "this line") {
    return "Families get one clear view of what happens next.";
  }

  return trimmedText.length > 58 ? `${trimmedText.slice(0, 55).trim()}...` : `${trimmedText} - made clearer.`;
}

function handleInputKeyDown(
  event: KeyboardEvent<HTMLTextAreaElement>,
  submitPrompt: (prompt: string) => void,
  inputValue: string,
) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    submitPrompt(inputValue);
  }

  if (event.key === "Escape") {
    event.currentTarget.blur();
  }
}

async function copyMessage(body: string) {
  try {
    await navigator.clipboard?.writeText(body);
  } catch {
    // Prototype-only: clipboard may be unavailable in local browser contexts.
  }
}
