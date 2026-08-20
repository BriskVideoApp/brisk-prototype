"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { Input } from "../../../Brisk DS/src/app/components/Input";
import { BriskSelect } from "@/components/form/BriskSelect";
import { useStudioSettings } from "@/components/settings/StudioSettingsContext";
import { useStudioSettingsUnsavedChanges } from "@/components/settings/StudioSettingsShell";
import { DsIcon } from "@/components/video-review/DsIcon";
import type { StudioDetails } from "@/data/studio-settings";

const studioTypeOptions = [
  { value: "Production and post-production", label: "Production and post-production" },
  { value: "Full-service production Studio", label: "Full-service production Studio" },
  { value: "Production", label: "Production" },
  { value: "Post-production", label: "Post-production" },
  { value: "Post-production Studio", label: "Post-production Studio" },
  { value: "Post-production studio", label: "Post-production studio" },
  { value: "Animation Studio", label: "Animation Studio" },
] as const;

const countryOptions = [
  { value: "Australia", label: "Australia" },
  { value: "New Zealand", label: "New Zealand" },
  { value: "United Kingdom", label: "United Kingdom" },
  { value: "United States", label: "United States" },
] as const;

const timezoneOptions = [
  { value: "Australia/Sydney", label: "Australia/Sydney" },
  { value: "Australia/Melbourne", label: "Australia/Melbourne" },
  { value: "Australia/Brisbane", label: "Australia/Brisbane" },
  { value: "Australia/Perth", label: "Australia/Perth" },
] as const;

const currencyOptions = [
  { value: "AUD", label: "AUD - Australian dollar" },
  { value: "NZD", label: "NZD - New Zealand dollar" },
  { value: "GBP", label: "GBP - British pound" },
  { value: "USD", label: "USD - US dollar" },
] as const;

export function StudioDetailsPage() {
  const { studio, updateDetails } = useStudioSettings();
  const { setHasUnsavedChanges } = useStudioSettingsUnsavedChanges();
  const [draft, setDraft] = useState<StudioDetails>(() => ({ ...studio.details }));
  const [toast, setToast] = useState<string | null>(null);
  const hasChanges = useMemo(() => JSON.stringify(draft) !== JSON.stringify(studio.details), [draft, studio.details]);

  useEffect(() => {
    setHasUnsavedChanges(hasChanges);
  }, [hasChanges, setHasUnsavedChanges]);

  useEffect(() => () => setHasUnsavedChanges(false), [setHasUnsavedChanges]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const updateField = <Key extends keyof StudioDetails,>(key: Key, value: StudioDetails[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const saveChanges = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateDetails(draft);
    setHasUnsavedChanges(false);
    setToast("Studio details updated.");
  };

  const discardChanges = () => {
    setDraft({ ...studio.details });
    setHasUnsavedChanges(false);
  };

  return (
    <section className="studio-settings-section" aria-label="Studio details form">
      <form className="studio-settings-form" onSubmit={saveChanges}>
        <div className="studio-settings-field-grid">
          <Input label="Studio name" value={draft.name} onChange={(event) => updateField("name", event.target.value)} />
          <Input label="Legal or trading name" value={draft.legalName} onChange={(event) => updateField("legalName", event.target.value)} />
          <StudioSelectField
            label="Studio type"
            options={studioTypeOptions}
            value={draft.studioType}
            onChange={(value) => updateField("studioType", value)}
          />
          <Input label="Website" type="url" value={draft.website} onChange={(event) => updateField("website", event.target.value)} />
          <Input label="Main contact email" type="email" value={draft.contactEmail} onChange={(event) => updateField("contactEmail", event.target.value)} />
          <StudioSelectField
            label="Country"
            options={countryOptions}
            value={draft.country}
            onChange={(value) => updateField("country", value)}
          />
          <StudioSelectField
            label="Timezone"
            options={timezoneOptions}
            value={draft.timezone}
            onChange={(value) => updateField("timezone", value)}
          />
          <StudioSelectField
            label="Default currency"
            options={currencyOptions}
            value={draft.currency}
            onChange={(value) => updateField("currency", value)}
          />
        </div>

        <div className="studio-settings-form-actions">
          <Button size="M" type="button" variant="secondary" onClick={discardChanges}>Discard changes</Button>
          <Button size="M" type="submit">Save changes</Button>
        </div>
      </form>

      {toast ? (
        <div className="studio-settings-toast label-s-semibold" role="status">
          <DsIcon name="check-circle" size={16} />
          {toast}
        </div>
      ) : null}
    </section>
  );
}

function StudioSelectField<T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
}) {
  return (
    <label className="studio-settings-select-field">
      <span className="label-m-semibold">{label}</span>
      <BriskSelect
        ariaLabel={label}
        clearable={false}
        options={options}
        placeholder={`Choose ${label.toLocaleLowerCase("en-AU")}`}
        value={value}
        onChange={(nextValue) => {
          if (nextValue) onChange(nextValue);
        }}
      />
    </label>
  );
}
