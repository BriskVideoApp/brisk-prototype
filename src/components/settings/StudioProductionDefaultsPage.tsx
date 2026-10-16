"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import type { DefaultProjectTeamMember, TeamRole } from "@/components/active-videos/types";
import { BriskSelect } from "@/components/form/BriskSelect";
import { usePeople } from "@/components/people/PeopleDataContext";
import { useStudioSettings } from "@/components/settings/StudioSettingsContext";
import { useStudioSettingsUnsavedChanges } from "@/components/settings/StudioSettingsShell";
import { DsIcon } from "@/components/video-review/DsIcon";
import { teamRoleLabels, teamRoleOptions } from "@/data/active-videos/teamDefaults";
import type { StudioProductionDefaults } from "@/data/studio-settings";

const defaultTeamRoleOptions = teamRoleOptions
  .filter((role): role is Exclude<TeamRole, "custom"> => role !== "custom")
  .map((role) => ({ value: role, label: teamRoleLabels[role] }));

export function StudioProductionDefaultsPage() {
  const { studio, updateProductionDefaults } = useStudioSettings();
  const { people } = usePeople();
  const { setHasUnsavedChanges } = useStudioSettingsUnsavedChanges();
  const [draft, setDraft] = useState<StudioProductionDefaults>(() => cloneProductionDefaults(studio.production));
  const [toast, setToast] = useState<string | null>(null);
  const hasChanges = useMemo(() => JSON.stringify(draft) !== JSON.stringify(studio.production), [draft, studio.production]);
  const studioStaffOptions = useMemo(() => people
    .filter((person) => person.type === "Team" && person.status === "Active")
    .map((person) => ({ value: person.id, label: person.name })), [people]);
  const availableRoleToAdd = defaultTeamRoleOptions.find((option) => !draft.defaultTeam.some((member) => member.role === option.value));

  useEffect(() => {
    setHasUnsavedChanges(hasChanges);
  }, [hasChanges, setHasUnsavedChanges]);

  useEffect(() => () => setHasUnsavedChanges(false), [setHasUnsavedChanges]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const saveDefaults = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateProductionDefaults(draft);
    setHasUnsavedChanges(false);
    setToast("Production defaults updated.");
  };

  const discardChanges = () => {
    setDraft(cloneProductionDefaults(studio.production));
    setHasUnsavedChanges(false);
  };

  const updateDefaultTeamMember = (memberId: string, update: Partial<DefaultProjectTeamMember>) => {
    setDraft((current) => ({
      ...current,
      defaultTeam: current.defaultTeam.map((member) => member.id === memberId ? { ...member, ...update } : member),
    }));
  };

  const addDefaultTeamRole = () => {
    if (!availableRoleToAdd) return;
    setDraft((current) => ({
      ...current,
      defaultTeam: [
        ...current.defaultTeam,
        {
          id: `default-${availableRoleToAdd.value}`,
          role: availableRoleToAdd.value,
          personId: null,
        },
      ],
    }));
  };

  const removeDefaultTeamRole = (memberId: string) => {
    setDraft((current) => ({
      ...current,
      defaultTeam: current.defaultTeam.filter((member) => member.id !== memberId),
    }));
  };

  return (
    <section className="studio-settings-section studio-production-settings" aria-labelledby="production-defaults-heading">
      <div className="studio-settings-info-block">
        <DsIcon name="info" size={18} />
        <p className="paragraph-s" id="production-defaults-heading">These roles appear when a new project team is set up. Existing project teams will not change.</p>
      </div>

      <form className="studio-production-form" onSubmit={saveDefaults}>
        <ProductionSection
          description="Choose the roles that appear when a new project is created. Assign Studio Staff now or leave a role unassigned."
          title="Default project team"
        >
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

                  <button
                    aria-label={`Remove default ${teamRoleLabels[member.role]} role`}
                    className="studio-default-team-remove"
                    type="button"
                    onClick={() => removeDefaultTeamRole(member.id)}
                  >
                    <DsIcon name="trash-simple" size={16} />
                  </button>
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
        </ProductionSection>

        <div className="studio-settings-form-actions">
          <Button size="M" type="button" variant="secondary" onClick={discardChanges}>Discard changes</Button>
          <Button size="M" type="submit">Save defaults</Button>
        </div>
      </form>

      {toast ? (
        <div className="studio-settings-toast label-s-semibold" role="status">
          <DsIcon name="check-circle" size={16} />
          {toast}
        </div>
      ) : null}
    </section>
  );
}

function ProductionSection({ children, description, title }: { children: ReactNode; description: string; title: string }) {
  return (
    <section className="studio-settings-subsection studio-production-section">
      <div className="studio-settings-section-heading">
        <div>
          <h2 className="headings-xs-bold">{title}</h2>
          <p className="paragraph-s">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function cloneProductionDefaults(production: StudioProductionDefaults): StudioProductionDefaults {
  return {
    defaultTeam: production.defaultTeam.map((member) => ({ ...member })),
  };
}
