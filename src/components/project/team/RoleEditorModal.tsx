"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { DsIcon } from "@/components/video-review/DsIcon";
import {
  getAcceptedInvitation,
  getInvitationCost,
  getRoleEstimatedHours,
  getSlotLabel,
  getVisibleInvitations,
  snapToQuarter,
  stageLabels,
  teamRoleLabels,
} from "@/data/active-videos/teamDefaults";
import type { Invitation, InvitationPaymentBasis, InvitationPaymentTerms, RoleSlot, StageKey, TeamPerson } from "@/components/active-videos/types";
import { getCapacitySummary } from "@/data/people";
import { FreelancePill, StaffPill } from "./RoleRow";

type RoleEditorModalProps = {
  slot: RoleSlot;
  people: TeamPerson[];
  stages: StageKey[];
  assignedPersonIds: Set<string>;
  showCosts: boolean;
  onAddStaff: (person: TeamPerson) => void;
  onInviteFreelancer: (person: TeamPerson, paymentTerms: InvitationPaymentTerms) => void;
  onAssignFreelancer: (person: TeamPerson, paymentTerms: InvitationPaymentTerms) => void;
  onUnassign: () => void;
  onInviteNewFreelancer: (paymentTerms: InvitationPaymentTerms) => void;
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
  onInviteNewFreelancer,
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
  const [paymentBasis, setPaymentBasis] = useState<InvitationPaymentBasis>(() => activeInvitationPaymentBasis(slot));
  const [flatRate, setFlatRate] = useState(() => activeInvitationFlatRate(slot));
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedFreelancerIds, setSelectedFreelancerIds] = useState<string[]>([]);
  const staff = people.filter((person) => person.personType === "Studio Staff");
  const freelancers = people.filter((person) => person.personType === "Studio Freelancer");
  const draftRoleHours = snapToQuarter(Number.parseFloat(draftHours) || 0);
  const activeInvitations = getVisibleInvitations(slot);
  const historicalInvitations = slot.invitations.filter((invitation) => invitation.status === "withdrawn" || invitation.status === "declined" || invitation.status === "expired");
  const selectedStageSummary = selectedStages.map((stage) => stageLabels[stage]).join(", ") || "No stages selected";
  const parsedFlatRate = Number.parseFloat(flatRate);
  const hasValidPaymentTerms = paymentBasis === "hourly" || (Number.isFinite(parsedFlatRate) && parsedFlatRate > 0);
  const paymentTerms: InvitationPaymentTerms = paymentBasis === "flat" ? { basis: "flat", flatRate: parsedFlatRate } : { basis: "hourly" };

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
      .forEach((person) => onInviteFreelancer(person, paymentTerms));
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
      onAssignFreelancer(person, paymentTerms);
      setSelectedFreelancerIds([]);
    }
  };

  const saveSettings = () => {
    onSaveSettings(snapToQuarter(Number.parseFloat(draftHours) || 0), selectedStages);
  };

  const openNewFreelancerInvite = () => {
    if (!hasValidPaymentTerms) return;
    onInviteNewFreelancer(paymentTerms);
    onClose();
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
              <span className="team-setting-hint label-xs">Predicted hours drive Studio Staff capacity.</span>
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
                Studio Staff
              </button>
              <button className={`team-segment ${activeFillTab === "gig" ? "active" : ""} label-s-semibold`} type="button" role="tab" aria-selected={activeFillTab === "gig"} onClick={() => setActiveFillTab("gig")}>
                Studio Freelancer
              </button>
            </div>
          </div>

          {activeFillTab === "team" ? (
            <PersonGroup>
              {staff.map((person) => {
                const disabledReason = getStaffDisabledReason(slot, person, assignedPersonIds);
                const isSelected = selectedStaffId === person.id;

                return <StaffOption key={person.id} person={person} roleHours={draftRoleHours} isCurrentAssignee={person.id === currentAssigneeId} disabledReason={disabledReason} isSelected={isSelected} onSelect={() => toggleStaffSelection(person)} />;
              })}
              <div className="team-fill-actions">
                <button className="team-secondary-button label-s-semibold" type="button" disabled={!selectedStaffId} onClick={assignSelectedStaff}>
                  {selectedStaffId === currentAssigneeId ? "Unassign" : "Assign"}
                </button>
              </div>
            </PersonGroup>
          ) : (
            <PersonGroup meta={formatInvitationCount(activeInvitations.length)}>
              <PaymentBasisControl
                basis={paymentBasis}
                flatRate={flatRate}
                onBasisChange={setPaymentBasis}
                onFlatRateChange={setFlatRate}
              />
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
                    paymentBasis={paymentBasis}
                    flatRate={parsedFlatRate}
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
                  <button className="team-primary-button team-send-invites-button label-s-semibold" type="button" disabled={selectedFreelancerIds.length === 0 || !hasValidPaymentTerms} onClick={sendSelectedInvites}>
                    {selectedFreelancerIds.length > 0 ? `Send ${selectedFreelancerIds.length} ${selectedFreelancerIds.length === 1 ? "invite" : "invites"}` : "Send invites"}
                  </button>
                  <button className="team-secondary-button label-s-semibold" type="button" disabled={selectedFreelancerIds.length !== 1 || !hasValidPaymentTerms} onClick={assignSelectedFreelancer}>
                    {selectedFreelancerIds.length === 1 && selectedFreelancerIds[0] === currentAssigneeId ? "Unassign" : "Assign"}
                  </button>
                </span>
                <button className="team-invite-email-link label-s-semibold" type="button" disabled={!hasValidPaymentTerms} onClick={openNewFreelancerInvite}>
                  + Invite new Studio Freelancer
                </button>
              </div>
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
        const cost = getInvitationCost(invitation, roleHours);

        return person ? (
          <p className="team-invitation-line label-s" key={invitation.id}>
            <span className="team-invitation-person label-s-semibold">{person.name}</span>
            {showCosts && typeof cost === "number" ? <span>{invitation.paymentBasis === "flat" ? `Project rate ${formatCurrency(cost)}` : formatCurrency(cost)}</span> : null}
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

function PaymentBasisControl({
  basis,
  flatRate,
  onBasisChange,
  onFlatRateChange,
}: {
  basis: InvitationPaymentBasis;
  flatRate: string;
  onBasisChange: (basis: InvitationPaymentBasis) => void;
  onFlatRateChange: (value: string) => void;
}) {
  return (
    <div className="team-payment-basis">
      <div className="team-person-group-heading">
        <span className="label-xs-semibold">Payment basis</span>
        <span className="label-xs">Hours remain available for workload planning.</span>
      </div>
      <div className="team-payment-basis-fields">
        <div className="team-segmented-control" role="group" aria-label="Studio Freelancer payment basis">
          <button className={`team-segment ${basis === "hourly" ? "active" : ""} label-s-semibold`} type="button" aria-pressed={basis === "hourly"} onClick={() => onBasisChange("hourly")}>
            Hourly
          </button>
          <button className={`team-segment ${basis === "flat" ? "active" : ""} label-s-semibold`} type="button" aria-pressed={basis === "flat"} onClick={() => onBasisChange("flat")}>
            Project rate
          </button>
        </div>
        {basis === "flat" ? (
          <label className="team-flat-rate-field label-xs-semibold" htmlFor="team-flat-rate">
            Project rate
            <span className="team-money-input">
              <span aria-hidden="true">$</span>
              <input className="team-inline-input label-s" id="team-flat-rate" min="1" inputMode="decimal" step="1" type="number" value={flatRate} onChange={(event) => onFlatRateChange(event.target.value)} />
            </span>
          </label>
        ) : null}
      </div>
    </div>
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
  roleHours,
  isCurrentAssignee,
  disabledReason,
  isSelected,
  onSelect,
}: {
  person: TeamPerson;
  roleHours: number;
  isCurrentAssignee: boolean;
  disabledReason?: string;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const capacity = getCapacitySummary(person.bookedHoursThisWeek, person.weeklyCapacityHours, isCurrentAssignee ? 0 : roleHours);

  return (
    <div className={`team-person-option team-staff-option is-capacity-${capacity.level} ${disabledReason ? "disabled" : ""}`}>
      <label className="team-freelancer-select">
        <input type="checkbox" checked={isSelected} disabled={Boolean(disabledReason)} onChange={onSelect} />
        <span className="team-checkbox-visual" aria-hidden="true" />
      </label>
      <span className="team-person-option-copy">
        <span className="team-role-person-name label-s">{person.name}</span>
        <span className="team-role-rate label-xs">
          {teamRoleLabels[person.defaultRole]} · {capacity.availableHours}h available · {capacity.projectedHours}/{person.weeklyCapacityHours}h {isCurrentAssignee ? "booked" : "after assignment"}
        </span>
        <span className={`team-capacity-status is-${capacity.level} label-xs-semibold`}><span aria-hidden="true" />{capacity.label}</span>
        {capacity.level === "full" ? <span className="team-capacity-warning label-xs">User is at capacity. Consider inviting a Studio Freelancer.</span> : null}
        {disabledReason ? <span className="team-person-disabled label-xs">{disabledReason}</span> : null}
      </span>
    </div>
  );
}

function FreelancerOption({
  person,
  roleHours,
  paymentBasis,
  flatRate,
  projectDisabledReason,
  isAlreadyInvited,
  isSelected,
  isSelectionDisabled,
  onSelect,
}: {
  person: TeamPerson;
  roleHours: number;
  paymentBasis: InvitationPaymentBasis;
  flatRate: number;
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
          {paymentBasis === "flat"
            ? `${teamRoleLabels[person.defaultRole]} · Project rate · ${Number.isFinite(flatRate) && flatRate > 0 ? formatCurrency(flatRate) : "Set an amount"}`
            : rate > 0
              ? `${teamRoleLabels[person.defaultRole]} · $${rate}/hr · ${formatCurrency(rate * roleHours)}`
              : `${teamRoleLabels[person.defaultRole]} · Rate not set`}
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

function activeInvitationPaymentBasis(slot: RoleSlot): InvitationPaymentBasis {
  return getVisibleInvitations(slot).find((invitation) => invitation.paymentBasis === "flat") ? "flat" : "hourly";
}

function activeInvitationFlatRate(slot: RoleSlot) {
  const flatRate = getVisibleInvitations(slot).find((invitation) => invitation.paymentBasis === "flat")?.flatRateSnapshot;
  return typeof flatRate === "number" ? String(flatRate) : "";
}
