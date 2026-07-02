"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RequestReviewModal } from "@/components/share/RequestReviewModal";
import { DsIcon } from "@/components/video-review/DsIcon";

export type ShareStageContext = "brief" | "script" | "media" | "edit" | "masters";
export type ShareDensity = "comfortable" | "compact";
export type ShareUserRole = "Studio Staff" | "Studio Freelancer" | "Customer" | "Share Link Viewer";
export type ShareLinkOpens = "stageOnly" | "wholeProject" | "videoOnly";
export type ShareAccess = "viewOnly" | "canComment" | "canEdit";

export type ShareActionRowProps = {
  context: ShareStageContext;
  userRole: ShareUserRole;
  density?: ShareDensity;
  initialLinkOpens?: ShareLinkOpens;
  initialAccess?: ShareAccess;
  projectName?: string;
  studioName?: string;
  customerName?: string;
};

type ExpandedSection = "linkOpens" | "access";

const stageLabels: Record<ShareStageContext, string> = {
  brief: "Brief",
  script: "Script",
  media: "Media",
  edit: "Edit",
  masters: "Masters",
};

const linkOpenLabels: Record<ShareLinkOpens, string> = {
  stageOnly: "Stage only",
  wholeProject: "Whole project",
  videoOnly: "Video only",
};

const accessLabels: Record<ShareAccess, string> = {
  viewOnly: "View only",
  canComment: "Can comment",
  canEdit: "Can edit",
};

export function ShareActionRow({
  context,
  userRole,
  density = "comfortable",
  initialLinkOpens = "stageOnly",
  initialAccess = "canComment",
  projectName = "Launch Film - Sales Narrative",
  studioName = "Brisk Studios",
  customerName = "Avery Taylor",
}: ShareActionRowProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const copyToastTimeoutRef = useRef<number | null>(null);
  const reviewToastTimeoutRef = useRef<number | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isRequestReviewOpen, setIsRequestReviewOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<ExpandedSection[]>([]);
  const [linkOpens, setLinkOpens] = useState<ShareLinkOpens>(initialLinkOpens);
  const [access, setAccess] = useState<ShareAccess>(initialLinkOpens === "videoOnly" ? "viewOnly" : initialAccess);
  const [hasCopied, setHasCopied] = useState(false);
  const [reviewToastMessage, setReviewToastMessage] = useState("");
  const stageLabel = stageLabels[context];
  const canUseVideoOnly = context === "edit" || context === "masters";
  const isVideoOnly = linkOpens === "videoOnly";
  const isApproveDisabled = userRole === "Share Link Viewer";
  const isCustomerView = userRole === "Customer";
  const requestReviewLabel = isCustomerView ? `Send to ${studioName}` : "Request Review";

  const linkOptions = useMemo(
    () => [
      { value: "stageOnly" as const, label: `${stageLabel} only` },
      { value: "wholeProject" as const, label: linkOpenLabels.wholeProject },
      ...(canUseVideoOnly ? [{ value: "videoOnly" as const, label: linkOpenLabels.videoOnly }] : []),
    ],
    [canUseVideoOnly, stageLabel],
  );

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsPopoverOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
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
    const shareUrl = `https://share.brisk.prototype/${context}/${linkOpens}/${access}`;

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
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

    showActionToast("Link copied");
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

  const handleReviewSent = (recipientName: string) => {
    showActionToast(`Review request sent to ${recipientName}`);
  };

  const sendToStudio = () => {
    setIsPopoverOpen(false);
    setIsRequestReviewOpen(false);
    showActionToast(`Sent to ${studioName}`);
  };

  const approveProject = () => {
    setIsPopoverOpen(false);
    setIsRequestReviewOpen(false);
    showActionToast("Approved");
  };

  const toggleSection = (section: ExpandedSection) => {
    setExpandedSections((currentSections) =>
      currentSections.includes(section)
        ? currentSections.filter((currentSection) => currentSection !== section)
        : [...currentSections, section],
    );
  };

  const selectLinkOpens = (nextLinkOpens: ShareLinkOpens) => {
    setLinkOpens(nextLinkOpens);

    if (nextLinkOpens === "videoOnly") {
      setAccess("viewOnly");
    }
  };

  const selectAccess = (nextAccess: ShareAccess) => {
    if (isVideoOnly) {
      return;
    }

    setAccess(nextAccess);
  };

  return (
    <div className={`share-action-row share-density-${density}`} ref={rootRef}>
      <div className="share-action-buttons" aria-label={`${stageLabel} share actions`}>
        <button
          className="share-button share-button-tertiary label-s-semibold"
          type="button"
          aria-expanded={isPopoverOpen}
          onClick={() => setIsPopoverOpen((isOpen) => !isOpen)}
        >
          <DsIcon name="link" size={20} />
          Copy Link
        </button>
        <button
          className="share-button share-button-secondary label-s-semibold"
          type="button"
          onClick={isCustomerView ? sendToStudio : () => setIsRequestReviewOpen(true)}
        >
          {requestReviewLabel}
        </button>
        <button
          className="share-button share-button-primary label-s-semibold"
          type="button"
          disabled={isApproveDisabled}
          data-tooltip={isApproveDisabled ? "Sign in to approve" : undefined}
          onClick={approveProject}
        >
          <DsIcon name="thumbs-up-like-fill" size={20} />
          Approve
        </button>
      </div>
      {reviewToastMessage ? (
        <span className="share-request-toast label-xs-semibold" role="status">
          {reviewToastMessage}
        </span>
      ) : null}

      {isPopoverOpen ? (
        <aside className="share-popover" aria-label="Copy link settings" onPointerDown={(event) => event.stopPropagation()}>
          <button className="share-copy-primary label-s-semibold" type="button" onClick={copyLink}>
            Copy link
          </button>
          {hasCopied ? (
            <span className="share-copy-toast label-xs-semibold" role="status">
              Link copied
            </span>
          ) : null}
          <p className="share-helper-text label-s">For external sharing. No sign-in needed.</p>

          <ShareOptionSection
            title="Link opens"
            value={linkOpens === "stageOnly" ? `${stageLabel} only` : linkOpenLabels[linkOpens]}
            isExpanded={expandedSections.includes("linkOpens")}
            onToggle={() => toggleSection("linkOpens")}
          >
            {linkOptions.map((option) => (
              <ShareRadioOption
                key={option.value}
                label={option.label}
                selected={linkOpens === option.value}
                onSelect={() => selectLinkOpens(option.value)}
              />
            ))}
          </ShareOptionSection>

          <ShareOptionSection
            title="Access"
            value={accessLabels[access]}
            isExpanded={expandedSections.includes("access")}
            onToggle={() => toggleSection("access")}
          >
            {(["viewOnly", "canComment", "canEdit"] satisfies ShareAccess[]).map((option) => (
              <ShareRadioOption
                key={option}
                label={accessLabels[option]}
                selected={access === option}
                disabled={isVideoOnly && option !== "viewOnly"}
                onSelect={() => selectAccess(option)}
              />
            ))}
            {access === "canEdit" ? (
              <p className="share-section-helper label-xs">Approve and Request Review still need sign-in.</p>
            ) : null}
          </ShareOptionSection>
        </aside>
      ) : null}

      {isRequestReviewOpen && !isCustomerView ? (
        <RequestReviewModal
          role="studio"
          projectName={projectName}
          studioName={studioName}
          customerName={customerName}
          onClose={() => setIsRequestReviewOpen(false)}
          onSent={handleReviewSent}
        />
      ) : null}
    </div>
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
