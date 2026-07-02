"use client";

import { useState } from "react";
import { ShareActionRow, type ShareStageContext } from "@/components/share/ShareActionRow";

const stageOptions: ShareStageContext[] = ["brief", "script", "media", "edit", "masters"];
const stageLabels: Record<ShareStageContext, string> = {
  brief: "Brief",
  script: "Script",
  media: "Media",
  edit: "Edit",
  masters: "Masters",
};

export default function ShareDemoPage() {
  const [selectedStage, setSelectedStage] = useState<ShareStageContext>("brief");

  return (
    <main className="share-demo-shell">
      <header className="share-demo-header">
        <div>
          <h1>Share controls</h1>
          <p className="label-s">Reusable bottom action row for project stages.</p>
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
      </header>

      <section className="share-demo-canvas" aria-label="Selected stage share controls">
        <ShareActionRow context={selectedStage} userRole="Customer" />
      </section>
    </main>
  );
}
