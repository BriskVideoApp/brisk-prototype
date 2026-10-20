"use client";

import { useBriskAi } from "./BriskAiContext";
import { DsIcon } from "@/components/video-review/DsIcon";
import { Button } from "../../../Brisk DS/src/app/components/Button";

export function BriskAiHeaderButton() {
  const { openAssistant, view } = useBriskAi();

  return (
    <Button
      size="S"
      variant="ghost"
      type="button"
      aria-expanded={view !== "closed" && view !== "minimised"}
      aria-label="Ask Brisk"
      onClick={() => openAssistant()}
    >
      <DsIcon name="star-four" size={16} />
      Ask Brisk
    </Button>
  );
}
