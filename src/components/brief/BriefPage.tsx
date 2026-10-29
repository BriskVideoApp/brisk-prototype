"use client";

import Link from "next/link";
import { useBriskAi, useBriefAiState } from "@/components/ai/BriskAiContext";
import { usePrototypeViewer } from "@/components/prototype-state/usePrototypeViewer";
import { canViewProject, canActOnProject } from "@/data/prototype-access";

import { ConfirmationDialog } from "../../../Brisk DS/src/app/components/ConfirmationDialog";

import { useSearchSource } from "@/components/search/SearchContext";
import { useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import {
  createContext,
  useEffect,
  useContext,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { videoTypeIconMap } from "@/components/brief/videoTypeIcons";
import { BriskSelect } from "@/components/form/BriskSelect";
import { IconButton } from "../../../Brisk DS/src/app/components/IconButton";
import { DsIcon, type DsIconName } from "@/components/video-review/DsIcon";
import type { Project } from "@/components/active-videos/types";
import { ProjectStageHeader } from "@/components/project/ProjectStageHeader";
import { useProjectFlow } from "@/components/project/ProjectFlowContext";
import { useProjectStageStatus } from "@/components/project/ProjectStageStatusContext";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { useNotificationInbox } from "@/components/notifications/NotificationInboxContext";
import { useInvitations } from "@/components/invitations/InvitationContext";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { useStudioCompanyName } from "@/components/prototype-state/useStudioCompanyName";
import { ShareActionRow, type ShareAccess } from "@/components/share/ShareActionRow";
import type { SubmitDestination } from "@/data/submit-review";
import { getProjectStageHref } from "@/data/project-fixtures";
import {
  briefClarifyingQuestions,
  briefDraftOptions,
  briefFilmingContentOptions,
  briefFootageOptions,
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
  type BriefFilmingContentChoice,
  type BriefFootageChoice,
  type BriefStepId,
  type BriefVideoTypeDetail,
  type BriefVideoTypeId,
  type ChatMessage,
  type ConfidenceState,
  type InputAttachment,
  type Logline,
} from "@/data/brief";
import { productionFlowStages } from "@/data/production-flow";
import { getStudioBriefFieldOrder, type StudioBriefConfiguration } from "@/data/studio-onboard";
import { BriskDatePicker } from "@/components/form/BriskDatePicker";
import { formatBriefDate, parseBriefDateValue } from "@/lib/brief-dates";
import { useProjectTiming } from "@/components/project-timing/ProjectTimingContext";
import { BriefTimingSuggestion } from "@/components/project-timing/ProjectTimingNotice";

type BriefPageProps = {
  project: Project;
  briefConfiguration?: StudioBriefConfiguration;
  studioName?: string;
  approvalDestination?: string;
  initialFields?: BriefFields;
  onFieldsChange?: (fields: BriefFields) => void;
};

const BriefFieldOrderContext = createContext<readonly BriefFieldId[] | null>(null);

const briefStepFields: Partial<Record<BriefStepId, readonly BriefFieldId[]>> = {
  basics: ["workingTitle", "description"],
  videoType: ["videoType", "platform"],
  purposeAudience: ["purpose", "audience", "callToAction", "feeling"],
  similarVideos: ["referenceVideos"],
  brandKit: ["brandKit"],
  contentProduction: ["liveFootage", "voiceover"],
  deadline: ["deadline"],
  deliverablesTiming: ["deliverables"],
};

function getConfiguredBriefSteps(configuration: StudioBriefConfiguration | undefined, fields: BriefFields) {
  if (!configuration) return briefSteps;
  const order = getStudioBriefFieldOrder(configuration, fields);
  const included = new Set(order.filter((fieldId) => !configuration.excludedFieldIds.includes(fieldId)));
  const contentSteps = briefSteps.filter((step) => step.id !== "summary" && briefStepFields[step.id]?.some((fieldId) => included.has(fieldId)));
  contentSteps.sort((a, b) => {
    const firstA = Math.min(...(briefStepFields[a.id] ?? []).filter((id) => included.has(id)).map((id) => order.indexOf(id)));
    const firstB = Math.min(...(briefStepFields[b.id] ?? []).filter((id) => included.has(id)).map((id) => order.indexOf(id)));
    return firstA - firstB;
  });
  return [...contentSteps, briefSteps[briefSteps.length - 1]];
}

type BriefReviewAuditEntry = {
  id: string;
  action: "sent" | "reminded" | "updated";
  actor: string;
  company: string;
  recipients: string[];
  occurredAt: string;
  requestId?: string;
  fingerprint?: string;
  message?: string;
};

type BriefActionAuditEntry =
  | BriefReviewAuditEntry
  | { id: string; action: "approved" | "unapproved"; actor: string; occurredAt: string };

type BriefMode = "landing" | "steps";

type BriefAiSubmit = {
  prompt: string;
  attachments: InputAttachment[];
};

const maxBriefWords = 1000;
const landingIntroPlaceholder = "__landing_intro_placeholder__";
const summaryMissingSelector =
  ".brief-summary-page .brief-written-slot.is-missing, .brief-summary-page .brief-written-slot.is-guess, .brief-summary-page .brief-summary-static-chip.is-missing, .brief-summary-page .brief-summary-static-chip.is-guess";

const placeholderStepCopy: Record<Exclude<BriefStepId, "basics" | "summary">, string> = {
  videoType: "The video format, production category and primary platform will be shaped here.",
  purposeAudience: "Audience and viewer action will be shaped here.",
  similarVideos: "Reference videos and style examples will be shaped here.",
  brandKit: "Brand direction and styling rules will be shaped here.",
  contentProduction: "Talent, locations, assets and production notes will be shaped here.",
  deadline: "The main approval deadline will be confirmed here.",
  deliverablesTiming: "Outputs, formats and versions will be shaped here.",
};

type BriefSectionTone = "basics" | "purpose" | "look" | "production" | "deliverables" | "summary";

type BriefSectionIntroModel = {
  guidance?: string;
  required?: boolean;
  step: number;
  totalSteps?: number;
  title: string;
  tone: BriefSectionTone;
};

const briefSectionIntros: Record<BriefStepId, BriefSectionIntroModel> = {
  basics: {
    step: 1,
    title: "Description",
    tone: "basics",
  },
  videoType: {
    step: 2,
    title: "Video type and platform",
    tone: "basics",
  },
  purposeAudience: {
    step: 3,
    title: "Audience and action",
    tone: "purpose",
  },
  similarVideos: {
    step: 4,
    title: "Similar videos",
    tone: "look",
  },
  brandKit: {
    step: 5,
    title: "Brand kit",
    tone: "summary",
  },
  contentProduction: {
    step: 6,
    title: "Footage and filming",
    tone: "production",
  },
  deadline: {
    step: 7,
    title: "Deadline",
    tone: "deliverables",
  },
  deliverablesTiming: {
    step: 8,
    title: "Deliverables",
    tone: "deliverables",
  },
  summary: {
    step: 9,
    title: "Review your brief",
    tone: "summary",
  },
};

const briefGuidedExperienceIntros: Record<BriefStepId, BriefSectionIntroModel> = {
  basics: {
    ...briefSectionIntros.basics,
    guidance: "Describe the video in plain language.",
  },
  videoType: {
    ...briefSectionIntros.videoType,
    guidance: "Choose the type of video and where the main version will be used.",
  },
  purposeAudience: {
    ...briefSectionIntros.purposeAudience,
    guidance: "Tell us who the video is for and what they should do next.",
  },
  similarVideos: {
    ...briefSectionIntros.similarVideos,
    guidance: "Share any videos that show the style, pace or structure you have in mind.",
  },
  brandKit: {
    ...briefSectionIntros.brandKit,
    guidance: "Choose the brand kit the video should follow.",
  },
  contentProduction: {
    ...briefSectionIntros.contentProduction,
    guidance: "Tell us what will be filmed and what production support is needed.",
  },
  deadline: {
    ...briefSectionIntros.deadline,
    guidance: "Confirm when the main video needs to be approved.",
  },
  deliverablesTiming: {
    ...briefSectionIntros.deliverablesTiming,
    guidance: "Confirm the versions and formats you need.",
  },
  summary: {
    ...briefSectionIntros.summary,
  },
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
  "Something else",
] as const;

type ReferenceVideoCard = {
  id: string;
  title: string;
  source: string;
  duration: string;
  tags: string[];
};

type BrandKitOption = {
  colours: readonly string[];
  name: string;
  primaryFont: string;
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
    description: "Default production styling with clean typography, confident accents and flexible motion rules.",
    colours: ["#625DF5", "#F4F3FF", "#FF6BCE", "#1B1B1F"],
    primaryFont: "\"Plus Jakarta Sans\"",
    thumbnailLabel: "House",
  },
  {
    name: "Client kit - Nike",
    description: "A bold client kit with high-contrast marks, athletic pacing and sharp graphic treatments.",
    colours: ["#1B1B1F", "#FFFFFF", "#D7FF38", "#FF6BCE"],
    primaryFont: "\"Arial Black\", \"Helvetica Neue\"",
    thumbnailLabel: "Nike",
  },
  {
    name: "Minimal kit",
    description: "A stripped-back visual system for quiet launches, elegant edits and restrained brand presence.",
    colours: ["#111418", "#FFFFFF", "#F5F7FA", "#A8B3C0"],
    primaryFont: "Georgia",
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
  "Learn more",
  "Shop now",
  "Contact us",
  "Book now",
  "Sign up",
  "Get quote",
  "Download",
  "Subscribe",
  "Apply now",
  "Watch more",
  "Something else",
] as const;

const briefCallToActionIconMap: Record<(typeof briefCallToActionOptions)[number], DsIconName> = {
  "Learn more": "book-open",
  "Shop now": "cursor",
  "Contact us": "phone-call",
  "Book now": "calendar",
  "Sign up": "pencil-simple",
  "Get quote": "file-text",
  "Download": "download-simple",
  "Subscribe": "bell",
  "Apply now": "clipboard-text",
  "Watch more": "play",
  "Something else": "plus",
};

const briefCustomOptionLabel = "Add Custom";
const briefCustomCallToActionLabel = "Add custom CTA";

function isBriefCustomOption(option: string) {
  return option === "Something else" || option === "Custom/Other";
}

function getBriefCallToActionIcon(option: string): DsIconName {
  return briefCallToActionIconMap[option as (typeof briefCallToActionOptions)[number]] ?? "cursor";
}

function getBriefCallToActionDisplayLabel(option: string) {
  return isBriefCustomOption(option) ? briefCustomCallToActionLabel : option;
}

function getBriefOptionDisplayLabel(option: string) {
  return isBriefCustomOption(option) ? briefCustomOptionLabel : option;
}

function useBriefOutsidePointerClose<T extends HTMLElement>(
  isOpen: boolean,
  onClose: () => void,
) {
  const containerRef = useRef<T | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function closeOnPointerDown(event: PointerEvent) {
      const target = event.target;

      if (target instanceof Node && containerRef.current?.contains(target)) {
        return;
      }

      onClose();
    }

    document.addEventListener("pointerdown", closeOnPointerDown, true);

    return () => {
      document.removeEventListener("pointerdown", closeOnPointerDown, true);
    };
  }, [isOpen, onClose]);

  return containerRef;
}

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

const deliverableCaptionOptions: Array<{ label: DeliverableCaptionOption; helper: string }> = [
  {
    label: "SRT file",
    helper: "Separate file",
  },
  {
    label: "Baked in captions",
    helper: "In the video",
  },
  {
    label: "None",
    helper: "No captions",
  },
];

export type BriefConfigurableOption = {
  value: string;
  label: string;
  description?: string;
};

export function getBriefConfigurableOptions(
  fieldId: BriefFieldId,
): BriefConfigurableOption[] {
  if (fieldId === "videoType") {
    return briefVideoTypeDetails
      .map((videoType) => ({
        value: videoType.name,
        label: videoType.name,
        description: videoType.summary,
      }));
  }

  if (fieldId === "platform") {
    return deliverablePlatformGroups.flatMap((group) => group.options.map((option) => ({
      value: option,
      label: getBriefOptionDisplayLabel(option),
      description: group.label,
    })));
  }

  if (fieldId === "purpose") {
    return briefPurposeOptions.map((option) => {
      const [label, description] = option.split(" - ");
      return { value: option, label: isBriefCustomOption(option) ? briefCustomOptionLabel : label, description };
    });
  }

  if (fieldId === "callToAction") {
    return briefCallToActionOptions.map((option) => ({
      value: option,
      label: getBriefCallToActionDisplayLabel(option),
    }));
  }

  if (fieldId === "feeling") {
    return briefToneOptions.map((option) => ({ value: option, label: option }));
  }

  if (fieldId === "brandKit") {
    return brandKitOptions.map((option) => ({
      value: option.name,
      label: option.name,
      description: option.description,
    }));
  }

  return [];
}

