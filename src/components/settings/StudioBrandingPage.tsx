"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { ConfirmationDialog } from "../../../Brisk DS/src/app/components/ConfirmationDialog";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { useStudioSettings } from "@/components/settings/StudioSettingsContext";
import { useStudioSettingsUnsavedChanges } from "@/components/settings/StudioSettingsShell";
import { DsIcon } from "@/components/video-review/DsIcon";
import type { StudioBranding } from "@/data/studio-settings";

export function StudioBrandingPage() {
  const { studio, updateBranding } = useStudioSettings();
  const { state } = usePrototypeState();
  const { setHasUnsavedChanges } = useStudioSettingsUnsavedChanges();
  const [draft, setDraft] = useState<StudioBranding>(() => ({
    ...studio.branding,
    logoOptions: [...studio.branding.logoOptions],
  }));
  const [showSaveBeforePreview, setShowSaveBeforePreview] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const hasChanges = useMemo(() => JSON.stringify(draft) !== JSON.stringify(studio.branding), [draft, studio.branding]);
  const previewClientId = state.onboarding.clientId && state.clients.some((client) => (
    client.workspaceId === state.session.activeWorkspaceId && client.id === state.onboarding.clientId
  )) ? state.onboarding.clientId : state.session.activeClientId && state.clients.some((client) => (
    client.workspaceId === state.session.activeWorkspaceId && client.id === state.session.activeClientId
  )) ? state.session.activeClientId : null;
  const clientPortalPreviewHref = previewClientId
    ? `/workspaces/${state.session.activeWorkspaceId}/clients/${previewClientId}/portal?studio-preview=1`
    : null;

  useEffect(() => {
    setHasUnsavedChanges(hasChanges, "branding");
  }, [hasChanges, setHasUnsavedChanges]);

  useEffect(() => () => setHasUnsavedChanges(false, "branding"), [setHasUnsavedChanges]);

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
    setHasUnsavedChanges(false, "branding");
    setToast("Studio logo updated.");
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

  return (
    <section className="studio-settings-section studio-branding-settings" aria-label="Studio branding">
      <div className="studio-branding-controls">
          <section className="studio-settings-subsection">
            <div className="studio-branding-field">
              <div>
                <h3 className="headings-2xs-bold">Logo</h3>
                <p className="paragraph-s">Shown in every Client portal.</p>
              </div>
              <div className="studio-branding-field-control">
                <div
                  className="studio-branding-logo-row studio-client-accent-purple"
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

          </section>
      </div>

      <div className="studio-settings-form-actions">
        <Button size="M" variant="secondary" disabled={!clientPortalPreviewHref} onClick={previewClientPortal}>Preview Client portal</Button>
        <Button size="M" onClick={saveBranding}>Save logo</Button>
      </div>

      {showSaveBeforePreview ? (
        <ConfirmationDialog title="Save branding before previewing?" description="Save your latest logo before opening the Client portal preview." confirmLabel="Save and preview" onCancel={() => setShowSaveBeforePreview(false)} onConfirm={saveAndPreview} />
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
