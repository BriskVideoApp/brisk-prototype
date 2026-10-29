"use client";

import { useBriskAi } from "./BriskAiContext";
import { DsIcon } from "@/components/video-review/DsIcon";
import { CommentCountBadge } from "@/components/CommentCountBadge";
import { Button } from "../../../Brisk DS/src/app/components/Button";

export function BriskAiHeaderButton() {
  const { openAssistant, view, assistantName, unreadInsightCount } = useBriskAi();

  return (
    <Button
      className="ask-brisk-header-button"
      size="S"
      variant="ghost"
      type="button"
      aria-expanded={view !== "closed" && view !== "minimised"}
      aria-label={`${assistantName}${unreadInsightCount ? `, ${unreadInsightCount} new ${unreadInsightCount === 1 ? "insight" : "insights"}` : ""}`}
      onClick={() => openAssistant()}
    >
      <DsIcon name="star-four" size={16} />
      {assistantName}
      <CommentCountBadge count={unreadInsightCount} label={`${unreadInsightCount} new ${unreadInsightCount === 1 ? "insight" : "insights"}`} maxCount={9} />
    </Button>
  );
}
