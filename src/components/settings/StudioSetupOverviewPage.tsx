"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { useStudioSettings } from "@/components/settings/StudioSettingsContext";
import { StudioReviewDialog, StudioVideoTypeEditor } from "@/components/studio-onboard/StudioReviewEditors";
import { DsIcon } from "@/components/video-review/DsIcon";
import {
  cloneStudioBriefConfiguration,
  getStudioBrandColours,
  getStudioCustomVideoTypes,
  studioOnboardingVideoTypeLabels,
  type StudioReviewDraft,
} from "@/data/studio-onboard";
import type { BriefFieldId } from "@/data/brief";
import type { StudioBriefTemplate } from "@/data/prototype-state";

const briefSections = ["Project goals", "Audience", "Key message", "Video type", "Timing", "References"];

export function StudioSetupOverviewPage() {
  const { studio, updateDetails } = useStudioSettings();
  const { state, updateStudioTemplate } = usePrototypeState();
  const [isEditingServices, setIsEditingServices] = useState(false);
  const [isEditingBrief, setIsEditingBrief] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const workspace = state.workspaces.find((candidate) => candidate.id === state.session.activeWorkspaceId) ?? null;
  const template = state.studioBriefTemplates.find((candidate) => candidate.workspaceId === state.session.activeWorkspaceId) ?? null;
  const previewClientId = state.onboarding.clientId && state.clients.some((client) => (
    client.workspaceId === state.session.activeWorkspaceId && client.id === state.onboarding.clientId
  )) ? state.onboarding.clientId : state.session.activeClientId && state.clients.some((client) => (
    client.workspaceId === state.session.activeWorkspaceId && client.id === state.session.activeClientId
  )) ? state.session.activeClientId : null;
  const brandColours = getStudioBrandColours(studio.branding);
  const serviceDraft = useMemo<StudioReviewDraft | null>(() => workspace && template ? ({
    view: "studio-setup",
    studioName: workspace.name,
    studioWebsite: workspace.website,
    studioType: workspace.studioType,
    studioDescription: workspace.description,
    logoPreviewUrl: workspace.logoPreviewUrl,
    logoOptions: [...studio.branding.logoOptions],
    brandAccentId: workspace.brandAccentId,
    brandColours: getStudioBrandColours(workspace),
    videoTypeIds: [...template.videoTypeIds],
    customVideoTypes: template.customVideoTypes?.map((videoType) => ({ ...videoType })) ?? [],
    customVideoType: template.customVideoType ?? null,
    briefConfiguration: cloneStudioBriefConfiguration(template.configuration),
  }) : null, [studio.branding.logoOptions, template, workspace]);
  const offeredServices = serviceDraft ? [
    ...serviceDraft.videoTypeIds.map((videoTypeId) => studioOnboardingVideoTypeLabels[videoTypeId]),
    ...getStudioCustomVideoTypes(serviceDraft).map((videoType) => videoType.name),
  ] : [];

  function rewriteDescription() {
    const serviceSummary = offeredServices.slice(0, 3).join(", ").toLocaleLowerCase("en-AU");
    updateDetails({
      ...studio.details,
      description: `${studio.details.name} creates ${serviceSummary || "video"} for Clients from first Brief to final delivery.`,
    });
    setToast("Studio description rewritten.");
  }

  function saveServices(nextDraft: StudioReviewDraft) {
    if (!template) return;
    updateStudioTemplate({
      configuration: nextDraft.briefConfiguration,
      videoTypeIds: nextDraft.videoTypeIds,
      customVideoTypes: nextDraft.customVideoTypes,
      customVideoType: nextDraft.customVideoType,
    });
    setIsEditingServices(false);
    setToast("Services updated for future videos.");
  }

  function saveBriefFields(excludedFieldIds: BriefFieldId[]) {
    if (!template) return;
    updateStudioTemplate({
      configuration: { ...template.configuration, excludedFieldIds },
      videoTypeIds: template.videoTypeIds,
      customVideoTypes: template.customVideoTypes,
      customVideoType: template.customVideoType,
    });
    setIsEditingBrief(false);
    setToast("Default Brief updated for future videos.");
  }

  return (
    <section className="studio-settings-section studio-setup-overview" aria-label="Studio setup">
      <div className="studio-setup-overview-grid">
        <article className="studio-setup-settings-card">
          <header>
            <span className="studio-setup-settings-icon"><DsIcon name="settings" size={18} /></span>
            <div>
              <h2 className="headings-xs-bold">Studio profile</h2>
              <p className="paragraph-s">The Studio identity shown to your team and Clients.</p>
            </div>
          </header>
          <dl className="studio-setup-settings-list">
            <div><dt>Studio name</dt><dd>{studio.details.name}</dd></div>
            <div><dt>Description</dt><dd>{studio.details.description || "Not added"}</dd></div>
            <div><dt>Website</dt><dd>{studio.details.website || "Not added"}</dd></div>
            <div><dt>Studio type</dt><dd>{studio.details.studioType}</dd></div>
          </dl>
          <footer>
            <Button size="S" variant="secondary" onClick={rewriteDescription}>
              <span className="studio-settings-button-content"><DsIcon name="sparkle" size={16} /> Rewrite with AI</span>
            </Button>
            <Link className="client-secondary-button label-s-semibold" href="/settings/studio/details">Edit</Link>
          </footer>
        </article>

        <article className="studio-setup-settings-card">
          <header>
            <span className="studio-setup-settings-icon"><DsIcon name="square-logo" size={18} /></span>
            <div>
              <h2 className="headings-xs-bold">Branding</h2>
              <p className="paragraph-s">Used globally across this Studio&apos;s Client portals.</p>
            </div>
          </header>
          <div className="studio-setup-brand-summary">
            <span className="studio-setup-logo-summary">
              {studio.branding.logoPreviewUrl ? <img src={studio.branding.logoPreviewUrl} alt="" /> : <DsIcon name="image-square" size={18} />}
            </span>
            <div className="studio-setup-palette" aria-label="Studio colour palette">
              {brandColours.map((colour, index) => (
                <span className="studio-setup-colour" key={`${colour.hex}-${index}`}>
                  <i style={{ background: colour.hex }} />
                  <span className="label-xs">{colour.hex}{colour.role === "primary" ? " - Primary" : ""}</span>
                </span>
              ))}
            </div>
          </div>
          <footer><span /><Link className="client-secondary-button label-s-semibold" href="/settings/studio/branding">Edit</Link></footer>
        </article>

        <article className="studio-setup-settings-card">
          <header>
            <span className="studio-setup-settings-icon"><DsIcon name="video-camera-ds" size={18} /></span>
            <div>
              <h2 className="headings-xs-bold">Services</h2>
              <p className="paragraph-s">Video types offered by your Studio.</p>
            </div>
          </header>
          <div className="studio-setup-service-list">
            {offeredServices.length > 0 ? offeredServices.map((service) => (
              <span className="label-xs-semibold" key={service}>{service}</span>
            )) : <p className="paragraph-s">No video types added.</p>}
          </div>
          <footer><span /><Button size="S" variant="secondary" disabled={!serviceDraft} onClick={() => setIsEditingServices(true)}>Edit</Button></footer>
        </article>

        <article className="studio-setup-settings-card">
          <header>
            <span className="studio-setup-settings-icon"><DsIcon name="clipboard-text" size={18} /></span>
            <div>
              <h2 className="headings-xs-bold">Client experience</h2>
              <p className="paragraph-s">Defaults used when future videos are created.</p>
            </div>
          </header>
          <div className="studio-setup-client-defaults">
            <strong className="label-m-semibold">{template?.name ?? "Default Client Brief"}</strong>
            <ul className="label-xs">
              {briefSections.map((section) => <li key={section}>{section}</li>)}
            </ul>
            <p className="paragraph-s">
              Portal queue {studio.production.clientPortal.showProjectQueue ? "shown" : "hidden"}. Existing project Briefs will not change.
            </p>
          </div>
          <footer>
            {previewClientId ? (
              <Link
                className="client-secondary-button label-s-semibold"
                href={`/workspaces/${state.session.activeWorkspaceId}/clients/${previewClientId}/portal?studio-preview=1`}
              >Preview Client portal</Link>
            ) : (
              <span className="label-xs">Add or choose a Client to preview their portal.</span>
            )}
            <div className="studio-setup-card-actions">
              <Button size="S" variant="secondary" disabled={!template} onClick={() => setIsEditingBrief(true)}>Edit default Brief</Button>
              <Link className="client-secondary-button label-s-semibold" href="/settings/studio/production">Edit portal defaults</Link>
            </div>
          </footer>
        </article>
      </div>

      {isEditingServices && serviceDraft ? (
        <StudioVideoTypeEditor draft={serviceDraft} onCancel={() => setIsEditingServices(false)} onSave={saveServices} />
      ) : null}

      {isEditingBrief && template ? (
        <StudioDefaultBriefEditor
          template={template}
          onCancel={() => setIsEditingBrief(false)}
          onSave={saveBriefFields}
        />
      ) : null}

      {toast ? (
        <div className="studio-settings-toast label-s-semibold" role="status">
          <DsIcon name="check-circle" size={16} /> {toast}
        </div>
      ) : null}
    </section>
  );
}

