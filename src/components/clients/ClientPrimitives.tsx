"use client";

import { BriskSelect } from "@/components/form/BriskSelect";

import { EditingDialog } from "../../../Brisk DS/src/app/components/EditingDialog";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { Input } from "../../../Brisk DS/src/app/components/Input";
import { DsIcon } from "@/components/video-review/DsIcon";
import { useClients } from "@/components/clients/ClientDataContext";
import { getClientInitials, type Client, type ClientContact, type NewClientInput } from "@/data/clients";

export function ClientAvatar({ client, size = "M" }: { client: Client; size?: "S" | "M" | "L" }) {
  const [logoFailed, setLogoFailed] = useState(false);
  return (
    <span className={`client-avatar is-${size.toLocaleLowerCase("en-AU")}`} aria-label={`${client.name} logo`}>
      {client.logoUrl && !logoFailed ? <img src={client.logoUrl} alt="" onError={() => setLogoFailed(true)} /> : <span className="label-xs-semibold">{getClientInitials(client.name)}</span>}
    </span>
  );
}

export function ClientStatusBadge({ status }: { status: Client["status"] | Client["portal"]["status"] | ClientContact["portalAccess"] }) {
  return <span className={`client-status-badge is-${status.toLocaleLowerCase("en-AU")} label-xs-semibold`}>{status}</span>;
}

export function ClientModal({ children, className = "", description, footer, onClose, title }: { children: ReactNode; className?: string; description?: string; footer: ReactNode; onClose: () => void; title: string }) {
  return <EditingDialog title={title} description={description} size={className.includes("billing-plan-modal") ? "full" : /invite-person-modal|customer-message|notification-reminder/.test(className) ? "wide" : "standard"} onCancel={onClose} actions={footer}>{children}</EditingDialog>;
}

export function ClientPicker({
  initialQuery = "",
  label = "Who is this project for?",
  onChange,
  onClientCreated,
  value,
}: {
  label?: string;
  initialQuery?: string;
  onChange: (client: Client) => void;
  onClientCreated?: (client: Client) => void;
  value: string | null;
}) {
  const { clients, createClient } = useClients();
  const selectedClient = clients.find((client) => client.id === value) ?? null;
  const [query, setQuery] = useState(selectedClient?.name ?? initialQuery);
  const [isOpen, setIsOpen] = useState(!selectedClient);
  const [inlineDuplicate, setInlineDuplicate] = useState<Client | null>(null);
  const activeClients = useMemo(() => clients.filter((client) => client.status !== "Archived"), [clients]);

  useEffect(() => {
    if (selectedClient) setQuery(selectedClient.name);
  }, [selectedClient]);

  const createInline = () => {
    const name = query.trim();
    if (!name) return;
    const client = createClient({ name });
    onChange(client);
    onClientCreated?.(client);
    setIsOpen(false);
  };

  const addInline = () => {
    const name = query.trim();
    if (!name) return;
    const duplicate = findDuplicateClient({ name }, clients);
    if (duplicate) {
      setInlineDuplicate(duplicate);
      return;
    }
    createInline();
  };

  return <div className="client-picker">
    <label className="label-m-semibold" htmlFor="client-picker-search">{label}</label>
    <BriskSelect ariaLabel="Clients" id="client-picker-search" searchable searchPlaceholder="Search Clients" clearable={false}
      autoOpen={!selectedClient} open={isOpen} onOpenChange={setIsOpen} initialQuery={initialQuery}
      onSearchChange={(next) => { setQuery(next); setInlineDuplicate(null); }}
      placeholder="Search Clients" value={value ?? ""}
      options={activeClients.map((client) => ({ value: client.id, label: client.name, searchText: client.website,
        description: client.website || undefined,
        content: <><ClientAvatar client={client} size="S" /><strong>{client.name}</strong></>,
      }))}
      onChange={(id) => { const client = clients.find((candidate) => candidate.id === id); if (client) { setQuery(client.name); onChange(client); } }}
      footer={<>
        {inlineDuplicate ? <div className="client-picker-duplicate">
          <strong className="label-s-semibold">A similar Client already exists</strong>
          <span className="label-xs">{inlineDuplicate.name}{inlineDuplicate.website ? ` - ${inlineDuplicate.website}` : ""}</span>
          <div><Button size="S" variant="secondary" className="client-secondary-button" type="button" onClick={() => {
            setQuery(inlineDuplicate.name); setIsOpen(false); onChange(inlineDuplicate);
          }}>Use existing Client</Button><Button size="S" variant="ghost" className="client-text-button" type="button" onClick={createInline}>Create anyway</Button></div>
        </div> : null}
        <button className="client-picker-add label-s-semibold" type="button" disabled={!query.trim()} onClick={addInline}>
          <DsIcon name="plus" size={16} />Add new Client{query.trim() ? ` - ${query.trim()}` : ""}
        </button>
        <span className="client-picker-note label-xs">A private portal is created automatically. Contact details can be added later.</span>
      </>} />
  </div>;
}

