"use client";

import { ChangeEvent, FormEvent, KeyboardEvent, useRef, useState } from "react";
import { Input } from "../../../Brisk DS/src/app/components/Input";
import { DsIcon } from "@/components/video-review/DsIcon";
import type { StudioOnboardingAnswer, StudioOnboardingSource } from "@/data/studio-onboard";

type StudioAiQuestionProps = {
  initialAnswer?: StudioOnboardingAnswer | null;
  onAnalyse: (answer: StudioOnboardingAnswer) => void;
  onBack: () => void;
  onDraftChange: (answer: StudioOnboardingAnswer) => void;
};

export function StudioAiQuestion({ initialAnswer, onAnalyse, onBack, onDraftChange }: StudioAiQuestionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [website, setWebsite] = useState(
    () => initialAnswer?.sources.find((source) => source.type === "website")?.label ?? "",
  );
  const [studioDescription, setStudioDescription] = useState(() => initialAnswer?.studioDescription ?? "");
  const [fileSources, setFileSources] = useState<StudioOnboardingSource[]>(
    () => initialAnswer?.sources.filter((source) => source.type === "file") ?? [],
  );
  const canAnalyse = website.trim().length > 0 || studioDescription.trim().length > 0;

  function addFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    const existingIds = new Set(fileSources.map((source) => source.id));
    const newSources = files
      .map(createFileSource)
      .filter((source) => !existingIds.has(source.id));
    const nextFileSources = [...fileSources, ...newSources];

    setFileSources(nextFileSources);
    onDraftChange(createStudioAnswer(website, studioDescription, nextFileSources));

    event.target.value = "";
  }

  function removeFile(sourceId: string) {
    const nextFileSources = fileSources.filter((source) => source.id !== sourceId);

    setFileSources(nextFileSources);
    onDraftChange(createStudioAnswer(website, studioDescription, nextFileSources));
  }

  function submitStudioDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canAnalyse) {
      return;
    }

    const normalisedWebsite = normaliseStudioWebsite(website);
    const answer = createStudioAnswer(normalisedWebsite, studioDescription, fileSources);

    setWebsite(normalisedWebsite);
    onDraftChange(answer);
    onAnalyse(answer);
  }

  return (
    <form className="studio-ai-question" onSubmit={submitStudioDetails}>
      <div className="studio-ai-field">
        <Input
          label="Studio website (optional)"
          type="text"
          placeholder="https://yourstudio.com"
          value={website}
          onChange={(event) => {
            setWebsite(event.target.value);
            onDraftChange(createStudioAnswer(event.target.value, studioDescription, fileSources));
          }}
        />
      </div>

      <div className="studio-description-field">
        <label className="label-m-semibold" htmlFor="studio-description">What does your Studio do?</label>
        <div className="studio-ai-composer">
          <textarea
            className="studio-ai-textarea paragraph-m"
            id="studio-description"
            placeholder="What kinds of videos do you make, and who do you work with?"
            value={studioDescription}
            onChange={(event) => {
              setStudioDescription(event.target.value);
              onDraftChange(createStudioAnswer(website, event.target.value, fileSources));
            }}
            onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />

          {fileSources.length > 0 ? (
            <StudioSourceAttachmentList sources={fileSources} onRemove={removeFile} />
          ) : null}

          <div className="studio-composer-actions">
            <div className="studio-composer-tools">
              <div className="studio-composer-tool-wrap">
                <button
                  className="studio-composer-tool"
                  type="button"
                  aria-label="Upload Studio files"
                  aria-describedby="studio-upload-files-tooltip"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <DsIcon name="upload-simple" size={16} />
                </button>
                <span
                  className="studio-composer-tooltip label-xs-semibold"
                  id="studio-upload-files-tooltip"
                  role="tooltip"
                >
                  Optional: upload a pamphlet or ad about what your Studio does.
                </span>
              </div>
              <input
                ref={fileInputRef}
                className="studio-hidden-file-input"
                type="file"
                accept=".pdf,.ppt,.pptx,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain"
                multiple
                onChange={addFiles}
              />
            </div>

          </div>
        </div>
      </div>

      <footer className="studio-follow-up-footer">
        <div className="studio-follow-up-actions">
          <button className="studio-follow-up-back label-s-semibold" type="button" onClick={onBack}>Back</button>
          <button className="studio-follow-up-continue label-m-semibold" type="submit" disabled={!canAnalyse}>
            Continue
          </button>
        </div>
      </footer>
    </form>
  );
}

function StudioSourceAttachmentList({
  sources,
  onRemove,
}: {
  sources: StudioOnboardingSource[];
  onRemove: (sourceId: string) => void;
}) {
  return (
    <div className="studio-source-list" aria-label="Uploaded Studio sources">
      {sources.map((source) => (
        <span className="studio-source-chip label-xs-semibold" key={source.id} title={source.label}>
          <DsIcon name="clipboard-text" size={13} />
          <span>{source.label}</span>
          <button type="button" aria-label={`Remove ${source.label}`} onClick={() => onRemove(source.id)}>
            <DsIcon name="x-close-cross" size={10} />
          </button>
        </span>
      ))}
    </div>
  );
}

function createFileSource(file: File): StudioOnboardingSource {
  return {
    id: `studio-file-${file.name}-${file.size}-${file.lastModified}`,
    type: "file",
    label: file.name,
  };
}

function normaliseStudioWebsite(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue || /^https?:\/\//iu.test(trimmedValue)) {
    return trimmedValue;
  }

  return `https://${trimmedValue}`;
}

function createStudioAnswer(
  website: string,
  studioDescription: string,
  fileSources: StudioOnboardingSource[],
): StudioOnboardingAnswer {
  const trimmedWebsite = website.trim();
  const websiteSource: StudioOnboardingSource[] = trimmedWebsite
    ? [{ id: "studio-website", type: "website", label: trimmedWebsite }]
    : [];

  return {
    studioDescription: studioDescription.trim(),
    sources: [...websiteSource, ...fileSources],
  };
}
