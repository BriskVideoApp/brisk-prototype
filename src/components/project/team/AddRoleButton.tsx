"use client";

import { Button } from "../../../../Brisk DS/src/app/components/Button";
import { useState } from "react";
import { BriskSelect } from "@/components/form/BriskSelect";
import { DsIcon } from "@/components/video-review/DsIcon";
import { teamRoleLabels } from "@/data/active-videos/teamDefaults";
import type { TeamRole } from "@/components/active-videos/types";

type AddRoleButtonProps = {
  isOpen: boolean;
  roles: TeamRole[];
  onOpenChange: (open: boolean) => void;
  onAddRole: (role: TeamRole, customRoleLabel?: string) => void;
};

export function AddRoleButton({ isOpen, roles, onOpenChange, onAddRole }: AddRoleButtonProps) {
  const [customRoleLabel, setCustomRoleLabel] = useState("");
  return <BriskSelect<TeamRole>
    ariaLabel="Add role"
    mode="action"
    open={isOpen}
    onOpenChange={onOpenChange}
    className="team-add-role-wrap"
    actionTrigger={(props) => <Button {...props} size="S" variant="ghost"><DsIcon name="plus" size={16} />Add role</Button>}
    hideCaret
    clearable={false}
    options={roles.filter((role) => role !== "custom").map((role) => ({ value: role, label: teamRoleLabels[role] }))}
    placeholder="Add role"
    value=""
    onChange={(role) => { if (role) onAddRole(role); }}
    footer={<div className="team-custom-role">
      <label className="label-xs-semibold" htmlFor="team-custom-role-name">Custom</label>
      <input className="team-inline-input label-s" id="team-custom-role-name" placeholder="Role name" value={customRoleLabel} onChange={(event) => setCustomRoleLabel(event.target.value)} />
      <Button size="S" variant="secondary" className="team-secondary-button" type="button" disabled={!customRoleLabel.trim()} onClick={() => {
        onAddRole("custom", customRoleLabel.trim());
        setCustomRoleLabel("");
      }}>Add custom role</Button>
    </div>}
  />;
}
