"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { DsIcon } from "@/components/video-review/DsIcon";
import {
  getAcceptedInvitation,
  getInvitationCost,
  getRoleEstimatedHours,
  getSlotLabel,
  getVisibleInvitations,
  formatHours,
  snapToQuarter,
  stageLabels,
  teamRoleLabels,
} from "@/data/active-videos/teamDefaults";
import type { Invitation, InvitationPaymentTerms, RoleSlot, StageAssignment, StageKey, TeamPerson, TeamRole } from "@/components/active-videos/types";
import { getCapacitySummary } from "@/data/people";
import { FreelancePill, StaffPill } from "./RoleRow";

type RoleEditorModalProps = {
  slot: RoleSlot;
  projectName: string;
  people: TeamPerson[];
  stages: StageKey[];
  assignedPersonIds: Set<string>;
  showCosts: boolean;
  onAddStaff: (person: TeamPerson) => void;
  onInviteFreelancer: (person: TeamPerson, paymentTerms: InvitationPaymentTerms, message: string) => void;
  onAssignFreelancer: (person: TeamPerson, paymentTerms: InvitationPaymentTerms) => void;
  onUnassign: () => void;
  onInviteNewFreelancer: () => void;
  onWithdrawInvitation: (invitationId: string) => void;
  onWithdrawAll: () => void;
  onRemove: () => void;
  onSaveSettings: (stages: StageAssignment[]) => void;
  onClose: () => void;
};