export function AddClientDialog({
  initialName = "",
  onClose,
  onCreated,
  showDuplicateOnOpen = false,
}: {
  initialName?: string;
  onClose: () => void;
  onCreated: (client: Client) => void;
  showDuplicateOnOpen?: boolean;
}) {
  const { clients, createClient } = useClients();
  const [form, setForm] = useState<NewClientInput>({ name: initialName, website: "" });
  const [duplicate, setDuplicate] = useState<Client | null>(showDuplicateOnOpen ? findDuplicateClient({ name: initialName }, clients) : null);

  const update = <Key extends keyof NewClientInput>(key: Key, value: NewClientInput[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setDuplicate(null);
  };

  const submit = () => {
    if (!form.name.trim()) return;
    const match = findDuplicateClient(form, clients);
    if (match) {
      setDuplicate(match);
      return;
    }
    onCreated(createClient(form));
  };

  return (
    <ClientModal
      title="Add Client"
      description="Start with a name. Brisk creates the private Client portal automatically."
      onClose={onClose}
      footer={(
        <>
          <Button size="S" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button size="S" variant="primary"  type="button" disabled={!form.name.trim()} onClick={submit}>Create Client</Button>
        </>
      )}
    >
      <div className="client-form-grid">
        <Input wrapperClassName="is-wide" label="Client name" labelSuffix="Required" autoFocus value={form.name} onChange={(event) => update("name", event.target.value)} />
        <Input label="Website" labelSuffix="Optional" value={form.website ?? ""} placeholder="example.org" onChange={(event) => update("website", event.target.value)} />
        <label className="client-field">
          <span className="label-m-semibold">Logo <small className="label-xs">Optional</small></span>
          <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.addEventListener("load", () => update("logoUrl", typeof reader.result === "string" ? reader.result : null));
            reader.readAsDataURL(file);
          }} />
        </label>
        <Input label="Primary contact name" labelSuffix="Optional" value={form.primaryContactName ?? ""} onChange={(event) => update("primaryContactName", event.target.value)} />
        <Input label="Primary contact email" labelSuffix="Optional" type="email" value={form.primaryContactEmail ?? ""} onChange={(event) => update("primaryContactEmail", event.target.value)} />
      </div>
      {duplicate ? (
        <section className="client-duplicate-warning" aria-labelledby="duplicate-client-heading">
          <DsIcon name="alert-triangle" size={20} />
          <div>
            <strong className="label-m-semibold" id="duplicate-client-heading">This looks similar to an existing Client</strong>
            <span className="label-s">{duplicate.name}{duplicate.website ? ` - ${duplicate.website}` : ""}</span>
            <div>
              <Button size="S" variant="secondary" className="client-secondary-button" type="button" onClick={() => onCreated(duplicate)}>Use existing Client</Button>
              <Button size="S" variant="ghost" className="client-text-button" type="button" onClick={() => onCreated(createClient(form))}>Create anyway</Button>
            </div>
          </div>
        </section>
      ) : null}
    </ClientModal>
  );
}

function findDuplicateClient(input: NewClientInput, candidates: Client[]) {
  const normalise = (value: string) => value.toLocaleLowerCase("en-AU").replace(/[^a-z0-9]/gu, "");
  const name = normalise(input.name);
  const website = normalise(input.website ?? "").replace(/^www/u, "");

  return candidates.find((client) => {
    const candidateName = normalise(client.name);
    const candidateWebsite = normalise(client.website).replace(/^www/u, "");
    const namesMatch = candidateName === name || (Math.min(candidateName.length, name.length) >= 4 && (candidateName.includes(name) || name.includes(candidateName)));
    const websitesMatch = Boolean(website && candidateWebsite && (website === candidateWebsite || website.includes(candidateWebsite) || candidateWebsite.includes(website)));
    return namesMatch || websitesMatch;
  }) ?? null;
}
