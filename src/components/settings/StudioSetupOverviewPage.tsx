"use client";

import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { Checkbox } from "../../../Brisk DS/src/app/components/Checkbox";
import { Input } from "../../../Brisk DS/src/app/components/Input";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { useStudioSettings } from "@/components/settings/StudioSettingsContext";
import { RowDragHandle } from "@/components/script/RowDragHandle";
import { StudioReviewDialog, StudioVideoTypeEditor } from "@/components/studio-onboard/StudioReviewEditors";
import { DsIcon } from "@/components/video-review/DsIcon";
import {
  cloneStudioBriefConfiguration,
  getStudioBrandColours,
  getStudioBriefFieldOrder,
  getStudioCustomVideoTypes,
  studioOnboardingVideoTypeLabels,
  type StudioReviewDraft,
} from "@/data/studio-onboard";
import type { BriefFieldId } from "@/data/brief";
import type { StudioBriefTemplate } from "@/data/prototype-state";

const briefQuestionWording: Partial<Record<BriefFieldId, string>> = {
  workingTitle: "What is the working title of this video?",
  videoType: "What type of video do you want to make?",
  platform: "Where will the main video be used?",
  description: "What is the video about? Include anything it must say or avoid.",
  purpose: "What should this video achieve?",
};

const briefQuestionShortLabels: Record<BriefFieldId, string> = {
  workingTitle: "Working title",
  videoType: "Video type",
  platform: "Platform",
  description: "Description",
  purpose: "Purpose",
  audience: "Audience",
  feeling: "Tone",
  referenceVideos: "Similar videos",
  brandKit: "Brand kit",
  liveFootage: "Footage",
  voiceover: "Voiceover",
  callToAction: "Viewer action",
  deliverables: "Versions",
  deadline: "Deadline",
};

