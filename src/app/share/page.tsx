"use client";

import { useState } from "react";
import { ShareActionRow, type ShareStageContext, type ShareUserRole } from "@/components/share/ShareActionRow";

const stageOptions: ShareStageContext[] = ["brief", "script", "media", "edit", "masters"];
const roleOptions: Extract<ShareUserRole, "Studio Staff" | "Customer">[] = ["Studio Staff", "Customer"];
const stageLabels: Record<ShareStageContext, string> = {
  brief: "Brief",
  script: "Script",
  media: "Media",
  edit: "Edit",
  masters: "Masters",
};

export default function ShareDemoPage() {
  const [selectedStage, setSelectedStage] = useState<ShareStageContext>("brief");
  const [selectedRole, setSelectedRole] = useState<Extract<ShareUserRole, "Studio Staff" | "Customer">>("Studio Staff");

  return (
    <main className="share-demo-shell">
      <header className="share-demo-header">
        <div>
          <h1>Share controls</h1>
          <p className="label-s">Reusable bottom action row for project stages.</p>
        </div>
        <div className="share-demo-header-actions">
          <div className="share-demo-role-switcher" role="group" aria-label="View as role">
            {roleOptions.map((role) => (
              <button
                className={`share-demo-role-option label-s-semibold ${selectedRole === role ? "selected" : ""}`}
                type="button"
                key={role}
                aria-pressed={selectedRole === role}
                onClick={() => setSelectedRole(role)}
              >
                {role}
              </button>
            ))}
          </div>
          <div className="share-demo-stage-picker" role="group" aria-label="Preview stage">
            {stageOptions.map((stage) => (
              <button
                className={`label-s-semibold ${selectedStage === stage ? "selected" : ""}`}
                type="button"
                key={stage}
                aria-pressed={selectedStage === stage}
                onClick={() => setSelectedStage(stage)}
              >
                {stageLabels[stage]}
              </button>
            ))}
          </div>
        </div>
      </header>

      <section className="share-demo-canvas" aria-label="Selected stage share controls">
        <ShareActionRow
          context={selectedStage}
          userRole={selectedRole}
          projectName="Launch Film - Sales Narrative"
          studioName="Brisk Studios"
          customerName="Avery Taylor"
        />
      </section>
    </main>
  );
}
