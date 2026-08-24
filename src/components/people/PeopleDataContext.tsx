"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useClients } from "@/components/clients/ClientDataContext";
import type { Client, ClientContact } from "@/data/clients";
import {
  clientContactMetadata,
  createNativePerson,
  initialNativePeople,
  type NewPersonInput,
  type Person,
  type PersonActivity,
  type PersonProfileUpdate,
  type PersonStudioDetailsUpdate,
  type PersonStatus,
  type PersonWorkload,
} from "@/data/people";

export type NewClientContactInput = {
  type: "Client contact";
  name: string;
  email: string;
  clientId: string;
  projectIds: string[];
};

export type CreatePersonInput = NewPersonInput | NewClientContactInput;

export type ProjectStaffWorkload = {
  personId: string;
  workload: PersonWorkload;
};

type PeopleDataContextValue = {
  people: Person[];
  createPerson: (input: CreatePersonInput) => Person;
  deletePerson: (personId: string) => void;
  updatePersonIdentity: (personId: string, update: PersonProfileUpdate) => void;
  updatePersonClientMembershipRole: (personId: string, role: "Client Admin" | "Client Member") => void;
  updatePersonStudioDetails: (personId: string, update: PersonStudioDetailsUpdate) => void;
  updatePersonProjectAccess: (personId: string, projectIds: string[]) => void;
  syncProjectStaffWorkloads: (projectId: string, assignments: ProjectStaffWorkload[]) => void;
  setPersonStatus: (personId: string, status: PersonStatus) => void;
  updatePersonNotes: (personId: string, notes: string) => void;
};

const PeopleDataContext = createContext<PeopleDataContextValue | null>(null);

