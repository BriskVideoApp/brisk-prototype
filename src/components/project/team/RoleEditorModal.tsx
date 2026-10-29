"use client";

import { EditingDialog } from "../../../../Brisk DS/src/app/components/EditingDialog";

import { Button } from "../../../../Brisk DS/src/app/components/Button";
import { ConfirmationDialog } from "../../../../Brisk DS/src/app/components/ConfirmationDialog";
import { Checkbox } from "../../../../Brisk DS/src/app/components/Checkbox";
import { Input } from "../../../../Brisk DS/src/app/components/Input";
import { Tabs } from "../../../../Brisk DS/src/app/components/Tabs";
import { BriskSelect } from "../../../../Brisk DS/src/app/components/Select";


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
import { TeamPersonAvatar } from "./RoleRow";

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
  roles: RoleSlot[];
  onSelectRole: (slotId: string) => void;
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
  roles,
  onSelectRole,
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
  const [query, setQuery] = useState("");
  const [areInvitationsExpanded, setAreInvitationsExpanded] = useState(false);
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
  const isSearching = query.trim().length > 0;
  const matchesQuery = (person: TeamPerson) => `${person.name} ${teamRoleLabels[person.defaultRole]}`.toLocaleLowerCase("en-AU").includes(query.trim().toLocaleLowerCase("en-AU"));
  const visibleStaff = (isAllStaffVisible || suggestedStaff.length === 0 || isSearching ? staff : suggestedStaff).filter(matchesQuery);
  const suggestedFreelancers = getSuggestedPeople(
    freelancers,
    slot.role,
    currentAssigneeId,
    (person) => Boolean(getFreelancerProjectDisabledReason(slot, person, assignedPersonIds)) || isFreelancerAlreadyInvited(slot, person),
  );
  const visibleFreelancers = (isAllFreelancersVisible || suggestedFreelancers.length === 0 || isSearching ? freelancers : suggestedFreelancers).filter(matchesQuery);

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
    if (activeInvitations.length > 0) {
      setStaffPendingConfirmation(person);
      return;
    }

    if (areSettingsDirty) onSaveSettings(draftRoleHours);
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

  const selectedStaff = staff.find((person) => person.id === selectedStaffId);
  const selectionSummary = activeFillTab === "team"
    ? selectedStaff ? `${selectedStaff.name} · ${draftRoleHours}h` : "Select a person"
    : selectedFreelancers.length === 1
      ? `${selectedFreelancers[0].name} · ${formatHourlyRate(Number.parseFloat(getProjectRateValue(slot, selectedFreelancers[0], draftRoleHours, projectRateOverridesByPersonId)) || 0)}`
      : selectedFreelancers.length > 1 ? `${selectedFreelancers.length} selected` : "Select a person";

  return (
    <>
      <EditingDialog
        title="Assign team member"
        description={projectName}
        size="wide"
        onCancel={onClose}
        actions={<>
          <span className="team-assignment-footer-summary label-xs" role="status">{selectionSummary}</span>
          <Button size="S" variant="ghost" onClick={onClose}>Cancel</Button>
          {activeFillTab === "gig" ? <Button
            size="S"
            variant="secondary"
            disabled={selectedFreelancerIds.length === 0 || !selectedFreelancersHaveValidRates || selectedFreelancerIds.includes(currentAssigneeId ?? "")}
            onClick={openInviteConfirmation}
          >
            {selectedFreelancerIds.length > 1 ? `Invite ${selectedFreelancerIds.length}` : "Invite"}
          </Button> : null}
          <Button size="S" disabled={activeFillTab === "team" ? !selectedStaffId : selectedFreelancerIds.length !== 1 || !selectedFreelancersHaveValidRates} onClick={activeFillTab === "team" ? assignSelectedStaff : assignSelectedFreelancer}>
            {(activeFillTab === "team" ? selectedStaffId : selectedFreelancerIds[0]) === currentAssigneeId && currentAssigneeId ? "Unassign" : "Assign"}
          </Button>
        </>}
      >
        <div className="team-assignment-chooser">
          <section className="team-assignment-fields" aria-label="Role settings">
            <div className="team-assignment-role-field">
              <label className="label-m-semibold" htmlFor={`assignment-role-${slot.id}`}>Role</label>
              <BriskSelect
                id={`assignment-role-${slot.id}`}
                ariaLabel="Project role"
                clearable={false}
                value={slot.id}
                placeholder="Choose role"
                options={roles.map((role) => ({ value: role.id, label: getSlotLabel(role) }))}
                onChange={(id) => { if (id) onSelectRole(id); }}
              />
            </div>
            <Input
              size="S"
              label="Required hours"
              id={`role-hours-${slot.id}`}
              aria-label={`Required hours for ${roleLabel}`}
              inputMode="decimal"
              min="0"
              step="0.25"
              type="number"
              value={draftTotalHours}
              onChange={(event) => setDraftTotalHours(event.target.value)}
            />
          </section>
          {acceptedPerson ? <p className="team-assignment-note label-xs">Currently assigned: {acceptedPerson.name} · {acceptedPerson.personType}</p> : null}
          <Tabs
            label="Team source"
            value={activeFillTab}
            options={[{ value: "team", label: "Staff" }, { value: "gig", label: "Freelancers" }]}
            onValueChange={(tab) => { setActiveFillTab(tab); setQuery(""); }}
          >
            <div className="team-assignment-tab-content">
              <Input
                size="S"
                type="search"
                aria-label="Search people"
                placeholder="Search people (optional)"
                iconStart={<DsIcon name="search" size={16} />}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              {activeFillTab === "team" ? <>
                {suggestedStaff.length === 0 && !isSearching ? <p className="team-assignment-note label-xs">No suggested Staff for {roleLabel}. Showing all Staff.</p> : null}
                <div className="team-assignment-list" aria-label="Staff">
                  {visibleStaff.map((person) => <StaffOption
                    key={person.id}
                    person={person}
                    roleHours={draftRoleHours}
                    isCurrentAssignee={person.id === currentAssigneeId}
                    disabledReason={getStaffDisabledReason(slot, person, assignedPersonIds)}
                    isSelected={selectedStaffId === person.id}
                    onSelect={() => toggleStaffSelection(person)}
                  />)}
                </div>
                {visibleStaff.length === 0 ? <p className="team-assignment-note label-s" role="status">{isSearching ? "No matching Staff." : "No Staff available."}</p> : null}
                {!isSearching && suggestedStaff.length > 0 && staff.length > suggestedStaff.length ? <Button
                  size="S"
                  variant="ghost"
                  className="team-assignment-list-toggle"
                  onClick={() => setIsAllStaffVisible((visible) => !visible)}
                >{isAllStaffVisible ? "Show suggested" : `Show all ${staff.length}`}</Button> : null}
              </> : <>
                {suggestedFreelancers.length === 0 && !isSearching ? <p className="team-assignment-note label-xs">No suggested Freelancers for {roleLabel}. Showing all Freelancers.</p> : null}
                {showCosts ? <div className="team-assignment-list-heading label-xs"><span>Freelancer</span><span>Project rate ($)</span></div> : null}
                <div className="team-assignment-list" aria-label="Freelancers">
                  {visibleFreelancers.map((person) => {
                    const projectDisabledReason = getFreelancerProjectDisabledReason(slot, person, assignedPersonIds);
                    const isAlreadyInvited = isFreelancerAlreadyInvited(slot, person);
                    const existingInvitation = activeInvitations.find((invitation) => invitation.personId === person.id);
                    const invitedRate = existingInvitation ? getInvitationCost(existingInvitation, getRoleEstimatedHours(slot)) : undefined;
                    const isSelectionDisabled = person.id !== currentAssigneeId && (Boolean(projectDisabledReason) || isAlreadyInvited);
                    return <FreelancerOption
                      key={person.id}
                      person={person}
                      showDefaultRole={person.defaultRole !== slot.role}
                      hourlyRate={getProjectHourlyRate(slot, person)}
                      projectRate={typeof invitedRate === "number" ? String(invitedRate) : getProjectRateValue(slot, person, draftRoleHours, projectRateOverridesByPersonId)}
                      projectDisabledReason={projectDisabledReason}
                      isAlreadyInvited={isAlreadyInvited}
                      isSelected={selectedFreelancerIds.includes(person.id)}
                      isSelectionDisabled={isSelectionDisabled}
                      showCosts={showCosts}
                      rateMode={isAlreadyInvited ? "Invited project rate" : Object.prototype.hasOwnProperty.call(projectRateOverridesByPersonId, person.id) ? "Custom project rate" : `Calculated · ${draftRoleHours}h`}
                      onProjectRateChange={(rate) => setProjectRateOverridesByPersonId((current) => ({ ...current, [person.id]: rate }))}
                      onProjectRateBlur={() => setProjectRateOverridesByPersonId((current) => {
                        if (current[person.id]?.trim()) return current;
                        const next = { ...current }; delete next[person.id]; return next;
                      })}
                      onSelect={() => toggleFreelancerSelection(person)}
                    />;
                  })}
                </div>
                {visibleFreelancers.length === 0 ? <p className="team-assignment-note label-s" role="status">{isSearching ? "No matching Freelancers." : "No Freelancers available."}</p> : null}
                <div className="team-assignment-list-actions">
                  {!isSearching && suggestedFreelancers.length > 0 && freelancers.length > suggestedFreelancers.length ? <Button size="S" variant="ghost" onClick={() => setIsAllFreelancersVisible((visible) => !visible)}>{isAllFreelancersVisible ? "Show suggested" : `Show all ${freelancers.length}`}</Button> : <span />}
                  <Button size="S" variant="ghost" onClick={openNewFreelancerInvite}><DsIcon name="plus" size={16} />Invite new Freelancer</Button>
                </div>
              </>}
            </div>
          </Tabs>
          {!acceptedPerson && activeInvitations.length > 0 ? <section className="team-assignment-invitations">
            <Button
              size="S"
              variant="ghost"
              aria-expanded={areInvitationsExpanded}
              aria-controls={`assignment-invitations-${slot.id}`}
              onClick={() => setAreInvitationsExpanded((expanded) => !expanded)}
            ><DsIcon name="caret-down" size={12} />{activeInvitations.length} existing invitations</Button>
            {areInvitationsExpanded ? <div className="team-assignment-invitation-detail" id={`assignment-invitations-${slot.id}`}>
              <InvitationEditorList
                invitations={activeInvitations}
                people={people}
                roleHours={getRoleEstimatedHours(slot)}
                showCosts={showCosts}
                onWithdrawInvitation={onWithdrawInvitation}
              />
              <Button size="S" variant="ghost" onClick={onWithdrawAll}>Withdraw all</Button>
            </div> : null}
          </section> : null}
          <details className="team-assignment-options">
            <summary className="label-xs-semibold">Role options</summary>
            <div className="team-assignment-options-body">
              {areSettingsDirty ? <Button size="S" variant="secondary" onClick={() => { saveSettings(); onClose(); }}>Save hours</Button> : null}
              <Button size="S" variant="danger" onClick={() => setIsRemoveConfirmOpen(true)}>Remove role</Button>
              {historicalInvitations.length > 0 ? <InvitationHistory invitations={historicalInvitations} people={people} /> : null}
            </div>
          </details>
        </div>
        {staffPendingConfirmation ? <ConfirmationDialog
          title="This will withdraw pending invitations. Continue?"
          onCancel={() => setStaffPendingConfirmation(null)}
          onConfirm={() => {
            if (areSettingsDirty) onSaveSettings(draftRoleHours);
            onAddStaff(staffPendingConfirmation);
            setSelectedStaffId(null);
            setStaffPendingConfirmation(null);
          }}
          confirmLabel="Continue"
        /> : null}
        {isRemoveConfirmOpen ? <ConfirmationDialog
          title="Remove this role?"
          description="Assignments and invitations for this role will be removed from the project."
          onCancel={() => setIsRemoveConfirmOpen(false)}
          onConfirm={() => { onRemove(); onClose(); }}
          confirmLabel="Remove"
          tone="danger"
        /> : null}
      </EditingDialog>
      {isInviteConfirmOpen ? <ConfirmationDialog
        title={selectedFreelancers.length === 1 ? "Send invite?" : "Send invites?"}
        description={`To: ${selectedFreelancers.map((person) => person.name).join(", ")}`}
        expanded
        onCancel={() => setIsInviteConfirmOpen(false)}
        actions={<>
          <Button size="S" variant="secondary" onClick={() => setIsInviteConfirmOpen(false)}>Cancel</Button>
          <Button size="S" disabled={!inviteMessage.trim()} onClick={sendSelectedInvites}>{selectedFreelancers.length === 1 ? "Send invite" : `Send ${selectedFreelancers.length} invites`}</Button>
        </>}
      ><div className="share-send-message"><label className="label-s-semibold" htmlFor="freelancer-invite-message">Message</label><textarea
        className="label-s"
        id="freelancer-invite-message"
        rows={4}
        maxLength={240}
        value={inviteMessage}
        onChange={(event) => setInviteMessage(event.target.value)}
      /></div></ConfirmationDialog> : null}
    </>
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
    <div className="team-assignment-invitation-list">
      {invitations.map((invitation) => {
        const person = people.find((teamPerson) => teamPerson.id === invitation.personId);
        const cost = getInvitationCost(invitation, roleHours);

        return person ? (
          <div className="team-assignment-invitation-row" key={invitation.id}>
            <span className="team-assignment-person-copy"><span className="label-s-semibold">{person.name}</span><span className="team-assignment-note label-xs">{formatInvitationStatus(invitation.status)} · {formatSentTime(invitation.sentAt)}</span></span>
            {showCosts && typeof cost === "number" ? (
              <span className="label-s">{formatCurrency(cost)}</span>
            ) : null}
            <Button
              size="S"
              variant="ghost"
              aria-label={`Withdraw invitation for ${person.name}`}
              onClick={() => onWithdrawInvitation(invitation.id)}
            >
              Withdraw
            </Button>
          </div>
        ) : null;
      })}
    </div>
  );
}

