"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Button } from "../../../../Brisk DS/src/app/components/Button";
import { PeopleAvatar } from "@/components/people/PeoplePrimitives";
import {
  getAcceptedInvitation,
  getInvitationCost,
  getRoleEstimatedHours,
  getSlotLabel,
  getVisibleInvitations,
} from "@/data/active-videos/teamDefaults";
import { DsIcon } from "@/components/video-review/DsIcon";
import type { Invitation, RoleSlot, TeamPerson } from "@/components/active-videos/types";

type RoleRowProps = {
  slot: RoleSlot;
  people: TeamPerson[];
  canEdit: boolean;
  showCosts: boolean;
  onOpenEditor: () => void;
};

const teamReferenceDate = new Date("2026-06-25T09:00:00+10:00");

export function RoleRow({ slot, people, canEdit, showCosts, onOpenEditor }: RoleRowProps) {
  const roleLabel = getSlotLabel(slot);
  const estimatedHours = getRoleEstimatedHours(slot);
  const acceptedInvitation = getAcceptedInvitation(slot);
  const acceptedPerson = acceptedInvitation ? people.find((person) => person.id === acceptedInvitation.personId) : undefined;
  const pendingInvitations = getVisibleInvitations(slot);

  return (
    <div className="team-overview-role" role="listitem">
      <div className="team-overview-person-row">
        {acceptedPerson ? <TeamPersonAvatar person={acceptedPerson} /> : null}
        <div className="team-overview-identity">
          {acceptedPerson ? <Link
            className="team-overview-profile label-s-semibold"
            href={`/people/${encodeURIComponent(acceptedPerson.id)}`}
            aria-label={`Open ${acceptedPerson.name}'s People profile`}
          >{acceptedPerson.name}</Link> : <span className="label-s-semibold">{roleLabel}</span>}
          <span className="team-overview-meta label-xs">
            {acceptedPerson ? `${roleLabel} · ${acceptedPerson.personType}` : "Unassigned"} · {estimatedHours}h required
          </span>
          {acceptedPerson?.personType === "Studio Freelancer" && acceptedInvitation?.assignmentMethod === "direct" ? <span className="team-overview-meta label-xs">Assigned</span> : null}
        </div>
        {canEdit ? <Button
          size="S"
          variant={acceptedPerson ? "ghost" : "primary"}
          aria-label={`${acceptedPerson ? "Change" : "Assign"} ${roleLabel}`}
          aria-haspopup="dialog"
          onClick={onOpenEditor}
        >
          {acceptedPerson ? "Change" : "Assign"}
        </Button> : null}
      </div>
      {!acceptedPerson && pendingInvitations.length > 0 ? (
        <InvitationList invitations={pendingInvitations} people={people} roleHours={estimatedHours} showCosts={showCosts} />
      ) : null}
    </div>
  );
}

export function TeamPersonAvatar({ person }: { person: TeamPerson }) {
  return <PeopleAvatar person={{ name: person.name, avatarUrl: person.photoUrl ?? null, type: person.personType === "Studio Staff" ? "Team" : "Freelancer" }} size="S" />;
}

function InvitationList({ invitations, people, roleHours, showCosts }: { invitations: Invitation[]; people: TeamPerson[]; roleHours: number; showCosts: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const id = useId();

  return (
    <div className="team-overview-invitations">
      <Button
        size="S"
        variant="ghost"
        aria-expanded={isOpen}
        aria-controls={id}
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen((currentValue) => !currentValue);
        }}
      >
        <DsIcon name="caret-down" size={12} />
        {invitations.length} invited
      </Button>
      {isOpen ? (
        <div className="team-overview-invitation-detail" id={id} onClick={(event) => event.stopPropagation()}>
          {invitations.map((invitation) => {
            const person = people.find((teamPerson) => teamPerson.id === invitation.personId);
            const cost = getInvitationCost(invitation, roleHours);

            return person ? (
              <p className="team-overview-invitation-line label-s" key={invitation.id}>
                <span className="team-invitation-person label-s-semibold">{person.name}</span>
                {showCosts && typeof cost === "number" ? (
                  <span>{typeof invitation.projectRateSnapshot === "number" || invitation.paymentBasis === "flat" ? `Project rate ${formatCurrency(cost)}` : formatCurrency(cost)}</span>
                ) : null}
                <span>{formatInvitationStatus(invitation.status)}</span>
                <span>{formatSentTime(invitation.sentAt)}</span>
              </p>
            ) : null;
          })}
        </div>
      ) : null}
    </div>
  );
}

export function StaffPill() {
  return (
    <span
      className="team-person-pill studio"
      aria-label="Studio Staff"
      data-tooltip="Studio Staff"
      tabIndex={0}
    >
      <DsIcon name="users-three" size={12} />
    </span>
  );
}

export function FreelancePill() {
  return <span className="team-person-pill freelance label-xs-semibold">Studio Freelancer</span>;
}

function formatInvitationStatus(status: Invitation["status"]) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatSentTime(sentAt: string) {
  const sentDate = new Date(sentAt);
  const daysAgo = Math.max(0, Math.round((teamReferenceDate.getTime() - sentDate.getTime()) / 86_400_000));

  if (daysAgo === 0) {
    return "Sent today";
  }

  if (daysAgo === 1) {
    return "Sent 1d ago";
  }

  return `Sent ${daysAgo}d ago`;
}

function formatCurrency(value: number) {
  return `$${Math.round(value).toLocaleString("en-AU")}`;
}
