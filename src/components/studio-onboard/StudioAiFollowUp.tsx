"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { Checkbox } from "../../../Brisk DS/src/app/components/Checkbox";
import { Input } from "../../../Brisk DS/src/app/components/Input";
import { videoTypeIconMap } from "@/components/brief/videoTypeIcons";
import { DsIcon } from "@/components/video-review/DsIcon";
import type { BriefVideoTypeId } from "@/data/brief";
import type {
  StudioCustomVideoType,
  StudioCustomVideoTypeIconId,
  StudioFollowUpAnswers,
  StudioFollowUpStepId,
  StudioOnboardingScenario,
} from "@/data/studio-onboard";
import { defaultStudioCustomVideoTypeIconId } from "@/data/studio-onboard";

export type { StudioFollowUpAnswers } from "@/data/studio-onboard";

const customAnswerOption = "Something else";
const answerAdvanceDelayMs = 180;
const defaultCustomVideoTypeIcon = defaultStudioCustomVideoTypeIconId;

const customVideoTypeIconOptions = [
  { id: "circles-three", label: "Shapes" },
  { id: "bezier-curve", label: "Motion" },
  { id: "file-video", label: "Video file" },
  { id: "fire-simple", label: "Energy" },
  { id: "folder", label: "Folder" },
  { id: "users-three", label: "People" },
  { id: "image-square", label: "Image" },
  { id: "globe", label: "Globe" },
  { id: "pen-nib", label: "Pen" },
  { id: "smiley", label: "Smile" },
] as const satisfies readonly { id: StudioCustomVideoTypeIconId; label: string }[];

function resolveCustomVideoTypeIcon(icon: StudioCustomVideoTypeIconId | null | undefined) {
  return customVideoTypeIconOptions.some((option) => option.id === icon)
    ? icon as StudioCustomVideoTypeIconId
    : defaultCustomVideoTypeIcon;
}

function normaliseCustomVideoTypes(answers: StudioFollowUpAnswers | null | undefined): StudioCustomVideoType[] {
  if (answers?.customVideoTypes?.length) {
    return answers.customVideoTypes
      .filter((videoType) => videoType.name.trim().length > 0)
      .map((videoType) => ({
        name: videoType.name.trim(),
        iconId: resolveCustomVideoTypeIcon(videoType.iconId),
      }));
  }

  const legacyName = answers?.customVideoType?.trim();
  return legacyName ? [{
    name: legacyName,
    iconId: resolveCustomVideoTypeIcon(answers?.customVideoTypeIcon),
  }] : [];
}

type StudioVideoTypeOption = {
  id: BriefVideoTypeId;
  label: string;
};

const primaryVideoTypeOptions = [
  { id: "Animation", label: "Animations" },
  { id: "Brand Film", label: "Brand films" },
  { id: "Case Study / Testimonial", label: "Case studies" },
  { id: "Documentary", label: "Documentaries" },
  { id: "Event", label: "Event videos" },
  { id: "Explainer", label: "Explainers" },
  { id: "Internal Comms", label: "Internal communications" },
  { id: "Music Video", label: "Music videos" },
  { id: "Product / Demo", label: "Product demos" },
  { id: "Short-Form / Reels", label: "Social videos" },
  { id: "Training / How To", label: "Training videos" },
  { id: "Commercial / TVC", label: "TV Ads" },
] as const satisfies readonly StudioVideoTypeOption[];

const additionalVideoTypeOptions = [
  { id: "AI Video", label: "AI video" },
  { id: "Fashion / Lookbook", label: "Fashion films" },
  { id: "Podcast", label: "Podcasts" },
  { id: "Real Estate", label: "Property videos" },
  { id: "Wedding / Events", label: "Wedding films" },
] as const satisfies readonly StudioVideoTypeOption[];

type StudioAiFollowUpProps = {
  initialAnswers?: StudioFollowUpAnswers | null;
  initialStepId?: StudioFollowUpStepId;
  scenario: StudioOnboardingScenario;
  onAnswersChange: (answers: StudioFollowUpAnswers) => void;
  onBack: () => void;
  onContinue: (answers: StudioFollowUpAnswers) => void;
  onStepChange?: (stepId: StudioFollowUpStepId) => void;
};

