"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { RequestReviewRecipient } from "@/components/share/RequestReviewModal";
import { useClientAccountSettings } from "@/components/settings/ClientAccountSettingsContext";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { useNotificationInbox } from "@/components/notifications/NotificationInboxContext";
import { DsIcon } from "@/components/video-review/DsIcon";
import { getAcceptedPerson } from "@/data/active-videos/teamDefaults";
import { getProjectFixture } from "@/data/project-fixtures";
import { defaultSubmitMessage, formatMentionedPeople, mentionedProjectMembers, type SubmitDestination } from "@/data/submit-review";
import { readCustomerMessageTemplateContext } from "@/data/notification-templates";
import { appendSharedReviewActivity, readSharedReviewActivity, sharedReviewActivityStorageKey, type SharedReviewActivity } from "@/data/share-review-activity";
import {
  formatReviewRequestMessage,
  getReviewRequestMessageStorageKey,
  readReviewRequestMessageTemplate,
} from "@/data/review-request-message";

export type ShareStageContext = "project" | "brief" | "script" | "shoot" | "storyboard" | "media" | "edit" | "masters";
export type ShareDensity = "comfortable" | "compact";
export type SharePresentation = "row" | "overflow" | "brief-summary";
export type ShareUserRole = "Studio Staff" | "Studio Freelancer" | "Customer" | "Share Link Viewer";
export type ShareLinkOpens = "stageOnly" | "wholeProject" | "videoOnly";
export type ShareAccess = "viewOnly" | "canComment" | "canEdit";

function textPointAtOffset(editor: HTMLElement, offset: number) {
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  let remaining = offset;
  let node = walker.nextNode();
  while (node) {
    const length = node.textContent?.length ?? 0;
    if (remaining <= length) return { node, offset: remaining };
    remaining -= length;
    node = walker.nextNode();
  }
  return { node: editor as Node, offset: editor.childNodes.length };
}

export type StageApprovalControlProps = {
  stageLabel: string;
  userRole: ShareUserRole;
  isApproved: boolean;
  onApprove: () => void;
  onUnapprove: () => void;
  approveLabel?: string;
  approveButtonVariant?: "primary" | "secondary";
  approvedLabel?: string;
  approvedClassName?: string;
  approvedTextClassName?: string;
  approvedAt?: string;
  approvedBy?: string;
  tooltip?: string;
  customerName?: string;
  disabled?: boolean;
  disabledTooltip?: string;
  allowRoleApproval?: boolean;
};

export type ShareActionRowProps = {
  context: ShareStageContext;
  userRole: ShareUserRole;
  density?: ShareDensity;
  presentation?: SharePresentation;
  briefControls?: boolean;
  allowProjectScope?: boolean;
  scopeType?: "project" | "stage" | "version" | "item" | "selection";
  shareTitle?: string;
  openPanelSignal?: number;
  sendLabel?: string;
  sendButtonVariant?: "primary" | "secondary";
  sendCompanyName?: string;
  waitingOnCompany?: string;
  isWaitingOnReview?: boolean;
  pendingReviewDetails?: {
    requestedBy: string;
    requestedAt: string;
    recipients: readonly string[];
    lastSentAt: string;
    lastSentKind: "request" | "reminder" | "updated";
    hasChanged: boolean;
    onSendReminder: (message: string) => void;
    onSendUpdated: (message: string) => void;
  };
  reviewScopeKey?: string;
  reviewFingerprint?: string;
  reviewRecipients?: readonly string[];
  sendChangesProjectStatus?: boolean;
  sendMessageEnabled?: boolean;
  onSend?: (message: string) => void;
  onSubmit?: (destination: SubmitDestination, message: string, notifiedPeople: readonly string[]) => void;
  initialLinkOpens?: ShareLinkOpens;
  initialAccess?: ShareAccess;
  onAccessChange?: (access: ShareAccess) => void;
  projectId?: string;
  projectName?: string;
  studioName?: string;
  customerName?: string;
  onApprove?: () => void;
  onUnapprove?: () => void;
  onSendToStudio?: (message: string) => void;
  onRequestReview?: (recipient: RequestReviewRecipient, message: string) => void;
  isApproved?: boolean;
  showApprove?: boolean;
  showCopyLink?: boolean;
  showSend?: boolean;
  sendDisabled?: boolean;
  sendDisabledTooltip?: string;
  copyLinkIconOnly?: boolean;
  copyLinkLabel?: string;
  disabled?: boolean;
  disabledTooltip?: string;
  approveLabel?: string;
  approveDisabled?: boolean;
  approveDisabledTooltip?: string;
  approvedAt?: string;
  approvedBy?: string;
  allowRoleApproval?: boolean;
  canConfigureLink?: boolean;
  shareUrl?: string;
  stageLabelOverride?: string;
  beforeAction?: (action: "copy" | "send" | "approve", proceed: () => void) => void;
};

type ExpandedSection = "access";

const stageLabels: Record<ShareStageContext, string> = {
  project: "Project",
  brief: "Brief",
  script: "Script",
  shoot: "Shoot",
  storyboard: "Storyboard",
  media: "Media",
  edit: "Edit",
  masters: "Masters",
};

const accessLabels: Record<ShareAccess, string> = {
  viewOnly: "View only",
  canComment: "Can comment",
  canEdit: "Can edit",
};

function formatReviewSentAge(value: string, now: number) {
  const elapsedHours = Math.max(0, Math.floor((now - new Date(value).getTime()) / (60 * 60 * 1000)));
  if (elapsedHours < 1) return "Sent just now";
  if (elapsedHours < 24) return `Sent ${elapsedHours} ${elapsedHours === 1 ? "hour" : "hours"} ago`;
  const days = Math.floor(elapsedHours / 24);
  return `Sent ${days} ${days === 1 ? "day" : "days"} ago`;
}

function formatReviewRequestDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

