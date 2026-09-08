"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { ScriptMediaPicker, type ScriptMediaPickerOption } from "@/components/script/ScriptMediaPicker";
import { DsIcon } from "@/components/video-review/DsIcon";
import {
  getProductionFlowStageDefinition,
  getProductionFlowStatusLabel,
  productionFlowPostProductionDefinitions,
  type ProductionFlowPostProductionTerm,
  type ProductionFlowSelection,
  type ProductionFlowStatus,
  type ProductionFlowTemplate,
} from "@/data/production-flow";

type StoryboardRowId = "opening" | "problem" | "proof";
type StoryboardImageSource = "upload" | "library" | "stock" | "link";

type ProductionFlowStagePreviewProps = {
  selectedStage: ProductionFlowSelection;
  template: ProductionFlowTemplate;
  showInterviewQuestions: boolean;
  statuses: Record<Exclude<ProductionFlowSelection, "media">, ProductionFlowStatus>;
  postProductionTerm: ProductionFlowPostProductionTerm;
  storyboardImages: Record<StoryboardRowId, boolean>;
  videoType: string;
  briefAnswer: string;
  onApproveScript: () => void;
  onEditApprovedScript: () => void;
  onAddStoryboardImage: (rowId: StoryboardRowId) => void;
};

const storyboardRows: Array<{ id: StoryboardRowId; words: string; visual: string }> = [
  { id: "opening", words: "Work should move as quickly as the people doing it.", visual: "Open on a fast-moving production team." },
  { id: "problem", words: "Feedback, files and approvals should not slow the story down.", visual: "Split-screen of disconnected tools resolving into one workspace." },
  { id: "proof", words: "Brisk keeps every stage and every collaborator in the same flow.", visual: "The production flow assembles across the screen." },
];

const storyboardImageOptions: Array<ScriptMediaPickerOption<StoryboardImageSource>> = [
  { value: "upload", label: "Upload file", icon: "upload-simple" },
  { value: "library", label: "Add from your Media", icon: "play" },
  { value: "stock", label: "Stock footage search", icon: "image-square" },
  { value: "link", label: "Add link", icon: "link" },
];

export function ProductionFlowStagePreview({
  selectedStage,
  template,
  showInterviewQuestions,
  statuses,
  postProductionTerm,
  storyboardImages,
  videoType,
  briefAnswer,
  onApproveScript,
  onEditApprovedScript,
  onAddStoryboardImage,
}: ProductionFlowStagePreviewProps) {
  const { selectedRole } = usePrototypeRole();
  const [confirmingScriptEdit, setConfirmingScriptEdit] = useState(false);

  if (selectedStage === "media") {
    return <MediaPreview />;
  }

  const definition = getProductionFlowStageDefinition(selectedStage, postProductionTerm);
  const status = statuses[selectedStage];
  const summary = definition.summary;

  return (
    <section className="production-flow-preview" aria-labelledby="production-flow-preview-heading">
      <header className="production-flow-preview-header">
        <span className={`production-flow-preview-icon is-${status}`} aria-hidden="true">
          <DsIcon name={definition.icon} size={24} />
        </span>
        <div>
          <span className="label-xs-semibold">{getProductionFlowStatusLabel(status)}</span>
          <h2 className="headings-s-bold" id="production-flow-preview-heading">{definition.label}</h2>
          <p className="paragraph-s">{summary}</p>
        </div>
      </header>

      {selectedStage === "brief" ? (
        <BriefPreview template={template} videoType={videoType} briefAnswer={briefAnswer} />
      ) : null}
      {selectedStage === "script" ? (
        <ScriptPreview
          interviewLed={template.id === "interview" || template.id === "mixed"}
          status={status}
          confirmingEdit={confirmingScriptEdit}
          onApprove={onApproveScript}
          onCancelEdit={() => setConfirmingScriptEdit(false)}
          onConfirmEdit={() => { onEditApprovedScript(); setConfirmingScriptEdit(false); }}
          onRequestEdit={() => setConfirmingScriptEdit(true)}
        />
      ) : null}
      {selectedStage === "shoot" ? (
        <ShootPreview selectedRole={selectedRole} showInterviewQuestions={showInterviewQuestions} />
      ) : null}
      {selectedStage === "storyboard" ? (
        <StoryboardPreview
          scriptApproved={statuses.script === "approved"}
          images={storyboardImages}
          canEdit={selectedRole !== "Customer"}
          onAddImage={onAddStoryboardImage}
        />
      ) : null}
      {selectedStage === "edit" ? <PostProductionPreview term={postProductionTerm} /> : null}
      {selectedStage === "masters" ? <MastersPreview postProductionTerm={postProductionTerm} /> : null}
    </section>
  );
}

