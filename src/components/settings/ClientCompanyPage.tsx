"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { Input } from "../../../Brisk DS/src/app/components/Input";
import { useClients } from "@/components/clients/ClientDataContext";
import { BriskSelect } from "@/components/form/BriskSelect";
import { ClientCompanySettingsPageShell, ClientSettingsAccessBoundary } from "@/components/settings/AccountSettingsShell";
import { useClientAccountSettings } from "@/components/settings/ClientAccountSettingsContext";
import { DsIcon } from "@/components/video-review/DsIcon";

export function ClientCompanyPage() {
  const { clientId } = useClientAccountSettings();
  const { clients, updateClient } = useClients();
  const client = clients.find((candidate) => candidate.id === (clientId ?? "loom"));
  if (!client) throw new Error("The Client company is missing");

  return <ClientCompanyDetails client={client} onSave={updateClient} />;
}

function ClientCompanyDetails({
  client,
  onSave,
}: {
  client: ReturnType<typeof useClients>["clients"][number];
  onSave: ReturnType<typeof useClients>["updateClient"];
}) {
  const saved = useMemo(() => ({
    name: client.name,
    logoUrl: client.logoUrl,
    primaryContactId: client.primaryContactId ?? "",
  }), [client.name, client.logoUrl, client.primaryContactId]);
  const [draft, setDraft] = useState(saved);
  const [toast, setToast] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const hasChanges = JSON.stringify(draft) !== JSON.stringify(saved);

  useEffect(() => setDraft(saved), [saved]);
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
      if (typeof reader.result === "string") setDraft((current) => ({ ...current, logoUrl: reader.result as string }));
    });
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave(client.id, {
      name: draft.name.trim() || client.name,
      logoUrl: draft.logoUrl,
      primaryContactId: draft.primaryContactId || null,
    });
    setToast("Company details were updated.");
  };

  const initials = draft.name.split(/\s+/u).filter(Boolean).slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase("en-AU")).join("");

  return (
    <ClientSettingsAccessBoundary requireAdmin>
      <ClientCompanySettingsPageShell title="Company details">
        <section className="account-settings-card account-company-card" aria-label="Company details">
          <form onSubmit={submit}>
            <section className="account-company-logo-section" aria-labelledby="company-logo-heading">
              <span className="account-company-logo" aria-label={`${draft.name} logo`}>
                {draft.logoUrl ? <img src={draft.logoUrl} alt="" /> : <strong className="headings-2xs-bold">{initials}</strong>}
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
                  {draft.logoUrl ? <Button size="S" type="button" variant="ghost" onClick={() => setDraft((current) => ({ ...current, logoUrl: null }))}>Remove</Button> : null}
                </div>
              </div>
            </section>

            <div className="account-settings-field-grid">
              <Input label="Company name" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
              <label className="account-settings-select-field">
                <span className="label-m-semibold">Main contact</span>
                <BriskSelect
                  ariaLabel="Main contact"
                  clearable={false}
                  options={client.contacts.filter((contact) => contact.portalAccess === "Active").map((contact) => ({ value: contact.id, label: contact.name }))}
                  placeholder="Choose a person"
                  searchable
                  value={draft.primaryContactId}
                  onChange={(primaryContactId) => setDraft((current) => ({ ...current, primaryContactId }))}
                />
              </label>
            </div>

            <div className="account-settings-form-actions">
              <Button size="M" type="button" variant="secondary" onClick={() => setDraft(saved)}>Discard changes</Button>
              <Button size="M" type="submit" disabled={!hasChanges}>Save changes</Button>
            </div>
          </form>
          {toast ? <div className="account-settings-toast label-s-semibold" role="status"><DsIcon name="check-circle" size={16} />{toast}</div> : null}
        </section>
      </ClientCompanySettingsPageShell>
    </ClientSettingsAccessBoundary>
  );
}
