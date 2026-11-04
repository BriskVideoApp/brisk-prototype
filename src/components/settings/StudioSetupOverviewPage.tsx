"use client";

import { useMemo, useState } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { Checkbox } from "../../../Brisk DS/src/app/components/Checkbox";
import { Toggle } from "../../../Brisk DS/src/app/components/Toggle";
import { StudioProfileSummary } from "@/components/studio-onboard/StudioProfileSummary";
import { SettingsSummaryRow } from "./SettingsSummaryRow";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { useStudioSettings } from "@/components/settings/StudioSettingsContext";
import { RowDragHandle } from "@/components/script/RowDragHandle";
import { StudioEditor, StudioReviewDialog, StudioVideoTypeEditor } from "@/components/studio-onboard/StudioReviewEditors";
import { DsIcon } from "@/components/video-review/DsIcon";
import {
  cloneStudioBriefConfiguration,
  createRecommendedStudioBriefConfiguration,
  getStudioBrandColours,
  getStudioBriefFieldOrder,
  getStudioCustomVideoTypes,
  showClientDeliveryDates,
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
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isEditingServices, setIsEditingServices] = useState(false);
  const [isEditingBrief, setIsEditingBrief] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const workspace = state.workspaces.find((candidate) => candidate.id === state.session.activeWorkspaceId) ?? null;
  const template = state.studioBriefTemplates.find((candidate) => candidate.workspaceId === state.session.activeWorkspaceId) ?? null;
  const serviceDraft = useMemo<StudioReviewDraft | null>(() => workspace ? ({
    view: "studio-setup",
    studioName: workspace.name,
    studioWebsite: workspace.website,
    studioType: workspace.studioType,
    studioDescription: workspace.description,
    logoPreviewUrl: workspace.logoPreviewUrl,
    logoOptions: [...studio.branding.logoOptions],
    brandAccentId: workspace.brandAccentId,
    brandColours: getStudioBrandColours(workspace),
    videoTypeIds: [...(template?.videoTypeIds ?? [])],
    customVideoTypes: template?.customVideoTypes?.map((videoType) => ({ ...videoType })) ?? [],
    customVideoType: template?.customVideoType ?? null,
    briefConfiguration: template ? cloneStudioBriefConfiguration(template.configuration) : createRecommendedStudioBriefConfiguration(),
  }) : null, [studio.branding.logoOptions, template, workspace]);
  const offeredServices = serviceDraft ? [
    ...serviceDraft.videoTypeIds.map((videoTypeId) => studioOnboardingVideoTypeLabels[videoTypeId]),
    ...getStudioCustomVideoTypes(serviceDraft).map((videoType) => videoType.name),
  ] : [];
  const includedQuestionCount = template ? Object.values(template.fields)
    .filter((field) => field.id !== "deadline" && !template.configuration.excludedFieldIds.includes(field.id)).length : 0;

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
          <h2 className="headings-s-bold" id="studio-identity-heading">Studio profile</h2>
          {serviceDraft ? <StudioProfileSummary draft={serviceDraft} headingAs="h3" showWebsite
            editAction={<Button size="S" variant="ghost" onClick={() => setIsEditingDetails(true)}>Edit profile</Button>} /> : null}
        </section>

        <section className="studio-setup-settings-group" aria-labelledby="video-setup-heading">
          <h2 className="headings-s-bold" id="video-setup-heading">Video setup</h2>
          <div className="studio-setup-settings-panel">
            <SettingsSummaryRow title="Video types" action={<Button size="S" variant="secondary" disabled={!serviceDraft || !template} onClick={() => setIsEditingServices(true)}>Edit video types</Button>}>
                <div className="studio-setup-service-list">
                  {offeredServices.length > 0 ? offeredServices.map((service) => (
                    <span className="label-xs-semibold" key={service}>{service}</span>
                  )) : <p className="paragraph-s">No video types added.</p>}
                </div>
            </SettingsSummaryRow>
            <SettingsSummaryRow title="Default Client Brief" action={<Button size="S" variant="secondary" disabled={!template} onClick={() => setIsEditingBrief(true)}>Configure Brief</Button>}>
                <strong className="label-m-semibold">
                  {includedQuestionCount} {includedQuestionCount === 1 ? "question" : "questions"} · Applies to new videos
                </strong>
            </SettingsSummaryRow>
            <SettingsSummaryRow title="Client delivery dates" action={<Toggle aria-label="Show delivery dates to Clients" disabled={!template}
              checked={showClientDeliveryDates(template?.configuration)} onChange={(event) => {
                if (!template) return;
                updateStudioTemplate({ configuration: { ...template.configuration, showClientDeliveryDates: event.target.checked },
                  videoTypeIds: template.videoTypeIds, customVideoTypes: template.customVideoTypes, customVideoType: template.customVideoType });
                setToast(event.target.checked ? "Delivery dates shown in Client Briefs." : "Delivery dates hidden from Client Briefs.");
              }} />}>
              <p className="paragraph-s">Show a date field for each deliverable in Client Briefs. The Studio always has access.</p>
            </SettingsSummaryRow>
          </div>
          <p className="paragraph-s studio-review-dialog-note">Video types and questions apply to new videos. Date visibility applies to all Client Briefs.</p>
        </section>
      </div>

      {isEditingDetails && serviceDraft ? (
        <StudioEditor profileOnly draft={serviceDraft} onCancel={() => setIsEditingDetails(false)}
          onSave={(nextDraft) => {
            updateDetails({ ...studio.details, name: nextDraft.studioName, description: nextDraft.studioDescription, website: nextDraft.studioWebsite ?? "" });
            updateBranding({ ...studio.branding, logoPreviewUrl: nextDraft.logoPreviewUrl, logoOptions: nextDraft.logoOptions });
            setIsEditingDetails(false);
            setToast("Studio profile updated.");
          }} />
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
  const [fieldOrder, setFieldOrder] = useState<BriefFieldId[]>(() => getStudioBriefFieldOrder(template.configuration, template.fields).filter((id) => id !== "deadline"));
  const [draggingFieldId, setDraggingFieldId] = useState<BriefFieldId | null>(null);
  const [dropFieldId, setDropFieldId] = useState<BriefFieldId | null>(null);
  const hasChanges = JSON.stringify([...excludedFieldIds].sort()) !== JSON.stringify([...template.configuration.excludedFieldIds].sort())
    || JSON.stringify(fieldOrder) !== JSON.stringify(getStudioBriefFieldOrder(template.configuration, template.fields).filter((id) => id !== "deadline"));

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
        <Button size="S" variant="primary" disabled={!hasChanges} onClick={() => { if (hasChanges) onSave(excludedFieldIds, fieldOrder); }}>Save default Brief</Button>
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