export function BriefPage({ approvalDestination, briefConfiguration, initialFields, onFieldsChange, project, studioName: providedStudioName }: BriefPageProps) {
  const router = useRouter();
  const viewer = usePrototypeViewer();
  const { assistantName, registerBriefHandler, briefHandoff, consumeBriefHandoff } = useBriskAi();
  const searchParams = useSearchParams();
  const currentStudioName = useStudioCompanyName();
  const studioName = providedStudioName ?? currentStudioName;
  const { selectedRole } = usePrototypeRole();
  const { submitBriefTiming } = useProjectTiming();
  const { publishStageReviewFollowUp } = useNotificationInbox();
  const { openInvitePerson } = useInvitations();
  const { state, hasHydrated } = usePrototypeState();
  const { getProjectFlow } = useProjectFlow();
  const projectFlow = getProjectFlow(project);
  const { getProjectStages, setProjectStageStatus } = useProjectStageStatus();
  const briefStageStatus = getProjectStages(project).brief;
  const projectState = state.projects.find((candidate) => candidate.id === project.id);
  const projectClient = state.clients.find((candidate) => candidate.id === project.clientId);
  const clientRecipientNames = projectClient?.contacts
    .filter((contact) => (projectState?.clientMemberIds.includes(contact.id) ?? contact.projectIds.includes(project.id)) && contact.portalAccess !== "Paused")
    .map((contact) => contact.name) ?? [];
  const activeUser = state.users.find((user) => user.id === state.session.activeUserId);
  const initialBriefHasContent = Object.values(initialFields ?? initialBriefFields).some((field) => field.value.trim());
  const clientHasBriefToApprove = selectedRole === "Customer"
    && briefStageStatus.state === "waiting"
    && briefStageStatus.assignedTo === project.clientName
    && initialBriefHasContent;
  const briefActorName = selectedRole === "Customer"
    ? clientRecipientNames[0] ?? project.clientName
    : activeUser?.name ?? (selectedRole === "Studio Freelancer" ? "Filmmaker" : studioName);
  const auditStorageKey = `brisk-brief-action-audit-v1:${state.session.activeWorkspaceId}:${project.id}`;
  const isBriefApproved = briefStageStatus.state === "done";
  const [briefMode, setBriefMode] = useBriefAiState(project.id, "mode", () => clientHasBriefToApprove ? "steps" : "landing");
  const [activeStepId, setActiveStepId] = useBriefAiState(project.id, "step", () => clientHasBriefToApprove
    ? "summary"
    : getConfiguredBriefSteps(briefConfiguration, initialFields ?? initialBriefFields)[0].id);
  const [briefFields, setBriefFields] = useBriefAiState(project.id, "fields", () => cloneBriefFields(initialFields ?? initialBriefFields));
  const [searchFieldFocus, setSearchFieldFocus] = useState<BriefFieldId | null>(null);
  const revealSearchField = (fieldId: BriefFieldId) => {
    const step = Object.entries(briefStepFields).find(([, fieldIds]) => fieldIds?.includes(fieldId))?.[0] as BriefStepId | undefined;
    if (!step) return;
    setBriefMode("steps");
    setActiveStepId(step);
    setSearchFieldFocus(fieldId);
  };
  useEffect(() => {
    if (!searchFieldFocus || briefMode !== "steps") return;
    const target = document.querySelector<HTMLElement>(`[data-search-brief-field="${searchFieldFocus}"]`);
    if (!target) return;
    target.scrollIntoView({ block: "center" });
    target.classList.add("search-match-target");
    const timer = window.setTimeout(() => { target.classList.remove("search-match-target"); setSearchFieldFocus(null); }, 3000);
    return () => { window.clearTimeout(timer); target.classList.remove("search-match-target"); };
  }, [searchFieldFocus, activeStepId, briefMode]);

  const searchedField = searchParams.get("searchField");
  useEffect(() => {
    if (searchedField && searchedField in briefFields) revealSearchField(searchedField as BriefFieldId);
    // Search navigation reveals content; it does not edit or save answers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchedField, project.id]);
  useSearchSource({ label: "This Brief", replaceSource: `brief:${project.id}`, entries: Object.values(briefFields)
    .filter((field) => field.value.trim() && !briefConfiguration?.excludedFieldIds.includes(field.id))
    .map((field) => ({ id: `brief:${project.id}:${field.id}`, source: `brief:${project.id}`, kind: "Briefs" as const,
      title: field.label, text: field.value, meta: `${project.clientName} · ${project.name}`, projectId: project.id,
      href: `/projects/${project.id}/stages/brief?searchField=${field.id}`, onSelect: () => revealSearchField(field.id) })) });
  const mainDeliverable = parseDeliverables(briefFields.deliverables.value, briefFields.deadline.value)[0];
  const timingRequestedDate = mainDeliverable?.deadline || briefFields.deadline.value;
  const timingSuggestion = <BriefTimingSuggestion projectId={project.id} requestedDate={timingRequestedDate} />;
  const briefFieldsRef = useRef(briefFields);
  const summaryMissingActiveIndexRef = useRef(-1);
  const [logline, setLogline] = useBriefAiState(project.id, "logline", { text: "", status: "not_generated" });
  const [chatMessages, setChatMessages] = useBriefAiState(project.id, "messages", []);
  const [hasStartedClarifying, setHasStartedClarifying] = useBriefAiState(project.id, "started", false);
  const [clarifyingAnswerCount, setClarifyingAnswerCount] = useBriefAiState(project.id, "answerCount", 0);
  const [isDraftingBrief, setIsDraftingBrief] = useBriefAiState(project.id, "drafting", false);
  const [hasDraftedBrief, setHasDraftedBrief] = useBriefAiState(project.id, "drafted", false);
  const [sourcePrompt, setSourcePrompt] = useBriefAiState(project.id, "sourcePrompt", "");
  const [briefAudit, setBriefAudit] = useState<BriefActionAuditEntry[]>([]);
  const [briefShareAccess, setBriefShareAccess] = useState<ShareAccess>("viewOnly");
  const [isApprovalConfirmationOpen, setIsApprovalConfirmationOpen] = useState(false);
  const [isApprovalCelebrationVisible, setIsApprovalCelebrationVisible] = useState(false);
  const approvalNavigationTimeoutRef = useRef<number | null>(null);
  const configuredSteps = getConfiguredBriefSteps(briefConfiguration, initialFields ?? initialBriefFields);
  const activeStepIndex = configuredSteps.findIndex((step) => step.id === activeStepId);
  const activeStep = configuredSteps[activeStepIndex] ?? configuredSteps[0];
  const activeStepIntro = {
    ...briefSectionIntros[activeStepId],
    step: Math.max(activeStepIndex, 0) + 1,
    totalSteps: configuredSteps.length,
  };
  const nextStage = projectFlow.stages[projectFlow.stages.indexOf("brief") + 1] ?? "masters";
  const nextStageLabel = nextStage === "edit" && projectFlow.postProductionTerm === "animation"
    ? "Animation"
    : productionFlowStages[nextStage].label;
  const isSummaryStep = activeStepId === "summary";
  const summaryMissingCount = getSummaryMissingCount(briefFields, logline, studioName);
  const hasBriefContent = Object.values(briefFields).some((field) => field.value.trim());
  useEffect(() => {
    if (!clientHasBriefToApprove) return;
    setBriefMode("steps");
    setActiveStepId("summary");
  }, [clientHasBriefToApprove]);
  useEffect(() => {
    if (hasHydrated && isBriefApproved && !hasBriefContent) {
      setProjectStageStatus(project.id, "brief", { state: "in_progress", daysAgo: 0 });
    }
  }, [hasHydrated, hasBriefContent, isBriefApproved, project.id, setProjectStageStatus]);
  const lastBriefAudit = briefAudit[briefAudit.length - 1];
  const reviewCompany = briefStageStatus.assignedTo ?? (selectedRole === "Customer" || selectedRole === "Studio Freelancer" ? studioName : project.clientName);
  const latestReviewRequest = [...briefAudit].reverse().find((entry): entry is BriefReviewAuditEntry => entry.action === "sent" && entry.company === reviewCompany);
  const pendingReviewRequest = !isBriefApproved && briefStageStatus.assignedTo === reviewCompany ? latestReviewRequest : undefined;
  const reviewFollowUps = pendingReviewRequest
    ? briefAudit.filter((entry): entry is BriefReviewAuditEntry => (entry.action === "reminded" || entry.action === "updated") && entry.requestId === pendingReviewRequest.id)
    : [];
  const lastReviewContact = reviewFollowUps.at(-1) ?? pendingReviewRequest;
  const lastBriefSent = [...reviewFollowUps].reverse().find((entry) => entry.action === "updated") ?? pendingReviewRequest;
  const briefHasChangedSinceSend = Boolean(lastBriefSent?.fingerprint && lastBriefSent.fingerprint !== getBriefReviewFingerprint(briefFields, logline.text));

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(auditStorageKey);
      const parsed: unknown = stored ? JSON.parse(stored) : [];
      setBriefAudit(Array.isArray(parsed) ? parsed.filter(isBriefActionAuditEntry).map((entry) => entry.action === "sent" && !entry.fingerprint
        ? { ...entry, fingerprint: getBriefReviewFingerprint(briefFieldsRef.current, logline.text) }
        : entry) : []);
    } catch {
      setBriefAudit([]);
    }
  }, [auditStorageKey]);

  useEffect(() => {
    summaryMissingActiveIndexRef.current = -1;
  }, [summaryMissingCount]);

  useEffect(() => () => {
    if (approvalNavigationTimeoutRef.current !== null) {
      window.clearTimeout(approvalNavigationTimeoutRef.current);
    }
  }, []);

  function commitBriefFields(update: BriefFields | ((current: BriefFields) => BriefFields)) {
    const nextFields = typeof update === "function" ? update(briefFieldsRef.current) : update;
    if (isBriefApproved && Object.keys(nextFields).some((key) => {
      const fieldId = key as BriefFieldId;
      return nextFields[fieldId].value !== briefFieldsRef.current[fieldId].value;
    })) unapproveBrief();
    briefFieldsRef.current = nextFields;
    setBriefFields(nextFields);
    onFieldsChange?.(cloneBriefFields(nextFields));
  }

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
      authorLabel: "You",
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
      appendChatMessages([
        clientMessage,
        createChatMessage("ai", "That is enough to draft your brief.", { tone: "drafting" }),
      ]);
      return;
    }

    appendChatMessages([clientMessage]);
    appendAiMessage("Noted. I have added that context to the working brief.");
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
    const rewindIndex = chatMessages.findIndex((message) => message.id === messageId);
    if (rewindIndex < 0) return;
    const remainingMessages = chatMessages.slice(0, rewindIndex);
    const remainingClientMessages = remainingMessages.filter((message) => message.role === "client" && message.scope !== "project");
    setChatMessages(remainingMessages);
    setHasStartedClarifying(remainingClientMessages.length > 0);
    setClarifyingAnswerCount(Math.max(0, remainingClientMessages.length - 1));
    setHasDraftedBrief(false);
    setSourcePrompt(remainingClientMessages.map((message) => `${message.body} ${describeAttachmentsForPrompt(message.attachments ?? [])}`.trim()).join(" "));
  }

  function applyBriefDraft(draft: BriefDraft) {
    if (isBriefApproved && sentenceCase(draft.logline) !== logline.text
      && !Object.keys(draft.fields).some((key) => {
        const fieldId = key as BriefFieldId;
        return draft.fields[fieldId].value !== briefFieldsRef.current[fieldId].value;
      })) unapproveBrief();
    commitBriefFields(cloneBriefFields(draft.fields));
    setLogline({
      text: sentenceCase(draft.logline),
      status: "synced",
      lastRegeneratedAt: "Just now",
    });
  }

  function draftBriefFromPrompt(prompt: string, source: BriefMode, clientMessage?: ChatMessage) {
    if (isDraftingBrief) return;
    setIsDraftingBrief(true);
    setHasDraftedBrief(true);
    const draftMessages = [...chatMessages, ...(clientMessage ? [clientMessage] : [])].filter((message) => message.scope !== "project");
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
      setIsDraftingBrief(false);
    }, 1200);
  }

  function updateBriefField(fieldId: BriefFieldId, nextValue: string) {
    const value = fieldId === "description" ? limitWords(nextValue, maxBriefWords) : nextValue;
    const hasCompleteValue = fieldId === "liveFootage"
      ? isLiveFootageValueComplete(value)
      : Boolean(value.trim());

    commitBriefFields((currentFields) => ({
      ...currentFields,
      [fieldId]: {
        ...currentFields[fieldId],
        value,
        confidence: hasCompleteValue ? "confident" : "missing",
        source: hasCompleteValue ? "manual_edit" : "missing",
      },
    }));
    markLoglineOutOfSync();
  }

  function confirmBriefField(fieldId: BriefFieldId) {
    commitBriefFields((currentFields) => ({
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

    commitBriefFields((currentFields) => ({
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
    if (isBriefApproved && sentenceCase(createLoglineFromFields(briefFields)) !== logline.text) unapproveBrief();
    setLogline({
      text: sentenceCase(createLoglineFromFields(briefFields)),
      status: "synced",
      lastRegeneratedAt: "Just now",
    });
  }

  function updateLogline(nextText: string) {
    if (isBriefApproved && nextText !== logline.text) unapproveBrief();
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

  function recordBriefAudit(entry: BriefActionAuditEntry) {
    setBriefAudit((currentEntries) => {
      const nextEntries = [...currentEntries, entry];
      try {
        window.localStorage.setItem(auditStorageKey, JSON.stringify(nextEntries));
        window.setTimeout(() => window.dispatchEvent(new Event("brisk:brief-activity-updated")), 0);
      } catch {
        // The visible Brief controls still work when prototype audit storage is unavailable.
      }
      return nextEntries;
    });
  }

  function sendBrief(destination: SubmitDestination, message: string, notifiedPeople: readonly string[]) {
    const sendsToStudio = destination === "studio";
    const company = sendsToStudio ? studioName : project.clientName;
    const recipients = [...notifiedPeople];
    const occurredAt = new Date().toISOString();

    if (sendsToStudio) submitBriefTiming(project.id, timingRequestedDate, occurredAt);

    setProjectStageStatus(project.id, "brief", {
      state: "waiting",
      daysAgo: 0,
      assignedTo: company,
    });
    recordBriefAudit({
      id: `brief-send-${project.id}-${Date.now()}`,
      action: "sent",
      actor: briefActorName,
      company,
      recipients,
      occurredAt,
      fingerprint: getBriefReviewFingerprint(briefFieldsRef.current, logline.text),
      message,
    });
    if (recipients.length > 0) publishStageReviewFollowUp({
      projectId: project.id,
      projectName: project.name,
      stage: "brief",
      targetLabel: "Brief",
      actorName: briefActorName,
      recipientRole: sendsToStudio ? "Studio Staff" : "Customer",
      reviewers: recipients,
      href: `/projects/${project.id}/stages/brief`,
      message,
      kind: "request",
      occurredAt,
    });
  }

  function checkBriefClientAccess(destination: SubmitDestination, message: string, notifiedPeople: readonly string[]) {
    if (destination !== "customer") return true;

    const hasClientProjectAccess = Boolean(projectClient && projectState?.clientMemberIds.some((contactId) => {
      const contact = projectClient.contacts.find((candidate) => candidate.id === contactId);
      return contact && contact.portalAccess !== "Paused" && state.invitations.some((invitation) =>
        invitation.workspaceId === state.session.activeWorkspaceId
        && invitation.clientId === project.clientId
        && invitation.userId === contactId
        && invitation.projectIds.includes(project.id)
        && invitation.status !== "Expired");
    }));

    if (hasClientProjectAccess) return true;

    const contactToInvite = projectClient?.contacts.find((contact) => contact.id === projectClient.primaryContactId && contact.portalAccess !== "Paused")
      ?? projectClient?.contacts.find((contact) => contact.portalAccess !== "Paused");
    openInvitePerson({
      role: "Customer",
      clientId: project.clientId,
      projectId: project.id,
      purpose: "brief-send",
      ...(contactToInvite ? { name: contactToInvite.name, email: contactToInvite.email } : {}),
    }, (person) => {
      sendBrief("customer", message, [...new Set([...notifiedPeople, person.name])]);
    });
    return false;
  }

  function followUpBriefReview(action: "reminded" | "updated", message: string) {
    if (!pendingReviewRequest || !lastReviewContact || !lastBriefSent) return;
    const changed = lastBriefSent.fingerprint && lastBriefSent.fingerprint !== getBriefReviewFingerprint(briefFieldsRef.current, logline.text);
    if (action === "reminded" && changed) return;
    if (action === "updated" && !changed) return;

    const occurredAt = new Date().toISOString();
    recordBriefAudit({
      id: `brief-${action}-${project.id}-${Date.now()}`,
      action,
      actor: briefActorName,
      company: pendingReviewRequest.company,
      recipients: pendingReviewRequest.recipients,
      occurredAt,
      requestId: pendingReviewRequest.id,
      fingerprint: action === "updated" ? getBriefReviewFingerprint(briefFieldsRef.current, logline.text) : undefined,
      message: message.trim() || undefined,
    });
    publishStageReviewFollowUp({
      projectId: project.id,
      projectName: project.name,
      stage: "brief",
      targetLabel: "Brief",
      actorName: briefActorName,
      recipientRole: pendingReviewRequest.company === studioName ? "Studio Staff" : "Customer",
      reviewers: pendingReviewRequest.recipients,
      href: `/projects/${project.id}/stages/brief`,
      message: message.trim(),
      kind: action === "updated" ? "updated" : "reminder",
      occurredAt,
    });
  }

  function requestApproveBrief() {
    if (selectedRole === "Studio Freelancer" || isBriefApproved || !hasBriefContent) return;
    if (summaryMissingCount > 0) {
      setIsApprovalConfirmationOpen(true);
      return;
    }
    approveBrief();
  }

  function approveBrief() {
    if (selectedRole === "Studio Freelancer" || isBriefApproved || !hasBriefContent) return;
    const now = new Date();
    const approvedAt = formatBriefApprovalDate(now);
    setProjectStageStatus(project.id, "brief", {
      state: "done",
      daysAgo: 0,
      approvedAt,
      approvedBy: briefActorName,
    });
    recordBriefAudit({
      id: `brief-approval-${project.id}-${now.getTime()}`,
      action: "approved",
      actor: briefActorName,
      occurredAt: now.toISOString(),
    });
    if (selectedRole === "Customer") {
      const studioReviewers = state.users
        .filter((user) => user.workspaceId === state.session.activeWorkspaceId && user.role === "Studio Staff")
        .map((user) => user.name);
      if (studioReviewers.length) publishStageReviewFollowUp({
        projectId: project.id,
        projectName: project.name,
        stage: "brief",
        targetLabel: "Brief",
        actorName: briefActorName,
        recipientRole: "Studio Staff",
        reviewers: studioReviewers,
        href: `/projects/${project.id}/stages/brief`,
        message: `${briefActorName} approved the Brief.`,
        kind: "approved",
        occurredAt: now.toISOString(),
      });
    }
    setIsApprovalConfirmationOpen(false);
    if (approvalDestination) {
      router.push(withBriefApprovalToast(approvalDestination, "Tom"));
      return;
    }
    setIsApprovalCelebrationVisible(true);
    const celebrationDuration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 700 : 3800;
    approvalNavigationTimeoutRef.current = window.setTimeout(goToNextStageAfterApproval, celebrationDuration);
  }

  function goToNextStageAfterApproval() {
    if (approvalNavigationTimeoutRef.current !== null) {
      window.clearTimeout(approvalNavigationTimeoutRef.current);
      approvalNavigationTimeoutRef.current = null;
    }
    setIsApprovalCelebrationVisible(false);
    const nextStageHref = getProjectStageHref(project.id, nextStage);
    router.push(nextStage === "script" ? withBriefApprovalToast(nextStageHref, "Tom") : nextStageHref);
  }

  function unapproveBrief() {
    if (selectedRole === "Studio Freelancer" || !isBriefApproved) return;
    const now = new Date();
    setProjectStageStatus(project.id, "brief", {
      state: selectedRole === "Customer" ? "waiting" : "in_progress",
      daysAgo: 0,
    });
    recordBriefAudit({
      id: `brief-unapproval-${project.id}-${now.getTime()}`,
      action: "unapproved",
      actor: briefActorName,
      occurredAt: now.toISOString(),
    });
  }

  function goToRelativeStep(direction: -1 | 1) {
    const nextStep = configuredSteps[activeStepIndex + direction];

    if (nextStep) {
      setActiveStepId(nextStep.id);
    }
  }

  function enterStepFlow() {
    setBriefMode("steps");
    setActiveStepId(configuredSteps[0].id);
  }

  function skipAiAndFillManually() {
    if (chatMessages.length === 0) {
      setChatMessages([...initialChatMessages]);
    }

    enterStepFlow();
  }

  function resetToLanding() {
    setBriefMode("landing");
    setActiveStepId(configuredSteps[0].id);
    commitBriefFields(cloneBriefFields(initialFields ?? initialBriefFields));
    setLogline({ text: "", status: "not_generated" });
    setChatMessages([]);
    setHasStartedClarifying(false);
    setClarifyingAnswerCount(0);
    setHasDraftedBrief(false);
    setSourcePrompt("");
  }

  function jumpToStepFromLanding(stepId: BriefStepId) {
    if (chatMessages.length === 0) {
      setChatMessages([...initialChatMessages]);
    }

    setBriefMode("steps");
    setActiveStepId(stepId);
  }

  function jumpToSummaryMissing(direction: "previous" | "next") {
    const missingItems = Array.from(document.querySelectorAll<HTMLElement>(summaryMissingSelector));

    if (missingItems.length === 0) {
      return;
    }

    const currentIndex = summaryMissingActiveIndexRef.current;
    const nextIndex =
      currentIndex < 0
        ? direction === "next" ? 0 : missingItems.length - 1
        : direction === "next"
          ? (currentIndex + 1) % missingItems.length
          : (currentIndex - 1 + missingItems.length) % missingItems.length;
    const nextMissing = missingItems[nextIndex];
    summaryMissingActiveIndexRef.current = nextIndex;

    nextMissing.scrollIntoView({ behavior: "smooth", block: "center" });
    nextMissing.focus();
  }

  const canUseBriefAssistant = canViewProject(viewer, project, state)
    && (selectedRole !== "Studio Freelancer" || canActOnProject(viewer, project, state, "edit", "brief"));
  useEffect(() => {
    if (!canUseBriefAssistant) return;
    return registerBriefHandler({ projectId: project.id,
      submit: (prompt, attachments = []) => submitBriefPrompt({ prompt, attachments }, briefMode),
      draft: draftLandingBrief,
      reveal: () => { setBriefMode("steps"); setActiveStepId("summary"); },
    });
  });
  const consumedHandoffRef = useRef<number | null>(null);
  useEffect(() => {
    if (!canUseBriefAssistant || briefHandoff?.projectId !== project.id || consumedHandoffRef.current === briefHandoff.id) return;
    consumedHandoffRef.current = briefHandoff.id;
    consumeBriefHandoff();
    submitBriefPrompt({ prompt: briefHandoff.prompt, attachments: [] }, briefMode);
  });
  const briefActionsRow = (
    <ShareActionRow
      context="brief"
      userRole={selectedRole}
      density="compact"
      presentation={isSummaryStep ? "brief-summary" : "overflow"}
      briefControls
      allowProjectScope
      initialAccess={briefShareAccess}
      onAccessChange={setBriefShareAccess}
      initialLinkOpens="stageOnly"
      projectId={project.id}
      projectName={project.name}
      studioName={studioName}
      customerName={project.clientName}
      scopeType="stage"
      shareTitle="Brief"
      shareUrl={`/projects/${project.id}/stages/brief`}
      sendCompanyName={reviewCompany}
      sendMessageEnabled
      isWaitingOnReview={!isBriefApproved && briefStageStatus.state === "waiting" && Boolean(pendingReviewRequest)}
      waitingOnCompany={reviewCompany}
      pendingReviewDetails={pendingReviewRequest && lastReviewContact ? {
        requestedBy: pendingReviewRequest.actor,
        requestedAt: pendingReviewRequest.occurredAt,
        recipients: pendingReviewRequest.recipients,
        lastSentAt: lastReviewContact.occurredAt,
        lastSentKind: lastReviewContact.action === "reminded" ? "reminder" : lastReviewContact.action === "updated" ? "updated" : "request",
        hasChanged: briefHasChangedSinceSend,
        onSendReminder: (message) => followUpBriefReview("reminded", message),
        onSendUpdated: (message) => followUpBriefReview("updated", message),
      } : undefined}
      copyLinkIconOnly
      copyLinkLabel="Copy link"
      approveLabel="Approve Brief"
      approveDisabled={selectedRole === "Studio Freelancer" || !hasBriefContent}
      approveDisabledTooltip={selectedRole === "Studio Freelancer" ? "Only Studio Staff and Clients can approve this Brief" : "Add Brief details before approving"}
      approvedAt={briefStageStatus.approvedAt}
      approvedBy={briefStageStatus.approvedBy ?? briefActorName}
      isApproved={isBriefApproved}
      onSubmit={sendBrief}
      onBeforeSubmit={checkBriefClientAccess}
      onApprove={requestApproveBrief}
      onUnapprove={unapproveBrief}
    />
  );

  return (
    <main className="brief-shell">
      <div className="brief-main">
        {(briefMode === "landing" || (briefMode === "steps" && !isSummaryStep)) ? (
          <BriefGlobalActionsPortal>{briefActionsRow}</BriefGlobalActionsPortal>
        ) : null}
        <ProjectStageHeader
          activeStage="brief"
          project={project}
          showProjectShare={false}
        />
        {briefMode === "landing" ? (
          <BriefLandingScreen
            steps={configuredSteps}
            backHref={selectedRole === "Customer" ? "/customer-dashboard" : "/active-videos"}
            canDraft={clarifyingAnswerCount >= briefClarifyingQuestions.length && hasStartedClarifying && !hasDraftedBrief}
            messages={chatMessages}
            onDraft={draftLandingBrief}
            onRewind={rewindLandingConversation}
            onSelectStep={jumpToStepFromLanding}
            onSkip={skipAiAndFillManually}
            onSubmit={submitLandingPrompt}
            studioName={assistantName}
          />
        ) : (
          <BriefStepShell
            activeStepId={activeStepId}
            activeStepIndex={activeStepIndex}
            steps={configuredSteps}
            footerAction={
              isSummaryStep ? null : (
                <Button size="S" type="button" variant="primary" onClick={() => goToRelativeStep(1)}>
                  Next
                </Button>
              )
            }
            footerShare={isSummaryStep ? (
            <div className="brief-footer-share-layout">
                {lastBriefAudit ? <span
                  className="brief-action-audit label-xs"
                  role="status"
                  title={describeBriefAuditEntry(lastBriefAudit)}
                  aria-label={describeBriefAuditEntry(lastBriefAudit)}
                >
                  {summariseBriefAuditEntry(lastBriefAudit)}
                </span> : null}
                {briefActionsRow}
              </div>
            ) : lastBriefAudit ? (
              <span
                className="brief-action-audit label-xs"
                role="status"
                title={describeBriefAuditEntry(lastBriefAudit)}
                aria-label={describeBriefAuditEntry(lastBriefAudit)}
              >
                {summariseBriefAuditEntry(lastBriefAudit)}
              </span>
            ) : null}
            onBack={activeStepIndex > 0 ? () => goToRelativeStep(-1) : undefined}
            onStartWithAi={resetToLanding}
            onSelectStep={setActiveStepId}
          >
            <BriefFieldOrderContext.Provider value={briefConfiguration ? getStudioBriefFieldOrder(briefConfiguration, briefFields) : null}>
            {activeStepId === "basics" ? (
              <BriefBasicsSection
                intro={activeStepIntro}
                excludedFieldIds={briefConfiguration?.excludedFieldIds}
                fields={briefFields}
                onConfirmField={confirmBriefField}
                onFieldChange={updateBriefField}
                onRegenerateField={regenerateBriefField}
              />
            ) : null}
            {activeStepId === "videoType" ? (
              <BriefVideoTypeSection
                intro={activeStepIntro}
                excludedFieldIds={briefConfiguration?.excludedFieldIds}
                excludedOptionValues={briefConfiguration?.excludedOptionValues}
                fields={briefFields}
                onConfirmField={confirmBriefField}
                onFieldChange={updateBriefField}
                onRegenerateField={regenerateBriefField}
              />
            ) : null}
            {activeStepId === "purposeAudience" ? (
              <BriefPurposeAudienceSection
                intro={activeStepIntro}
                excludedFieldIds={briefConfiguration?.excludedFieldIds}
                excludedOptionValues={briefConfiguration?.excludedOptionValues}
                fields={briefFields}
                onConfirmField={confirmBriefField}
                onFieldChange={updateBriefField}
                onRegenerateField={regenerateBriefField}
              />
            ) : null}
            {activeStepId === "similarVideos" ? (
              <BriefSimilarVideosSection
                intro={activeStepIntro}
                excludedFieldIds={briefConfiguration?.excludedFieldIds}
                fields={briefFields}
                onConfirmField={confirmBriefField}
                onFieldChange={updateBriefField}
                onRegenerateField={regenerateBriefField}
              />
            ) : null}
            {activeStepId === "brandKit" ? (
              <BriefBrandKitSection
                intro={activeStepIntro}
                excludedFieldIds={briefConfiguration?.excludedFieldIds}
                excludedOptionValues={briefConfiguration?.excludedOptionValues}
                fields={briefFields}
                onConfirmField={confirmBriefField}
                onFieldChange={updateBriefField}
                onRegenerateField={regenerateBriefField}
              />
            ) : null}
            {activeStepId === "contentProduction" ? (
              <BriefContentProductionSection
                intro={activeStepIntro}
                excludedFieldIds={briefConfiguration?.excludedFieldIds}
                clientName={project.clientName}
                fields={briefFields}
                onConfirmField={confirmBriefField}
                onFieldChange={updateBriefField}
                onRegenerateField={regenerateBriefField}
                studioName={studioName}
              />
            ) : null}
            {activeStepId === "deadline" ? (
              <BriefDeadlineSection
                timingSuggestion={timingSuggestion}
                intro={activeStepIntro}
                excludedFieldIds={briefConfiguration?.excludedFieldIds}
                fields={briefFields}
                onConfirmField={confirmBriefField}
                onFieldChange={updateBriefField}
                onRegenerateField={regenerateBriefField}
              />
            ) : null}
            {activeStepId === "deliverablesTiming" ? (
              <BriefDeliverablesSection
                intro={activeStepIntro}
                excludedFieldIds={briefConfiguration?.excludedFieldIds}
                fields={briefFields}
                onConfirmField={confirmBriefField}
                onFieldChange={updateBriefField}
                onRegenerateField={regenerateBriefField}
              />
            ) : null}
            {activeStepId !== "basics" &&
            activeStepId !== "videoType" &&
            activeStepId !== "purposeAudience" &&
            activeStepId !== "similarVideos" &&
            activeStepId !== "brandKit" &&
            activeStepId !== "contentProduction" &&
            activeStepId !== "deadline" &&
            activeStepId !== "deliverablesTiming" &&
            activeStepId !== "summary" ? (
              <BriefPlaceholderSection stepLabel={activeStep.label} copy={placeholderStepCopy[activeStepId]} />
            ) : null}
            {activeStepId === "summary" ? (
              <BriefSummaryPage
                timingSuggestion={timingSuggestion}
                intro={activeStepIntro}
                fields={briefFields}
                logline={logline}
                summaryMissingCount={summaryMissingCount}
                onConfirmField={confirmBriefField}
                onCycleSummaryMissing={jumpToSummaryMissing}
                onFieldChange={updateBriefField}
                onGoToStep={setActiveStepId}
                studioName={studioName}
              />
            ) : null}
            </BriefFieldOrderContext.Provider>
          </BriefStepShell>
        )}
      </div>
      {isApprovalConfirmationOpen ? <BriefApprovalConfirmation
        missingCount={summaryMissingCount}
        onClose={() => setIsApprovalConfirmationOpen(false)}
        onApprove={approveBrief}
      /> : null}
      {isApprovalCelebrationVisible ? <BriefApprovalCelebration
        nextStageLabel={nextStageLabel}
        onContinue={goToNextStageAfterApproval}
      /> : null}
    </main>
  );
}

export function BriefGuidedExperience({
  clientName,
  doneLabel,
  excludedFieldIds = [],
  excludedOptionValues = {},
  fields,
  initialStepId = "basics",
  onDone,
  onEditFieldOptions,
  onFieldsChange,
  onToggleFieldExcluded,
  readOnly = false,
  studioName,
  videoTypeAction,
  videoTypeIds,
  videoTypeOptionIds,
}: {
  clientName?: string;
  doneLabel: string;
  excludedFieldIds?: readonly BriefFieldId[];
  excludedOptionValues?: Partial<Record<BriefFieldId, readonly string[]>>;
  fields: BriefFields;
  initialStepId?: BriefStepId;
  onDone: () => void;
  onEditFieldOptions?: (fieldId: BriefFieldId) => void;
  onFieldsChange?: (fields: BriefFields) => void;
  onToggleFieldExcluded?: (fieldId: BriefFieldId) => void;
  readOnly?: boolean;
  studioName: string;
  videoTypeAction?: ReactNode;
  videoTypeIds: readonly BriefVideoTypeId[];
  videoTypeOptionIds?: readonly BriefVideoTypeId[];
}) {
  const [activeStepId, setActiveStepId] = useState<BriefStepId>(initialStepId);
  const [logline, setLogline] = useState<Logline>({ text: "", status: "not_generated" });
  const activeStepIndex = briefSteps.findIndex((step) => step.id === activeStepId);
  const availableVideoTypeIds = videoTypeOptionIds ?? videoTypeIds;
  const videoTypeOptions = briefVideoTypeDetails.filter((videoType) => availableVideoTypeIds.includes(videoType.name));

  function updateField(fieldId: BriefFieldId, value: string) {
    if (readOnly || !onFieldsChange) {
      return;
    }
    const hasCompleteValue = fieldId === "liveFootage"
      ? isLiveFootageValueComplete(value)
      : Boolean(value.trim());

    onFieldsChange({
      ...fields,
      [fieldId]: {
        ...fields[fieldId],
        value,
        confidence: hasCompleteValue ? "confident" : "missing",
        source: hasCompleteValue ? "manual_edit" : "missing",
      },
    });
  }

  function confirmField(fieldId: BriefFieldId) {
    updateField(fieldId, fields[fieldId].value);
  }

  function regenerateField(fieldId: BriefFieldId) {
    const nextValue = fieldRegenerationValues[fieldId].find((value) => value.trim()) ?? fields[fieldId].value;
    updateField(fieldId, nextValue);
  }

  function goToRelativeStep(direction: -1 | 1) {
    const nextStep = briefSteps[activeStepIndex + direction];

    if (nextStep) {
      setActiveStepId(nextStep.id);
    }
  }

  return (
    <section className={`brief-guided-experience ${readOnly ? "read-only" : "editable"} ${onToggleFieldExcluded ? "exclusion-mode" : ""}`} aria-label="Client Brief">
      <div className="brief-guided-experience-stage">
        <div
          className="brief-guided-experience-content"
          aria-readonly={readOnly || undefined}
          inert={readOnly && (!onToggleFieldExcluded || activeStepId === "summary") ? true : undefined}
        >
          {activeStepId === "basics" ? (
            <BriefBasicsSection
              excludedFieldIds={excludedFieldIds}
              fields={fields}
              intro={briefGuidedExperienceIntros.basics}
              onToggleFieldExcluded={onToggleFieldExcluded}
              onConfirmField={confirmField}
              onFieldChange={updateField}
              onRegenerateField={regenerateField}
            />
          ) : null}
          {activeStepId === "videoType" ? (
            <BriefVideoTypeSection excludedFieldIds={excludedFieldIds} excludedOptionValues={excludedOptionValues} fields={fields} intro={briefGuidedExperienceIntros.videoType} onConfirmField={confirmField} onEditFieldOptions={onEditFieldOptions} onFieldChange={updateField} onRegenerateField={regenerateField} onToggleFieldExcluded={onToggleFieldExcluded} videoTypeAction={videoTypeAction} videoTypeOptions={videoTypeOptions} />
          ) : null}
          {activeStepId === "purposeAudience" ? (
            <BriefPurposeAudienceSection excludedFieldIds={excludedFieldIds} excludedOptionValues={excludedOptionValues} fields={fields} intro={briefGuidedExperienceIntros.purposeAudience} onConfirmField={confirmField} onEditFieldOptions={onEditFieldOptions} onFieldChange={updateField} onRegenerateField={regenerateField} onToggleFieldExcluded={onToggleFieldExcluded} />
          ) : null}
          {activeStepId === "similarVideos" ? (
            <BriefSimilarVideosSection excludedFieldIds={excludedFieldIds} fields={fields} intro={briefGuidedExperienceIntros.similarVideos} onConfirmField={confirmField} onFieldChange={updateField} onRegenerateField={regenerateField} onToggleFieldExcluded={onToggleFieldExcluded} />
          ) : null}
          {activeStepId === "brandKit" ? (
            <BriefBrandKitSection excludedFieldIds={excludedFieldIds} excludedOptionValues={excludedOptionValues} fields={fields} intro={briefGuidedExperienceIntros.brandKit} onConfirmField={confirmField} onEditFieldOptions={onEditFieldOptions} onFieldChange={updateField} onRegenerateField={regenerateField} onToggleFieldExcluded={onToggleFieldExcluded} />
          ) : null}
          {activeStepId === "contentProduction" ? (
            <BriefContentProductionSection clientName={clientName} excludedFieldIds={excludedFieldIds} fields={fields} intro={briefGuidedExperienceIntros.contentProduction} onConfirmField={confirmField} onFieldChange={updateField} onRegenerateField={regenerateField} onToggleFieldExcluded={onToggleFieldExcluded} studioName={studioName} />
          ) : null}
          {activeStepId === "deadline" ? (
            <BriefDeadlineSection excludedFieldIds={excludedFieldIds} fields={fields} intro={briefGuidedExperienceIntros.deadline} onConfirmField={confirmField} onFieldChange={updateField} onRegenerateField={regenerateField} onToggleFieldExcluded={onToggleFieldExcluded} />
          ) : null}
          {activeStepId === "deliverablesTiming" ? (
            <BriefDeliverablesSection excludedFieldIds={excludedFieldIds} fields={fields} intro={briefGuidedExperienceIntros.deliverablesTiming} onConfirmField={confirmField} onFieldChange={updateField} onRegenerateField={regenerateField} onToggleFieldExcluded={onToggleFieldExcluded} />
          ) : null}
          {activeStepId === "summary" ? (
            <BriefSummaryPage
              fields={fields}
              intro={briefGuidedExperienceIntros.summary}
              logline={logline}
              onConfirmField={confirmField}
              onFieldChange={updateField}
              onGoToStep={setActiveStepId}
              studioName={studioName}
            />
          ) : null}
        </div>
      </div>
      <footer className="brief-step-footer brief-guided-experience-footer">
        <div className="brief-step-footer-inner">
          <span className="brief-footer-side">
            {activeStepIndex > 0 ? <Button size="S" variant="secondary" onClick={() => goToRelativeStep(-1)}>Back</Button> : null}
          </span>
          <BriefStepDots activeStepIndex={activeStepIndex} showAi={false} onSelectStep={setActiveStepId} onStartWithAi={() => setActiveStepId("basics")} />
          <span className="brief-footer-side right">
            {activeStepId === "summary" ? (
              <Button className="brief-client-primary-action" size="S" variant="primary" onClick={onDone}>{doneLabel}</Button>
            ) : (
              <Button className="brief-client-primary-action" size="S" variant="primary" onClick={() => goToRelativeStep(1)}>Next</Button>
            )}
          </span>
        </div>
      </footer>
    </section>
  );
}

function BriefApprovalConfirmation({ missingCount, onClose, onApprove }: { missingCount: number; onClose: () => void; onApprove: () => void }) {
  const missingDetailsCopy = missingCount === 1
    ? "One detail is still missing. You can approve it now, but it will still need to be completed."
    : `${missingCount} details are still missing. You can approve it now, but they will still need to be completed.`;
  return <ConfirmationDialog title="Approve this Brief?" description={missingDetailsCopy} cancelLabel="Go back" confirmLabel="Approve anyway" onCancel={onClose} onConfirm={onApprove} />;
}

function BriefApprovalCelebration({
  nextStageLabel,
  onContinue,
}: {
  nextStageLabel: string;
  onContinue: () => void;
}) {
  return (
    <div className="brief-approval-celebration">
      <div className="brief-approval-confetti" aria-hidden="true">
        {Array.from({ length: 420 }, (_, index) => (
          <span
            key={index}
            style={{
              "--confetti-index": index,
              "--confetti-x": `${2 + (index * 37) % 96}%`,
              "--confetti-delay": `${(index % 32) * 15}ms`,
              "--confetti-duration": `${2600 + (index % 6) * 150}ms`,
              "--confetti-drift": (index * 29) % 31 - 15,
            } as CSSProperties}
          />
        ))}
      </div>
      <section
        className="brief-approval-celebration-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="brief-approval-celebration-title"
        aria-describedby="brief-approval-celebration-description"
      >
        <span className="brief-approval-celebration-icon" aria-hidden="true">
          <DsIcon name="check" size={28} />
        </span>
        <span className="label-xs-semibold brief-approval-celebration-kicker">BRIEF APPROVED</span>
        <h2 className="headings-m-bold" id="brief-approval-celebration-title">On to {nextStageLabel}</h2>
        <p className="paragraph-s" id="brief-approval-celebration-description">
          Your Brief is approved. Taking you to the next Stage.
        </p>
        <Button size="S" type="button" variant="primary" onClick={onContinue}>
          Continue to {nextStageLabel}
        </Button>
      </section>
    </div>
  );
}

function isBriefActionAuditEntry(value: unknown): value is BriefActionAuditEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  if (typeof entry.id !== "string" || typeof entry.actor !== "string" || typeof entry.occurredAt !== "string") return false;
  if (entry.action === "approved") return true;
  if (entry.action === "unapproved") return true;
  return ["sent", "reminded", "updated"].includes(String(entry.action))
    && typeof entry.company === "string"
    && Array.isArray(entry.recipients)
    && entry.recipients.every((recipient) => typeof recipient === "string")
    && (entry.action === "sent" || typeof entry.requestId === "string")
    && (entry.fingerprint === undefined || typeof entry.fingerprint === "string")
    && (entry.message === undefined || typeof entry.message === "string");
}

function getBriefReviewFingerprint(fields: BriefFields, logline: string) {
  return JSON.stringify({ fields, logline });
}

function formatBriefAuditDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function describeBriefAuditEntry(entry: BriefActionAuditEntry) {
  const date = formatBriefAuditDate(entry.occurredAt);
  if (entry.action === "sent") {
    return `${entry.actor} submitted the Brief to ${entry.company} at ${date}. ${entry.recipients.length ? `Notified ${entry.recipients.join(", ")}.` : "No one was directly notified."}`;
  }
  if (entry.action === "reminded") {
    return `${entry.actor} reminded ${entry.company} to review the Brief at ${date}.${entry.message ? ` Message: ${entry.message}` : ""}`;
  }
  if (entry.action === "updated") {
    return `${entry.actor} sent the updated Brief to ${entry.company} at ${date}.${entry.message ? ` Message: ${entry.message}` : ""}`;
  }

  return entry.action === "approved"
    ? `Approved by ${entry.actor} at ${date}.`
    : `Brief approval removed by ${entry.actor} at ${date}.`;
}

function summariseBriefAuditEntry(entry: BriefActionAuditEntry) {
  const date = formatBriefAuditDate(entry.occurredAt);
  if (entry.action === "sent") {
    return `${entry.actor} submitted Brief to ${entry.company} · ${date}`;
  }
  if (entry.action === "reminded") {
    return `${entry.actor} reminded ${entry.company} to review the Brief · ${date}`;
  }
  if (entry.action === "updated") {
    return `${entry.actor} sent the updated Brief to ${entry.company} · ${date}`;
  }

  return entry.action === "approved"
    ? `Approved by ${entry.actor} · ${date}`
    : `Approval removed by ${entry.actor} · ${date}`;
}

function BriefStepShell({
  activeStepId,
  activeStepIndex,
  steps,
  children,
  footerAction,
  footerShare,
  footerNotice,
  onBack,
  onStartWithAi,
  onSelectStep,
}: {
  activeStepId: BriefStepId;
  activeStepIndex: number;
  steps: typeof briefSteps;
  children: ReactNode;
  footerAction: ReactNode;
  footerShare: ReactNode;
  footerNotice?: ReactNode;
  onBack?: () => void;
  onStartWithAi: () => void;
  onSelectStep: (stepId: BriefStepId) => void;
}) {
  return (
    <>
      <section className={`brief-stage-area brief-step-${activeStepId}`} aria-label="Brief step">
        <div className="brief-workspace">
          {children}
        </div>
      </section>
      <footer className={`brief-step-footer${footerNotice ? " has-summary-note" : ""}`}>
        <div className="brief-step-footer-inner">
          <span className="brief-footer-side">
            {onBack ? (
              <Button size="S" type="button" variant="secondary" onClick={onBack}>
                Back
              </Button>
            ) : null}
          </span>
          <BriefStepDots activeStepIndex={activeStepIndex} steps={steps} onSelectStep={onSelectStep} onStartWithAi={onStartWithAi} />
          <span className="brief-footer-side right">
            {footerNotice}
            {footerAction}
          </span>
        </div>
        {footerShare ? <div className="brief-step-footer-share">{footerShare}</div> : null}
      </footer>
    </>
  );
}

function BriefGlobalActionsPortal({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const findTarget = () => {
      const nextTarget = document.querySelector<HTMLElement>("[data-brief-global-actions-slot]");
      setTarget((current) => current === nextTarget ? current : nextTarget);
    };
    findTarget();
    const observer = new MutationObserver(findTarget);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return target ? createPortal(children, target) : null;
}

function BriefStepDots({
  activeStepIndex,
  steps = briefSteps,
  onSelectStep,
  onStartWithAi,
  showAi = true,
}: {
  activeStepIndex: number | null;
  steps?: typeof briefSteps;
  onSelectStep: (stepId: BriefStepId) => void;
  onStartWithAi: () => void;
  showAi?: boolean;
}) {
  return (
    <nav className="brief-step-dots" aria-label="Brief steps">
      {showAi ? (
        <button
          className={`brief-step-dot brief-step-dot-ai label-xs-semibold ${activeStepIndex === null ? "active" : ""}`}
          type="button"
          aria-current={activeStepIndex === null ? "step" : undefined}
          data-tooltip="Start with AI"
          onClick={onStartWithAi}
        >
          <DsIcon name="sparkle" size={14} />
          <span className="sr-only">Start with AI</span>
        </button>
      ) : null}
      {steps.map((step, index) => (
        <button
          className={`brief-step-dot label-xs-semibold ${index === activeStepIndex ? "active" : ""} ${
            activeStepIndex !== null && index < activeStepIndex ? "complete" : ""
          } ${step.id === "summary" ? "summary" : ""}`}
          key={step.id}
          type="button"
          aria-current={index === activeStepIndex ? "step" : undefined}
          data-tooltip={`${index + 1}. ${step.label}`}
          onClick={() => onSelectStep(step.id)}
        >
          {step.id === "summary" ? step.shortLabel : index + 1}
        </button>
      ))}
    </nav>
  );
}

function BriefLandingScreen({
  backHref,
  canDraft,
  steps,
  messages,
  onDraft,
  onRewind,
  onSelectStep,
  onSkip,
  onSubmit,
  studioName,
}: {
  backHref: string;
  canDraft: boolean;
  steps: typeof briefSteps;
  messages: ChatMessage[];
  onDraft: () => void;
  onRewind: (messageId: string) => void;
  onSelectStep: (stepId: BriefStepId) => void;
  onSkip: () => void;
  onSubmit: (submission: BriefAiSubmit) => void;
  studioName: string;
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
      if (canDraft) {
        onDraft();
        return;
      }

      if (canSendMessage) {
        submitLandingPrompt();
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
      window.location.href = backHref;
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
        {isClarifying ? (
          <h1 className="is-hidden" id="brief-landing-title">
            What video are we making?
          </h1>
        ) : (
          <div className="brief-landing-intro">
            <h1 id="brief-landing-title">What video are we making?</h1>
            <p className="brief-landing-guidance paragraph-s">
              {studioName} will ask a few questions, then draft your Brief for you to review.
            </p>
          </div>
        )}
        {isClarifying ? (
          <BriefClarifyingThread messages={messages} onDeleteMessage={deleteMessage} onEditMessage={editMessage} studioName={studioName} />
        ) : null}
        <BriefRichInput
          attachments={attachments}
          landingActions={
            isClarifying ? (
              <Button size="S" variant="primary"
                className="brief-landing-next"
                type="button"
                disabled={!canUseFooterContinue}
                onClick={handleFooterContinue}
              >
                {canDraft ? "OK, draft my brief" : "Continue"}
              </Button>
            ) : (
              <>
                <Button size="S" variant="ghost" className="brief-landing-skip" type="button" onClick={onSkip}>
                  Fill manually
                </Button>
                <Button size="S" variant="primary"
                  className="brief-landing-next"
                  type="button"
                  disabled={!canUseFooterContinue}
                  onClick={handleFooterContinue}
                >
                  Continue
                </Button>
              </>
            )
          }
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
        <Button size="S" variant="ghost" className="brief-landing-back" type="button" onClick={handleBack}>
          Back
        </Button>
        <div className="brief-landing-footer-centre">
          <BriefStepDots activeStepIndex={null} steps={steps} onSelectStep={onSelectStep} onStartWithAi={() => undefined} />
        </div>
        <span aria-hidden="true" />
      </footer>
    </section>
  );
}

function BriefClarifyingThread({
  messages,
  onDeleteMessage,
  onEditMessage,
  studioName,
}: {
  messages: ChatMessage[];
  onDeleteMessage: (message: ChatMessage) => void;
  onEditMessage: (message: ChatMessage) => void;
  studioName: string;
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
                  {message.role === "ai" ? studioName : message.authorLabel ?? "Client"}
                </span>
              ) : (
                <span aria-hidden="true" />
              )}
              {message.role === "client" ? (
                <div className="brief-message-menu-wrap">
                  <BriskSelect mode="action" value="" clearable={false} ariaLabel="Message options" placeholder="Message options" actionMenuSize="compact"
                    open={openMenuMessageId === message.id} onOpenChange={(open) => setOpenMenuMessageId((current) => open ? message.id : current === message.id ? null : current)}
                    options={[{value: "edit", label: "Edit"}, {value: "delete", label: "Delete", tone: "danger", dividerAbove: true}]}
                    actionFallbackFocus={(trigger) => trigger?.closest('.brief-clarifying-thread')?.parentElement?.querySelector<HTMLTextAreaElement>('textarea') ?? null}
                    onChange={(value) => { if (value === "edit") onEditMessage(message); else if (value === "delete") onDeleteMessage(message); }}
                    actionTrigger={(props) => <IconButton {...props} aria-label="Message options" tooltipAlign="end"><DsIcon name="dots-three" size={16} /></IconButton>}
                  />
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
            {message.sources?.map((source) => <Link className="label-xs-semibold" key={source.href} href={source.href}>{source.label}</Link>)}
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

function BriefRichInput({
  attachments,
  landingActions,
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
  landingActions?: ReactNode;
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
          aria-label={variant === "landing" ? "Describe the video brief" : "Message studio assistant"}
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
              A 2-minute investor launch film...
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
      </div>
      {variant === "landing" ? (
        <div className="brief-composer-underbar">
          <div className="brief-composer-tools" aria-label="Attachment tools">
            <button
              className="brief-composer-tool"
              type="button"
              aria-label="Record a brief"
              data-tooltip="Recording is not available in this prototype"
              title="Recording is not available in this prototype. Type your brief or upload a document instead."
              disabled
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
          {landingActions ? <div className="brief-landing-composer-actions">{landingActions}</div> : null}
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
            <Button size="S" variant="secondary"
              className="brief-toolbar-button"
              type="button"
              onClick={() => addMockDocument("Uploaded brief notes")}
            >
              <DsIcon name="upload-simple" size={14} />
              Upload
            </Button>
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
            <Button size="S" variant="primary"
              className="brief-ai-send-button"
              type="button"
              disabled={!canSubmit}
              onClick={onSubmit}
            >
              <DsIcon name="paper-plane-tilt" size={14} />
              Send
            </Button>
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

type BriefFieldExclusionProps = {
  excludedFieldIds?: readonly BriefFieldId[];
  excludedOptionValues?: Partial<Record<BriefFieldId, readonly string[]>>;
  onEditFieldOptions?: (fieldId: BriefFieldId) => void;
  onToggleFieldExcluded?: (fieldId: BriefFieldId) => void;
};

function BriefBasicsSection({
  excludedFieldIds = [],
  fields,
  intro = briefSectionIntros.basics,
  onConfirmField,
  onFieldChange,
  onRegenerateField,
  onToggleFieldExcluded,
  summaryMode = false,
}: {
  fields: BriefFields;
  intro?: BriefSectionIntroModel;
  onConfirmField: (fieldId: BriefFieldId) => void;
  onFieldChange: (fieldId: BriefFieldId, value: string) => void;
  onRegenerateField: (fieldId: BriefFieldId) => void;
  summaryMode?: boolean;
} & BriefFieldExclusionProps) {
  return (
    <section
      className={`brief-section-panel ${summaryMode ? "summary-mode" : ""}`}
      aria-label={summaryMode ? undefined : "The basics"}
      aria-labelledby={summaryMode ? "brief-basics-title" : "brief-basics-step-title"}
    >
      {summaryMode ? (
        <BriefSectionHeader
          hideCopy
          hideEyebrow
          titleId="brief-basics-title"
          title="Description"
        />
      ) : (
        <BriefSectionIntro
          intro={intro}
          titleId="brief-basics-step-title"
        />
      )}
      <div className="brief-field-list">
        <BriefFieldRow excludedFieldIds={excludedFieldIds} field={fields.description} onConfirm={onConfirmField} onRegenerate={onRegenerateField} onToggleFieldExcluded={onToggleFieldExcluded}>
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
      </div>
    </section>
  );
}

function BriefVideoTypeSection({
  excludedFieldIds = [],
  excludedOptionValues = {},
  fields,
  intro = briefSectionIntros.videoType,
  onConfirmField,
  onFieldChange,
  onRegenerateField,
  onEditFieldOptions,
  onToggleFieldExcluded,
  summaryMode = false,
  videoTypeAction,
  videoTypeOptions = briefVideoTypeDetails,
}: {
  fields: BriefFields;
  intro?: BriefSectionIntroModel;
  onConfirmField: (fieldId: BriefFieldId) => void;
  onFieldChange: (fieldId: BriefFieldId, value: string) => void;
  onRegenerateField: (fieldId: BriefFieldId) => void;
  summaryMode?: boolean;
  videoTypeAction?: ReactNode;
  videoTypeOptions?: readonly BriefVideoTypeDetail[];
} & BriefFieldExclusionProps) {
  return (
    <section
      className={`brief-section-panel ${summaryMode ? "summary-mode" : ""}`}
      aria-label={summaryMode ? undefined : "Video type and platform"}
      aria-labelledby={summaryMode ? "brief-video-type-title" : "brief-video-type-step-title"}
    >
      {summaryMode ? (
        <BriefSectionHeader
          hideCopy
          hideEyebrow
          titleId="brief-video-type-title"
          title="Video type and platform"
        />
      ) : (
        <BriefSectionIntro
          intro={intro}
          titleId="brief-video-type-step-title"
        />
      )}
      <div className="brief-field-list">
        <BriefFieldRow
          canEditOptions
          excludedFieldIds={excludedFieldIds}
          field={fields.videoType}
          metaAction={videoTypeAction}
          onConfirm={onConfirmField}
          onEditFieldOptions={onEditFieldOptions}
          onRegenerate={onRegenerateField}
          onToggleFieldExcluded={onToggleFieldExcluded}
        >
          <BriefVideoTypeMultiSelect
            options={videoTypeOptions.filter((option) => !excludedOptionValues.videoType?.includes(option.name))}
            value={fields.videoType.value}
            onChange={(value) => onFieldChange("videoType", value)}
          />
        </BriefFieldRow>
        <BriefFieldRow canEditOptions excludedFieldIds={excludedFieldIds} field={fields.platform} onConfirm={onConfirmField} onEditFieldOptions={onEditFieldOptions} onRegenerate={onRegenerateField} onToggleFieldExcluded={onToggleFieldExcluded}>
          <BriefDeliverablePlatformSelect
            excludedOptions={excludedOptionValues.platform}
            selectedCard
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

function BriefSectionIntro({
  intro,
  titleId,
}: {
  intro: BriefSectionIntroModel;
  titleId?: string;
}) {
  const totalSteps = intro.totalSteps ?? briefSteps.length;
  return (
    <header className={`brief-section-intro tone-${intro.tone}`}>
      <span className="brief-section-intro-accent" aria-hidden="true" />
      <div className="brief-section-intro-main">
        <div className="brief-section-intro-copy">
          <div className="brief-section-step-row">
            <span className="brief-section-step-chip label-xs-semibold">
              {intro.step === totalSteps ? "Summary" : `Step ${intro.step} of ${totalSteps}`}
            </span>
            {intro.required === false ? <span className="brief-section-optional label-xs-semibold">Optional</span> : null}
          </div>
          <h2 id={titleId}>{intro.title}</h2>
          {intro.guidance ? <p className="brief-section-guidance paragraph-s">{intro.guidance}</p> : null}
        </div>
      </div>
    </header>
  );
}

function BriefPurposeAudienceSection({
  excludedFieldIds = [],
  excludedOptionValues = {},
  fields,
  intro = briefSectionIntros.purposeAudience,
  onConfirmField,
  onFieldChange,
  onRegenerateField,
  onEditFieldOptions,
  onToggleFieldExcluded,
  summaryMode = false,
}: {
  fields: BriefFields;
  intro?: BriefSectionIntroModel;
  onConfirmField: (fieldId: BriefFieldId) => void;
  onFieldChange: (fieldId: BriefFieldId, value: string) => void;
  onRegenerateField: (fieldId: BriefFieldId) => void;
  summaryMode?: boolean;
} & BriefFieldExclusionProps) {
  return (
    <section
      className={`brief-section-panel ${summaryMode ? "summary-mode" : ""}`}
      aria-label={summaryMode ? undefined : "Audience and action"}
      aria-labelledby={summaryMode ? "brief-purpose-audience-title" : "brief-purpose-audience-step-title"}
    >
      {summaryMode ? (
        <BriefSectionHeader
          hideCopy
          hideEyebrow
          titleId="brief-purpose-audience-title"
          title="Audience and action"
        />
      ) : (
        <BriefSectionIntro
          intro={intro}
          titleId="brief-purpose-audience-step-title"
        />
      )}
      <div className="brief-field-list">
        <BriefFieldRow excludedFieldIds={excludedFieldIds} field={fields.audience} onConfirm={onConfirmField} onRegenerate={onRegenerateField} onToggleFieldExcluded={onToggleFieldExcluded}>
          <BriefAudienceList
            value={fields.audience.value}
            onChange={(value) => onFieldChange("audience", value)}
          />
        </BriefFieldRow>
        <BriefFieldRow canEditOptions excludedFieldIds={excludedFieldIds} field={fields.callToAction} onConfirm={onConfirmField} onEditFieldOptions={onEditFieldOptions} onRegenerate={onRegenerateField} onToggleFieldExcluded={onToggleFieldExcluded}>
          <BriefCallToActionSelect
            excludedOptions={excludedOptionValues.callToAction}
            value={fields.callToAction.value}
            onChange={(value) => onFieldChange("callToAction", value)}
          />
        </BriefFieldRow>
      </div>
    </section>
  );
}

function BriefPurposeSelect({ excludedOptions = [], onChange, value }: {
  excludedOptions?: readonly string[]; onChange: (value: string) => void; value: string;
}) {
  const isKnownPurpose = briefPurposeOptions.includes(value as (typeof briefPurposeOptions)[number]);
  const isCustomPurpose = value === "Something else" || (!!value && !isKnownPurpose);
  return <div className="brief-purpose-picker">
    <BriskSelect ariaLabel="Purpose" clearable={false} placeholder="Choose purpose"
      value={isCustomPurpose ? "Something else" : value}
      options={briefPurposeOptions.filter((option) => !excludedOptions.includes(option)).map((option) => ({
        value: option, label: isBriefCustomOption(option) ? briefCustomOptionLabel : option,
        icon: isBriefCustomOption(option) ? "plus" : undefined,
        content: isBriefCustomOption(option) ? undefined : <BriefPurposeOptionLabel option={option} />,
      }))} onChange={onChange} />
    {isCustomPurpose ? <input className="brief-custom-select-input label-s" aria-label="Custom purpose" placeholder="Describe the purpose"
      value={value === "Something else" ? "" : value} onChange={(event) => onChange(event.target.value || "Something else")} /> : null}
  </div>;
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
  excludedOptions = [],
  onChange,
  value,
}: {
  excludedOptions?: readonly string[];
  onChange: (value: string) => void;
  value: string;
}) {
  const isKnownCallToAction = briefCallToActionOptions.includes(value as (typeof briefCallToActionOptions)[number]);
  const isCustomCallToAction = value === "Something else" || (!!value && !isKnownCallToAction);
  const customValue = isCustomCallToAction && value !== "Something else" ? value : "";
  return (
    <div className="brief-call-to-action-display">
      <div className="brief-video-type-menu" role="listbox" aria-label="Call to action options">
        {briefCallToActionOptions.filter((option) => !excludedOptions.includes(option)).map((option) => {
          const isCustomOption = isBriefCustomOption(option);
          const isSelected = option === (isCustomCallToAction ? "Something else" : value);

          if (isCustomOption && isSelected) {
            return (
              <div
                className="brief-video-type-option brief-call-to-action-inline selected"
                key={option}
                role="option"
                aria-selected="true"
              >
                <span className="brief-video-type-option-icon" aria-hidden="true">
                  <DsIcon name={getBriefCallToActionIcon(option)} size={16} />
                </span>
                <input
                  autoFocus
                  className="brief-call-to-action-inline-input label-s-semibold"
                  aria-label="Custom call to action"
                  placeholder={briefCustomCallToActionLabel}
                  value={customValue}
                  onChange={(event) => onChange(event.target.value || "Something else")}
                />
              </div>
            );
          }

          return (
            <button
              className={`brief-video-type-option${isSelected ? " selected" : ""}`}
              key={option}
              type="button"
              role="option"
              aria-selected={isSelected}
              onClick={() => onChange(isSelected ? "" : option)}
            >
              <span className="brief-video-type-option-icon" aria-hidden="true">
                <DsIcon name={getBriefCallToActionIcon(option)} size={16} />
              </span>
              <strong className="label-s-semibold">{getBriefCallToActionDisplayLabel(option)}</strong>
            </button>
          );
        })}
      </div>
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
  const audiences = parseAudienceList(value);

  function updateAudience(index: number, nextValue: string) {
    const nextAudiences = audiences.map((audience, audienceIndex) =>
      audienceIndex === index ? nextValue : audience,
    );

    onChange(serialiseAudienceList(nextAudiences));
  }

  function addAudience() {
    onChange(serialiseAudienceList([...audiences, ""]));
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
      <button className="brief-audience-add label-xs-semibold" type="button" onClick={addAudience}>
        <DsIcon name="plus" size={12} />
        <span>Add audience</span>
      </button>
    </div>
  );
}

function BriefSimilarVideosSection({
  excludedFieldIds = [],
  fields,
  intro = briefSectionIntros.similarVideos,
  onConfirmField,
  onFieldChange,
  onRegenerateField,
  onToggleFieldExcluded,
  summaryMode = false,
}: {
  fields: BriefFields;
  intro?: BriefSectionIntroModel;
  onConfirmField: (fieldId: BriefFieldId) => void;
  onFieldChange: (fieldId: BriefFieldId, value: string) => void;
  onRegenerateField: (fieldId: BriefFieldId) => void;
  summaryMode?: boolean;
} & BriefFieldExclusionProps) {
  return (
    <section
      className={`brief-section-panel ${summaryMode ? "summary-mode" : ""}`}
      aria-label={summaryMode ? undefined : "Similar videos"}
      aria-labelledby={summaryMode ? "brief-similar-videos-title" : "brief-similar-videos-step-title"}
    >
      {summaryMode ? (
        <BriefSectionHeader
          hideCopy
          hideEyebrow
          titleId="brief-similar-videos-title"
          title="Similar videos"
        />
      ) : (
        <BriefSectionIntro
          intro={intro}
          titleId="brief-similar-videos-step-title"
        />
      )}
      <div className="brief-field-list">
        <BriefFieldRow excludedFieldIds={excludedFieldIds} field={fields.referenceVideos} onConfirm={onConfirmField} onRegenerate={onRegenerateField} onToggleFieldExcluded={onToggleFieldExcluded}>
          <BriefReferenceVideosField
            value={fields.referenceVideos.value}
            onChange={(value) => onFieldChange("referenceVideos", value)}
          />
        </BriefFieldRow>
      </div>
    </section>
  );
}

function BriefBrandKitSection({
  excludedFieldIds = [],
  excludedOptionValues = {},
  fields,
  intro = briefSectionIntros.brandKit,
  onConfirmField,
  onFieldChange,
  onRegenerateField,
  onEditFieldOptions,
  onToggleFieldExcluded,
  summaryMode = false,
}: {
  fields: BriefFields;
  intro?: BriefSectionIntroModel;
  onConfirmField: (fieldId: BriefFieldId) => void;
  onFieldChange: (fieldId: BriefFieldId, value: string) => void;
  onRegenerateField: (fieldId: BriefFieldId) => void;
  summaryMode?: boolean;
} & BriefFieldExclusionProps) {
  return (
    <section
      className={`brief-section-panel brief-brand-kit-section ${summaryMode ? "summary-mode" : ""}`}
      aria-label={summaryMode ? undefined : "Brand kit"}
      aria-labelledby={summaryMode ? "brief-brand-kit-title" : "brief-brand-kit-step-title"}
    >
      {summaryMode ? (
        <BriefSectionHeader
          hideCopy
          hideEyebrow
          titleId="brief-brand-kit-title"
          title="Brand kit"
        />
      ) : (
        <BriefSectionIntro
          intro={intro}
          titleId="brief-brand-kit-step-title"
        />
      )}
      <div className="brief-field-list">
        <BriefFieldRow canEditOptions excludedFieldIds={excludedFieldIds} field={fields.brandKit} onConfirm={onConfirmField} onEditFieldOptions={onEditFieldOptions} onRegenerate={onRegenerateField} onToggleFieldExcluded={onToggleFieldExcluded}>
          <BriefBrandKitPicker
            excludedOptions={excludedOptionValues.brandKit}
            value={fields.brandKit.value}
            onChange={(value) => onFieldChange("brandKit", value)}
          />
        </BriefFieldRow>
      </div>
    </section>
  );
}

function BriefContentProductionSection({
  clientName,
  excludedFieldIds = [],
  fields,
  intro = briefSectionIntros.contentProduction,
  onConfirmField,
  onFieldChange,
  onRegenerateField,
  onToggleFieldExcluded,
  summaryMode = false,
  studioName,
}: {
  clientName?: string;
  fields: BriefFields;
  intro?: BriefSectionIntroModel;
  onConfirmField: (fieldId: BriefFieldId) => void;
  onFieldChange: (fieldId: BriefFieldId, value: string) => void;
  onRegenerateField: (fieldId: BriefFieldId) => void;
  summaryMode?: boolean;
  studioName: string;
} & BriefFieldExclusionProps) {
  return (
    <section
      className={`brief-section-panel ${summaryMode ? "summary-mode" : ""}`}
      aria-label={summaryMode ? undefined : "Footage and filming"}
      aria-labelledby={summaryMode ? "brief-content-production-title" : "brief-content-production-step-title"}
    >
      {summaryMode ? (
        <BriefSectionHeader
          hideCopy
          hideEyebrow
          titleId="brief-content-production-title"
          title="Footage and filming"
        />
      ) : (
        <BriefSectionIntro
          intro={intro}
          titleId="brief-content-production-step-title"
        />
      )}
      <div className="brief-field-list">
        <BriefFieldRow excludedFieldIds={excludedFieldIds} field={fields.liveFootage} onConfirm={onConfirmField} onRegenerate={onRegenerateField} onToggleFieldExcluded={onToggleFieldExcluded}>
          <BriefLiveFootageToggle
            clientName={clientName}
            studioName={studioName}
            value={fields.liveFootage.value}
            onChange={(value) => onFieldChange("liveFootage", value)}
          />
        </BriefFieldRow>
      </div>
    </section>
  );
}

function BriefDeadlineSection({
  excludedFieldIds = [],
  fields,
  intro = briefSectionIntros.deadline,
  onConfirmField,
  onFieldChange,
  onRegenerateField,
  onToggleFieldExcluded,
  summaryMode = false,
  timingSuggestion,
}: {
  fields: BriefFields;
  intro?: BriefSectionIntroModel;
  onConfirmField: (fieldId: BriefFieldId) => void;
  onFieldChange: (fieldId: BriefFieldId, value: string) => void;
  onRegenerateField: (fieldId: BriefFieldId) => void;
  summaryMode?: boolean;
  timingSuggestion?: ReactNode;
} & BriefFieldExclusionProps) {
  return (
    <section
      className={`brief-section-panel ${summaryMode ? "summary-mode" : ""}`}
      aria-label={summaryMode ? undefined : "Deadline"}
      aria-labelledby={summaryMode ? "brief-deadline-title" : "brief-deadline-step-title"}
    >
      {summaryMode ? (
        <BriefSectionHeader
          hideCopy
          hideEyebrow
          titleId="brief-deadline-title"
          title="Deadline"
        />
      ) : (
        <BriefSectionIntro
          intro={intro}
          titleId="brief-deadline-step-title"
        />
      )}
      <div className="brief-field-list">
        <BriefFieldRow excludedFieldIds={excludedFieldIds} field={fields.deadline} onConfirm={onConfirmField} onRegenerate={onRegenerateField} onToggleFieldExcluded={onToggleFieldExcluded}>
          <BriefDeadlineField
            inline={!summaryMode}
            value={fields.deadline.value}
            onChange={(value) => onFieldChange("deadline", value)}
          />
        </BriefFieldRow>
        {timingSuggestion}
      </div>
    </section>
  );
}

function BriefDeliverablesSection({
  excludedFieldIds = [],
  fields,
  intro = briefSectionIntros.deliverablesTiming,
  onConfirmField,
  onFieldChange,
  onRegenerateField,
  onToggleFieldExcluded,
  summaryMode = false,
}: {
  fields: BriefFields;
  intro?: BriefSectionIntroModel;
  onConfirmField: (fieldId: BriefFieldId) => void;
  onFieldChange: (fieldId: BriefFieldId, value: string) => void;
  onRegenerateField: (fieldId: BriefFieldId) => void;
  summaryMode?: boolean;
} & BriefFieldExclusionProps) {
  return (
    <section
      className={`brief-section-panel ${summaryMode ? "summary-mode" : ""}`}
      aria-label={summaryMode ? undefined : "Deliverables"}
      aria-labelledby={summaryMode ? "brief-deliverables-title" : "brief-deliverables-step-title"}
    >
      {summaryMode ? (
        <BriefSectionHeader
          hideCopy
          hideEyebrow
          titleId="brief-deliverables-title"
          title="Deliverables"
        />
      ) : (
        <BriefSectionIntro
          intro={intro}
          titleId="brief-deliverables-step-title"
        />
      )}
      <div className="brief-field-list">
        <BriefFieldRow excludedFieldIds={excludedFieldIds} field={fields.deliverables} onConfirm={onConfirmField} onRegenerate={onRegenerateField} onToggleFieldExcluded={onToggleFieldExcluded}>
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
  const actionsMenuRef = useBriefOutsidePointerClose<HTMLDivElement>(
    openMenuRowId !== null,
    () => setOpenMenuRowId(null),
  );

  function updateRows(nextRows: DeliverableRow[]) {
    onChange(serialiseDeliverables(nextRows));
  }

  function updateRow(rowId: string, updates: Partial<DeliverableRow>) {
    updateRows(rows.map((row) => (row.id === rowId ? { ...row, ...updates } : row)));
  }

  function addRow() {
    const previousRow = rows[rows.length - 1];
    const rowNames = ["Platform cutdown", "Square cut", "Shorts cut", "Paid social cut"];
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
              <BriefDeliverablesHeader title="Duration" />
              <BriefDeliverablesHeader title="Deadline" />
              <BriefDeliverablesHeader title="Platform" />
              <BriefDeliverablesHeader title="Format" />
              <BriefDeliverablesHeader title="Captions" />
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
                  <BriefDeliverableDurationControl
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
                  <BriefDeliverablePlatformSelect
                    value={row.platform}
                    onChange={(platform) => updateRow(row.id, { platform })}
                  />
                </td>
                <td>
                  <BriefDeliverableFormatControl
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
                  <div
                    className="brief-deliverable-actions"
                    ref={openMenuRowId === row.id ? actionsMenuRef : undefined}
                  >
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
      <Button size="S" variant="secondary" className="brief-add-version-button" type="button" onClick={addRow}>
        <DsIcon name="plus" size={14} />
        <span>Add version</span>
      </Button>
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

function BriefDeliverablePlatformSelect({ autoOpen = false, excludedOptions = [], onChange, selectedCard = false, value }: {
  autoOpen?: boolean; excludedOptions?: readonly string[]; onChange: (value: string) => void; selectedCard?: boolean; value: string;
}) {
  return <div className="brief-platform-select">
    <BriskSelect ariaLabel="Platform" autoOpen={autoOpen} clearable={false} placeholder="Choose platform" value={value}
      options={deliverablePlatformGroups.flatMap((group) => group.options.filter((option) => !excludedOptions.includes(option)).map((option) => ({
        value: option, label: getBriefOptionDisplayLabel(option), group: group.label,
        icon: isBriefCustomOption(option) ? "plus" as const : deliverablePlatformIconMap[option] ?? "grid-four" as const,
      })))} onChange={onChange} />
    {selectedCard && value ? <button className="brief-platform-clear label-xs-semibold" type="button" aria-label={`Clear ${getBriefOptionDisplayLabel(value)}`} onClick={() => onChange("")}>Clear platform</button> : null}
  </div>;
}

function BriefDeliverableFormatControl({ autoOpen = false, onChange, row }: {
  autoOpen?: boolean; onChange: (updates: Partial<DeliverableRow>) => void; row: DeliverableRow;
}) {
  const selectedFormat = deliverableFormatOptions.find((format) => format.label === row.format) ?? deliverableFormatOptions[0];
  return <div className="brief-deliverable-inline-control">
    <BriskSelect ariaLabel="Format" autoOpen={autoOpen} clearable={false} searchable={false} placeholder="Choose format" value={selectedFormat.label}
      options={deliverableFormatOptions.map((format) => ({ value: format.label, label: format.label === "Custom" ? briefCustomOptionLabel : format.label,
        description: format.label === "Custom" ? undefined : format.helper,
        content: <><span className="brief-format-option-icon" aria-hidden="true">{format.label === "Custom" ? <DsIcon name="plus" size={16} /> : <span className={`brief-aspect-icon ${format.iconClass}`} />}</span>{format.label === "Custom" ? briefCustomOptionLabel : format.label}</>,
      }))} onChange={(format) => onChange({ format, customFormat: "" })} />
    {row.format === "Custom" ? <input className="brief-table-mini-input label-xs" aria-label="Custom format" placeholder="4:5" value={row.customFormat} onChange={(event) => onChange({ customFormat: event.target.value })} /> : null}
  </div>;
}

function BriefDeliverableDurationControl({ autoOpen = false, onChange, row }: {
  autoOpen?: boolean; onChange: (updates: Partial<DeliverableRow>) => void; row: DeliverableRow;
}) {
  const selectedDuration = deliverableDurationOptions.find((duration) => duration.label === row.duration) ?? deliverableDurationOptions[0];
  return <div className="brief-deliverable-inline-control">
    <BriskSelect ariaLabel="Duration" autoOpen={autoOpen} clearable={false} searchable={false} placeholder="Choose duration" value={row.duration || selectedDuration.label}
      options={deliverableDurationOptions.map((duration) => ({ value: duration.label,
        label: duration.label === "Custom" ? briefCustomOptionLabel : formatDurationLabel(duration.label),
        description: duration.label === "Custom" ? undefined : duration.helper,
        icon: duration.label === "Custom" ? "plus" : undefined,
      }))} onChange={(duration) => onChange({ duration, customMinutes: duration === "Custom" ? row.customMinutes : "", customSeconds: duration === "Custom" ? row.customSeconds : "" })} />
    {row.duration === "Custom" ? <div className="brief-custom-duration">
      <input className="brief-table-mini-input label-xs" aria-label="Custom minutes" inputMode="numeric" placeholder="min" value={row.customMinutes} onChange={(event) => onChange({ customMinutes: event.target.value })} />
      <input className="brief-table-mini-input label-xs" aria-label="Custom seconds" inputMode="numeric" placeholder="sec" value={row.customSeconds} onChange={(event) => onChange({ customSeconds: event.target.value })} />
    </div> : null}
  </div>;
}

function BriefDeliverableCaptionsControl({ onChange, row }: { onChange: (updates: Partial<DeliverableRow>) => void; row: DeliverableRow }) {
  const selectedOptions = getDeliverableCaptionOptions(row);
  return <BriskSelect<DeliverableCaptionOption> multiple ariaLabel="Caption options" clearable={false} searchable={false}
    placeholder="Choose captions" triggerContent={<span>{formatDeliverableCaptionSummary(row)}</span>} value={selectedOptions}
    options={deliverableCaptionOptions.map((option) => ({ value: option.label, label: option.label, description: option.helper }))}
    onChange={(next) => {
      const changed = next.find((option) => !selectedOptions.includes(option)) ?? selectedOptions.find((option) => !next.includes(option));
      if (!changed) return;
      const captionOptions = getNextDeliverableCaptionOptions(selectedOptions, changed);
      onChange({ captionOptions, captions: captionOptions.some((option) => option !== "None") });
    }} />;
}

function BriefDeliverableDeadlineControl({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="brief-deliverable-deadline">
      <BriskDatePicker
        ariaLabel="Deliverable deadline"
        placeholder="Choose date"
        value={value}
        variant="field"
        onChange={onChange}
      />
    </div>
  );
}

function BriefDeadlineField({
  inline = false,
  onChange,
  value,
}: {
  inline?: boolean;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="brief-deadline-control">
      <BriskDatePicker ariaLabel="Deadline" inline={inline} placeholder="Choose date" value={value} variant="field" onChange={onChange} />
    </div>
  );
}

function BriefLiveFootageToggle({
  clientName,
  onChange,
  studioName,
  value,
}: {
  clientName?: string;
  onChange: (value: string) => void;
  studioName: string;
  value: string;
}) {
  const [footageChoices, shooterChoice, filmingContentChoices] = parseLiveFootageValue(value);
  const isShootingNew = footageChoices.includes("Shoot new");
  const clientTeamLabel = clientName || "Our team";
  const shooterOptions: Array<{
    description: string;
    label: string;
    value: "Client shoots" | "Studio shoots";
  }> = [
    {
      label: clientTeamLabel,
      value: "Client shoots",
      description: clientName
        ? `${clientName} will handle the crew, equipment and location.`
        : "We’ll handle the crew, equipment and location.",
    },
    {
      label: studioName,
      value: "Studio shoots",
      description: `${studioName} will handle the crew, equipment and direction.`,
    },
  ];

  function toggleFootageChoice(nextChoice: BriefFootageChoice) {
    const nextFootageChoices = footageChoices.includes(nextChoice)
      ? footageChoices.filter((choice) => choice !== nextChoice)
      : [...footageChoices, nextChoice];
    const keepsNewFootage = nextFootageChoices.includes("Shoot new");

    onChange(serializeLiveFootageValue(
      nextFootageChoices,
      keepsNewFootage ? shooterChoice : "",
      keepsNewFootage ? filmingContentChoices : [],
    ));
  }

  function selectShooterChoice(nextChoice: "Client shoots" | "Studio shoots") {
    onChange(serializeLiveFootageValue(footageChoices, nextChoice, filmingContentChoices));
  }

  function toggleFilmingContentChoice(nextChoice: BriefFilmingContentChoice) {
    const nextFilmingContentChoices: BriefFilmingContentChoice[] = nextChoice === "Not sure yet"
      ? filmingContentChoices.includes("Not sure yet") ? [] : ["Not sure yet"]
      : filmingContentChoices.includes(nextChoice)
        ? filmingContentChoices.filter((choice) => choice !== nextChoice)
        : [...filmingContentChoices.filter((choice) => choice !== "Not sure yet"), nextChoice];

    onChange(serializeLiveFootageValue(footageChoices, shooterChoice, nextFilmingContentChoices));
  }

  return (
    <div className="brief-live-footage-control">
      <div className="brief-production-choice-grid" aria-label="Footage sources" role="group">
        {briefFootageOptions.map((option) => (
          <BriefProductionChoiceCard
            checked={footageChoices.includes(option.value)}
            description={option.description}
            indicator="checkbox"
            key={option.value}
            label={option.label}
            onChange={() => toggleFootageChoice(option.value)}
          />
        ))}
      </div>
      {isShootingNew ? (
        <fieldset className="brief-live-footage-follow-up">
          <legend className="brief-live-footage-sub-label label-s-semibold">Who will film the new footage?</legend>
          <div className="brief-production-choice-grid">
            {shooterOptions.map((option) => (
              <BriefProductionChoiceCard
                checked={shooterChoice === option.value}
                description={option.description}
                indicator="radio"
                key={option.value}
                label={option.label}
                name="brief-filming-responsibility"
                onChange={() => selectShooterChoice(option.value)}
              />
            ))}
          </div>
        </fieldset>
      ) : null}
      {isShootingNew && shooterChoice ? (
        <fieldset className="brief-live-footage-follow-up">
          <legend className="brief-live-footage-sub-label label-s-semibold">What will you film?</legend>
          <div className="brief-production-choice-grid">
            {briefFilmingContentOptions.filter((option) => option.value !== "Not sure yet").map((option) => (
              <BriefProductionChoiceCard
                checked={filmingContentChoices.includes(option.value)}
                description={option.description}
                indicator="checkbox"
                key={option.value}
                label={option.label}
                onChange={() => toggleFilmingContentChoice(option.value)}
              />
            ))}
          </div>
          <Button
            className={`brief-production-not-sure ${filmingContentChoices.includes("Not sure yet") ? "is-selected" : ""}`}
            size="S"
            type="button"
            variant="secondary"
            onClick={() => toggleFilmingContentChoice("Not sure yet")}
          >
            Not sure yet - decide later
            {filmingContentChoices.includes("Not sure yet") ? <span className="sr-only"> Selected</span> : null}
          </Button>
        </fieldset>
      ) : null}
    </div>
  );
}

function BriefProductionChoiceCard({
  checked,
  description,
  indicator,
  label,
  name,
  onChange,
}: {
  checked: boolean;
  description?: string;
  indicator: "checkbox" | "radio";
  label: string;
  name?: string;
  onChange: () => void;
}) {
  return (
    <label
      className={`brief-production-choice-card ${checked ? "is-selected" : ""}`}
      onClick={(event) => {
        if (event.detail === 0) return;
        const input = event.currentTarget.querySelector("input");
        window.requestAnimationFrame(() => input?.blur());
      }}
    >
      <input
        className="sr-only"
        checked={checked}
        name={name}
        type={indicator}
        onChange={onChange}
      />
      <span className={`brief-production-choice-indicator is-${indicator} ${checked ? "is-selected" : ""}`}>
        {indicator === "checkbox" && checked ? <DsIcon name="check" size={12} /> : null}
      </span>
      <span className="brief-production-choice-copy">
        <strong className="label-s-semibold">{label}</strong>
        {description ? <span className="label-xs">{description}</span> : null}
      </span>
    </label>
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
      <div className="brief-voiceover-choice-group" aria-label="Voiceover preference" role="group">
        {(["Yes", "No", "We'll do our own"] as const).map((option) => (
          <button
            className={`brief-pill-toggle brief-voiceover-choice-card label-s-semibold ${
              voiceoverChoice === option ? "selected" : ""
            }`}
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
        <Button size="S" variant="secondary"
          className="brief-toolbar-button"
          type="button"
          disabled={!canAddMore}
          onClick={() => fileInputRef.current?.click()}
        >
          <DsIcon name="upload-simple" size={14} />
          Upload video
        </Button>
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
      ) : null}
    </div>
  );
}

function BriefBrandKitPicker({ excludedOptions = [], onChange, value }: {
  excludedOptions?: readonly string[]; onChange: (value: string) => void; value: string;
}) {
  const availableKits = brandKitOptions.filter((kit) => !excludedOptions.includes(kit.name));
  const activeKit = availableKits.find((kit) => kit.name === value) ?? availableKits[0] ?? brandKitOptions[0];
  return <BriskSelect ariaLabel="Brand kit" className="brief-brand-kit-picker" clearable={false} placeholder="Choose brand kit" value={activeKit.name}
    triggerContent={<><BriefBrandKitPreview kit={activeKit} /><span>{activeKit.name}</span></>}
    options={availableKits.map((kit) => ({ value: kit.name, label: kit.name,
      content: <span className="brief-brand-kit-choice"><BriefBrandKitPreview kit={kit} /><span className="brief-brand-kit-option-copy"><strong className="label-s-semibold">{kit.name}</strong><span className="brief-brand-kit-description label-xs">{kit.description}</span></span></span>,
    }))} onChange={onChange} />;
}

function BriefBrandKitPreview({ kit }: { kit: BrandKitOption }) {
  return <span className="brief-brand-kit-palette" aria-hidden="true">
    {kit.colours.slice(0, 4).map((colour, colourIndex) => <span key={`${colour}-${colourIndex}`} style={{ "--brief-brand-kit-swatch": colour } as CSSProperties} />)}
  </span>;
}

function BriefMultiSelect({ ariaLabel, onChange, options, value }: { ariaLabel: string; onChange: (value: string) => void; options: readonly string[]; value: string }) {
  const selectedValues = parseMultiSelectValue(value).slice(0, 3);
  return <div className="brief-tone-chip-picker" aria-label={ariaLabel} role="group"><div className="brief-tone-chip-row">
    {selectedValues.map((option) => <button className="brief-tone-chip selected label-xs-semibold" key={option} type="button" aria-label={`Remove ${option}`} onClick={() => onChange(selectedValues.filter((selected) => selected !== option).join(", "))}>
      {option}<DsIcon name="x-close-cross" size={10} />
    </button>)}
    {selectedValues.length < 3 ? <BriskSelect ariaLabel={`Add ${ariaLabel.toLowerCase()}`} className="brief-tone-add-picker" clearable={false} placeholder="Add tone" value=""
      triggerContent={<><DsIcon name="plus" size={12} /><span>Add tone</span></>} hideCaret
      options={options.filter((option) => !selectedValues.includes(option)).map((option) => ({ value: option, label: option }))}
      onChange={(option) => { if (option && !selectedValues.includes(option) && selectedValues.length < 3) onChange([...selectedValues, option].join(", ")); }} /> : null}
  </div></div>;
}

function BriefInlineSelect({
  autoOpen = false,
  ariaLabel,
  getOptionLabel = getShortOptionLabel,
  onChange,
  onCommit,
  options,
  placeholder,
  value,
}: {
  autoOpen?: boolean;
  ariaLabel: string;
  getOptionLabel?: (option: string) => string;
  onChange: (value: string) => void;
  onCommit?: () => void;
  options: readonly string[];
  placeholder: string;
  value: string;
}) {
  return <BriskSelect
    ariaLabel={ariaLabel}
    autoOpen={autoOpen}
    clearable={false}
    options={options.map((option) => ({ value: option, label: getOptionLabel(option) }))}
    placeholder={placeholder}
    value={value}
    onChange={(nextValue) => { onChange(nextValue); onCommit?.(); }}
  />;
}

function BriefVideoTypeMultiSelect({
  onChange,
  options = briefVideoTypeDetails,
  value,
}: {
  onChange: (value: string) => void;
  options?: readonly BriefVideoTypeDetail[];
  value: string;
}) {
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

  return (
    <div className="brief-video-type-multi">
      <div
        className="brief-video-type-menu"
        aria-label="Choose video type"
        aria-multiselectable="true"
        role="listbox"
      >
        {options.map((videoType) => {
          const isSelected = selectedValues.includes(videoType.name);

          return (
            <button
              className={`brief-video-type-option ${isSelected ? "selected" : ""}`}
              key={videoType.name}
              type="button"
              disabled={!isSelected && !canAddType}
              aria-selected={isSelected}
              role="option"
              onClick={() => toggleType(videoType.name)}
            >
              <span className="brief-video-type-option-icon" aria-hidden="true">
                <DsIcon name={videoTypeIconMap[videoType.name] ?? "film-strip"} size={16} />
              </span>
              <strong className="label-s-semibold">{videoType.name}</strong>
              {isSelected ? (
                <span className="brief-video-type-option-check" aria-hidden="true">
                  <DsIcon name="check-circle" size={16} />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
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
    .map((line) => line.replace(/^(Primary audience|Secondary audience|Audience \d+):\s*/i, "").trim());

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
  const normalisedAudiences = audiences
    .map((audience, index) => ({ label: getAudienceLabel(index), value: audience.trim() }));

  if (normalisedAudiences.length <= 1 && !normalisedAudiences.some((audience) => audience.value)) {
    return "";
  }

  return normalisedAudiences.map((audience) => `${audience.label}: ${audience.value}`).join("\n");
}

function getAudienceLabel(index: number) {
  if (index === 0) {
    return "Primary audience";
  }

  if (index === 1) {
    return "Secondary audience";
  }

  return `Audience ${index + 1}`;
}

function getAudiencePlaceholder(index: number) {
  if (index === 0) {
    return "Primary audience";
  }

  if (index === 1) {
    return "Secondary audience";
  }

  return `Audience ${index + 1}`;
}

function parseLiveFootageValue(value: string): [
  BriefFootageChoice[],
  "Client shoots" | "Studio shoots" | "",
  BriefFilmingContentChoice[],
] {
  const [footageValue = "", shooterChoice = "", filmingContentValue = ""] = value.split("|");
  const normalisedFootageChoices = footageValue
    .split("+")
    .map((choice) => choice === "Existing footage" ? "Use existing" : choice === "New footage" ? "Shoot new" : choice)
    .filter((choice): choice is BriefFootageChoice => choice === "Use existing" || choice === "Shoot new");
  const normalisedShooterChoice =
    shooterChoice === "Client shoots" || shooterChoice === "You shoot"
      ? "Client shoots"
      : shooterChoice === "Studio shoots"
        ? "Studio shoots"
        : "";
  const legacyFilmingContentValue = filmingContentValue === "Both"
    ? "Interviews+Scripted scenes"
    : filmingContentValue === "I'll decide later"
      ? "Not sure yet"
      : filmingContentValue;
  const parsedFilmingContentChoices = legacyFilmingContentValue
    .split("+")
    .filter((choice): choice is BriefFilmingContentChoice => (
      choice === "Interviews" || choice === "Scripted scenes" || choice === "Not sure yet"
    ));
  const normalisedFilmingContentChoices = parsedFilmingContentChoices.includes("Not sure yet")
    ? ["Not sure yet"] satisfies BriefFilmingContentChoice[]
    : parsedFilmingContentChoices;

  return [normalisedFootageChoices, normalisedShooterChoice, normalisedFilmingContentChoices];
}

function serializeLiveFootageValue(
  footageChoices: BriefFootageChoice[],
  shooterChoice: "Client shoots" | "Studio shoots" | "",
  filmingContentChoices: BriefFilmingContentChoice[],
) {
  if (footageChoices.length === 0) return "";
  const usesNewFootage = footageChoices.includes("Shoot new");
  return [
    footageChoices.join("+"),
    usesNewFootage ? shooterChoice : "",
    usesNewFootage ? filmingContentChoices.join("+") : "",
  ].join("|");
}

function isLiveFootageValueComplete(value: string) {
  const [footageChoices, shooterChoice, filmingContentChoices] = parseLiveFootageValue(value);
  return footageChoices.length > 0 && (
    !footageChoices.includes("Shoot new") || (Boolean(shooterChoice) && filmingContentChoices.length > 0)
  );
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

function getReferenceDisplayTitle(video: ReferenceVideoCard) {
  const title = video.title.trim();
  const host = getVideoHost(video.source);

  if (title && title !== "Video reference" && title !== `${host} reference`) {
    return title;
  }

  return getReadableTitleFromUrl(video.source) || `${host} reference video`;
}

function getReferenceExternalHref(source: string) {
  try {
    const url = new URL(source);

    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString();
    }
  } catch {
    return "";
  }

  return "";
}

function getReadableTitleFromUrl(source: string) {
  try {
    const url = new URL(source);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const possibleSlug = pathParts[pathParts.length - 1] ?? "";

    if (!possibleSlug || /^[a-z0-9_-]{8,}$/i.test(possibleSlug)) {
      return "";
    }

    return sentenceCase(possibleSlug.replace(/[-_]+/g, " "));
  } catch {
    return source.includes(".") ? "" : source;
  }
}

function getReferenceEmbedUrl(source: string) {
  try {
    const url = new URL(source);
    const hostname = url.hostname.toLowerCase();

    if (hostname.includes("youtube.com")) {
      const videoId = url.searchParams.get("v") ?? url.pathname.split("/").filter(Boolean).pop();
      return videoId ? `https://www.youtube.com/embed/${videoId}` : "";
    }

    if (hostname.includes("youtu.be")) {
      const videoId = url.pathname.split("/").filter(Boolean)[0];
      return videoId ? `https://www.youtube.com/embed/${videoId}` : "";
    }

    if (hostname.includes("vimeo.com")) {
      const videoId = url.pathname.split("/").filter(Boolean).pop();
      return videoId ? `https://player.vimeo.com/video/${videoId}` : "";
    }

    if (hostname.includes("loom.com")) {
      const pathParts = url.pathname.split("/").filter(Boolean);
      const videoId = pathParts[pathParts.length - 1];
      return videoId ? `https://www.loom.com/embed/${videoId}` : "";
    }
  } catch {
    return "";
  }

  return "";
}

function getReferenceVideoUrl(source: string) {
  const trimmedSource = source.trim();

  if (!/\.(mp4|m4v|mov|ogg|webm)(?:[?#].*)?$/iu.test(trimmedSource)) {
    return "";
  }

  if (trimmedSource.startsWith("/") || trimmedSource.startsWith("blob:")) {
    return trimmedSource;
  }

  try {
    const url = new URL(trimmedSource);

    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
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

function createBlankDeliverableRow(name = "Platform cutdown", deadline = ""): DeliverableRow {
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

function getMockReferenceTags(source: string) {
  const seed = source.length % referenceVideoTagSets.length;

  return [...referenceVideoTagSets[seed]];
}

function BriefFieldRow({
  canEditOptions = false,
  children,
  excludedFieldIds = [],
  field,
  metaAction,
  onConfirm,
  onRegenerate,
  onEditFieldOptions,
  onToggleFieldExcluded,
}: {
  canEditOptions?: boolean;
  children: ReactNode;
  excludedFieldIds?: readonly BriefFieldId[];
  field: BriefField;
  metaAction?: ReactNode;
  onConfirm: (fieldId: BriefFieldId) => void;
  onEditFieldOptions?: (fieldId: BriefFieldId) => void;
  onRegenerate: (fieldId: BriefFieldId) => void;
  onToggleFieldExcluded?: (fieldId: BriefFieldId) => void;
}) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const fieldOrder = useContext(BriefFieldOrderContext);
  const isExcluded = excludedFieldIds.includes(field.id);

  function focusFieldControl() {
    onConfirm(field.id);
    const fieldControl = rowRef.current?.querySelector<HTMLElement>(".brief-field-control");
    activateBriefEditableControl(fieldControl ?? rowRef.current);
  }

  if (isExcluded && !onToggleFieldExcluded) {
    return null;
  }

  return (
    <div data-search-brief-field={field.id} className={`brief-field-row ${isExcluded ? "is-excluded" : ""}`} ref={rowRef} style={fieldOrder ? { order: fieldOrder.indexOf(field.id) } : undefined}>
      <div className="brief-field-meta">
        <label className="label-s-semibold">{field.label}</label>
        <div className="brief-field-meta-side">
          {metaAction}
          {onToggleFieldExcluded ? (
            <>
              {canEditOptions && onEditFieldOptions && !isExcluded ? (
                <Button size="S" variant="ghost" onClick={() => onEditFieldOptions(field.id)}>
                  Edit options
                </Button>
              ) : null}
              <Button
                size="S"
                variant="ghost"
                onClick={() => onToggleFieldExcluded(field.id)}
              >
                {isExcluded ? "Restore" : "Exclude"}
              </Button>
            </>
          ) : (
            <BriefFieldStatusDot field={field} onEdit={focusFieldControl} onRegenerate={onRegenerate} />
          )}
        </div>
      </div>
      <div className="brief-field-control" inert={isExcluded ? true : undefined}>{children}</div>
    </div>
  );
}

function BriefFieldStatusDot({
  field,
  onEdit,
  onRegenerate,
}: {
  field: BriefField;
  onEdit: () => void;
  onRegenerate: (fieldId: BriefFieldId) => void;
}) {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const confidence = confidenceChipLabels[field.confidence];
  const statusLabel = field.confidence === "guess" ? "Uncertain" : confidence.label;

  function handleRegenerate() {
    setIsRegenerating(true);
    onRegenerate(field.id);
    window.setTimeout(() => setIsRegenerating(false), 420);
  }

  return (
    <BriefStatusDotControl
      isRegenerating={isRegenerating}
      label={field.label}
      onEdit={onEdit}
      onRegenerate={handleRegenerate}
      status={confidence.state}
      statusLabel={statusLabel}
    />
  );
}

function activateBriefEditableControl(container: HTMLElement | null) {
  const editable = container?.querySelector<HTMLElement>(
    [
      "input:not([type='hidden'])",
      "textarea",
      "select",
      "[role='button'][tabindex]",
      "button[aria-expanded]",
      "button:not(.brief-status-dot)",
    ].join(", "),
  );

  if (!editable) {
    return;
  }

  editable.focus();

  if (editable.hasAttribute("aria-expanded")) {
    editable.click();
  }
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
  intro = briefSectionIntros.summary,
  logline,
  onConfirmField,
  onCycleSummaryMissing,
  onFieldChange,
  onGoToStep,
  studioName,
  summaryMissingCount,
  timingSuggestion,
}: {
  fields: BriefFields;
  intro?: BriefSectionIntroModel;
  logline: Logline;
  onConfirmField: (fieldId: BriefFieldId) => void;
  onCycleSummaryMissing?: (direction: "previous" | "next") => void;
  onFieldChange: (fieldId: BriefFieldId, value: string) => void;
  onGoToStep: (stepId: BriefStepId) => void;
  studioName: string;
  summaryMissingCount?: number;
  timingSuggestion?: ReactNode;
}) {
  const [editingFieldId, setEditingFieldId] = useState<BriefSummaryEditTarget | null>(null);
  const [editingDeliverableCell, setEditingDeliverableCell] = useState<string | null>(null);
  const deliverableRows = parseDeliverables(fields.deliverables.value, fields.deadline.value);
  const primaryDeliverable = deliverableRows[0] ?? createMainDeliverableRow(fields.deadline.value);
  const summaryModel = createWrittenSummaryModel(fields, deliverableRows, primaryDeliverable, studioName);

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

  function jumpToStep(target: BriefStepId) {
    onGoToStep(target);
  }

  return (
    <section className="brief-summary-page" aria-labelledby="brief-summary-title">
      <BriefSectionIntro
        intro={intro}
        titleId="brief-summary-title"
      />
      <BriefSummaryLogline
        deliverableRows={deliverableRows}
        editingFieldId={editingFieldId}
        fields={fields}
        logline={logline}
        model={summaryModel}
        primaryDeliverable={primaryDeliverable}
        onChange={onFieldChange}
        onConfirm={onConfirmField}
        onEdit={setEditingFieldId}
        onKeyDown={handleEditKeyDown}
        onStopEditing={stopEditing}
      />
      <BriefSummarySpecStrip specGroups={summaryModel.specGroups} onJump={jumpToStep} />
      {timingSuggestion}
      <div className="brief-summary-deliverables-panel">
        <BriefSummaryCardHead
          index="03"
          title="Additional versions"
        />
        <BriefSummaryDeliverablesTable
          editingCell={editingDeliverableCell}
          fallbackDeadline={fields.deadline.value}
          onChange={(value) => onFieldChange("deliverables", value)}
          onEditCell={setEditingDeliverableCell}
          primaryDeadline={primaryDeliverable.deadline || fields.deadline.value}
          value={fields.deliverables.value}
        />
      </div>
      {summaryMissingCount && summaryMissingCount > 0 && onCycleSummaryMissing ? (
        <BriefSummaryConfirmationNote
          missingCount={summaryMissingCount}
          onCycle={onCycleSummaryMissing}
        />
      ) : null}
    </section>
  );
}

function BriefSummaryConfirmationNote({
  missingCount,
  onCycle,
}: {
  missingCount: number;
  onCycle: (direction: "previous" | "next") => void;
}) {
  return (
    <div className="brief-summary-confirmation-note label-s-semibold">
      <span className="brief-summary-confirmation-note-text">
        <span className="brief-summary-confirmation-note-count">
          <strong>{missingCount}</strong> {missingCount === 1 ? "detail" : "details"}
        </span>{" "}
        {missingCount === 1 ? "hasn't" : "haven't"} been confirmed. You can still approve this brief.
      </span>
      <span className="brief-summary-confirmation-cycler" aria-label="Cycle unconfirmed details">
        <button
          className="brief-summary-confirmation-arrow"
          type="button"
          aria-label="Review previous unconfirmed detail"
          onClick={() => onCycle("previous")}
        >
          <DsIcon name="caret-left" size={14} />
        </button>
        <button
          className="brief-summary-confirmation-arrow"
          type="button"
          aria-label="Review next unconfirmed detail"
          onClick={() => onCycle("next")}
        >
          <DsIcon name="caret-right" size={14} />
        </button>
      </span>
    </div>
  );
}

function BriefSummaryCardHead({
  index,
  title,
}: {
  index: string;
  title: string;
}) {
  return (
    <div className="brief-summary-card-head">
      <span className="brief-summary-card-title">
        <span className="brief-summary-card-number label-xs-semibold" aria-hidden="true">
          {index}
        </span>
        <span className="brief-summary-section-label label-xs-semibold">{title}</span>
      </span>
    </div>
  );
}

type BriefSummaryEditTarget =
  | BriefFieldId
  | "logline"
  | "durationSlot"
  | "deadlineSlot"
  | "referenceTitleSlot"
  | "voiceGenderSlot"
  | "voiceNameSlot"
  | "voiceKindSlot";

type BriefSummarySpecId =
  | "brand-kit"
  | "captions"
  | "deadline"
  | "duration"
  | "format"
  | "platform"
  | "shoot-mode"
  | "video-type";

type BriefSummarySpec = {
  id: BriefSummarySpecId;
  confidence: ConfidenceState;
  value: string;
  target: BriefStepId;
};

type BriefSummarySpecGroup = {
  label: string;
  specs: BriefSummarySpec[];
};

type WrittenSummaryModel = {
  audience: string;
  brandKit: string;
  brandKitProse: string;
  callToAction: string;
  deadline: string;
  deadlineCountdown: string;
  deliverablesInline: string;
  duration: string;
  durationsJoined: string;
  platform: string;
  referenceTitle: string;
  referenceUrl: string;
  shootMode: string;
  shootModeProse: string;
  footageSource: string;
  specGroups: BriefSummarySpecGroup[];
  versionsLabel: string;
  videoType: string;
  videoTypeProse: string;
};

function BriefSummarySpecStrip({
  onJump,
  specGroups,
}: {
  onJump: (target: BriefStepId) => void;
  specGroups: BriefSummarySpecGroup[];
}) {
  const specOrder: BriefSummarySpecId[] = [
    "video-type",
    "duration",
    "deadline",
    "platform",
    "format",
    "captions",
    "shoot-mode",
    "brand-kit",
  ];
  const specs = specGroups.flatMap((group) => group.specs)
    .sort((first, second) => specOrder.indexOf(first.id) - specOrder.indexOf(second.id));

  return (
    <section className="brief-summary-spec-groups" aria-label="Main Video Details">
      <BriefSummaryCardHead
        index="02"
        title="Main Video Details"
      />
      <div className="brief-summary-spec-table-wrap">
        <table className="brief-deliverables-table brief-deliverables-table-summary brief-summary-spec-table">
          <thead>
            <tr>
              {specs.map((spec) => <BriefDeliverablesHeader key={spec.id} title={getSummarySpecHeading(spec.id)} />)}
            </tr>
          </thead>
          <tbody>
            <tr>
              {specs.map((spec) => (
                <td key={spec.id}>
                  <button
                    className={`brief-summary-static-chip label-xs-semibold ${spec.value.trim() ? spec.confidence === "guess" ? "is-guess" : "" : "is-missing"}`}
                    type="button"
                    aria-label={spec.value.trim()
                      ? `${spec.confidence === "guess" ? "Review" : "Edit"} ${getSummarySpecHeading(spec.id)}`
                      : `Add ${getSummarySpecHeading(spec.id).toLocaleLowerCase("en-AU")}`}
                    onClick={() => onJump(spec.target)}
                  >
                    {spec.value.trim() ? spec.value : `+ Add ${getSummarySpecHeading(spec.id).toLocaleLowerCase("en-AU")}`}
                  </button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function getSummarySpecHeading(id: BriefSummarySpecId) {
  const headings: Record<BriefSummarySpecId, string> = {
    "brand-kit": "Brand kit",
    captions: "Captions",
    deadline: "Deadline",
    duration: "Duration",
    format: "Format",
    platform: "Platform",
    "shoot-mode": "Shoot mode",
    "video-type": "Video type",
  };

  return headings[id];
}

function BriefSummaryReferenceLink({
  field,
  onConfirm,
  video,
}: {
  field: BriefField;
  onConfirm: (fieldId: BriefFieldId) => void;
  video: ReferenceVideoCard;
}) {
  const title = getReferenceDisplayTitle(video);
  const href = getReferenceExternalHref(video.source) || "#brief-summary-reference-video";
  const isExternal = href.startsWith("http");
  const isGuess = field.confidence === "guess";

  return (
    <a
      className={`brief-written-slot hero brief-summary-reference-link ${isGuess ? "is-guess" : ""}`}
      href={href}
      rel={isExternal ? "noreferrer" : undefined}
      target={isExternal ? "_blank" : undefined}
      onClick={(event) => {
        if (!isGuess) {
          return;
        }

        event.preventDefault();
        onConfirm(field.id);
      }}
    >
      {title}
    </a>
  );
}

function BriefSummaryReferenceVideos({ videos }: { videos: ReferenceVideoCard[] }) {
  return (
    <div id="brief-summary-reference-video" className="brief-summary-reference-videos" aria-label="Reference videos">
      {videos.map((video, index) => (
        <BriefSummaryReferenceVideo video={video} index={index} key={video.id} />
      ))}
    </div>
  );
}

function BriefSummaryReferenceVideo({ index, video }: { index: number; video: ReferenceVideoCard }) {
  const embedUrl = getReferenceEmbedUrl(video.source);
  const videoUrl = getReferenceVideoUrl(video.source);
  const title = getReferenceDisplayTitle(video);

  return (
    <article className="brief-summary-reference-video" aria-label={`Reference video ${index + 1}: ${title}`}>
      <div className="brief-summary-reference-media">
        {embedUrl ? (
          <iframe
            title={title}
            src={embedUrl}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : videoUrl ? (
          <video controls preload="metadata" src={videoUrl} aria-label={title} />
        ) : (
          <div className="brief-summary-reference-placeholder">
            <DsIcon name="play" size={20} />
          </div>
        )}
      </div>
    </article>
  );
}

function BriefWrittenSlot({
  className,
  editingFieldId,
  editor,
  editTarget,
  field,
  label,
  missingLabel = label,
  onConfirm,
  onEdit,
  onStopEditing,
  value,
}: {
  className?: "hero" | "supporting";
  editingFieldId: BriefSummaryEditTarget | null;
  editor: ReactNode;
  editTarget: BriefSummaryEditTarget;
  field: BriefField;
  label: string;
  missingLabel?: string;
  onConfirm: (fieldId: BriefFieldId) => void;
  onEdit: (fieldId: BriefSummaryEditTarget) => void;
  onStopEditing: () => void;
  value: string;
}) {
  const isEditing = editingFieldId === editTarget;
  const isGuess = field.confidence === "guess";
  const isMissing = !value.trim();
  const editorRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!isEditing) {
      return;
    }

	    function handlePointerDown(event: PointerEvent) {
	      const target = event.target;
	
	      if (target instanceof Node && editorRef.current?.contains(target)) {
	        return;
	      }

	      if (target instanceof Element && target.closest(".brisk-select-menu")) {
	        return;
	      }
	
	      onStopEditing();
	    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        onStopEditing();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isEditing, onStopEditing]);

  if (isEditing) {
    return (
      <span className="brief-written-inline-editor" ref={editorRef}>
        {editor}
      </span>
    );
  }

  return (
    <button
      className={`brief-written-slot ${className ?? ""} ${isGuess ? "is-guess" : ""} ${isMissing ? "is-missing" : ""}`}
      type="button"
      aria-label={isMissing ? label : isGuess ? `Confirm ${label}` : `Edit ${label}`}
      onClick={() => {
        if (!isMissing && isGuess) {
          onConfirm(field.id);
          return;
        }

        onEdit(editTarget);
      }}
    >
      {value.trim() ? value : <BriefWrittenMissingControl label={missingLabel} />}
    </button>
  );
}

function BriefWrittenMissingControl({ label }: { label: string }) {
  return (
    <span className="brief-written-missing-control" aria-hidden="true">
      <DsIcon name="plus" size={12} />
      <span>{label}</span>
    </span>
  );
}

function createWrittenSummaryModel(
  fields: BriefFields,
  deliverableRows: DeliverableRow[],
  primaryDeliverable: DeliverableRow,
  studioName: string,
): WrittenSummaryModel {
  const videoTypes = parseMultiSelectValue(fields.videoType.value);
  const referenceVideos = parseReferenceVideos(fields.referenceVideos.value);
  const referenceVideo = referenceVideos[0];
  const audiences = parseAudienceList(fields.audience.value).filter(Boolean);
  const [footageChoices, shooterChoice, filmingContentChoices] = parseLiveFootageValue(fields.liveFootage.value);
  const platform = primaryDeliverable.platform || fields.platform.value;
  const deadlineValue = primaryDeliverable.deadline || fields.deadline.value;
  const deadline = formatBriefDate(deadlineValue);
  const shortDeadline = formatBriefShortDate(deadlineValue);
  const deadlineCountdown = formatDeadlineCountdown(deadlineValue);
  const duration = primaryDeliverable.duration === "Custom"
    ? formatCustomDuration(primaryDeliverable)
    : formatDurationLabel(primaryDeliverable.duration);
  const videoType = videoTypes.length > 0 ? videoTypes.join(" + ") : fields.videoType.value;
  const usesExistingFootage = footageChoices.includes("Use existing");
  const usesNewFootage = footageChoices.includes("Shoot new");
  const shootMode = usesExistingFootage && usesNewFootage
    ? "Existing and new footage"
    : usesNewFootage
      ? "New footage"
      : usesExistingFootage
        ? "Existing footage"
        : "";
  const shootModeDetail = usesNewFootage
    ? [
        filmingContentChoices.join(" + "),
        shooterChoice === "Studio shoots" ? `${studioName} shoots` : shooterChoice,
      ].filter(Boolean).join(" · ")
    : "Shoot mode";
  const footageSource = shootMode;
  const platformDisplay = formatPlatformForSentence(platform);
  const captionsState = formatDeliverableCaptionSummary(primaryDeliverable);
  const durationsJoined = deliverableRows
    .map((row) => (row.duration === "Custom" ? formatCustomDuration(row) : formatDurationLabel(row.duration)))
    .filter(Boolean)
    .join(" + ");
  const safeReferenceTitle = referenceVideo ? getReferenceDisplayTitle(referenceVideo) : "";

  return {
    audience: proseCase(joinWithAnd(audiences)),
    brandKit: fields.brandKit.value,
    brandKitProse: proseCase(fields.brandKit.value),
    callToAction: proseCase(getShortOptionLabel(fields.callToAction.value)),
    deadline,
    deadlineCountdown,
    deliverablesInline: formatDeliverablesInline(deliverableRows),
    duration,
    durationsJoined,
    platform: platformDisplay,
    referenceTitle: safeReferenceTitle,
    referenceUrl: referenceVideo?.source ?? "",
    shootMode,
    shootModeProse: sentenceCase(proseCase(shootMode)),
    footageSource,
    specGroups: [
      {
        label: "MAIN VIDEO",
        specs: [
          {
            id: "duration",
            confidence: fields.deliverables.confidence,
            value: duration,
            target: "deliverablesTiming",
          },
          {
            id: "platform",
            confidence: primaryDeliverable.platform ? fields.deliverables.confidence : fields.platform.confidence,
            value: platformDisplay,
            target: primaryDeliverable.platform ? "deliverablesTiming" : "videoType",
          },
          {
            id: "format",
            confidence: fields.deliverables.confidence,
            value: primaryDeliverable.format,
            target: "deliverablesTiming",
          },
          {
            id: "captions",
            confidence: fields.deliverables.confidence,
            value: captionsState,
            target: "deliverablesTiming",
          },
          {
            id: "deadline",
            confidence: primaryDeliverable.deadline ? fields.deliverables.confidence : fields.deadline.confidence,
            value: shortDeadline,
            target: "deadline",
          },
        ],
      },
      {
        label: "PRODUCTION",
        specs: [
          {
            id: "video-type",
            confidence: fields.videoType.confidence,
            value: videoType,
            target: "videoType",
          },
          {
            id: "shoot-mode",
            confidence: fields.liveFootage.confidence,
            value: shootMode,
            target: "contentProduction",
          },
          {
            id: "brand-kit",
            confidence: fields.brandKit.confidence,
            value: fields.brandKit.value,
            target: "brandKit",
          },
        ],
      },
    ],
    versionsLabel: `${deliverableRows.length} ${deliverableRows.length === 1 ? "version" : "versions"}`,
    videoType,
    videoTypeProse: proseCase(videoType),
  };
}

function getShortOptionLabel(value: string) {
  return value.split(" - ")[0]?.trim() ?? value;
}

function proseCase(value: string) {
  const preserveWords = new Set([
    "AI",
    "B2B",
    "Facebook",
    "Instagram",
    "LinkedIn",
    "Loom",
    "SRT",
    "TikTok",
    "TV",
    "X",
    "YouTube",
  ]);

  return value
    .split(/(\s+|\/)/)
    .map((part) => {
      if (!part.trim() || part === "/") {
        return part;
      }

      const cleanPart = part.replace(/[().,]/g, "");

      if (preserveWords.has(cleanPart) || /[A-Z].*[A-Z]/.test(cleanPart)) {
        return part;
      }

      return part.toLowerCase();
    })
    .join("");
}

function sentenceCase(value: string) {
  if (!value.trim()) {
    return "";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatBriefApprovalDate(date: Date) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function withBriefApprovalToast(href: string, scriptWriter: string) {
  const [pathWithQuery, hash] = href.split("#");
  const [path, queryString] = pathWithQuery.split("?");
  const params = new URLSearchParams(queryString);
  params.set("briefApproved", "1");
  params.set("scriptWriter", scriptWriter);
  const query = params.toString();
  return `${path}${query ? `?${query}` : ""}${hash ? `#${hash}` : ""}`;
}

function formatBriefShortDate(value: string) {
  const date = parseBriefDateValue(value);

  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(date);
}

function formatDeadlineCountdown(value: string) {
  const targetDate = parseBriefDateValue(value);

  if (!targetDate) {
    return "";
  }

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const targetStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const dayDifference = Math.round((targetStart.getTime() - todayStart.getTime()) / 86_400_000);

  if (dayDifference === 0) {
    return "today";
  }

  if (dayDifference === 1) {
    return "tomorrow";
  }

  if (dayDifference > 1) {
    return `${dayDifference} days away`;
  }

  if (dayDifference === -1) {
    return "yesterday";
  }

  return `${Math.abs(dayDifference)} days ago`;
}

function getSummaryMissingCount(fields: BriefFields, logline: Logline, studioName: string) {
  const deliverableRows = parseDeliverables(fields.deliverables.value, fields.deadline.value);
  const primaryDeliverable = deliverableRows[0] ?? createMainDeliverableRow(fields.deadline.value);
  const summaryModel = createWrittenSummaryModel(fields, deliverableRows, primaryDeliverable, studioName);

  return countSummaryMissingSlots(summaryModel, deliverableRows, fields, logline);
}

function countSummaryMissingSlots(
  model: WrittenSummaryModel,
  rows: DeliverableRow[],
  fields: BriefFields,
  _logline: Logline,
) {
  const loglineItems = [
    { field: fields.deliverables, value: model.duration },
    { field: fields.videoType, value: model.videoType },
    { field: fields.audience, value: model.audience },
    { field: fields.callToAction, value: model.callToAction },
    { field: fields.referenceVideos, value: model.referenceTitle },
  ];
  const detailItems = model.specGroups
    .flatMap((group) => group.specs)
    .filter((spec) => !["duration", "video-type"].includes(spec.id))
    .map((spec) => !spec.value.trim() || spec.confidence !== "confident");
  const deliverableItems = rows.filter((row) => !row.isMain).flatMap((row) => [
    row.name,
    row.platform,
    row.format === "Custom" ? row.customFormat : row.format,
    row.duration === "Custom" ? formatCustomDuration(row) : row.duration,
    formatDeliverableCaptionSummary(row),
  ]);

  return (
    [...loglineItems].filter(({ field, value }) => summaryValueNeedsConfirmation(value, field)).length +
    detailItems.filter(Boolean).length +
    deliverableItems.filter((value) => !value.trim() || value === "Custom").length
  );
}

function summaryValueNeedsConfirmation(value: string, field: BriefField) {
  return !value.trim() || field.confidence !== "confident";
}

function formatDeliverablesInline(rows: DeliverableRow[]) {
  const deliverableSummaries = rows.map((row) => {
    const platform = formatPlatformForSentence(row.platform);
    const format = row.customFormat || row.format;
    const duration = row.duration === "Custom" ? formatCustomDuration(row) : formatDurationLabel(row.duration);
    const captions = formatCaptionsForSentence(row);
    const details = [platform, duration, format.toLowerCase(), captions].filter(Boolean).join(", ");

    return `1× ${row.name} (${details})`;
  });

  return joinWithAnd(deliverableSummaries);
}

function joinWithAnd(items: string[]) {
  if (items.length <= 1) {
    return items[0] ?? "";
  }

  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }

  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function formatPlatformForSentence(value: string) {
  const cleanValue = value.replace(/\s+\(Main\)$/u, "");

  if (value === "YouTube (Main)") {
    return "YouTube";
  }

  if (value === "Instagram (Reels)") {
    return "Instagram";
  }

  return cleanValue;
}

function formatCaptionsForSentence(row: DeliverableRow) {
  const options = getDeliverableCaptionOptions(row);

  if (options.includes("None")) {
    return "captions off";
  }

  if (options.includes("SRT file") && options.includes("Baked in captions")) {
    return "SRT file and baked-in captions";
  }

  if (options.includes("SRT file")) {
    return "SRT file";
  }

  return "captions on";
}

function formatCustomDuration(row: DeliverableRow) {
  const minutes = row.customMinutes ? formatDurationPart(row.customMinutes, "min", "mins") : "";
  const seconds = row.customSeconds ? formatDurationPart(row.customSeconds, "sec", "secs") : "";

  return [minutes, seconds].filter(Boolean).join(" ") || "Custom";
}

function formatDurationLabel(value: string) {
  if (!value.trim() || value === "Custom") {
    return value;
  }

  return value
    .replace(/(\d+)m/gu, (_, amount: string) => formatDurationPart(amount, "min", "mins"))
    .replace(/(\d+)s/gu, (_, amount: string) => formatDurationPart(amount, "sec", "secs"));
}

function formatDurationModifier(value: string) {
  const trimmedValue = value.trim();
  const minutesAndSecondsMatch = trimmedValue.match(/^(\d+)\s+mins?\s+(\d+)\s+secs?$/u);

  if (minutesAndSecondsMatch) {
    return `${minutesAndSecondsMatch[1]}-minute ${minutesAndSecondsMatch[2]}-second`;
  }

  const minutesMatch = trimmedValue.match(/^(\d+)\s+mins?$/u);

  if (minutesMatch) {
    return `${minutesMatch[1]}-minute`;
  }

  const secondsMatch = trimmedValue.match(/^(\d+)\s+secs?$/u);

  if (secondsMatch) {
    return `${secondsMatch[1]}-second`;
  }

  return trimmedValue;
}

function formatDurationPart(amount: string, singular: string, plural: string) {
  return `${amount} ${amount === "1" ? singular : plural}`;
}

function BriefSummaryLogline({
  deliverableRows,
  editingFieldId,
  fields,
  logline,
  model,
  onChange,
  onConfirm,
  onEdit,
  onKeyDown,
  onStopEditing,
  primaryDeliverable,
}: {
  deliverableRows: DeliverableRow[];
  editingFieldId: BriefSummaryEditTarget | null;
  fields: BriefFields;
  logline: Logline;
  model: WrittenSummaryModel;
  onChange: (fieldId: BriefFieldId, value: string) => void;
  onConfirm: (fieldId: BriefFieldId) => void;
  onEdit: (fieldId: BriefSummaryEditTarget) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onStopEditing: () => void;
  primaryDeliverable: DeliverableRow;
}) {
  const referenceVideos = parseReferenceVideos(fields.referenceVideos.value).slice(0, 3);
  const referenceVideo = referenceVideos[0];
  const extraReferenceCount = Math.max(referenceVideos.length - 1, 0);
  const selectedVideoType = parseMultiSelectValue(fields.videoType.value)[0] ?? "";

  function updatePrimaryDeliverable(updates: Partial<DeliverableRow>) {
    const rows = deliverableRows.length > 0 ? deliverableRows : [primaryDeliverable];
    const nextRows = rows.map((row, index) => (index === 0 || row.isMain ? { ...row, ...updates } : row));

    onChange("deliverables", serialiseDeliverables(nextRows));
  }

  return (
    <section className="brief-summary-logline" aria-label="Logline">
      <BriefSummaryCardHead index="01" title="Logline" />
      <div className="brief-summary-logline-prose">
        <p>
          A{" "}
          <BriefWrittenSlot
            className="hero"
            editTarget="durationSlot"
            editingFieldId={editingFieldId}
            field={fields.deliverables}
            label="Duration"
            value={formatDurationModifier(model.duration)}
            onConfirm={onConfirm}
            onEdit={onEdit}
            onStopEditing={onStopEditing}
            editor={
              <BriefDeliverableDurationControl
                autoOpen
                row={primaryDeliverable}
                onChange={(updates) => {
                  updatePrimaryDeliverable(updates);

                  if (updates.duration !== "Custom") {
                    onStopEditing();
                  }
                }}
              />
            }
          />{" "}
          <BriefWrittenSlot
            className="hero"
            editTarget="videoType"
            editingFieldId={editingFieldId}
            field={fields.videoType}
            label="Video type"
            value={model.videoTypeProse}
            onConfirm={onConfirm}
            onEdit={onEdit}
            onStopEditing={onStopEditing}
            editor={
              <BriefInlineSelect
                autoOpen
                ariaLabel="Choose video type"
                options={briefVideoTypeDetails.map((videoType) => videoType.name)}
                placeholder="Choose video type"
                value={selectedVideoType}
                onChange={(value) => onChange("videoType", value)}
                onCommit={onStopEditing}
              />
            }
          />{" "}
          for{" "}
          <BriefWrittenSlot
            className="hero"
            editTarget="audience"
            editingFieldId={editingFieldId}
            field={fields.audience}
            label="Audience"
            value={model.audience}
            onConfirm={onConfirm}
            onEdit={onEdit}
            onStopEditing={onStopEditing}
            editor={
              <input
                autoFocus
                className="brief-summary-inline-input label-s"
                value={fields.audience.value}
                onBlur={onStopEditing}
                onChange={(event) => onChange("audience", event.target.value)}
                onKeyDown={onKeyDown}
              />
            }
          />
          {", designed to "}
          <BriefWrittenSlot
            className="hero"
            editTarget="callToAction"
            editingFieldId={editingFieldId}
            field={fields.callToAction}
            label="Goal"
            value={model.callToAction}
            onConfirm={onConfirm}
            onEdit={onEdit}
            onStopEditing={onStopEditing}
            editor={
              <BriefInlineSelect
                autoOpen
                ariaLabel="Choose call to action"
                getOptionLabel={getBriefCallToActionDisplayLabel}
                options={briefCallToActionOptions}
                placeholder="Choose call to action"
                value={fields.callToAction.value}
                onChange={(value) => onChange("callToAction", value)}
                onCommit={onStopEditing}
              />
            }
          />
          . Styled after{" "}
          {referenceVideo ? (
            <>
              <BriefSummaryReferenceLink field={fields.referenceVideos} onConfirm={onConfirm} video={referenceVideo} />
              {extraReferenceCount > 0
                ? ` and ${extraReferenceCount} more reference${extraReferenceCount === 1 ? "" : "s"}`
                : null}
            </>
          ) : (
            <BriefWrittenSlot
              className="hero"
              editTarget="referenceTitleSlot"
              editingFieldId={editingFieldId}
              field={fields.referenceVideos}
              label="Reference"
              value={model.referenceTitle}
              onConfirm={onConfirm}
              onEdit={onEdit}
              onStopEditing={onStopEditing}
              editor={
                <BriefReferenceVideosField
                  value={fields.referenceVideos.value}
                  onChange={(value) => onChange("referenceVideos", value)}
                />
              }
            />
          )}
          .
        </p>
        {referenceVideos.length > 0 ? <BriefSummaryReferenceVideos videos={referenceVideos} /> : null}
      </div>
    </section>
  );
}

function BriefSummaryStatusDot({
  label,
  onRegenerate,
  status,
}: {
  label: string;
  onRegenerate: () => void;
  status: ConfidenceState;
}) {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const statusLabel = status === "guess" ? "Uncertain" : confidenceChipLabels[status].label;

  function handleRegenerate() {
    setIsRegenerating(true);
    onRegenerate();
    window.setTimeout(() => setIsRegenerating(false), 420);
  }

  return (
    <BriefStatusDotControl
      isRegenerating={isRegenerating}
      label={label}
      onRegenerate={handleRegenerate}
      status={status}
      statusLabel={statusLabel}
    />
  );
}

function BriefStatusDotControl({
  isRegenerating,
  label,
  onEdit,
  onRegenerate,
  status,
  statusLabel,
}: {
  isRegenerating: boolean;
  label: string;
  onEdit?: () => void;
  onRegenerate: () => void;
  status: ConfidenceState;
  statusLabel: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const controlRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function closeOnPointerDown(event: PointerEvent) {
      const target = event.target;

      if (target instanceof Node && controlRef.current?.contains(target)) {
        return;
      }

      setIsOpen(false);
    }

    function closeOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeOnPointerDown, true);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnPointerDown, true);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <span className={`brief-status-dot-wrap ${isOpen ? "is-open" : ""}`} ref={controlRef}>
      <button
        className={`brief-status-dot confidence-${status} ${isRegenerating ? "is-regenerating" : ""}`}
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={`Open AI suggestion actions for ${label}. Currently ${statusLabel}.`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsOpen((currentValue) => !currentValue);
        }}
      >
        <DsIcon name="sparkle" size={12} />
      </button>
      <span className="brief-status-mini-tooltip label-xs-semibold" role="tooltip">
        AI suggestion
      </span>
      {isOpen ? (
        <span className="brief-status-popover" role="dialog" aria-label={`${label} AI suggestion`}>
          <span className="brief-status-popover-copy label-xs-semibold">Suggested from your brief</span>
          <span className="brief-status-popover-actions">
            {onEdit ? (
              <button
                className="brief-status-popover-action"
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setIsOpen(false);
                  onEdit();
                }}
              >
                <DsIcon name="pencil-simple" size={13} />
                <span>Change</span>
              </button>
            ) : null}
            <button
              className="brief-status-popover-action"
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setIsOpen(false);
                onRegenerate();
              }}
            >
              <span className={`brief-status-tooltip-icon ${isRegenerating ? "is-regenerating" : ""}`}>
                <DsIcon name="arrow-clockwise" size={14} />
              </span>
              <span>Try another</span>
            </button>
          </span>
        </span>
      ) : null}
    </span>
  );
}

function getSummaryLoglineConfidence(fields: BriefFields, model: WrittenSummaryModel, logline: Logline): ConfidenceState {
  const requiredValues = [
    model.duration,
    model.videoTypeProse,
    model.audience,
    model.callToAction,
    model.referenceTitle,
  ];

  if (requiredValues.some((value) => !value.trim())) {
    return "missing";
  }

  const sourceFields = [
    fields.deliverables,
    fields.videoType,
    fields.audience,
    fields.callToAction,
    fields.referenceVideos,
  ];

  if (logline.status === "out_of_sync" || sourceFields.some((field) => field.confidence === "guess")) {
    return "guess";
  }

  return "confident";
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
  onRegenerate,
}: {
  children: ReactNode;
  field: BriefField;
  label?: string;
  onConfirm: (fieldId: BriefFieldId) => void;
  onRegenerate: (fieldId: BriefFieldId) => void;
}) {
  const readFieldRef = useRef<HTMLDivElement | null>(null);

  function focusReadFieldControl() {
    onConfirm(field.id);
    const editableArea = Array.from(readFieldRef.current?.children ?? []).find(
      (child) => child instanceof HTMLElement && !child.classList.contains("brief-summary-field-label"),
    );

    activateBriefEditableControl(editableArea instanceof HTMLElement ? editableArea : readFieldRef.current);
  }

  return (
    <div data-search-brief-field={field.id} className="brief-summary-read-field" ref={readFieldRef}>
      <div className="brief-summary-field-label">
        <span className="label-s-semibold">{label ?? field.label}</span>
        <BriefFieldStatusDot field={field} onEdit={focusReadFieldControl} onRegenerate={onRegenerate} />
      </div>
      {children}
    </div>
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
  onRegenerate,
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
  onRegenerate: (fieldId: BriefFieldId) => void;
  onStopEditing: () => void;
}) {
  const isEditing = editingFieldId === field.id;

  return (
    <div data-search-brief-field={field.id} className="brief-summary-pair">
      <div className="brief-summary-pair-label">
        <span className="label-s-semibold">{label ?? field.label}</span>
        <BriefFieldStatusDot field={field} onEdit={() => onEdit(field.id)} onRegenerate={onRegenerate} />
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
      - Not set - <span>+ Add</span>
    </span>
  );
}

function BriefSummaryDeliverablesTable({
  editingCell,
  fallbackDeadline,
  onChange,
  onEditCell,
  primaryDeadline,
  value,
}: {
  editingCell: string | null;
  fallbackDeadline: string;
  onChange: (value: string) => void;
  onEditCell: (cellId: string | null) => void;
  primaryDeadline: string;
  value: string;
}) {
  const rows = parseDeliverables(value, fallbackDeadline);
  const additionalRows = rows.filter((row) => !row.isMain);

  function updateRows(nextRows: DeliverableRow[]) {
    onChange(serialiseDeliverables(nextRows));
  }

  function updateRow(rowId: string, updates: Partial<DeliverableRow>) {
    updateRows(rows.map((row) => (row.id === rowId ? { ...row, ...updates } : row)));
  }

  function addRow() {
    const rowNames = ["Platform cutdown", "Square cut", "Shorts cut", "Paid social cut"];
    const nextName = rowNames[additionalRows.length] ?? `Version ${additionalRows.length + 2}`;

    updateRows([...rows, createBlankDeliverableRow(nextName, "")]);
  }

  return (
    <div className="brief-summary-deliverables">
      {additionalRows.length > 0 ? (
        <>
          <table className="brief-deliverables-table brief-deliverables-table-summary brief-summary-version-table">
            <thead>
              <tr>
                <BriefDeliverablesHeader title="Deliverable" />
                <BriefDeliverablesHeader title="Duration" />
                <BriefDeliverablesHeader title="Deadline" />
                <BriefDeliverablesHeader title="Platform" />
                <BriefDeliverablesHeader title="Format" />
                <BriefDeliverablesHeader title="Captions" />
                <th aria-hidden="true" />
                <th aria-hidden="true" />
              </tr>
            </thead>
            <tbody>
              {additionalRows.map((row, index) => (
                <tr key={row.id}>
                  <td>
                    <span className="brief-summary-deliverable-name">
                      <span className="brief-summary-deliverable-number label-xs-semibold" aria-hidden="true">
                        {index + 1}
                      </span>
                      <span className="brief-deliverable-main-name label-s-semibold">{row.name}</span>
                    </span>
                  </td>
                  <td>
                    {editingCell === `${row.id}:duration` ? (
                      <BriefDeliverableDurationControl
                        autoOpen
                        row={row}
                        onChange={(updates) => {
                          updateRow(row.id, updates);
                          onEditCell(null);
                        }}
                      />
                    ) : (
                      <button
                        className={`brief-summary-static-chip label-xs-semibold ${row.duration ? "" : "is-missing"}`}
                        type="button"
                        onClick={() => onEditCell(`${row.id}:duration`)}
                      >
                        {row.duration ? formatDurationLabel(row.duration) : "+ Add duration"}
                      </button>
                    )}
                  </td>
                  <td>
                    <BriefSummaryDeadlineValue
                      isInherited={!row.deadline}
                      label={row.deadline ? formatBriefDate(row.deadline) : "Same as Main Video"}
                      value={row.deadline || primaryDeadline}
                      onChange={(deadline) => updateRow(row.id, { deadline })}
                    />
                  </td>
                  <td>
                    {editingCell === `${row.id}:platform` ? (
                      <BriefDeliverablePlatformSelect
                        autoOpen
                        value={row.platform}
                        onChange={(platform) => {
                          updateRow(row.id, { platform });
                          onEditCell(null);
                        }}
                      />
                    ) : (
                      <button
                        className={`brief-summary-static-chip label-xs-semibold ${row.platform ? "" : "is-missing"}`}
                        type="button"
                        onClick={() => onEditCell(`${row.id}:platform`)}
                      >
                        {row.platform ? formatPlatformForSentence(row.platform) : "+ Add platform"}
                      </button>
                    )}
                  </td>
                  <td>
                    {editingCell === `${row.id}:format` ? (
                      <BriefDeliverableFormatControl
                        autoOpen
                        row={row}
                        onChange={(updates) => {
                          updateRow(row.id, updates);
                          onEditCell(null);
                        }}
                      />
                    ) : (
                      <button
                        className={`brief-summary-static-chip label-xs-semibold ${row.format ? "" : "is-missing"}`}
                        type="button"
                        onClick={() => onEditCell(`${row.id}:format`)}
                      >
                        {row.format || "+ Add format"}
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
                  <td aria-hidden="true" />
                  <td aria-hidden="true" />
                </tr>
              ))}
            </tbody>
          </table>
          <Button size="S" variant="secondary" className="brief-add-version-button" type="button" onClick={addRow}>
            <DsIcon name="plus" size={14} />
            <span>Add version</span>
          </Button>
        </>
      ) : (
        <div className="brief-summary-empty-versions">
          <span className="label-s-semibold">No extra versions yet.</span>
          <Button size="S" variant="secondary" className="brief-add-version-button" type="button" onClick={addRow}>
            <DsIcon name="plus" size={14} />
            <span>Add cutdown</span>
          </Button>
          <span className="label-xs">Reels, square cut, or social ad?</span>
        </div>
      )}
    </div>
  );
}

function BriefSummaryDeadlineValue({
  isInherited,
  label,
  onChange,
  value,
}: {
  isInherited: boolean;
  label: string;
  onChange: (deadline: string) => void;
  value: string;
}) {
  return (
    <span className="brief-summary-deadline-value">
      <BriskDatePicker
        ariaLabel="Additional version deadline"
        displayLabel={label}
        isTertiary={isInherited}
        placeholder={label}
        value={value}
        variant="summary"
        onChange={onChange}
      />
    </span>
  );
}

function formatLiveFootageSummary(value: string) {
  const [footageChoices, shooterChoice, filmingContentChoices] = parseLiveFootageValue(value);
  const usesNewFootage = footageChoices.includes("Shoot new");
  const footageLabel = footageChoices
    .map((choice) => choice === "Use existing" ? "Existing footage" : "New footage")
    .join(" + ");

  return [
    footageLabel,
    usesNewFootage ? filmingContentChoices.join(" + ") : "",
    usesNewFootage ? shooterChoice : "",
  ].filter(Boolean).join(". ");
}

function formatVoiceoverSummary(value: string) {
  const [choice, sound, voice] = parseVoiceoverValue(value);

  if (choice !== "Yes") {
    return choice;
  }

  return [choice, sound, voice ? `${voice} (AI voice)` : ""].filter(Boolean).join(". ");
}

function getStepIdForField(fieldId: BriefFieldId): BriefStepId {
  if (fieldId === "videoType" || fieldId === "platform") {
    return "videoType";
  }

  if (fieldId === "purpose" || fieldId === "audience" || fieldId === "callToAction") {
    return "purposeAudience";
  }

  if (fieldId === "referenceVideos") {
    return "similarVideos";
  }

  if (fieldId === "brandKit") {
    return "brandKit";
  }

  if (fieldId === "liveFootage") {
    return "contentProduction";
  }

  if (fieldId === "deadline") {
    return "deadline";
  }

  if (fieldId === "deliverables") {
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
  return getClarifyingAnswerAfterQuestion(messages, briefClarifyingQuestions[0] ?? "");
}

function getClarifyingDescriptionNotes(messages: ChatMessage[]) {
  const descriptionQuestion =
    briefClarifyingQuestions.find((question) => {
      const normalisedQuestion = question.toLowerCase();

      return (
        normalisedQuestion.includes("must") ||
        normalisedQuestion.includes("include") ||
        normalisedQuestion.includes("avoid")
      );
    }) ??
    briefClarifyingQuestions[briefClarifyingQuestions.length - 1] ??
    "";

  return getClarifyingAnswerAfterQuestion(messages, descriptionQuestion);
}

function getClarifyingAnswerAfterQuestion(messages: ChatMessage[], question: string) {
  if (!question.trim()) {
    return "";
  }

  const questionIndex = messages.findIndex((message) => message.role === "ai" && message.body.includes(question));

  if (questionIndex === -1) {
    return "";
  }

  const answer = messages.slice(questionIndex + 1).find((message) => message.role === "client");

  return answer?.body.trim() ?? "";
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
    createdAt: "Just now",
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

  return sentenceCase(`${workingTitle} is a ${videoType.toLowerCase()} that ${trimmedDescription.charAt(0).toLowerCase()}${trimmedDescription.slice(1)}`);
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