export function StudioSetupOverviewPage() {
  const { studio, updateBranding, updateDetails } = useStudioSettings();
  const { state, updateStudioTemplate } = usePrototypeState();
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingLogo, setIsEditingLogo] = useState(false);
  const [isEditingServices, setIsEditingServices] = useState(false);
  const [isEditingBrief, setIsEditingBrief] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const workspace = state.workspaces.find((candidate) => candidate.id === state.session.activeWorkspaceId) ?? null;
  const template = state.studioBriefTemplates.find((candidate) => candidate.workspaceId === state.session.activeWorkspaceId) ?? null;
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
  const includedQuestionCount = template ? Object.values(template.fields)
    .filter((field) => !template.configuration.excludedFieldIds.includes(field.id)).length : 0;

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

  function saveBriefFields(excludedFieldIds: BriefFieldId[], fieldOrder: BriefFieldId[]) {
    if (!template) return;
    updateStudioTemplate({
      configuration: { ...template.configuration, excludedFieldIds, fieldOrder },
      videoTypeIds: template.videoTypeIds,
      customVideoTypes: template.customVideoTypes,
      customVideoType: template.customVideoType,
    });
    setIsEditingBrief(false);
    setToast("Default Brief updated for future videos.");
  }

  return (
    <section className="studio-settings-section studio-setup-overview" aria-label="Studio setup">
      <div className="studio-setup-overview-sections">
        <section className="studio-setup-settings-group" aria-labelledby="studio-identity-heading">
          <h2 className="headings-s-bold" id="studio-identity-heading">Studio identity</h2>
          <div className="studio-setup-settings-panel">
            <div className="studio-setup-settings-row">
              <div className="studio-setup-settings-row-copy">
                <h3 className="label-s">Studio name</h3>
                <strong className="label-m-semibold">{studio.details.name}</strong>
              </div>
              <Button size="S" variant="secondary" onClick={() => setIsEditingName(true)}>Edit name</Button>
            </div>
            <div className="studio-setup-settings-row">
              <div className="studio-setup-settings-row-copy">
                <h3 className="label-s">Studio logo</h3>
                <span className="studio-setup-logo-summary studio-setup-logo-summary-row studio-client-accent-purple" aria-label={`${studio.details.name} logo`}>
                  {studio.branding.logoPreviewUrl
                    ? <img src={studio.branding.logoPreviewUrl} alt="" />
                    : <span className="headings-2xs-bold">{getInitials(studio.details.name)}</span>}
                </span>
              </div>
              <Button size="S" variant="secondary" onClick={() => setIsEditingLogo(true)}>{studio.branding.logoPreviewUrl ? "Change logo" : "Add logo"}</Button>
            </div>
          </div>
        </section>

        <section className="studio-setup-settings-group" aria-labelledby="video-setup-heading">
          <h2 className="headings-s-bold" id="video-setup-heading">Video setup</h2>
          <div className="studio-setup-settings-panel">
            <div className="studio-setup-settings-row">
              <div className="studio-setup-settings-row-copy">
                <h3 className="label-s">Video types</h3>
                <div className="studio-setup-service-list">
                  {offeredServices.length > 0 ? offeredServices.map((service) => (
                    <span className="label-xs-semibold" key={service}>{service}</span>
                  )) : <p className="paragraph-s">No video types added.</p>}
                </div>
              </div>
              <Button size="S" variant="secondary" disabled={!serviceDraft} onClick={() => setIsEditingServices(true)}>Edit video types</Button>
            </div>
            <div className="studio-setup-settings-row">
              <div className="studio-setup-settings-row-copy">
                <h3 className="label-s">Default Client Brief</h3>
                <strong className="label-m-semibold">
                  {includedQuestionCount} {includedQuestionCount === 1 ? "question" : "questions"} in new Briefs
                </strong>
              </div>
              <Button size="S" variant="secondary" disabled={!template} onClick={() => setIsEditingBrief(true)}>Edit questions</Button>
            </div>
          </div>
        </section>
      </div>

      {isEditingName ? (
        <StudioNameEditor
          name={studio.details.name}
          onCancel={() => setIsEditingName(false)}
          onSave={(name) => {
            updateDetails({ ...studio.details, name });
            setIsEditingName(false);
            setToast("Studio name updated.");
          }}
        />
      ) : null}

      {isEditingLogo ? (
        <StudioLogoEditor
          logoPreviewUrl={studio.branding.logoPreviewUrl}
          studioName={studio.details.name}
          onCancel={() => setIsEditingLogo(false)}
          onSave={(logoPreviewUrl) => {
            updateBranding({
              ...studio.branding,
              logoPreviewUrl,
              logoOptions: logoPreviewUrl
                ? [...new Set([...studio.branding.logoOptions, logoPreviewUrl])]
                : [...studio.branding.logoOptions],
            });
            setIsEditingLogo(false);
            setToast("Studio logo updated.");
          }}
        />
      ) : null}

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

function StudioNameEditor({
  name,
  onCancel,
  onSave,
}: {
  name: string;
  onCancel: () => void;
  onSave: (name: string) => void;
}) {
  const [draftName, setDraftName] = useState(name);

  return (
    <StudioReviewDialog title="Edit Studio name" onClose={onCancel} actions={<>
        <Button size="S" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button size="S" variant="primary" disabled={!draftName.trim()} onClick={() => onSave(draftName.trim())}>Save name</Button>
      </>}> <div className="studio-editor-fields">
        <Input label="Studio name" value={draftName} onChange={(event) => setDraftName(event.target.value)} />
      </div>  </StudioReviewDialog>
  );
}

function StudioLogoEditor({
  logoPreviewUrl,
  studioName,
  onCancel,
  onSave,
}: {
  logoPreviewUrl: string | null;
  studioName: string;
  onCancel: () => void;
  onSave: (logoPreviewUrl: string | null) => void;
}) {
  const [draftLogoUrl, setDraftLogoUrl] = useState(logoPreviewUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function uploadLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") setDraftLogoUrl(reader.result);
    });
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  return (
    <StudioReviewDialog title="Edit Studio logo" description="Shown in every Client portal." onClose={onCancel} actions={<>
        <Button size="S" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button size="S" variant="primary" onClick={() => onSave(draftLogoUrl)}>Save logo</Button>
      </>}> <div className="studio-editor-fields">
        <div className="studio-setup-logo-editor-preview">
          <span className="studio-setup-logo-summary studio-client-accent-purple" aria-label={`${studioName} logo`}>
            {draftLogoUrl ? <img src={draftLogoUrl} alt="" /> : <span className="headings-2xs-bold">{getInitials(studioName)}</span>}
          </span>
          <Button size="S" variant="secondary" onClick={() => fileInputRef.current?.click()}>
            <DsIcon name="upload-simple" size={16} /> Upload logo
          </Button>
          {draftLogoUrl ? <Button size="S" variant="secondary" onClick={() => setDraftLogoUrl(null)}>Remove logo</Button> : null}
          <input ref={fileInputRef} className="sr-only" type="file" accept="image/*" onChange={uploadLogo} />
        </div>
      </div>  </StudioReviewDialog>
  );
}

