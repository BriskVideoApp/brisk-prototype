"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { Textarea } from "../../../Brisk DS/src/app/components/Textarea";
import { useBriskAi } from "./BriskAiContext";
import type { AskInsight } from "@/data/ask-brisk";

export function AskBriskInsights({ insights, compact, onAsk, onRemind }: {
  insights: AskInsight[];
  compact: boolean;
  onAsk: (prompt: string) => void;
  onRemind: (insight: AskInsight) => void;
}) {
  const { dismissInsight, setPriority, model } = useBriskAi();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [instruction, setInstruction] = useState("");
  return <section className="ask-brisk-insights" aria-label="Your briefing">
    <h2 className="headings-2xs-bold">{compact ? "Worth a look" : "Your briefing"}</h2>
    {!insights.length ? <p className="paragraph-s">No new insights in this scope. You can still ask about the work you have access to.</p> : null}
    {insights.slice(0, compact ? 1 : 6).map((insight) => <article className="ask-brisk-insight" key={insight.id}>
      <span className="label-xs">{insight.projectName}</span>
      <h3 className="label-s-semibold">{insight.title}</h3>
      {insight.priority ? <p className="paragraph-s">{insight.priority}</p> : null}
      <p className="paragraph-s">{insight.body}</p>
      <Link className="label-xs-semibold" href={insight.href}>Source: {insight.sourceLabel}</Link>
      <div className="ask-brisk-actions">
        <Button size="S" variant="secondary" onClick={() => onAsk(`What happens next on ${insight.projectName}?`)}>Ask about this</Button>
        {insight.reviewStage && model.viewer?.role === "Studio Staff" ? <Button size="S" onClick={() => onRemind(insight)}>Prepare reminder</Button> : null}
        {!compact ? <Button size="S" variant="ghost" onClick={() => dismissInsight(`${insight.id}:${insight.fingerprint}`)}>Dismiss</Button> : null}
        {!compact && model.viewer?.role === "Studio Staff" ? <Button size="S" variant="ghost" onClick={() => { setEditingId(insight.projectId); setInstruction(insight.priority ?? ""); }}>Set priority</Button> : null}
      </div>
      {editingId === insight.projectId ? <div className="ask-brisk-priority">
        <Textarea label="Your priority instruction" hint="Shown in your briefing until you change or clear it. Update the source Stage to correct its status." rows={3} value={instruction} onChange={(event) => setInstruction(event.target.value)} />
        <div className="ask-brisk-actions">
          <Button size="S" variant="secondary" onClick={() => setEditingId(null)}>Cancel</Button>
          <Button size="S" onClick={() => { setPriority(insight.projectId, instruction); setEditingId(null); }}>Save priority</Button>
        </div>
      </div> : null}
    </article>)}
    {!compact && insights.length > 6 ? <p className="paragraph-s">Showing the first six insights. Narrow the scope or ask about a project for more detail.</p> : null}
  </section>;
}