export function ShareActionRow({
  context,
  userRole,
  density = "comfortable",
  presentation = "row",
  briefControls = false,
  allowProjectScope = false,
  scopeType,
  shareTitle,
  openPanelSignal = 0,
  sendLabel,
  sendButtonVariant,
  sendCompanyName,
  waitingOnCompany,
  isWaitingOnReview = false,
  pendingReviewDetails: providedPendingReviewDetails,
  reviewScopeKey,
  reviewFingerprint,
  reviewRecipients,
  sendChangesProjectStatus,
  sendMessageEnabled = false,
  onSend,
  onSubmit,
  initialAccess = "viewOnly",
  onAccessChange,
  projectId,
  projectName = "Launch Film - Sales Narrative",
  studioName = "Brisk Studios",
  customerName = "Avery Taylor",
  onApprove,
  onUnapprove,
  onSendToStudio,
  onRequestReview,
  isApproved = false,
  showApprove = true,
  showCopyLink = true,
  showSend: showSendProp,
  sendDisabled = false,
  sendDisabledTooltip,
  copyLinkIconOnly = false,
  copyLinkLabel = "Share",
  disabled = false,
  disabledTooltip,
  approveLabel = "Approve",
  approveDisabled = false,
  approveDisabledTooltip,
  approvedAt = "17 Aug",
  approvedBy,
  allowRoleApproval = false,
  canConfigureLink = true,
  shareUrl,
  stageLabelOverride,
  beforeAction,
}: ShareActionRowProps) {
  const { account, access: clientAccountAccess, buildHref } = useClientAccountSettings();
  const { state: prototypeState } = usePrototypeState();
  const { publishStageReviewFollowUp } = useNotificationInbox();
  const sendMessageId = useId();
  const mentionPickerId = useId();
  const sendMessageRef = useRef<HTMLDivElement>(null);
  const savedMentionRangeRef = useRef<Range | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const overflowMenuRef = useRef<HTMLDetailsElement>(null);
  const copyToastTimeoutRef = useRef<number | null>(null);
  const reviewToastTimeoutRef = useRef<number | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const [isSendConfirmationOpen, setIsSendConfirmationOpen] = useState(false);
  const [followUpKind, setFollowUpKind] = useState<"reminder" | "updated" | null>(null);
  const [sendMessage, setSendMessage] = useState("");
  const [selectedDestination, setSelectedDestination] = useState<SubmitDestination>(userRole === "Customer" ? "studio" : "customer");
  const [mentionCursor, setMentionCursor] = useState<number | null>(null);
  const [mentionPickerMode, setMentionPickerMode] = useState<"helper" | "typing" | null>(null);
  const [reviewClock, setReviewClock] = useState(() => Date.now());
  const [expandedSections, setExpandedSections] = useState<ExpandedSection[]>(["access"]);
  const [access, setAccess] = useState<ShareAccess>(initialAccess);
  const [projectAccess, setProjectAccess] = useState<ShareAccess>("viewOnly");
  const [selectedLinkScope, setSelectedLinkScope] = useState<"current" | "project">("current");
  const [hasCopied, setHasCopied] = useState(false);
  const [reviewToastMessage, setReviewToastMessage] = useState("");
  const [sharedReviewActivity, setSharedReviewActivity] = useState<SharedReviewActivity[]>([]);
  const stageLabel = stageLabelOverride ?? stageLabels[context];
  const isCustomerView = userRole === "Customer";
  const isStudioFreelancer = userRole === "Studio Freelancer";
  const resolvedSendCompanyName = sendCompanyName ?? (isCustomerView || isStudioFreelancer ? studioName : customerName);
  const showSend = showSendProp ?? true;
  const resolvedScopeType = scopeType ?? (context === "project" ? "project" : context === "edit" ? "version" : "stage");
  const resolvedShareTitle = shareTitle ?? (resolvedScopeType === "project" ? projectName : stageLabel);
  const sharedActivityKey = projectId ? sharedReviewActivityStorageKey(prototypeState.session.activeWorkspaceId, projectId) : null;
  const currentReviewScopeKey = reviewScopeKey ?? `${context}:${resolvedShareTitle}`;
  const recipientClient = prototypeState.clients.find((client) => client.id === prototypeState.projects.find((item) => item.id === projectId)?.clientId);
  const projectTeam = projectId ? getProjectFixture(projectId)?.team ?? [] : [];
  const assignedStudioMembers = [...new Set(projectTeam.map(getAcceptedPerson)
    .filter((person) => person?.personType === "Studio Staff")
    .map((person) => person?.name ?? ""))].filter(Boolean);
  const studioMembers = assignedStudioMembers.length ? assignedStudioMembers
    : prototypeState.users.filter((user) => user.workspaceId === prototypeState.session.activeWorkspaceId && user.role === "Studio Staff").map((user) => user.name);
  const clientMembers = recipientClient?.contacts.filter((contact) => contact.portalAccess !== "Paused" && (!projectId || contact.projectIds.includes(projectId))).map((contact) => contact.name) ?? [];
  const reviewActor = isCustomerView ? account.profile.fullName || clientMembers[0] || customerName
    : prototypeState.users.find((user) => user.id === prototypeState.session.activeUserId)?.name ?? studioName;
  const membersForDestination = (destination: SubmitDestination) => (destination === "studio" ? studioMembers : clientMembers).filter((name) => name !== reviewActor);
  const resolvedReviewRecipients = reviewRecipients ?? membersForDestination(resolvedSendCompanyName === studioName ? "studio" : "customer");
  const sendsStageForReview = sendChangesProjectStatus ?? !["project", "media", "masters"].includes(context);
  const defaultDestination: SubmitDestination = isCustomerView || isStudioFreelancer ? "studio" : "customer";
  const submitCompanyName = selectedDestination === "studio" ? studioName : customerName;
  const currentReviewCompanyName = isWaitingOnReview && waitingOnCompany ? waitingOnCompany : resolvedSendCompanyName;
  const submitActionLabel = `Send ${stageLabel}`;
  const submitMembers = membersForDestination(selectedDestination);
  const mentionedMembers = mentionedProjectMembers(sendMessage, submitMembers);
  const notifiedMembers = mentionedMembers.length ? mentionedMembers : submitMembers;
  const mentionMatch = mentionPickerMode === "typing" ? sendMessage.slice(0, mentionCursor ?? sendMessage.length).match(/@([\p{L}\p{N}'-]*(?: [\p{L}\p{N}'-]*)*)$/u) : null;
  const mentionSuggestions = mentionPickerMode ? submitMembers.filter((name) => (mentionPickerMode === "helper" || Boolean(mentionMatch && name.toLowerCase().includes(mentionMatch[1].toLowerCase()))) && !mentionedMembers.includes(name)) : [];

  useEffect(() => {
    if (!isSendConfirmationOpen || followUpKind || !sendsStageForReview || !sendMessageRef.current) return;
    sendMessageRef.current.textContent = sendMessage;
    savedMentionRangeRef.current = null;
  }, [isSendConfirmationOpen, selectedDestination, followUpKind, sendsStageForReview]);
  const reviewSubject = resolvedScopeType === "version" ? resolvedShareTitle : stageLabel;
  const reviewSubjectTitle = resolvedScopeType === "version" ? resolvedShareTitle : stageLabel;
  const submitMessageFor = (destination: SubmitDestination) => {
    if (destination === "customer" && userRole === "Studio Staff" && context === "brief") {
      return readCustomerMessageTemplateContext("brief-review", {
        projectName,
        stageName: reviewSubjectTitle,
        studioName,
        firstName: customerName.split(" ")[0],
      });
    }
    if (isCustomerView) return defaultSubmitMessage(reviewSubjectTitle, projectName, destination);
    const storageKey = getReviewRequestMessageStorageKey({
      workspaceId: prototypeState.session.activeWorkspaceId,
      clientId: prototypeState.session.activeClientId,
      userId: prototypeState.session.activeUserId,
      role: userRole === "Share Link Viewer" ? "Customer" : userRole,
      destination,
    });
    return formatReviewRequestMessage(readReviewRequestMessageTemplate(storageKey, destination), reviewSubjectTitle, projectName);
  };
  const reviewMessageSettingsHref = "/settings/notifications/templates?message=brief-review";
  const reminderMessageSettingsHref = "/settings/notifications/templates?message=brief-reminder";
  const resolvedSendLabel = sendLabel ?? (sendsStageForReview
    ? `Ask ${resolvedSendCompanyName} to review ${reviewSubject}`
    : `${resolvedScopeType === "version" ? `Send ${resolvedShareTitle}` : resolvedScopeType === "stage" ? `Send ${stageLabel}` : "Send"} to ${resolvedSendCompanyName}`);
  const sharedRequest = [...sharedReviewActivity].reverse().find((entry) => entry.action === "sent" && entry.scopeKey === currentReviewScopeKey && entry.company === currentReviewCompanyName);
  const sharedFollowUps = sharedRequest ? sharedReviewActivity.filter((entry) => entry.requestId === sharedRequest.id && (entry.action === "reminded" || entry.action === "updated")) : [];
  const sharedLastContact = sharedFollowUps.at(-1) ?? sharedRequest;
  const appendReviewActivity = (action: SharedReviewActivity["action"], message: string, requestId?: string, company = currentReviewCompanyName, recipients: readonly string[] = resolvedReviewRecipients) => {
    if (!sharedActivityKey || !projectId || context === "project" || context === "brief" || context === "masters") return;
    const occurredAt = new Date().toISOString();
    const id = `${context}-${action}-${projectId}-${occurredAt}`;
    const entry: SharedReviewActivity = {
      id,
      requestId: requestId ?? id,
      action,
      actor: reviewActor,
      company,
      recipients: [...recipients],
      occurredAt,
      scopeKey: currentReviewScopeKey,
      scopeLabel: reviewSubjectTitle,
      stage: context,
      href: shareUrl ?? `/projects/${projectId}/stages/${context}`,
      message,
      fingerprint: reviewFingerprint,
    };
    setSharedReviewActivity(appendSharedReviewActivity(sharedActivityKey, entry));
    if (sendsStageForReview && context !== "media" && recipients.length > 0) {
      publishStageReviewFollowUp({
        projectId,
        projectName,
        stage: context,
        targetLabel: reviewSubjectTitle,
        actorName: reviewActor,
        recipientRole: company === studioName ? "Studio Staff" : "Customer",
        reviewers: recipients,
        href: entry.href,
        message,
        kind: action === "sent" ? "request" : action === "reminded" ? "reminder" : "updated",
        occurredAt,
      });
    }
  };
  const pendingReviewDetails = providedPendingReviewDetails ?? (sharedRequest && sharedLastContact ? {
    requestedBy: sharedRequest.actor,
    requestedAt: sharedRequest.occurredAt,
    recipients: sharedRequest.recipients,
    lastSentAt: sharedLastContact.occurredAt,
    lastSentKind: sharedLastContact.action === "reminded" ? "reminder" as const : sharedLastContact.action === "updated" ? "updated" as const : "request" as const,
    hasChanged: Boolean(reviewFingerprint && (sharedFollowUps.findLast((entry) => entry.action === "updated") ?? sharedRequest).fingerprint !== reviewFingerprint),
    onSendReminder: (message: string) => appendReviewActivity("reminded", message, sharedRequest.id, sharedRequest.company, sharedRequest.recipients),
    onSendUpdated: (message: string) => appendReviewActivity("updated", message, sharedRequest.id, sharedRequest.company, sharedRequest.recipients),
  } : undefined);
  const displayedSendLabel = isWaitingOnReview ? `Waiting on ${currentReviewCompanyName}` : sendsStageForReview ? submitActionLabel : resolvedSendLabel;
  const canOpenReviewDetails = isWaitingOnReview && Boolean(pendingReviewDetails);
  const showReminderPrompt = Boolean(canOpenReviewDetails && pendingReviewDetails && reviewClock - new Date(pendingReviewDetails.lastSentAt).getTime() >= 24 * 60 * 60 * 1000);
  const lastSentLabel = pendingReviewDetails ? formatReviewSentAge(pendingReviewDetails.lastSentAt, reviewClock) : "";
  const waitingTooltip = canOpenReviewDetails ? `${lastSentLabel}. Send reminder to ${currentReviewCompanyName}.` : undefined;
  const submitTooltip = isStudioFreelancer
    ? `Send to ${studioName} for review.`
    : `Choose who to send this to for review: ${isCustomerView ? studioName : customerName} or your team.`;
  const sendTooltip = isWaitingOnReview ? waitingTooltip : sendsStageForReview ? submitTooltip : undefined;

  useEffect(() => {
    const refresh = () => setSharedReviewActivity(sharedActivityKey ? readSharedReviewActivity(sharedActivityKey) : []);
    refresh();
    window.addEventListener("brisk:shared-review-activity-updated", refresh);
    return () => window.removeEventListener("brisk:shared-review-activity-updated", refresh);
  }, [sharedActivityKey]);
  const sharedProjectId = projectId ?? shareUrl?.match(/\/projects\/([^/?#]+)/)?.[1];
  const canChooseProjectScope = allowProjectScope && (resolvedScopeType === "stage" || resolvedScopeType === "version") && Boolean(sharedProjectId);
  const linkScopeType = canChooseProjectScope && selectedLinkScope === "project" ? "project" : resolvedScopeType;
  const linkScopeTitle = linkScopeType === "project"
    ? "Project"
    : linkScopeType === "selection"
    ? "Selected files"
    : linkScopeType === "stage"
    ? stageLabel
    : resolvedShareTitle;
  const linkScopeSubject = linkScopeType === "project"
    ? "the whole project"
    : linkScopeType === "selection"
    ? "these selected files"
    : `the ${resolvedShareTitle}`;
  const selectedAccess = canChooseProjectScope && selectedLinkScope === "project" ? projectAccess : access;
  const linkAccess = selectedAccess;
  const linkAccessVerb = linkAccess === "canEdit" ? "edit" : linkAccess === "canComment" ? "comment on" : "open";
  const copyLinkActionLabel = linkScopeType === "project"
    ? "Copy project link"
    : linkScopeType === "selection"
    ? "Copy selected files link"
    : `Copy ${linkScopeTitle} link`;
  const clientTeamWithAccess = account.team.filter((member) => member.status === "Active" && sharedProjectId && member.projectIds.includes(sharedProjectId));
  const canManageClientTeam = isCustomerView && clientAccountAccess.role === "Client Admin";

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsPopoverOpen(false);
        overflowMenuRef.current?.removeAttribute("open");
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  useEffect(() => {
    if (!canOpenReviewDetails) return;
    const clock = window.setInterval(() => setReviewClock(Date.now()), 60_000);
    return () => window.clearInterval(clock);
  }, [canOpenReviewDetails]);

  useEffect(() => {
    if (openPanelSignal > 0) {
      setSelectedLinkScope("current");
      setHasCopied(false);
      setIsPopoverOpen(true);
    }
  }, [openPanelSignal]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsPopoverOpen(false);
      setIsSendConfirmationOpen(false);
      overflowMenuRef.current?.removeAttribute("open");
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    return () => {
      if (copyToastTimeoutRef.current) {
        window.clearTimeout(copyToastTimeoutRef.current);
      }

      if (reviewToastTimeoutRef.current) {
        window.clearTimeout(reviewToastTimeoutRef.current);
      }
    };
  }, []);

  const copyLink = async () => {
    const targetUrl = linkScopeType === "project" && canChooseProjectScope
      ? `/projects/${sharedProjectId}`
      : shareUrl ?? window.location.href;
    const resolvedShareUrl = new URL(targetUrl, window.location.origin);
    resolvedShareUrl.searchParams.set("shareScope", linkScopeType);
    resolvedShareUrl.searchParams.set("linkAccess", linkAccess);

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(resolvedShareUrl.toString());
      }
    } catch {
      // Prototype-only: keep the happy-path feedback visible if browser clipboard access is blocked.
    }

    setHasCopied(true);

    if (copyToastTimeoutRef.current) {
      window.clearTimeout(copyToastTimeoutRef.current);
    }

    copyToastTimeoutRef.current = window.setTimeout(() => {
      setHasCopied(false);
    }, 2200);

    showActionToast("Copied");
  };

  const runAction = (action: "copy" | "send" | "approve", proceed: () => void) => {
    if (beforeAction) {
      beforeAction(action, proceed);
      return;
    }
    proceed();
  };

  const showActionToast = (message: string) => {
    setReviewToastMessage(message);

    if (reviewToastTimeoutRef.current) {
      window.clearTimeout(reviewToastTimeoutRef.current);
    }

    reviewToastTimeoutRef.current = window.setTimeout(() => {
      setReviewToastMessage("");
    }, 2600);
  };

  const performSend = () => {
    setIsPopoverOpen(false);
    setIsSendConfirmationOpen(false);
    if (followUpKind && pendingReviewDetails && isWaitingOnReview) {
      if (followUpKind === "updated") {
        pendingReviewDetails.onSendUpdated(sendMessage.trim());
        showActionToast(`Updated ${reviewSubjectTitle} sent`);
      } else {
        pendingReviewDetails.onSendReminder(sendMessage.trim());
        showActionToast(`Reminder sent to ${pendingReviewDetails.recipients.join(", ") || resolvedSendCompanyName} ✓`);
      }
      setFollowUpKind(null);
      return;
    }
    if (sendsStageForReview) {
      if (onSubmit) onSubmit(selectedDestination, sendMessage.trim(), notifiedMembers);
      else if (onRequestReview) onRequestReview(selectedDestination, sendMessage.trim());
      else if (selectedDestination === "studio") onSendToStudio?.(sendMessage.trim());
      else onSend?.(sendMessage.trim());
      if (!providedPendingReviewDetails && context !== "brief") appendReviewActivity("sent", sendMessage.trim(), undefined, submitCompanyName, notifiedMembers);
      showActionToast(`Sent ${reviewSubject} to ${submitCompanyName}`);
    } else {
      onSend?.(sendMessage.trim());
      showActionToast(`Sent to ${resolvedSendCompanyName}`);
    }
  };

  const approveProject = () => {
    setIsPopoverOpen(false);
    setIsSendConfirmationOpen(false);
    if (onApprove) {
      onApprove();
      return;
    }

    showActionToast("Approved");
  };

  const unapproveProject = () => {
    setIsPopoverOpen(false);
    setIsSendConfirmationOpen(false);
    if (onUnapprove) onUnapprove();
    else showActionToast("Approval removed");
  };

  const closeOverflowMenu = () => {
    overflowMenuRef.current?.removeAttribute("open");
  };

  const openCopyLinkSettings = () => {
    closeOverflowMenu();
    setSelectedLinkScope("current");
    setHasCopied(false);
    setIsPopoverOpen(true);
  };

  const toggleCopyLinkSettings = () => {
    if (!isPopoverOpen) {
      setSelectedLinkScope("current");
      setHasCopied(false);
    }
    setIsPopoverOpen((isOpen) => !isOpen);
  };

  const requestSend = () => {
    closeOverflowMenu();
    setIsPopoverOpen(false);
    setMentionPickerMode(null);
    if (canOpenReviewDetails) {
      setReviewClock(Date.now());
      setFollowUpKind(pendingReviewDetails?.hasChanged ? "updated" : "reminder");
      setSendMessage(pendingReviewDetails?.hasChanged
        ? `Please review the updated ${reviewSubjectTitle} for ${projectName} and share any feedback.`
        : userRole === "Studio Staff" && context === "brief"
          ? readCustomerMessageTemplateContext("brief-reminder", {
            projectName,
            stageName: reviewSubjectTitle,
            studioName,
            firstName: customerName.split(" ")[0],
          })
          : `Just a reminder to review the ${reviewSubjectTitle} for ${projectName} and share any feedback.`);
      setIsSendConfirmationOpen(true);
      return;
    }
    runAction("send", () => {
      setFollowUpKind(null);
      if (sendsStageForReview) {
        setSelectedDestination(defaultDestination);
        setMentionCursor(null);
        setSendMessage(submitMessageFor(defaultDestination));
      }
      setIsSendConfirmationOpen(true);
    });
  };

  const currentEditorRange = () => {
    const editor = sendMessageRef.current;
    if (!editor) return null;
    const selection = window.getSelection();
    if (selection?.rangeCount && editor.contains(selection.anchorNode)) return selection.getRangeAt(0).cloneRange();
    if (savedMentionRangeRef.current && editor.contains(savedMentionRangeRef.current.startContainer)) return savedMentionRangeRef.current.cloneRange();
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    return range;
  };

  const updateSubmitMessage = () => {
    const editor = sendMessageRef.current;
    const range = currentEditorRange();
    if (!editor || !range) return;
    savedMentionRangeRef.current = range.cloneRange();
    const value = editor.textContent ?? "";
    const beforeRange = range.cloneRange();
    beforeRange.selectNodeContents(editor);
    beforeRange.setEnd(range.startContainer, range.startOffset);
    const cursor = beforeRange.toString().length;
    setSendMessage(value);
    setMentionCursor(cursor);
    const match = value.slice(0, cursor).match(/@([\p{L}\p{N}'-]*(?: [\p{L}\p{N}'-]*)*)$/u);
    const query = match?.[1];
    const completed = query !== undefined && submitMembers.some((name) => query === name || query.startsWith(`${name} `));
    setMentionPickerMode(match && !completed ? "typing" : null);
  };

  const insertPlainText = (text: string) => {
    const editor = sendMessageRef.current;
    const range = currentEditorRange();
    if (!editor || !range) return;
    const available = Math.max(0, 240 - (editor.textContent?.length ?? 0) + range.toString().length);
    const insertion = text.slice(0, available);
    if (!insertion) return;
    range.deleteContents();
    const node = document.createTextNode(insertion);
    range.insertNode(node);
    range.setStart(node, node.length);
    range.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    savedMentionRangeRef.current = range.cloneRange();
    updateSubmitMessage();
  };

  const insertMention = (name: string) => {
    const editor = sendMessageRef.current;
    const range = currentEditorRange();
    if (!editor || !range) return;
    const cursor = mentionCursor ?? sendMessage.length;
    const match = mentionPickerMode === "typing" ? sendMessage.slice(0, cursor).match(/@([\p{L}\p{N}'-]*(?: [\p{L}\p{N}'-]*)*)$/u) : null;
    const start = cursor - (match?.[0].length ?? 0);
    const before = sendMessage.slice(0, start);
    const after = sendMessage.slice(cursor);
    const prefix = !match && before && !/\s$/u.test(before) ? " " : "";
    const suffix = after && /^\s/u.test(after) ? "" : " ";
    const inserted = `${prefix}@${name}${suffix}`;
    const nextMessage = `${before}${inserted}${after}`;
    if (nextMessage.length > 240) return;

    if (match) {
      const startPoint = textPointAtOffset(editor, start);
      range.setStart(startPoint.node, startPoint.offset);
    }
    range.deleteContents();
    const fragment = document.createDocumentFragment();
    if (prefix) fragment.append(document.createTextNode(prefix));
    const mention = document.createElement("span");
    mention.className = "share-submit-mention";
    mention.contentEditable = "false";
    mention.dataset.mention = name;
    mention.textContent = `@${name}`;
    fragment.append(mention);
    const space = suffix ? document.createTextNode(suffix) : null;
    if (space) fragment.append(space);
    range.insertNode(fragment);
    if (space) range.setStart(space, space.length);
    else range.setStartAfter(mention);
    range.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    savedMentionRangeRef.current = range.cloneRange();
    setSendMessage(nextMessage);
    setMentionCursor(before.length + inserted.length);
    setMentionPickerMode(null);
    editor.focus();
  };

  const changeApproval = () => {
    closeOverflowMenu();
    setIsPopoverOpen(false);
    if (isApproved) {
      unapproveProject();
      return;
    }
    runAction("approve", approveProject);
  };

  const toggleSection = (section: ExpandedSection) => {
    setExpandedSections((currentSections) =>
      currentSections.includes(section)
        ? currentSections.filter((currentSection) => currentSection !== section)
        : [...currentSections, section],
    );
  };

  const selectAccess = (nextAccess: ShareAccess) => {
    setHasCopied(false);
    if (canChooseProjectScope && selectedLinkScope === "project") {
      setProjectAccess(nextAccess);
      return;
    }
    setAccess(nextAccess);
    onAccessChange?.(nextAccess);
  };

  return (
    <div className={`share-action-row share-density-${density} ${presentation === "overflow" ? "is-overflow" : ""} ${briefControls ? "is-brief-controls" : ""} ${presentation === "brief-summary" ? "is-brief-summary" : ""}`} ref={rootRef}>
      {presentation === "overflow" ? (
        <details className="app-global-shoot-actions" ref={overflowMenuRef} onToggle={(event) => { setIsOverflowOpen(event.currentTarget.open); if (event.currentTarget.open) setIsPopoverOpen(false); }}>
          <summary className="app-global-action-button" aria-label={briefControls ? "Brief actions" : `${stageLabel} actions`} aria-haspopup="menu" aria-expanded={isOverflowOpen} data-tooltip={briefControls ? "Brief actions" : `${stageLabel} actions`}>
            <DsIcon name="share-network" size={20} />
          </summary>
          {briefControls && isOverflowOpen ? <button className="share-brief-actions-backdrop" type="button" aria-label="Close Brief actions" onClick={closeOverflowMenu} /> : null}
          <div role="menu" aria-label={briefControls ? "Brief actions" : `${stageLabel} actions`}>
            {briefControls ? <div className="share-brief-actions-heading">
              <span className="headings-xs-bold">Brief actions</span>
              <button type="button" aria-label="Close Brief actions" onClick={closeOverflowMenu}><DsIcon name="x-close-cross" size={18} /></button>
            </div> : null}
            {showCopyLink ? <button className="label-s-semibold" type="button" role="menuitem" disabled={disabled} title={disabled ? disabledTooltip : undefined} onClick={openCopyLinkSettings}><DsIcon name="link" size={16} />Copy link</button> : null}
            {showSend && userRole !== "Share Link Viewer" ? <button className="label-s-semibold" type="button" role="menuitem" disabled={disabled || sendDisabled || (isWaitingOnReview && !canOpenReviewDetails)} title={disabled ? disabledTooltip : sendDisabled ? sendDisabledTooltip : sendTooltip} onClick={requestSend}><DsIcon name="paper-plane-tilt" size={16} /><span className="share-review-action-copy"><span>{displayedSendLabel}{showReminderPrompt ? <span className="share-reminder-prompt" aria-hidden="true"><DsIcon name="bell" size={15} /></span> : null}</span>{canOpenReviewDetails ? <small className="label-xs">{lastSentLabel}</small> : null}</span></button> : null}
            {showApprove ? <button className="label-s-semibold" type="button" role="menuitem" disabled={disabled || approveDisabled} title={disabled ? disabledTooltip : approveDisabled ? approveDisabledTooltip : undefined} onClick={changeApproval}><DsIcon name="thumbs-up-like-fill" size={16} />{isApproved ? briefControls ? `Unapprove ${stageLabel}` : "Approved" : approveLabel}</button> : null}
          </div>
        </details>
      ) : presentation === "brief-summary" ? <div className="share-action-buttons brief-summary-action-buttons" aria-label={`${stageLabel} actions`}>
        {showCopyLink ? <button
          className={`share-button share-button-tertiary label-s-semibold ${copyLinkIconOnly ? "share-button-icon-only" : ""}`}
          type="button"
          aria-label={briefControls ? "Share Brief" : copyLinkLabel}
          aria-expanded={isPopoverOpen}
          disabled={disabled}
          data-tooltip={isPopoverOpen ? undefined : disabled ? disabledTooltip : allowProjectScope ? `Share ${stageLabel} or project` : briefControls ? "Share Brief" : copyLinkLabel}
          onClick={toggleCopyLinkSettings}
        >
          <DsIcon name="link" size={18} />{copyLinkIconOnly ? null : copyLinkLabel}
        </button> : null}
        {showSend && userRole !== "Share Link Viewer" ? <button
          className={`share-button ${sendButtonVariant === "secondary" || isWaitingOnReview || isCustomerView ? "share-button-secondary" : "share-button-primary"} label-s-semibold`}
          type="button"
          disabled={disabled || sendDisabled || (isWaitingOnReview && !canOpenReviewDetails)}
          title={disabled ? disabledTooltip : sendDisabled ? sendDisabledTooltip : undefined}
          data-tooltip={disabled ? disabledTooltip : sendDisabled ? sendDisabledTooltip : sendTooltip}
          onClick={requestSend}
        >
          {canOpenReviewDetails ? <span>{displayedSendLabel}{(context === "brief" || showReminderPrompt) ? <span className="share-reminder-prompt" aria-hidden="true"><DsIcon name="bell" size={15} /></span> : null}</span> : displayedSendLabel}
        </button> : null}
        {showApprove ? isApproved ? briefControls ? <StageApprovalControl
          stageLabel={stageLabel}
          userRole={userRole}
          isApproved
          onApprove={() => runAction("approve", approveProject)}
          onUnapprove={() => {
            setIsPopoverOpen(false);
            setIsSendConfirmationOpen(false);
            unapproveProject();
          }}
          approvedLabel="Approved"
          approvedClassName="brief-approved-action"
          approvedTextClassName="label-m-semibold"
          approvedAt={approvedAt}
          approvedBy={approvedBy}
          tooltip="View approval details or unapprove"
          customerName={customerName}
          allowRoleApproval={allowRoleApproval}
          disabled={disabled || approveDisabled}
          disabledTooltip={approveDisabledTooltip}
        /> : <span className="brief-approved-action label-m-semibold" role="status" title={`Approved on ${approvedAt} by ${approvedBy ?? (isCustomerView ? customerName : "Tom")}.`}>
          Approved
        </span> : <button
          className={`share-button ${isCustomerView ? "share-button-primary" : "share-button-secondary"} label-s-semibold`}
          type="button"
          disabled={disabled || approveDisabled || (userRole === "Studio Freelancer" && !allowRoleApproval)}
          title={userRole === "Studio Freelancer" && !allowRoleApproval ? `Only Studio Staff and Clients can approve this ${stageLabel}` : undefined}
          data-tooltip={disabled ? disabledTooltip : approveDisabled ? approveDisabledTooltip : "Sign-off and continue to the next stage."}
          onClick={() => runAction("approve", approveProject)}
        >
          {approveLabel}
        </button> : null}
      </div> : <div className="share-action-buttons" aria-label={`${stageLabel} share actions`}>
        {showCopyLink ? (
          <button
            className={`share-button share-button-tertiary label-s-semibold ${copyLinkIconOnly ? "share-button-icon-only" : ""}`}
            type="button"
            aria-label={copyLinkLabel}
            aria-expanded={isPopoverOpen}
            disabled={disabled}
            title={disabled ? disabledTooltip : undefined}
            onClick={toggleCopyLinkSettings}
          >
            <DsIcon name="link" size={20} />
            {copyLinkIconOnly ? null : copyLinkLabel}
          </button>
        ) : null}
        {showSend && userRole !== "Share Link Viewer" ? <button
          className={`share-button ${sendButtonVariant === "secondary" || isWaitingOnReview || isCustomerView ? "share-button-secondary" : "share-button-primary"} label-s-semibold`}
          type="button"
          disabled={disabled || sendDisabled || (isWaitingOnReview && !canOpenReviewDetails)}
          data-tooltip={disabled ? disabledTooltip : sendDisabled ? sendDisabledTooltip : sendTooltip}
          onClick={requestSend}
        >
          {canOpenReviewDetails ? <span>{displayedSendLabel}{showReminderPrompt ? <span className="share-reminder-prompt" aria-hidden="true"><DsIcon name="bell" size={15} /></span> : null}</span> : displayedSendLabel}
        </button> : null}
        {showApprove ? (
          <StageApprovalControl
            stageLabel={stageLabel}
            userRole={userRole}
            isApproved={isApproved}
            approveLabel={approveLabel}
            approveButtonVariant={isCustomerView ? "primary" : "secondary"}
            disabled={disabled || approveDisabled}
            disabledTooltip={disabled ? disabledTooltip : approveDisabledTooltip}
            approvedAt={approvedAt}
            approvedBy={approvedBy}
            customerName={customerName}
            allowRoleApproval={allowRoleApproval}
            onApprove={() => runAction("approve", approveProject)}
            onUnapprove={() => {
              setIsPopoverOpen(false);
              setIsSendConfirmationOpen(false);
              unapproveProject();
            }}
          />
        ) : null}
      </div>}
      {reviewToastMessage ? (
        <span className="share-request-toast label-xs-semibold" role="status">
          {reviewToastMessage}
        </span>
      ) : null}

      {isPopoverOpen ? (
        <aside className="share-popover" aria-label={`${linkScopeTitle} link access`} onPointerDown={(event) => event.stopPropagation()}>
          <header className="share-panel-heading">
            <div>
              <h2 className="headings-xs-bold">{linkScopeTitle} link access</h2>
              {canChooseProjectScope ? <div className="share-scope-toggle" role="group" aria-label="Link scope">
                <button className={`label-xs-semibold ${selectedLinkScope === "current" ? "is-active" : ""}`} type="button" aria-pressed={selectedLinkScope === "current"} onClick={() => { setSelectedLinkScope("current"); setHasCopied(false); }}>{resolvedScopeType === "version" ? resolvedShareTitle : stageLabel} only</button>
                <button className={`label-xs-semibold ${selectedLinkScope === "project" ? "is-active" : ""}`} type="button" aria-pressed={selectedLinkScope === "project"} onClick={() => { setSelectedLinkScope("project"); setHasCopied(false); }}>Whole project</button>
              </div> : <p className="label-xs">{resolvedScopeType === "project" ? "Whole project" : resolvedScopeType === "stage" ? `${stageLabel} only` : resolvedScopeType === "version" ? "Selected version" : resolvedScopeType === "selection" ? "Selected files" : "This item only"}</p>}
            </div>
            <button className="share-panel-close" type="button" aria-label="Close share panel" onClick={() => setIsPopoverOpen(false)}><DsIcon name="x-close-cross" size={16} /></button>
          </header>

          {canConfigureLink ? <ShareOptionSection
            title="Link access"
            value={accessLabels[linkAccess]}
            isExpanded={expandedSections.includes("access")}
            onToggle={() => toggleSection("access")}
          >
            {(["viewOnly", "canComment", "canEdit"] satisfies ShareAccess[]).map((option) => (
              <ShareRadioOption key={option} label={accessLabels[option]} selected={linkAccess === option} onSelect={() => selectAccess(option)} />
            ))}
          </ShareOptionSection> : <p className="share-link-access-static label-xs">Link access: {accessLabels[linkAccess]}</p>}

          <p className="share-link-explanation label-xs">Anyone with this link can {linkAccessVerb} {linkScopeSubject}. No password required.</p>

          <button className="share-copy-primary label-s-semibold" type="button" onClick={() => runAction("copy", copyLink)}>
            <DsIcon name={hasCopied ? "check" : "link"} size={16} />{hasCopied ? "Copied" : copyLinkActionLabel}
          </button>
          {clientTeamWithAccess.length > 0 ? <section className="share-client-team" aria-label={`${account.company.name} team with access: ${clientTeamWithAccess.map((member) => member.name).join(", ")}`}>
            <div className="share-client-team-members">
              <div className="share-client-team-avatars" aria-hidden="true">
                {clientTeamWithAccess.map((member) => <span className="share-person-avatar label-xs-semibold" key={member.id} title={member.name}>{member.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("")}</span>)}
              </div>
              <span className="label-xs">{clientTeamWithAccess.length} {account.company.name} {clientTeamWithAccess.length === 1 ? "teammate" : "teammates"}</span>
            </div>
            {canManageClientTeam ? <Link className="label-xs" href={buildHref("/settings/client/team")} onClick={() => setIsPopoverOpen(false)}>Manage</Link> : null}
          </section> : null}
          {hasCopied ? <span className="share-copy-toast label-xs-semibold" role="status">Copied ✓</span> : null}
        </aside>
      ) : null}

      {isSendConfirmationOpen && typeof document !== "undefined" ? createPortal(<div className="share-confirm-backdrop" role="presentation" onMouseDown={() => setIsSendConfirmationOpen(false)}>
        <section className="share-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="share-send-confirm-title" onMouseDown={(event) => event.stopPropagation()}>
          <h2 className="headings-xs-bold" id="share-send-confirm-title">{followUpKind === "reminder" ? `Remind ${currentReviewCompanyName} to review the ${reviewSubjectTitle}?` : followUpKind === "updated" ? `Send updated ${reviewSubjectTitle} to ${currentReviewCompanyName}?` : sendsStageForReview ? `Send ${reviewSubjectTitle} to ${submitCompanyName}?` : `Send ${resolvedShareTitle} to ${resolvedSendCompanyName}?`}</h2>
          <p className="paragraph-s">{followUpKind
            ? `This will send ${currentReviewCompanyName} another notification. The project will remain Waiting on ${currentReviewCompanyName}.`
            : sendsStageForReview
            ? `This will notify ${submitCompanyName} and set the project status to Waiting on ${submitCompanyName}.`
            : `This records the selected item as sent. The project status will not change.`}</p>
          {sendsStageForReview && !followUpKind ? <div className="share-submit-destinations" role="radiogroup" aria-label="Send to">
            {(isStudioFreelancer ? ["studio"] as SubmitDestination[] : [defaultDestination, defaultDestination === "customer" ? "studio" : "customer"] as SubmitDestination[]).map((destination) => (
              <button className={`share-submit-destination ${selectedDestination === destination ? "is-selected" : ""}`} type="button" role="radio" aria-checked={selectedDestination === destination} key={destination} onClick={() => {
                setSelectedDestination(destination);
                setSendMessage(submitMessageFor(destination));
                setMentionCursor(null);
                setMentionPickerMode(null);
              }}>
                <span className="share-radio-control" aria-hidden="true" />
                <span><strong className="label-s-semibold">{destination === "studio" ? studioName : customerName}</strong><small className="label-xs">{destination === defaultDestination ? destination === "studio" ? isCustomerView ? "Studio" : "Studio team" : isCustomerView ? "Your team" : "Client" : destination === "studio" ? "Studio team" : "Your team"}</small></span>
              </button>
            ))}
          </div> : null}
          {followUpKind === "reminder" && pendingReviewDetails ? <div className="share-review-request-details label-xs">
            <span>Requested by {pendingReviewDetails.requestedBy} · {formatReviewRequestDate(pendingReviewDetails.requestedAt)}</span>
            <span>Sent to: {pendingReviewDetails.recipients.join(", ")}</span>
          </div> : null}
          {(followUpKind || (sendsStageForReview && (sendMessageEnabled || context !== "brief"))) ? <div className="share-send-message">
            <div className="share-send-message-heading">
              <label className="label-s-semibold" id={`${sendMessageId}-label`} htmlFor={sendMessageId} onClick={() => sendMessageRef.current?.focus()}>Message to {followUpKind ? currentReviewCompanyName : sendsStageForReview ? submitCompanyName : resolvedSendCompanyName}</label>
              {userRole === "Studio Staff" && followUpKind !== "updated" ? <Link className="label-xs-semibold" href={context === "brief" && (followUpKind === "reminder" || selectedDestination === "customer") ? followUpKind === "reminder" ? reminderMessageSettingsHref : reviewMessageSettingsHref : `/settings/review-request-message?destination=${selectedDestination}&stage=${encodeURIComponent(reviewSubjectTitle)}&project=${encodeURIComponent(projectName)}&returnTo=${encodeURIComponent(shareUrl ?? "/active-videos")}`}>Edit default in settings</Link> : null}
            </div>
            <div className="share-submit-message-editor">
              {sendsStageForReview && !followUpKind ? <>
                <div className="share-submit-rich-text label-s" id={sendMessageId} ref={sendMessageRef} role="textbox" aria-multiline="true" aria-labelledby={`${sendMessageId}-label`} contentEditable suppressContentEditableWarning onInput={updateSubmitMessage} onKeyUp={updateSubmitMessage} onMouseUp={updateSubmitMessage} onBeforeInput={(event) => {
                  const input = event.nativeEvent as InputEvent;
                  if (input.data && (sendMessageRef.current?.textContent?.length ?? 0) - (currentEditorRange()?.toString().length ?? 0) + input.data.length > 240) event.preventDefault();
                }} onPaste={(event) => { event.preventDefault(); insertPlainText(event.clipboardData.getData("text/plain")); }} onKeyDown={(event) => {
                  if (event.key === "Escape" && mentionPickerMode) { event.stopPropagation(); setMentionPickerMode(null); }
                  if (event.key === "Enter") { event.preventDefault(); insertPlainText("\n"); }
                }} />
                <button className="share-submit-mention-button label-s-semibold" type="button" aria-label="Mention someone" aria-controls={mentionPickerId} aria-expanded={mentionPickerMode !== null} data-tooltip="Mention someone" onMouseDown={(event) => event.preventDefault()} onClick={() => {
                  setMentionPickerMode(mentionPickerMode === "helper" ? null : "helper");
                }}><DsIcon name="user-plus" size={16} /></button>
              </> : <textarea className="label-s" id={sendMessageId} rows={4} maxLength={240} value={sendMessage} onChange={(event) => setSendMessage(event.target.value)} />}
              {sendsStageForReview && !followUpKind && mentionPickerMode ? <div className="share-submit-mention-suggestions" id={mentionPickerId} role="listbox" aria-label={`${submitCompanyName} project members`}>
                {mentionSuggestions.length ? mentionSuggestions.map((name) => <button type="button" role="option" aria-selected={false} className="label-s" key={name} onMouseDown={(event) => event.preventDefault()} onClick={() => insertMention(name)}>{name}</button>) : <span className="label-xs">No matching project members</span>}
              </div> : null}
            </div>
            {sendsStageForReview && !followUpKind ? <>
              <p className="share-submit-notice label-xs">{mentionedMembers.length
                ? `Only ${formatMentionedPeople(mentionedMembers)} will be notified. Other ${submitCompanyName} project members can still view this.`
                : `Everyone from ${submitCompanyName} on this project will be notified.`}</p>
            </> : null}
          </div> : null}
          <div className="share-confirm-actions">
            <button className="share-button share-button-secondary label-s-semibold" type="button" onClick={() => setIsSendConfirmationOpen(false)}>Cancel</button>
            <button className="share-button share-button-primary label-s-semibold" type="button" disabled={!followUpKind && sendsStageForReview && !sendMessage.trim()} onClick={performSend}>{followUpKind === "reminder" ? "Send reminder" : followUpKind === "updated" ? `Send updated ${reviewSubjectTitle}` : sendsStageForReview ? `Send to ${submitCompanyName}` : resolvedSendLabel}</button>
          </div>
        </section>
      </div>, document.body) : null}
    </div>
  );
}

