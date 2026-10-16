"use client";

import { EditingDialog } from "../../../Brisk DS/src/app/components/EditingDialog";

import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { Input } from "../../../Brisk DS/src/app/components/Input";
import { videoTypeIconMap } from "@/components/brief/videoTypeIcons";
import { DsIcon } from "@/components/video-review/DsIcon";
import {
  briefVideoTypeDetails,
  type BriefVideoTypeId,
} from "@/data/brief";
import {
  isValidStudioBrandHex,
  normaliseStudioBrandHex,
  studioOnboardingVideoTypeLabels,
  studioBrandAccentOptions,
  type StudioBrandColour,
  type StudioBrandAccentId,
  type StudioReviewDraft,
} from "@/data/studio-onboard";

export type StudioReviewDialogId = "studio" | "video-types" | "manual";

export function StudioReviewDialog({ children, description, onClose, title, actions }: { children: ReactNode; description?: string; onClose: () => void; title: string; actions: ReactNode }) {
  return <EditingDialog title={title} description={description} onCancel={onClose} actions={actions}>{children}</EditingDialog>;
}

export function StudioEditor({
  draft,
  onCancel,
  onSave,
}: {
  draft: StudioReviewDraft;
  onCancel: () => void;
  onSave: (nextDraft: StudioReviewDraft) => void;
}) {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [studioName, setStudioName] = useState(draft.studioName);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState(draft.logoPreviewUrl);
  const [logoOptions, setLogoOptions] = useState(draft.logoOptions ?? []);
  const [brandAccentId, setBrandAccentId] = useState<StudioBrandAccentId>(draft.brandAccentId);
  const [studioType, setStudioType] = useState(draft.studioType);

  function updateLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        setLogoPreviewUrl(reader.result);
        setLogoOptions((currentOptions) => Array.from(new Set([...currentOptions, reader.result as string])));
      }
    });
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  return (
    <StudioReviewDialog title="Edit Studio" onClose={onCancel} actions={<DialogActions
        onCancel={onCancel}
        onSave={() => onSave({
          ...draft,
          studioType: studioType.trim() || draft.studioType,
          studioName: studioName.trim() || draft.studioName,
          logoPreviewUrl,
          logoOptions,
          brandAccentId,
        })}
        saveLabel="Save Studio"
      />}> <div className="studio-editor-fields">
        <Input label="Studio name" value={studioName} onChange={(event) => setStudioName(event.target.value)} />
        <div className="studio-review-field-group">
          <span className="label-m-semibold">Studio logo</span>
          <div className="studio-logo-editor-row">
            <span className={`studio-logo-editor-preview studio-client-accent-${brandAccentId}`}>
              {logoPreviewUrl ? <img src={logoPreviewUrl} alt="Selected Studio logo" /> : <DsIcon name="image-square" size={20} />}
            </span>
            <Button size="S" variant="secondary" onClick={() => logoInputRef.current?.click()}>
              <DsIcon name="upload-simple" size={16} />
              Upload logo
            </Button>
            {logoPreviewUrl ? (
              <Button size="S" variant="ghost" className="studio-review-text-button" type="button" onClick={() => setLogoPreviewUrl(null)}>
                Remove
              </Button>
            ) : null}
            <input ref={logoInputRef} className="studio-hidden-file-input" type="file" accept="image/*" onChange={updateLogo} />
          </div>
        </div>
        <StudioAccentPicker value={brandAccentId} onChange={setBrandAccentId} />
        <Input label="Studio type" value={studioType} onChange={(event) => setStudioType(event.target.value)} />
      </div>  </StudioReviewDialog>
  );
}

