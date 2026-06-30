"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { DsIcon } from "@/components/video-review/DsIcon";
import {
  formatHours,
  getAcceptedInvitation,
  getInvitationRate,
  getRoleEstimatedHours,
  getSlotLabel,
  getVisibleInvitations,
  snapToQuarter,
  stageLabels,
  teamRoleLabels,
} from "@/data/active-videos/teamDefaults";
import type { Invitation, RoleSlot, StageKey, TeamPerson } from "@/components/active-videos/types";
import { FreelancePill, StaffPill } from "./RoleRow";

type NewFreelancerInvite = {
  name: string;
  email: string;
  hourlyRate: number;
  message: string;
};

type RoleEditorModalProps = {
  slot: RoleSlot;
  people: TeamPerson[];
  stages: StageKey[];
  assignedPersonIds: Set<string>;
  showCosts: boolean;
  onAddStaff: (person: TeamPerson) => void;
  onInviteFreelancer: (person: TeamPerson) => void;
  onAssignFreelancer: (person: TeamPerson) => void;
  onUnassign: () => void;
  onInviteByEmail: (invite: NewFreelancerInvite) => void;
  onWithdrawInvitation: (invitationId: string) => void;
  onWithdrawAll: () => void;
  onRemove: () => void;
  onSaveSettings: (hours: number, stages: StageKey[]) => void;
  onClose: () => void;
};

