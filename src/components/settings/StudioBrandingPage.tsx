"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { ClientModal } from "@/components/clients/ClientPrimitives";
import { useStudioSettings } from "@/components/settings/StudioSettingsContext";
import { useStudioSettingsUnsavedChanges } from "@/components/settings/StudioSettingsShell";
import { StudioAccentPicker } from "@/components/studio-onboard/StudioReviewEditors";
import { DsIcon } from "@/components/video-review/DsIcon";
import { getBillingPlan, subscriptionFixtures } from "@/data/billing";
import { studioBrandAccentOptions } from "@/data/studio-onboard";
import type { StudioBranding } from "@/data/studio-settings";

const currentPlan = getBillingPlan(subscriptionFixtures.active.planId);
const poweredByBriskRequired = currentPlan.id === "starter" || currentPlan.id === "professional";
const clientPortalPreviewHref = "/customer-dashboard?client=loom&studio-preview=1";

export function StudioBrandingPage() {
  const { studio, updateBranding } = useStudioSettings();
  const { setHasUnsavedChanges } = useStudioSettingsUnsavedChanges();
  const [draft, setDraft] = useState<StudioBranding>(() => ({
    ...studio.branding,
    logoOptions: [...studio.branding.logoOptions],
  }));
  const [showColourOptions, setShowColourOptions] = useState(false);
  const [showSaveBeforePreview, setShowSaveBeforePreview] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const hasChanges = useMemo(() => JSON.stringify(draft) !== JSON.stringify(studio.branding), [draft, studio.branding]);
  const accentLabel = studioBrandAccentOptions.find((accent) => accent.id === draft.brandAccentId)?.label ?? "Brisk Purple";

  useEffect(() => {
    setHasUnsavedChanges(hasChanges);
  }, [hasChanges, setHasUnsavedChanges]);

  useEffect(() => () => setHasUnsavedChanges(false), [setHasUnsavedChanges]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const uploadLogo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result !== "string") return;
      setDraft((current) => ({
        ...current,
        logoPreviewUrl: reader.result as string,
        logoOptions: [...new Set([...current.logoOptions, reader.result as string])],
      }));
    });
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const saveBranding = () => {
    updateBranding(draft);
    setHasUnsavedChanges(false);
    setToast("Studio branding updated.");
  };

  const openClientPortalPreview = () => {
    window.open(clientPortalPreviewHref, "_blank", "noopener,noreferrer");
  };

  const previewClientPortal = () => {
    if (hasChanges) {
      setShowSaveBeforePreview(true);
      return;
    }
    openClientPortalPreview();
  };

  const saveAndPreview = () => {
    saveBranding();
    setShowSaveBeforePreview(false);
    openClientPortalPreview();
  };

  return (
    <section className="studio-settings-section studio-branding-settings" aria-label="Studio branding">
      <div className="studio-branding-controls">
          <section className="studio-settings-subsection" aria-labelledby="studio-brand-heading">
            <div className="studio-settings-section-heading">
              <div>
                <h2 className="headings-xs-bold" id="studio-brand-heading">Brand</h2>
                <p className="paragraph-s">Set the identity used across Studio-branded experiences.</p>
              </div>
            </div>

            <div className="studio-branding-field">
              <div>
                <h3 className="headings-2xs-bold">Logo</h3>
                <p className="paragraph-s">Shown in every Client portal.</p>
              </div>
              <div className="studio-branding-field-control">
                <div className={`studio-branding-logo-row studio-client-accent-${draft.brandAccentId}`}>
                  <StudioBrandingLogo
                    logoPreviewUrl={draft.logoPreviewUrl}
                    studioName={studio.details.name}
                  />
                  <strong className="label-m-semibold">{studio.details.name}</strong>
                </div>
                <input ref={logoInputRef} className="sr-only" type="file" accept="image/*" onChange={uploadLogo} />
                <Button size="M" variant="secondary" onClick={() => logoInputRef.current?.click()}>
                  <span className="studio-settings-button-content"><DsIcon name="upload-simple" size={16} /> Upload logo</span>
                </Button>
              </div>
            </div>

            <div className="studio-branding-field">
              <div>
                <h3 className="headings-2xs-bold">Primary colour</h3>
                <p className="paragraph-s">Currently {accentLabel}.</p>
              </div>
              <div className="studio-branding-field-control">
                {showColourOptions ? (
                  <StudioAccentPicker
                    value={draft.brandAccentId}
                    onChange={(brandAccentId) => {
                      setDraft((current) => ({ ...current, brandAccentId }));
                      setShowColourOptions(false);
                    }}
                  />
                ) : (
                  <div className={`studio-branding-current-colour studio-client-accent-${draft.brandAccentId}`}>
                    <span aria-hidden="true" />
                    <strong className="label-s-semibold">{accentLabel}</strong>
                  </div>
                )}
                <Button size="M" variant="secondary" onClick={() => setShowColourOptions((current) => !current)}>Change colour</Button>
              </div>
            </div>
          </section>

          <section className="studio-settings-subsection studio-branding-plan" aria-labelledby="studio-client-portal-branding-heading">
            <div className="studio-settings-section-heading">
              <div>
                <div className="studio-branding-plan-heading">
                  <h2 className="headings-xs-bold" id="studio-client-portal-branding-heading">Client portal branding</h2>
                  <span className="studio-settings-plan-badge label-xs-semibold">{currentPlan.name}</span>
                </div>
              </div>
            </div>

            <div className="studio-branding-treatment">
              <span className="label-xs">Current treatment</span>
              <strong className="label-s-semibold">{poweredByBriskRequired ? "Studio branded with Powered by Brisk" : "Studio branded without Brisk branding"}</strong>
            </div>

            <div className="studio-branding-locked-feature">
              <span><DsIcon name="lock" size={18} /></span>
              <div>
                <strong className="label-m-semibold">Remove Brisk branding</strong>
                <p className="paragraph-s">Available on the Business plan.</p>
              </div>
              <Link className="client-secondary-button label-s-semibold" href="/settings/plan-billing?compare=plans&target=business">View Business plan</Link>
            </div>

            <div className="studio-branding-locked-feature is-secondary">
              <span><DsIcon name="globe" size={18} /></span>
              <div>
                <strong className="label-m-semibold">Custom domain</strong>
                <p className="paragraph-s">Enterprise</p>
              </div>
              <span className="studio-settings-locked-badge label-xs-semibold"><DsIcon name="lock" size={12} /> Locked</span>
            </div>
          </section>
      </div>

      <div className="studio-settings-form-actions">
        <Button size="M" variant="secondary" onClick={previewClientPortal}>Preview Client portal</Button>
        <Button size="M" onClick={saveBranding}>Save branding</Button>
      </div>

      {showSaveBeforePreview ? (
        <ClientModal
          title="Save branding before previewing?"
          onClose={() => setShowSaveBeforePreview(false)}
          footer={(
            <>
              <Button size="M" variant="secondary" onClick={() => setShowSaveBeforePreview(false)}>Cancel</Button>
              <Button size="M" onClick={saveAndPreview}>Save and preview</Button>
            </>
          )}
        >
          <p className="paragraph-s">Save your latest logo and colour before opening the Client portal preview.</p>
        </ClientModal>
      ) : null}

      {toast ? (
        <div className="studio-settings-toast label-s-semibold" role="status">
          <DsIcon name="check-circle" size={16} />
          {toast}
        </div>
      ) : null}
    </section>
  );
}

function StudioBrandingLogo({ logoPreviewUrl, studioName }: { logoPreviewUrl: string | null; studioName: string }) {
  return (
    <span className="studio-client-logo" aria-label={`${studioName} logo`}>
      {logoPreviewUrl ? <img src={logoPreviewUrl} alt="" /> : <span className="headings-2xs-bold">{getInitials(studioName)}</span>}
    </span>
  );
}

function getInitials(name: string) {
  return name
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toLocaleUpperCase("en-AU"))
    .join("");
}
