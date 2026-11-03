"use client";

import { Button } from "../../../Brisk DS/src/app/components/Button";
import { FormEvent, useState } from "react";
import { Input } from "../../../Brisk DS/src/app/components/Input";
import { Textarea } from "../../../Brisk DS/src/app/components/Textarea";
import type { StudioOnboardingAnswer } from "@/data/studio-onboard";
import { normaliseStudioWebsite } from "@/data/studio-website-profiles";

type StudioAiQuestionProps = {
  initialAnswer?: StudioOnboardingAnswer | null;
  onAnalyse: (answer: StudioOnboardingAnswer) => void;
  onBack: () => void;
  onDraftChange: (answer: StudioOnboardingAnswer) => void;
  manual?: boolean;
  onManual?: () => void;
};

export function StudioAiQuestion({ initialAnswer, onAnalyse, onBack, onDraftChange, manual = false, onManual }: StudioAiQuestionProps) {
  const [studioName, setStudioName] = useState(() => initialAnswer?.studioName ?? "");
  const [description, setDescription] = useState(initialAnswer?.studioDescription ?? "");
  const [website, setWebsite] = useState(initialAnswer?.sources.find((source) => source.type === "website")?.label ?? "");
  const canContinue = manual ? Boolean(studioName.trim() && description.trim()) : Boolean(normaliseStudioWebsite(website));

  function draft(name: string, blurb: string, site: string): StudioOnboardingAnswer {
    return {
      studioName: name.trim(),
      studioDescription: blurb,
      sources: site.trim() ? [{ id: "studio-website", type: "website", label: site }] : [],
    };
  }

  function submitStudioDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canContinue) return;

    const normalisedWebsite = normaliseStudioWebsite(website) ?? "";
    const previousWebsite = initialAnswer?.sources.find((source) => source.type === "website")?.label;
    const answer = manual ? draft(studioName, description.trim(), website)
      : initialAnswer?.studioName && normalisedWebsite === normaliseStudioWebsite(previousWebsite ?? "")
        ? initialAnswer : draft("", "", normalisedWebsite);
    onAnalyse(answer);
  }

  return (
    <form className="studio-ai-question" onSubmit={submitStudioDetails}>
      <div className="studio-ai-field">
        {manual ? <>
        <Input
          label="Studio name"
          autoComplete="organisation"
          placeholder="Your production company"
          value={studioName}
          onChange={(event) => {
            setStudioName(event.target.value);
            onDraftChange(draft(event.target.value, description, website));
          }}
        />
        <Textarea label="About Studio" rows={3} value={description}
          placeholder="Tell us briefly what your Studio does."
          onChange={(event) => { setDescription(event.target.value); onDraftChange(draft(studioName, event.target.value, website)); }} />
        </> : <Input label="Website" autoComplete="url" inputMode="url" placeholder="yourstudio.com"
          value={website} onChange={(event) => {
            setWebsite(event.target.value);
            onDraftChange(draft("", "", event.target.value));
          }} />}
      </div>

      <footer className="studio-follow-up-footer">
        <div className="studio-follow-up-actions">
          <Button size="S" variant="secondary" className="studio-follow-up-back" type="button" onClick={onBack}>Back</Button>
          <Button size="M" variant="primary" className="studio-follow-up-continue" type="submit" disabled={!canContinue}>
            Continue
          </Button>
        </div>
      </footer>
      {!manual && onManual ? <Button size="S" variant="ghost" className="studio-onboarding-manual-action" onClick={onManual}>I don&apos;t have a website</Button> : null}
    </form>
  );
}
