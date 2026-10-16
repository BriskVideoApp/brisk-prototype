"use client";

import { Button } from "../../../Brisk DS/src/app/components/Button";
import { FormEvent, useState } from "react";
import { Input } from "../../../Brisk DS/src/app/components/Input";
import type { StudioOnboardingAnswer } from "@/data/studio-onboard";

type StudioAiQuestionProps = {
  initialAnswer?: StudioOnboardingAnswer | null;
  onAnalyse: (answer: StudioOnboardingAnswer) => void;
  onBack: () => void;
  onDraftChange: (answer: StudioOnboardingAnswer) => void;
};

export function StudioAiQuestion({ initialAnswer, onAnalyse, onBack, onDraftChange }: StudioAiQuestionProps) {
  const [studioName, setStudioName] = useState(() => initialAnswer?.studioName ?? "");
  const canContinue = studioName.trim().length > 0;

  function submitStudioName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canContinue) return;

    const answer: StudioOnboardingAnswer = {
      studioName: studioName.trim(),
      studioDescription: "",
      sources: [],
    };
    onDraftChange(answer);
    onAnalyse(answer);
  }

  return (
    <form className="studio-ai-question" onSubmit={submitStudioName}>
      <div className="studio-ai-field">
        <Input
          label="Studio name"
          autoComplete="organisation"
          placeholder="Your production company"
          value={studioName}
          onChange={(event) => {
            setStudioName(event.target.value);
            onDraftChange({ studioName: event.target.value.trim(), studioDescription: "", sources: [] });
          }}
        />
      </div>

      <footer className="studio-follow-up-footer">
        <div className="studio-follow-up-actions">
          <Button size="S" variant="secondary" className="studio-follow-up-back" type="button" onClick={onBack}>Back</Button>
          <Button size="M" variant="primary" className="studio-follow-up-continue" type="submit" disabled={!canContinue}>
            Continue
          </Button>
        </div>
      </footer>
    </form>
  );
}
