"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { StudioClientPortalPreview } from "@/components/studio-onboard/StudioClientPortalPreview";
import { BriefGuidedExperience, getBriefConfigurableOptions } from "@/components/brief/BriefPage";
import {
  StudioBrandColourEditor,
  StudioBriefOptionsEditor,
  StudioManualSetupEditor,
  StudioVideoTypeEditor,
  type StudioReviewDialogId,
} from "@/components/studio-onboard/StudioReviewEditors";
import { getStudioBrandThemeStyle } from "@/components/studio-onboard/studioBrandTheme";
import { DsIcon } from "@/components/video-review/DsIcon";
import {
  briefSteps,
  briefVideoTypeDetails,
  createInitialBriefFields,
  type BriefFieldId,
  type BriefVideoTypeId,
} from "@/data/brief";
import {
  cloneStudioBriefConfiguration,
  createRecommendedStudioBriefConfiguration,
  getStudioBrandColours,
  getStudioCustomVideoTypes,
  studioOnboardingVideoTypeLabels,
  type StudioBrandColour,
  type StudioBriefConfiguration,
  type StudioReviewDraft,
} from "@/data/studio-onboard";

type GeneratedStudioSetupProps = {
  draft: StudioReviewDraft;
  onboardingFocus?: boolean;
  openManualSetupInitially?: boolean;
  onBack: () => void;
  onDraftChange: (draft: StudioReviewDraft) => void;
  onManualSetupResolved?: () => void;
  onUseSetup: () => void;
};

type BriefSurfaceMode = "configure" | null;

