"use client";

import { FormEvent, useState } from "react";
import { Input } from "../../../Brisk DS/src/app/components/Input";
import { videoTypeIconMap } from "@/components/brief/videoTypeIcons";
import { DsIcon } from "@/components/video-review/DsIcon";
import { briefVideoTypeDetails, type BriefVideoTypeId } from "@/data/brief";
import type { StudioOnboardingScenario } from "@/data/studio-onboard";

const customAnswerOption = "Something else";

type StudioFollowUpStepId =
  | "contextual"
  | "production-model"
  | "video-types"
  | "voiceover";

export type StudioFollowUpAnswers = {
  contextualAnswer: string;
  productionModel: "shoot-and-post" | "post-production-only" | null;
  productionScale: "larger-production" | "run-and-gun" | "varies" | null;
  videoTypeIds: BriefVideoTypeId[];
  providesVoiceovers: boolean | null;
  voiceoverOffering: "ai" | "human" | "both" | "none" | null;
};

type StudioAiFollowUpProps = {
  initialAnswers?: StudioFollowUpAnswers | null;
  scenario: StudioOnboardingScenario;
  onAnswersChange: (answers: StudioFollowUpAnswers) => void;
  onContinue: (answers: StudioFollowUpAnswers) => void;
};

export function StudioAiFollowUp({
  initialAnswers,
  scenario,
  onAnswersChange,
  onContinue,
}: StudioAiFollowUpProps) {
  const [answers, setAnswers] = useState<StudioFollowUpAnswers>(() => initialAnswers ?? {
    contextualAnswer: "",
    productionModel: null,
    productionScale: null,
    videoTypeIds: [...scenario.generatedSetup.videoTypeNames],
    providesVoiceovers: null,
    voiceoverOffering: null,
  });
  const [activeStepId, setActiveStepId] = useState<StudioFollowUpStepId>("contextual");
  const [customAnswer, setCustomAnswer] = useState(() => {
    const initialAnswer = initialAnswers?.contextualAnswer ?? "";
    return scenario.suggestedAnswers.includes(initialAnswer) ? "" : initialAnswer;
  });
  const [isCustomAnswerSelected, setIsCustomAnswerSelected] = useState(() => {
    const initialAnswer = initialAnswers?.contextualAnswer ?? "";
    return initialAnswer.length > 0 && !scenario.suggestedAnswers.includes(initialAnswer);
  });
  const showCustomAnswerOption = scenario.id !== "full-service";
  const isCustomAnswer = showCustomAnswerOption && isCustomAnswerSelected;
  const stepIds: StudioFollowUpStepId[] = [
    "contextual",
    "production-model",
    "video-types",
    "voiceover",
  ];
  const activeStepIndex = stepIds.indexOf(activeStepId);
  const canContinue = getCanContinue(activeStepId, answers);

  function updateAnswers(nextAnswers: StudioFollowUpAnswers) {
    setAnswers(nextAnswers);
    onAnswersChange(nextAnswers);
  }

  function updateAnswersAndAdvance(nextAnswers: StudioFollowUpAnswers) {
    updateAnswers(nextAnswers);

    if (activeStepIndex === stepIds.length - 1) {
      onContinue(nextAnswers);
      return;
    }

    setActiveStepId(stepIds[activeStepIndex + 1]);
  }

  function submitFollowUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canContinue) {
      return;
    }

    if (activeStepIndex === stepIds.length - 1) {
      onContinue(answers);
      return;
    }

    setActiveStepId(stepIds[activeStepIndex + 1]);
  }

  function goBack() {
    if (activeStepIndex > 0) {
      setActiveStepId(stepIds[activeStepIndex - 1]);
    }
  }

  function toggleVideoType(videoTypeId: BriefVideoTypeId) {
    const nextVideoTypeIds = answers.videoTypeIds.includes(videoTypeId)
      ? answers.videoTypeIds.filter((currentId) => currentId !== videoTypeId)
      : [...answers.videoTypeIds, videoTypeId];

    updateAnswers({ ...answers, videoTypeIds: nextVideoTypeIds });
  }

  return (
    <section className="studio-follow-up-stage" aria-labelledby="studio-follow-up-heading">
      <form
        className={`studio-follow-up-form ${activeStepId === "video-types" ? "video-types" : ""} ${activeStepId === "production-model" ? "production-model" : ""}`}
        onSubmit={submitFollowUp}
      >
        <div className="studio-follow-up-progress label-xs-semibold">
          Question {activeStepIndex + 1} of {stepIds.length}
        </div>

        {activeStepId === "contextual" ? (
          <>
            <FollowUpIntro question={scenario.question} />
            <div className="studio-follow-up-chips" role="group" aria-label="Suggested answers">
              {scenario.suggestedAnswers.map((suggestedAnswer) => (
                <FollowUpChip
                  key={suggestedAnswer}
                  label={suggestedAnswer}
                  selected={answers.contextualAnswer === suggestedAnswer}
                  onClick={() => {
                    setCustomAnswer("");
                    setIsCustomAnswerSelected(false);
                    updateAnswersAndAdvance({ ...answers, contextualAnswer: suggestedAnswer });
                  }}
                />
              ))}
              {showCustomAnswerOption ? (
                <FollowUpChip
                  label={customAnswerOption}
                  selected={isCustomAnswer}
                  onClick={() => {
                    setIsCustomAnswerSelected(true);
                    updateAnswers({ ...answers, contextualAnswer: customAnswer.trim() });
                  }}
                />
              ) : null}
            </div>
            {isCustomAnswer ? (
              <div className="studio-follow-up-custom-answer">
                <Input
                  placeholder="Add a short answer..."
                  value={customAnswer}
                  onChange={(event) => {
                    setCustomAnswer(event.target.value);
                    updateAnswers({ ...answers, contextualAnswer: event.target.value.trim() });
                  }}
                />
              </div>
            ) : null}
          </>
        ) : null}

        {activeStepId === "production-model" ? (
          <>
            <FollowUpIntro
              question="Do you shoot footage, or do you only do post-production?"
            />
            <div className="studio-follow-up-answer-stack">
              <div className="studio-follow-up-chips" role="group" aria-label="Production model">
                <FollowUpChip
                  label="Shoot + post-production"
                  selected={answers.productionModel === "shoot-and-post"}
                  onClick={() => updateAnswers({
                    ...answers,
                    productionModel: "shoot-and-post",
                  })}
                />
                <FollowUpChip
                  label="Post-production only"
                  selected={answers.productionModel === "post-production-only"}
                  onClick={() => updateAnswersAndAdvance({
                    ...answers,
                    productionModel: "post-production-only",
                    productionScale: null,
                  })}
                />
              </div>
              {answers.productionModel === "shoot-and-post" ? (
                <div className="studio-follow-up-conditional-question">
                  <span className="label-m-semibold">What size are your crews?</span>
                  <div className="studio-follow-up-chips" role="group" aria-label="Typical production size">
                    <FollowUpChip
                      label="Small (1-3 people)"
                      selected={answers.productionScale === "run-and-gun"}
                      onClick={() => updateAnswersAndAdvance({ ...answers, productionScale: "run-and-gun" })}
                    />
                    <FollowUpChip
                      label="Large (4+ people)"
                      selected={answers.productionScale === "larger-production"}
                      onClick={() => updateAnswersAndAdvance({ ...answers, productionScale: "larger-production" })}
                    />
                    <FollowUpChip
                      label="Varies by project"
                      selected={answers.productionScale === "varies"}
                      onClick={() => updateAnswersAndAdvance({ ...answers, productionScale: "varies" })}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </>
        ) : null}

        {activeStepId === "video-types" ? (
          <>
            <FollowUpIntro
              question="Which of these products do you offer?"
            />
            <div className="studio-follow-up-video-grid" role="group" aria-label="Video types offered">
              {briefVideoTypeDetails.map((videoType) => {
                const isSelected = answers.videoTypeIds.includes(videoType.name);

                return (
                  <button
                    className={`studio-video-type-editor-option ${isSelected ? "selected" : ""}`}
                    type="button"
                    key={videoType.name}
                    aria-pressed={isSelected}
                    onClick={() => toggleVideoType(videoType.name)}
                  >
                    <span className="studio-video-type-editor-icon">
                      <DsIcon name={videoTypeIconMap[videoType.name] ?? "film-strip"} size={16} />
                    </span>
                    <span>
                      <strong className="label-s-semibold">{videoType.name}</strong>
                      <span className="label-xs">{videoType.summary}</span>
                    </span>
                    {isSelected ? <DsIcon name="check-circle" size={16} /> : null}
                  </button>
                );
              })}
            </div>
          </>
        ) : null}

        {activeStepId === "voiceover" ? (
          <>
            <FollowUpIntro
              question="Do you provide voiceovers?"
            />
            <div className="studio-follow-up-answer-stack">
              <div className="studio-follow-up-chips" role="group" aria-label="Voiceover services">
                <FollowUpChip
                  label="Yes"
                  selected={answers.providesVoiceovers === true}
                  onClick={() => updateAnswers({
                    ...answers,
                    providesVoiceovers: true,
                    voiceoverOffering: answers.voiceoverOffering === "none" ? null : answers.voiceoverOffering,
                  })}
                />
                <FollowUpChip
                  label="No"
                  selected={answers.providesVoiceovers === false}
                  onClick={() => updateAnswersAndAdvance({ ...answers, providesVoiceovers: false, voiceoverOffering: "none" })}
                />
              </div>
              {answers.providesVoiceovers ? (
                <div className="studio-follow-up-conditional-question">
                  <span className="label-m-semibold">What kind of voiceovers do you provide?</span>
                  <div className="studio-follow-up-chips" role="group" aria-label="Voiceover types">
                    <FollowUpChip label="Human" selected={answers.voiceoverOffering === "human"} onClick={() => updateAnswersAndAdvance({ ...answers, voiceoverOffering: "human" })} />
                    <FollowUpChip label="AI" selected={answers.voiceoverOffering === "ai"} onClick={() => updateAnswersAndAdvance({ ...answers, voiceoverOffering: "ai" })} />
                    <FollowUpChip label="Both" selected={answers.voiceoverOffering === "both"} onClick={() => updateAnswersAndAdvance({ ...answers, voiceoverOffering: "both" })} />
                  </div>
                </div>
              ) : null}
            </div>
          </>
        ) : null}

        <footer className="studio-follow-up-footer">
          <div className="studio-follow-up-actions">
            {activeStepIndex > 0 ? (
              <button className="studio-follow-up-back label-s-semibold" type="button" onClick={goBack}>Back</button>
            ) : <span />}
            <button className="studio-follow-up-continue label-m-semibold" type="submit" disabled={!canContinue}>
              {activeStepIndex === stepIds.length - 1 ? "Review setup" : "Continue"}
            </button>
          </div>
        </footer>
      </form>
    </section>
  );
}

function FollowUpIntro({
  acknowledgement,
  question,
  supportingCopy,
}: {
  acknowledgement?: string;
  question: string;
  supportingCopy?: string;
}) {
  return (
    <div className="studio-follow-up-intro">
      {acknowledgement ? <p className="paragraph-s">{acknowledgement}</p> : null}
      <h1 className="headings-m-bold" id="studio-follow-up-heading">{question}</h1>
      {supportingCopy ? <p className="paragraph-s">{supportingCopy}</p> : null}
    </div>
  );
}

function FollowUpChip({
  label,
  onClick,
  selected,
}: {
  label: string;
  onClick: () => void;
  selected: boolean;
}) {
  return (
    <button
      className={`studio-follow-up-chip label-s-semibold ${selected ? "selected" : ""}`}
      type="button"
      aria-pressed={selected}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function getCanContinue(stepId: StudioFollowUpStepId, answers: StudioFollowUpAnswers) {
  if (stepId === "contextual") return answers.contextualAnswer.trim().length > 0;
  if (stepId === "production-model") {
    return answers.productionModel === "post-production-only"
      || (answers.productionModel === "shoot-and-post" && answers.productionScale !== null);
  }
  if (stepId === "video-types") return answers.videoTypeIds.length > 0;
  return answers.providesVoiceovers === false
    || (answers.providesVoiceovers === true && answers.voiceoverOffering !== null);
}