export function RoleEditorModal({
  slot,
  people,
  stages,
  assignedPersonIds,
  showCosts,
  onAddStaff,
  onInviteFreelancer,
  onAssignFreelancer,
  onUnassign,
  onInviteByEmail,
  onWithdrawInvitation,
  onWithdrawAll,
  onRemove,
  onSaveSettings,
  onClose,
}: RoleEditorModalProps) {
  const roleLabel = getSlotLabel(slot);
  const roleHours = getRoleEstimatedHours(slot);
  const acceptedInvitation = getAcceptedInvitation(slot);
  const acceptedPerson = acceptedInvitation ? people.find((person) => person.id === acceptedInvitation.personId) : undefined;
  const currentAssigneeId = acceptedPerson?.id;
  const [selectedStages, setSelectedStages] = useState<StageKey[]>(slot.stages.map((stageAssignment) => stageAssignment.stageId));
  const [draftHours, setDraftHours] = useState(roleHours > 0 ? String(roleHours) : "");
  const [isStagesExpanded, setIsStagesExpanded] = useState(false);
  const [activeFillTab, setActiveFillTab] = useState<"team" | "gig">(() => (acceptedPerson?.personType === "Studio Freelancer" || getVisibleInvitations(slot).length > 0 ? "gig" : "team"));
  const [staffPendingConfirmation, setStaffPendingConfirmation] = useState<TeamPerson | null>(null);
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false);
  const [isEmailInviteOpen, setIsEmailInviteOpen] = useState(false);
  const [newFreelancerName, setNewFreelancerName] = useState("");
  const [newFreelancerEmail, setNewFreelancerEmail] = useState("");
  const [newFreelancerRate, setNewFreelancerRate] = useState("95");
  const [emailMessage, setEmailMessage] = useState(() => getDefaultEmailMessage(roleLabel, roleHours));
  const [isEmailTextOpen, setIsEmailTextOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedFreelancerIds, setSelectedFreelancerIds] = useState<string[]>([]);
  const staff = people.filter((person) => person.personType === "Studio Staff");
  const freelancers = people.filter((person) => person.personType === "Studio Freelancer");
  const draftRoleHours = snapToQuarter(Number.parseFloat(draftHours) || 0);
  const activeInvitations = getVisibleInvitations(slot);
  const historicalInvitations = slot.invitations.filter((invitation) => invitation.status === "withdrawn" || invitation.status === "declined" || invitation.status === "expired");
  const selectedStageSummary = selectedStages.map((stage) => stageLabels[stage]).join(", ") || "No stages selected";

  useEffect(() => {
    setSelectedFreelancerIds((currentIds) => {
      const validIds = currentIds.filter((personId) => {
        const person = people.find((teamPerson) => teamPerson.id === personId);

        return person ? !getFreelancerProjectDisabledReason(slot, person, assignedPersonIds) && !isFreelancerAlreadyInvited(slot, person) : false;
      });

      return currentAssigneeId && validIds.includes(currentAssigneeId) ? [currentAssigneeId] : validIds;
    });
  }, [assignedPersonIds, currentAssigneeId, people, slot]);

  useEffect(() => {
    setSelectedStaffId((currentStaffId) => {
      if (!currentStaffId) {
        return null;
      }

      const person = staff.find((teamPerson) => teamPerson.id === currentStaffId);

      return person && !getStaffDisabledReason(slot, person, assignedPersonIds) ? currentStaffId : null;
    });
  }, [assignedPersonIds, staff, slot]);

  const toggleStage = (stage: StageKey) => {
    setSelectedStages((currentStages) =>
      currentStages.includes(stage) ? currentStages.filter((currentStage) => currentStage !== stage) : [...currentStages, stage],
    );
  };

  const addStaff = (person: TeamPerson) => {
    if (activeInvitations.length > 0) {
      setStaffPendingConfirmation(person);
      return;
    }

    onAddStaff(person);
    setSelectedStaffId(null);
  };

  const toggleStaffSelection = (person: TeamPerson) => {
    if (getStaffDisabledReason(slot, person, assignedPersonIds)) {
      return;
    }

    setSelectedStaffId((currentStaffId) => (currentStaffId === person.id ? null : person.id));
  };

  const assignSelectedStaff = () => {
    const person = selectedStaffId ? staff.find((teamPerson) => teamPerson.id === selectedStaffId) : undefined;

    if (person && person.id === currentAssigneeId) {
      onUnassign();
      setSelectedStaffId(null);
      return;
    }

    if (person) {
      addStaff(person);
    }
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

  const toggleFreelancerSelection = (person: TeamPerson) => {
    const isSelected = selectedFreelancerIds.includes(person.id);
    const isCurrentAssignee = person.id === currentAssigneeId;

    if (getFreelancerProjectDisabledReason(slot, person, assignedPersonIds) || isFreelancerAlreadyInvited(slot, person)) {
      return;
    }

    if (isCurrentAssignee) {
      setSelectedFreelancerIds((currentIds) => (currentIds.includes(person.id) ? [] : [person.id]));
      return;
    }

    setSelectedFreelancerIds((currentIds) => {
      const inviteSelectionIds = currentAssigneeId ? currentIds.filter((personId) => personId !== currentAssigneeId) : currentIds;

      return isSelected ? inviteSelectionIds.filter((personId) => personId !== person.id) : [...inviteSelectionIds, person.id];
    });
  };

  const sendSelectedInvites = () => {
    selectedFreelancerIds
      .map((personId) => freelancers.find((person) => person.id === personId))
      .filter((person): person is TeamPerson => Boolean(person))
      .forEach(onInviteFreelancer);
    setSelectedFreelancerIds([]);
  };

  const assignSelectedFreelancer = () => {
    const person = selectedFreelancerIds.length === 1 ? freelancers.find((teamPerson) => teamPerson.id === selectedFreelancerIds[0]) : undefined;

    if (person && person.id === currentAssigneeId) {
      onUnassign();
      setSelectedFreelancerIds([]);
      return;
    }

    if (person) {
      onAssignFreelancer(person);
      setSelectedFreelancerIds([]);
    }
  };

  const saveSettings = () => {
    onSaveSettings(snapToQuarter(Number.parseFloat(draftHours) || 0), selectedStages);
  };

  return (
    <div className="team-modal-backdrop" role="presentation" onClick={onClose}>
      <section className="team-modal team-role-editor" role="dialog" aria-modal="true" aria-label={`Edit ${roleLabel} role`} onClick={(event) => event.stopPropagation()}>
        <header className="team-modal-header">
          <div className="team-modal-heading">
            <h2 className="team-modal-title heading-3xs">{roleLabel}</h2>
            {acceptedPerson && acceptedInvitation ? (
              <span className="team-modal-current-person team-role-person-name label-s">
                {acceptedPerson.name}
                {acceptedPerson.personType === "Studio Freelancer" ? <FreelancePill /> : <StaffPill />}
                {acceptedPerson.personType === "Studio Freelancer" && acceptedInvitation.assignmentMethod === "direct" ? <span className="team-assigned-indicator label-xs-semibold">Assigned</span> : null}
              </span>
            ) : activeInvitations.length === 0 ? (
              <span className="team-modal-empty-slot label-s">No-one assigned yet.</span>
            ) : null}
          </div>
          <div className="team-modal-header-actions">
            <div className="team-modal-header-action-wrap">
              <button className="team-modal-icon-action danger" type="button" aria-label="Remove role" aria-expanded={isRemoveConfirmOpen} onClick={() => setIsRemoveConfirmOpen((isOpen) => !isOpen)}>
                <DsIcon name="trash-simple" size={14} />
              </button>
              {isRemoveConfirmOpen ? (
                <div className="team-popconfirm team-remove-popconfirm" role="alertdialog" aria-label="Confirm remove role">
                  <p className="label-s-semibold">Remove this role?</p>
                  <p className="label-xs">Assignments and invitations for this role will be removed from the project.</p>
                  <div className="team-popconfirm-actions">
                    <button className="team-secondary-button label-s-semibold" type="button" onClick={() => setIsRemoveConfirmOpen(false)}>
                      Cancel
                    </button>
                    <button
                      className="team-primary-button label-s-semibold"
                      type="button"
                      onClick={() => {
                        onRemove();
                        onClose();
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
            <button className="team-modal-close" type="button" aria-label="Close role editor" onClick={onClose}>
              <DsIcon name="x-close-cross" size={16} />
            </button>
          </div>
        </header>

        <section className="team-role-settings" aria-label="Role settings">
          <div className="team-role-settings-row">
            <div className="team-setting-field">
              <label className="label-xs-semibold" htmlFor={`role-hours-${slot.id}`}>
                Hours needed
              </label>
              <input
                className="team-inline-input team-hours-needed-input label-s"
                id={`role-hours-${slot.id}`}
                inputMode="decimal"
                min="0"
                step="0.25"
                type="number"
                value={draftHours}
                onChange={(event) => setDraftHours(event.target.value)}
              />
            </div>
            <div className="team-setting-field grow">
              <span className="team-stage-summary label-s">{selectedStageSummary}</span>
              <button className="team-inline-action label-s-semibold" type="button" onClick={() => setIsStagesExpanded((isExpanded) => !isExpanded)}>
                {isStagesExpanded ? "Done" : "Edit stages"}
              </button>
            </div>
          </div>

          {isStagesExpanded ? (
            <div className="team-stage-list compact">
              {stages.map((stage) => {
                const isSelected = selectedStages.includes(stage);

                return (
                  <button className={`team-stage-option ${isSelected ? "selected" : ""}`} type="button" key={stage} onClick={() => toggleStage(stage)}>
                    <span className={`team-checkbox ${isSelected ? "checked" : ""}`}>{isSelected ? "✓" : ""}</span>
                    <span className="label-s-semibold">{stageLabels[stage]}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </section>

        {!acceptedPerson && !acceptedInvitation && activeInvitations.length > 0 ? (
          <section className="team-editor-section">
            <InvitationEditorList invitations={activeInvitations} people={people} roleHours={draftRoleHours} showCosts={showCosts} onWithdrawInvitation={onWithdrawInvitation} />
            <button className="team-inline-action label-s-semibold" type="button" onClick={onWithdrawAll}>
              Withdraw all
            </button>
          </section>
        ) : null}

        <section className="team-editor-section">
          <div className="team-person-group-heading">
            <div className="team-segmented-control" role="tablist" aria-label="Fill type">
              <button className={`team-segment ${activeFillTab === "team" ? "active" : ""} label-s-semibold`} type="button" role="tab" aria-selected={activeFillTab === "team"} onClick={() => setActiveFillTab("team")}>
                Team
              </button>
              <button className={`team-segment ${activeFillTab === "gig" ? "active" : ""} label-s-semibold`} type="button" role="tab" aria-selected={activeFillTab === "gig"} onClick={() => setActiveFillTab("gig")}>
                Contractor
              </button>
            </div>
          </div>

          {activeFillTab === "team" ? (
            <PersonGroup>
              {staff.map((person) => {
                const disabledReason = getStaffDisabledReason(slot, person, assignedPersonIds);
                const isSelected = selectedStaffId === person.id;

                return <StaffOption key={person.id} person={person} disabledReason={disabledReason} isSelected={isSelected} onSelect={() => toggleStaffSelection(person)} />;
              })}
              <div className="team-fill-actions">
                <button className="team-secondary-button label-s-semibold" type="button" disabled={!selectedStaffId} onClick={assignSelectedStaff}>
                  {selectedStaffId === currentAssigneeId ? "Unassign" : "Assign"}
                </button>
              </div>
            </PersonGroup>
          ) : (
            <PersonGroup meta={formatInvitationCount(activeInvitations.length)}>
              {freelancers.map((person) => {
                const projectDisabledReason = getFreelancerProjectDisabledReason(slot, person, assignedPersonIds);
                const isAlreadyInvited = isFreelancerAlreadyInvited(slot, person);
                const isSelected = selectedFreelancerIds.includes(person.id);
                const isCurrentAssignee = person.id === currentAssigneeId;
                const isSelectionDisabled = !isCurrentAssignee && (Boolean(projectDisabledReason) || isAlreadyInvited);

                return (
                  <FreelancerOption
                    key={person.id}
                    person={person}
                    roleHours={draftRoleHours}
                    projectDisabledReason={projectDisabledReason}
                    isAlreadyInvited={isAlreadyInvited}
                    isSelected={isSelected}
                    isSelectionDisabled={isSelectionDisabled}
                    onSelect={() => toggleFreelancerSelection(person)}
                  />
                );
              })}
              <div className="team-fill-actions">
                <span className="team-fill-primary-actions">
                  <button className="team-primary-button team-send-invites-button label-s-semibold" type="button" disabled={selectedFreelancerIds.length === 0} onClick={sendSelectedInvites}>
                    {selectedFreelancerIds.length > 0 ? `Send ${selectedFreelancerIds.length} ${selectedFreelancerIds.length === 1 ? "invite" : "invites"}` : "Send invites"}
                  </button>
                  <button className="team-secondary-button label-s-semibold" type="button" disabled={selectedFreelancerIds.length !== 1} onClick={assignSelectedFreelancer}>
                    {selectedFreelancerIds.length === 1 && selectedFreelancerIds[0] === currentAssigneeId ? "Unassign" : "Assign"}
                  </button>
                </span>
                <button className="team-invite-email-link label-s-semibold" type="button" onClick={() => setIsEmailInviteOpen((isOpen) => !isOpen)}>
                  + Invite by email
                </button>
              </div>
              {isEmailInviteOpen ? (
                <EmailInviteForm
                  slotId={slot.id}
                  name={newFreelancerName}
                  email={newFreelancerEmail}
                  rate={newFreelancerRate}
                  message={emailMessage}
                  isEmailTextOpen={isEmailTextOpen}
                  onNameChange={setNewFreelancerName}
                  onEmailChange={setNewFreelancerEmail}
                  onRateChange={setNewFreelancerRate}
                  onMessageChange={setEmailMessage}
                  onToggleEmailText={() => setIsEmailTextOpen((isOpen) => !isOpen)}
                  onSubmit={submitEmailInvite}
                  onCancel={() => setIsEmailInviteOpen(false)}
                />
              ) : null}
            </PersonGroup>
          )}
        </section>

        {historicalInvitations.length > 0 ? <InvitationHistory invitations={historicalInvitations} people={people} /> : null}

        <div className="team-modal-actions">
          <span className="team-modal-action-group">
            <button className="team-primary-button label-s-semibold" type="button" onClick={saveSettings}>
              Save
            </button>
          </span>
        </div>

        {staffPendingConfirmation ? (
          <div className="team-popconfirm" role="alertdialog" aria-label="Confirm staff assignment">
            <p className="label-s-semibold">This will withdraw pending invitations. Continue?</p>
            <div className="team-popconfirm-actions">
              <button className="team-secondary-button label-s-semibold" type="button" onClick={() => setStaffPendingConfirmation(null)}>
                Cancel
              </button>
              <button
                className="team-primary-button label-s-semibold"
                type="button"
                onClick={() => {
                  onAddStaff(staffPendingConfirmation);
                  setSelectedStaffId(null);
                  setStaffPendingConfirmation(null);
                }}
              >
                Continue
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function InvitationEditorList({
  invitations,
  people,
  roleHours,
  showCosts,
  onWithdrawInvitation,
}: {
  invitations: Invitation[];
  people: TeamPerson[];
  roleHours: number;
  showCosts: boolean;
  onWithdrawInvitation: (invitationId: string) => void;
}) {
  return (
    <div className="team-invitation-list">
      <div className="team-invitation-heading label-s-semibold">Invited ({invitations.length}):</div>
      {invitations.map((invitation) => {
        const person = people.find((teamPerson) => teamPerson.id === invitation.personId);
        const rate = getInvitationRate(invitation);

        return person ? (
          <p className="team-invitation-line label-s" key={invitation.id}>
            <span className="team-invitation-person label-s-semibold">{person.name}</span>
            {showCosts && rate ? <span>{formatCurrency(rate * roleHours)}</span> : null}
            <span>{formatInvitationStatus(invitation.status)}</span>
            <span>{formatSentTime(invitation.sentAt)}</span>
            <button className="team-inline-action label-s-semibold" type="button" onClick={() => onWithdrawInvitation(invitation.id)}>
              Withdraw
            </button>
          </p>
        ) : null;
      })}
    </div>
  );
}

function EmailInviteForm({
  slotId,
  name,
  email,
  rate,
  message,
  isEmailTextOpen,
  onNameChange,
  onEmailChange,
  onRateChange,
  onMessageChange,
  onToggleEmailText,
  onSubmit,
  onCancel,
}: {
  slotId: string;
  name: string;
  email: string;
  rate: string;
  message: string;
  isEmailTextOpen: boolean;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onRateChange: (value: string) => void;
  onMessageChange: (value: string) => void;
  onToggleEmailText: () => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <form
      className="team-invite-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label className="label-xs-semibold" htmlFor={`invite-name-${slotId}`}>
        Name
      </label>
      <input className="team-inline-input label-s" id={`invite-name-${slotId}`} placeholder="Freelancer name" value={name} onChange={(event) => onNameChange(event.target.value)} />
      <label className="label-xs-semibold" htmlFor={`invite-email-${slotId}`}>
        Email
      </label>
      <input className="team-inline-input label-s" id={`invite-email-${slotId}`} placeholder="name@example.com" type="email" value={email} onChange={(event) => onEmailChange(event.target.value)} />
      <label className="label-xs-semibold" htmlFor={`invite-rate-${slotId}`}>
        Rate
      </label>
      <input className="team-inline-input label-s" id={`invite-rate-${slotId}`} min="0" step="1" type="number" value={rate} onChange={(event) => onRateChange(event.target.value)} />
      <button className="team-invite-email-link label-s-semibold" type="button" onClick={onToggleEmailText}>
        Edit email text
      </button>
      {isEmailTextOpen ? (
        <div className="team-email-popover" role="dialog" aria-label="Edit email text">
          <label className="label-xs-semibold" htmlFor={`invite-message-${slotId}`}>
            Email text
          </label>
          <textarea className="team-email-textarea label-s" id={`invite-message-${slotId}`} value={message} onChange={(event) => onMessageChange(event.target.value)} />
        </div>
      ) : null}
      <div className="team-modal-actions">
        <button className="team-secondary-button label-s-semibold" type="button" onClick={onCancel}>
          Cancel
        </button>
        <button className="team-primary-button label-s-semibold" type="submit">
          Send invite
        </button>
      </div>
    </form>
  );
}

function PersonGroup({ title, meta, children }: { title?: string; meta?: string; children: ReactNode }) {
  return (
    <div className="team-person-group">
      {title || meta ? (
        <div className="team-person-group-heading">
          {title ? <h3 className="team-person-group-title label-xs-semibold">{title}</h3> : <span aria-hidden="true" />}
          {meta ? <span className="label-xs">{meta}</span> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

function StaffOption({
  person,
  disabledReason,
  isSelected,
  onSelect,
}: {
  person: TeamPerson;
  disabledReason?: string;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <div className={`team-person-option ${disabledReason ? "disabled" : ""}`}>
      <label className="team-freelancer-select">
        <input type="checkbox" checked={isSelected} disabled={Boolean(disabledReason)} onChange={onSelect} />
        <span className="team-checkbox-visual" aria-hidden="true" />
      </label>
      <span className="team-person-option-copy">
        <span className="team-role-person-name label-s">{person.name}</span>
        <span className="team-role-rate label-xs">
          {teamRoleLabels[person.defaultRole]} · {person.bookedHoursThisWeek}/{person.weeklyCapacityHours}hrs
        </span>
        {disabledReason ? <span className="team-person-disabled label-xs">Already on project</span> : null}
      </span>
    </div>
  );
}

function FreelancerOption({
  person,
  roleHours,
  projectDisabledReason,
  isAlreadyInvited,
  isSelected,
  isSelectionDisabled,
  onSelect,
}: {
  person: TeamPerson;
  roleHours: number;
  projectDisabledReason?: string;
  isAlreadyInvited: boolean;
  isSelected: boolean;
  isSelectionDisabled: boolean;
  onSelect: () => void;
}) {
  const rate = person.hourlyRate ?? 0;
  const isDisabled = Boolean(projectDisabledReason) || isAlreadyInvited;

  return (
    <div className={`team-person-option ${isDisabled ? "disabled" : ""}`}>
      <label className="team-freelancer-select">
        <input type="checkbox" checked={isSelected} disabled={isSelectionDisabled} onChange={onSelect} />
        <span className="team-checkbox-visual" aria-hidden="true" />
      </label>
      <span className="team-person-option-copy">
        <span className="team-role-person-name label-s">{person.name}</span>
        <span className="team-role-rate label-xs">
          {teamRoleLabels[person.defaultRole]} · ${rate}/hr · {formatCurrency(rate * roleHours)}
        </span>
        {projectDisabledReason ? <span className="team-person-disabled label-xs">Already on project</span> : null}
        {isAlreadyInvited ? <span className="team-person-disabled label-xs">Already invited</span> : null}
      </span>
    </div>
  );
}

function InvitationHistory({ invitations, people }: { invitations: Invitation[]; people: TeamPerson[] }) {
  return (
    <div className="team-invitation-history">
      <div className="team-invitation-heading label-xs-semibold">Invitation history</div>
      {invitations.map((invitation) => {
        const person = people.find((teamPerson) => teamPerson.id === invitation.personId);

        return (
          <div className="team-history-item label-xs" key={invitation.id}>
            <span>{person?.name ?? "Unknown person"}</span>
            <span>{formatInvitationStatus(invitation.status)}</span>
            {invitation.declinedReason === "role_filled" ? <span>Role filled</span> : null}
          </div>
        );
      })}
    </div>
  );
}

function getStaffDisabledReason(slot: RoleSlot, person: TeamPerson, assignedPersonIds: Set<string>) {
  const acceptedInvitation = getAcceptedInvitation(slot);

  if (acceptedInvitation?.personId === person.id) {
    return undefined;
  }

  if (assignedPersonIds.has(person.id)) {
    return "Already on this project";
  }

  return undefined;
}

function getFreelancerProjectDisabledReason(slot: RoleSlot, person: TeamPerson, assignedPersonIds: Set<string>) {
  const acceptedInvitation = getAcceptedInvitation(slot);

  if (acceptedInvitation?.personId === person.id) {
    return undefined;
  }

  if (assignedPersonIds.has(person.id)) {
    return "Already on this project";
  }

  return undefined;
}

function isFreelancerAlreadyInvited(slot: RoleSlot, person: TeamPerson) {
  return getVisibleInvitations(slot).some((invitation) => invitation.personId === person.id);
}

function formatInvitationStatus(status: Invitation["status"]) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatSentTime(sentAt: string) {
  const teamReferenceDate = new Date("2026-06-25T09:00:00+10:00");
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

function formatInvitationCount(count: number) {
  return `${count} invited`;
}

function getDefaultEmailMessage(roleLabel: string, roleHours: number) {
  return `Hi, we would like to invite you to fill the ${roleLabel} role on this Brisk project. The role is estimated at ${formatHours(roleHours)}. Please reply in Brisk if you are available.`;
}
