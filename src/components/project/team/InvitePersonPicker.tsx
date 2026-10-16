"use client";

import { Button } from "../../../../Brisk DS/src/app/components/Button";
import { EditingDialog } from "../../../../Brisk DS/src/app/components/EditingDialog";

import { ConfirmationDialog } from "../../../../Brisk DS/src/app/components/ConfirmationDialog";


import type { ReactNode } from "react";
import { useState } from "react";
import { DsIcon } from "@/components/video-review/DsIcon";
import { getAcceptedInvitation, getSlotLabel, getVisibleInvitations, teamRoleLabels } from "@/data/active-videos/teamDefaults";
import type { RoleSlot, TeamPerson } from "@/components/active-videos/types";

type NewFreelancerInvite = {
  name: string;
  email: string;
  hourlyRate: number;
  message: string;
};

type InvitePersonPickerProps = {
  slot: RoleSlot;
  people: TeamPerson[];
  roleHours: number;
  assignedPersonIds: Set<string>;
  onAddStaff: (person: TeamPerson) => void;
  onInviteFreelancer: (person: TeamPerson) => void;
  onAssignFreelancer: (person: TeamPerson) => void;
  onInviteByEmail: (invite: NewFreelancerInvite) => void;
  onClose: () => void;
};

export function InvitePersonPicker({
  slot,
  people,
  roleHours,
  assignedPersonIds,
  onAddStaff,
  onInviteFreelancer,
  onAssignFreelancer,
  onInviteByEmail,
  onClose,
}: InvitePersonPickerProps) {
  const [staffPendingConfirmation, setStaffPendingConfirmation] = useState<TeamPerson | null>(null);
  const [isEmailInviteOpen, setIsEmailInviteOpen] = useState(false);
  const [newFreelancerName, setNewFreelancerName] = useState("");
  const [newFreelancerEmail, setNewFreelancerEmail] = useState("");
  const [newFreelancerRate, setNewFreelancerRate] = useState("95");
  const [emailMessage, setEmailMessage] = useState(() => getDefaultEmailMessage(getSlotLabel(slot), roleHours));
  const [isEmailTextOpen, setIsEmailTextOpen] = useState(false);
  const roleLabel = getSlotLabel(slot);
  const staff = people.filter((person) => person.personType === "Studio Staff");
  const freelancers = people.filter((person) => person.personType === "Studio Freelancer");
  const activeInvitations = getVisibleInvitations(slot);
  const hasPendingFreelanceInvitations = activeInvitations.length > 0;

  const addStaff = (person: TeamPerson) => {
    if (hasPendingFreelanceInvitations) {
      setStaffPendingConfirmation(person);
      return;
    }

    onAddStaff(person);
  };

  const submitEmailInvite = () => {
    const name = newFreelancerName.trim();
    const email = newFreelancerEmail.trim();
    const hourlyRate = Number.parseFloat(newFreelancerRate);

    if (!name || !email || !Number.isFinite(hourlyRate) || hourlyRate <= 0) {
      return;
    }

    onInviteByEmail({ name, email, hourlyRate, message: emailMessage });
    setNewFreelancerName("");
    setNewFreelancerEmail("");
    setNewFreelancerRate("95");
    setIsEmailInviteOpen(false);
  };

  return (
    <> <EditingDialog title={<>Fill  {roleLabel} role ·  {formatHoursNeeded(roleHours)} needed
            </>} size="wide" onCancel={onClose}>  <PersonGroup title="Studio Staff">
          {staff.map((person) => {
            const disabledReason = getStaffDisabledReason(slot, person, assignedPersonIds);

            return <StaffOption key={person.id} person={person} disabledReason={disabledReason} onAssign={() => addStaff(person)} />;
          })}
        </PersonGroup>  <PersonGroup
          title="Studio Freelancers"
          meta={`${activeInvitations.length} invited`}
        >
          {freelancers.map((person) => {
            const disabledReason = getFreelancerDisabledReason(slot, person, assignedPersonIds);

            return (
              <FreelancerOption
                key={person.id}
                person={person}
                roleHours={roleHours}
                disabledReason={disabledReason}
                isInviteDisabled={Boolean(disabledReason)}
                onInvite={() => onInviteFreelancer(person)}
                onAssign={() => onAssignFreelancer(person)}
              />
            );
          })}
          <Button size="S" variant="ghost" className="team-invite-email-link" type="button" onClick={() => setIsEmailInviteOpen((isOpen) => !isOpen)}>
            + Invite by email
          </Button>
        </PersonGroup>  {isEmailInviteOpen ? (
          <form
            className="team-invite-form"
            onSubmit={(event) => {
              event.preventDefault();
              submitEmailInvite();
            }}
          >
            <label className="label-xs-semibold" htmlFor={`invite-name-${slot.id}`}>
              Name
            </label>
            <input
              className="team-inline-input label-s"
              id={`invite-name-${slot.id}`}
              placeholder="Freelancer name"
              value={newFreelancerName}
              onChange={(event) => setNewFreelancerName(event.target.value)}
            />
            <label className="label-xs-semibold" htmlFor={`invite-email-${slot.id}`}>
              Email
            </label>
            <input
              className="team-inline-input label-s"
              id={`invite-email-${slot.id}`}
              placeholder="name@example.com"
              type="email"
              value={newFreelancerEmail}
              onChange={(event) => setNewFreelancerEmail(event.target.value)}
            />
            <label className="label-xs-semibold" htmlFor={`invite-rate-${slot.id}`}>
              Rate
            </label>
            <input
              className="team-inline-input label-s"
              id={`invite-rate-${slot.id}`}
              min="0"
              step="1"
              type="number"
              value={newFreelancerRate}
              onChange={(event) => setNewFreelancerRate(event.target.value)}
            />
            <Button size="S" variant="ghost" className="team-invite-email-link" type="button" onClick={() => setIsEmailTextOpen(true)}>
              Edit email text
            </Button>
            {isEmailTextOpen ? (
              <div className="team-email-popover" role="dialog" aria-label="Edit email text">
                <label className="label-xs-semibold" htmlFor={`invite-message-${slot.id}`}>
                  Email text
                </label>
                <textarea
                  className="team-email-textarea label-s"
                  id={`invite-message-${slot.id}`}
                  value={emailMessage}
                  onChange={(event) => setEmailMessage(event.target.value)}
                />
                <div className="team-popconfirm-actions">
                  <Button size="S" variant="secondary" className="team-secondary-button" type="button" onClick={() => setIsEmailTextOpen(false)}>
                    Cancel
                  </Button>
                  <Button size="S" variant="primary" className="team-primary-button" type="button" onClick={() => setIsEmailTextOpen(false)}>
                    Save text
                  </Button>
                </div>
              </div>
            ) : null}
            <div className="team-modal-actions">
              <Button size="S" variant="secondary" className="team-secondary-button" type="button" onClick={() => setIsEmailInviteOpen(false)}>
                Cancel
              </Button>
              <Button size="S" variant="primary" className="team-primary-button" type="submit">
                Send invite
              </Button>
            </div>
          </form>
        ) : null}  {staffPendingConfirmation ? (
          <ConfirmationDialog title={<>This will withdraw pending invitations. Continue?</>} onCancel={() => setStaffPendingConfirmation(null)} onConfirm={() => {
                  onAddStaff(staffPendingConfirmation);
                  setStaffPendingConfirmation(null);
                }} confirmLabel={<>Continue
              </>}  />
        ) : null} </EditingDialog> </>
  );
}

