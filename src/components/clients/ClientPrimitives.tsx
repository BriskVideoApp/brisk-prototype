"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
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

export function ClientModal({
  children,
  className = "",
  description,
  footer,
  onClose,
  title,
}: {
  children: ReactNode;
  className?: string;
  description?: string;
  footer: ReactNode;
  onClose: () => void;
  title: string;
}) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="client-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className={`client-modal ${className}`} role="dialog" aria-modal="true" aria-labelledby="client-modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div>
            <h2 className="headings-xs-bold" id="client-modal-title">{title}</h2>
            {description ? <p className="paragraph-s">{description}</p> : null}
          </div>
          <button className="client-icon-button" type="button" aria-label="Close" onClick={onClose}>
            <DsIcon name="x-close-cross" size={18} />
          </button>
        </header>
        <div className="client-modal-content">{children}</div>
        <footer>{footer}</footer>
      </section>
    </div>
  );
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
  const matches = useMemo(() => {
    const normalisedQuery = query.trim().toLocaleLowerCase("en-AU");
    if (!normalisedQuery) return activeClients.slice(0, 6);
    return activeClients
      .filter((client) => `${client.name} ${client.website}`.toLocaleLowerCase("en-AU").includes(normalisedQuery))
      .slice(0, 6);
  }, [activeClients, query]);

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

  return (
    <div className="client-picker">
      <label className="label-m-semibold" htmlFor="client-picker-search">{label}</label>
      <div className="client-picker-input">
        <DsIcon name="search" size={16} />
        <input
          id="client-picker-search"
          type="search"
          value={query}
          placeholder="Search Clients"
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setInlineDuplicate(null);
            setIsOpen(true);
          }}
        />
        {selectedClient ? <DsIcon name="check-circle" size={16} /> : null}
      </div>
      {isOpen ? (
        <div className="client-picker-menu" role="listbox" aria-label="Clients">
          {inlineDuplicate ? (
            <div className="client-picker-duplicate">
              <strong className="label-s-semibold">A similar Client already exists</strong>
              <span className="label-xs">{inlineDuplicate.name}{inlineDuplicate.website ? ` - ${inlineDuplicate.website}` : ""}</span>
              <div>
                <button className="client-secondary-button label-xs-semibold" type="button" onClick={() => {
                  setQuery(inlineDuplicate.name);
                  setIsOpen(false);
                  onChange(inlineDuplicate);
                }}>Use existing Client</button>
                <button className="client-text-button label-xs-semibold" type="button" onClick={createInline}>Create anyway</button>
              </div>
            </div>
          ) : null}
          {matches.map((client) => (
            <button
              className="client-picker-option"
              type="button"
              role="option"
              aria-selected={client.id === value}
              key={client.id}
              onClick={() => {
                setQuery(client.name);
                setIsOpen(false);
                onChange(client);
              }}
            >
              <ClientAvatar client={client} size="S" />
              <span>
                <strong className="label-s-semibold">{client.name}</strong>
                <small className="label-xs">{client.type}{client.website ? ` - ${client.website}` : ""}</small>
              </span>
              {client.id === value ? <DsIcon name="check" size={14} /> : null}
            </button>
          ))}
          <button className="client-picker-add label-s-semibold" type="button" disabled={!query.trim()} onClick={addInline}>
            <DsIcon name="plus" size={16} />
            Add new Client{query.trim() ? ` - ${query.trim()}` : ""}
          </button>
          <span className="client-picker-note label-xs">A private portal is created automatically. Contact details can be added later.</span>
        </div>
      ) : null}
    </div>
  );
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
  const [form, setForm] = useState<NewClientInput>({ name: initialName, type: "Organisation", website: "" });
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
          <Button size="M" variant="secondary" onClick={onClose}>Cancel</Button>
          <button className="client-primary-button label-m-semibold" type="button" disabled={!form.name.trim()} onClick={submit}>Create Client</button>
        </>
      )}
    >
      <div className="client-form-grid">
        <label className="client-field is-wide">
          <span className="label-m-semibold">Client name <small className="label-xs">Required</small></span>
          <input autoFocus value={form.name} onChange={(event) => update("name", event.target.value)} />
        </label>
        <fieldset className="client-type-field">
          <legend className="label-m-semibold">Client type</legend>
          <div>
            {(["Organisation", "Individual"] as const).map((type) => (
              <label className={`client-radio label-s-semibold ${form.type === type ? "is-selected" : ""}`} key={type}>
                <input type="radio" name="client-type" value={type} checked={form.type === type} onChange={() => update("type", type)} />
                {type}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="client-field">
          <span className="label-m-semibold">Website <small className="label-xs">Optional</small></span>
          <input value={form.website ?? ""} placeholder="example.org" onChange={(event) => update("website", event.target.value)} />
        </label>
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
        <label className="client-field">
          <span className="label-m-semibold">Primary contact name <small className="label-xs">Optional</small></span>
          <input value={form.primaryContactName ?? ""} onChange={(event) => update("primaryContactName", event.target.value)} />
        </label>
        <label className="client-field">
          <span className="label-m-semibold">Primary contact email <small className="label-xs">Optional</small></span>
          <input type="email" value={form.primaryContactEmail ?? ""} onChange={(event) => update("primaryContactEmail", event.target.value)} />
        </label>
      </div>
      {duplicate ? (
        <section className="client-duplicate-warning" aria-labelledby="duplicate-client-heading">
          <DsIcon name="alert-triangle" size={20} />
          <div>
            <strong className="label-m-semibold" id="duplicate-client-heading">This looks similar to an existing Client</strong>
            <span className="label-s">{duplicate.name}{duplicate.website ? ` - ${duplicate.website}` : ""}</span>
            <div>
              <button className="client-secondary-button label-s-semibold" type="button" onClick={() => onCreated(duplicate)}>Use existing Client</button>
              <button className="client-text-button label-s-semibold" type="button" onClick={() => onCreated(createClient(form))}>Create anyway</button>
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
