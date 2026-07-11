"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { DsIcon, type DsIconName } from "@/components/video-review/DsIcon";
import type { Project } from "@/components/active-videos/types";
import {
  briefClarifyingQuestions,
  briefDraftOptions,
  briefSteps,
  briefVideoTypeDetails,
  confidenceChipLabels,
  fallbackBriefDraft,
  fieldRegenerationValues,
  initialBriefFields,
  initialChatMessages,
  type BriefDraft,
  type BriefField,
  type BriefFieldId,
  type BriefFields,
  type BriefStepId,
  type ChatMessage,
  type InputAttachment,
  type Logline,
} from "@/data/brief";

type BriefPageProps = {
  project: Project;
};

type BriefMode = "landing" | "steps";

type BriefAiSubmit = {
  prompt: string;
  attachments: InputAttachment[];
};

const maxBriefWords = 1000;
const landingIntroPlaceholder = "__landing_intro_placeholder__";

const placeholderStepCopy: Record<Exclude<BriefStepId, "basics" | "summary">, string> = {
  purposeAudience: "Audience, purpose and viewer action will be shaped here.",
  lookFeel: "Tone, references, brand direction and visual feel will be shaped here.",
  contentProduction: "Talent, locations, assets and production notes will be shaped here.",
  deliverablesTiming: "Outputs, formats, timings and approval dates will be shaped here.",
};

const briefToneOptions = [
  "Cinematic / Epic",
  "Corporate / Professional",
  "Emotional / Moving",
  "Energetic",
  "Funny",
  "Informative",
  "Inspirational",
  "Playful",
  "Powerful",
  "Urgent",
] as const;

type ReferenceVideoCard = {
  id: string;
  title: string;
  source: string;
  duration: string;
  tags: string[];
};

type BrandKitOption = {
  name: string;
  description: string;
  thumbnailLabel: string;
};

type VoiceArtist = {
  name: string;
  group: "AI voices" | "Human artists";
  duration: string;
};

type DeliverableRow = {
  id: string;
  name: string;
  subtitle: string;
  notes: string;
  platform: string;
  format: string;
  customFormat: string;
  duration: string;
  customMinutes: string;
  customSeconds: string;
  captions: boolean;
  captionOptions?: DeliverableCaptionOption[];
  deadline: string;
  isMain: boolean;
};

type DeliverableCaptionOption = "SRT file" | "Baked in captions" | "None";

const referenceVideoTagSets = [
  ["Energetic", "Product-led", "Clean edit", "Bold titles"],
  ["Warm", "Interview-led", "Natural light", "Human"],
  ["Cinematic", "Premium", "Slow reveal", "Brand-led"],
  ["Fast-paced", "Social-first", "Punchy", "Graphic"],
  ["Clear", "Explainer", "Simple", "Useful"],
] as const;

const brandKitOptions: BrandKitOption[] = [
  {
    name: "House kit",
    description: "Default Brisk production styling with clean typography, confident purple accents and flexible motion rules.",
    thumbnailLabel: "House",
  },
  {
    name: "Client kit - Nike",
    description: "A bold client kit with high-contrast marks, athletic pacing and sharp graphic treatments.",
    thumbnailLabel: "Nike",
  },
  {
    name: "Minimal kit",
    description: "A stripped-back visual system for quiet launches, elegant edits and restrained brand presence.",
    thumbnailLabel: "Min",
  },
];

const voiceArtists: VoiceArtist[] = [
  { name: "Alex", group: "AI voices", duration: "0:12" },
  { name: "Kai", group: "AI voices", duration: "0:10" },
  { name: "Mick", group: "AI voices", duration: "0:11" },
  { name: "Patrick", group: "Human artists", duration: "0:14" },
  { name: "Steve", group: "Human artists", duration: "0:13" },
  { name: "Will", group: "Human artists", duration: "0:15" },
];

const briefPurposeOptions = [
  "Advocacy - Mobilise people to act",
  "Awareness - Make more people know about your topic",
  "Education - Explain clearly",
  "Engagement - Build and energise community",
  "Fundraising - Inspire giving",
  "Internal Communication - Align and strengthen teams",
  "Policy Influence - Persuade decision makers",
  "Recruitment - Attract volunteers or staff",
  "Something else",
] as const;

const briefCallToActionOptions = [
  "Book a session",
  "Contact us",
  "Create account",
  "Discover",
  "Donate today",
  "Fill out a short form",
  "Get started",
  "Join the conversation",
  "Join us",
  "Learn more",
  "Save my spot",
  "Share now",
  "Sign up",
  "Subscribe",
  "Something else",
] as const;

const deliverablePlatformGroups = [
  {
    label: "Professional & internal",
    options: ["Your website", "Training/Internal", "Event"],
  },
  {
    label: "Social video",
    options: [
      "Facebook",
      "YouTube (Main)",
      "Instagram (Reels)",
      "LinkedIn",
      "X (Twitter)",
      "TikTok",
    ],
  },
  {
    label: "Broadcasting & custom",
    options: ["TV Commercials", "Custom/Other"],
  },
] as const;

const deliverablePlatformIconMap: Record<string, DsIconName> = {
  "Your website": "link",
  "Training/Internal": "clipboard-text",
  Event: "film-slate",
  Facebook: "image-square",
  "YouTube (Main)": "play",
  "Instagram (Reels)": "film-strip",
  LinkedIn: "columns",
  "X (Twitter)": "x-close-cross",
  TikTok: "speaker-high",
  "TV Commercials": "video-camera",
  "Custom/Other": "grid-four",
};

const deliverableFormatOptions = [
  { label: "Landscape", helper: "16:9", iconClass: "landscape" },
  { label: "Vertical", helper: "9:16", iconClass: "vertical" },
  { label: "Square", helper: "1:1", iconClass: "square" },
  { label: "Custom", helper: "Custom ratio", iconClass: "custom" },
] as const;

const deliverableDurationOptions = [
  { label: "15s", helper: "Reels length" },
  { label: "30s", helper: "Short social" },
  { label: "45s", helper: "Extended social" },
  { label: "60s", helper: "Standard format" },
  { label: "1m 30s", helper: "Mid-length" },
  { label: "2m", helper: "Long-form" },
  { label: "3m", helper: "YouTube content" },
  { label: "4m", helper: "Deep dive" },
  { label: "5m", helper: "Tutorial length" },
  { label: "10m", helper: "Full presentation" },
  { label: "15m", helper: "Webinar/Course" },
  { label: "Custom", helper: "Set minutes and seconds" },
] as const;

const deliverableCaptionOptions: Array<{ label: DeliverableCaptionOption; tooltip: string }> = [
  {
    label: "SRT file",
    tooltip: "A separate subtitle file you can upload with the video.",
  },
  {
    label: "Baked in captions",
    tooltip: "Captions burned into the video file so they always appear.",
  },
  {
    label: "None",
    tooltip: "No captions or subtitle file included.",
  },
];

export function BriefPage({ project }: BriefPageProps) {
  const [briefMode, setBriefMode] = useState<BriefMode>("landing");
  const [activeStepId, setActiveStepId] = useState<BriefStepId>("basics");
  const [briefFields, setBriefFields] = useState<BriefFields>(() => cloneBriefFields(initialBriefFields));
  const [logline, setLogline] = useState<Logline>({ text: "", status: "not_generated" });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatCollapsed, setIsChatCollapsed] = useState(true);
  const [hasStartedClarifying, setHasStartedClarifying] = useState(false);
  const [clarifyingAnswerCount, setClarifyingAnswerCount] = useState(0);
  const [hasDraftedBrief, setHasDraftedBrief] = useState(false);
  const [sourcePrompt, setSourcePrompt] = useState("");
  const activeStepIndex = briefSteps.findIndex((step) => step.id === activeStepId);
  const activeStep = briefSteps[activeStepIndex] ?? briefSteps[0];
  const isSummaryStep = activeStepId === "summary";
  const isApproveDisabled = Object.values(briefFields).some(
    (field) => field.id !== "deadline" && field.required && field.confidence === "missing",
  );
  const missingRequiredFields = Object.values(briefFields).filter(
    (field) => field.id !== "deadline" && field.required && field.confidence === "missing",
  );

  function appendChatMessages(nextMessages: ChatMessage[]) {
    setChatMessages((currentMessages) => [...currentMessages, ...nextMessages]);
  }

  function appendAiMessage(
    body: string,
    meta: Partial<ChatMessage> = {},
  ) {
    appendChatMessages([createChatMessage("ai", body, meta)]);
  }

  function submitBriefPrompt({ attachments, prompt }: BriefAiSubmit, source: BriefMode) {
    const trimmedPrompt = prompt.trim();
    const promptContext = `${trimmedPrompt} ${describeAttachmentsForPrompt(attachments)}`.trim();

    if (!promptContext) {
      return;
    }

    const clientMessage = createChatMessage("client", trimmedPrompt || "Attached sources for the brief.", {
      attachments: [...attachments],
    });

    if (!hasStartedClarifying) {
      setHasStartedClarifying(true);
      setSourcePrompt(promptContext);
      setClarifyingAnswerCount(0);
      appendChatMessages([
        clientMessage,
        createChatMessage("ai", `Nice - a few quick questions before I draft this.\n\n${briefClarifyingQuestions[0]}`, {
          questionIndex: 1,
          questionTotal: briefClarifyingQuestions.length,
          tone: "question",
        }),
      ]);
      return;
    }

    const nextSourcePrompt = `${sourcePrompt} ${promptContext}`.trim();
    const answeredQuestionCount = clarifyingAnswerCount + 1;

    setSourcePrompt(nextSourcePrompt);
    setClarifyingAnswerCount(answeredQuestionCount);

    const nextQuestionIndex = answeredQuestionCount;

    if (nextQuestionIndex < briefClarifyingQuestions.length) {
      appendChatMessages([
        clientMessage,
        createChatMessage("ai", briefClarifyingQuestions[nextQuestionIndex], {
          questionIndex: nextQuestionIndex + 1,
          questionTotal: briefClarifyingQuestions.length,
          tone: "question",
        }),
      ]);
      return;
    }

    if (!hasDraftedBrief && source === "landing") {
      draftBriefFromPrompt(nextSourcePrompt || promptContext, "landing", clientMessage);
      return;
    }

    appendChatMessages([clientMessage]);
    appendAiMessage("Noted. I have added that context to the working brief.");
  }

  function submitChat(submission: BriefAiSubmit) {
    submitBriefPrompt(submission, "steps");
  }

  function submitLandingPrompt(submission: BriefAiSubmit) {
    submitBriefPrompt(submission, "landing");
  }

  function draftLandingBrief() {
    if (clarifyingAnswerCount < briefClarifyingQuestions.length || hasDraftedBrief) {
      return;
    }

    draftBriefFromPrompt(sourcePrompt || "Client supplied brief details.", "landing");
  }

  function rewindLandingConversation(messageId: string) {
    setChatMessages((currentMessages) => {
      const rewindIndex = currentMessages.findIndex((message) => message.id === messageId);

      if (rewindIndex < 0) {
        return currentMessages;
      }

      const remainingMessages = currentMessages.slice(0, rewindIndex);
      const remainingClientMessages = remainingMessages.filter((message) => message.role === "client");

      setHasStartedClarifying(remainingClientMessages.length > 0);
      setClarifyingAnswerCount(Math.max(0, remainingClientMessages.length - 1));
      setHasDraftedBrief(false);
      setSourcePrompt(
        remainingClientMessages
          .map((message) => `${message.body} ${describeAttachmentsForPrompt(message.attachments ?? [])}`.trim())
          .join(" "),
      );

      return remainingMessages;
    });
  }

  function applyBriefDraft(draft: BriefDraft) {
    setBriefFields(cloneBriefFields(draft.fields));
    setLogline({
      text: draft.logline,
      status: "synced",
      lastRegeneratedAt: "Just now",
    });
  }

  function draftBriefFromPrompt(prompt: string, source: BriefMode, clientMessage?: ChatMessage) {
    setHasDraftedBrief(true);
    const draftMessages = [...chatMessages, ...(clientMessage ? [clientMessage] : [])];
    const draftAudience = getClarifyingAudienceAnswer(draftMessages);
    const draftDescriptionNotes = getClarifyingDescriptionNotes(draftMessages);
    const draftReferenceVideos = getReferenceVideoAttachments(draftMessages);
    appendChatMessages([
      ...(clientMessage ? [clientMessage] : []),
      createChatMessage("ai", "Great, drafting your brief now...", { tone: "drafting" }),
    ]);

    window.setTimeout(() => {
      applyBriefDraft(getDraftForPrompt(prompt, draftAudience, draftDescriptionNotes, draftReferenceVideos));
      enterStepFlow();
    }, 1200);
  }

  function updateBriefField(fieldId: BriefFieldId, nextValue: string) {
    const value = fieldId === "description" ? limitWords(nextValue, maxBriefWords) : nextValue;

    setBriefFields((currentFields) => ({
      ...currentFields,
      [fieldId]: {
        ...currentFields[fieldId],
        value,
        confidence: value.trim() ? "confident" : "missing",
        source: value.trim() ? "manual_edit" : "missing",
      },
    }));
    markLoglineOutOfSync();
  }

  function confirmBriefField(fieldId: BriefFieldId) {
    setBriefFields((currentFields) => ({
      ...currentFields,
      [fieldId]: {
        ...currentFields[fieldId],
        confidence: currentFields[fieldId].value.trim() ? "confident" : "missing",
        source: currentFields[fieldId].value.trim() ? "manual_edit" : "missing",
      },
    }));
  }

  function regenerateBriefField(fieldId: BriefFieldId) {
    const draft = getDraftForPrompt(
      sourcePrompt || "Client supplied brief details.",
      getClarifyingAudienceAnswer(chatMessages),
      getClarifyingDescriptionNotes(chatMessages),
      getReferenceVideoAttachments(chatMessages),
    );
    const regeneratedField = createRegeneratedField(fieldId, briefFields[fieldId], draft.fields[fieldId] ?? fallbackBriefDraft.fields[fieldId]);

    setBriefFields((currentFields) => ({
      ...currentFields,
      [fieldId]: {
        ...currentFields[fieldId],
        value: regeneratedField.value,
        confidence: regeneratedField.confidence,
        source: regeneratedField.source,
      },
    }));
    markLoglineOutOfSync();
  }

  function regenerateLogline() {
    setLogline({
      text: createLoglineFromFields(briefFields),
      status: "synced",
      lastRegeneratedAt: "Just now",
    });
  }

  function updateLogline(nextText: string) {
    setLogline((currentLogline) => ({
      ...currentLogline,
      text: nextText,
      status: nextText.trim() ? "synced" : "not_generated",
    }));
  }

  function markLoglineOutOfSync() {
    setLogline((currentLogline) =>
      currentLogline.status === "synced"
        ? {
            ...currentLogline,
            status: "out_of_sync",
          }
        : currentLogline,
    );
  }

  function approveBrief() {
    if (isApproveDisabled) {
      return;
    }

    console.log("Brief approved", {
      projectId: project.id,
      fields: briefFields,
      logline,
    });
  }

  function goToRelativeStep(direction: -1 | 1) {
    const nextStep = briefSteps[activeStepIndex + direction];

    if (nextStep) {
      setActiveStepId(nextStep.id);
    }
  }

  function toggleChat(isCollapsed: boolean) {
    setIsChatCollapsed(isCollapsed);

    if (!isCollapsed) {
    }
  }

  function enterStepFlow() {
    setBriefMode("steps");
    setActiveStepId("basics");
    setIsChatCollapsed(true);
  }

  function skipAiAndFillManually() {
    if (chatMessages.length === 0) {
      setChatMessages([...initialChatMessages]);
    }

    enterStepFlow();
  }

  function resetToLanding() {
    setBriefMode("landing");
    setActiveStepId("basics");
    setBriefFields(cloneBriefFields(initialBriefFields));
    setLogline({ text: "", status: "not_generated" });
    setChatMessages([]);
    setIsChatCollapsed(true);
    setHasStartedClarifying(false);
    setClarifyingAnswerCount(0);
    setHasDraftedBrief(false);
    setSourcePrompt("");
  }

  const chatPanel = (
    <BriefAiChatPanel
      isCollapsed={isChatCollapsed}
      messages={chatMessages}
      onSubmit={submitChat}
      onToggleCollapsed={toggleChat}
    />
  );

  return (
    <main className="brief-shell">
      <BriefSidebar projectId={project.id} />
      <div className="brief-main">
        {briefMode === "landing" ? (
          <BriefLandingScreen
            canDraft={clarifyingAnswerCount >= briefClarifyingQuestions.length && hasStartedClarifying && !hasDraftedBrief}
            messages={chatMessages}
            onDraft={draftLandingBrief}
            onRewind={rewindLandingConversation}
            onSkip={skipAiAndFillManually}
            onSubmit={submitLandingPrompt}
          />
        ) : (
          <>
            <BriefHeader
              onTitleChange={updateBriefField}
              titleField={briefFields.workingTitle}
            />
            <BriefStepShell
              activeStepId={activeStepId}
              activeStepIndex={activeStepIndex}
              chatPanel={chatPanel}
              footerAction={
                isSummaryStep ? (
                  <BriefApproveButton disabled={isApproveDisabled} onApprove={approveBrief} />
                ) : (
                  <Button size="S" type="button" variant="primary" onClick={() => goToRelativeStep(1)}>
                    Next
                  </Button>
                )
              }
              onChatWithAi={resetToLanding}
              onBack={activeStepIndex > 0 ? () => goToRelativeStep(-1) : undefined}
              onSelectStep={setActiveStepId}
            >
              {activeStepId === "basics" ? (
                <BriefBasicsSection
                  fields={briefFields}
                  onConfirmField={confirmBriefField}
                  onFieldChange={updateBriefField}
                  onRegenerateField={regenerateBriefField}
                />
              ) : null}
              {activeStepId === "purposeAudience" ? (
                <BriefPurposeAudienceSection
                  fields={briefFields}
                  onConfirmField={confirmBriefField}
                  onFieldChange={updateBriefField}
                  onRegenerateField={regenerateBriefField}
                />
              ) : null}
              {activeStepId === "lookFeel" ? (
                <BriefLookAndFeelSection
                  fields={briefFields}
                  onConfirmField={confirmBriefField}
                  onFieldChange={updateBriefField}
                  onRegenerateField={regenerateBriefField}
                />
              ) : null}
              {activeStepId === "contentProduction" ? (
                <BriefContentProductionSection
                  fields={briefFields}
                  onConfirmField={confirmBriefField}
                  onFieldChange={updateBriefField}
                  onRegenerateField={regenerateBriefField}
                />
              ) : null}
              {activeStepId === "deliverablesTiming" ? (
                <BriefDeliverablesSection
                  fields={briefFields}
                  onConfirmField={confirmBriefField}
                  onFieldChange={updateBriefField}
                  onRegenerateField={regenerateBriefField}
                />
              ) : null}
              {activeStepId !== "basics" &&
              activeStepId !== "purposeAudience" &&
              activeStepId !== "lookFeel" &&
              activeStepId !== "contentProduction" &&
              activeStepId !== "deliverablesTiming" &&
              activeStepId !== "summary" ? (
                <BriefPlaceholderSection stepLabel={activeStep.label} copy={placeholderStepCopy[activeStepId]} />
              ) : null}
              {activeStepId === "summary" ? (
                <BriefSummaryPage
                  fields={briefFields}
                  logline={logline}
                  missingFields={missingRequiredFields}
                  onConfirmField={confirmBriefField}
                  onFieldChange={updateBriefField}
                  onGoToStep={setActiveStepId}
                  onLoglineChange={updateLogline}
                  onRegenerateField={regenerateBriefField}
                  onRegenerateLogline={regenerateLogline}
                />
              ) : null}
            </BriefStepShell>
          </>
        )}
      </div>
    </main>
  );
}

