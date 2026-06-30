"use client";

import { useState } from "react";
import { DsIcon } from "@/components/video-review/DsIcon";
import { stageLabels, teamRoleLabels } from "@/data/active-videos/teamDefaults";
import type { RoleSlot, StageKey } from "@/components/active-videos/types";

type EditStagesModalProps = {
  role: RoleSlot;
  stages: StageKey[];
  onClose: () => void;
  onSave: (stages: StageKey[]) => void;
};

export function EditStagesModal({ role, stages, onClose, onSave }: EditStagesModalProps) {
  const [selectedStages, setSelectedStages] = useState<StageKey[]>(role.stages.map((stageAssignment) => stageAssignment.stageId));
  const roleLabel = role.role === "custom" ? role.customRoleLabel ?? "Custom role" : teamRoleLabels[role.role];

  const toggleStage = (stage: StageKey) => {
    setSelectedStages((currentStages) =>
      currentStages.includes(stage) ? currentStages.filter((currentStage) => currentStage !== stage) : [...currentStages, stage],
    );
  };

  return (
    <div className="team-modal-backdrop" role="presentation" onClick={onClose}>
      <section className="team-modal" role="dialog" aria-modal="true" aria-label={`Edit stages for ${roleLabel}`} onClick={(event) => event.stopPropagation()}>
        <header className="team-modal-header">
          <div>
            <h2 className="team-modal-title heading-3xs">Edit stages covered</h2>
            <p className="team-modal-subtitle label-s">{roleLabel}</p>
          </div>
          <button className="team-modal-close" type="button" aria-label="Close stage editor" onClick={onClose}>
            <DsIcon name="x-close-cross" size={16} />
          </button>
        </header>
        <div className="team-stage-list">
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
        <div className="team-modal-actions">
          <button className="team-secondary-button label-s-semibold" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="team-primary-button label-s-semibold" type="button" onClick={() => onSave(selectedStages)}>
            Save
          </button>
        </div>
      </section>
    </div>
  );
}
