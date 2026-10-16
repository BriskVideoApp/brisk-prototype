"use client";

import { EditingDialog } from "../../../../Brisk DS/src/app/components/EditingDialog";

import { Button } from "../../../../Brisk DS/src/app/components/Button";
import { ConfirmationDialog } from "../../../../Brisk DS/src/app/components/ConfirmationDialog";


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
  teamRoleLabels,
} from "@/data/active-videos/teamDefaults";
import type { Invitation, InvitationPaymentTerms, RoleSlot, TeamPerson, TeamRole } from "@/components/active-videos/types";
import { getCapacitySummary } from "@/data/people";
import { FreelancePill, StaffPill } from "./RoleRow";

type RoleEditorModalProps = {
  slot: RoleSlot;
  projectName: string;
  people: TeamPerson[];
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
  onSaveSettings: (hours: number) => void;
  initialPersonId?: string;
  onClose: () => void;
};

export function RoleEditorModal({
  slot,
  projectName,
  people,
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
  initialPersonId,
  onClose,
}: RoleEditorModalProps) {
  const roleLabel = getSlotLabel(slot);
  const acceptedInvitation = getAcceptedInvitation(slot);
  const acceptedPerson = acceptedInvitation ? people.find((person) => person.id === acceptedInvitation.personId) : undefined;
  const currentAssigneeId = acceptedPerson?.id;
  const [draftTotalHours, setDraftTotalHours] = useState(String(getRoleEstimatedHours(slot)));
  const initialPerson = initialPersonId ? people.find((person) => person.id === initialPersonId) : undefined;
  const [activeFillTab, setActiveFillTab] = useState<"team" | "gig">(() => initialPerson?.personType === "Studio Freelancer" || acceptedPerson?.personType === "Studio Freelancer" || getVisibleInvitations(slot).length > 0 ? "gig" : "team");
  const [staffPendingConfirmation, setStaffPendingConfirmation] = useState<TeamPerson | null>(null);
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false);
  const [projectRateOverridesByPersonId, setProjectRateOverridesByPersonId] = useState<Record<string, string>>(() => getInitialProjectRateOverrides(slot));
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(() => initialPerson?.personType === "Studio Staff" ? initialPerson.id : null);
  const [selectedFreelancerIds, setSelectedFreelancerIds] = useState<string[]>(() => initialPerson?.personType === "Studio Freelancer" ? [initialPerson.id] : []);
  const [isInviteConfirmOpen, setIsInviteConfirmOpen] = useState(false);
  const [inviteMessage, setInviteMessage] = useState("");
  const [isAllStaffVisible, setIsAllStaffVisible] = useState(initialPerson?.personType === "Studio Staff");
  const [isAllFreelancersVisible, setIsAllFreelancersVisible] = useState(initialPerson?.personType === "Studio Freelancer");
  const staff = people.filter((person) => person.personType === "Studio Staff");
  const freelancers = people.filter((person) => person.personType === "Studio Freelancer");
  const draftRoleHours = snapToQuarter(Math.max(0, Number.parseFloat(draftTotalHours) || 0));
  const areSettingsDirty = draftRoleHours !== getRoleEstimatedHours(slot);
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

  const addStaff = (person: TeamPerson) => {
    if (areSettingsDirty) onSaveSettings(draftRoleHours);
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
    if (areSettingsDirty) onSaveSettings(draftRoleHours);
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
      if (areSettingsDirty) onSaveSettings(draftRoleHours);
      onAssignFreelancer(person, paymentTerms);
      setSelectedFreelancerIds([]);
    }
  };

  const saveSettings = () => {
    onSaveSettings(draftRoleHours);
  };

  const openNewFreelancerInvite = () => {
    onInviteNewFreelancer();
    onClose();
  };

  return (<> <EditingDialog title={roleLabel} description={<>{acceptedPerson && acceptedInvitation ? (
              <span className="team-modal-current-person team-role-person-name label-s">
                {acceptedPerson.name}
                {acceptedPerson.personType === "Studio Freelancer" ? <FreelancePill /> : <StaffPill />}
                {acceptedPerson.personType === "Studio Freelancer" && acceptedInvitation.assignmentMethod === "direct" ? <span className="team-assigned-indicator label-xs-semibold">Assigned</span> : null}
              </span>
            ) : null}</>} size="wide" onCancel={onClose} actions={<><Button size="S" variant="danger" onClick={() => setIsRemoveConfirmOpen(true)}>Remove role</Button><Button size="S" variant="secondary" onClick={onClose}>Cancel</Button></>}>  <section className="team-role-settings" aria-label="Role settings">
          <label className="team-role-hours-field label-xs-semibold" htmlFor={`role-hours-${slot.id}`}>Total hours needed</label>
          <input
            className="team-inline-input team-hours-needed-input label-s"
            id={`role-hours-${slot.id}`}
            aria-label={`Total hours needed for ${roleLabel}`}
            inputMode="decimal"
            min="0"
            step="0.25"
            type="number"
            value={draftTotalHours}
            onChange={(event) => setDraftTotalHours(event.target.value)}
          />
          {areSettingsDirty ? <Button size="S" variant="secondary" className="team-secondary-button team-role-save" type="button" onClick={saveSettings}>Save changes</Button> : null}
        </section>  {!acceptedPerson && !acceptedInvitation && activeInvitations.length > 0 ? (
          <section className="team-editor-section">
            <InvitationEditorList invitations={activeInvitations} people={people} roleHours={draftRoleHours} showCosts={showCosts} onWithdrawInvitation={onWithdrawInvitation} />
            <Button size="S" variant="ghost" className="team-inline-action" type="button" onClick={onWithdrawAll}>
              Withdraw all
            </Button>
          </section>
        ) : null}  <section className="team-editor-section">
          <div className="team-person-group-heading">
            <h3 className="team-assign-heading headings-2xs-bold">Assign a person</h3>
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
                <Button size="S" variant="ghost" className="team-show-all-button" type="button" onClick={() => setIsAllStaffVisible((isVisible) => !isVisible)}>
                  {isAllStaffVisible ? "Show suggested" : `Show all ${staff.length}`}
                </Button>
              ) : null}
              {selectedStaffId ? <div className="team-fill-actions team-fill-actions-staff">
                <Button size="S" variant="primary" className="team-primary-button team-assign-button" type="button" disabled={!selectedStaffId} onClick={assignSelectedStaff}>
                  {selectedStaffId === currentAssigneeId ? "Unassign" : "Assign"}
                </Button>
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
                <Button size="S" variant="ghost" className="team-show-all-button" type="button" onClick={() => setIsAllFreelancersVisible((isVisible) => !isVisible)}>
                  {isAllFreelancersVisible ? "Show suggested" : `Show all ${freelancers.length}`}
                </Button>
              ) : null}
              <div className="team-fill-actions">
                {selectedFreelancerIds.length > 0 ? <span className="team-fill-primary-actions">
                  <Button size="S" variant="secondary" className="team-secondary-button team-send-invites-button" type="button" disabled={selectedFreelancerIds.length === 0 || !selectedFreelancersHaveValidRates} onClick={openInviteConfirmation}>
                    {selectedFreelancerIds.length > 1 ? `Invite ${selectedFreelancerIds.length}` : "Invite"}
                  </Button>
                  <Button size="S" variant="primary" className="team-primary-button team-assign-button" type="button" disabled={selectedFreelancerIds.length !== 1 || !selectedFreelancersHaveValidRates} onClick={assignSelectedFreelancer}>
                    {selectedFreelancerIds.length === 1 && selectedFreelancerIds[0] === currentAssigneeId ? "Unassign" : "Assign now"}
                  </Button>
                </span> : null}
                <Button size="S" variant="ghost" className="team-invite-email-link" type="button" onClick={openNewFreelancerInvite}>
                  + Invite new freelancer
                </Button>
              </div>
            </PersonGroup>
          )}
        </section>  {historicalInvitations.length > 0 ? <InvitationHistory invitations={historicalInvitations} people={people} /> : null}  {staffPendingConfirmation ? (
          <ConfirmationDialog title={<>This will withdraw pending invitations. Continue?</>} onCancel={() => setStaffPendingConfirmation(null)} onConfirm={() => {
                  onAddStaff(staffPendingConfirmation);
                  setSelectedStaffId(null);
                  setStaffPendingConfirmation(null);
                }} confirmLabel={<>Continue
              </>}  />
        ) : null} {isRemoveConfirmOpen ? (
                <ConfirmationDialog title={<>Remove this role?</>} description={<>Assignments and invitations for this role will be removed from the project.</>} onCancel={() => setIsRemoveConfirmOpen(false)} onConfirm={() => {
                        onRemove();
                        onClose();
                      }} confirmLabel={<>Remove
                    </>} tone="danger" />
              ) : null}</EditingDialog>  {isInviteConfirmOpen && typeof document !== "undefined" ? <ConfirmationDialog title={<>Send  {selectedFreelancers.length === 1 ? "invite" : "invites"} ?</>} description={<>To:  {selectedFreelancers.map((person) => person.name).join(", ")}</>} expanded onCancel={() => setIsInviteConfirmOpen(false)} actions={<>
              <Button size="S" variant="secondary"  type="button" onClick={() => setIsInviteConfirmOpen(false)}>Cancel</Button>
              <Button size="S" variant="primary"  type="button" disabled={!inviteMessage.trim()} onClick={sendSelectedInvites}>{selectedFreelancers.length === 1 ? "Send invite" : `Send ${selectedFreelancers.length} invites`}</Button>
            </>}>   <div className="share-send-message">
              <label className="label-s-semibold" htmlFor="freelancer-invite-message">Message</label>
              <textarea className="label-s" id="freelancer-invite-message" rows={4} maxLength={240} value={inviteMessage} onChange={(event) => setInviteMessage(event.target.value)} />
            </div>  </ConfirmationDialog> : null} </>);
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
            <Button size="S" variant="ghost" className="team-inline-action" type="button" onClick={() => onWithdrawInvitation(invitation.id)}>
              Withdraw
            </Button>
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
          <span className={`team-capacity-status is-${capacity.level}`} role="img" tabIndex={0} aria-label={`Capacity: ${capacity.label}`} title={capacity.label}><span aria-hidden="true" /></span>
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