export function PeopleDataProvider({ children }: { children: ReactNode }) {
  const { addContact, clients, removeContact, updateContact, updateContactAccess, updateContactProjects, updateContactRole } = useClients();
  const [nativePeople, setNativePeople] = useState<Person[]>(initialNativePeople);
  const [archivedContactIds, setArchivedContactIds] = useState<string[]>([]);
  const [contactNotes, setContactNotes] = useState<Record<string, string>>({});
  const [contactProfileOverrides, setContactProfileOverrides] = useState<Record<string, PersonProfileUpdate>>({});
  const [contactActivityOverrides, setContactActivityOverrides] = useState<Record<string, PersonActivity[]>>({});

  const clientContacts = useMemo(() => clients.flatMap((client) => client.contacts.map((contact) => makeClientContactPerson(
    client,
    contact,
    archivedContactIds.includes(contact.id),
    contactNotes[contact.id],
    contactProfileOverrides[contact.id],
    contactActivityOverrides[contact.id],
  ))), [archivedContactIds, clients, contactActivityOverrides, contactNotes, contactProfileOverrides]);

  const people = useMemo(() => [...nativePeople, ...clientContacts], [clientContacts, nativePeople]);
  const syncProjectStaffWorkloads = useCallback((projectId: string, assignments: ProjectStaffWorkload[]) => {
    setNativePeople((current) => {
      let didChange = false;
      const nextPeople = current.map((person) => {
        if (person.type !== "Team") return person;

        const retainedWorkloads = person.workloads.filter((workload) => workload.projectId !== projectId);
        const projectWorkloads = assignments.filter((assignment) => assignment.personId === person.id).map((assignment) => assignment.workload);
        const nextWorkloads = [...retainedWorkloads, ...projectWorkloads];

        if (workloadsMatch(person.workloads, nextWorkloads)) return person;
        didChange = true;
        return { ...person, workloads: nextWorkloads };
      });

      return didChange ? nextPeople : current;
    });
  }, []);

  const value = useMemo<PeopleDataContextValue>(() => ({
    people,
    createPerson(input) {
      if (input.type === "Client contact") {
        const client = clients.find((candidate) => candidate.id === input.clientId);
        if (!client) throw new Error(`Client ${input.clientId} was not found`);
        const contact = addContact(client.id, { name: input.name, email: input.email });
        updateContactProjects(client.id, contact.id, input.projectIds);
        return makeClientContactPerson(client, { ...contact, projectIds: input.projectIds }, false);
      }

      const baseId = makePersonId(input.name);
      const usedIds = new Set(people.map((person) => person.id));
      let id = baseId;
      let suffix = 2;
      while (usedIds.has(id)) {
        id = `${baseId}-${suffix}`;
        suffix += 1;
      }
      const person = createNativePerson(input, id);
      setNativePeople((current) => [person, ...current]);
      return person;
    },
    deletePerson(personId) {
      const contactOwner = clients.find((client) => client.contacts.some((contact) => contact.id === personId));
      if (contactOwner) {
        removeContact(contactOwner.id, personId);
        return;
      }
      setNativePeople((current) => current.filter((person) => person.id !== personId));
    },
    updatePersonIdentity(personId, update) {
      const contactOwner = clients.find((client) => client.contacts.some((contact) => contact.id === personId));
      const existingPerson = people.find((person) => person.id === personId);
      const activity = makeProfileActivity(existingPerson, update);
      if (contactOwner) {
        const contactUpdate: Partial<Pick<ClientContact, "name" | "email">> = {};
        if (update.name !== undefined) contactUpdate.name = update.name;
        if (update.email !== undefined) contactUpdate.email = update.email;
        if (Object.keys(contactUpdate).length) updateContact(contactOwner.id, personId, contactUpdate);
        const profileUpdate = { ...update };
        delete profileUpdate.name;
        delete profileUpdate.email;
        if (Object.keys(profileUpdate).length) setContactProfileOverrides((current) => ({
          ...current,
          [personId]: { ...current[personId], ...profileUpdate },
        }));
        if (activity) setContactActivityOverrides((current) => ({ ...current, [personId]: [activity, ...(current[personId] ?? [])] }));
        return;
      }
      setNativePeople((current) => current.map((person) => person.id === personId ? {
        ...person,
        ...update,
        ...(activity ? { latestActivity: activity, activity: [activity, ...person.activity] } : {}),
      } : person));
    },
    updatePersonClientMembershipRole(personId, role) {
      const contactOwner = clients.find((client) => client.contacts.some((contact) => contact.id === personId));
      if (contactOwner) updateContactRole(contactOwner.id, personId, role);
    },
    updatePersonStudioDetails(personId, update) {
      setNativePeople((current) => current.map((person) => {
        if (person.id !== personId) return person;
        const { defaultRate, rateType, ...details } = update;
        const activity = makeStudioDetailsActivity(person, update);
        return {
          ...person,
          ...details,
          commercial: person.commercial ? {
            ...person.commercial,
            ...(defaultRate !== undefined ? { defaultRate } : {}),
            ...(rateType !== undefined ? { rateType } : {}),
          } : null,
          latestActivity: activity,
          activity: [activity, ...person.activity],
        };
      }));
    },
    updatePersonProjectAccess(personId, projectIds) {
      const contactOwner = clients.find((client) => client.contacts.some((contact) => contact.id === personId));
      const existingPerson = people.find((person) => person.id === personId);
      const activity = existingPerson ? makeProjectAccessActivity(existingPerson, projectIds) : null;
      if (contactOwner) {
        updateContactProjects(contactOwner.id, personId, projectIds);
        if (activity) setContactActivityOverrides((current) => ({ ...current, [personId]: [activity, ...(current[personId] ?? [])] }));
        return;
      }
      setNativePeople((current) => current.map((person) => person.id === personId ? {
        ...person,
        projectAccessIds: projectIds,
        ...(activity ? { latestActivity: activity, activity: [activity, ...person.activity] } : {}),
      } : person));
    },
    syncProjectStaffWorkloads,
    setPersonStatus(personId, status) {
      const contactOwner = clients.find((client) => client.contacts.some((contact) => contact.id === personId));
      if (contactOwner) {
        const existingPerson = people.find((person) => person.id === personId);
        const activity = existingPerson ? makeStatusActivity(existingPerson, status) : null;
        if (status === "Archived") {
          setArchivedContactIds((current) => current.includes(personId) ? current : [...current, personId]);
          updateContactAccess(contactOwner.id, personId, "Paused");
          if (activity) setContactActivityOverrides((current) => ({ ...current, [personId]: [activity, ...(current[personId] ?? [])] }));
          return;
        }
        setArchivedContactIds((current) => current.filter((id) => id !== personId));
        updateContactAccess(contactOwner.id, personId, status === "Paused" ? "Paused" : status === "Invited" ? "Invited" : "Active");
        if (activity) setContactActivityOverrides((current) => ({ ...current, [personId]: [activity, ...(current[personId] ?? [])] }));
        return;
      }
      setNativePeople((current) => current.map((person) => {
        if (person.id !== personId) return person;
        const activity = makeStatusActivity(person, status);
        return { ...person, status, latestActivity: activity, activity: [activity, ...person.activity] };
      }));
    },
    updatePersonNotes(personId, notes) {
      if (clientContacts.some((person) => person.id === personId)) {
        setContactNotes((current) => ({ ...current, [personId]: notes }));
        return;
      }
      setNativePeople((current) => current.map((person) => person.id === personId ? { ...person, notes } : person));
    },
  }), [addContact, clientContacts, clients, people, removeContact, syncProjectStaffWorkloads, updateContact, updateContactAccess, updateContactProjects, updateContactRole]);

  return <PeopleDataContext.Provider value={value}>{children}</PeopleDataContext.Provider>;
}

