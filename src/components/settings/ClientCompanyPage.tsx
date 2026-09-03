"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { Input } from "../../../Brisk DS/src/app/components/Input";
import { BriskSelect } from "@/components/form/BriskSelect";
import {
  ClientCompanySettingsPageShell,
  ClientSettingsAccessBoundary,
} from "@/components/settings/AccountSettingsShell";
import { useClientAccountSettings } from "@/components/settings/ClientAccountSettingsContext";
import { DsIcon } from "@/components/video-review/DsIcon";
import type { ClientCompanyDetails } from "@/data/client-account-settings";

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
  { value: "Pacific/Auckland", label: "Pacific/Auckland" },
  { value: "Europe/London", label: "Europe/London" },
] as const;

export function ClientCompanyPage() {
  const { account, saveCompany } = useClientAccountSettings();
  const [draft, setDraft] = useState<ClientCompanyDetails>(() => ({ ...account.company }));
  const [toast, setToast] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const hasChanges = useMemo(() => JSON.stringify(draft) !== JSON.stringify(account.company), [account.company, draft]);

  useEffect(() => setDraft({ ...account.company }), [account.company]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const updateField = <Key extends keyof ClientCompanyDetails,>(key: Key, value: ClientCompanyDetails[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const uploadLogo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") updateField("logoUrl", reader.result);
    });
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveCompany({ ...draft });
    setToast("Company details were updated.");
  };

  return (
    <ClientSettingsAccessBoundary requireAdmin>
      <ClientCompanySettingsPageShell
        activeSection="company"
        title="Company details"
      >
        <section className="account-settings-card account-company-card" aria-label="Company details">
          <form onSubmit={submit}>
            <section className="account-company-logo-section" aria-labelledby="company-logo-heading">
              <span className="account-company-logo" aria-label={`${draft.name} logo`}>
                {draft.logoUrl ? <img src={draft.logoUrl} alt="" /> : <strong className="headings-2xs-bold">LOOM</strong>}
              </span>
              <div>
                <h2 className="headings-xs-bold" id="company-logo-heading">Company logo</h2>
                <div className="account-settings-inline-actions">
                  <input className="sr-only" ref={logoInputRef} type="file" accept="image/*" onChange={uploadLogo} />
                  <Button size="S" type="button" variant="secondary" onClick={() => logoInputRef.current?.click()}>
                    <span className="account-settings-button-content">
                      <DsIcon name="upload-simple" size={16} />
                      {draft.logoUrl ? "Replace logo" : "Upload logo"}
                    </span>
                  </Button>
                  {draft.logoUrl ? <Button size="S" type="button" variant="ghost" onClick={() => updateField("logoUrl", null)}>Remove</Button> : null}
                </div>
              </div>
            </section>

            <div className="account-settings-field-grid">
              <Input label="Company name" value={draft.name} onChange={(event) => updateField("name", event.target.value)} />
              <Input label="Main contact" value={draft.mainContact} onChange={(event) => updateField("mainContact", event.target.value)} />
              <Input label="Billing email" type="email" value={draft.billingEmail} onChange={(event) => updateField("billingEmail", event.target.value)} />
              <Input label="Address" value={draft.address} onChange={(event) => updateField("address", event.target.value)} />
              <label className="account-settings-select-field">
                <span className="label-m-semibold">Country</span>
                <BriskSelect
                  ariaLabel="Country"
                  clearable={false}
                  options={countryOptions}
                  placeholder="Choose country"
                  searchable
                  value={draft.country}
                  onChange={(country) => updateField("country", country)}
                />
              </label>
              <label className="account-settings-select-field">
                <span className="label-m-semibold">Default timezone</span>
                <BriskSelect
                  ariaLabel="Default timezone"
                  clearable={false}
                  options={timezoneOptions}
                  placeholder="Choose timezone"
                  searchable
                  value={draft.timezone}
                  onChange={(timezone) => updateField("timezone", timezone)}
                />
              </label>
            </div>

            <div className="account-settings-form-actions">
              <Button size="M" type="button" variant="secondary" onClick={() => setDraft({ ...account.company })}>Discard changes</Button>
              <Button size="M" type="submit">Save changes</Button>
            </div>
          </form>
          {toast ? <div className="account-settings-toast label-s-semibold" role="status"><DsIcon name="check-circle" size={16} />{toast}</div> : null}
          {!hasChanges ? <span className="sr-only">All company changes are saved.</span> : null}
        </section>
      </ClientCompanySettingsPageShell>
    </ClientSettingsAccessBoundary>
  );
}