export function RoleEditorModal({
  slot,
  projectName,
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
  const acceptedInvitation = getAcceptedInvitation(slot);
  const acceptedPerson = acceptedInvitation ? people.find((person) => person.id === acceptedInvitation.personId) : undefined;
  const currentAssigneeId = acceptedPerson?.id;
  const [selectedStages, setSelectedStages] = useState<StageKey[]>(slot.stages.map((stageAssignment) => stageAssignment.stageId));
  const [draftHoursByStage, setDraftHoursByStage] = useState<Partial<Record<StageKey, string>>>(() =>
    Object.fromEntries(slot.stages.map((stage) => [stage.stageId, String(stage.estimatedHours)])),
  );
  const [isStagesExpanded, setIsStagesExpanded] = useState(false);
  const [activeFillTab, setActiveFillTab] = useState<"team" | "gig">(() => (acceptedPerson?.personType === "Studio Freelancer" || getVisibleInvitations(slot).length > 0 ? "gig" : "team"));
  const [staffPendingConfirmation, setStaffPendingConfirmation] = useState<TeamPerson | null>(null);
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false);
  const [projectRateOverridesByPersonId, setProjectRateOverridesByPersonId] = useState<Record<string, string>>(() => getInitialProjectRateOverrides(slot));
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedFreelancerIds, setSelectedFreelancerIds] = useState<string[]>([]);
  const [isInviteConfirmOpen, setIsInviteConfirmOpen] = useState(false);
  const [inviteMessage, setInviteMessage] = useState("");
  const [isAllStaffVisible, setIsAllStaffVisible] = useState(false);
  const [isAllFreelancersVisible, setIsAllFreelancersVisible] = useState(false);
  const staff = people.filter((person) => person.personType === "Studio Staff");
  const freelancers = people.filter((person) => person.personType === "Studio Freelancer");
  const draftRoleHours = selectedStages.reduce((total, stage) => total + snapToQuarter(Math.max(0, Number.parseFloat(draftHoursByStage[stage] ?? "") || 0)), 0);
  const availableStages = stages.filter((stage) => !selectedStages.includes(stage));
  const areSettingsDirty = selectedStages.length !== slot.stages.length || selectedStages.some((stage) => {
    const savedStage = slot.stages.find((assignment) => assignment.stageId === stage);
    return !savedStage || snapToQuarter(Math.max(0, Number.parseFloat(draftHoursByStage[stage] ?? "") || 0)) !== savedStage.estimatedHours;
  });
  const activeInvitations = getVisibleInvitations(slot);
  const historicalInvitations = slot.invitations.filter((invitation) => invitation.status === "withdrawn" || invitation.status === "declined" || invitation.status === "expired");
  const selectedFreelancersHaveValidRates = selectedFreelancerIds.every((personId) => {
    const person = freelancers.find((candidate) => candidate.id === personId);
    const projectRate = person ? Number.parseFloat(getProjectRateValue(slot, person, draftRoleHours, projectRateOverridesByPersonId)) : Number.NaN;
    const hourlyRate = person ? getProjectHourlyRate(slot, person) : undefined;
    return typeof hourlyRate === "number" && hourlyRate > 0 && Number.isFinite(projectRate) && projectRate > 0;
  });
  const suggestedStaff = getSuggestedPeople(
    staff,
    slot.role,
    currentAssigneeId,
    (person) => Boolean(getStaffDisabledReason(slot, person, assignedPersonIds)),
  );
  const visibleStaff = isAllStaffVisible ? staff : suggestedStaff;
  const suggestedFreelancers = getSuggestedPeople(
    freelancers,
    slot.role,
    currentAssigneeId,
    (person) => Boolean(getFreelancerProjectDisabledReason(slot, person, assignedPersonIds)) || isFreelancerAlreadyInvited(slot, person),
  );
  const visibleFreelancers = isAllFreelancersVisible ? freelancers : suggestedFreelancers;

  useEffect(() => {
    setProjectRateOverridesByPersonId((currentRates) => {
      const emptyPersonIds = Object.keys(currentRates).filter((personId) => !currentRates[personId]?.trim());
      if (emptyPersonIds.length === 0) return currentRates;
      const nextRates = { ...currentRates };
      emptyPersonIds.forEach((personId) => delete nextRates[personId]);
      return nextRates;
    });
  }, [draftRoleHours]);

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
    setIsStagesExpanded(false);
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

  const selectedFreelancers = selectedFreelancerIds
    .map((personId) => freelancers.find((person) => person.id === personId))
    .filter((person): person is TeamPerson => Boolean(person));

  const openInviteConfirmation = () => {
    if (selectedFreelancers.length === 0 || !selectedFreelancersHaveValidRates) return;
    setInviteMessage(`Please review the Brief for ${projectName} and let us know if you can take on the ${roleLabel} role.`);
    setIsInviteConfirmOpen(true);
  };

  const sendSelectedInvites = () => {
    const message = inviteMessage.trim();
    if (!message || selectedFreelancers.length === 0 || !selectedFreelancersHaveValidRates) return;
    selectedFreelancerIds
      .map((personId) => freelancers.find((person) => person.id === personId))
      .filter((person): person is TeamPerson => Boolean(person))
      .forEach((person) => {
        const paymentTerms = getPersonPaymentTerms(
          getProjectHourlyRate(slot, person),
          getProjectRateValue(slot, person, draftRoleHours, projectRateOverridesByPersonId),
        );
        if (paymentTerms) onInviteFreelancer(person, paymentTerms, message);
      });
    setSelectedFreelancerIds([]);
    setIsInviteConfirmOpen(false);
  };

  const assignSelectedFreelancer = () => {
    const person = selectedFreelancerIds.length === 1 ? freelancers.find((teamPerson) => teamPerson.id === selectedFreelancerIds[0]) : undefined;

    if (person && person.id === currentAssigneeId) {
      onUnassign();
      setSelectedFreelancerIds([]);
      return;
    }

    if (person) {
      const paymentTerms = getPersonPaymentTerms(
        getProjectHourlyRate(slot, person),
        getProjectRateValue(slot, person, draftRoleHours, projectRateOverridesByPersonId),
      );
      if (!paymentTerms) return;
      onAssignFreelancer(person, paymentTerms);
      setSelectedFreelancerIds([]);
    }
  };

  const saveSettings = () => {
    onSaveSettings(selectedStages.map((stageId) => {
      const estimatedHours = snapToQuarter(Math.max(0, Number.parseFloat(draftHoursByStage[stageId] ?? "") || 0));
      return { stageId, estimatedHours, manualEstimate: estimatedHours > 0 };
    }));
  };

  const openNewFreelancerInvite = () => {
    onInviteNewFreelancer();
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
            <span className="label-xs-semibold">Stages &amp; hours</span>
            {availableStages.length > 0 ? <button className="team-inline-action label-s-semibold" type="button" aria-expanded={isStagesExpanded} onClick={() => setIsStagesExpanded((isExpanded) => !isExpanded)}>
              Add stage
            </button> : null}
          </div>
          <div className="team-stage-hours-list">
            {selectedStages.map((stage) => <div className="team-stage-hours-row" key={stage}>
                <button className="team-stage-hours-remove" type="button" aria-label={`Remove ${stageLabels[stage]} stage`} onClick={() => toggleStage(stage)}><span className="team-checkbox checked" aria-hidden="true">✓</span></button>
                <label className="label-s" htmlFor={`role-hours-${slot.id}-${stage}`}>{stageLabels[stage]}</label>
                <input
                  className="team-inline-input team-hours-needed-input label-s"
                  id={`role-hours-${slot.id}-${stage}`}
                  aria-label={`${stageLabels[stage]} hours needed`}
                  inputMode="decimal"
                  min="0"
                  step="0.25"
                  type="number"
                  value={draftHoursByStage[stage] ?? "0"}
                  onChange={(event) => setDraftHoursByStage((currentHours) => ({ ...currentHours, [stage]: event.target.value }))}
                />
              </div>)}
            {selectedStages.length > 1 && draftRoleHours > 0 ? <span className="team-stage-hours-total label-xs">Total {formatHours(draftRoleHours)}</span> : null}
          </div>

          {isStagesExpanded ? (
            <div className="team-stage-list compact">
              {availableStages.map((stage) => (
                  <button className="team-stage-option" type="button" key={stage} onClick={() => toggleStage(stage)}>
                    <span className="team-checkbox" aria-hidden="true" />
                    <span className="label-s-semibold">{stageLabels[stage]}</span>
                  </button>
              ))}
            </div>
          ) : null}
          {areSettingsDirty ? <button className="team-secondary-button team-role-save label-s-semibold" type="button" onClick={saveSettings}>Save changes</button> : null}
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
                Staff
              </button>
              <button className={`team-segment ${activeFillTab === "gig" ? "active" : ""} label-s-semibold`} type="button" role="tab" aria-selected={activeFillTab === "gig"} onClick={() => setActiveFillTab("gig")}>
                Freelancers
              </button>
            </div>
          </div>

          {activeFillTab === "team" ? (
            <PersonGroup>
              <div className={`team-person-options ${isAllStaffVisible ? "is-expanded" : ""}`}>
                {visibleStaff.map((person) => {
                  const disabledReason = getStaffDisabledReason(slot, person, assignedPersonIds);
                  const isSelected = selectedStaffId === person.id;

                  return <StaffOption key={person.id} person={person} roleHours={draftRoleHours} isCurrentAssignee={person.id === currentAssigneeId} disabledReason={disabledReason} isSelected={isSelected} onSelect={() => toggleStaffSelection(person)} />;
                })}
              </div>
              {staff.length > suggestedStaff.length ? (
                <button className="team-show-all-button label-s-semibold" type="button" onClick={() => setIsAllStaffVisible((isVisible) => !isVisible)}>
                  {isAllStaffVisible ? "Show suggested" : `Show all ${staff.length}`}
                </button>
              ) : null}
              {selectedStaffId ? <div className="team-fill-actions">
                <button className="team-secondary-button label-s-semibold" type="button" disabled={!selectedStaffId} onClick={assignSelectedStaff}>
                  {selectedStaffId === currentAssigneeId ? "Unassign" : "Assign"}
                </button>
              </div> : null}
            </PersonGroup>
          ) : (
            <PersonGroup>
              <div className={`team-person-options ${isAllFreelancersVisible ? "is-expanded" : ""}`}>
                {visibleFreelancers.map((person) => {
                  const projectDisabledReason = getFreelancerProjectDisabledReason(slot, person, assignedPersonIds);
                  const isAlreadyInvited = isFreelancerAlreadyInvited(slot, person);
                  const isSelected = selectedFreelancerIds.includes(person.id);
                  const isCurrentAssignee = person.id === currentAssigneeId;
                  const isSelectionDisabled = !isCurrentAssignee && (Boolean(projectDisabledReason) || isAlreadyInvited);

                  return (
                    <FreelancerOption
                      key={person.id}
                      person={person}
                      showDefaultRole={person.defaultRole !== slot.role}
                      hourlyRate={getProjectHourlyRate(slot, person)}
                      projectRate={getProjectRateValue(slot, person, draftRoleHours, projectRateOverridesByPersonId)}
                      projectDisabledReason={projectDisabledReason}
                      isAlreadyInvited={isAlreadyInvited}
                      isSelected={isSelected}
                      isSelectionDisabled={isSelectionDisabled}
                      onProjectRateChange={(projectRate) => setProjectRateOverridesByPersonId((currentRates) => ({ ...currentRates, [person.id]: projectRate }))}
                      onProjectRateBlur={() => setProjectRateOverridesByPersonId((currentRates) => {
                        if (currentRates[person.id]?.trim()) return currentRates;
                        const nextRates = { ...currentRates };
                        delete nextRates[person.id];
                        return nextRates;
                      })}
                      onSelect={() => toggleFreelancerSelection(person)}
                    />
                  );
                })}
              </div>
              {freelancers.length > suggestedFreelancers.length ? (
                <button className="team-show-all-button label-s-semibold" type="button" onClick={() => setIsAllFreelancersVisible((isVisible) => !isVisible)}>
                  {isAllFreelancersVisible ? "Show suggested" : `Show all ${freelancers.length}`}
                </button>
              ) : null}
              <div className="team-fill-actions">
                {selectedFreelancerIds.length > 0 ? <span className="team-fill-primary-actions">
                  <button className="team-primary-button team-send-invites-button label-s-semibold" type="button" disabled={selectedFreelancerIds.length === 0 || !selectedFreelancersHaveValidRates} onClick={openInviteConfirmation}>
                    {selectedFreelancerIds.length > 1 ? `Invite ${selectedFreelancerIds.length}` : "Invite"}
                  </button>
                  <button className="team-secondary-button label-s-semibold" type="button" disabled={selectedFreelancerIds.length !== 1 || !selectedFreelancersHaveValidRates} onClick={assignSelectedFreelancer}>
                    {selectedFreelancerIds.length === 1 && selectedFreelancerIds[0] === currentAssigneeId ? "Unassign" : "Assign now"}
                  </button>
                </span> : null}
                <button className="team-invite-email-link label-s-semibold" type="button" onClick={openNewFreelancerInvite}>
                  + Invite new freelancer
                </button>
              </div>
            </PersonGroup>
          )}
        </section>

        {historicalInvitations.length > 0 ? <InvitationHistory invitations={historicalInvitations} people={people} /> : null}

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
      {isInviteConfirmOpen && typeof document !== "undefined" ? createPortal(
        <div className="share-confirm-backdrop" role="presentation" onMouseDown={() => setIsInviteConfirmOpen(false)} onClick={(event) => event.stopPropagation()}>
          <section className="share-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="freelancer-invite-confirm-title" onMouseDown={(event) => event.stopPropagation()}>
            <h2 className="headings-xs-bold" id="freelancer-invite-confirm-title">Send {selectedFreelancers.length === 1 ? "invite" : "invites"}?</h2>
            <p className="paragraph-s">To: {selectedFreelancers.map((person) => person.name).join(", ")}</p>
            <div className="share-send-message">
              <label className="label-s-semibold" htmlFor="freelancer-invite-message">Message</label>
              <textarea className="label-s" id="freelancer-invite-message" rows={4} maxLength={240} value={inviteMessage} onChange={(event) => setInviteMessage(event.target.value)} />
            </div>
            <div className="share-confirm-actions">
              <button className="share-button share-button-secondary label-s-semibold" type="button" onClick={() => setIsInviteConfirmOpen(false)}>Cancel</button>
              <button className="share-button share-button-primary label-s-semibold" type="button" disabled={!inviteMessage.trim()} onClick={sendSelectedInvites}>{selectedFreelancers.length === 1 ? "Send invite" : `Send ${selectedFreelancers.length} invites`}</button>
            </div>
          </section>
        </div>, document.body,
      ) : null}
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
            {showCosts && typeof cost === "number" ? (
              <span>{typeof invitation.projectRateSnapshot === "number" || invitation.paymentBasis === "flat" ? `Project rate ${formatCurrency(cost)}` : formatCurrency(cost)}</span>
            ) : null}
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
        <span className="team-person-option-primary">
          <span className="team-role-person-name label-s">{person.name}</span>
          <span className={`team-capacity-status is-${capacity.level} label-xs-semibold`}><span aria-hidden="true" />{capacity.label}</span>
        </span>
        <span className="team-role-rate label-xs">
          {teamRoleLabels[person.defaultRole]} · {disabledReason ?? `${capacity.availableHours}h available`}
        </span>
      </span>
    </div>
  );
}

