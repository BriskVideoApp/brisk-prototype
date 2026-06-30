"use client";

import { useState } from "react";
import { DsIcon } from "@/components/video-review/DsIcon";
import { teamRoleLabels } from "@/data/active-videos/teamDefaults";
import type { TeamRole } from "@/components/active-videos/types";

type AddRoleButtonProps = {
  isOpen: boolean;
  roles: TeamRole[];
  onToggle: () => void;
  onAddRole: (role: TeamRole, customRoleLabel?: string) => void;
};

export function AddRoleButton({ isOpen, roles, onToggle, onAddRole }: AddRoleButtonProps) {
  const [customRoleLabel, setCustomRoleLabel] = useState("");

  return (
    <div className="team-add-role-wrap">
      <button className="team-add-role-button label-s-semibold" type="button" aria-expanded={isOpen} onClick={onToggle}>
        <DsIcon name="plus" size={16} />
        Add role
      </button>
      {isOpen ? (
        <div className="team-add-role-menu" role="menu" aria-label="Add role">
          {roles
            .filter((role) => role !== "custom")
            .map((role) => (
              <button className="label-s-semibold" type="button" role="menuitem" key={role} onClick={() => onAddRole(role)}>
                {teamRoleLabels[role]}
              </button>
            ))}
          <div className="team-custom-role">
            <label className="label-xs-semibold" htmlFor="team-custom-role-name">
              Custom
            </label>
            <input
              className="team-inline-input label-s"
              id="team-custom-role-name"
              placeholder="Role name"
              value={customRoleLabel}
              onChange={(event) => setCustomRoleLabel(event.target.value)}
            />
            <button
              className="team-secondary-button label-s-semibold"
              type="button"
              disabled={!customRoleLabel.trim()}
              onClick={() => {
                onAddRole("custom", customRoleLabel.trim());
                setCustomRoleLabel("");
              }}
            >
              Add custom role
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
