"use client";

import type { ReactNode } from "react";
import { StudioPreviewLogo } from "./StudioClientPortalPreview";
import { normaliseStudioWebsite } from "@/data/studio-website-profiles";
import type { StudioReviewDraft } from "@/data/studio-onboard";

/** Shared approved profile composition for onboarding and Studio settings. */
export function StudioProfileSummary({ draft, editAction, onLogoClick, logoInput, emptyLogoContent, showWebsite = false, headingAs: Heading = "h2" }: {
  draft: StudioReviewDraft;
  editAction: ReactNode;
  onLogoClick?: () => void;
  logoInput?: ReactNode;
  emptyLogoContent?: ReactNode;
  showWebsite?: boolean;
  headingAs?: "h2" | "h3";
}) {
  const website = draft.studioWebsite ? normaliseStudioWebsite(draft.studioWebsite) : null;
  return <section className="studio-review-bento-card studio-profile-review-panel" aria-label="Studio summary">
    <div className="studio-profile-review-identity">
      <div className="studio-profile-review-logo">
        <StudioPreviewLogo draft={draft} neutral onClick={onLogoClick} emptyLabel="No logo added" emptyContent={emptyLogoContent} />
        {logoInput}
      </div>
      <div className="studio-review-summary-content studio-profile-review-copy">
        <header className="studio-review-bento-card-header">
          <Heading className="headings-s-bold">{draft.studioName}</Heading>
          {editAction}
        </header>
        <p className="paragraph-s">{draft.studioDescription || "No description added."}</p>
        {showWebsite ? <p className="paragraph-s">{website
          ? <a className="studio-review-text-link" href={website} target="_blank" rel="noreferrer">{draft.studioWebsite}</a>
          : "No website added."}</p> : null}
      </div>
    </div>
  </section>;
}