function FreelancerOption({
  person,
  showDefaultRole,
  hourlyRate,
  projectRate,
  projectDisabledReason,
  isAlreadyInvited,
  isSelected,
  isSelectionDisabled,
  onProjectRateChange,
  onProjectRateBlur,
  onSelect,
}: {
  person: TeamPerson;
  showDefaultRole: boolean;
  hourlyRate: number | undefined;
  projectRate: string;
  projectDisabledReason?: string;
  isAlreadyInvited: boolean;
  isSelected: boolean;
  isSelectionDisabled: boolean;
  onProjectRateChange: (value: string) => void;
  onProjectRateBlur: () => void;
  onSelect: () => void;
}) {
  const hasValidHourlyRate = typeof hourlyRate === "number" && hourlyRate > 0;
  const isDisabled = Boolean(projectDisabledReason) || isAlreadyInvited;

  return (
    <div className={`team-person-option ${isDisabled ? "disabled" : ""}`}>
      <label className="team-freelancer-select">
        <input type="checkbox" checked={isSelected} disabled={isSelectionDisabled} onChange={onSelect} />
        <span className="team-checkbox-visual" aria-hidden="true" />
      </label>
      <span className="team-person-option-copy">
        <span className="team-person-option-primary">
          <span className="team-role-person-name label-s">{person.name}</span>
          {projectDisabledReason ? <span className="team-person-disabled label-xs">Already on project</span> : null}
          {isAlreadyInvited ? <span className="team-person-disabled label-xs">Already invited</span> : null}
        </span>
        <span className="team-role-rate label-xs">
          {showDefaultRole ? `${teamRoleLabels[person.defaultRole]} · ` : ""}{hasValidHourlyRate ? `${formatHourlyRate(hourlyRate)}/hr` : "Hourly rate not set"}
        </span>
      </span>
      <label className="team-freelancer-project-rate label-xs-semibold">
        <span className="sr-only">Project rate for {person.name}</span>
        <span className="team-money-input">
          <span aria-hidden="true">$</span>
          <input
            className="team-inline-input label-s"
            min="1"
            inputMode="decimal"
            step="1"
            type="number"
            value={projectRate}
            disabled={isSelectionDisabled}
            onChange={(event) => onProjectRateChange(event.target.value)}
            onBlur={onProjectRateBlur}
          />
        </span>
      </label>
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

function getSuggestedPeople(
  people: TeamPerson[],
  role: TeamRole,
  currentAssigneeId: string | undefined,
  isUnavailable: (person: TeamPerson) => boolean,
) {
  return people
    .filter((person) => person.defaultRole === role)
    .sort((left, right) => {
      if (left.id === currentAssigneeId) return -1;
      if (right.id === currentAssigneeId) return 1;
      if (isUnavailable(left) !== isUnavailable(right)) return isUnavailable(left) ? 1 : -1;
      return left.name.localeCompare(right.name, "en-AU");
    });
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

function getInitialProjectRateOverrides(slot: RoleSlot) {
  return Object.fromEntries(slot.invitations
    .filter((invitation) => typeof invitation.projectRateSnapshot === "number")
    .map((invitation) => [invitation.personId, String(invitation.projectRateSnapshot)]));
}

function getProjectHourlyRate(slot: RoleSlot, person: TeamPerson) {
  const invitationRate = [...slot.invitations]
    .reverse()
    .find((invitation) => invitation.personId === person.id && typeof invitation.rateSnapshot === "number")
    ?.rateSnapshot;
  return invitationRate ?? person.hourlyRate;
}

function getProjectRateValue(
  slot: RoleSlot,
  person: TeamPerson,
  roleHours: number,
  overridesByPersonId: Record<string, string>,
) {
  if (Object.prototype.hasOwnProperty.call(overridesByPersonId, person.id)) {
    return overridesByPersonId[person.id] ?? "";
  }

  const hourlyRate = getProjectHourlyRate(slot, person);
  return typeof hourlyRate === "number" && hourlyRate > 0
    ? String(Math.round(hourlyRate * roleHours * 100) / 100)
    : "";
}

function getPersonPaymentTerms(hourlyRate: number | undefined, projectRateValue: string): InvitationPaymentTerms | null {
  const projectRate = Number.parseFloat(projectRateValue);
  return typeof hourlyRate === "number" && hourlyRate > 0 && Number.isFinite(projectRate) && projectRate > 0
    ? { basis: "hourly", hourlyRate, projectRate }
    : null;
}

function formatHourlyRate(hourlyRate: number) {
  return `$${hourlyRate.toLocaleString("en-AU", { maximumFractionDigits: 2 })}`;
}
