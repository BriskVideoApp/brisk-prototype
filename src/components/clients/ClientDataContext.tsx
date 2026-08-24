"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  clients as initialClients,
  getClientInitials,
  makeClientId,
  type Client,
  type ClientContact,
  type NewClientInput,
  type PortalAccessStatus,
} from "@/data/clients";

type ClientDataContextValue = {
  clients: Client[];
  createClient: (input: NewClientInput) => Client;
  updateClient: (clientId: string, update: Partial<Pick<Client, "name" | "type" | "website" | "logoUrl">>) => void;
  archiveClient: (clientId: string) => void;
  restoreClient: (clientId: string) => void;
  addContact: (clientId: string, contact: Pick<ClientContact, "name" | "email">) => ClientContact;
  updateContact: (clientId: string, contactId: string, update: Partial<Pick<ClientContact, "name" | "email">>) => void;
  updateContactRole: (clientId: string, contactId: string, role: ClientContact["membershipRole"]) => void;
  removeContact: (clientId: string, contactId: string) => void;
  updateContactAccess: (clientId: string, contactId: string, status: PortalAccessStatus) => void;
  updateContactProjects: (clientId: string, contactId: string, projectIds: string[]) => void;
};

const ClientDataContext = createContext<ClientDataContextValue | null>(null);

export function ClientDataProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>(initialClients);

  const value = useMemo<ClientDataContextValue>(() => ({
    clients,
    createClient(input) {
      const baseId = makeClientId(input.name);
      const matchingIds = new Set(clients.map((client) => client.id));
      let id = baseId;
      let suffix = 2;

      while (matchingIds.has(id)) {
        id = `${baseId}-${suffix}`;
        suffix += 1;
      }

      const contactName = input.primaryContactName?.trim() ?? "";
      const contactEmail = input.primaryContactEmail?.trim() ?? "";
      const primaryContact = contactName && contactEmail
        ? {
            id: `${id}-contact-1`,
            name: contactName,
            email: contactEmail,
            portalAccess: "Invited" as const,
            lastActive: null,
            projectIds: [],
            membershipRole: "Client Admin" as const,
          }
        : null;
      const client: Client = {
        id,
        name: input.name.trim(),
        badge: getClientInitials(input.name),
        type: input.type ?? "Organisation",
        status: "Active",
        website: input.website?.trim() ?? "",
        logoUrl: input.logoUrl ?? null,
        primaryContactId: primaryContact?.id ?? null,
        contacts: primaryContact ? [primaryContact] : [],
        latestActivity: { label: "Client added", occurredAt: new Date().toISOString() },
        portal: { status: "Active", slug: id },
        defaultBrandKitSlug: null,
      };

      setClients((current) => [client, ...current]);
      return client;
    },
    updateClient(clientId, update) {
      setClients((current) => current.map((client) => client.id === clientId
        ? { ...client, ...update, badge: update.name ? getClientInitials(update.name) : client.badge }
        : client));
    },
    archiveClient(clientId) {
      setClients((current) => current.map((client) => client.id === clientId
        ? {
            ...client,
            status: "Archived",
            portal: { ...client.portal, status: "Paused" },
            latestActivity: { label: "Client archived", occurredAt: new Date().toISOString() },
          }
        : client));
    },
    restoreClient(clientId) {
      setClients((current) => current.map((client) => client.id === clientId
        ? {
            ...client,
            status: "Active",
            portal: { ...client.portal, status: "Active" },
            latestActivity: { label: "Client restored", occurredAt: new Date().toISOString() },
          }
        : client));
    },
    addContact(clientId, contactInput) {
      const selectedClient = clients.find((client) => client.id === clientId);
      if (!selectedClient) throw new Error(`Client ${clientId} was not found`);
      const contact: ClientContact = {
        id: `${selectedClient.id}-contact-${selectedClient.contacts.length + 1}`,
        name: contactInput.name.trim(),
        email: contactInput.email.trim(),
        portalAccess: "Invited",
        lastActive: null,
        projectIds: [],
        membershipRole: "Client Member",
      };

      setClients((current) => current.map((client) => {
        if (client.id !== clientId) return client;
        return {
          ...client,
          contacts: [...client.contacts, contact],
          primaryContactId: client.primaryContactId ?? contact.id,
          latestActivity: { label: `Portal invitation sent to ${contact.name}`, occurredAt: new Date().toISOString() },
        };
      }));
      return contact;
    },
    updateContact(clientId, contactId, update) {
      setClients((current) => current.map((client) => client.id === clientId
        ? {
            ...client,
            contacts: client.contacts.map((contact) => contact.id === contactId ? { ...contact, ...update } : contact),
          }
        : client));
    },
    updateContactRole(clientId, contactId, role) {
      setClients((current) => current.map((client) => client.id === clientId
        ? {
            ...client,
            contacts: client.contacts.map((contact) => contact.id === contactId ? { ...contact, membershipRole: role } : contact),
          }
        : client));
    },
    removeContact(clientId, contactId) {
      setClients((current) => current.map((client) => {
        if (client.id !== clientId) return client;
        const contacts = client.contacts.filter((contact) => contact.id !== contactId);
        return {
          ...client,
          contacts,
          primaryContactId: client.primaryContactId === contactId ? contacts[0]?.id ?? null : client.primaryContactId,
          latestActivity: { label: "Incorrect contact record removed", occurredAt: new Date().toISOString() },
        };
      }));
    },
    updateContactAccess(clientId, contactId, status) {
      setClients((current) => current.map((client) => client.id === clientId
        ? { ...client, contacts: client.contacts.map((contact) => contact.id === contactId ? { ...contact, portalAccess: status } : contact) }
        : client));
    },
    updateContactProjects(clientId, contactId, projectIds) {
      setClients((current) => current.map((client) => client.id === clientId
        ? { ...client, contacts: client.contacts.map((contact) => contact.id === contactId ? { ...contact, projectIds } : contact) }
        : client));
    },
  }), [clients]);

  return <ClientDataContext.Provider value={value}>{children}</ClientDataContext.Provider>;
}

export function useClients() {
  const context = useContext(ClientDataContext);
  if (!context) throw new Error("useClients must be used within ClientDataProvider");
  return context;
}