function BriefPreview({ template, videoType, briefAnswer }: { template: ProductionFlowTemplate; videoType: string; briefAnswer: string }) {
  return (
    <div className="production-flow-detail-grid">
      <article>
        <span className="label-xs-semibold">Video type</span>
        <strong className="label-l-semibold">{videoType}</strong>
        <p className="paragraph-s">The video type provided the first recommendation.</p>
      </article>
      <article>
        <span className="label-xs-semibold">Explicit Brief answer</span>
        <strong className="label-l-semibold">{briefAnswer}</strong>
        <p className="paragraph-s">An explicit answer overrides the video-type recommendation.</p>
      </article>
      <article>
        <span className="label-xs-semibold">Created flow</span>
        <strong className="label-l-semibold">{template.label}</strong>
        <p className="paragraph-s">No approval was required before Brisk created the flow.</p>
      </article>
    </div>
  );
}

function ScriptPreview({
  interviewLed,
  status,
  confirmingEdit,
  onApprove,
  onCancelEdit,
  onConfirmEdit,
  onRequestEdit,
}: {
  interviewLed: boolean;
  status: ProductionFlowStatus;
  confirmingEdit: boolean;
  onApprove: () => void;
  onCancelEdit: () => void;
  onConfirmEdit: () => void;
  onRequestEdit: () => void;
}) {
  return (
    <div className="production-flow-stage-content">
      {interviewLed ? (
        <article className="production-flow-guidance">
          <span aria-hidden="true"><DsIcon name="quotes" size={20} /></span>
          <div>
            <h3 className="headings-xs-bold">Build your Script from the interviews</h3>
            <p className="paragraph-s">Select the strongest responses from the transcripts and send them to your Script.</p>
            <div className="production-flow-inline-actions">
              <Link className="production-flow-primary-link label-s-semibold" href="/projects/loom-launch-film/script?subtab=transcripts">Open transcripts</Link>
              <Link className="production-flow-secondary-link label-s-semibold" href="/projects/loom-launch-film/stages/media">Open Media</Link>
            </div>
          </div>
        </article>
      ) : (
        <div className="production-flow-script-canvas">
          <span className="label-xs-semibold">Words</span>
          <p className="paragraph-m">Brisk gives production teams one clear place to move a video from the first idea to the final master.</p>
          <span className="label-xs">Visual direction remains editable alongside every Script row.</span>
        </div>
      )}

      <div className="production-flow-inline-actions">
        {status === "approved" ? (
          <Button size="S" variant="secondary" onClick={onRequestEdit}>Edit approved Script</Button>
        ) : (
          <Button size="S" onClick={onApprove}>Approve Script</Button>
        )}
      </div>

      {confirmingEdit ? (
        <div className="production-flow-warning" role="alert">
          <DsIcon name="alert-triangle" size={20} />
          <div>
            <strong className="label-s-semibold">Editing will unapprove Script and Storyboard</strong>
            <p className="label-xs">Storyboard images on unchanged rows will be preserved when Script is approved again.</p>
            <div className="production-flow-inline-actions">
              <Button size="S" variant="secondary" onClick={onCancelEdit}>Keep approved</Button>
              <Button size="S" onClick={onConfirmEdit}>Edit Script</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ShootPreview({
  selectedRole,
  showInterviewQuestions,
}: {
  selectedRole: "Studio Staff" | "Studio Freelancer" | "Customer";
  showInterviewQuestions: boolean;
}) {
  if (selectedRole === "Customer") {
    return (
      <div className="production-flow-guidance">
        <span aria-hidden="true"><DsIcon name="calendar" size={20} /></span>
        <div>
          <h3 className="headings-xs-bold">The Studio is organising the Shoot</h3>
          <p className="paragraph-s">Creative planning, confirmed shoot details and the Call Sheet will appear when they are ready for you.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="production-flow-stage-content">
      <div className="production-flow-detail-grid is-two-column">
        <article>
          <span className="production-flow-detail-icon"><DsIcon name="list-checks" size={20} /></span>
          <h3 className="headings-xs-bold">Pre-production</h3>
          <p className="paragraph-s">
            {showInterviewQuestions
              ? "Creative Plan contains the Interview Questions and Shot List. Plan the Day covers logistics and timing."
              : "Creative Plan contains the Shot List. Plan the Day covers logistics and timing."}
          </p>
        </article>
        <article>
          <span className="production-flow-detail-icon"><DsIcon name="video-camera-ds" size={20} /></span>
          <h3 className="headings-xs-bold">On Set</h3>
          <p className="paragraph-s">The Call Sheet and live shoot workflow bring the approved plan together for the production team.</p>
        </article>
      </div>
      <p className="production-flow-footnote label-xs">Pre-production and On Set stay together inside one Shoot stage.</p>
    </div>
  );
}

function StoryboardPreview({
  scriptApproved,
  images,
  canEdit,
  onAddImage,
}: {
  scriptApproved: boolean;
  images: Record<StoryboardRowId, boolean>;
  canEdit: boolean;
  onAddImage: (rowId: StoryboardRowId) => void;
}) {
  const [openMenuRow, setOpenMenuRow] = useState<StoryboardRowId | null>(null);

  if (!scriptApproved) {
    return (
      <div className="production-flow-empty">
        <span aria-hidden="true"><DsIcon name="lock" size={24} /></span>
        <h3 className="headings-xs-bold">Approve Script to create the Storyboard</h3>
        <p className="paragraph-s">The Storyboard is recreated from approved Words. Existing images remain on unchanged rows.</p>
      </div>
    );
  }

  return (
    <div className="production-flow-storyboard">
      <div className="production-flow-storyboard-head label-xs-semibold">
        <span>Words - locked</span>
        <span>Visuals - editable</span>
      </div>
      {storyboardRows.map((row) => (
        <article key={row.id}>
          <div>
            <span className="production-flow-lock label-xs-semibold"><DsIcon name="lock" size={12} />Approved Words</span>
            <p className="paragraph-s">{row.words}</p>
          </div>
          <div>
            <p className="paragraph-s">{row.visual}</p>
            {images[row.id] && canEdit ? (
              <ScriptMediaPicker
                isOpen={openMenuRow === row.id}
                options={storyboardImageOptions}
                triggerLabel={`Replace storyboard image for ${row.id}`}
                triggerClassName="production-flow-storyboard-image"
                triggerIcon="image-square"
                triggerText="Storyboard image added"
                onOpenChange={(isOpen) => setOpenMenuRow(isOpen ? row.id : null)}
                onSelect={() => {
                  onAddImage(row.id);
                  setOpenMenuRow(null);
                }}
              />
            ) : images[row.id] ? (
              <button className="production-flow-storyboard-image" type="button" disabled>
                <DsIcon name="image-square" size={20} />
                <span className="label-xs-semibold">Storyboard image added</span>
              </button>
            ) : canEdit ? (
              <ScriptMediaPicker
                isOpen={openMenuRow === row.id}
                options={storyboardImageOptions}
                triggerLabel={`Add storyboard image for ${row.id}`}
                triggerClassName="production-flow-storyboard-add label-s-semibold"
                triggerIcon={null}
                triggerText="Add storyboard image"
                onOpenChange={(isOpen) => setOpenMenuRow(isOpen ? row.id : null)}
                onSelect={() => {
                  onAddImage(row.id);
                  setOpenMenuRow(null);
                }}
              />
            ) : (
              <span className="label-xs">Waiting for the Studio to add an image</span>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

function PostProductionPreview({ term }: { term: ProductionFlowPostProductionTerm }) {
  const presentation = productionFlowPostProductionDefinitions[term];
  return (
    <div className="production-flow-empty">
      <span aria-hidden="true"><DsIcon name={presentation.icon} size={24} /></span>
      <h3 className="headings-xs-bold">{presentation.heading}</h3>
      <p className="paragraph-s">{presentation.description}</p>
      <Link className="production-flow-secondary-link label-s-semibold" href="/projects/loom-launch-film/stages/edit">{presentation.actionLabel}</Link>
    </div>
  );
}

function MastersPreview({ postProductionTerm }: { postProductionTerm: ProductionFlowPostProductionTerm }) {
  const postProductionLabel = productionFlowPostProductionDefinitions[postProductionTerm].label;
  return (
    <div className="production-flow-empty">
      <span aria-hidden="true"><DsIcon name="film-strip" size={24} /></span>
      <h3 className="headings-xs-bold">Masters follows {postProductionLabel}</h3>
      <p className="paragraph-s">Final exports, captions and delivery files are prepared here.</p>
    </div>
  );
}

function MediaPreview() {
  return (
    <section className="production-flow-preview" aria-labelledby="production-flow-media-heading">
      <header className="production-flow-preview-header">
        <span className="production-flow-preview-icon is-media" aria-hidden="true"><DsIcon name="image-square" size={24} /></span>
        <div>
          <span className="label-xs-semibold">Permanent project area</span>
          <h2 className="headings-s-bold" id="production-flow-media-heading">Media</h2>
          <p className="paragraph-s">Media is available throughout the project. It cannot be hidden, reordered or given a stage status.</p>
        </div>
      </header>
      <div className="production-flow-detail-grid is-two-column">
        <article>
          <span className="production-flow-detail-icon"><DsIcon name="file-video" size={20} /></span>
          <h3 className="headings-xs-bold">Interview footage</h3>
          <p className="paragraph-s">8 video files with transcripts ready for Script selection.</p>
        </article>
        <article>
          <span className="production-flow-detail-icon"><DsIcon name="image-square" size={20} /></span>
          <h3 className="headings-xs-bold">Brand and production assets</h3>
          <p className="paragraph-s">4 reference files available to every production stage.</p>
        </article>
      </div>
    </section>
  );
}

export type { StoryboardRowId };
