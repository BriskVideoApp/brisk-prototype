"use client";

import type { MouseEvent } from "react";
import { useState } from "react";
import {
  formatHours,
  getAcceptedInvitation,
  getInvitationRate,
  getRoleEstimatedHours,
  getSlotLabel,
  getVisibleInvitations,
  snapToQuarter,
  stageLabels,
} from "@/data/active-videos/teamDefaults";
import { DsIcon } from "@/components/video-review/DsIcon";
import type { Invitation, RoleSlot, TeamPerson } from "@/components/active-videos/types";

type RoleRowProps = {
  slot: RoleSlot;
  people: TeamPerson[];
  canEdit: boolean;
  showCosts: boolean;
  onOpenEditor: () => void;
  onChangeHours: (hours: number) => void;
};

const teamReferenceDate = new Date("2026-06-25T09:00:00+10:00");

export function RoleRow({ slot, people, canEdit, showCosts, onOpenEditor, onChangeHours }: RoleRowProps) {
  const [isEditingHours, setIsEditingHours] = useState(false);
  const [draftHours, setDraftHours] = useState("");
  const roleLabel = getSlotLabel(slot);
  const estimatedHours = getRoleEstimatedHours(slot);
  const acceptedInvitation = getAcceptedInvitation(slot);
  const acceptedPerson = acceptedInvitation ? people.find((person) => person.id === acceptedInvitation.personId) : undefined;
  const pendingInvitations = getVisibleInvitations(slot);

  const openEditor = () => {
    if (canEdit) {
      onOpenEditor();
    }
  };

  const startHoursEdit = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    if (!canEdit) {
      return;
    }

    setDraftHours(estimatedHours > 0 ? String(estimatedHours) : "");
    setIsEditingHours(true);
  };

  const commitHoursEdit = () => {
    onChangeHours(snapToQuarter(Number.parseFloat(draftHours) || 0));
    setIsEditingHours(false);
  };

  return (
    <div
      className={`team-role-row ${canEdit ? "editable" : ""}`}
      role={canEdit ? "button" : "row"}
      tabIndex={canEdit ? 0 : undefined}
      aria-label={canEdit ? `Edit ${roleLabel} role` : undefined}
      onClick={openEditor}
      onKeyDown={(event) => {
        if (!canEdit) {
          return;
        }

        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenEditor();
        }
      }}
    >
      <div className="team-role-row-primary">
        <div className="team-role-main">
          <span className="team-role-titleline">
            <span className="team-role-name label-s-semibold">{roleLabel}</span>
            <span className="team-role-dot" aria-hidden="true">
              ·
            </span>
            {isEditingHours ? (
              <input
                className="team-role-hours-input label-s-semibold"
                inputMode="decimal"
                min="0"
                step="0.25"
                type="number"
                value={draftHours}
                autoFocus
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => setDraftHours(event.target.value)}
                onBlur={commitHoursEdit}
                onKeyDown={(event) => {
                  event.stopPropagation();

                  if (event.key === "Enter") {
                    commitHoursEdit();
                  }

                  if (event.key === "Escape") {
                    setIsEditingHours(false);
                  }
                }}
              />
            ) : canEdit ? (
              <button className="team-role-hours-chip label-s-semibold" type="button" onClick={startHoursEdit}>
                {estimatedHours > 0 ? formatHours(estimatedHours) : "Add hours"}
              </button>
            ) : (
              <span className="team-role-hours-chip label-s-semibold">{estimatedHours > 0 ? formatHours(estimatedHours) : "Add hours"}</span>
            )}
          </span>
          <span className="team-role-stages label-xs">{slot.stages.map((stage) => stageLabels[stage.stageId]).join(", ") || "No stages yet"}</span>
        </div>
      </div>

      {acceptedPerson && acceptedInvitation ? (
        <ResolvedSlotState person={acceptedPerson} invitation={acceptedInvitation} />
      ) : pendingInvitations.length > 0 ? (
        <InvitationList invitations={pendingInvitations} people={people} roleHours={estimatedHours} showCosts={showCosts} />
      ) : (
        <EmptySlotState canEdit={canEdit} />
      )}
    </div>
  );
}

function ResolvedSlotState({ person, invitation }: { person: TeamPerson; invitation: Invitation }) {
  const isFreelancer = person.personType === "Studio Freelancer";
  const isDirectFreelancer = isFreelancer && invitation.assignmentMethod === "direct";

  return (
    <div className="team-role-fill-state">
      <span className="team-role-person-name label-s">
        {person.name}
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
            const rate = getInvitationRate(invitation);

            return person ? (
              <p className="team-invitation-line label-s" key={invitation.id}>
                <span className="team-invitation-person label-s-semibold">{person.name}</span>
                {showCosts && rate ? <span>{formatCurrency(rate * roleHours)}</span> : null}
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

function EmptySlotState({ canEdit }: { canEdit: boolean }) {
  return (
    <div className="team-empty-fill-state">
      <span className="team-empty-slot label-s">No-one assigned.</span>
      {canEdit ? <span className="team-row-edit-hint label-xs-semibold">Fill role</span> : null}
    </div>
  );
}

export function StaffPill() {
  return <span className="team-person-pill studio label-xs-semibold">Team</span>;
}

export function FreelancePill() {
  return <span className="team-person-pill freelance label-xs-semibold">Contractor</span>;
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