export function GeneratedStudioSetup({
  draft,
  onboardingFocus = false,
  openManualSetupInitially = false,
  onBack,
  onDraftChange,
  onManualSetupResolved,
  onUseSetup,
}: GeneratedStudioSetupProps) {
  const [activeDialogId, setActiveDialogId] = useState<StudioReviewDialogId | null>(
    openManualSetupInitially ? "manual" : null,
  );
  const [briefSurfaceMode, setBriefSurfaceMode] = useState<BriefSurfaceMode>(null);
  const [activeBriefOptionsFieldId, setActiveBriefOptionsFieldId] = useState<BriefFieldId | null>(null);
  const [briefConfigurationDraft, setBriefConfigurationDraft] = useState<StudioBriefConfiguration>(() =>
    cloneStudioBriefConfiguration(draft.briefConfiguration));
  const [videoTypeIdsDraft, setVideoTypeIdsDraft] = useState<BriefVideoTypeId[]>([...draft.videoTypeIds]);
  const [briefPreviewFields, setBriefPreviewFields] = useState(createInitialBriefFields);
  const [editingBrandColourIndex, setEditingBrandColourIndex] = useState<number | "new" | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const customVideoTypes = getStudioCustomVideoTypes(draft);
  const brandColours = getStudioBrandColours(draft);
  const brandThemeStyle = getStudioBrandThemeStyle(draft);

  function saveDraft(nextDraft: StudioReviewDraft) {
    onDraftChange(nextDraft);
    setActiveDialogId(null);
    onManualSetupResolved?.();
  }

  function setPrimaryBrandColour(primaryIndex: number) {
    onDraftChange({
      ...draft,
      brandColours: brandColours.map((colour, index): StudioBrandColour => ({
        ...colour,
        role: index === primaryIndex ? "primary" : "supporting",
      })),
    });
  }

  function removeBrandColour(colourIndex: number) {
    onDraftChange({
      ...draft,
      brandColours: brandColours.filter((_, index) => index !== colourIndex),
    });
  }

  function saveBrandColour(hex: string) {
    const nextColours = [...brandColours];

    if (editingBrandColourIndex === "new") {
      nextColours.push({ hex, role: "supporting" });
    } else if (editingBrandColourIndex !== null) {
      nextColours[editingBrandColourIndex] = {
        ...nextColours[editingBrandColourIndex],
        hex,
      };
    }

    onDraftChange({ ...draft, brandColours: nextColours });
    setEditingBrandColourIndex(null);
  }

  function updateLogo(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) {
      return;
    }

    void Promise.all(files.map(readFileAsDataUrl)).then((uploadedLogoOptions) => {
      const existingLogoOptions = getLogoOptions(draft);
      const nextLogoOptions = Array.from(new Set([...existingLogoOptions, ...uploadedLogoOptions]));

      onDraftChange({
        ...draft,
        logoPreviewUrl: uploadedLogoOptions[0] ?? draft.logoPreviewUrl,
        logoOptions: nextLogoOptions,
      });
    });
    event.target.value = "";
  }

  function openBriefConfiguration() {
    setBriefConfigurationDraft(cloneStudioBriefConfiguration(draft.briefConfiguration));
    setVideoTypeIdsDraft([...draft.videoTypeIds]);
    setBriefSurfaceMode("configure");
  }

  function toggleBriefFieldExcluded(fieldId: BriefFieldId) {
    setBriefConfigurationDraft((currentConfiguration) => ({
      ...currentConfiguration,
      excludedFieldIds: currentConfiguration.excludedFieldIds.includes(fieldId)
        ? currentConfiguration.excludedFieldIds.filter((currentFieldId) => currentFieldId !== fieldId)
        : [...currentConfiguration.excludedFieldIds, fieldId],
    }));
  }

  function saveBriefConfiguration() {
    onDraftChange({
      ...draft,
      briefConfiguration: cloneStudioBriefConfiguration(briefConfigurationDraft),
      videoTypeIds: [...videoTypeIdsDraft],
    });
    setBriefSurfaceMode(null);
  }

  function updateBriefPreviewFields(nextFields: ReturnType<typeof createInitialBriefFields>) {
    setBriefPreviewFields(nextFields);

    const selectedVideoTypeIds = briefVideoTypeDetails
      .filter((videoType) => nextFields.videoType.value
        .split(",")
        .map((value) => value.trim())
        .includes(videoType.name))
      .map((videoType) => videoType.name);

    setVideoTypeIdsDraft((currentVideoTypeIds) => Array.from(new Set([
      ...currentVideoTypeIds,
      ...selectedVideoTypeIds,
    ])));
  }

  function saveBriefOptionExclusions(excludedValues: string[]) {
    if (!activeBriefOptionsFieldId) {
      return;
    }

    if (activeBriefOptionsFieldId === "videoType") {
      const excludedVideoTypes = new Set(excludedValues);
      setVideoTypeIdsDraft(briefVideoTypeDetails
        .map((videoType) => videoType.name)
        .filter((videoTypeId) => !excludedVideoTypes.has(videoTypeId)));
      setActiveBriefOptionsFieldId(null);
      return;
    }

    setBriefConfigurationDraft((currentConfiguration) => ({
      ...currentConfiguration,
      excludedOptionValues: {
        ...currentConfiguration.excludedOptionValues,
        [activeBriefOptionsFieldId]: excludedValues,
      },
    }));
    setActiveBriefOptionsFieldId(null);
  }

  if (briefSurfaceMode === "configure") {
    return (
      <section
        className={`studio-review-brief-experience studio-branded-brief studio-client-accent-${draft.brandAccentId}`}
        style={brandThemeStyle}
        aria-labelledby="studio-review-brief-editor-heading"
      >
        <header className="studio-review-brief-experience-header studio-brief-configuration-header">
          <div>
            <h1 className="headings-s-bold" id="studio-review-brief-editor-heading">Review your client brief</h1>
            <p className="paragraph-s">
              Review the questions your clients will answer when starting a new video. We&apos;ve recommended these based on your studio.
            </p>
          </div>
          <div className="studio-brief-configuration-actions">
            <Button size="S" variant="secondary" onClick={() => setBriefSurfaceMode(null)}>Back to review</Button>
          </div>
        </header>
        <BriefGuidedExperience
          doneLabel="Save Brief"
          excludedFieldIds={briefConfigurationDraft.excludedFieldIds}
          excludedOptionValues={briefConfigurationDraft.excludedOptionValues}
          fields={briefPreviewFields}
          onEditFieldOptions={setActiveBriefOptionsFieldId}
          videoTypeIds={videoTypeIdsDraft}
          videoTypeOptionIds={briefVideoTypeDetails.map((videoType) => videoType.name)}
          onDone={saveBriefConfiguration}
          onFieldsChange={updateBriefPreviewFields}
          onToggleFieldExcluded={toggleBriefFieldExcluded}
          studioName={draft.studioName}
        />
        {activeBriefOptionsFieldId ? (
          <StudioBriefOptionsEditor
            excludedValues={activeBriefOptionsFieldId === "videoType"
              ? briefVideoTypeDetails
                .map((videoType) => videoType.name)
                .filter((videoTypeId) => !videoTypeIdsDraft.includes(videoTypeId))
              : briefConfigurationDraft.excludedOptionValues[activeBriefOptionsFieldId] ?? []}
            fieldLabel={briefPreviewFields[activeBriefOptionsFieldId].label}
            options={getBriefConfigurableOptions(activeBriefOptionsFieldId)}
            saveLabel={activeBriefOptionsFieldId === "videoType" ? "Save video types" : "Save options"}
            title={getBriefOptionsEditorTitle(activeBriefOptionsFieldId)}
            onCancel={() => setActiveBriefOptionsFieldId(null)}
            onSave={saveBriefOptionExclusions}
          />
        ) : null}
      </section>
    );
  }

  const selectedVideoTypes = briefVideoTypeDetails.filter((videoType) => draft.videoTypeIds.includes(videoType.name));
  const briefPreviewSections = briefSteps.filter((step) => step.id !== "summary").slice(0, 4);
  const logoOptions = getLogoOptions(draft);

  return (
    <section className="studio-generated-setup" aria-labelledby="studio-generated-heading">
      <header className="studio-generated-header">
        <div className="studio-generated-heading-copy">
          <h1 className="headings-m-bold" id="studio-generated-heading">Review your Studio</h1>
          <p className="paragraph-s">
            Check your Studio name and branding before Clients see them. You can edit these details later.
          </p>
          {!onboardingFocus ? <ul className="studio-generated-ready-list" aria-label="Studio setup prepared">
            {[
              "Studio profile prepared",
              "Client Brief prepared",
              "Video types selected",
            ].map((item) => (
              <li className="label-xs-semibold" key={item}>
                <DsIcon name="check-circle" size={16} />
                {item}
              </li>
            ))}
          </ul> : null}
        </div>
      </header>

      <div className="studio-setup-overview">
        <div className={`studio-review-bento-grid${onboardingFocus ? " is-branding-review" : ""}`}>
          <section
            className={`studio-review-bento-card studio-review-summary-tile studio-client-accent-${draft.brandAccentId}`}
            style={brandThemeStyle}
            aria-label="Studio summary"
          >
            <header className="studio-review-bento-card-header">
              <h3 className="headings-s-bold">{draft.studioName}</h3>
            </header>
            <div className="studio-review-summary-content">
              <p className="paragraph-m">{draft.studioType}</p>
              <span className="studio-review-summary-type label-xs-semibold">
                {draft.videoTypeIds.map((videoTypeId) => studioOnboardingVideoTypeLabels[videoTypeId]).join(" · ")}
              </span>
            </div>
          </section>

          {!onboardingFocus ? <section className="studio-review-bento-card studio-review-brief-tile" aria-labelledby="studio-review-brief-heading">
            <header className="studio-review-bento-card-header">
              <h2 className="headings-xs-bold" id="studio-review-brief-heading">Client Brief template</h2>
            </header>
            <div className="studio-review-brief-content">
              <p className="paragraph-s">The starting brief you or your clients will complete for new projects.</p>
              <ul className="studio-review-brief-sections" aria-label="Client Brief sections">
                {briefPreviewSections.map((step) => (
                  <li className="label-xs" key={step.id}>
                    <DsIcon name="check" size={14} />
                    {step.label}
                  </li>
                ))}
              </ul>
            </div>
            <footer className="studio-review-card-footer">
              <Button size="S" variant="secondary" className="studio-review-card-footer-action" type="button" onClick={openBriefConfiguration}>
                Review questions
              </Button>
            </footer>
          </section> : null}

          <section className="studio-review-bento-card studio-review-logo-tile" aria-labelledby="studio-review-logo-heading">
            <header className="studio-review-bento-card-header">
              <h2 className="headings-xs-bold" id="studio-review-logo-heading">Studio logo</h2>
            </header>
            <div className="studio-review-logo-selector">
              {draft.logoPreviewUrl ? (
                <img className="studio-review-logo-image" src={draft.logoPreviewUrl} alt={`${draft.studioName} logo`} />
              ) : (
                <span className="studio-brand-logo-empty-icon" aria-hidden="true">
                  <DsIcon name="image-square" size={24} />
                </span>
              )}
              {logoOptions.length > 0 ? (
                <div className="studio-review-logo-pagination" role="group" aria-label="Logo options">
                  {logoOptions.map((logoOption, index) => (
                    <button
                      className="studio-review-logo-pagination-dot"
                      type="button"
                      aria-label={`Show logo option ${index + 1}`}
                      aria-pressed={logoOption === draft.logoPreviewUrl}
                      key={logoOption}
                      onClick={() => onDraftChange({ ...draft, logoPreviewUrl: logoOption })}
                    />
                  ))}
                </div>
              ) : null}
            </div>
            <input
              ref={logoInputRef}
              className="studio-hidden-file-input"
              type="file"
              accept="image/*"
              multiple
              onChange={updateLogo}
            />
            <footer className="studio-review-card-footer">
              <Button size="S" variant="secondary"
                className="studio-review-card-footer-action"
                type="button"
                onClick={() => logoInputRef.current?.click()}
              >
                {draft.logoPreviewUrl ? "Edit logo" : "Upload logo"}
              </Button>
            </footer>
          </section>

          <section className="studio-review-bento-card studio-review-accent-tile" aria-labelledby="studio-review-accent-heading">
            <header className="studio-review-bento-card-header">
              <h2 className="headings-xs-bold" id="studio-review-accent-heading">Brand colours</h2>
              <Button size="S" type="button" variant="secondary" onClick={() => setEditingBrandColourIndex("new")}>
                + Add colour
              </Button>
            </header>
            {onboardingFocus ? <p className="paragraph-s">
              "Starting colours for your Client portal. Edit them to match your Studio."
            </p> : null}
            <ul className="studio-brand-colour-list" aria-label="Studio Brand Kit colours">
              {brandColours.map((colour, index) => (
                <li key={`${colour.hex}-${index}`}>
                  <div className="studio-brand-colour-value">
                    <span className="studio-brand-colour-swatch" style={{ backgroundColor: colour.hex }} aria-hidden="true" />
                    <strong className="label-s-semibold">{colour.hex}</strong>
                    {colour.role === "primary" ? <span className="studio-brand-colour-primary label-xs-semibold">Primary</span> : null}
                  </div>
                  <div className="studio-brand-colour-actions" role="group" aria-label={`Actions for ${colour.hex}`}>
                    {colour.role !== "primary" ? (
                      <button type="button" title="Set as primary" aria-label={`Set ${colour.hex} as primary`} onClick={() => setPrimaryBrandColour(index)}>
                        <DsIcon name="check-circle" size={16} />
                      </button>
                    ) : null}
                    <button type="button" title="Edit colour" aria-label={`Edit ${colour.hex}`} onClick={() => setEditingBrandColourIndex(index)}>
                      <DsIcon name="pencil-simple" size={16} />
                    </button>
                    <button type="button" title="Remove colour" aria-label={`Remove ${colour.hex}`} onClick={() => removeBrandColour(index)}>
                      <DsIcon name="trash-simple" size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {!onboardingFocus ? <section className="studio-review-bento-card studio-review-products-tile" aria-labelledby="studio-review-products-heading">
            <header className="studio-review-bento-card-header">
              <h2 className="headings-xs-bold" id="studio-review-products-heading">Products offered</h2>
            </header>
            <div className="studio-review-video-chips" aria-label="Products offered">
              {selectedVideoTypes.map((videoType) => (
                <span className="studio-review-video-chip label-xs-semibold" key={videoType.name}>
                  {studioOnboardingVideoTypeLabels[videoType.name]}
                </span>
              ))}
              {customVideoTypes.map((videoType) => (
                <span className="studio-review-video-chip label-xs-semibold" key={videoType.name}>
                  {videoType.name}
                </span>
              ))}
            </div>
            <footer className="studio-review-card-footer">
              <Button size="S" variant="secondary"
                className="studio-review-card-footer-action"
                type="button"
                onClick={() => setActiveDialogId("video-types")}
              >
                Edit products
              </Button>
            </footer>
          </section> : null}
        </div>
        {onboardingFocus ? (
          <section className="studio-generated-client-preview" aria-label="Client portal preview">
            <h2 className="headings-xs-bold">Client portal preview</h2>
            <StudioClientPortalPreview draft={draft} onPreviewBrief={openBriefConfiguration} />
          </section>
        ) : null}
      </div>

      <footer className="studio-generated-actions">
        <div className="studio-generated-secondary-actions">
          <Button size="S" type="button" variant="secondary" onClick={onBack}>Back</Button>
        </div>
        <div className="studio-generated-primary-action">
          <Button size="M" type="button" variant="primary" onClick={onUseSetup}>Confirm Studio setup</Button>
        </div>
      </footer>

      {activeDialogId === "video-types" ? (
        <StudioVideoTypeEditor draft={draft} onCancel={() => setActiveDialogId(null)} onSave={saveDraft} />
      ) : null}
      {activeDialogId === "manual" ? (
        <StudioManualSetupEditor
          draft={draft}
          onCancel={() => {
            setActiveDialogId(null);
            onManualSetupResolved?.();
          }}
          onSave={saveDraft}
        />
      ) : null}
      {editingBrandColourIndex !== null ? (
        <StudioBrandColourEditor
          colour={editingBrandColourIndex === "new" ? null : brandColours[editingBrandColourIndex]}
          onCancel={() => setEditingBrandColourIndex(null)}
          onSave={saveBrandColour}
        />
      ) : null}
    </section>
  );
}

function getLogoOptions(draft: StudioReviewDraft) {
  const logoOptions = draft.logoOptions ?? [];

  if (!draft.logoPreviewUrl) {
    return logoOptions;
  }

  return logoOptions.includes(draft.logoPreviewUrl)
    ? logoOptions
    : [draft.logoPreviewUrl, ...logoOptions];
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("The selected logo could not be read."));
    });
    reader.addEventListener("error", () => reject(reader.error ?? new Error("The selected logo could not be read.")));
    reader.readAsDataURL(file);
  });
}

function getBriefOptionsEditorTitle(fieldId: BriefFieldId) {
  const titles: Partial<Record<BriefFieldId, string>> = {
    videoType: "Edit video types",
    platform: "Edit platforms",
    purpose: "Edit purposes",
    callToAction: "Edit calls to action",
    feeling: "Edit tone options",
    brandKit: "Edit Brand Kits",
  };

  return titles[fieldId] ?? "Edit options";
}