export function usePeople() {
  const context = useContext(PeopleDataContext);
  if (!context) throw new Error("usePeople must be used within PeopleDataProvider");
  return context;
}

function makeClientContactPerson(
  client: Client,
  contact: ClientContact,
  archived: boolean,
  notesOverride?: string,
  profileOverride?: PersonProfileUpdate,
  activityOverrides: PersonActivity[] = [],
): Person {
  const metadata = clientContactMetadata[contact.id] ?? {
    jobTitles: ["Client collaborator"],
    skills: [],
    styles: [],
    seniority: "Senior" as const,
    location: "Location not added",
    timezone: "UTC",
    phone: "",
    notes: "",
  };
  const occurredAt = contact.lastActive ?? "2026-08-10T09:00:00+10:00";
  const baseLatestActivity: PersonActivity = {
    id: `${contact.id}-latest`,
    label: contact.lastActive ? "Opened the Client portal" : "Portal invitation sent",
    detail: contact.lastActive ? `${contact.name} viewed shared project work` : `Magic-link invitation sent to ${contact.email}`,
    occurredAt,
  };

  return {
    id: contact.id,
    name: contact.name,
    avatarUrl: profileOverride?.avatarUrl ?? null,
    email: contact.email,
    phone: profileOverride?.phone ?? metadata.phone,
    department: null,
    type: "Client contact",
    jobTitles: profileOverride?.jobTitles ?? metadata.jobTitles,
    skills: profileOverride?.skills ?? metadata.skills,
    styles: profileOverride?.styles ?? metadata.styles,
    seniority: profileOverride?.seniority ?? metadata.seniority,
    location: profileOverride?.location ?? metadata.location,
    timezone: profileOverride?.timezone ?? metadata.timezone,
    accessRole: "Customer",
    studioPermission: null,
    status: archived ? "Archived" : contact.portalAccess,
    latestActivity: activityOverrides[0] ?? baseLatestActivity,
    activity: [
      ...activityOverrides,
      baseLatestActivity,
      {
        id: `${contact.id}-access`,
        label: "Project access updated",
        detail: `${contact.projectIds.length} ${contact.projectIds.length === 1 ? "project" : "projects"} shared in ${client.name}'s portal`,
        occurredAt: "2026-08-06T14:15:00+10:00",
      },
      {
        id: `${contact.id}-invite`,
        label: "Portal invitation created",
        detail: `Secure magic-link access created for ${client.name}`,
        occurredAt: "2026-07-29T10:45:00+10:00",
      },
    ],
    workloads: [],
    weeklyCapacityHours: null,
    availability: null,
    notes: notesOverride ?? metadata.notes,
    portfolioUrl: profileOverride?.portfolioUrl ?? "",
    testingStatus: "Not required",
    onboardingStatus: contact.portalAccess === "Invited" ? "Not started" : "Complete",
    agreementStatus: "Not required",
    commercial: null,
    clientId: client.id,
    clientName: client.name,
    clientMembershipRole: contact.membershipRole,
    projectAccessIds: contact.projectIds,
  };
}