export function StudioVideoTypeEditor({
  draft,
  onCancel,
  onSave,
}: {
  draft: StudioReviewDraft;
  onCancel: () => void;
  onSave: (nextDraft: StudioReviewDraft) => void;
}) {
  const [selectedVideoTypeIds, setSelectedVideoTypeIds] = useState<BriefVideoTypeId[]>(draft.videoTypeIds);

  function toggleVideoType(videoTypeId: BriefVideoTypeId) {
    setSelectedVideoTypeIds((currentIds) => currentIds.includes(videoTypeId)
      ? currentIds.filter((currentId) => currentId !== videoTypeId)
      : [...currentIds, videoTypeId]);
  }

  return (
    <StudioReviewDialog
      title="Edit video types"
      description="Choose the video types clients can request in your Brief."
      onClose={onCancel}
     actions={<DialogActions
        disabled={selectedVideoTypeIds.length === 0}
        onCancel={onCancel}
        onSave={() => onSave({ ...draft, videoTypeIds: selectedVideoTypeIds })}
        saveLabel="Save video types"
      />}> <div className="studio-editor-fields studio-video-type-editor-grid" role="group" aria-label="Video types">
        {briefVideoTypeDetails.map((videoType) => {
          const isSelected = selectedVideoTypeIds.includes(videoType.name);

          return (
            <button
              className={`studio-video-type-editor-option ${isSelected ? "selected" : ""}`}
              type="button"
              key={videoType.name}
              aria-pressed={isSelected}
              onClick={() => toggleVideoType(videoType.name)}
            >
              <span className="studio-video-type-editor-icon">
                <DsIcon name={videoTypeIconMap[videoType.name] ?? "film-strip"} size={16} />
              </span>
              <span>
                <strong className="label-s-semibold">{studioOnboardingVideoTypeLabels[videoType.name]}</strong>
              </span>
              {isSelected ? <DsIcon name="check-circle" size={16} /> : null}
            </button>
          );
        })}
      </div>  {selectedVideoTypeIds.length === 0 ? (
        <p className="studio-review-validation label-xs" role="alert">Choose at least one video type.</p>
      ) : null}  </StudioReviewDialog>
  );
}

export function StudioBriefOptionsEditor({
  excludedValues,
  fieldLabel,
  onCancel,
  onSave,
  options,
  saveLabel = "Save options",
  title,
}: {
  excludedValues: readonly string[];
  fieldLabel: string;
  onCancel: () => void;
  onSave: (excludedValues: string[]) => void;
  options: readonly { value: string; label: string; description?: string }[];
  saveLabel?: string;
  title: string;
}) {
  const [nextExcludedValues, setNextExcludedValues] = useState<string[]>([...excludedValues]);
  const includedOptionCount = options.filter((option) => !nextExcludedValues.includes(option.value)).length;

  function toggleOption(optionValue: string) {
    setNextExcludedValues((currentValues) => currentValues.includes(optionValue)
      ? currentValues.filter((currentValue) => currentValue !== optionValue)
      : [...currentValues, optionValue]);
  }

  return (
    <StudioReviewDialog
      title={title}
      description="Choose the options clients can select in your Brief."
      onClose={onCancel}
     actions={<DialogActions
        disabled={includedOptionCount === 0}
        onCancel={onCancel}
        onSave={() => onSave(nextExcludedValues)}
        saveLabel={saveLabel}
      />}> <div className="studio-editor-fields studio-video-type-editor-grid" role="group" aria-label={`${fieldLabel} options`}>
        {options.map((option) => {
          const isIncluded = !nextExcludedValues.includes(option.value);
          const isCustomResponse = option.value === "Something else";

          const optionButton = (
            <button
              className={`studio-video-type-editor-option ${isCustomResponse ? "custom-response" : ""} ${isIncluded ? "selected" : ""}`}
              type="button"
              aria-pressed={isIncluded}
              onClick={() => toggleOption(option.value)}
            >
              <span className="studio-video-type-editor-icon">
                <DsIcon name={isCustomResponse ? "pencil-simple" : videoTypeIconMap[option.value] ?? "check-circle"} size={16} />
              </span>
              <span>
                <strong className="label-s-semibold">{isCustomResponse ? "Allow a custom response" : option.label}</strong>
                {isCustomResponse ? <span className="label-xs">Clients can enter their own answer.</span> : option.description ? <span className="label-xs">{option.description}</span> : null}
              </span>
              {isIncluded ? <DsIcon name="check-circle" size={16} /> : null}
            </button>
          );

          return isCustomResponse ? (
            <div className="studio-custom-response-group" key={option.value}>
              <span className="studio-custom-response-divider label-xs-semibold">Custom response</span>
              {optionButton}
            </div>
          ) : <div key={option.value}>{optionButton}</div>;
        })}
      </div>  {includedOptionCount === 0 ? (
        <p className="studio-review-validation label-xs" role="alert">Keep at least one option.</p>
      ) : null}  </StudioReviewDialog>
  );
}

