"use client";

import { Button } from "../../../../Brisk DS/src/app/components/Button";

import { EditingDialog } from "../../../../Brisk DS/src/app/components/EditingDialog";

import { useState } from "react";
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
    <> <EditingDialog title="Edit stages covered" description={roleLabel} onCancel={onClose} size="standard" actions={<> <Button size="S" variant="secondary"  type="button" onClick={onClose}>
            Cancel
          </Button>  <Button size="S" variant="primary"  type="button" onClick={() => onSave(selectedStages)}>
            Save
          </Button> </>}>  <div className="team-stage-list">
          {stages.map((stage) => {
            const isSelected = selectedStages.includes(stage);

            return (
              <button className={`team-stage-option ${isSelected ? "selected" : ""}`} type="button" key={stage} onClick={() => toggleStage(stage)}>
                <span className={`team-checkbox ${isSelected ? "checked" : ""}`}>{isSelected ? "✓" : ""}</span>
                <span className="label-s-semibold">{stageLabels[stage]}</span>
              </button>
            );
          })}
        </div>  </EditingDialog> </>
  );
}