function StudioDefaultBriefEditor({
  onCancel,
  onSave,
  template,
}: {
  onCancel: () => void;
  onSave: (excludedFieldIds: BriefFieldId[], fieldOrder: BriefFieldId[]) => void;
  template: StudioBriefTemplate;
}) {
  const [excludedFieldIds, setExcludedFieldIds] = useState<BriefFieldId[]>([...template.configuration.excludedFieldIds]);
  const [fieldOrder, setFieldOrder] = useState<BriefFieldId[]>(() => getStudioBriefFieldOrder(template.configuration, template.fields));
  const [draggingFieldId, setDraggingFieldId] = useState<BriefFieldId | null>(null);
  const [dropFieldId, setDropFieldId] = useState<BriefFieldId | null>(null);

  function moveField(fieldId: BriefFieldId, direction: -1 | 1) {
    setFieldOrder((current) => {
      const index = current.indexOf(fieldId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  function reorderField(sourceId: BriefFieldId, targetId: BriefFieldId) {
    if (sourceId !== targetId) {
      setFieldOrder((current) => {
        const sourceIndex = current.indexOf(sourceId);
        const targetIndex = current.indexOf(targetId);
        if (sourceIndex < 0 || targetIndex < 0) return current;
        const next = [...current];
        const [moving] = next.splice(sourceIndex, 1);
        next.splice(targetIndex, 0, moving);
        return next;
      });
    }
    setDraggingFieldId(null);
    setDropFieldId(null);
  }

  return (
    <StudioReviewDialog
      title="Edit default Client Brief"
      description="Choose which questions appear and their order in future Briefs. Existing project Briefs will not change."
      onClose={onCancel}
     actions={<>
        <Button size="S" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button size="S" variant="primary" onClick={() => onSave(excludedFieldIds, fieldOrder)}>Save default Brief</Button>
      </>}> <div className="studio-editor-fields studio-brief-question-editor" role="group" aria-label="Default Brief questions">
        {fieldOrder.map((fieldId, index) => {
          const field = template.fields[fieldId];
          return (
            <div
              className={`studio-brief-question-row ${draggingFieldId && dropFieldId === fieldId && draggingFieldId !== fieldId ? "drop-target" : ""}`}
              draggable
              key={fieldId}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", fieldId);
                setDraggingFieldId(fieldId);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDropFieldId(fieldId);
              }}
              onDrop={(event) => {
                event.preventDefault();
                const sourceId = (event.dataTransfer.getData("text/plain") || draggingFieldId) as BriefFieldId | null;
                if (sourceId && fieldOrder.includes(sourceId)) reorderField(sourceId, fieldId);
                else setDropFieldId(null);
              }}
              onDragEnd={() => {
                setDraggingFieldId(null);
                setDropFieldId(null);
              }}
            >
              <span className="studio-brief-question-position label-xs-semibold">{index + 1}</span>
              <RowDragHandle
                label={`Drag ${briefQuestionShortLabels[fieldId]} to reorder. Use the up and down arrow keys to move it.`}
                onDragEnd={() => {
                  setDraggingFieldId(null);
                  setDropFieldId(null);
                }}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", fieldId);
                  setDraggingFieldId(fieldId);
                }}
                onKeyDown={(event) => {
                  if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
                  event.preventDefault();
                  moveField(fieldId, event.key === "ArrowUp" ? -1 : 1);
                }}
              />
              <div className="studio-brief-question-copy">
                <Checkbox
                  label={briefQuestionShortLabels[fieldId]}
                  checked={!excludedFieldIds.includes(fieldId)}
                  checkedIcon={<DsIcon name="check" size={14} />}
                  onChange={(included) => setExcludedFieldIds((current) => included
                    ? current.filter((id) => id !== fieldId)
                    : [...current, fieldId])}
                />
                <p className="label-xs">{briefQuestionWording[fieldId] ?? field.label}</p>
              </div>
            </div>
          );
        })}
      </div>  </StudioReviewDialog>
  );
}

function getInitials(name: string) {
  return name.split(/\s+/u).filter(Boolean).slice(0, 2).map((part) => part.charAt(0).toLocaleUpperCase("en-AU")).join("");
}
