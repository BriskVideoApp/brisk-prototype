"use client";

import { useBriskAi } from "./BriskAiContext";
import { DsIcon } from "@/components/video-review/DsIcon";

export function BriskAiHeaderButton() {
  const { openAssistant, view } = useBriskAi();

  return (
    <button
      className="app-global-client-brand-kit app-global-brisk-ai label-s-semibold"
      type="button"
      aria-expanded={view !== "closed" && view !== "minimised"}
      aria-label="Ask Brisk"
      onClick={() => openAssistant()}
    >
      <DsIcon name="star-four" size={16} />
      Ask Brisk
    </button>
  );
}