export function StageApprovalControl({
  stageLabel,
  userRole,
  isApproved,
  onApprove,
  onUnapprove,
  approveLabel = "Approve",
  approveButtonVariant = "primary",
  approvedLabel,
  approvedClassName,
  approvedTextClassName = "label-s-semibold",
  approvedAt = "17 Aug",
  approvedBy,
  tooltip,
  customerName = "Avery Taylor",
  disabled = false,
  disabledTooltip,
  allowRoleApproval = false,
}: StageApprovalControlProps) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const popoverId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const isRoleDisabled = userRole === "Share Link Viewer" || (userRole === "Studio Freelancer" && !allowRoleApproval);
  const isDisabled = disabled || isRoleDisabled;
  const approvalActor = approvedBy ?? (userRole === "Customer" ? customerName : "Tom");
  const approvalDetails = `Approved on ${approvedAt} by ${approvalActor}.`;
  const roleTooltip = userRole === "Studio Freelancer" ? "Only Studio Staff or Clients can approve" : "Sign in to approve";

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  if (!isApproved) {
    return (
      <span className="share-approved-status-wrap" ref={rootRef} data-tooltip={isDisabled ? (disabledTooltip ?? roleTooltip) : undefined}>
        <button className={`share-button share-button-${approveButtonVariant} label-s-semibold`} type="button" disabled={isDisabled} data-tooltip={isDisabled ? undefined : tooltip} onClick={onApprove}>
          <DsIcon name="thumbs-up-like-fill" size={20} />
          {approveLabel}
        </button>
      </span>
    );
  }

  return (
    <span className="share-approved-status-wrap" ref={rootRef}>
      <button
        className={`${approvedClassName ?? "script-approved-pill"} share-approved-status-trigger ${approvedTextClassName}`}
        aria-controls={popoverId}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        disabled={isRoleDisabled}
        data-tooltip={isOpen ? undefined : tooltip}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
      >
        {approvedLabel ?? `${stageLabel} approved`}
        <DsIcon name="caret-down" size={14} />
      </button>
      {isOpen && !isRoleDisabled ? (
        <aside className="share-approval-popover" id={popoverId} role="dialog" aria-label={`${stageLabel} approval details`}>
          <p className="label-s">{approvalDetails}</p>
          <button
            className="share-button share-button-secondary label-s-semibold"
            type="button"
            onClick={() => {
              setIsOpen(false);
              onUnapprove();
            }}
          >
            Unapprove {stageLabel.toLowerCase()}
          </button>
        </aside>
      ) : null}
    </span>
  );
}

function ShareOptionSection({
  title,
  value,
  isExpanded,
  onToggle,
  children,
}: {
  title: string;
  value: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className={`share-option-section ${isExpanded ? "expanded" : ""}`}>
      <button className="share-option-summary" type="button" aria-expanded={isExpanded} onClick={onToggle}>
        <span className="share-option-title label-s-semibold">
          {title}: <strong>{value}</strong>
        </span>
        <span className="share-option-toggle label-s-semibold" aria-hidden="true">
          {isExpanded ? "Hide" : "Change"}
        </span>
      </button>
      {isExpanded ? <div className="share-radio-list">{children}</div> : null}
    </section>
  );
}

function ShareRadioOption({
  label,
  selected,
  disabled = false,
  onSelect,
}: {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={`share-radio-option label-s ${selected ? "selected" : ""}`}
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
    >
      <span className="share-radio-control" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}