function BriefSidebar({ projectId }: { projectId: string }) {
  return (
    <aside className="today-sidebar brief-sidebar" aria-label="Primary navigation">
      <nav className="today-sidebar-nav" aria-label="Workspace">
        <Link className="today-sidebar-link label-s-semibold" href="/active-videos">
          <DsIcon name="queue" size={16} />
          Active Videos
        </Link>
        <Link className="today-sidebar-link label-s-semibold" href="/today">
          <DsIcon name="check-circle" size={16} />
          Today
        </Link>
        <Link className="today-sidebar-link active label-s-semibold" href={`/projects/${projectId}/stages/brief`}>
          <DsIcon name="clipboard-text" size={16} />
          Brief
        </Link>
        <Link className="today-sidebar-link label-s-semibold" href="/projects/mock-project/script?role=studio">
          <DsIcon name="film-script" size={16} />
          Script
        </Link>
        <Link className="today-sidebar-link label-s-semibold" href="/review">
          <DsIcon name="play" size={16} />
          Video Review
        </Link>
      </nav>
    </aside>
  );
}

function BriefHeader({
  onTitleChange,
  titleField,
}: {
  onTitleChange: (fieldId: BriefFieldId, value: string) => void;
  titleField: BriefField;
}) {
  const titleValue = titleField.value || "Untitled brief";

  return (
    <header className="brief-header">
      <div className="brief-title-stack">
        <h1 className="brief-editable-title">
          <span className="brief-title-prefix" data-tooltip="System-generated job number">
            Loom003
          </span>
          <span className="brief-title-separator"> - </span>
          <input
            className="brief-title-input"
            aria-label="Working title"
            value={titleValue}
            onChange={(event) => onTitleChange("workingTitle", event.target.value)}
          />
        </h1>
      </div>
    </header>
  );
}

function BriefStepShell({
  activeStepId,
  activeStepIndex,
  chatPanel,
  children,
  footerAction,
  onChatWithAi,
  onBack,
  onSelectStep,
}: {
  activeStepId: BriefStepId;
  activeStepIndex: number;
  chatPanel: ReactNode;
  children: ReactNode;
  footerAction: ReactNode;
  onChatWithAi: () => void;
  onBack?: () => void;
  onSelectStep: (stepId: BriefStepId) => void;
}) {
  return (
    <>
      <section className={`brief-stage-area brief-step-${activeStepId}`} aria-label="Brief step">
        <div className="brief-workspace">
          {chatPanel}
          {children}
        </div>
      </section>
      <footer className="brief-step-footer">
        <div className="brief-step-footer-inner">
          <span className="brief-footer-side">
            <button className="brief-reset-intake label-s-semibold" type="button" onClick={onChatWithAi}>
              Chat with Brisk AI
            </button>
            {onBack ? (
              <Button size="S" type="button" variant="secondary" onClick={onBack}>
                Back
              </Button>
            ) : null}
          </span>
          <BriefStepDots activeStepIndex={activeStepIndex} onSelectStep={onSelectStep} />
          <span className="brief-footer-side right">{footerAction}</span>
        </div>
      </footer>
    </>
  );
}

function BriefStepDots({
  activeStepIndex,
  onSelectStep,
}: {
  activeStepIndex: number;
  onSelectStep: (stepId: BriefStepId) => void;
}) {
  return (
    <nav className="brief-step-dots" aria-label="Brief steps">
      {briefSteps.map((step, index) => (
        <button
          className={`brief-step-dot label-xs-semibold ${index === activeStepIndex ? "active" : ""} ${
            index < activeStepIndex ? "complete" : ""
          } ${step.id === "summary" ? "summary" : ""}`}
          key={step.id}
          type="button"
          aria-current={index === activeStepIndex ? "step" : undefined}
          data-tooltip={`${step.index}. ${step.label}`}
          onClick={() => onSelectStep(step.id)}
        >
          {step.id === "summary" ? step.shortLabel : step.index}
        </button>
      ))}
    </nav>
  );
}

function BriefLandingScreen({
  canDraft,
  messages,
  onDraft,
  onRewind,
  onSkip,
  onSubmit,
}: {
  canDraft: boolean;
  messages: ChatMessage[];
  onDraft: () => void;
  onRewind: (messageId: string) => void;
  onSkip: () => void;
  onSubmit: (submission: BriefAiSubmit) => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const [attachments, setAttachments] = useState<InputAttachment[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const canSendMessage = inputValue.trim().length > 0 || attachments.length > 0;
  const isClarifying = messages.length > 0;
  const canUseFooterContinue = isClarifying ? canSendMessage || canDraft : canSendMessage;
  const inputPlaceholder = isClarifying
    ? "Type your answer here..."
    : landingIntroPlaceholder;

  function submitLandingPrompt(): boolean {
    if (!canSendMessage) {
      return false;
    }

    onSubmit({
      prompt: inputValue || "Attached sources for the brief.",
      attachments,
    });
    setInputValue("");
    setAttachments([]);
    return true;
  }

  function handleFooterContinue() {
    if (isClarifying) {
      if (canSendMessage) {
        submitLandingPrompt();
        return;
      }

      if (canDraft) {
        onDraft();
      }
      return;
    }

    submitLandingPrompt();
  }

  function editMessage(message: ChatMessage) {
    if (message.role !== "client") {
      return;
    }

    setInputValue(message.body);
    setAttachments(message.attachments ?? []);
    onRewind(message.id);
    window.setTimeout(() => {
      document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Describe the video brief"]')?.focus();
    }, 0);
  }

  function deleteMessage(message: ChatMessage) {
    if (message.role !== "client") {
      return;
    }

    setInputValue("");
    setAttachments([]);
    onRewind(message.id);
  }

  function handleBack() {
    if (!isClarifying) {
      window.location.href = "/active-videos";
      return;
    }

    const latestClientMessage = [...messages].reverse().find((message) => message.role === "client");

    if (latestClientMessage) {
      editMessage(latestClientMessage);
    }
  }

  function addAttachment(attachment: InputAttachment) {
    setAttachments((currentAttachments) => {
      if (currentAttachments.some((currentAttachment) => getAttachmentKey(currentAttachment) === getAttachmentKey(attachment))) {
        return currentAttachments;
      }

      return [...currentAttachments, attachment];
    });
  }

  function addAttachments(nextAttachments: InputAttachment[]) {
    nextAttachments.forEach(addAttachment);
  }

  function addFiles(files: FileList | File[]) {
    const nextAttachments = Array.from(files)
      .filter(isAcceptedLandingFile)
      .map(createAttachmentFromFile);

    addAttachments(nextAttachments);
  }

  function handleDragOver(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDraggingOver(true);
  }

  function handleDragLeave(event: DragEvent<HTMLElement>) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }

    setIsDraggingOver(false);
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDraggingOver(false);

    if (event.dataTransfer.files.length > 0) {
      addFiles(event.dataTransfer.files);
    }
  }

  return (
    <section
      className={`brief-landing-screen ${isDraggingOver ? "dragging" : ""}`}
      aria-label="Brief intake"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={`brief-landing-centre ${isClarifying ? "is-clarifying" : ""}`}>
        <h1 className={isClarifying ? "is-hidden" : ""} id="brief-landing-title">
          What video are we making?
        </h1>
        {isClarifying ? (
          <BriefClarifyingThread messages={messages} onDeleteMessage={deleteMessage} onEditMessage={editMessage} />
        ) : null}
        <BriefRichInput
          attachments={attachments}
          placeholder={inputPlaceholder}
          value={inputValue}
          variant="landing"
          onAddAttachment={addAttachment}
          onRemoveAttachment={(attachmentId) =>
            setAttachments((currentAttachments) =>
              currentAttachments.filter((currentAttachment) => currentAttachment.id !== attachmentId),
            )
          }
          onAddAttachments={addAttachments}
          onFilesAdded={addFiles}
          onSubmit={submitLandingPrompt}
          onValueChange={setInputValue}
          showInlineSend
        />
      </div>
      <footer className="brief-landing-footer">
        <button className="brief-landing-back label-s-semibold" type="button" onClick={handleBack}>
          Back
        </button>
        <button className="brief-landing-skip label-s-semibold" type="button" onClick={onSkip}>
          Skip AI, fill in manually
        </button>
        <button
          className="brief-landing-next label-s-semibold"
          type="button"
          disabled={!canUseFooterContinue}
          onClick={handleFooterContinue}
        >
          {isClarifying ? "OK, draft my brief" : "Continue"}
        </button>
      </footer>
    </section>
  );
}