function StudioDefaultBriefEditor({
  onCancel,
  onSave,
  template,
}: {
  onCancel: () => void;
  onSave: (excludedFieldIds: BriefFieldId[]) => void;
  template: StudioBriefTemplate;
}) {
  const [excludedFieldIds, setExcludedFieldIds] = useState<BriefFieldId[]>([...template.configuration.excludedFieldIds]);

  return (
    <StudioReviewDialog
      title="Edit default Client Brief"
      description="Choose the questions included when future videos are created. Existing project Briefs will not change."
      onClose={onCancel}
    >
      <div className="studio-review-dialog-body studio-video-type-editor-grid" role="group" aria-label="Default Brief questions">
        {Object.values(template.fields).map((field) => {
          const isIncluded = !excludedFieldIds.includes(field.id);
          return (
            <button
              className={`studio-video-type-editor-option ${isIncluded ? "selected" : ""}`}
              type="button"
              aria-pressed={isIncluded}
              key={field.id}
              onClick={() => setExcludedFieldIds((current) => current.includes(field.id)
                ? current.filter((fieldId) => fieldId !== field.id)
                : [...current, field.id])}
            >
              <span className="studio-video-type-editor-icon"><DsIcon name="clipboard-text" size={16} /></span>
              <strong className="label-s-semibold">{field.label}</strong>
            </button>
          );
        })}
      </div>
      <footer className="studio-review-dialog-actions">
        <Button size="S" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button size="S" variant="primary" onClick={() => onSave(excludedFieldIds)}>Save default Brief</Button>
      </footer>
    </StudioReviewDialog>
  );
}
