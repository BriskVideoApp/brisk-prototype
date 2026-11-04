"use client";

import { Fragment, useEffect, useId, useMemo, useState } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { EditingDialog } from "../../../Brisk DS/src/app/components/EditingDialog";
import { IconButton } from "../../../Brisk DS/src/app/components/IconButton";
import type { DefaultProjectTeamMember, TeamRole } from "@/components/active-videos/types";
import { BriskSelect } from "@/components/form/BriskSelect";
import { usePeople } from "@/components/people/PeopleDataContext";
import { TurnaroundSettingsSection } from "./TurnaroundSettingsSection";
import { SettingsSummaryRow } from "./SettingsSummaryRow";
import { useStudioSettings } from "./StudioSettingsContext";
import { DsIcon } from "@/components/video-review/DsIcon";
import { teamRoleLabels, teamRoleOptions } from "@/data/active-videos/teamDefaults";
import type { StudioProductionDefaults } from "@/data/studio-settings";

const defaultTeamRoleOptions = teamRoleOptions
  .filter((role): role is Exclude<TeamRole, "custom"> => role !== "custom")
  .map((role) => ({ value: role, label: teamRoleLabels[role] }));

export function StudioProductionDefaultsPage() {
  const { studio, updateProductionDefaults } = useStudioSettings();
  const { people } = usePeople();
  const [isEditingTeam, setIsEditingTeam] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  return <section className="studio-settings-section" aria-label="Production defaults">
    <div className="studio-setup-settings-panel production-defaults-panel">
      <TurnaroundSettingsSection onSaved={setToast} />
      <SettingsSummaryRow title="Default project team" headingAs="h2" action={<Button size="S" variant="secondary" onClick={() => setIsEditingTeam(true)}>Edit team</Button>}>
        {studio.production.defaultTeam.length > 0 ? <dl className="production-default-team-summary">
          {studio.production.defaultTeam.map((member) => <Fragment key={member.id}>
            <dt className="label-s">{teamRoleLabels[member.role]}</dt>
            <dd className="label-m-semibold">{member.personId
              ? people.find((person) => person.id === member.personId)?.name ?? "Person unavailable"
              : "Unassigned"}</dd>
          </Fragment>)}
        </dl> : <strong className="label-m-semibold">No default roles</strong>}
      </SettingsSummaryRow>
    </div>
    <p className="paragraph-s studio-review-dialog-note">Team defaults apply to new projects. Timing applies to future stages and revisions. Active deadlines stay unchanged.</p>
    {isEditingTeam ? <DefaultTeamEditor production={studio.production} onCancel={() => setIsEditingTeam(false)} onSave={(next) => {
      updateProductionDefaults(next);
      setIsEditingTeam(false);
      setToast("Default team saved for new projects.");
    }} /> : null}
    {toast ? <div className="studio-settings-toast label-s-semibold" role="status"><DsIcon name="check-circle" size={16} />{toast}</div> : null}
  </section>;
}

function DefaultTeamEditor({ production, onCancel, onSave }: {
  production: StudioProductionDefaults;
  onCancel: () => void;
  onSave: (production: StudioProductionDefaults) => void;
}) {
  const { people } = usePeople();
  const formId = useId();
  const [draft, setDraft] = useState<StudioProductionDefaults>(() => ({ defaultTeam: production.defaultTeam.map((member) => ({ ...member })) }));
  const hasChanges = JSON.stringify(draft.defaultTeam) !== JSON.stringify(production.defaultTeam);
  const studioStaffOptions = useMemo(() => people
    .filter((person) => person.type === "Team" && person.status === "Active")
    .map((person) => ({ value: person.id, label: person.name })), [people]);
  const availableRoleToAdd = defaultTeamRoleOptions.find((option) => !draft.defaultTeam.some((member) => member.role === option.value));
  const updateDefaultTeamMember = (memberId: string, update: Partial<DefaultProjectTeamMember>) => {
    setDraft((current) => ({ ...current, defaultTeam: current.defaultTeam.map((member) => member.id === memberId ? { ...member, ...update } : member) }));
  };
  const addDefaultTeamRole = () => {
    if (!availableRoleToAdd) return;
    setDraft((current) => ({ ...current, defaultTeam: [...current.defaultTeam, { id: crypto.randomUUID(), role: availableRoleToAdd.value, personId: null }] }));
  };
  const removeDefaultTeamRole = (memberId: string) => {
    setDraft((current) => ({ ...current, defaultTeam: current.defaultTeam.filter((member) => member.id !== memberId) }));
  };

  return <EditingDialog title="Edit default project team" description="Choose roles for new projects. Assign Studio Staff or leave roles unassigned. Existing project teams stay unchanged." onCancel={onCancel}
    actions={<><Button size="S" variant="secondary" onClick={onCancel}>Cancel</Button><Button size="S" type="submit" form={formId} disabled={!hasChanges}>Save team</Button></>}>
    <form id={formId} className="studio-editor-fields" onSubmit={(event) => { event.preventDefault(); if (hasChanges) onSave(draft); }}>
      {draft.defaultTeam.length === 0 ? <p className="paragraph-s">No default roles. Add a role, or assign the team separately for each project.</p> : null}
      <div className="studio-default-team-list">
        {draft.defaultTeam.map((member) => {
          const roleOptions = defaultTeamRoleOptions.filter((option) => option.value === member.role || !draft.defaultTeam.some((currentMember) => currentMember.role === option.value));

          return (
            <div className="studio-default-team-row" key={member.id}>
              <label className="studio-settings-select-field">
                <span className="label-xs-semibold">Role</span>
                <BriskSelect<Exclude<TeamRole, "custom">>
                  ariaLabel="Default project role"
                  clearable={false}
                  options={roleOptions}
                  placeholder="Choose a role"
                  searchable={false}
                  value={member.role}
                  onChange={(role) => {
                    if (role) updateDefaultTeamMember(member.id, { role, personId: null });
                  }}
                />
              </label>

              <label className="studio-settings-select-field">
                <span className="label-xs-semibold">Default Studio Staff</span>
                <BriskSelect
                  ariaLabel={`Default ${teamRoleLabels[member.role]}`}
                  clearLabel="Leave unassigned"
                  options={studioStaffOptions}
                  placeholder="No default assignee"
                  value={member.personId ?? ""}
                  onChange={(personId) => updateDefaultTeamMember(member.id, { personId: personId || null })}
                />
              </label>

              <IconButton
                aria-label={`Remove default ${teamRoleLabels[member.role]} role`}
                type="button"
                onClick={() => removeDefaultTeamRole(member.id)}
              >
                <DsIcon name="trash-simple" size={16} />
              </IconButton>
            </div>
          );
        })}
      </div>

      {availableRoleToAdd ? (
        <div>
          <Button size="S" type="button" variant="secondary" onClick={addDefaultTeamRole}>
            <span className="studio-settings-button-content"><DsIcon name="plus" size={16} /> Add default role</span>
          </Button>
        </div>
      ) : null}

    </form>
  </EditingDialog>;
}