function BriefClarifyingThread({
  messages,
  onDeleteMessage,
  onEditMessage,
}: {
  messages: ChatMessage[];
  onDeleteMessage: (message: ChatMessage) => void;
  onEditMessage: (message: ChatMessage) => void;
}) {
  const [openMenuMessageId, setOpenMenuMessageId] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const thread = threadRef.current;

    if (!thread || messages.length <= 2 || thread.scrollHeight <= thread.clientHeight) {
      return;
    }

    thread.scrollTo({
      top: thread.scrollHeight - thread.clientHeight,
      behavior: "smooth",
    });
  }, [messages]);

  if (messages.length === 0) {
    return null;
  }

  return (
    <div ref={threadRef} className="brief-clarifying-thread" aria-label="Brief chat thread">
      {messages.map((message, index) => {
        const isFirstAiInGroup = message.role === "ai" && messages[index - 1]?.role !== "ai";
        const shouldShowRole = message.role === "client" || isFirstAiInGroup;
        const bodyBlocks = message.body.split("\n\n").filter(Boolean);

        return (
          <article className={`brief-clarifying-message ${message.role}`} key={message.id}>
            <div className="brief-clarifying-message-header">
              {shouldShowRole ? (
                <span className="brief-landing-message-role label-xs-semibold">
                  {message.role === "ai" ? "Brisk AI" : "You"}
                </span>
              ) : (
                <span aria-hidden="true" />
              )}
              {message.role === "client" ? (
                <div className="brief-message-menu-wrap">
                  <button
                    className="brief-message-menu-trigger"
                    type="button"
                    aria-label="Message options"
                    aria-expanded={openMenuMessageId === message.id}
                    onClick={() => setOpenMenuMessageId((currentId) => (currentId === message.id ? null : message.id))}
                  >
                    <DsIcon name="pencil-simple" size={16} />
                  </button>
                  {openMenuMessageId === message.id ? (
                    <div className="brief-message-menu" role="menu">
                      <button
                        className="label-s"
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setOpenMenuMessageId(null);
                          onEditMessage(message);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="label-s"
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setOpenMenuMessageId(null);
                          onDeleteMessage(message);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="brief-message-body">
              {bodyBlocks.map((bodyBlock, bodyBlockIndex) => (
                <p className="paragraph-s" key={`${message.id}-${bodyBlockIndex}`}>
                  {bodyBlock}
                </p>
              ))}
            </div>
            {message.attachments && message.attachments.length > 0 ? (
              <div className="brief-message-attachments" aria-label="Attached sources">
                {message.attachments.map((attachment) => (
                  <MessageAttachmentChip attachment={attachment} key={attachment.id} />
                ))}
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function BriefAiChatPanel({
  isCollapsed,
  messages,
  onSubmit,
  onToggleCollapsed,
}: {
  isCollapsed: boolean;
  messages: ChatMessage[];
  onSubmit: (submission: BriefAiSubmit) => void;
  onToggleCollapsed: (isCollapsed: boolean) => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const [attachments, setAttachments] = useState<InputAttachment[]>([]);
  const canSubmit = inputValue.trim().length > 0 || attachments.length > 0;

  function submitPrompt() {
    if (!canSubmit) {
      return;
    }

    onSubmit({
      prompt: inputValue || "Attached sources for the brief.",
      attachments,
    });
    setInputValue("");
    setAttachments([]);
  }

  function addAttachment(attachment: InputAttachment) {
    setAttachments((currentAttachments) => {
      if (currentAttachments.some((currentAttachment) => getAttachmentKey(currentAttachment) === getAttachmentKey(attachment))) {
        return currentAttachments;
      }

      return [...currentAttachments, attachment];
    });
  }

  if (isCollapsed) {
    return null;
  }

  return (
    <aside className="brief-ai-panel chat-first" aria-label="Brisk AI panel">
      <header className="brief-ai-header">
        <div className="brief-ai-title-row">
          <DsIcon name="chopchop-ai" size={18} />
          <h2 className="heading-3xs">Brisk AI</h2>
        </div>
        <button
          className="brief-quiet-icon"
          type="button"
          aria-label="Collapse Brisk AI"
          onClick={() => onToggleCollapsed(true)}
        >
          -
        </button>
      </header>

      <div className="brief-ai-thread" aria-label="Brisk AI chat thread">
        {messages.map((message) => (
          <article className={`brief-ai-message ${message.role}`} key={message.id}>
            <p className="paragraph-s">{message.body}</p>
            <span className="brief-ai-message-time label-xs">{message.createdAt}</span>
          </article>
        ))}
      </div>

      <BriefRichInput
        attachments={attachments}
        placeholder="Paste your notes, links or reference videos..."
        value={inputValue}
        variant="panel"
        onAddAttachment={addAttachment}
        onRemoveAttachment={(attachmentId) =>
          setAttachments((currentAttachments) =>
            currentAttachments.filter((currentAttachment) => currentAttachment.id !== attachmentId),
          )
        }
        onSubmit={submitPrompt}
        onValueChange={setInputValue}
      />
    </aside>
  );
}

function BriefRichInput({
  attachments,
  placeholder,
  showInlineSend = false,
  value,
  variant,
  onAddAttachment,
  onAddAttachments,
  onFilesAdded,
  onRemoveAttachment,
  onSubmit,
  onValueChange,
}: {
  attachments: InputAttachment[];
  placeholder: string;
  showInlineSend?: boolean;
  value: string;
  variant: "landing" | "panel";
  onAddAttachment: (attachment: InputAttachment) => void;
  onAddAttachments?: (attachments: InputAttachment[]) => void;
  onFilesAdded?: (files: FileList | File[]) => void;
  onRemoveAttachment: (attachmentId: string) => void;
  onSubmit?: () => void;
  onValueChange: (value: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isLinkInputOpen, setIsLinkInputOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [isTextareaFocused, setIsTextareaFocused] = useState(false);
  const wordCount = countWords(value);
  const canSubmit = value.trim().length > 0 || attachments.length > 0;
  const usesLandingIntroPlaceholder = variant === "landing" && placeholder === landingIntroPlaceholder;
  const shouldShowLandingPlaceholder =
    usesLandingIntroPlaceholder && value.length === 0 && !isTextareaFocused;

  useEffect(() => {
    if (!showInlineSend || !textareaRef.current) {
      return;
    }

    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
  }, [showInlineSend, value]);

  function addMockDocument(label: string) {
    onAddAttachment(createMockAttachment("document", label));
  }

  function handleTextareaPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const pastedText = event.clipboardData.getData("text");
    const textAttachments = createAttachmentsFromText(pastedText);
    const imageAttachments = createAttachmentsFromClipboard(event.clipboardData);
    const nextAttachments = [...textAttachments, ...imageAttachments];

    if (nextAttachments.length === 0) {
      return;
    }

    event.preventDefault();
    addAttachmentBatch(nextAttachments);

    const remainingText = removeUrlsFromText(pastedText);

    if (remainingText) {
      onValueChange(limitWords(`${value} ${remainingText}`.trim(), maxBriefWords));
    }
  }

  function addAttachmentBatch(nextAttachments: InputAttachment[]) {
    if (onAddAttachments) {
      onAddAttachments(nextAttachments);
      return;
    }

    nextAttachments.forEach(onAddAttachment);
  }

  function submitLink() {
    const attachmentsFromText = createAttachmentsFromText(linkValue);

    if (attachmentsFromText.length === 0) {
      return;
    }

    addAttachmentBatch(attachmentsFromText);
    setLinkValue("");
    setIsLinkInputOpen(false);
  }

  function handleLinkKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    submitLink();
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files && onFilesAdded) {
      onFilesAdded(event.target.files);
    }

    event.target.value = "";
  }

  function handleTextareaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!onSubmit || event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();

    if (canSubmit) {
      onSubmit();
    }
  }

  return (
    <div className={`brief-rich-input ${variant}`}>
      <div className={`brief-rich-textarea-shell ${variant} ${showInlineSend ? "with-inline-send" : ""}`}>
        <textarea
          ref={textareaRef}
          className={`brief-rich-textarea ${variant} label-s`}
          aria-label={variant === "landing" ? "Describe the video brief" : "Message Brisk AI"}
          placeholder={usesLandingIntroPlaceholder ? "" : placeholder}
          value={value}
          onChange={(event) => onValueChange(limitWords(event.target.value, maxBriefWords))}
          onBlur={() => setIsTextareaFocused(false)}
          onFocus={() => setIsTextareaFocused(true)}
          onKeyDown={handleTextareaKeyDown}
          onPaste={handleTextareaPaste}
        />
        {shouldShowLandingPlaceholder ? (
          <div className="brief-rich-placeholder label-s" aria-hidden="true">
            <span className="brief-rich-placeholder-example">
              E.g. "We're making a 2-minute launch film for our new investor product, shot in our office next
              Thursday..."
            </span>
          </div>
        ) : null}
        {variant === "landing" && attachments.length > 0 ? (
          <div className="brief-attachment-row in-composer" aria-label="Attached sources">
            {attachments.map((attachment) => (
              <AttachmentChip
                attachment={attachment}
                key={attachment.id}
                onRemove={() => onRemoveAttachment(attachment.id)}
              />
            ))}
          </div>
        ) : null}
        {variant === "panel" ? (
          <span className="brief-ai-word-count label-xs">
            {wordCount}/{maxBriefWords} words
          </span>
        ) : null}
        {variant === "landing" ? (
          <div className="brief-composer-status">
            {showInlineSend ? (
            <button
              className="brief-inline-send-button"
              type="button"
              aria-label="Send message"
              disabled={!canSubmit}
              onClick={onSubmit}
            >
              <DsIcon name="paper-plane-tilt" size={16} />
            </button>
            ) : null}
          </div>
        ) : null}
      </div>
      {variant === "landing" ? (
        <div className="brief-composer-underbar">
          <div className="brief-composer-tools" aria-label="Attachment tools">
            <button
              className="brief-composer-tool"
              type="button"
              aria-label="Record a brief"
              data-tooltip="Record a brief"
              onClick={() => console.log("Record a brief coming soon")}
            >
              <DsIcon name="video-camera" size={16} />
            </button>
            <button
              className="brief-composer-tool"
              type="button"
              aria-label="Paste a link"
              data-tooltip="Paste a link"
              onClick={() => setIsLinkInputOpen((isOpen) => !isOpen)}
            >
              <DsIcon name="link-simple-horizontal" size={16} />
            </button>
            <button
              className="brief-composer-tool"
              type="button"
              aria-label="Upload a doc"
              data-tooltip="Upload a doc"
              onClick={() => fileInputRef.current?.click()}
            >
              <DsIcon name="upload-simple" size={16} />
            </button>
            <input
              ref={fileInputRef}
              className="brief-hidden-file-input"
              type="file"
              accept=".pdf,.doc,.docx,.txt,.md,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
              multiple
              onChange={handleFileChange}
            />
          </div>
        </div>
      ) : null}
      {variant === "panel" && attachments.length > 0 ? (
        <div className="brief-attachment-row" aria-label="Attached sources">
          {attachments.map((attachment) => (
            <AttachmentChip
              attachment={attachment}
              key={attachment.id}
              onRemove={() => onRemoveAttachment(attachment.id)}
            />
          ))}
        </div>
      ) : null}
      {variant === "panel" ? (
        <div className="brief-rich-actions panel">
          <>
            <button
              className="brief-toolbar-button label-xs-semibold"
              type="button"
              onClick={() => addMockDocument("Uploaded brief notes")}
            >
              <DsIcon name="upload-simple" size={14} />
              Upload
            </button>
            <label className="brief-panel-link-entry label-xs" aria-label="Paste a link">
              <DsIcon name="link" size={14} />
              <input
                value={linkValue}
                placeholder="Paste link"
                onChange={(event) => setLinkValue(event.target.value)}
                onKeyDown={handleLinkKeyDown}
                onPaste={(event) => {
                  const attachment = createAttachmentFromPastedText(event.clipboardData.getData("text"));

                  if (attachment) {
                    onAddAttachment(attachment);
                  }
                }}
              />
            </label>
            <button
              className="brief-ai-send-button label-xs-semibold"
              type="button"
              disabled={!canSubmit}
              onClick={onSubmit}
            >
              <DsIcon name="paper-plane-tilt" size={14} />
              Send
            </button>
          </>
        </div>
      ) : null}
      {variant === "landing" && isLinkInputOpen ? (
        <label className="brief-inline-link-entry label-s" aria-label="Paste a link">
          <DsIcon name="link-simple-horizontal" size={16} />
          <input
            value={linkValue}
            placeholder="Paste a URL and hit Enter"
            autoFocus
            onChange={(event) => setLinkValue(event.target.value)}
            onKeyDown={handleLinkKeyDown}
            onPaste={(event) => {
              const attachmentsFromText = createAttachmentsFromText(event.clipboardData.getData("text"));

              if (attachmentsFromText.length > 0) {
                event.preventDefault();
                addAttachmentBatch(attachmentsFromText);
                setLinkValue("");
                setIsLinkInputOpen(false);
              }
            }}
          />
        </label>
      ) : null}
    </div>
  );
}

function AttachmentChip({
  attachment,
  onRemove,
}: {
  attachment: InputAttachment;
  onRemove: () => void;
}) {
  const iconByKind: Record<InputAttachment["kind"], DsIconName> = {
    document: "clipboard-text",
    link: "link",
    reference_video: "film-strip",
  };

  return (
    <span className={`brief-attachment-chip ${attachment.kind} label-xs-semibold`} title={attachment.source}>
      <DsIcon name={iconByKind[attachment.kind]} size={13} />
      <span>{attachment.label}</span>
      <button type="button" aria-label={`Remove ${attachment.label}`} onClick={onRemove}>
        <DsIcon name="x-close-cross" size={10} />
      </button>
    </span>
  );
}

function MessageAttachmentChip({ attachment }: { attachment: InputAttachment }) {
  const iconByKind: Record<InputAttachment["kind"], DsIconName> = {
    document: "clipboard-text",
    link: "link",
    reference_video: "film-strip",
  };

  return (
    <span className={`brief-message-attachment-chip ${attachment.kind} label-xs-semibold`} title={attachment.source}>
      <DsIcon name={iconByKind[attachment.kind]} size={13} />
      <span>{attachment.label}</span>
    </span>
  );
}

function BriefBasicsSection({
  fields,
  onConfirmField,
  onFieldChange,
  onRegenerateField,
  summaryMode = false,
}: {
  fields: BriefFields;
  onConfirmField: (fieldId: BriefFieldId) => void;
  onFieldChange: (fieldId: BriefFieldId, value: string) => void;
  onRegenerateField: (fieldId: BriefFieldId) => void;
  summaryMode?: boolean;
}) {
  return (
    <section
      className={`brief-section-panel ${summaryMode ? "summary-mode" : ""}`}
      aria-label={summaryMode ? undefined : "The basics"}
      aria-labelledby={summaryMode ? "brief-basics-title" : undefined}
    >
      {summaryMode ? (
        <BriefSectionHeader
          hideCopy
          hideEyebrow
          titleId="brief-basics-title"
          title="The basics"
        />
      ) : null}
      <div className="brief-field-list">
        <BriefFieldRow field={fields.description} onConfirm={onConfirmField} onRegenerate={onRegenerateField}>
          <div className="brief-textarea-wrap">
            <textarea
              className="brief-textarea label-s"
              aria-label="Description"
              placeholder="Describe the video in plain language. Include must-say points, key information and anything to avoid."
              value={fields.description.value}
              onChange={(event) => onFieldChange("description", event.target.value)}
            />
          </div>
        </BriefFieldRow>
        <BriefFieldRow field={fields.videoType} onConfirm={onConfirmField} onRegenerate={onRegenerateField}>
          <BriefVideoTypeMultiSelect
            value={fields.videoType.value}
            onChange={(value) => onFieldChange("videoType", value)}
          />
        </BriefFieldRow>
        <BriefFieldRow field={fields.platform} onConfirm={onConfirmField} onRegenerate={onRegenerateField}>
          <BriefDeliverablePlatformSelect
            value={fields.platform.value}
            onChange={(value) => onFieldChange("platform", value)}
          />
        </BriefFieldRow>
      </div>
    </section>
  );
}

function BriefSectionHeader({
  copy,
  eyebrow,
  hideCopy = false,
  hideEyebrow = false,
  titleId,
  title,
}: {
  copy?: string;
  eyebrow?: string;
  hideCopy?: boolean;
  hideEyebrow?: boolean;
  titleId?: string;
  title: string;
}) {
  return (
    <header className="brief-section-header">
      {!hideEyebrow && eyebrow ? <span className="brief-section-eyebrow label-xs-semibold">{eyebrow}</span> : null}
      <h2 id={titleId}>{title}</h2>
      {!hideCopy && copy ? <p className="paragraph-s">{copy}</p> : null}
    </header>
  );
}

function BriefPurposeAudienceSection({
  fields,
  onConfirmField,
  onFieldChange,
  onRegenerateField,
  summaryMode = false,
}: {
  fields: BriefFields;
  onConfirmField: (fieldId: BriefFieldId) => void;
  onFieldChange: (fieldId: BriefFieldId, value: string) => void;
  onRegenerateField: (fieldId: BriefFieldId) => void;
  summaryMode?: boolean;
}) {
  return (
    <section
      className={`brief-section-panel ${summaryMode ? "summary-mode" : ""}`}
      aria-label={summaryMode ? undefined : "Purpose and audience"}
      aria-labelledby={summaryMode ? "brief-purpose-audience-title" : undefined}
    >
      {summaryMode ? (
        <BriefSectionHeader
          hideCopy
          hideEyebrow
          titleId="brief-purpose-audience-title"
          title="Purpose and audience"
        />
      ) : null}
      <div className="brief-field-list">
        <BriefFieldRow field={fields.purpose} onConfirm={onConfirmField} onRegenerate={onRegenerateField}>
          <BriefPurposeSelect value={fields.purpose.value} onChange={(value) => onFieldChange("purpose", value)} />
        </BriefFieldRow>
        <BriefFieldRow field={fields.audience} onConfirm={onConfirmField} onRegenerate={onRegenerateField}>
          <BriefAudienceList
            value={fields.audience.value}
            onChange={(value) => onFieldChange("audience", value)}
          />
        </BriefFieldRow>
        <BriefFieldRow field={fields.callToAction} onConfirm={onConfirmField} onRegenerate={onRegenerateField}>
          <BriefCallToActionSelect
            value={fields.callToAction.value}
            onChange={(value) => onFieldChange("callToAction", value)}
          />
        </BriefFieldRow>
      </div>
    </section>
  );
}

function BriefPurposeSelect({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const isKnownPurpose = briefPurposeOptions.includes(value as (typeof briefPurposeOptions)[number]);
  const isCustomPurpose = value === "Something else" || (!!value && !isKnownPurpose);
  const customValue = isCustomPurpose && value !== "Something else" ? value : "";
  const selectPurpose = (option: (typeof briefPurposeOptions)[number]) => {
    onChange(option);
    setIsOpen(false);
  };
  const menu = isOpen ? (
    <div className="brief-purpose-menu" role="listbox" aria-label="Purpose options">
      {briefPurposeOptions.map((option) => (
        <button
          className="brief-purpose-option label-s"
          key={option}
          onClick={() => selectPurpose(option)}
          role="option"
          type="button"
          aria-selected={option === (isCustomPurpose ? "Something else" : value)}
        >
          <BriefPurposeOptionLabel option={option} />
        </button>
      ))}
    </div>
  ) : null;

  if (isCustomPurpose) {
    return (
      <div
        className="brief-custom-select-wrap"
        onBlur={(event) => {
          const nextFocus = event.relatedTarget;
          if (!(nextFocus instanceof Node) || !event.currentTarget.contains(nextFocus)) {
            setIsOpen(false);
          }
        }}
      >
        <input
          className="brief-custom-select-input label-s"
          aria-label="Custom purpose"
          placeholder="Describe the purpose"
          value={customValue}
          onChange={(event) => onChange(event.target.value || "Something else")}
        />
        <button
          className="brief-custom-select-menu"
          type="button"
          aria-label="Change purpose"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((current) => !current)}
        >
          <span className="sr-only">Change purpose</span>
        </button>
        <DsIcon name="caret-down" size={14} />
        {menu}
      </div>
    );
  }

  return (
    <div
      className="brief-custom-select brief-purpose-picker"
      onBlur={(event) => {
        const nextFocus = event.relatedTarget;
        if (!(nextFocus instanceof Node) || !event.currentTarget.contains(nextFocus)) {
          setIsOpen(false);
        }
      }}
    >
      <button
        className={`brief-purpose-trigger label-s ${value ? "" : "is-placeholder"}`}
        type="button"
        aria-label="Purpose"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        {value ? <BriefPurposeOptionLabel option={value} /> : "Choose purpose"}
        <DsIcon name="caret-down" size={14} />
      </button>
      {menu}
    </div>
  );
}

function BriefPurposeOptionLabel({ option }: { option: string }) {
  const [purpose, explanation] = option.split(" - ");

  return (
    <span className="brief-purpose-option-label">
      <strong>{purpose}</strong>
      {explanation ? <span> - {explanation}</span> : null}
    </span>
  );
}

function BriefCallToActionSelect({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const isKnownCallToAction = briefCallToActionOptions.includes(value as (typeof briefCallToActionOptions)[number]);
  const isCustomCallToAction = value === "Something else" || (!!value && !isKnownCallToAction);
  const customValue = isCustomCallToAction && value !== "Something else" ? value : "";
  const selectCallToAction = (option: (typeof briefCallToActionOptions)[number]) => {
    onChange(option);
    setIsOpen(false);
  };
  const menu = isOpen ? (
    <div className="brief-purpose-menu" role="listbox" aria-label="Call to action options">
      {briefCallToActionOptions.map((option) => (
        <button
          className="brief-purpose-option label-s"
          key={option}
          onClick={() => selectCallToAction(option)}
          role="option"
          type="button"
          aria-selected={option === (isCustomCallToAction ? "Something else" : value)}
        >
          <span className="brief-purpose-option-label">
            <strong>{option}</strong>
          </span>
        </button>
      ))}
    </div>
  ) : null;

  if (isCustomCallToAction) {
    return (
      <div
        className="brief-custom-select-wrap"
        onBlur={(event) => {
          const nextFocus = event.relatedTarget;
          if (!(nextFocus instanceof Node) || !event.currentTarget.contains(nextFocus)) {
            setIsOpen(false);
          }
        }}
      >
        <input
          className="brief-custom-select-input label-s"
          aria-label="Custom call to action"
          placeholder="Describe the call to action"
          value={customValue}
          onChange={(event) => onChange(event.target.value || "Something else")}
        />
        <button
          className="brief-custom-select-menu"
          type="button"
          aria-label="Change call to action"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((current) => !current)}
        >
          <span className="sr-only">Change call to action</span>
        </button>
        <DsIcon name="caret-down" size={14} />
        {menu}
      </div>
    );
  }

  return (
    <div
      className="brief-custom-select brief-purpose-picker"
      onBlur={(event) => {
        const nextFocus = event.relatedTarget;
        if (!(nextFocus instanceof Node) || !event.currentTarget.contains(nextFocus)) {
          setIsOpen(false);
        }
      }}
    >
      <button
        className={`brief-purpose-trigger label-s ${value ? "" : "is-placeholder"}`}
        type="button"
        aria-label="What do we want them to do next?"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        {value ? (
          <span className="brief-purpose-option-label">
            <strong>{value}</strong>
          </span>
        ) : (
          "Choose call to action"
        )}
        <DsIcon name="caret-down" size={14} />
      </button>
      {menu}
    </div>
  );
}

function BriefAudienceList({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  const parsedAudiences = parseAudienceList(value);
  const audiences = parsedAudiences;

  function updateAudience(index: number, nextValue: string) {
    const nextAudiences = audiences.map((audience, audienceIndex) =>
      audienceIndex === index ? nextValue : audience,
    );

    onChange(serialiseAudienceList(nextAudiences));

  }

  function removeAudience(index: number) {
    const nextAudiences = audiences.filter((_, audienceIndex) => audienceIndex !== index);

    onChange(serialiseAudienceList(nextAudiences));
  }

  return (
    <div className="brief-audience-list">
      {audiences.map((audience, index) => {
        const label = getAudienceLabel(index);

        return (
          <div className="brief-audience-item" key={`${label}-${index}`}>
            <div className="brief-audience-input-wrap">
              <input
                id={`brief-audience-${index}`}
                className="brief-audience-input label-s"
                aria-label={label}
                placeholder={getAudiencePlaceholder(index)}
                value={audience}
                onChange={(event) => updateAudience(index, event.target.value)}
              />
              {index > 0 ? (
                <button
                  className="brief-audience-remove"
                  type="button"
                  aria-label={`Remove ${label}`}
                  onClick={() => removeAudience(index)}
                >
                  <DsIcon name="x-close-cross" size={12} />
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BriefLookAndFeelSection({
  fields,
  onConfirmField,
  onFieldChange,
  onRegenerateField,
  summaryMode = false,
}: {
  fields: BriefFields;
  onConfirmField: (fieldId: BriefFieldId) => void;
  onFieldChange: (fieldId: BriefFieldId, value: string) => void;
  onRegenerateField: (fieldId: BriefFieldId) => void;
  summaryMode?: boolean;
}) {
  return (
    <section
      className={`brief-section-panel ${summaryMode ? "summary-mode" : ""}`}
      aria-label={summaryMode ? undefined : "Look and feel"}
      aria-labelledby={summaryMode ? "brief-look-feel-title" : undefined}
    >
      {summaryMode ? (
        <BriefSectionHeader
          hideCopy
          hideEyebrow
          titleId="brief-look-feel-title"
          title="Look and feel"
        />
      ) : null}
      <div className="brief-field-list">
        <BriefFieldRow field={fields.feeling} onConfirm={onConfirmField} onRegenerate={onRegenerateField}>
          <BriefMultiSelect
            ariaLabel="Tone options"
            options={briefToneOptions}
            value={fields.feeling.value}
            onChange={(value) => onFieldChange("feeling", value)}
          />
        </BriefFieldRow>
        <BriefFieldRow field={fields.referenceVideos} onConfirm={onConfirmField} onRegenerate={onRegenerateField}>
          <BriefReferenceVideosField
            value={fields.referenceVideos.value}
            onChange={(value) => onFieldChange("referenceVideos", value)}
          />
        </BriefFieldRow>
        <BriefFieldRow field={fields.brandKit} onConfirm={onConfirmField} onRegenerate={onRegenerateField}>
          <BriefBrandKitPicker
            value={fields.brandKit.value}
            onChange={(value) => onFieldChange("brandKit", value)}
          />
        </BriefFieldRow>
      </div>
    </section>
  );
}

function BriefContentProductionSection({
  fields,
  onConfirmField,
  onFieldChange,
  onRegenerateField,
  summaryMode = false,
}: {
  fields: BriefFields;
  onConfirmField: (fieldId: BriefFieldId) => void;
  onFieldChange: (fieldId: BriefFieldId, value: string) => void;
  onRegenerateField: (fieldId: BriefFieldId) => void;
  summaryMode?: boolean;
}) {
  return (
    <section
      className={`brief-section-panel ${summaryMode ? "summary-mode" : ""}`}
      aria-label={summaryMode ? undefined : "Content and production"}
      aria-labelledby={summaryMode ? "brief-content-production-title" : undefined}
    >
      {summaryMode ? (
        <BriefSectionHeader
          hideCopy
          hideEyebrow
          titleId="brief-content-production-title"
          title="Content and production"
        />
      ) : null}
      <div className="brief-field-list">
        <BriefFieldRow field={fields.liveFootage} onConfirm={onConfirmField} onRegenerate={onRegenerateField}>
          <BriefLiveFootageToggle
            value={fields.liveFootage.value}
            onChange={(value) => onFieldChange("liveFootage", value)}
          />
        </BriefFieldRow>
        <BriefFieldRow field={fields.voiceover} onConfirm={onConfirmField} onRegenerate={onRegenerateField}>
          <BriefVoiceoverControl
            value={fields.voiceover.value}
            onChange={(value) => onFieldChange("voiceover", value)}
          />
        </BriefFieldRow>
      </div>
    </section>
  );
}

function BriefDeliverablesSection({
  fields,
  onConfirmField,
  onFieldChange,
  onRegenerateField,
  summaryMode = false,
}: {
  fields: BriefFields;
  onConfirmField: (fieldId: BriefFieldId) => void;
  onFieldChange: (fieldId: BriefFieldId, value: string) => void;
  onRegenerateField: (fieldId: BriefFieldId) => void;
  summaryMode?: boolean;
}) {
  return (
    <section
      className={`brief-section-panel ${summaryMode ? "summary-mode" : ""}`}
      aria-label={summaryMode ? undefined : "Deliverables and timing"}
      aria-labelledby={summaryMode ? "brief-deliverables-title" : undefined}
    >
      {summaryMode ? (
        <BriefSectionHeader
          hideCopy
          hideEyebrow
          titleId="brief-deliverables-title"
          title="Deliverables and timing"
        />
      ) : null}
      <div className="brief-field-list">
        <BriefFieldRow field={fields.deliverables} onConfirm={onConfirmField} onRegenerate={onRegenerateField}>
          <BriefDeliverablesTable
            fallbackDeadline={fields.deadline.value}
            value={fields.deliverables.value}
            onChange={(value) => onFieldChange("deliverables", value)}
          />
        </BriefFieldRow>
      </div>
    </section>
  );
}

function BriefDeliverablesTable({
  fallbackDeadline,
  onChange,
  value,
}: {
  fallbackDeadline: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const rows = parseDeliverables(value, fallbackDeadline);
  const [openMenuRowId, setOpenMenuRowId] = useState<string | null>(null);
  const [openNotesRowIds, setOpenNotesRowIds] = useState<string[]>([]);

  function updateRows(nextRows: DeliverableRow[]) {
    onChange(serialiseDeliverables(nextRows));
  }

  function updateRow(rowId: string, updates: Partial<DeliverableRow>) {
    updateRows(rows.map((row) => (row.id === rowId ? { ...row, ...updates } : row)));
  }

  function addRow() {
    const previousRow = rows[rows.length - 1];
    const rowNames = ["Reels cutdown", "Square cut", "Shorts cut", "Paid social cut"];
    const nextName = rowNames[Math.max(0, rows.length - 1)] ?? `Version ${rows.length + 1}`;

    updateRows([...rows, createBlankDeliverableRow(nextName, previousRow?.deadline ?? fallbackDeadline)]);
  }

  function duplicateRow(row: DeliverableRow) {
    updateRows([
      ...rows,
      {
        ...row,
        id: `deliverable-${Date.now()}`,
        isMain: false,
        name: row.name ? `${row.name} copy` : "Version copy",
      },
    ]);
    setOpenMenuRowId(null);
  }

  function removeRow(rowId: string) {
    updateRows(rows.filter((row) => row.id !== rowId || row.isMain));
    setOpenMenuRowId(null);
  }

  function toggleNotes(rowId: string) {
    setOpenNotesRowIds((current) =>
      current.includes(rowId) ? current.filter((currentRowId) => currentRowId !== rowId) : [...current, rowId],
    );
    setOpenMenuRowId(null);
  }

  return (
    <div className="brief-deliverables-control">
      <div className="brief-deliverables-table-wrap">
        <table className="brief-deliverables-table">
          <thead>
            <tr>
              <BriefDeliverablesHeader title="Deliverable" />
              <BriefDeliverablesHeader title="Format" />
              <BriefDeliverablesHeader title="Duration" />
              <BriefDeliverablesHeader title="Captions" />
              <BriefDeliverablesHeader title="Deadline" />
              <th aria-label="Version actions" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className={row.isMain ? "is-main" : ""} key={row.id}>
                <td className="brief-deliverable-name-cell">
                  {row.isMain ? (
                    <span className="brief-deliverable-main-name label-s-semibold">{row.name}</span>
                  ) : (
                    <label className="brief-deliverable-name-edit">
                      <input
                        className="brief-deliverable-name-input label-s-semibold"
                        aria-label="Deliverable name"
                        value={row.name}
                        onChange={(event) => updateRow(row.id, { name: event.target.value })}
                      />
                      <DsIcon name="pencil-simple" size={13} />
                    </label>
                  )}
                  {openNotesRowIds.includes(row.id) || row.notes ? (
                    <textarea
                      className="brief-deliverable-notes-input label-xs"
                      aria-label={`${row.name || "Version"} notes`}
                      placeholder="Add notes for this version"
                      rows={2}
                      value={row.notes}
                      onChange={(event) => updateRow(row.id, { notes: event.target.value })}
                    />
                  ) : null}
                </td>
                <td>
                  <BriefDeliverableFormatControl
                    row={row}
                    onChange={(updates) => updateRow(row.id, updates)}
                  />
                </td>
                <td>
                  <BriefDeliverableDurationControl
                    row={row}
                    onChange={(updates) => updateRow(row.id, updates)}
                  />
                </td>
                <td>
                  <BriefDeliverableCaptionsControl
                    row={row}
                    onChange={(updates) => updateRow(row.id, updates)}
                  />
                </td>
                <td>
                  <BriefDeliverableDeadlineControl
                    value={row.deadline}
                    onChange={(deadline) => updateRow(row.id, { deadline })}
                  />
                </td>
                <td>
                  <div className="brief-deliverable-actions">
                    <button
                      className="brief-deliverable-menu-button"
                      type="button"
                      aria-label={`Open menu for ${row.name || "version"}`}
                      aria-expanded={openMenuRowId === row.id}
                      onClick={() => setOpenMenuRowId(openMenuRowId === row.id ? null : row.id)}
                    >
                      <DsIcon name="dots-three" size={14} />
                    </button>
                    {openMenuRowId === row.id ? (
                      <span className="brief-deliverable-menu">
                        <button className="label-xs-semibold" type="button" onClick={() => toggleNotes(row.id)}>
                          {openNotesRowIds.includes(row.id) || row.notes ? "Hide notes" : "Notes"}
                        </button>
                        <button className="label-xs-semibold" type="button" onClick={() => duplicateRow(row)}>
                          Duplicate
                        </button>
                        {!row.isMain ? (
                          <button className="delete label-xs-semibold" type="button" onClick={() => removeRow(row.id)}>
                            Delete
                          </button>
                        ) : null}
                      </span>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="brief-add-version-button label-xs-semibold" type="button" onClick={addRow}>
        + Add version
      </button>
    </div>
  );
}

function BriefDeliverablesHeader({
  title,
  tooltip,
}: {
  title: string;
  tooltip?: string;
}) {
  return (
    <th scope="col">
      <span
        className="brief-deliverables-heading"
        data-tooltip={tooltip}
        tabIndex={tooltip ? 0 : undefined}
      >
        {title}
      </span>
    </th>
  );
}

function BriefDeliverablePlatformSelect({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  const [isPlatformMenuOpen, setIsPlatformMenuOpen] = useState(false);

  function selectPlatform(platform: string) {
    onChange(platform);
    setIsPlatformMenuOpen(false);
  }

  return (
    <div className="brief-platform-select">
      <button
        className={`brief-platform-trigger label-s${value ? "" : " is-placeholder"}`}
        type="button"
        aria-expanded={isPlatformMenuOpen}
        aria-label="Platform"
        onClick={() => setIsPlatformMenuOpen((isOpen) => !isOpen)}
      >
        <span>{value || "Choose platform"}</span>
        <DsIcon name="caret-down" size={12} />
      </button>
      {isPlatformMenuOpen ? (
        <div className="brief-platform-menu" role="listbox" aria-label="Choose platform">
          {deliverablePlatformGroups.map((group) => (
            <div className="brief-platform-group" key={group.label}>
              <span className="brief-platform-group-label label-xs-semibold">{group.label.toUpperCase()}</span>
              {group.options.map((option) => (
                <button
                  className={`brief-platform-option label-s${option === value ? " selected" : ""}`}
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={option === value}
                  onClick={() => selectPlatform(option)}
                >
                  <span className="brief-platform-icon" aria-hidden="true">
                    <DsIcon name={deliverablePlatformIconMap[option] ?? "grid-four"} size={13} />
                  </span>
                  <span>{option}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function BriefDeliverableFormatControl({
  onChange,
  row,
}: {
  onChange: (updates: Partial<DeliverableRow>) => void;
  row: DeliverableRow;
}) {
  const selectedFormat = deliverableFormatOptions.find((format) => format.label === row.format) ?? deliverableFormatOptions[0];
  const [isFormatMenuOpen, setIsFormatMenuOpen] = useState(false);

  function selectFormat(format: string) {
    onChange({ format, customFormat: "" });
    setIsFormatMenuOpen(false);
  }

  return (
    <div className="brief-deliverable-inline-control">
      <div className="brief-format-select">
        <button
          className="brief-format-trigger label-xs-semibold"
          type="button"
          aria-expanded={isFormatMenuOpen}
          aria-label="Format"
          onClick={() => setIsFormatMenuOpen((isOpen) => !isOpen)}
        >
          <span className={`brief-aspect-icon ${selectedFormat.iconClass}`} aria-hidden="true" />
          <span>{selectedFormat.label}</span>
          <DsIcon name="caret-down" size={12} />
        </button>
        {isFormatMenuOpen ? (
          <div className="brief-format-menu" role="listbox" aria-label="Choose format">
            {deliverableFormatOptions.map((format) => (
              <button
                className={`brief-format-option label-s${format.label === row.format ? " selected" : ""}`}
                key={format.label}
                type="button"
                role="option"
                aria-selected={format.label === row.format}
                onClick={() => selectFormat(format.label)}
              >
                {format.label !== "Custom" ? (
                  <span className={`brief-aspect-icon ${format.iconClass}`} aria-hidden="true" />
                ) : null}
                <span>{format.label} ({format.helper})</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {row.format === "Custom" ? (
        <input
          className="brief-table-mini-input label-xs"
          aria-label="Custom format"
          placeholder="4:5"
          value={row.customFormat}
          onChange={(event) => onChange({ customFormat: event.target.value })}
        />
      ) : null}
    </div>
  );
}

function BriefDeliverableDurationControl({
  onChange,
  row,
}: {
  onChange: (updates: Partial<DeliverableRow>) => void;
  row: DeliverableRow;
}) {
  const selectedDuration =
    deliverableDurationOptions.find((duration) => duration.label === row.duration) ?? deliverableDurationOptions[0];
  const [isDurationMenuOpen, setIsDurationMenuOpen] = useState(false);

  function selectDuration(duration: string) {
    onChange({
      duration,
      customMinutes: duration === "Custom" ? row.customMinutes : "",
      customSeconds: duration === "Custom" ? row.customSeconds : "",
    });
    setIsDurationMenuOpen(false);
  }

  return (
    <div className="brief-deliverable-inline-control">
      <div className="brief-duration-select">
        <button
          className="brief-duration-trigger"
          type="button"
          aria-expanded={isDurationMenuOpen}
          aria-label="Duration"
          onClick={() => setIsDurationMenuOpen((isOpen) => !isOpen)}
        >
          <span className="brief-duration-value label-xs-semibold">{selectedDuration.label}</span>
          <DsIcon name="caret-down" size={12} />
        </button>
        {isDurationMenuOpen ? (
          <div className="brief-duration-menu" role="listbox" aria-label="Choose duration">
            {deliverableDurationOptions.map((duration) => (
              <button
                className={`brief-duration-option${duration.label === row.duration ? " selected" : ""}`}
                key={duration.label}
                type="button"
                role="option"
                aria-selected={duration.label === row.duration}
                onClick={() => selectDuration(duration.label)}
              >
                <span className="brief-duration-value label-s-semibold">{duration.label}</span>
                <span className="brief-duration-helper label-s">{duration.helper}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {row.duration === "Custom" ? (
        <div className="brief-custom-duration">
          <input
            className="brief-table-mini-input label-xs"
            aria-label="Custom minutes"
            inputMode="numeric"
            placeholder="min"
            value={row.customMinutes}
            onChange={(event) => onChange({ customMinutes: event.target.value })}
          />
          <input
            className="brief-table-mini-input label-xs"
            aria-label="Custom seconds"
            inputMode="numeric"
            placeholder="sec"
            value={row.customSeconds}
            onChange={(event) => onChange({ customSeconds: event.target.value })}
          />
        </div>
      ) : null}
    </div>
  );
}

function BriefDeliverableCaptionsControl({
  onChange,
  row,
}: {
  onChange: (updates: Partial<DeliverableRow>) => void;
  row: DeliverableRow;
}) {
  const [isCaptionsMenuOpen, setIsCaptionsMenuOpen] = useState(false);
  const selectedOptions = getDeliverableCaptionOptions(row);

  function toggleCaptionOption(option: DeliverableCaptionOption) {
    const nextOptions = getNextDeliverableCaptionOptions(selectedOptions, option);

    onChange({
      captionOptions: nextOptions,
      captions: nextOptions.some((captionOption) => captionOption !== "None"),
    });
  }

  return (
    <div className="brief-captions-multi">
      <button
        className="brief-captions-trigger label-xs-semibold"
        type="button"
        aria-expanded={isCaptionsMenuOpen}
        aria-label="Caption options"
        onClick={() => setIsCaptionsMenuOpen((isOpen) => !isOpen)}
      >
        <span>{formatDeliverableCaptionSummary(row)}</span>
        <DsIcon name="caret-down" size={12} />
      </button>
      {isCaptionsMenuOpen ? (
        <div className="brief-captions-menu" role="listbox" aria-label="Choose caption options">
          {deliverableCaptionOptions.map((option) => {
            const isSelected = selectedOptions.includes(option.label);

            return (
              <button
                className={`brief-captions-option label-xs-semibold${isSelected ? " selected" : ""}`}
                data-tooltip={option.tooltip}
                key={option.label}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => toggleCaptionOption(option.label)}
              >
                <span className="brief-captions-check" aria-hidden="true">
                  {isSelected ? <DsIcon name="check" size={12} /> : null}
                </span>
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function BriefDeliverableDeadlineControl({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  const dateInputRef = useRef<HTMLInputElement>(null);
  const readableDate = formatBriefDate(value);

  return (
    <div className="brief-deliverable-deadline">
      <button
        className={`brief-date-pill label-xs-semibold${readableDate ? "" : " is-placeholder"}`}
        type="button"
        onClick={() => dateInputRef.current?.showPicker()}
      >
        {readableDate || "+ Add date"}
      </button>
      <input
        ref={dateInputRef}
        className="brief-date-native"
        type="date"
        aria-label="Deliverable deadline"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function BriefDeadlineField({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  const dateInputRef = useRef<HTMLInputElement>(null);
  const readableDate = formatBriefDate(value);

  return (
    <div className="brief-deadline-control">
      <div className="brief-date-picker-wrap">
        <button
          className={`brief-date-display label-s${readableDate ? "" : " is-placeholder"}`}
          type="button"
          onClick={() => dateInputRef.current?.showPicker()}
        >
          <span>{readableDate || "Choose date"}</span>
          <DsIcon name="caret-down" size={12} />
        </button>
        <input
          ref={dateInputRef}
          className="brief-date-native"
          type="date"
          aria-label="Deadline"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  );
}

function BriefLiveFootageToggle({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  const [footageChoice, shooterChoice] = parseLiveFootageValue(value);
  const isShootingNew = footageChoice === "Shoot new";
  const footageOptions: Array<{
    description: string;
    label: "Use existing" | "Shoot new";
  }> = [
    {
      label: "Use existing",
      description: "Faster, cheaper. Best if you already have great footage.",
    },
    {
      label: "Shoot new",
      description: "Best for fresh, on-brand visuals. Adds time and budget.",
    },
  ];
  const shooterOptions: Array<{
    description: string;
    label: "You shoot" | "ChopChop shoots";
  }> = [
    {
      label: "You shoot",
      description: "You handle the crew, kit, and location.",
    },
    {
      label: "ChopChop shoots",
      description: "We handle everything - crew, kit, location, direction.",
    },
  ];

  function selectFootageChoice(nextChoice: "Use existing" | "Shoot new") {
    if (nextChoice === "Use existing") {
      onChange("Use existing");
      return;
    }

    onChange(`Shoot new|${shooterChoice || "ChopChop shoots"}`);
  }

  function selectShooterChoice(nextChoice: "You shoot" | "ChopChop shoots") {
    onChange(`Shoot new|${nextChoice}`);
  }

  return (
    <div className="brief-live-footage-control">
      <div className="brief-pill-toggle-group" aria-label="Live footage source" role="group">
        {footageOptions.map((option) => (
          <button
            className={`brief-pill-toggle brief-pill-toggle-described ${footageChoice === option.label ? "selected" : ""}`}
            key={option.label}
            type="button"
            aria-pressed={footageChoice === option.label}
            onClick={() => selectFootageChoice(option.label)}
          >
            <span className="brief-pill-toggle-title label-s-semibold">{option.label}</span>
            <span className="brief-pill-toggle-description label-xs">{option.description}</span>
          </button>
        ))}
      </div>
      {isShootingNew ? (
        <div className="brief-live-footage-shooter-block">
          <span className="brief-live-footage-sub-label label-xs-semibold">Who's shooting it?</span>
          <div className="brief-pill-toggle-group" aria-label="Who will shoot the footage" role="group">
            {shooterOptions.map((option) => (
              <button
                className={`brief-pill-toggle brief-pill-toggle-described ${shooterChoice === option.label ? "selected" : ""}`}
                key={option.label}
                type="button"
                aria-pressed={shooterChoice === option.label}
                onClick={() => selectShooterChoice(option.label)}
              >
                <span className="brief-pill-toggle-title label-s-semibold">{option.label}</span>
                <span className="brief-pill-toggle-description label-xs">{option.description}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BriefVoiceoverControl({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  const [playingVoice, setPlayingVoice] = useState("");
  const [voiceoverChoice, soundChoice, artistChoice] = parseVoiceoverValue(value);
  const wantsVoiceover = voiceoverChoice === "Yes";

  function selectVoiceoverChoice(nextChoice: "Yes" | "No" | "We'll do our own") {
    setPlayingVoice("");

    if (nextChoice !== "Yes") {
      onChange(nextChoice);
      return;
    }

    onChange(`Yes|${soundChoice || ""}|${artistChoice || ""}`);
  }

  function selectSoundChoice(nextChoice: "Male voiceover" | "Female voiceover") {
    onChange(`Yes|${nextChoice}|${artistChoice || ""}`);
  }

  function selectArtist(nextArtist: string) {
    onChange(`Yes|${soundChoice || "Male voiceover"}|${nextArtist}`);
  }

  function togglePreview(nextArtist: string) {
    setPlayingVoice((currentVoice) => (currentVoice === nextArtist ? "" : nextArtist));
  }

  return (
    <div className="brief-voiceover-control">
      <div className="brief-pill-toggle-group" aria-label="Voiceover preference" role="group">
        {(["Yes", "No", "We'll do our own"] as const).map((option) => (
          <button
            className={`brief-pill-toggle label-s-semibold ${voiceoverChoice === option ? "selected" : ""}`}
            key={option}
            type="button"
            aria-pressed={voiceoverChoice === option}
            onClick={() => selectVoiceoverChoice(option)}
          >
            {option}
          </button>
        ))}
      </div>
      {wantsVoiceover ? (
        <>
          <div className="brief-nested-field">
            <p className="label-s-semibold">How should it sound?</p>
            <div className="brief-pill-toggle-group" aria-label="Voiceover sound" role="group">
              {(["Male voiceover", "Female voiceover"] as const).map((option) => (
                <button
                  className={`brief-pill-toggle label-s-semibold ${soundChoice === option ? "selected" : ""}`}
                  key={option}
                  type="button"
                  aria-pressed={soundChoice === option}
                  onClick={() => selectSoundChoice(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          {soundChoice ? (
            <div className="brief-nested-field">
              <div>
                <p className="label-s-semibold">In what voice?</p>
                <p className="brief-helper-copy label-xs">
                  Two options: AI voices are available immediately. Human artists add 3-4 days to the edit.
                </p>
              </div>
              {(["AI voices", "Human artists"] as const).map((group) => (
                <div className="brief-voice-group" key={group}>
                  <h3 className="label-xs-semibold">{group}</h3>
                  <div className="brief-voice-card-list">
                    {voiceArtists
                      .filter((artist) => artist.group === group)
                      .map((artist) => {
                        const isSelected = artistChoice === artist.name;
                        const isPlaying = playingVoice === artist.name;

                        return (
                          <article className={`brief-voice-card ${isSelected ? "selected" : ""}`} key={artist.name}>
                            <button
                              className="brief-voice-radio"
                              type="button"
                              aria-label={`Select ${artist.name}`}
                              aria-pressed={isSelected}
                              onClick={() => selectArtist(artist.name)}
                            >
                              <span />
                            </button>
                            <span className="brief-voice-name label-s-semibold">{artist.name}</span>
                            <button
                              className="brief-voice-play"
                              type="button"
                              aria-label={`${isPlaying ? "Stop" : "Play"} ${artist.name} preview`}
                              onClick={() => togglePreview(artist.name)}
                            >
                              <DsIcon name={isPlaying ? "pause" : "play"} size={14} />
                            </button>
                            <div className={`brief-voice-waveform ${isPlaying ? "playing" : ""}`} aria-hidden="true">
                              <span />
                            </div>
                            <span className="brief-voice-duration label-xs-semibold">{artist.duration}</span>
                          </article>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function BriefReferenceVideosField({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [linkValue, setLinkValue] = useState("");
  const videos = parseReferenceVideos(value).slice(0, 5);
  const canAddMore = videos.length < 5;

  function updateVideos(nextVideos: ReferenceVideoCard[]) {
    onChange(serialiseReferenceVideos(nextVideos.slice(0, 5)));
  }

  function addVideo(video: ReferenceVideoCard) {
    if (!canAddMore) {
      return;
    }

    updateVideos([...videos, video]);
  }

  function submitLink() {
    const trimmedValue = linkValue.trim();

    if (!trimmedValue || !canAddMore) {
      return;
    }

    addVideo(createReferenceVideoFromUrl(trimmedValue));
    setLinkValue("");
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file && canAddMore) {
      addVideo(createReferenceVideoFromFile(file));
    }

    event.target.value = "";
  }

  return (
    <div className="brief-reference-videos">
      <div className="brief-reference-actions">
        <label className="brief-reference-link-entry label-s" aria-label="Paste reference video URL">
          <DsIcon name="link-simple-horizontal" size={16} />
          <input
            value={linkValue}
            placeholder="Paste YouTube, Vimeo or Loom URL"
            disabled={!canAddMore}
            onChange={(event) => setLinkValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submitLink();
              }
            }}
          />
        </label>
        <button
          className="brief-toolbar-button label-xs-semibold"
          type="button"
          disabled={!canAddMore}
          onClick={() => fileInputRef.current?.click()}
        >
          <DsIcon name="upload-simple" size={14} />
          Upload video
        </button>
        <input
          ref={fileInputRef}
          className="brief-hidden-file-input"
          type="file"
          accept="video/*"
          onChange={handleFileChange}
        />
      </div>
      {videos.length > 0 ? (
        <div className="brief-reference-card-list">
          {videos.map((video) => (
            <article className="brief-reference-card" key={video.id}>
              <div className="brief-reference-thumb" aria-hidden="true">
                <DsIcon name="film-strip" size={22} />
              </div>
              <div className="brief-reference-body">
                <div className="brief-reference-head">
                  <h3 className="label-s-semibold">{video.title}</h3>
                  <button
                    className="brief-reference-remove"
                    type="button"
                    aria-label={`Remove ${video.title}`}
                    onClick={() => updateVideos(videos.filter((currentVideo) => currentVideo.id !== video.id))}
                  >
                    <DsIcon name="x-close-cross" size={12} />
                  </button>
                </div>
                <p className="label-xs">{video.source}</p>
                <span className="brief-reference-duration label-xs-semibold">{video.duration}</span>
                <div className="brief-reference-tags" aria-label="AI style tags">
                  {video.tags.slice(0, 5).map((tag) => (
                    <span className="brief-reference-tag label-xs-semibold" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="brief-empty-field-copy label-s">Add up to 5 reference videos.</p>
      )}
    </div>
  );
}

function BriefBrandKitPicker({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const activeKit = brandKitOptions.find((kit) => kit.name === value) ?? brandKitOptions[0];

  function selectKit(nextValue: string) {
    onChange(nextValue);
    setIsOpen(false);
  }

  return (
    <div className="brief-brand-kit-picker">
      <article className="brief-brand-kit-card">
        <div className="brief-brand-kit-thumb" aria-hidden="true">
          {activeKit.thumbnailLabel}
        </div>
        <div className="brief-brand-kit-body">
          <div className="brief-brand-kit-head">
            <h3 className="label-s-semibold">{activeKit.name}</h3>
            <button
              className="brief-video-type-change label-xs-semibold"
              type="button"
              aria-expanded={isOpen}
              onClick={() => setIsOpen((currentValue) => !currentValue)}
            >
              Change
            </button>
          </div>
          <p className="label-s">{activeKit.description}</p>
        </div>
      </article>
      {isOpen ? (
        <div className="brief-brand-kit-menu" role="listbox" aria-label="Brand kit options">
          {brandKitOptions.map((kit) => (
            <button
              className={`brief-brand-kit-option ${kit.name === activeKit.name ? "selected" : ""}`}
              key={kit.name}
              type="button"
              aria-selected={kit.name === activeKit.name}
              role="option"
              onClick={() => selectKit(kit.name)}
            >
              <span className="brief-brand-kit-option-thumb" aria-hidden="true">
                {kit.thumbnailLabel}
              </span>
              <span>
                <strong>{kit.name}</strong>
                <span>{kit.description}</span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function BriefMultiSelect({
  ariaLabel,
  onChange,
  options,
  value,
}: {
  ariaLabel: string;
  onChange: (value: string) => void;
  options: readonly string[];
  value: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedValues = parseMultiSelectValue(value).slice(0, 3);
  const canAddTone = selectedValues.length < 3;

  function toggleOption(option: string) {
    const nextValues = selectedValues.includes(option)
      ? selectedValues.filter((selectedValue) => selectedValue !== option)
      : canAddTone
        ? [...selectedValues, option]
        : selectedValues;

    onChange(nextValues.join(", "));
  }

  function addOption(option: string) {
    if (selectedValues.includes(option) || !canAddTone) {
      return;
    }

    onChange([...selectedValues, option].join(", "));
    setIsOpen(false);
  }

  return (
    <div
      className="brief-tone-chip-picker"
      aria-label={ariaLabel}
      role="group"
      onBlur={(event) => {
        const nextFocus = event.relatedTarget;
        if (!(nextFocus instanceof Node) || !event.currentTarget.contains(nextFocus)) {
          setIsOpen(false);
        }
      }}
    >
      <div className="brief-tone-chip-row">
        {selectedValues.map((option) => (
          <button
            className="brief-tone-chip selected label-xs-semibold"
            key={option}
            type="button"
            aria-label={`Remove ${option}`}
            onClick={() => toggleOption(option)}
          >
            {option}
            <DsIcon name="x-close-cross" size={10} />
          </button>
        ))}
        {canAddTone ? (
          <button
            className="brief-tone-chip brief-tone-chip-add label-xs-semibold"
            type="button"
            aria-expanded={isOpen}
            onClick={() => setIsOpen((currentValue) => !currentValue)}
          >
            <DsIcon name="plus" size={12} />
            Add tone
          </button>
        ) : null}
      </div>
      {isOpen ? (
        <div className="brief-tone-popover" aria-label="Choose tone" role="listbox" aria-multiselectable="true">
          {options.map((option) => {
            const isSelected = selectedValues.includes(option);

            return (
              <button
                className={`brief-tone-chip label-xs-semibold ${isSelected ? "selected" : ""}`}
                key={option}
                type="button"
                disabled={isSelected}
                aria-selected={isSelected}
                role="option"
                onClick={() => addOption(option)}
              >
                {option}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

const videoTypeIconMap: Record<string, DsIconName> = {
  Animation: "grid-four",
  "AI Video": "chopchop-ai",
  "Brand Film": "lightbulb",
  "Case Study / Testimonial": "chat-circle",
  "Commercial / TVC": "fire-simple",
  Documentary: "film-strip",
  Event: "push-pin-simple",
  Explainer: "clipboard-text",
  "Fashion / Lookbook": "image-square",
  "Internal Comms": "paperclip",
  "Live Action": "video-camera",
  "Music Video": "play",
  Podcast: "speaker-high",
  "Product / Demo": "picture-in-picture",
  "Real Estate": "columns",
  "Short-Form / Reels": "film-slate",
  "Training / How To": "checks",
  "Wedding / Events": "heart",
};

function BriefVideoTypeMultiSelect({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedValues = parseMultiSelectValue(value).slice(0, 2);
  const canAddType = selectedValues.length < 2;

  function toggleType(nextValue: string) {
    const nextValues = selectedValues.includes(nextValue)
      ? selectedValues.filter((selectedValue) => selectedValue !== nextValue)
      : canAddType
        ? [...selectedValues, nextValue]
        : selectedValues;

    onChange(nextValues.join(", "));
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsOpen((currentValue) => !currentValue);
    }
  }

  return (
    <div
      className="brief-video-type-multi"
      onBlur={(event) => {
        const nextFocus = event.relatedTarget;
        if (!(nextFocus instanceof Node) || !event.currentTarget.contains(nextFocus)) {
          setIsOpen(false);
        }
      }}
    >
      {selectedValues.length > 0 ? (
        <div
          className="brief-video-type-card-list"
          role="button"
          tabIndex={0}
          aria-expanded={isOpen}
          aria-label="Choose video type"
          onClick={() => setIsOpen((currentValue) => !currentValue)}
          onKeyDown={handleTriggerKeyDown}
        >
          {selectedValues.map((selectedValue) => {
            const selectedType = briefVideoTypeDetails.find((videoType) => videoType.name === selectedValue);
            const iconName = videoTypeIconMap[selectedValue] ?? "film-strip";

            return (
              <article className="brief-video-type-card" key={selectedValue}>
                <div className="brief-video-type-card-icon" aria-hidden="true">
                  <DsIcon name={iconName} size={22} />
                </div>
                <div className="brief-video-type-card-body">
                  <div className="brief-video-type-card-head">
                    <h3 className="label-s-semibold">{selectedType?.name ?? selectedValue}</h3>
                    <button
                      className="brief-video-type-card-remove"
                      type="button"
                      aria-label={`Remove ${selectedType?.name ?? selectedValue}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleType(selectedValue);
                      }}
                    >
                      <DsIcon name="x-close-cross" size={12} />
                    </button>
                  </div>
                  <p className="label-xs">{selectedType?.description ?? ""}</p>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div
          className="brief-video-type-empty-trigger label-s"
          role="button"
          tabIndex={0}
          aria-expanded={isOpen}
          aria-label="Choose video type"
          onClick={() => setIsOpen((currentValue) => !currentValue)}
          onKeyDown={handleTriggerKeyDown}
        >
          Choose video type
          <DsIcon name="caret-down" size={16} />
        </div>
      )}

      {isOpen ? (
        <div
          className="brief-video-type-menu"
          aria-label="Choose video type"
          aria-multiselectable="true"
          role="listbox"
        >
          {briefVideoTypeDetails.map((videoType) => (
            <button
              className={`brief-video-type-option label-s ${selectedValues.includes(videoType.name) ? "selected" : ""}`}
              key={videoType.name}
              type="button"
              disabled={!selectedValues.includes(videoType.name) && !canAddType}
              aria-selected={selectedValues.includes(videoType.name)}
              role="option"
              onClick={() => toggleType(videoType.name)}
            >
              <span className="brief-video-type-option-icon" aria-hidden="true">
                <DsIcon name={videoTypeIconMap[videoType.name] ?? "film-strip"} size={16} />
              </span>
              <span className="brief-video-type-option-copy">
                <strong>{videoType.name}</strong>
                <span> - {videoType.summary}</span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function parseMultiSelectValue(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseAudienceList(value: string) {
  if (!value.trim()) {
    return [""];
  }

  const audiences = value
    .split("\n")
    .map((line) => line.replace(/^(Primary audience|Secondary audience|Audience \d+):\s*/i, "").trim())
    .filter(Boolean);

  if (audiences.length === 1 && audiences[0].includes(". ")) {
    const splitAudience = audiences[0]
      .split(". ")
      .map((item) => item.replace(/\.$/, "").trim())
      .filter(Boolean);

    if (splitAudience.length > 1) {
      return splitAudience;
    }
  }

  return audiences.length > 0 ? audiences : [""];
}

function serialiseAudienceList(audiences: string[]) {
  return audiences
    .map((audience, index) => ({ label: getAudienceLabel(index), value: audience.trim() }))
    .filter((audience) => audience.value)
    .map((audience) => `${audience.label}: ${audience.value}`)
    .join("\n");
}

function getAudienceLabel(index: number) {
  if (index === 0) {
    return "Primary audience";
  }

  return `Audience ${index + 1}`;
}

function getAudiencePlaceholder(index: number) {
  if (index === 0) {
    return "Primary audience";
  }

  return "";
}

function parseLiveFootageValue(value: string): ["Use existing" | "Shoot new" | "", "You shoot" | "ChopChop shoots" | ""] {
  const [footageChoice = "", shooterChoice = ""] = value.split("|");
  const normalisedFootageChoice = footageChoice === "Use existing" || footageChoice === "Shoot new" ? footageChoice : "";
  const normalisedShooterChoice = shooterChoice === "You shoot" || shooterChoice === "ChopChop shoots" ? shooterChoice : "";

  return [normalisedFootageChoice, normalisedShooterChoice];
}

function parseVoiceoverValue(
  value: string,
): [
  "Yes" | "No" | "We'll do our own" | "",
  "Male voiceover" | "Female voiceover" | "",
  string,
] {
  const [voiceoverChoice = "", soundChoice = "", artistChoice = ""] = value.split("|");
  const normalisedVoiceoverChoice =
    voiceoverChoice === "Yes" || voiceoverChoice === "No" || voiceoverChoice === "We'll do our own"
      ? voiceoverChoice
      : voiceoverChoice === "No, or we'll do our own"
        ? "We'll do our own"
        : "";
  const normalisedSoundChoice =
    soundChoice === "Male voiceover" || soundChoice === "Female voiceover" ? soundChoice : "";

  return [normalisedVoiceoverChoice, normalisedSoundChoice, artistChoice];
}

function parseReferenceVideos(value: string): ReferenceVideoCard[] {
  if (!value.trim()) {
    return [];
  }

  try {
    const parsedValue: unknown = JSON.parse(value);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter(isReferenceVideoCard);
  } catch {
    return [];
  }
}

function serialiseReferenceVideos(videos: ReferenceVideoCard[]) {
  return videos.length > 0 ? JSON.stringify(videos) : "";
}

function isReferenceVideoCard(value: unknown): value is ReferenceVideoCard {
  if (!value || typeof value !== "object") {
    return false;
  }

  const maybeVideo = value as Partial<ReferenceVideoCard>;

  return (
    typeof maybeVideo.id === "string" &&
    typeof maybeVideo.title === "string" &&
    typeof maybeVideo.source === "string" &&
    typeof maybeVideo.duration === "string" &&
    Array.isArray(maybeVideo.tags) &&
    maybeVideo.tags.every((tag) => typeof tag === "string")
  );
}

function createReferenceVideoFromAttachment(attachment: InputAttachment): ReferenceVideoCard {
  return {
    id: attachment.id,
    title: attachment.label,
    source: attachment.source,
    duration: getMockReferenceDuration(attachment.source),
    tags: getMockReferenceTags(attachment.source),
  };
}

function createReferenceVideoFromUrl(url: string): ReferenceVideoCard {
  const host = getVideoHost(url);

  return {
    id: `reference-${slugify(url)}-${Date.now()}`,
    title: `${host} reference`,
    source: url,
    duration: getMockReferenceDuration(url),
    tags: getMockReferenceTags(url),
  };
}

function createReferenceVideoFromFile(file: File): ReferenceVideoCard {
  return {
    id: `reference-file-${slugify(file.name)}-${Date.now()}`,
    title: file.name,
    source: file.name,
    duration: getMockReferenceDuration(file.name),
    tags: getMockReferenceTags(file.name),
  };
}

function getMockReferenceDuration(source: string) {
  const seed = source.length;
  const minutes = (seed % 3) + 1;
  const seconds = ((seed * 7) % 50) + 10;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function isDeliverableCaptionOption(value: string): value is DeliverableCaptionOption {
  return deliverableCaptionOptions.some((option) => option.label === value);
}

function getDeliverableCaptionOptions(row: DeliverableRow): DeliverableCaptionOption[] {
  const validOptions = (row.captionOptions ?? []).filter(isDeliverableCaptionOption);

  if (validOptions.length > 0) {
    return validOptions.includes("None") && validOptions.length > 1 ? ["None"] : validOptions;
  }

  return row.captions ? ["Baked in captions"] : ["None"];
}

function getNextDeliverableCaptionOptions(
  currentOptions: DeliverableCaptionOption[],
  option: DeliverableCaptionOption,
): DeliverableCaptionOption[] {
  if (option === "None") {
    return ["None"];
  }

  const withoutNone = currentOptions.filter((currentOption) => currentOption !== "None");
  const nextOptions = withoutNone.includes(option)
    ? withoutNone.filter((currentOption) => currentOption !== option)
    : [...withoutNone, option];

  return nextOptions.length > 0 ? nextOptions : ["None"];
}

function formatDeliverableCaptionSummary(row: DeliverableRow) {
  return getDeliverableCaptionOptions(row).join(", ");
}

function parseDeliverables(value: string, fallbackDeadline = ""): DeliverableRow[] {
  if (!value.trim()) {
    return [createMainDeliverableRow(fallbackDeadline)];
  }

  try {
    const parsedValue: unknown = JSON.parse(value);

    if (!Array.isArray(parsedValue)) {
      return [createMainDeliverableRow(fallbackDeadline)];
    }

    const parsedRows = parsedValue
      .filter(isDeliverableRow)
      .map((row, rowIndex) => normaliseDeliverableRow(row, fallbackDeadline, rowIndex));

    return parsedRows.length > 0 ? parsedRows : [createMainDeliverableRow(fallbackDeadline)];
  } catch {
    return [createMainDeliverableRow(fallbackDeadline)];
  }
}

function serialiseDeliverables(rows: DeliverableRow[]) {
  const usableRows = rows.filter((row) => row.name.trim() || row.platform.trim() || row.isMain);

  return usableRows.length > 0 ? JSON.stringify(usableRows) : "";
}

function isDeliverableRow(value: unknown): value is DeliverableRow {
  if (!value || typeof value !== "object") {
    return false;
  }

  const maybeRow = value as Partial<DeliverableRow>;

  return (
    typeof maybeRow.id === "string" &&
    typeof maybeRow.name === "string" &&
    typeof maybeRow.subtitle === "string" &&
    (typeof maybeRow.notes === "undefined" || typeof maybeRow.notes === "string") &&
    typeof maybeRow.platform === "string" &&
    typeof maybeRow.format === "string" &&
    typeof maybeRow.customFormat === "string" &&
    typeof maybeRow.duration === "string" &&
    typeof maybeRow.customMinutes === "string" &&
    typeof maybeRow.customSeconds === "string" &&
    typeof maybeRow.captions === "boolean" &&
    (typeof maybeRow.captionOptions === "undefined" ||
      (Array.isArray(maybeRow.captionOptions) &&
        maybeRow.captionOptions.every((captionOption) => typeof captionOption === "string"))) &&
    (typeof maybeRow.deadline === "undefined" || typeof maybeRow.deadline === "string") &&
    typeof maybeRow.isMain === "boolean"
  );
}

function normaliseDeliverableRow(row: DeliverableRow, fallbackDeadline = "", rowIndex = 0): DeliverableRow {
  const captionOptions = getDeliverableCaptionOptions(row);

  return {
    ...row,
    captionOptions,
    captions: captionOptions.some((captionOption) => captionOption !== "None"),
    notes: row.notes ?? "",
    deadline: row.deadline || fallbackDeadline,
    name: row.name || (rowIndex === 0 ? "Main Video" : `Version ${rowIndex + 1}`),
  };
}

function createMainDeliverableRow(deadline = ""): DeliverableRow {
  return {
    id: "main-video",
    name: "Main Video",
    subtitle: "Primary campaign asset",
    notes: "",
    platform: "YouTube (Main)",
    format: "Landscape",
    customFormat: "",
    duration: "3m",
    customMinutes: "",
    customSeconds: "",
    captions: true,
    captionOptions: ["Baked in captions"],
    deadline,
    isMain: true,
  };
}

function createBlankDeliverableRow(name = "Reels cutdown", deadline = ""): DeliverableRow {
  return {
    id: `deliverable-${Date.now()}`,
    name,
    subtitle: "",
    notes: "",
    platform: "",
    format: "Landscape",
    customFormat: "",
    duration: "30s",
    customMinutes: "",
    customSeconds: "",
    captions: true,
    captionOptions: ["Baked in captions"],
    deadline,
    isMain: false,
  };
}

function formatBriefDate(value: string) {
  const [yearValue, monthValue, dayValue] = value.split("-").map(Number);

  if (!yearValue || !monthValue || !dayValue) {
    return "";
  }

  const date = new Date(yearValue, monthValue - 1, dayValue);
  const month = new Intl.DateTimeFormat("en-GB", { month: "long" }).format(date);

  return `${dayValue} ${month}, ${yearValue}`;
}

function getMockReferenceTags(source: string) {
  const seed = source.length % referenceVideoTagSets.length;

  return [...referenceVideoTagSets[seed]];
}

function BriefFieldRow({
  children,
  field,
  onConfirm,
  onRegenerate,
}: {
  children: ReactNode;
  field: BriefField;
  onConfirm: (fieldId: BriefFieldId) => void;
  onRegenerate: (fieldId: BriefFieldId) => void;
}) {
  return (
    <div className="brief-field-row">
      <div className="brief-field-meta">
        <label className="label-s-semibold">{field.label}</label>
        <BriefFieldActions field={field} onConfirm={onConfirm} onRegenerate={onRegenerate} />
      </div>
      <div className="brief-field-control">{children}</div>
    </div>
  );
}

function BriefFieldActions({
  field,
  onConfirm,
  onRegenerate,
}: {
  field: BriefField;
  onConfirm: (fieldId: BriefFieldId) => void;
  onRegenerate: (fieldId: BriefFieldId) => void;
}) {
  const confidence = confidenceChipLabels[field.confidence];
  const canConfirm = field.confidence === "guess";

  return (
    <div className="brief-field-actions">
      {canConfirm ? (
        <button
          className={`brief-confidence-chip confidence-${confidence.state} label-xs-semibold`}
          type="button"
          title={confidence.helper}
          onClick={() => onConfirm(field.id)}
        >
          {confidence.label}
        </button>
      ) : (
        <span
          className={`brief-confidence-chip confidence-${confidence.state} label-xs-semibold`}
          title={confidence.helper}
        >
          {confidence.label}
        </span>
      )}
      <button
        className="brief-field-regenerate"
        type="button"
        aria-label={`Regenerate ${field.label}`}
        data-tooltip={`Regenerate ${field.label}`}
        onClick={() => onRegenerate(field.id)}
      >
        <DsIcon name="arrows-clockwise" size={15} />
      </button>
    </div>
  );
}

function BriefPlaceholderSection({ copy, stepLabel }: { copy: string; stepLabel: string }) {
  const titleId = `brief-${slugify(stepLabel)}-title`;

  return (
    <section className="brief-section-panel placeholder" aria-labelledby={titleId}>
      <BriefSectionHeader hideEyebrow title={stepLabel} titleId={titleId} copy={copy} />
      <div className="brief-coming-soon">
        <span className="brief-coming-soon-icon">
          <DsIcon name="clipboard-text" size={20} />
        </span>
        <div>
          <h3 className="heading-3xs">Coming soon</h3>
          <p className="paragraph-s">This section is a placeholder for the next Brief build.</p>
        </div>
      </div>
    </section>
  );
}

function BriefSummaryPage({
  fields,
  logline,
  missingFields,
  onConfirmField,
  onFieldChange,
  onGoToStep,
  onLoglineChange,
  onRegenerateField,
  onRegenerateLogline,
}: {
  fields: BriefFields;
  logline: Logline;
  missingFields: BriefField[];
  onConfirmField: (fieldId: BriefFieldId) => void;
  onFieldChange: (fieldId: BriefFieldId, value: string) => void;
  onGoToStep: (stepId: BriefStepId) => void;
  onLoglineChange: (value: string) => void;
  onRegenerateField: (fieldId: BriefFieldId) => void;
  onRegenerateLogline: () => void;
}) {
  const [editingFieldId, setEditingFieldId] = useState<BriefFieldId | "logline" | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [expandedProductionField, setExpandedProductionField] = useState<"liveFootage" | "voiceover" | null>(null);
  const [editingDeliverableCell, setEditingDeliverableCell] = useState<string | null>(null);
  const firstMissingStepId = missingFields[0] ? getStepIdForField(missingFields[0].id) : null;

  function regenerateSection(fieldIds: BriefFieldId[]) {
    fieldIds.forEach((fieldId) => onRegenerateField(fieldId));
  }

  function stopEditing() {
    setEditingFieldId(null);
  }

  function handleEditKeyDown(event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (event.key === "Enter" && event.currentTarget instanceof HTMLInputElement) {
      event.currentTarget.blur();
    }

    if (event.key === "Escape") {
      setEditingFieldId(null);
    }
  }

  return (
    <section className="brief-summary-page" aria-labelledby="brief-summary-title">
      <h2 id="brief-summary-title" className="sr-only">
        Brief Summary
      </h2>
      <BriefSummaryLogline
        isEditing={editingFieldId === "logline"}
        logline={logline}
        onChange={onLoglineChange}
        onEdit={() => setEditingFieldId("logline")}
        onKeyDown={handleEditKeyDown}
        onRegenerate={onRegenerateLogline}
        onStopEditing={stopEditing}
      />
      <div className="brief-summary-sections">
        <BriefSummaryContainer
          title="The basics"
          onDeepEdit={() => onGoToStep("basics")}
          onRegenerate={() => regenerateSection(["description", "videoType", "platform"])}
        >
          <BriefSummaryReadField field={fields.description} onConfirm={onConfirmField}>
            {editingFieldId === "description" ? (
              <textarea
                autoFocus
                className="brief-summary-inline-textarea label-s"
                value={fields.description.value}
                onBlur={stopEditing}
                onChange={(event) => onFieldChange("description", event.target.value)}
                onKeyDown={handleEditKeyDown}
              />
            ) : (
              <div className="brief-summary-description">
                <button
                  className={`brief-summary-description-text label-s ${isDescriptionExpanded ? "expanded" : ""}`}
                  type="button"
                  onClick={() => setEditingFieldId("description")}
                >
                  {fields.description.value || "— Not set —"}
                </button>
                {fields.description.value.length > 180 ? (
                  <button
                    className="brief-summary-show-more label-xs-semibold"
                    type="button"
                    onClick={() => setIsDescriptionExpanded((isExpanded) => !isExpanded)}
                  >
                    {isDescriptionExpanded ? "Show less" : "Show more"}
                  </button>
                ) : null}
              </div>
            )}
          </BriefSummaryReadField>
          <BriefSummaryReadField field={fields.videoType} onConfirm={onConfirmField}>
            <BriefVideoTypeMultiSelect
              value={fields.videoType.value}
              onChange={(value) => onFieldChange("videoType", value)}
            />
          </BriefSummaryReadField>
          <BriefSummaryReadField field={fields.platform} onConfirm={onConfirmField}>
            {editingFieldId === "platform" ? (
              <BriefDeliverablePlatformSelect
                value={fields.platform.value}
                onChange={(value) => {
                  onFieldChange("platform", value);
                  stopEditing();
                }}
              />
            ) : (
              <BriefSummaryValueButton value={fields.platform.value} onClick={() => setEditingFieldId("platform")} />
            )}
          </BriefSummaryReadField>
        </BriefSummaryContainer>

        <BriefSummaryContainer
          title="Purpose and audience"
          onDeepEdit={() => onGoToStep("purposeAudience")}
          onRegenerate={() => regenerateSection(["purpose", "audience", "callToAction"])}
        >
          <BriefSummaryPair
            editingFieldId={editingFieldId}
            field={fields.purpose}
            onChange={onFieldChange}
            onConfirm={onConfirmField}
            onEdit={setEditingFieldId}
            onKeyDown={handleEditKeyDown}
            onStopEditing={stopEditing}
          >
            <BriefPurposeSelect value={fields.purpose.value} onChange={(value) => onFieldChange("purpose", value)} />
          </BriefSummaryPair>
          <BriefSummaryPair
            editingFieldId={editingFieldId}
            field={fields.audience}
            onChange={onFieldChange}
            onConfirm={onConfirmField}
            onEdit={setEditingFieldId}
            onKeyDown={handleEditKeyDown}
            onStopEditing={stopEditing}
          />
          <BriefSummaryPair
            editingFieldId={editingFieldId}
            field={fields.callToAction}
            label="CTA"
            onChange={onFieldChange}
            onConfirm={onConfirmField}
            onEdit={setEditingFieldId}
            onKeyDown={handleEditKeyDown}
            onStopEditing={stopEditing}
          >
            <BriefCallToActionSelect
              value={fields.callToAction.value}
              onChange={(value) => onFieldChange("callToAction", value)}
            />
          </BriefSummaryPair>
        </BriefSummaryContainer>

        <BriefSummaryContainer
          title="Look and feel"
          onDeepEdit={() => onGoToStep("lookFeel")}
          onRegenerate={() => regenerateSection(["feeling", "referenceVideos", "brandKit"])}
        >
          <BriefSummaryReadField field={fields.feeling} onConfirm={onConfirmField}>
            {editingFieldId === "feeling" ? (
              <BriefMultiSelect
                ariaLabel="Tone options"
                options={briefToneOptions}
                value={fields.feeling.value}
                onChange={(value) => onFieldChange("feeling", value)}
              />
            ) : (
              <button className="brief-summary-chip-row" type="button" onClick={() => setEditingFieldId("feeling")}>
                {parseMultiSelectValue(fields.feeling.value).length > 0 ? (
                  parseMultiSelectValue(fields.feeling.value).map((tone) => (
                    <span className="brief-tone-chip selected label-s-semibold" key={tone}>
                      {tone}
                    </span>
                  ))
                ) : (
                  <BriefSummaryEmptyValue />
                )}
              </button>
            )}
          </BriefSummaryReadField>
          <BriefSummaryReadField field={fields.referenceVideos} onConfirm={onConfirmField}>
            <BriefReferenceVideosField
              value={fields.referenceVideos.value}
              onChange={(value) => onFieldChange("referenceVideos", value)}
            />
          </BriefSummaryReadField>
          <BriefSummaryReadField field={fields.brandKit} onConfirm={onConfirmField}>
            <BriefBrandKitPicker
              value={fields.brandKit.value}
              onChange={(value) => onFieldChange("brandKit", value)}
            />
          </BriefSummaryReadField>
        </BriefSummaryContainer>

        <BriefSummaryContainer
          title="Content and production"
          onDeepEdit={() => onGoToStep("contentProduction")}
          onRegenerate={() => regenerateSection(["liveFootage", "voiceover"])}
        >
          <BriefSummaryReadField field={fields.liveFootage} onConfirm={onConfirmField}>
            {expandedProductionField === "liveFootage" ? (
              <BriefLiveFootageToggle
                value={fields.liveFootage.value}
                onChange={(value) => onFieldChange("liveFootage", value)}
              />
            ) : (
              <BriefSummaryValueButton
                value={formatLiveFootageSummary(fields.liveFootage.value)}
                onClick={() => setExpandedProductionField("liveFootage")}
              />
            )}
          </BriefSummaryReadField>
          <BriefSummaryReadField field={fields.voiceover} onConfirm={onConfirmField}>
            {expandedProductionField === "voiceover" ? (
              <BriefVoiceoverControl
                value={fields.voiceover.value}
                onChange={(value) => onFieldChange("voiceover", value)}
              />
            ) : (
              <BriefSummaryValueButton
                value={formatVoiceoverSummary(fields.voiceover.value)}
                onClick={() => setExpandedProductionField("voiceover")}
              />
            )}
          </BriefSummaryReadField>
        </BriefSummaryContainer>

        <BriefSummaryContainer
          title="Deliverables and timing"
          onDeepEdit={() => onGoToStep("deliverablesTiming")}
          onRegenerate={() => regenerateSection(["deliverables"])}
        >
          <BriefSummaryReadField field={fields.deliverables} onConfirm={onConfirmField}>
            <BriefSummaryDeliverablesTable
              editingCell={editingDeliverableCell}
              fallbackDeadline={fields.deadline.value}
              onChange={(value) => onFieldChange("deliverables", value)}
              onEditCell={setEditingDeliverableCell}
              value={fields.deliverables.value}
            />
          </BriefSummaryReadField>
        </BriefSummaryContainer>
      </div>
      {missingFields.length > 0 ? (
        <div className="brief-summary-approval-note label-xs-semibold">
          {missingFields.length} fields still need attention.
          {firstMissingStepId ? (
            <button type="button" onClick={() => onGoToStep(firstMissingStepId)}>
              Jump to first missing
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function BriefSummaryLogline({
  isEditing,
  logline,
  onChange,
  onEdit,
  onKeyDown,
  onRegenerate,
  onStopEditing,
}: {
  isEditing: boolean;
  logline: Logline;
  onChange: (value: string) => void;
  onEdit: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onRegenerate: () => void;
  onStopEditing: () => void;
}) {
  const statusCopy = logline.status === "out_of_sync" ? "Out of sync" : logline.status === "synced" ? "Synced" : "";
  const displayValue = logline.text || "AI is writing your one-line pitch...";

  return (
    <section className="brief-summary-logline" aria-label="Logline">
      <div className="brief-summary-logline-top">
        <span className="label-xs-semibold">Logline</span>
        <span>
          {statusCopy ? <span className={`brief-logline-state label-xs-semibold ${logline.status}`}>{statusCopy}</span> : null}
          <button
            className="brief-field-regenerate"
            type="button"
            aria-label="Regenerate logline"
            data-tooltip="Regenerate logline"
            onClick={onRegenerate}
          >
            <DsIcon name="arrows-clockwise" size={15} />
          </button>
        </span>
      </div>
      {isEditing ? (
        <input
          autoFocus
          className="brief-summary-logline-input"
          value={logline.text}
          aria-label="Brief logline"
          onBlur={onStopEditing}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
        />
      ) : (
        <button className={`brief-summary-logline-value ${logline.text ? "" : "is-placeholder"}`} type="button" onClick={onEdit}>
          {displayValue}
        </button>
      )}
    </section>
  );
}

function BriefSummaryContainer({
  children,
  onDeepEdit,
  onRegenerate,
  title,
}: {
  children: ReactNode;
  onDeepEdit: () => void;
  onRegenerate: () => void;
  title: string;
}) {
  return (
    <section className="brief-summary-card" aria-labelledby={`summary-${slugify(title)}`}>
      <header className="brief-summary-card-header">
        <h3 id={`summary-${slugify(title)}`}>{title}</h3>
        <div className="brief-summary-card-actions">
          <button
            className="brief-field-regenerate"
            type="button"
            aria-label={`Regenerate ${title}`}
            data-tooltip={`Regenerate ${title}`}
            onClick={onRegenerate}
          >
            <DsIcon name="arrows-clockwise" size={15} />
          </button>
          <button
            className="brief-summary-edit-section"
            type="button"
            aria-label={`Edit ${title}`}
            data-tooltip={`Edit ${title}`}
            onClick={onDeepEdit}
          >
            <DsIcon name="pencil-simple" size={15} />
          </button>
        </div>
      </header>
      <div className="brief-summary-card-body">{children}</div>
    </section>
  );
}

function BriefSummaryReadField({
  children,
  field,
  label,
  onConfirm,
}: {
  children: ReactNode;
  field: BriefField;
  label?: string;
  onConfirm: (fieldId: BriefFieldId) => void;
}) {
  return (
    <div className="brief-summary-read-field">
      <div className="brief-summary-field-label">
        <span className="label-s-semibold">{label ?? field.label}</span>
        <BriefSummaryConfidenceChip field={field} onConfirm={onConfirm} />
      </div>
      {children}
    </div>
  );
}

function BriefSummaryConfidenceChip({
  field,
  onConfirm,
}: {
  field: BriefField;
  onConfirm: (fieldId: BriefFieldId) => void;
}) {
  const confidence = confidenceChipLabels[field.confidence];

  return field.confidence === "guess" ? (
    <button
      className={`brief-confidence-chip confidence-${confidence.state} label-xs-semibold`}
      type="button"
      title={confidence.helper}
      onClick={() => onConfirm(field.id)}
    >
      {confidence.label}
    </button>
  ) : (
    <span className={`brief-confidence-chip confidence-${confidence.state} label-xs-semibold`} title={confidence.helper}>
      {confidence.label}
    </span>
  );
}

function BriefSummaryPair({
  children,
  editingFieldId,
  field,
  label,
  onChange,
  onConfirm,
  onEdit,
  onKeyDown,
  onStopEditing,
}: {
  children?: ReactNode;
  editingFieldId: BriefFieldId | "logline" | null;
  field: BriefField;
  label?: string;
  onChange: (fieldId: BriefFieldId, value: string) => void;
  onConfirm: (fieldId: BriefFieldId) => void;
  onEdit: (fieldId: BriefFieldId) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onStopEditing: () => void;
}) {
  const isEditing = editingFieldId === field.id;

  return (
    <div className="brief-summary-pair">
      <div className="brief-summary-pair-label">
        <span className="label-s-semibold">{label ?? field.label}</span>
        <BriefSummaryConfidenceChip field={field} onConfirm={onConfirm} />
      </div>
      <div className="brief-summary-pair-value">
        {isEditing ? (
          children ?? (
            <input
              autoFocus
              className="brief-summary-inline-input label-s"
              value={field.value}
              onBlur={onStopEditing}
              onChange={(event) => onChange(field.id, event.target.value)}
              onKeyDown={onKeyDown}
            />
          )
        ) : (
          <BriefSummaryValueButton value={field.value} onClick={() => onEdit(field.id)} />
        )}
      </div>
    </div>
  );
}

function BriefSummaryValueButton({
  onClick,
  value,
}: {
  onClick: () => void;
  value: string;
}) {
  return value.trim() ? (
    <button className="brief-summary-value-button label-s" type="button" onClick={onClick}>
      {value}
    </button>
  ) : (
    <button className="brief-summary-empty-button label-s" type="button" onClick={onClick}>
      <BriefSummaryEmptyValue />
    </button>
  );
}

function BriefSummaryEmptyValue() {
  return (
    <span className="brief-summary-empty-value">
      — Not set — <span>+ Add</span>
    </span>
  );
}

function BriefSummaryDeliverablesTable({
  editingCell,
  fallbackDeadline,
  onChange,
  onEditCell,
  value,
}: {
  editingCell: string | null;
  fallbackDeadline: string;
  onChange: (value: string) => void;
  onEditCell: (cellId: string | null) => void;
  value: string;
}) {
  const rows = parseDeliverables(value, fallbackDeadline);

  function updateRows(nextRows: DeliverableRow[]) {
    onChange(serialiseDeliverables(nextRows));
  }

  function updateRow(rowId: string, updates: Partial<DeliverableRow>) {
    updateRows(rows.map((row) => (row.id === rowId ? { ...row, ...updates } : row)));
  }

  function addRow() {
    const previousRow = rows[rows.length - 1];
    const rowNames = ["Reels cutdown", "Square cut", "Shorts cut", "Paid social cut"];
    const nextName = rowNames[Math.max(0, rows.length - 1)] ?? `Version ${rows.length + 1}`;

    updateRows([...rows, createBlankDeliverableRow(nextName, previousRow?.deadline ?? fallbackDeadline)]);
  }

  return (
    <div className="brief-summary-deliverables">
      <table className="brief-deliverables-table brief-deliverables-table-summary">
        <thead>
          <tr>
            <BriefDeliverablesHeader title="Deliverable" />
            <BriefDeliverablesHeader title="Format" />
            <BriefDeliverablesHeader title="Duration" />
            <BriefDeliverablesHeader title="Captions" />
            <BriefDeliverablesHeader title="Deadline" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className={row.isMain ? "is-main" : ""} key={row.id}>
              <td>
                <span className="brief-deliverable-main-name label-s-semibold">{row.name}</span>
              </td>
              <td>
                {editingCell === `${row.id}:format` ? (
                  <BriefDeliverableFormatControl
                    row={row}
                    onChange={(updates) => {
                      updateRow(row.id, updates);
                      onEditCell(null);
                    }}
                  />
                ) : (
                  <button className="brief-summary-static-chip label-xs-semibold" type="button" onClick={() => onEditCell(`${row.id}:format`)}>
                    {row.format || "—"}
                  </button>
                )}
              </td>
              <td>
                {editingCell === `${row.id}:duration` ? (
                  <BriefDeliverableDurationControl
                    row={row}
                    onChange={(updates) => {
                      updateRow(row.id, updates);
                      onEditCell(null);
                    }}
                  />
                ) : (
                  <button className="brief-summary-static-chip label-xs-semibold" type="button" onClick={() => onEditCell(`${row.id}:duration`)}>
                    {row.duration || "—"}
                  </button>
                )}
              </td>
              <td>
                {editingCell === `${row.id}:captions` ? (
                  <BriefDeliverableCaptionsControl
                    row={row}
                    onChange={(updates) => updateRow(row.id, updates)}
                  />
                ) : (
                  <button
                    className="brief-summary-static-chip label-xs-semibold"
                    type="button"
                    aria-label={`Captions ${formatDeliverableCaptionSummary(row)}`}
                    onClick={() => onEditCell(`${row.id}:captions`)}
                  >
                    {formatDeliverableCaptionSummary(row)}
                  </button>
                )}
              </td>
              <td>
                <BriefDeliverableDeadlineControl
                  value={row.deadline}
                  onChange={(deadline) => updateRow(row.id, { deadline })}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="brief-add-version-button label-xs-semibold" type="button" onClick={addRow}>
        + Add version
      </button>
    </div>
  );
}

function formatLiveFootageSummary(value: string) {
  const [footageChoice, shooterChoice] = parseLiveFootageValue(value);

  return [footageChoice, footageChoice === "Shoot new" ? shooterChoice : ""].filter(Boolean).join(". ");
}

function formatVoiceoverSummary(value: string) {
  const [choice, sound, voice] = parseVoiceoverValue(value);

  if (choice !== "Yes") {
    return choice;
  }

  return [choice, sound, voice ? `${voice} (AI voice)` : ""].filter(Boolean).join(". ");
}

function getStepIdForField(fieldId: BriefFieldId): BriefStepId {
  if (fieldId === "purpose" || fieldId === "audience" || fieldId === "callToAction") {
    return "purposeAudience";
  }

  if (fieldId === "feeling" || fieldId === "referenceVideos" || fieldId === "brandKit") {
    return "lookFeel";
  }

  if (fieldId === "liveFootage" || fieldId === "voiceover") {
    return "contentProduction";
  }

  if (fieldId === "deliverables" || fieldId === "deadline") {
    return "deliverablesTiming";
  }

  return "basics";
}

function BriefSummaryPlaceholder({ copy, stepLabel }: { copy: string; stepLabel: string }) {
  return (
    <section className="brief-summary-placeholder">
      <div>
        <span className="brief-section-eyebrow label-xs-semibold">{stepLabel}</span>
        <p className="paragraph-s">{copy}</p>
      </div>
      <span className="brief-placeholder-pill label-xs-semibold">Coming soon</span>
    </section>
  );
}

function BriefApproveButton({
  disabled,
  onApprove,
}: {
  disabled: boolean;
  onApprove: () => void;
}) {
  return (
    <span
      className="brief-approve-wrap"
      data-tooltip={disabled ? "Fill in the missing fields to approve" : undefined}
    >
      <button
        className="brief-approve-button label-s-semibold"
        type="button"
        disabled={disabled}
        onClick={onApprove}
      >
        <DsIcon name="thumbs-up-like-fill" size={18} />
        Approve
      </button>
    </span>
  );
}

function cloneBriefFields(fields: BriefFields): BriefFields {
  return {
    workingTitle: { ...fields.workingTitle },
    videoType: { ...fields.videoType },
    platform: { ...fields.platform },
    description: { ...fields.description },
    purpose: { ...fields.purpose },
    audience: { ...fields.audience },
    feeling: { ...fields.feeling },
    referenceVideos: { ...fields.referenceVideos },
    brandKit: { ...fields.brandKit },
    liveFootage: { ...fields.liveFootage },
    voiceover: { ...fields.voiceover },
    callToAction: { ...fields.callToAction },
    deliverables: { ...fields.deliverables },
    deadline: { ...fields.deadline },
  };
}

function getDraftForPrompt(
  prompt: string,
  audienceAnswer = "",
  descriptionNotes = "",
  referenceVideoAttachments: InputAttachment[] = [],
): BriefDraft {
  const normalisedPrompt = prompt.toLowerCase();
  const matchedDraft = briefDraftOptions.find((option) =>
    option.keywords.some((keyword) => normalisedPrompt.includes(keyword)),
  );
  const draft = matchedDraft ? {
    logline: matchedDraft.draft.logline,
    fields: cloneBriefFields(matchedDraft.draft.fields),
  } : {
    logline: fallbackBriefDraft.logline,
    fields: cloneBriefFields(fallbackBriefDraft.fields),
  };

  if (audienceAnswer.trim()) {
    draft.fields.audience = {
      ...draft.fields.audience,
      value: audienceAnswer.trim(),
      confidence: "confident",
      source: "client_input",
    };
  }

  if (descriptionNotes.trim()) {
    draft.fields.description = {
      ...draft.fields.description,
      value: `${draft.fields.description.value}\n\nMust include or avoid: ${descriptionNotes.trim()}`,
      confidence: "confident",
      source: "client_input",
    };
  }

  const directToneMatches = briefToneOptions.filter((tone) => normalisedPrompt.includes(tone.toLowerCase()));

  if (directToneMatches.length > 0) {
    draft.fields.feeling = {
      ...draft.fields.feeling,
      value: directToneMatches.slice(0, 3).join(", "),
      confidence: "confident",
      source: "client_input",
    };
  }

  if (referenceVideoAttachments.length > 0) {
    draft.fields.referenceVideos = {
      ...draft.fields.referenceVideos,
      value: serialiseReferenceVideos(referenceVideoAttachments.slice(0, 5).map(createReferenceVideoFromAttachment)),
      confidence: "confident",
      source: "client_input",
    };
  }

  if (
    normalisedPrompt.includes("voiceover") ||
    normalisedPrompt.includes("voice over") ||
    normalisedPrompt.includes("narration") ||
    normalisedPrompt.includes("narrator")
  ) {
    draft.fields.voiceover = {
      ...draft.fields.voiceover,
      value: "Yes|Male voiceover|Alex",
      confidence: "guess",
      source: "ai_inferred",
    };
  }

  return draft;
}

function getClarifyingAudienceAnswer(messages: ChatMessage[]) {
  const clientMessages = messages.filter((message) => message.role === "client");

  return clientMessages[1]?.body.trim() ?? "";
}

function getClarifyingDescriptionNotes(messages: ChatMessage[]) {
  const clientMessages = messages.filter((message) => message.role === "client");

  return clientMessages[3]?.body.trim() ?? "";
}

function getReferenceVideoAttachments(messages: ChatMessage[]) {
  return messages
    .flatMap((message) => message.attachments ?? [])
    .filter((attachment) => attachment.kind === "reference_video");
}

function createRegeneratedField(fieldId: BriefFieldId, currentField: BriefField, draftField: BriefField): BriefField {
  const regenerationValues = fieldRegenerationValues[fieldId];
  const regeneratedValue =
    regenerationValues.find((value) => value !== currentField.value) ?? regenerationValues[0] ?? draftField.value;

  return {
    ...draftField,
    value: regeneratedValue,
    confidence: fieldId === "audience" ? "guess" : draftField.confidence,
    source: fieldId === "audience" ? "ai_inferred" : draftField.source,
  };
}

function createChatMessage(role: ChatMessage["role"], body: string, meta: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: `brief-${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    body,
    createdAt: role === "ai" ? "Brisk AI" : "Just now",
    ...meta,
  };
}

function createAttachmentFromPastedText(pastedText: string): InputAttachment | null {
  return createAttachmentsFromText(pastedText)[0] ?? null;
}

function createAttachmentsFromText(text: string): InputAttachment[] {
  const urls = extractUrls(text);

  return urls.map(createAttachmentFromUrl);
}

function createAttachmentFromUrl(url: string): InputAttachment {
  const videoHost = getRecognisedVideoHost(url);

  if (videoHost) {
    return {
      id: `brief-video-${Date.now()}`,
      kind: "reference_video",
      label: `${videoHost} reference`,
      source: url,
    };
  }

  return {
    id: `brief-link-${Date.now()}`,
    kind: "link",
    label: truncateAttachmentLabel(url),
    source: url,
  };
}

function getVideoHost(url: string) {
  return getRecognisedVideoHost(url) ?? "Video";
}

function getRecognisedVideoHost(url: string) {
  const normalisedUrl = url.toLowerCase();

  return normalisedUrl.includes("youtube.com") || normalisedUrl.includes("youtu.be")
    ? "YouTube"
    : normalisedUrl.includes("vimeo.com")
      ? "Vimeo"
      : normalisedUrl.includes("loom.com")
        ? "Loom"
        : null;
}

function createAttachmentsFromClipboard(clipboardData: DataTransfer): InputAttachment[] {
  return Array.from(clipboardData.files)
    .filter((file) => file.type.startsWith("image/"))
    .map(createAttachmentFromFile);
}

function createAttachmentFromFile(file: File): InputAttachment {
  const isImage = file.type.startsWith("image/");

  return {
    id: `brief-file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    kind: "document",
    label: file.name || (isImage ? "Pasted image" : "Uploaded document"),
    source: file.name || `mock-file-${Date.now()}`,
  };
}

function createMockAttachment(kind: InputAttachment["kind"], label: string): InputAttachment {
  return {
    id: `brief-${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    kind,
    label,
    source: `mock-${slugify(label)}-${Date.now()}`,
  };
}

function extractUrls(text: string) {
  return Array.from(new Set(text.match(/https?:\/\/[^\s]+/gi) ?? []));
}

function removeUrlsFromText(text: string) {
  return text.replace(/https?:\/\/[^\s]+/gi, "").replace(/\s+/g, " ").trim();
}

function truncateAttachmentLabel(value: string) {
  const cleanedValue = value.replace(/^https?:\/\//i, "");

  return cleanedValue.length > 34 ? `${cleanedValue.slice(0, 31)}...` : cleanedValue;
}

function isAcceptedLandingFile(file: File) {
  if (file.type.startsWith("image/")) {
    return true;
  }

  const acceptedExtensions = [".pdf", ".doc", ".docx", ".txt", ".md"];
  const lowerName = file.name.toLowerCase();

  return acceptedExtensions.some((extension) => lowerName.endsWith(extension));
}

function getAttachmentKey(attachment: InputAttachment) {
  return attachment.source || attachment.label;
}

function describeAttachmentsForPrompt(attachments: InputAttachment[]) {
  if (attachments.length === 0) {
    return "";
  }

  return attachments.map((attachment) => `${attachment.kind}: ${attachment.label} ${attachment.source}`).join(" ");
}

function createLoglineFromFields(fields: BriefFields) {
  const workingTitle = fields.workingTitle.value || "this video";
  const videoType = fields.videoType.value || "video";
  const description = fields.description.value || "turns source notes into a clear story";
  const trimmedDescription = description.length > 112 ? `${description.slice(0, 109).trim()}...` : description;

  return `${workingTitle} is a ${videoType.toLowerCase()} that ${trimmedDescription.charAt(0).toLowerCase()}${trimmedDescription.slice(1)}`;
}

function countWords(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return 0;
  }

  return trimmedValue.split(/\s+/).length;
}

function limitWords(value: string, maxWords: number) {
  const words = value.trim().split(/\s+/);

  if (!value.trim() || words.length <= maxWords) {
    return value;
  }

  return words.slice(0, maxWords).join(" ");
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function isPlaceholderStepId(
  stepId: BriefStepId,
): stepId is Exclude<BriefStepId, "basics" | "summary"> {
  return stepId !== "basics" && stepId !== "summary";
}
