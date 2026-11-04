"use client";

import Link from "next/link";
import { useRef, useState, type ChangeEvent } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { IconButton } from "../../../Brisk DS/src/app/components/IconButton";
import { DsIcon } from "@/components/video-review/DsIcon";
import { StudioProfileSummary } from "./StudioProfileSummary";
import { StudioEditor } from "./StudioReviewEditors";
import { readFileAsDataUrl } from "./studioLogoFiles";
import type { StudioReviewDraft } from "@/data/studio-onboard";

export function StudioProfileReview({ draft, onChange, onBack, onContinue, onOpenSettings, canOpenSettings }: {
  draft: StudioReviewDraft;
  onChange: (draft: StudioReviewDraft) => void;
  onBack: () => void;
  onContinue: () => void;
  onOpenSettings: () => void;
  canOpenSettings: boolean;
}) {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  async function updateLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setLogoError(null);
    try {
      const logoPreviewUrl = await readFileAsDataUrl(file);
      const current = draftRef.current;
      onChange({ ...current, logoPreviewUrl, logoOptions: [...new Set([...current.logoOptions, logoPreviewUrl])] });
    } catch {
      setLogoError("The selected logo could not be read. Try another image.");
    }
  }

  return (
    <main className="studio-onboard-flow">
      <section className="studio-onboard-stage" aria-labelledby="studio-profile-review-heading">
        <div className="studio-ai-question-centre studio-profile-review">
          <h1 className="headings-m-bold" id="studio-profile-review-heading">Does this look right?</h1>
          <StudioProfileSummary draft={draft} onLogoClick={() => logoInputRef.current?.click()}
            emptyLogoContent={<><DsIcon name="upload-simple" size={16} /><span className="label-xs">Add logo</span></>}
            logoInput={<input ref={logoInputRef} className="studio-hidden-file-input" type="file" accept="image/*" onChange={updateLogo} />}
            editAction={<IconButton aria-label="Edit Studio profile" tooltip="Edit profile" tooltipAlign="end" onClick={() => setIsEditingProfile(true)}>
              <DsIcon name="pencil-simple" size={16} />
            </IconButton>} />
          {logoError ? <p className="paragraph-s studio-review-validation" role="alert">{logoError}</p> : null}
          <p className="paragraph-s studio-review-dialog-note">You can change these details in {canOpenSettings
            ? <Link className="studio-review-text-link" href="/settings/studio#studio-identity-heading" onClick={onOpenSettings}>Studio settings</Link>
            : "Studio settings"}.</p>
          <footer className="studio-review-bento-actions studio-profile-review-actions">
            <Button size="M" variant="secondary" onClick={onBack}>Back</Button>
            <Button size="M" onClick={onContinue} disabled={!draft.studioName.trim() || !draft.studioDescription.trim()}>Looks good</Button>
          </footer>
        </div>
      </section>
      {isEditingProfile ? <StudioEditor profileOnly draft={draft}
        onCancel={() => setIsEditingProfile(false)} onSave={(nextDraft) => { onChange(nextDraft); setIsEditingProfile(false); }} /> : null}
    </main>
  );
}
