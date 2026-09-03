"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { Input } from "../../../Brisk DS/src/app/components/Input";
import type { DefaultProjectTeamMember, TeamRole } from "@/components/active-videos/types";
import { BriskSelect } from "@/components/form/BriskSelect";
import { usePeople } from "@/components/people/PeopleDataContext";
import { useStudioSettings } from "@/components/settings/StudioSettingsContext";
import { useStudioSettingsUnsavedChanges } from "@/components/settings/StudioSettingsShell";
import { DsIcon } from "@/components/video-review/DsIcon";
import { teamRoleLabels, teamRoleOptions } from "@/data/active-videos/teamDefaults";
import type {
  StudioBriefTemplateId,
  StudioProductionDefaults,
  StudioReviewReminderId,
} from "@/data/studio-settings";

const briefTemplateOptions = [
  { value: "brisk-standard", label: "Brisk standard Brief" },
  { value: "simple-request", label: "Simple project request" },
  { value: "none", label: "No default" },
] as const;

const reminderOptions = [
  { value: "none", label: "No automatic reminder" },
  { value: "one-working-day", label: "After 1 working day" },
  { value: "two-working-days", label: "After 2 working days" },
  { value: "three-working-days", label: "After 3 working days" },
] as const;

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

  const updateClientPortal = <Key extends keyof StudioProductionDefaults["clientPortal"],>(
    key: Key,
    value: StudioProductionDefaults["clientPortal"][Key],
  ) => {
    setDraft((current) => ({ ...current, clientPortal: { ...current.clientPortal, [key]: value } }));
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
        <p className="paragraph-s" id="production-defaults-heading">Defaults are applied when new work is created. Existing projects will not change.</p>
      </div>

      <form className="studio-production-form" onSubmit={saveDefaults}>
        <ProductionSection
          description="Set the starting Brief and reference used for new projects."
          title="New projects"
        >
          <label className="studio-settings-select-field studio-production-single-field">
            <span className="label-m-semibold">Default Brief template</span>
            <BriskSelect<StudioBriefTemplateId>
              ariaLabel="Default Brief template"
              clearable={false}
              options={briefTemplateOptions}
              placeholder="Choose a Brief template"
              searchable={false}
              value={draft.briefTemplateId}
              onChange={(briefTemplateId) => {
                if (briefTemplateId) setDraft((current) => ({ ...current, briefTemplateId }));
              }}
            />
          </label>

          <div className="studio-production-field-group">
            <strong className="label-m-semibold">Project numbering</strong>
            <div className="studio-production-numbering-grid">
              <Input
                label="Prefix"
                value={draft.projectNumberPrefix}
                onChange={(event) => setDraft((current) => ({ ...current, projectNumberPrefix: event.target.value.toLocaleUpperCase("en-AU") }))}
              />
              <Input
                label="Next number"
                value={draft.nextProjectNumber}
                onChange={(event) => setDraft((current) => ({ ...current, nextProjectNumber: event.target.value }))}
              />
              <div className="studio-production-number-preview">
                <span className="label-xs">Preview</span>
                <strong className="headings-2xs-bold">{draft.projectNumberPrefix || "CC"}-{draft.nextProjectNumber || "001"}</strong>
              </div>
            </div>
          </div>
        </ProductionSection>

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

        <ProductionSection description="Choose when Clients are reminded to review released work." title="Reviews">
          <label className="studio-settings-select-field studio-production-single-field">
            <span className="label-m-semibold">Default review reminder</span>
            <BriskSelect<StudioReviewReminderId>
              ariaLabel="Default review reminder"
              clearable={false}
              options={reminderOptions}
              placeholder="Choose reminder timing"
              searchable={false}
              value={draft.reviewReminderId}
              onChange={(reviewReminderId) => {
                if (reviewReminderId) setDraft((current) => ({ ...current, reviewReminderId }));
              }}
            />
          </label>
        </ProductionSection>

        <ProductionSection description="Set the starting capacity and visibility for new Client portals." title="Client portals">
          <div className="studio-production-capacity-field">
            <Input
              label="Default active videos per Client"
              type="number"
              value={String(draft.defaultActiveVideosPerClient)}
              onChange={(event) => setDraft((current) => ({
                ...current,
                defaultActiveVideosPerClient: Math.max(1, Number(event.target.value) || 1),
              }))}
            />
            <p className="paragraph-s">This production setting is not connected to Stripe products, invoices or payment status.</p>
          </div>

          <div className="studio-settings-toggle-list">
            <SettingsToggle
              checked={draft.clientPortal.showProjectQueue}
              label="Show project queue"
              onChange={(checked) => updateClientPortal("showProjectQueue", checked)}
            />
            <SettingsToggle
              checked={draft.clientPortal.showCompletedProjects}
              label="Show completed projects"
              onChange={(checked) => updateClientPortal("showCompletedProjects", checked)}
            />
            <SettingsToggle
              checked={draft.clientPortal.allowClientsToInviteColleagues}
              label="Allow Clients to invite colleagues"
              onChange={(checked) => updateClientPortal("allowClientsToInviteColleagues", checked)}
            />
          </div>
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

function SettingsToggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label className="studio-settings-compact-toggle">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="label-s">{label}</span>
    </label>
  );
}

function cloneProductionDefaults(production: StudioProductionDefaults): StudioProductionDefaults {
  return {
    ...production,
    defaultTeam: production.defaultTeam.map((member) => ({ ...member })),
    clientPortal: { ...production.clientPortal },
  };
}