function StaffOption({ person, roleHours, isCurrentAssignee, disabledReason, isSelected, onSelect }: {
  person: TeamPerson;
  roleHours: number;
  isCurrentAssignee: boolean;
  disabledReason?: string;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const capacity = getCapacitySummary(person.bookedHoursThisWeek, person.weeklyCapacityHours, isCurrentAssignee ? 0 : roleHours);
  const capacityText = `${capacity.projectedHours} of ${person.weeklyCapacityHours}h after assignment · ${capacity.overbookedHours > 0 ? `${capacity.overbookedHours}h over capacity` : `${capacity.availableHours}h free`}`;

  return <div className={`team-assignment-person is-staff ${isSelected ? "is-selected" : ""}`}>
    <Checkbox
      checked={isSelected}
      disabled={Boolean(disabledReason)}
      onChange={onSelect}
      aria-label={`Select ${person.name}${disabledReason ? `, ${disabledReason}` : ""}`}
      wrapperClassName="team-assignment-choice"
      label={<span className="team-assignment-person-label">
        <TeamPersonAvatar person={person} />
        <span className="team-assignment-person-copy"><span className="team-assignment-name label-s-semibold">{person.name}</span><span className="team-assignment-note label-xs">{teamRoleLabels[person.defaultRole]} · {disabledReason ?? person.personType}</span>{!disabledReason ? <span className="team-assignment-note label-xs">{capacityText}</span> : null}</span>
      </span>}
    />
    <span
      className={`team-capacity-status is-${capacity.level}`}
      role="img"
      tabIndex={0}
      aria-label={`Capacity for ${person.name}: ${capacity.label}. ${capacityText}`}
      data-tooltip={`${capacity.label}. ${capacityText}`}
    ><span aria-hidden="true" /></span>
  </div>;
}

function FreelancerOption({ person, showDefaultRole, hourlyRate, projectRate, projectDisabledReason, isAlreadyInvited, isSelected, isSelectionDisabled, showCosts, rateMode, onProjectRateChange, onProjectRateBlur, onSelect }: {
  person: TeamPerson;
  showDefaultRole: boolean;
  hourlyRate: number | undefined;
  projectRate: string;
  projectDisabledReason?: string;
  isAlreadyInvited: boolean;
  isSelected: boolean;
  isSelectionDisabled: boolean;
  showCosts: boolean;
  rateMode: string;
  onProjectRateChange: (value: string) => void;
  onProjectRateBlur: () => void;
  onSelect: () => void;
}) {
  const hasValidHourlyRate = typeof hourlyRate === "number" && hourlyRate > 0;
  const disabledReason = projectDisabledReason ?? (isAlreadyInvited ? "Already invited" : undefined);

  return <div className={`team-assignment-person ${isSelected ? "is-selected" : ""} ${showCosts ? "has-rate" : ""}`}>
    <Checkbox
      checked={isSelected}
      disabled={isSelectionDisabled}
      onChange={onSelect}
      aria-label={`Select ${person.name}${disabledReason ? `, ${disabledReason}` : ""}`}
      wrapperClassName="team-assignment-choice"
      label={<span className="team-assignment-person-label">
        <TeamPersonAvatar person={person} />
        <span className="team-assignment-person-copy"><span className="team-assignment-name label-s-semibold">{person.name}</span>{disabledReason ? <span className="team-assignment-note label-xs">{disabledReason}</span> : null}<span className="team-assignment-note label-xs">{showDefaultRole ? `${teamRoleLabels[person.defaultRole]} · ` : ""}{showCosts ? hasValidHourlyRate ? `${formatHourlyRate(hourlyRate)}/hr` : "Hourly rate not set" : person.personType}</span></span>
      </span>}
    />
    {showCosts ? <div className="team-assignment-rate"><Input
      size="S"
      aria-label={`Project rate for ${person.name}`}
      min="1"
      inputMode="decimal"
      step="1"
      type="number"
      value={projectRate}
      disabled={isSelectionDisabled}
      onChange={(event) => onProjectRateChange(event.target.value)}
      onBlur={onProjectRateBlur}
    /><span className="team-assignment-note label-xs">{rateMode}</span></div> : null}
  </div>;
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
  return `$${hourlyRate.toLocaleString("en-AU", { minimumFractionDigits: Number.isInteger(hourlyRate) ? 0 : 2, maximumFractionDigits: 2 })}`;
}