export function StudioAiFollowUp({
  initialAnswers,
  initialStepId = "contextual",
  scenario,
  onAnswersChange,
  onBack,
  onContinue,
  onStepChange,
}: StudioAiFollowUpProps) {
  const [answers, setAnswers] = useState<StudioFollowUpAnswers>(() => initialAnswers ? {
    ...initialAnswers,
    customVideoTypes: normaliseCustomVideoTypes(initialAnswers),
    customVideoType: null,
    customVideoTypeIcon: null,
  } : {
    contextualAnswer: "",
    productionModel: null,
    productionScale: null,
    videoTypeIds: scenario.generatedSetup.videoTypeNames.filter((videoTypeId) => videoTypeId !== "Live Action"),
    customVideoTypes: [],
    customVideoType: null,
    customVideoTypeIcon: null,
  });
  const [activeStepId, setActiveStepId] = useState<StudioFollowUpStepId>(initialStepId);
  const [customAnswer, setCustomAnswer] = useState(() => {
    const initialAnswer = initialAnswers?.contextualAnswer ?? "";
    return scenario.suggestedAnswers.includes(initialAnswer) ? "" : initialAnswer;
  });
  const [isCustomAnswerSelected, setIsCustomAnswerSelected] = useState(() => {
    const initialAnswer = initialAnswers?.contextualAnswer ?? "";
    return initialAnswer.length > 0 && !scenario.suggestedAnswers.includes(initialAnswer);
  });
  const [showProductionScaleQuestion, setShowProductionScaleQuestion] = useState(() => (
    initialStepId === "production-model"
      && initialAnswers?.productionModel === "shoot-and-post"
  ));
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [showMoreVideoTypes, setShowMoreVideoTypes] = useState(() => Boolean(
    normaliseCustomVideoTypes(initialAnswers).length > 0
      || initialAnswers?.videoTypeIds.some((videoTypeId) => additionalVideoTypeOptions
        .some((option) => option.id === videoTypeId)),
  ));
  const [isCustomVideoTypeInputOpen, setIsCustomVideoTypeInputOpen] = useState(false);
  const [customVideoTypeDraft, setCustomVideoTypeDraft] = useState("");
  const [customVideoTypeIconDraft, setCustomVideoTypeIconDraft] = useState<StudioCustomVideoTypeIconId>(
    defaultCustomVideoTypeIcon,
  );
  const advanceTimerRef = useRef<number | null>(null);
  const showCustomAnswerOption = scenario.id !== "full-service";
  const isCustomAnswer = showCustomAnswerOption && isCustomAnswerSelected;
  const canContinue = getCanContinue(activeStepId, answers)
    && !(activeStepId === "video-types" && isCustomVideoTypeInputOpen);
  const usesProductionScale = answers.productionModel === "shoot-and-post";
  const questionCount = usesProductionScale ? 4 : 3;
  const questionNumber = activeStepId === "contextual"
    ? 1
    : activeStepId === "production-model"
      ? showProductionScaleQuestion ? 3 : 2
      : usesProductionScale ? 4 : 3;
  const showExplicitAction = isCustomAnswer || activeStepId === "video-types";

  useEffect(() => () => {
    if (advanceTimerRef.current !== null) {
      window.clearTimeout(advanceTimerRef.current);
    }
  }, []);

  function updateAnswers(nextAnswers: StudioFollowUpAnswers) {
    setAnswers(nextAnswers);
    onAnswersChange(nextAnswers);
  }

  function advanceAfterSelection(onAdvance: () => void) {
    if (advanceTimerRef.current !== null) {
      window.clearTimeout(advanceTimerRef.current);
    }

    setIsAdvancing(true);
    advanceTimerRef.current = window.setTimeout(() => {
      advanceTimerRef.current = null;
      setIsAdvancing(false);
      onAdvance();
    }, answerAdvanceDelayMs);
  }

  function goToStep(stepId: StudioFollowUpStepId) {
    setActiveStepId(stepId);
    onStepChange?.(stepId);
  }

  function selectContextualAnswer(contextualAnswer: string) {
    setCustomAnswer("");
    setIsCustomAnswerSelected(false);
    updateAnswers({ ...answers, contextualAnswer });
    advanceAfterSelection(() => goToStep("production-model"));
  }

  function selectProductionModel(productionModel: "shoot-and-post" | "post-production-only") {
    if (productionModel === "shoot-and-post") {
      updateAnswers({ ...answers, productionModel });
      advanceAfterSelection(() => setShowProductionScaleQuestion(true));
      return;
    }

    updateAnswers({
      ...answers,
      productionModel,
      productionScale: null,
    });
    advanceAfterSelection(() => goToStep("video-types"));
  }

  function selectProductionScale(productionScale: NonNullable<StudioFollowUpAnswers["productionScale"]>) {
    updateAnswers({ ...answers, productionScale });
    advanceAfterSelection(() => goToStep("video-types"));
  }

  function submitFollowUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canContinue) {
      return;
    }

    if (activeStepId === "video-types") {
      onContinue(answers);
      return;
    }

    if (activeStepId === "contextual" && isCustomAnswer) {
      goToStep("production-model");
    }
  }

  function goBack() {
    if (activeStepId === "contextual") {
      onBack();
      return;
    }

    if (activeStepId === "production-model" && showProductionScaleQuestion) {
      setShowProductionScaleQuestion(false);
      return;
    }

    if (activeStepId === "video-types") {
      setShowProductionScaleQuestion(answers.productionModel === "shoot-and-post");
      goToStep("production-model");
      return;
    }

    if (activeStepId === "production-model") {
      setShowProductionScaleQuestion(false);
      goToStep("contextual");
    }
  }

  function toggleVideoType(videoTypeId: BriefVideoTypeId) {
    const nextVideoTypeIds = answers.videoTypeIds.includes(videoTypeId)
      ? answers.videoTypeIds.filter((currentId) => currentId !== videoTypeId)
      : [...answers.videoTypeIds, videoTypeId];

    updateAnswers({ ...answers, videoTypeIds: nextVideoTypeIds });
  }

  function toggleMoreVideoTypes() {
    if (showMoreVideoTypes) {
      setCustomVideoTypeDraft("");
      setCustomVideoTypeIconDraft(defaultCustomVideoTypeIcon);
      setIsCustomVideoTypeInputOpen(false);
    }

    setShowMoreVideoTypes(!showMoreVideoTypes);
  }

  function openCustomVideoTypeInput() {
    setCustomVideoTypeDraft("");
    setCustomVideoTypeIconDraft(defaultCustomVideoTypeIcon);
    setIsCustomVideoTypeInputOpen(true);
  }

  function cancelCustomVideoTypeInput() {
    setCustomVideoTypeDraft("");
    setIsCustomVideoTypeInputOpen(false);
  }

  function selectCustomVideoTypeIcon(customVideoTypeIcon: StudioCustomVideoTypeIconId) {
    setCustomVideoTypeIconDraft(customVideoTypeIcon);
  }

  function addCustomVideoType() {
    const customVideoType = customVideoTypeDraft.trim();
    if (!customVideoType) return;

    setCustomVideoTypeDraft(customVideoType);
    setIsCustomVideoTypeInputOpen(false);
    updateAnswers({
      ...answers,
      customVideoTypes: [
        ...(answers.customVideoTypes ?? []),
        { name: customVideoType, iconId: customVideoTypeIconDraft },
      ],
      customVideoType: null,
      customVideoTypeIcon: null,
    });
  }

  function removeCustomVideoType(index: number) {
    updateAnswers({
      ...answers,
      customVideoTypes: (answers.customVideoTypes ?? []).filter((_, currentIndex) => currentIndex !== index),
    });
  }

  return (
    <section
      className={`studio-follow-up-stage ${activeStepId === "video-types" ? "video-types" : ""}`}
      aria-labelledby="studio-follow-up-heading"
    >
      <form
        className={`studio-follow-up-form ${activeStepId === "video-types" ? "video-types" : ""} ${activeStepId === "production-model" ? "production-model" : ""}`}
        onSubmit={submitFollowUp}
      >
        <div className="studio-follow-up-progress label-xs-semibold">
          Question {questionNumber} of {questionCount}
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
                  disabled={isAdvancing}
                  onClick={() => selectContextualAnswer(suggestedAnswer)}
                />
              ))}
              {showCustomAnswerOption ? (
                <FollowUpChip
                  label={customAnswerOption}
                  selected={isCustomAnswer}
                  disabled={isAdvancing}
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

        {activeStepId === "production-model" && !showProductionScaleQuestion ? (
          <>
            <FollowUpIntro
              question="Do you shoot footage, or do you only do post-production?"
            />
            <div className="studio-follow-up-answer-stack">
              <div className="studio-follow-up-chips" role="group" aria-label="Production model">
                <FollowUpChip
                  label="Shoot + post-production"
                  selected={answers.productionModel === "shoot-and-post"}
                  disabled={isAdvancing}
                  onClick={() => selectProductionModel("shoot-and-post")}
                />
                <FollowUpChip
                  label="Post-production only"
                  selected={answers.productionModel === "post-production-only"}
                  disabled={isAdvancing}
                  onClick={() => selectProductionModel("post-production-only")}
                />
              </div>
            </div>
          </>
        ) : null}

        {activeStepId === "production-model" && showProductionScaleQuestion ? (
          <>
            <FollowUpIntro question="What size are your crews?" />
            <div className="studio-follow-up-chips" role="group" aria-label="Typical production size">
              <FollowUpChip
                label="Small (1-3 people)"
                selected={answers.productionScale === "run-and-gun"}
                disabled={isAdvancing}
                onClick={() => selectProductionScale("run-and-gun")}
              />
              <FollowUpChip
                label="Large (4+ people)"
                selected={answers.productionScale === "larger-production"}
                disabled={isAdvancing}
                onClick={() => selectProductionScale("larger-production")}
              />
              <FollowUpChip
                label="Varies by project"
                selected={answers.productionScale === "varies"}
                disabled={isAdvancing}
                onClick={() => selectProductionScale("varies")}
              />
            </div>
          </>
        ) : null}

        {activeStepId === "video-types" ? (
          <>
            <FollowUpIntro
              question="What kinds of videos do you make?"
            />
            <div className="studio-follow-up-video-grid" role="group" aria-label="Video types offered">
              {primaryVideoTypeOptions.map((videoType) => {
                const isSelected = answers.videoTypeIds.includes(videoType.id);

                return (
                  <StudioVideoTypeCheckboxCard
                    key={videoType.id}
                    checked={isSelected}
                    disabled={isAdvancing}
                    iconName={videoTypeIconMap[videoType.id] ?? "film-strip"}
                    label={videoType.label}
                    onChange={() => toggleVideoType(videoType.id)}
                  />
                );
              })}
            </div>
            <button
              className="studio-review-text-button studio-video-types-more-action label-s-semibold"
              type="button"
              aria-controls="studio-additional-video-types"
              aria-expanded={showMoreVideoTypes}
              onClick={toggleMoreVideoTypes}
            >
              {showMoreVideoTypes ? "Show fewer options" : "Show more options"}
              <span className={showMoreVideoTypes ? "is-expanded" : ""}>
                <DsIcon name="caret-down" size={14} />
              </span>
            </button>
            {showMoreVideoTypes ? (
              <div
                className="studio-follow-up-video-grid"
                id="studio-additional-video-types"
                role="group"
                aria-label="Additional video types"
              >
                {additionalVideoTypeOptions.map((videoType) => {
                  const isSelected = answers.videoTypeIds.includes(videoType.id);

                  return (
                    <StudioVideoTypeCheckboxCard
                      key={videoType.id}
                      checked={isSelected}
                      disabled={isAdvancing}
                      iconName={videoTypeIconMap[videoType.id] ?? "film-strip"}
                      label={videoType.label}
                      onChange={() => toggleVideoType(videoType.id)}
                    />
                  );
                })}
                {(answers.customVideoTypes ?? []).map((customVideoType, index) => (
                  <StudioVideoTypeCheckboxCard
                    checked
                    disabled={isAdvancing}
                    iconName={customVideoType.iconId}
                    key={`${customVideoType.name}-${index}`}
                    label={customVideoType.name}
                    onChange={() => removeCustomVideoType(index)}
                  />
                ))}
              </div>
            ) : null}
            {showMoreVideoTypes && !isCustomVideoTypeInputOpen ? (
              <div className="studio-follow-up-custom-video-type-action">
                <Button size="S" type="button" variant="secondary" onClick={openCustomVideoTypeInput}>
                  <span className="studio-follow-up-custom-video-type-button-content">
                    <DsIcon name="plus" size={14} />
                    {answers.customVideoTypes?.length ? "Add another video type" : "Add custom"}
                  </span>
                </Button>
              </div>
            ) : null}
            {showMoreVideoTypes && isCustomVideoTypeInputOpen ? (
              <div className="studio-follow-up-custom-video-type">
                <Input
                  label="Video type"
                  placeholder="e.g. Recruitment films"
                  size="S"
                  value={customVideoTypeDraft}
                  onChange={(event) => setCustomVideoTypeDraft(event.target.value)}
                />
                <fieldset className="studio-follow-up-custom-video-type-icons">
                  <legend className="label-s-semibold">Choose an icon</legend>
                  <div className="studio-follow-up-custom-video-type-icon-grid">
                    {customVideoTypeIconOptions.map((iconOption) => {
                      const isSelected = customVideoTypeIconDraft === iconOption.id;

                      return (
                        <label
                          className={`studio-follow-up-custom-video-type-icon ${isSelected ? "selected" : ""}`}
                          key={iconOption.id}
                          title={iconOption.label}
                        >
                          <input
                            className="sr-only"
                            type="radio"
                            name="custom-video-type-icon"
                            value={iconOption.id}
                            checked={isSelected}
                            onChange={() => selectCustomVideoTypeIcon(iconOption.id)}
                          />
                          <DsIcon name={iconOption.id} size={16} />
                          <span className="sr-only">{iconOption.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
                <div className="studio-follow-up-custom-video-type-actions">
                  <Button size="S" type="button" variant="ghost" onClick={cancelCustomVideoTypeInput}>Cancel</Button>
                  <Button
                    size="S"
                    type="button"
                    variant="secondary"
                    disabled={!customVideoTypeDraft.trim()}
                    onClick={addCustomVideoType}
                  >
                    Add
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        <footer className="studio-follow-up-footer">
          <div className="studio-follow-up-actions">
            <button
              className="studio-follow-up-back label-s-semibold"
              type="button"
              onClick={goBack}
              disabled={isAdvancing}
            >
              Back
            </button>
            {showExplicitAction ? (
              <button className="studio-follow-up-continue label-m-semibold" type="submit" disabled={!canContinue}>
                Continue
              </button>
            ) : <span />}
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
  disabled,
  label,
  onClick,
  selected,
}: {
  disabled?: boolean;
  label: string;
  onClick: () => void;
  selected: boolean;
}) {
  return (
    <button
      className={`studio-follow-up-chip label-s-semibold ${selected ? "selected" : ""}`}
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function StudioVideoTypeCheckboxCard({
  checked,
  disabled,
  iconName,
  label,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  iconName: Parameters<typeof DsIcon>[0]["name"];
  label: string;
  onChange: () => void;
}) {
  return (
    <div
      className={`studio-video-type-editor-option studio-onboarding-video-type-option ${checked ? "selected" : ""} ${disabled ? "is-disabled" : ""}`}
    >
      <span className="studio-video-type-editor-icon">
        <DsIcon name={iconName} size={16} />
      </span>
      <div className="studio-onboarding-video-type-checkbox">
        <Checkbox
          label={label}
          checked={checked}
          checkedIcon={<DsIcon name="check" size={14} />}
          disabled={disabled}
          onChange={onChange}
        />
      </div>
    </div>
  );
}

function getCanContinue(stepId: StudioFollowUpStepId, answers: StudioFollowUpAnswers) {
  if (stepId === "contextual") return answers.contextualAnswer.trim().length > 0;
  if (stepId === "production-model") {
    return answers.productionModel === "post-production-only"
      || (answers.productionModel === "shoot-and-post" && answers.productionScale !== null);
  }
  if (stepId === "video-types") {
    return answers.videoTypeIds.length > 0 || Boolean(answers.customVideoTypes?.length);
  }
  return false;
}