function PersonGroup({ title, meta, children }: { title: string; meta?: string; children: ReactNode }) {
  return (
    <div className="team-person-group">
      <div className="team-person-group-heading">
        <h3 className="team-person-group-title label-xs-semibold">{title}</h3>
        {meta ? <span className="label-xs">{meta}</span> : null}
      </div>
      {children}
    </div>
  );
}

function StaffOption({ person, disabledReason, onAssign }: { person: TeamPerson; disabledReason?: string; onAssign: () => void }) {
  return (
    <div className="team-person-option">
      <span className="team-person-option-copy">
        <span className="team-role-person-name label-s-semibold">{person.name}</span>
        <span className="team-role-rate label-xs">
          {teamRoleLabels[person.defaultRole]} · {person.bookedHoursThisWeek}/{person.weeklyCapacityHours}hrs · {person.availabilityLabel}
        </span>
        {disabledReason ? <span className="team-person-disabled label-xs-semibold">{disabledReason}</span> : null}
      </span>
      <Button size="S" variant="secondary" className="team-secondary-button" type="button" disabled={Boolean(disabledReason)} onClick={onAssign}>
        Assign
      </Button>
    </div>
  );
}

function FreelancerOption({
  person,
  roleHours,
  disabledReason,
  isInviteDisabled,
  onInvite,
  onAssign,
}: {
  person: TeamPerson;
  roleHours: number;
  disabledReason?: string;
  isInviteDisabled: boolean;
  onInvite: () => void;
  onAssign: () => void;
}) {
  const rate = person.hourlyRate ?? 0;

  return (
    <div className="team-person-option">
      <span className="team-person-option-copy">
        <span className="team-role-person-name label-s-semibold">{person.name}</span>
        <span className="team-role-rate label-xs">
          {teamRoleLabels[person.defaultRole]} · ${rate}/hr · {formatCurrency(rate * roleHours)} · {person.availabilityLabel}
        </span>
        {disabledReason ? <span className="team-person-disabled label-xs-semibold">{disabledReason}</span> : null}
      </span>
      <span className="team-person-option-actions">
        <Button size="S" variant="secondary" className="team-secondary-button" type="button" disabled={isInviteDisabled} onClick={onInvite}>
          Invite
        </Button>
        <Button size="S" variant="secondary" className="team-secondary-button" type="button" disabled={Boolean(disabledReason)} onClick={onAssign}>
          Assign directly
        </Button>
      </span>
    </div>
  );
}

function getStaffDisabledReason(slot: RoleSlot, person: TeamPerson, assignedPersonIds: Set<string>) {
  const acceptedInvitation = getAcceptedInvitation(slot);

  if (acceptedInvitation?.personId === person.id || assignedPersonIds.has(person.id)) {
    return "Already on this project";
  }

  return undefined;
}

function getFreelancerDisabledReason(slot: RoleSlot, person: TeamPerson, assignedPersonIds: Set<string>) {
  const acceptedInvitation = getAcceptedInvitation(slot);

  if (acceptedInvitation?.personId === person.id || assignedPersonIds.has(person.id)) {
    return "Already on this project";
  }

  if (getVisibleInvitations(slot).some((invitation) => invitation.personId === person.id)) {
    return "Already invited";
  }

  return undefined;
}

function formatHoursNeeded(hours: number) {
  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(2).replace(/\.?0+$/, "")}h`;
}

function formatCurrency(value: number) {
  return `$${Math.round(value).toLocaleString("en-AU")}`;
}

function getDefaultEmailMessage(roleLabel: string, roleHours: number) {
  return `Hi, we would like to invite you to fill the ${roleLabel} role on this Brisk project. The role is estimated at ${formatHoursNeeded(roleHours)}. Please reply in Brisk if you are available.`;
}