export function StudioManualSetupEditor({
  draft,
  onCancel,
  onSave,
}: {
  draft: StudioReviewDraft;
  onCancel: () => void;
  onSave: (nextDraft: StudioReviewDraft) => void;
}) {
  const [studioName, setStudioName] = useState(draft.studioName);
  const [brandAccentId, setBrandAccentId] = useState<StudioBrandAccentId>(draft.brandAccentId);

  return (
    <StudioReviewDialog title="Set up manually" description="Make the essential Studio choices now. Everything else can wait." onClose={onCancel} actions={<DialogActions
        onCancel={onCancel}
        onSave={() => onSave({
          ...draft,
          studioName: studioName.trim() || draft.studioName,
          brandAccentId,
        })}
        saveLabel="Save manual setup"
      />}> <div className="studio-editor-fields">
        <Input label="Studio name" value={studioName} onChange={(event) => setStudioName(event.target.value)} />
        <StudioAccentPicker value={brandAccentId} onChange={setBrandAccentId} />
        <p className="paragraph-s studio-review-dialog-note">
          You can adjust your logo and video types from this Review screen. Default Brief changes belong in Studio Settings.
        </p>
      </div>  </StudioReviewDialog>
  );
}

export function StudioAccentPicker({
  hideLabel = false,
  onChange,
  value,
}: {
  hideLabel?: boolean;
  onChange: (accentId: StudioBrandAccentId) => void;
  value: StudioBrandAccentId;
}) {
  return (
    <div className="studio-review-field-group">
      {hideLabel ? null : <span className="label-m-semibold">Client-facing accent colour</span>}
      <div className="studio-accent-picker" role="radiogroup" aria-label="Client-facing accent colour">
        {studioBrandAccentOptions.map((accent) => (
          <button
            className={`studio-accent-option studio-client-accent-${accent.id} ${accent.id === value ? "selected" : ""}`}
            type="button"
            role="radio"
            aria-checked={accent.id === value}
            key={accent.id}
            onClick={() => onChange(accent.id)}
          >
            <span className="studio-accent-option-swatch" aria-hidden="true" />
            <span className="label-s-semibold">{accent.label}</span>
            {accent.id === value ? <DsIcon name="check" size={14} /> : null}
          </button>
        ))}
      </div>
    </div>
  );
}

export function StudioBrandColourEditor({
  colour,
  onCancel,
  onSave,
}: {
  colour: StudioBrandColour | null;
  onCancel: () => void;
  onSave: (hex: string) => void;
}) {
  const [hex, setHex] = useState(colour?.hex ?? "#FFFFFF");
  const isValid = isValidStudioBrandHex(hex);
  const previewHex = isValid ? normaliseStudioBrandHex(hex) : "#FFFFFF";

  return (
    <StudioReviewDialog
      title={colour ? "Edit brand colour" : "Add brand colour"}
      description="Enter the six-digit hex value from your Studio brand palette."
      onClose={onCancel}
     actions={<DialogActions
        disabled={!isValid}
        onCancel={onCancel}
        onSave={() => onSave(normaliseStudioBrandHex(hex))}
        saveLabel={colour ? "Save colour" : "Add colour"}
      />}> <div className="studio-editor-fields">
        <div className="studio-brand-colour-editor-preview">
          <span style={{ backgroundColor: previewHex }} aria-hidden="true" />
          <strong className="label-m-semibold">{previewHex}</strong>
        </div>
        <Input
          error={hex.length > 0 && !isValid}
          hint={isValid ? "Colour ready to save." : "Use a value such as #8B2CFF."}
          label="Hex value"
          value={hex}
          onChange={(event) => setHex(event.target.value.toLocaleUpperCase("en-AU"))}
        />
      </div>  </StudioReviewDialog>
  );
}

function DialogActions({
  disabled = false,
  onCancel,
  onSave,
  saveLabel,
}: {
  disabled?: boolean;
  onCancel: () => void;
  onSave: () => void;
  saveLabel: string;
}) {
  return (
    <>
      <Button size="S" variant="secondary" onClick={onCancel}>Cancel</Button>
      <Button size="S" variant="primary" type="button" disabled={disabled} onClick={onSave}>{saveLabel}</Button>
    </>
  );
}
