"use client";

import Link from "next/link";
import { useState } from "react";
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
    <div className="team-role-row" role="row">
      <div className="team-role-row-primary">
        <div className="team-role-main">
          <span className="team-role-titleline">
            {canEdit ? (
              <button
                className="team-role-name team-role-name-trigger label-s-semibold"
                type="button"
                aria-label={`Edit ${roleLabel} role`}
                aria-haspopup="dialog"
                onClick={onOpenEditor}
              >
                {roleLabel}
              </button>
            ) : (
              <span className="team-role-name label-s-semibold">{roleLabel}</span>
            )}
          </span>
        </div>
      </div>

      {acceptedPerson && acceptedInvitation ? (
        <ResolvedSlotState person={acceptedPerson} invitation={acceptedInvitation} />
      ) : pendingInvitations.length > 0 ? (
        <InvitationList invitations={pendingInvitations} people={people} roleHours={estimatedHours} showCosts={showCosts} />
      ) : (
        <EmptySlotState canEdit={canEdit} onOpenEditor={onOpenEditor} />
      )}
    </div>
  );
}

function ResolvedSlotState({
  person,
  invitation,
}: {
  person: TeamPerson;
  invitation: Invitation;
}) {
  const isFreelancer = person.personType === "Studio Freelancer";
  const isDirectFreelancer = isFreelancer && invitation.assignmentMethod === "direct";

  return (
    <div className="team-role-fill-state">
      <span className="team-role-person-name label-s">
        <Link
          className="team-role-person-trigger label-s"
          href={`/people/${encodeURIComponent(person.id)}`}
          aria-label={`Open ${person.name}'s People profile`}
        >
          {person.name}
        </Link>
        {isFreelancer ? <FreelancePill /> : <StaffPill />}
        {isDirectFreelancer ? <span className="team-assigned-indicator label-xs-semibold">Assigned</span> : null}
      </span>
    </div>
  );
}

function InvitationList({ invitations, people, roleHours, showCosts }: { invitations: Invitation[]; people: TeamPerson[]; roleHours: number; showCosts: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="team-invitation-list">
      <button
        className="team-invitation-toggle label-s-semibold"
        type="button"
        aria-expanded={isOpen}
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen((currentValue) => !currentValue);
        }}
      >
        Invited ({invitations.length})
        <DsIcon name="caret-down" size={12} />
      </button>
      {isOpen ? (
        <div className="team-invitation-dropdown" onClick={(event) => event.stopPropagation()}>
          {invitations.map((invitation) => {
            const person = people.find((teamPerson) => teamPerson.id === invitation.personId);
            const cost = getInvitationCost(invitation, roleHours);

            return person ? (
              <p className="team-invitation-line label-s" key={invitation.id}>
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

function EmptySlotState({ canEdit, onOpenEditor }: { canEdit: boolean; onOpenEditor: () => void }) {
  return (
    <div className="team-empty-fill-state">
      <span className="team-empty-slot label-s">No-one assigned.</span>
      {canEdit ? (
        <button className="team-row-edit-hint label-xs-semibold" type="button" onClick={onOpenEditor}>
          Fill role
        </button>
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
