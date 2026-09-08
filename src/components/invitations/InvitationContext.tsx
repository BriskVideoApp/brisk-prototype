"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { InvitePersonModal, type InvitePersonSubmission } from "@/components/invitations/InvitePersonModal";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { usePeople } from "@/components/people/PeopleDataContext";
import { DsIcon } from "@/components/video-review/DsIcon";
import { activeVideoProjects } from "@/data/active-videos/mockData";
import {
  seededInvitationStatusByPersonId,
  type InvitationRole,
  type InvitationStatus,
  type InvitePersonPrefill,
} from "@/data/invitations";
import type { Person } from "@/data/people";

export type { InvitationRole, InvitationStatus, InvitePersonPrefill } from "@/data/invitations";

type InvitationRecord = {
  id: string;
  personId: string;
  email: string;
  role: InvitationRole;
  clientIds: string[];
  projectIds: string[];
  status: InvitationStatus;
  destination: string;
  sentAt: string;
};

type InvitationContextValue = {
  openInvitePerson: (prefill?: InvitePersonPrefill, onComplete?: InvitePersonCompleteHandler) => void;
  getInvitationStatus: (person: Person) => InvitationStatus;
  resendInvitation: (person: Person) => void;
  resendStudioStaffInvitation: (recipient: { id: string; email: string }) => void;
};

type InvitePersonCompleteHandler = (person: Person, submission: InvitePersonSubmission) => void;

type OpenInvitation = {
  id: number;
  prefill: InvitePersonPrefill;
  onComplete?: InvitePersonCompleteHandler;
};

const InvitationContext = createContext<InvitationContextValue | null>(null);

