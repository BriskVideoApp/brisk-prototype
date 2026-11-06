"use client";

import { Button } from "../../../Brisk DS/src/app/components/Button";
import { Textarea } from "../../../Brisk DS/src/app/components/Textarea";
import { EditingDialog } from "../../../Brisk DS/src/app/components/EditingDialog";
import { ConfirmationDialog } from "../../../Brisk DS/src/app/components/ConfirmationDialog";
import { BriskSelect } from "../../../Brisk DS/src/app/components/Select";
import { IconButton } from "../../../Brisk DS/src/app/components/IconButton";


import Link from "next/link";
import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
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
  showApproveIcon?: boolean;
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
  /** Persistent Stage decisions with a role-specific handover destination. */
  stageDecisionActions?: boolean;
  /** Keep Stage approval quiet when a section readiness action is primary. */
  stageApprovalButtonVariant?: "primary" | "secondary";
  allowProjectScope?: boolean;
  scopeType?: "project" | "stage" | "version" | "item" | "selection";
  shareTitle?: string;
  openPanelSignal?: number;
  /** Row menus reuse the link settings in a DS dialog to avoid table clipping. */
  sharePanelPresentation?: "popover" | "dialog";
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
  ensureReviewAccess?: (destination: SubmitDestination, message: string) => boolean;
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
  /** Optional row trigger; link settings and permissions stay in this composition. */
  shareTrigger?: (props: { onClick: () => void; disabled: boolean; "aria-expanded": boolean }) => ReactNode;
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

