"use client";

import { createContext, useContext, useMemo, type ReactNode, type SetStateAction } from "react";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import {
  getClientInitials,
  type Client,
  type ClientContact,
  type NewClientInput,
  type PortalAccessStatus,
} from "@/data/clients";
import { selectWorkspaceClients } from "@/data/prototype-state";

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
  const { state, createClient: createCanonicalClient, replaceWorkspaceClients } = usePrototypeState();
  const clients = selectWorkspaceClients(state, state.session.activeWorkspaceId);
  const setClients = (update: SetStateAction<Client[]>) => {
    replaceWorkspaceClients(typeof update === "function" ? update(clients) : update);
  };

  const value = useMemo<ClientDataContextValue>(() => ({
    clients,
    createClient(input) {
      return createCanonicalClient(input);
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
  }), [clients, createCanonicalClient, replaceWorkspaceClients]);

  return <ClientDataContext.Provider value={value}>{children}</ClientDataContext.Provider>;
}

export function useClients() {
  const context = useContext(ClientDataContext);
  if (!context) throw new Error("useClients must be used within ClientDataProvider");
  return context;
}