export function InvitationProvider({ children }: { children: ReactNode }) {
  const { inviteClient, inviteClientTeammate } = usePrototypeState();
  const {
    createPerson,
    people,
    setPersonStatus,
    updatePersonIdentity,
    updatePersonProjectAccess,
  } = usePeople();
  const [openInvitation, setOpenInvitation] = useState<OpenInvitation | null>(null);
  const [invitations, setInvitations] = useState<InvitationRecord[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const openInvitePerson = useCallback((prefill: InvitePersonPrefill = {}, onComplete?: InvitePersonCompleteHandler) => {
    setOpenInvitation({ id: Date.now(), prefill: normalisePrefill(prefill), onComplete });
  }, []);

  const getInvitationStatus = useCallback((person: Person): InvitationStatus => {
    const email = normaliseEmail(person.email);
    const current = [...invitations].reverse().find((invitation) => normaliseEmail(invitation.email) === email);
    if (current) return current.status;
    if (seededInvitationStatusByPersonId[person.id]) return seededInvitationStatusByPersonId[person.id];
    if (person.status === "Invited") return "Pending";
    return "Accepted";
  }, [invitations]);

  const addInvitationRecord = useCallback((record: Omit<InvitationRecord, "id" | "sentAt">) => {
    const sentAt = new Date().toISOString();
    setInvitations((current) => [
      ...current,
      {
        ...record,
        id: `${record.personId}-${Date.now()}`,
        sentAt,
      },
    ]);
  }, []);

  const sendInvitation = useCallback((submission: InvitePersonSubmission, onComplete?: InvitePersonCompleteHandler) => {
    const email = normaliseEmail(submission.email);
    const existingPerson = people.find((person) => normaliseEmail(person.email) === email);
    const name = submission.name.trim() || makeNameFromEmail(email);
    const jobTitle = submission.jobTitle.trim();
    let person = existingPerson;

    if (person) {
      if (submission.name.trim() || jobTitle) {
        updatePersonIdentity(person.id, {
          ...(submission.name.trim() ? { name: submission.name.trim() } : {}),
          ...(jobTitle ? { jobTitles: [jobTitle] } : {}),
        });
      }
      if (submission.projectIds.length) {
        updatePersonProjectAccess(person.id, unique([...person.projectAccessIds, ...submission.projectIds]));
      }
      if (getInvitationStatus(person) !== "Accepted") setPersonStatus(person.id, "Invited");
    } else if (submission.role === "Customer") {
      const clientId = submission.clientIds[0];
      if (!clientId) return;
      person = createPerson({
        type: "Client contact",
        name,
        email,
        clientId,
        projectIds: submission.projectIds,
      });
    } else {
      person = createPerson({
        type: submission.role === "Studio Staff" ? "Team" : "Freelancer",
        name,
        email,
        jobTitle: jobTitle || submission.role,
        skills: jobTitle ? [jobTitle] : [],
        location: "",
        inviteNow: true,
      });
      if (submission.projectIds.length) updatePersonProjectAccess(person.id, submission.projectIds);
    }

    const status = existingPerson && getInvitationStatus(existingPerson) === "Accepted" ? "Accepted" : "Pending";
    addInvitationRecord({
      personId: person.id,
      email,
      role: submission.role,
      clientIds: submission.clientIds,
      projectIds: submission.projectIds,
      status,
      destination: getInvitationDestination(submission.role, submission.clientIds, submission.projectIds),
    });
    if (submission.role === "Customer" && submission.clientIds[0]) {
      if (submission.projectIds[0]) {
        inviteClient({
          clientId: submission.clientIds[0],
          projectId: submission.projectIds[0],
          name,
          email,
        });
      } else {
        inviteClientTeammate({
          clientId: submission.clientIds[0],
          name,
          email,
        });
      }
    }
    onComplete?.(person, submission);
    setOpenInvitation(null);
    setToast(`Invite sent to ${email}.`);
  }, [addInvitationRecord, createPerson, getInvitationStatus, inviteClient, inviteClientTeammate, people, setPersonStatus, updatePersonIdentity, updatePersonProjectAccess]);

  const resendInvitation = useCallback((person: Person) => {
    if (!person.accessRole || !person.email) return;
    const projectIds = unique([
      ...person.projectAccessIds,
      ...person.workloads.map((workload) => workload.projectId),
    ]);
    const clientIds = unique([
      ...(person.clientId ? [person.clientId] : []),
      ...projectIds.map((projectId) => activeVideoProjects.find((project) => project.id === projectId)?.clientId).filter((clientId): clientId is string => Boolean(clientId)),
    ]);
    const role = person.accessRole;
    setPersonStatus(person.id, "Invited");
    addInvitationRecord({
      personId: person.id,
      email: person.email,
      role,
      clientIds,
      projectIds,
      status: "Pending",
      destination: getInvitationDestination(role, clientIds, projectIds),
    });
    setToast(`Invite sent to ${person.email}.`);
  }, [addInvitationRecord, setPersonStatus]);

  const resendStudioStaffInvitation = useCallback((recipient: { id: string; email: string }) => {
    addInvitationRecord({
      personId: recipient.id,
      email: recipient.email,
      role: "Studio Staff",
      clientIds: [],
      projectIds: [],
      status: "Pending",
      destination: "/active-videos",
    });
    setToast(`Invite sent to ${recipient.email}.`);
  }, [addInvitationRecord]);

  const value = useMemo<InvitationContextValue>(() => ({
    openInvitePerson,
    getInvitationStatus,
    resendInvitation,
    resendStudioStaffInvitation,
  }), [getInvitationStatus, openInvitePerson, resendInvitation, resendStudioStaffInvitation]);

  return (
    <InvitationContext.Provider value={value}>
      {children}
      {openInvitation ? (
        <InvitePersonModal
          key={openInvitation.id}
          prefill={openInvitation.prefill}
          onClose={() => setOpenInvitation(null)}
          onSubmit={(submission) => sendInvitation(submission, openInvitation.onComplete)}
        />
      ) : null}
      {toast ? <div className="invitation-toast label-s-semibold" role="status"><DsIcon name="check-circle" size={16} /> {toast}</div> : null}
    </InvitationContext.Provider>
  );
}

export function InvitationStatusBadge({ status }: { status: InvitationStatus }) {
  return <span className={`invitation-status is-${status.toLocaleLowerCase("en-AU")} label-xs-semibold`}>{status}</span>;
}

export function useInvitations() {
  const context = useContext(InvitationContext);
  if (!context) throw new Error("useInvitations must be used within InvitationProvider");
  return context;
}

function normalisePrefill(prefill: InvitePersonPrefill): InvitePersonPrefill {
  return {
    ...prefill,
    clientIds: unique([...(prefill.clientIds ?? []), ...(prefill.clientId ? [prefill.clientId] : [])]),
    projectIds: unique([...(prefill.projectIds ?? []), ...(prefill.projectId ? [prefill.projectId] : [])]),
  };
}

function getInvitationDestination(role: InvitationRole, clientIds: string[], projectIds: string[]) {
  if (projectIds[0]) return `/projects/${projectIds[0]}`;
  if (role === "Customer" && clientIds[0]) return `/clients/${clientIds[0]}?section=Projects`;
  return "/active-videos";
}

function makeNameFromEmail(email: string) {
  const localPart = email.split("@")[0] ?? "New person";
  return localPart
    .split(/[._-]+/u)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toLocaleUpperCase("en-AU")}${part.slice(1)}`)
    .join(" ") || "New person";
}

function normaliseEmail(email: string) {
  return email.trim().toLocaleLowerCase("en-AU");
}

function unique(values: string[]) {
  return [...new Set(values)];
}