function makeProfileActivity(person: Person | undefined, update: PersonProfileUpdate): PersonActivity | null {
  if (!person || Object.keys(update).length === 0) return null;
  const now = new Date().toISOString();
  const changedFields = Object.keys(update).map((field) => profileFieldLabels[field as keyof PersonProfileUpdate] ?? field);
  return {
    id: `${person.id}-profile-${now}`,
    label: "Profile updated",
    detail: `${changedFields.join(", ")} updated for ${update.name ?? person.name}`,
    occurredAt: now,
  };
}

function makeStudioDetailsActivity(person: Person, update: PersonStudioDetailsUpdate): PersonActivity {
  const now = new Date().toISOString();
  const changedFields = Object.keys(update).map((field) => studioDetailsFieldLabels[field as keyof PersonStudioDetailsUpdate] ?? field);
  return {
    id: `${person.id}-studio-details-${now}`,
    label: "Studio details updated",
    detail: `${changedFields.join(", ")} updated for ${person.name}`,
    occurredAt: now,
  };
}

const profileFieldLabels: Partial<Record<keyof PersonProfileUpdate, string>> = {
  avatarUrl: "Avatar",
  name: "Name",
  email: "Email",
  phone: "Phone",
  businessName: "Business name",
  taxNumber: "Tax number",
  jobTitles: "Job title",
  skills: "Skills",
  styles: "Styles",
  seniority: "Seniority",
  location: "Location",
  timezone: "Timezone",
  weeklyCapacityHours: "Weekly capacity",
  availability: "Availability",
  portfolioUrl: "Portfolio",
};

const studioDetailsFieldLabels: Record<keyof PersonStudioDetailsUpdate, string> = {
  department: "Department",
  seniority: "Seniority",
  studioPermission: "Studio permission",
  testingStatus: "Testing status",
  onboardingStatus: "Onboarding status",
  agreementStatus: "Agreement status",
  weeklyCapacityHours: "Weekly capacity",
  defaultRate: "Default rate",
  rateType: "Rate type",
};

function makePersonId(name: string) {
  return name
    .toLocaleLowerCase("en-AU")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "") || "person";
}

function makeStatusActivity(person: Person, status: PersonStatus): PersonActivity {
  const now = new Date().toISOString();
  return {
    id: `${person.id}-status-${now}`,
    label: status === "Archived" ? "Person archived" : status === "Paused" ? "Access paused" : status === "Invited" ? "Invitation sent" : "Access restored",
    detail: `${person.name}'s profile and history were preserved`,
    occurredAt: now,
  };
}

function makeProjectAccessActivity(person: Person, projectIds: string[]): PersonActivity {
  const now = new Date().toISOString();
  return {
    id: `${person.id}-access-${now}`,
    label: "Project access updated",
    detail: `${projectIds.length} ${projectIds.length === 1 ? "project" : "projects"} available to ${person.name}`,
    occurredAt: now,
  };
}

function workloadsMatch(left: PersonWorkload[], right: PersonWorkload[]) {
  if (left.length !== right.length) return false;

  return left.every((workload, index) => {
    const candidate = right[index];
    return candidate
      && workload.id === candidate.id
      && workload.projectId === candidate.projectId
      && workload.stage === candidate.stage
      && workload.status === candidate.status
      && workload.predictedHours === candidate.predictedHours
      && workload.projectRole === candidate.projectRole
      && workload.assignmentStatus === candidate.assignmentStatus;
  });
}
