"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent as ReactMouseEvent } from "react";
import { DsIcon } from "@/components/video-review/DsIcon";
import type { ScriptGenre } from "@/data/script";

export type ScriptAiSource = {
  id: string;
  label: string;
  kind: "brief" | "transcript" | "past_scripts" | "brand_brain" | "upload";
  attached: boolean;
};

export type ScriptAiMessage = {
  id: string;
  role: "user" | "assistant";
  body: string;
  createdAt: string;
  insertRequest?: ScriptAiInsertRequest;
};

export type ScriptAiSuggestionChip = {
  id: string;
  label: string;
  context: "empty_script" | "script_content" | "text_selected" | "transcript_attached";
  command: SlashCommandId;
};

export type SlashCommandId =
  | "generate"
  | "rewrite"
  | "feedback"
  | "paperedit"
  | "visuals"
  | "genre"
  | "insert";

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
];

const slashCommands: Array<{ id: SlashCommandId; label: string; hint: string }> = [
  { id: "generate", label: "/generate", hint: "Draft a full script" },
  { id: "rewrite", label: "/rewrite", hint: "Rewrite the selected text" },
  { id: "feedback", label: "/feedback", hint: "Review the script" },
  { id: "paperedit", label: "/paperedit", hint: "Build from transcript" },
  { id: "visuals", label: "/visuals", hint: "Suggest visual direction" },
  { id: "genre", label: "/genre [name]", hint: "Override the inferred genre" },
  { id: "insert", label: "/insert", hint: "Insert the latest suggestion" },
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
  const [messages, setMessages] = useState<ScriptAiMessage[]>([
    {
      id: "ai-welcome",
      role: "assistant",
      body: "I can help draft, rewrite, tighten or suggest visuals for this script. I am using the brief, transcript and past scripts as context.",
      createdAt: "Just now",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isSlashMenuOpen, setIsSlashMenuOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [position, setPosition] = useState<PanelPosition>(() => getInitialPanelPosition());
  const [dragOffset, setDragOffset] = useState<PanelPosition | null>(null);
  const [genreOverride, setGenreOverride] = useState<string | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const hasTranscript = sources.some((source) => source.kind === "transcript" && source.attached);
  const activeGenre = genreOverride ?? genre;
  const suggestionChips = useMemo(
    () => getSuggestionChips(selectionContext, hasTranscript),
    [hasTranscript, selectionContext],
  );

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

  const submitPrompt = (prompt: string, command?: SlashCommandId) => {
    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt) {
      return;
    }

    const resolvedCommand = command ?? inferCommand(trimmedPrompt);
    const genreCommandValue = resolvedCommand === "genre" ? trimmedPrompt.replace(/^\/genre\s*/i, "").trim() : "";

    if (genreCommandValue) {
      setGenreOverride(genreCommandValue);
    }

    const userMessage: ScriptAiMessage = {
      id: `ai-user-${Date.now()}`,
      role: "user",
      body: trimmedPrompt,
      createdAt: "Just now",
    };

    setMessages((current) => [...current, userMessage]);
    setInputValue("");
    setIsSlashMenuOpen(false);
    setIsTyping(true);

    window.setTimeout(() => {
      setMessages((current) => [
        ...current,
        createAssistantReply(resolvedCommand, selectionContext, genreCommandValue || activeGenre),
      ]);
      setIsTyping(false);
    }, 450);
  };

  const runSuggestion = (chip: ScriptAiSuggestionChip) => {
    submitPrompt(chip.label, chip.command);
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
        <SourceChips sources={sources} onAddSource={addSource} onRemoveSource={removeSource} />
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

      <SourceChips sources={sources} onAddSource={addSource} onRemoveSource={removeSource} />

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
        {isTyping ? <p className="script-ai-typing label-xs">ChopChop AI is thinking...</p> : null}
      </div>

      <div className="script-ai-suggestion-chips" aria-label="Suggested prompts">
        {suggestionChips.map((chip) => (
          <button className="script-ai-suggestion-chip label-xs-semibold" type="button" key={chip.id} onClick={() => runSuggestion(chip)}>
            {chip.label}
          </button>
        ))}
      </div>

      <div className="script-ai-input-wrap">
        {isSlashMenuOpen ? (
          <div className="script-ai-slash-menu" role="menu" aria-label="AI slash commands">
            {slashCommands.map((command) => (
              <button
                className="label-xs-semibold"
                type="button"
                key={command.id}
                onClick={() => submitPrompt(command.label, command.id)}
              >
                <span>{command.label}</span>
                <span>{command.hint}</span>
              </button>
            ))}
          </div>
        ) : null}
        <textarea
          className="script-ai-input label-s"
          placeholder="Ask for a rewrite, a script, or a visual idea..."
          value={inputValue}
          onChange={(event) => {
            setInputValue(event.target.value);
            setIsSlashMenuOpen(event.target.value.trim() === "/");
          }}
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
          <button className="script-quiet-icon" type="button" data-tooltip="Attach file" aria-label="Attach file" onClick={addSource}>
            <DsIcon name="paperclip" size={14} />
          </button>
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
      <p className="script-ai-genre label-xs">Genre inferred from brief: {activeGenre}</p>
    </aside>
  );

  function removeSource(sourceId: string) {
    setSources((current) => current.filter((source) => source.id !== sourceId));
  }
}

function SourceChips({
  sources,
  onAddSource,
  onRemoveSource,
}: {
  sources: ScriptAiSource[];
  onAddSource: () => void;
  onRemoveSource: (sourceId: string) => void;
}) {
  return (
    <div className="script-ai-sources" aria-label="AI input sources">
      {sources.map((source) => (
        <button
          className="script-source-chip label-xs-semibold"
          type="button"
          key={source.id}
          onClick={() => onRemoveSource(source.id)}
        >
          {source.label}
          <DsIcon name="x-close-cross" size={10} />
        </button>
      ))}
      <button className="script-source-chip add label-xs-semibold" type="button" onClick={onAddSource}>
        <DsIcon name="plus" size={12} />
        Add source
      </button>
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

function getSuggestionChips(selectionContext: ScriptAiSelectionContext, hasTranscript: boolean): ScriptAiSuggestionChip[] {
  const chips: ScriptAiSuggestionChip[] = selectionContext.hasScriptContent
    ? [
        { id: "feedback", label: "Give feedback", context: "script_content", command: "feedback" },
        { id: "visuals", label: "Suggest visuals", context: "script_content", command: "visuals" },
        { id: "tighten", label: "Tighten to target duration", context: "script_content", command: "rewrite" },
      ]
    : [
        { id: "generate", label: "Generate script", context: "empty_script", command: "generate" },
        { id: "draft", label: "Draft from brief", context: "empty_script", command: "generate" },
        { id: "concepts", label: "Suggest concepts", context: "empty_script", command: "feedback" },
      ];

  if (selectionContext.selectedText) {
    chips.unshift(
      { id: "rewrite-selection", label: "Rewrite selection", context: "text_selected", command: "rewrite" },
      { id: "punchier", label: "Make punchier", context: "text_selected", command: "rewrite" },
      { id: "tone", label: "Fix tone", context: "text_selected", command: "rewrite" },
      { id: "selection-visual", label: "Suggest visual for this line", context: "text_selected", command: "visuals" },
    );
  }

  if (hasTranscript) {
    chips.push({ id: "paperedit", label: "Paper edit from transcript", context: "transcript_attached", command: "paperedit" });
  }

  return chips.slice(0, 5);
}

function inferCommand(prompt: string): SlashCommandId {
  const normalisedPrompt = prompt.toLowerCase();

  if (normalisedPrompt.startsWith("/")) {
    const command = normalisedPrompt.slice(1).split(" ")[0];
    return slashCommands.some((item) => item.id === command) ? (command as SlashCommandId) : "feedback";
  }

  if (normalisedPrompt.includes("visual")) {
    return "visuals";
  }

  if (normalisedPrompt.includes("rewrite") || normalisedPrompt.includes("tone") || normalisedPrompt.includes("punch")) {
    return "rewrite";
  }

  if (normalisedPrompt.includes("generate") || normalisedPrompt.includes("draft")) {
    return "generate";
  }

  return "feedback";
}

function createAssistantReply(command: SlashCommandId, selectionContext: ScriptAiSelectionContext, genre: string): ScriptAiMessage {
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

  if (command === "genre") {
    return {
      id: `ai-assistant-${timestamp}`,
      role: "assistant",
      body: `Genre noted. I will treat the next response as ${genre}.`,
      createdAt: "Just now",
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
  submitPrompt: (prompt: string, command?: SlashCommandId) => void,
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
