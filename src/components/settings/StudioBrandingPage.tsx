"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { ClientModal } from "@/components/clients/ClientPrimitives";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { useStudioSettings } from "@/components/settings/StudioSettingsContext";
import { useStudioSettingsUnsavedChanges } from "@/components/settings/StudioSettingsShell";
import { StudioBrandColourEditor } from "@/components/studio-onboard/StudioReviewEditors";
import { getStudioBrandThemeStyle } from "@/components/studio-onboard/studioBrandTheme";
import { DsIcon } from "@/components/video-review/DsIcon";
import { getBillingPlan, subscriptionFixtures } from "@/data/billing";
import { getStudioBrandColours, type StudioBrandColour } from "@/data/studio-onboard";
import type { StudioBranding } from "@/data/studio-settings";

const currentPlan = getBillingPlan(subscriptionFixtures.active.planId);
const poweredByBriskRequired = currentPlan.id === "starter" || currentPlan.id === "professional";
export function StudioBrandingPage() {
  const { studio, updateBranding } = useStudioSettings();
  const { state } = usePrototypeState();
  const { setHasUnsavedChanges } = useStudioSettingsUnsavedChanges();
  const [draft, setDraft] = useState<StudioBranding>(() => ({
    ...studio.branding,
    logoOptions: [...studio.branding.logoOptions],
    brandColours: getStudioBrandColours(studio.branding),
  }));
  const [editingBrandColourIndex, setEditingBrandColourIndex] = useState<number | "new" | null>(null);
  const [showSaveBeforePreview, setShowSaveBeforePreview] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const hasChanges = useMemo(() => JSON.stringify(draft) !== JSON.stringify(studio.branding), [draft, studio.branding]);
  const brandColours = getStudioBrandColours(draft);
  const previewClientId = state.onboarding.clientId && state.clients.some((client) => (
    client.workspaceId === state.session.activeWorkspaceId && client.id === state.onboarding.clientId
  )) ? state.onboarding.clientId : state.session.activeClientId && state.clients.some((client) => (
    client.workspaceId === state.session.activeWorkspaceId && client.id === state.session.activeClientId
  )) ? state.session.activeClientId : null;
  const clientPortalPreviewHref = previewClientId
    ? `/workspaces/${state.session.activeWorkspaceId}/clients/${previewClientId}/portal?studio-preview=1`
    : null;

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
    if (!clientPortalPreviewHref) return;
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

  const setPrimaryColour = (primaryIndex: number) => {
    setDraft((current) => ({
      ...current,
      brandColours: getStudioBrandColours(current).map((colour, index): StudioBrandColour => ({
        ...colour,
        role: index === primaryIndex ? "primary" : "supporting",
      })),
    }));
  };

  const removeColour = (colourIndex: number) => {
    setDraft((current) => ({
      ...current,
      brandColours: getStudioBrandColours(current).filter((_, index) => index !== colourIndex),
    }));
  };

  const saveColour = (hex: string) => {
    setDraft((current) => {
      const nextColours = getStudioBrandColours(current);
      if (editingBrandColourIndex === "new") {
        nextColours.push({ hex, role: "supporting" });
      } else if (editingBrandColourIndex !== null) {
        nextColours[editingBrandColourIndex] = { ...nextColours[editingBrandColourIndex], hex };
      }
      return { ...current, brandColours: nextColours };
    });
    setEditingBrandColourIndex(null);
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
                <div
                  className={`studio-branding-logo-row studio-client-accent-${draft.brandAccentId}`}
                  style={getStudioBrandThemeStyle(draft)}
                >
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

            <div className="studio-branding-field studio-branding-palette-field">
              <div>
                <h3 className="headings-2xs-bold">Brand colours</h3>
                <p className="paragraph-s">The primary colour is used for portal buttons and active states. Text contrast is selected automatically.</p>
              </div>
              <div className="studio-branding-palette-list">
                {brandColours.map((colour, index) => (
                  <div className="studio-branding-palette-row" key={`${colour.hex}-${index}`}>
                    <span className="studio-branding-palette-swatch" style={{ backgroundColor: colour.hex }} aria-hidden="true" />
                    <strong className="label-s-semibold">{colour.hex}</strong>
                    {colour.role === "primary" ? <span className="studio-branding-primary-badge label-xs-semibold">Primary</span> : (
                      <button className="studio-review-text-button label-xs-semibold" type="button" onClick={() => setPrimaryColour(index)}>Set as primary</button>
                    )}
                    <button className="studio-review-text-button label-xs-semibold" type="button" onClick={() => setEditingBrandColourIndex(index)}>Edit</button>
                    {brandColours.length > 1 ? (
                      <button className="studio-review-text-button label-xs-semibold" type="button" onClick={() => removeColour(index)}>Remove</button>
                    ) : null}
                  </div>
                ))}
              </div>
              <div>
                <Button size="S" variant="secondary" onClick={() => setEditingBrandColourIndex("new")}>
                  <span className="studio-settings-button-content"><DsIcon name="plus" size={16} /> Add colour</span>
                </Button>
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
        <Button size="M" variant="secondary" disabled={!clientPortalPreviewHref} onClick={previewClientPortal}>Preview Client portal</Button>
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

      {editingBrandColourIndex !== null ? (
        <StudioBrandColourEditor
          colour={editingBrandColourIndex === "new" ? null : brandColours[editingBrandColourIndex]}
          onCancel={() => setEditingBrandColourIndex(null)}
          onSave={saveColour}
        />
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