const shareAccessOptions = (["viewOnly", "canComment", "canEdit"] as const).map((value) => ({ value, label: accessLabels[value] }));

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
  stageDecisionActions = false,
  stageApprovalButtonVariant,
  allowProjectScope = false,
  scopeType,
  shareTitle,
  openPanelSignal = 0,
  sharePanelPresentation = "popover",
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
  ensureReviewAccess,
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
  shareTrigger,
  disabled = false,
  disabledTooltip,
  approveLabel = "Approve",
  approveDisabled = false,
  approveDisabledTooltip,
  approvedAt,
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
  const plainMessageRef = useRef<HTMLTextAreaElement>(null);
  const savedMentionRangeRef = useRef<Range | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
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
  const [activeMentionIndex, setActiveMentionIndex] = useState(0);
  const [reviewClock, setReviewClock] = useState(() => Date.now());
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
  const isSimpleStageSend = stageDecisionActions && !followUpKind;
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
    : stageDecisionActions ? `Send the ${stageLabel} to ${isCustomerView ? studioName : customerName}.`
    : `Send to ${isCustomerView ? studioName : customerName} or your team.`;
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
  const linkAccess = canChooseProjectScope && selectedLinkScope === "project" ? projectAccess : access;
  const panelTitle = canChooseProjectScope ? "Share" : `Share ${resolvedShareTitle}`;
  const clientTeamWithAccess = account.team.filter((member) => member.status === "Active" && sharedProjectId && member.projectIds.includes(sharedProjectId));
  const canManageClientTeam = isCustomerView && clientAccountAccess.role === "Client Admin";

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (sharePanelPresentation === "dialog") return;
      const target = event.target;
      const portal = target instanceof Element ? target.closest(".brisk-select-menu") : null;
      const popupId = portal?.querySelector('[role="listbox"], [role="menu"]')?.id;
      if (popupId && rootRef.current?.querySelector(`[aria-controls="${CSS.escape(popupId)}"]`)) return;
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsPopoverOpen(false);
        setIsOverflowOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [sharePanelPresentation]);

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
      setIsOverflowOpen(false);
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
    if (sendsStageForReview && ensureReviewAccess
      && !ensureReviewAccess(selectedDestination, sendMessage.trim())) {
      setIsPopoverOpen(false);
      setIsSendConfirmationOpen(false);
      return;
    }
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
      else if (selectedDestination === "studio" && onSendToStudio) onSendToStudio(sendMessage.trim());
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
    setIsOverflowOpen(false);
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
    setActiveMentionIndex(0);
    if (canOpenReviewDetails && (!stageDecisionActions || currentReviewCompanyName === (isCustomerView || isStudioFreelancer ? studioName : customerName))) {
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
        const message = submitMessageFor(defaultDestination);
        if (ensureReviewAccess && !ensureReviewAccess(defaultDestination, message)) return;
        setSelectedDestination(defaultDestination);
        setMentionCursor(null);
        setSendMessage(message);
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

  const updateMentionQuery = (value: string, cursor: number) => {
    setMentionCursor(cursor);
    const match = value.slice(0, cursor).match(/@([\p{L}\p{N}'-]*(?: [\p{L}\p{N}'-]*)*)$/u);
    const query = match?.[1];
    const completed = query !== undefined && submitMembers.some((name) => query === name || query.startsWith(`${name} `));
    setMentionPickerMode(match && !completed ? "typing" : null);
    setActiveMentionIndex(0);
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
    updateMentionQuery(value, cursor);
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
    if (!isSimpleStageSend && (!editor || !range)) return;
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

    if (isSimpleStageSend) {
      setSendMessage(nextMessage);
      setMentionCursor(before.length + inserted.length);
      setMentionPickerMode(null);
      requestAnimationFrame(() => {
        plainMessageRef.current?.focus();
        plainMessageRef.current?.setSelectionRange(before.length + inserted.length, before.length + inserted.length);
      });
      return;
    }
    if (!editor || !range) return;

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

  const handleMentionKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (isSimpleStageSend && mentionPickerMode && mentionSuggestions.length) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        setActiveMentionIndex((index) => (index + (event.key === "ArrowDown" ? 1 : -1) + mentionSuggestions.length) % mentionSuggestions.length);
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        insertMention(mentionSuggestions[Math.min(activeMentionIndex, mentionSuggestions.length - 1)]);
        return;
      }
    }
    if (event.key === "Escape" && mentionPickerMode) {
      event.preventDefault();
      event.stopPropagation();
      setMentionPickerMode(null);
    }
    if (!isSimpleStageSend && event.key === "Enter") { event.preventDefault(); insertPlainText("\n"); }
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

  const selectAccess = (nextAccess: ShareAccess) => {
    setHasCopied(false);
    if (canChooseProjectScope && selectedLinkScope === "project") {
      setProjectAccess(nextAccess);
      return;
    }
    setAccess(nextAccess);
    onAccessChange?.(nextAccess);
  };

  const shareCopyAction = <Button size="S" variant="primary"
    className={sharePanelPresentation === "popover" ? "share-copy-primary" : undefined}
    aria-live="polite"
    type="button" onClick={() => runAction("copy", copyLink)}>
    <DsIcon name={hasCopied ? "check" : "link"} size={16} />{hasCopied ? "Copied" : "Copy link"}
  </Button>;

  const shareLinkOptions = <>
    {canChooseProjectScope ? <div className="share-scope-toggle" role="group" aria-label="Link scope">
      <button className={`label-xs-semibold ${selectedLinkScope === "current" ? "is-active" : ""}`} type="button" aria-pressed={selectedLinkScope === "current"} onClick={() => { setSelectedLinkScope("current"); setHasCopied(false); }}>{resolvedScopeType === "version" ? resolvedShareTitle : stageLabel} only</button>
      <button className={`label-xs-semibold ${selectedLinkScope === "project" ? "is-active" : ""}`} type="button" aria-pressed={selectedLinkScope === "project"} onClick={() => { setSelectedLinkScope("project"); setHasCopied(false); }}>Whole project</button>
    </div> : null}
    <div className="share-link-permission">
      <span className="label-s">Anyone with the link</span>
      {canConfigureLink ? <BriskSelect<ShareAccess>
        ariaLabel="Permission for anyone with the link"
        clearable={false}
        options={shareAccessOptions}
        placeholder="Choose permission"
        value={linkAccess}
        onChange={(value) => { if (value) selectAccess(value); }}
      /> : <span className="label-s-semibold">{accessLabels[linkAccess]}</span>}
    </div>

    {sharePanelPresentation === "popover" ? shareCopyAction : null}
    {clientTeamWithAccess.length > 0 ? <section className="share-client-team" aria-label={`${account.company.name} team with access: ${clientTeamWithAccess.map((member) => member.name).join(", ")}`}>
      <div className="share-client-team-members">
        <div className="share-client-team-avatars" aria-hidden="true">
          {clientTeamWithAccess.map((member) => <span className="share-person-avatar label-xs-semibold" key={member.id} title={member.name}>{member.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("")}</span>)}
        </div>
        <span className="label-xs">{clientTeamWithAccess.length} {account.company.name} {clientTeamWithAccess.length === 1 ? "teammate" : "teammates"}</span>
      </div>
      {canManageClientTeam ? <Link className="label-xs" href={buildHref("/settings/client/team")} onClick={() => setIsPopoverOpen(false)}>Manage</Link> : null}
    </section> : null}
  </>;

  const stageSendLabel = isCustomerView || isStudioFreelancer ? "Send to Studio" : "Send to Client";
  const stageSendAction = showSend && userRole !== "Share Link Viewer" ? (
    <Button
      size="S"
      variant={sendButtonVariant ?? (isCustomerView ? "secondary" : "primary")}
      disabled={disabled || sendDisabled}
      tooltip={disabled ? disabledTooltip : sendDisabled ? sendDisabledTooltip : sendTooltip}
      onClick={requestSend}
    >{stageSendLabel}</Button>
  ) : null;
  const stageApprovalAction = showApprove ? (
    <StageApprovalControl
      stageLabel={stageLabel}
      userRole={userRole}
      isApproved={isApproved}
      approveLabel={approveLabel}
      showApproveIcon={false}
      allowRoleApproval={allowRoleApproval}
      approveButtonVariant={stageApprovalButtonVariant ?? (isCustomerView ? "primary" : "secondary")}
      approvedClassName="brief-approved-action"
      approvedAt={approvedAt}
      approvedBy={approvedBy}
      customerName={customerName}
      disabled={disabled || approveDisabled}
      disabledTooltip={disabled ? disabledTooltip : approveDisabledTooltip}
      onApprove={() => runAction("approve", approveProject)}
      onUnapprove={unapproveProject}
    />
  ) : null;

  return (
    <div className={`share-action-row share-density-${density} ${presentation === "overflow" ? "is-overflow" : ""} ${briefControls ? "is-brief-controls" : ""} ${presentation === "brief-summary" ? "is-brief-summary" : ""}`} ref={rootRef}>
      {stageDecisionActions ? <div className="share-action-buttons" aria-label={`${stageLabel} review actions`}>
        {isCustomerView ? <>{stageSendAction}{stageApprovalAction}</> : <>{stageApprovalAction}{stageSendAction}</>}
      </div> : presentation === "overflow" ? (
        <BriskSelect mode="action" value="" clearable={false} ariaLabel={briefControls ? "Brief actions" : `${stageLabel} actions`} placeholder="Actions"
          open={isOverflowOpen} onOpenChange={(open) => { setIsOverflowOpen(open); if (open) setIsPopoverOpen(false); }}
          options={[
            ...(showCopyLink ? [{value: "copy", label: "Copy link", disabled, title: disabled ? disabledTooltip : undefined}] : []),
            ...(showSend && userRole !== "Share Link Viewer" ? [{value: "send", label: displayedSendLabel,
              disabled: disabled || sendDisabled || (isWaitingOnReview && !canOpenReviewDetails),
              title: disabled ? disabledTooltip : sendDisabled ? sendDisabledTooltip : sendTooltip,
              description: [canOpenReviewDetails ? lastSentLabel : "", showReminderPrompt ? "Reminder due" : ""].filter(Boolean).join(" · ") || undefined,
            }] : []),
            ...(showApprove ? [{value: "approve", label: isApproved ? briefControls ? `Unapprove ${stageLabel}` : "Approved" : approveLabel, disabled: disabled || approveDisabled, title: disabled ? disabledTooltip : approveDisabled ? approveDisabledTooltip : undefined}] : []),
          ]}
          onChange={(value) => { if (value === "copy") openCopyLinkSettings(); else if (value === "send") requestSend(); else if (value === "approve") changeApproval(); }}
          actionTrigger={(props) => <IconButton {...props} aria-label={briefControls ? "Brief actions" : `${stageLabel} actions`}><DsIcon name="share-network" size={20} /></IconButton>}
        />
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
        /> : <span className="brief-approved-action label-m-semibold" role="status" title={approvedAt ? `Approved on ${approvedAt} by ${approvedBy ?? (isCustomerView ? customerName : "Tom")}.` : `Approved by ${approvedBy ?? (isCustomerView ? customerName : "Tom")}.`}>
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
        {showCopyLink ? shareTrigger ? shareTrigger({ onClick: toggleCopyLinkSettings, disabled, "aria-expanded": isPopoverOpen }) : (
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

      {isPopoverOpen ? sharePanelPresentation === "dialog" ? <EditingDialog
        title={panelTitle}
        onCancel={() => setIsPopoverOpen(false)}
        actions={<><Button size="S" variant="secondary" onClick={() => setIsPopoverOpen(false)}>Close</Button>{shareCopyAction}</>}
      ><div className="share-link-dialog-content">{shareLinkOptions}</div></EditingDialog> : (
        <aside className="share-popover" aria-label={panelTitle} onPointerDown={(event) => event.stopPropagation()}>
          <header className="share-panel-heading">
            <h2 className="headings-xs-bold">{panelTitle}</h2>
            <IconButton tooltipAlign="end" tooltipPlacement="bottom" aria-label="Close share panel" onClick={() => setIsPopoverOpen(false)}>
              <DsIcon name="x-close-cross" size={16} />
            </IconButton>
          </header>

          {shareLinkOptions}
        </aside>
      ) : null}

      {isSendConfirmationOpen && typeof document !== "undefined" ? <ConfirmationDialog title={<>{followUpKind === "reminder" ? `Remind ${currentReviewCompanyName} to review the ${reviewSubjectTitle}?` : followUpKind === "updated" ? `Send updated ${reviewSubjectTitle} to ${currentReviewCompanyName}?` : isSimpleStageSend ? `Send ${reviewSubjectTitle} to ${submitCompanyName}` : sendsStageForReview ? `Send ${reviewSubjectTitle} to ${submitCompanyName}?` : `Send ${resolvedShareTitle} to ${resolvedSendCompanyName}?`}</>} description={isSimpleStageSend ? <span aria-live="polite">{mentionedMembers.length
            ? `Only ${formatMentionedPeople(mentionedMembers)} will be notified.`
            : "Their project team will be notified and take it from here."}</span> : <>{followUpKind
            ? `This will send ${currentReviewCompanyName} another notification. The project will remain Waiting on ${currentReviewCompanyName}.`
            : sendsStageForReview
            ? isStudioFreelancer || userRole === "Studio Staff"
              ? `Status changes to Waiting on ${selectedDestination === "studio" ? "studio" : "client"}.`
              : `This will notify ${submitCompanyName} and set the project status to Waiting on ${submitCompanyName}.`
            : `This records the selected item as sent. The project status will not change.`}</>} expanded onCancel={() => setIsSendConfirmationOpen(false)} actions={<>
            <Button size="S" variant="secondary"  type="button" onClick={() => setIsSendConfirmationOpen(false)}>Cancel</Button>
            <Button size="S" variant="primary"  type="button" disabled={!(stageDecisionActions && context === "brief") && !followUpKind && sendsStageForReview && !sendMessage.trim()} onClick={performSend}>{followUpKind === "reminder" ? "Send reminder" : followUpKind === "updated" ? `Send updated ${reviewSubjectTitle}` : isSimpleStageSend ? `Send ${stageLabel}` : stageDecisionActions ? stageSendLabel : sendsStageForReview ? isStudioFreelancer || userRole === "Studio Staff" ? `Send ${reviewSubjectTitle}` : `Send to ${submitCompanyName}` : resolvedSendLabel}</Button>
          </>}>   {sendsStageForReview && !followUpKind && !isStudioFreelancer && !stageDecisionActions ? <div className={`share-submit-destinations ${userRole === "Studio Staff" ? "is-compact" : ""}`} role="radiogroup" aria-label="Send to">
            {userRole === "Studio Staff" ? <span className="label-s-semibold">To</span> : null}
            {([defaultDestination, defaultDestination === "customer" ? "studio" : "customer"] as SubmitDestination[]).map((destination) => (
              <button className={`share-submit-destination ${selectedDestination === destination ? "is-selected" : ""}`} type="button" role="radio" aria-label={`${destination === "studio" ? "Studio" : "Client"}: ${destination === "studio" ? studioName : customerName}`} aria-checked={selectedDestination === destination} key={destination} onClick={() => {
                setSelectedDestination(destination);
                setSendMessage(submitMessageFor(destination));
                setMentionCursor(null);
                setMentionPickerMode(null);
              }}>
                {userRole === "Studio Staff" ? <span className="label-s-semibold">{destination === "studio" ? "Studio" : "Client"}</span> : <>
                  <span className="share-radio-control" aria-hidden="true" />
                  <span><strong className="label-s-semibold">{destination === "studio" ? studioName : customerName}</strong><small className="label-xs">{destination === defaultDestination ? destination === "studio" ? isCustomerView ? "Studio" : "Studio team" : isCustomerView ? "Your team" : "Client" : destination === "studio" ? "Studio team" : "Your team"}</small></span>
                </>}
              </button>
            ))}
          </div> : null}  {followUpKind === "reminder" && pendingReviewDetails ? <div className="share-review-request-details label-xs">
            <span>Requested by {pendingReviewDetails.requestedBy} · {formatReviewRequestDate(pendingReviewDetails.requestedAt)}</span>
            <span>Sent to: {pendingReviewDetails.recipients.join(", ")}</span>
          </div> : null}  {(followUpKind || (sendsStageForReview && (sendMessageEnabled || stageDecisionActions || context !== "brief"))) ? <div className="share-send-message">
            {!isSimpleStageSend ? <div className="share-send-message-heading">
              <label className="label-s-semibold" id={`${sendMessageId}-label`} htmlFor={sendMessageId} onClick={() => sendMessageRef.current?.focus()}>{!followUpKind && sendsStageForReview && (isStudioFreelancer || userRole === "Studio Staff") ? "Message" : `Message to ${followUpKind ? currentReviewCompanyName : sendsStageForReview ? submitCompanyName : resolvedSendCompanyName}`}</label>
              {userRole === "Studio Staff" && followUpKind !== "updated" ? <Link className="label-xs-semibold" href={context === "brief" && (followUpKind === "reminder" || selectedDestination === "customer") ? followUpKind === "reminder" ? reminderMessageSettingsHref : reviewMessageSettingsHref : `/settings/review-request-message?destination=${selectedDestination}&stage=${encodeURIComponent(reviewSubjectTitle)}&project=${encodeURIComponent(projectName)}&returnTo=${encodeURIComponent(shareUrl ?? "/active-videos")}`}>Edit default in settings</Link> : null}
            </div> : null}
            <div className={`share-submit-message-editor${isSimpleStageSend ? " is-simple" : ""}`}>
              {isSimpleStageSend ? <Textarea
                ref={plainMessageRef}
                id={sendMessageId}
                rows={3}
                maxLength={240}
                value={sendMessage}
                aria-label="Message"
                placeholder={context === "brief" ? "Add a message (optional)" : "Add a message"}
                aria-description="Type @ to notify specific project members."
                aria-autocomplete="list"
                aria-controls={mentionPickerMode ? mentionPickerId : undefined}
                aria-expanded={Boolean(mentionPickerMode)}
                aria-activedescendant={mentionPickerMode && mentionSuggestions.length ? `${mentionPickerId}-${Math.min(activeMentionIndex, mentionSuggestions.length - 1)}` : undefined}
                onChange={(event) => {
                  setSendMessage(event.currentTarget.value);
                  updateMentionQuery(event.currentTarget.value, event.currentTarget.selectionStart);
                }}
                onClick={(event) => updateMentionQuery(event.currentTarget.value, event.currentTarget.selectionStart)}
                onKeyUp={(event) => {
                  if (["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(event.key)) return;
                  updateMentionQuery(event.currentTarget.value, event.currentTarget.selectionStart);
                }}
                onKeyDown={handleMentionKeyDown}
              /> : sendsStageForReview && !followUpKind ? <>
                <div className="share-submit-rich-text label-s" id={sendMessageId} ref={sendMessageRef} role="textbox" aria-multiline="true"
                  aria-labelledby={`${sendMessageId}-label`}
                  contentEditable suppressContentEditableWarning onInput={updateSubmitMessage} onKeyUp={updateSubmitMessage} onMouseUp={updateSubmitMessage} onBeforeInput={(event) => {
                  const input = event.nativeEvent as InputEvent;
                  if (input.data && (sendMessageRef.current?.textContent?.length ?? 0) - (currentEditorRange()?.toString().length ?? 0) + input.data.length > 240) event.preventDefault();
                }} onPaste={(event) => { event.preventDefault(); insertPlainText(event.clipboardData.getData("text/plain")); }} onKeyDown={handleMentionKeyDown} />
                <button className="share-submit-mention-button label-s-semibold" type="button" aria-label="Mention someone" aria-controls={mentionPickerId} aria-expanded={mentionPickerMode !== null} data-tooltip="Mention someone" onMouseDown={(event) => event.preventDefault()} onClick={() => {
                  setMentionPickerMode(mentionPickerMode === "helper" ? null : "helper");
                }}><DsIcon name="user-plus" size={16} /></button>
              </> : <textarea className="label-s" id={sendMessageId} rows={4} maxLength={240} value={sendMessage} onChange={(event) => setSendMessage(event.target.value)} />}
              {sendsStageForReview && !followUpKind && mentionPickerMode ? <div className="share-submit-mention-suggestions" id={mentionPickerId} role="listbox" aria-label={`${submitCompanyName} project members`}>
                {mentionSuggestions.length ? mentionSuggestions.map((name, index) => <button type="button" role="option" id={isSimpleStageSend ? `${mentionPickerId}-${index}` : undefined} aria-selected={isSimpleStageSend && index === activeMentionIndex} className={`label-s${isSimpleStageSend && index === activeMentionIndex ? " is-active" : ""}`} key={name} onMouseDown={(event) => event.preventDefault()} onClick={() => insertMention(name)}>{name}</button>) : <span className="label-xs">No matching project members</span>}
              </div> : null}
            </div>
            {sendsStageForReview && !followUpKind && !isSimpleStageSend ? <>
              {(!isStudioFreelancer && userRole !== "Studio Staff") || mentionedMembers.length ? <p className="share-submit-notice label-xs">{mentionedMembers.length
                ? `Only ${formatMentionedPeople(mentionedMembers)} will be notified. Other ${submitCompanyName} project members can still view this.`
                : `Everyone from ${submitCompanyName} on this project will be notified.`}</p> : null}
            </> : null}
          </div> : null}  </ConfirmationDialog> : null}
    </div>
  );
}

/** Header-only sharing reuses the same link/access panel as the review footer. */
export function StageShareControl({ prominentLabel, ...props }: Omit<ShareActionRowProps, "showSend" | "showApprove" | "showCopyLink" | "stageDecisionActions" | "presentation" | "shareTrigger"> & { prominentLabel?: string }) {
  return <ShareActionRow {...props} density="compact" showSend={false} showApprove={false}
    shareTrigger={(triggerProps) => <Button {...triggerProps} size="S" variant={prominentLabel ? "primary" : "ghost"} aria-label={prominentLabel ?? `Share ${props.stageLabelOverride ?? stageLabels[props.context]}`}>
      <DsIcon name="share-network" size={16} />{prominentLabel ?? "Share"}
    </Button>}
  />;
}

export function StageApprovalControl({
  stageLabel,
  userRole,
  isApproved,
  onApprove,
  onUnapprove,
  approveLabel = "Approve",
  approveButtonVariant = "primary",
  showApproveIcon = true,
  approvedLabel,
  approvedClassName,
  approvedTextClassName = "label-s-semibold",
  approvedAt,
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
  const approvalDetails = approvedAt ? `Approved on ${approvedAt} by ${approvalActor}.` : `Approved by ${approvalActor}.`;
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
          {showApproveIcon ? <DsIcon name="thumbs-up-like-fill" size={20} /> : null}
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
