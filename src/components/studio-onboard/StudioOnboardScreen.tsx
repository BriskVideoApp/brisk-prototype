"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { Input } from "../../../Brisk DS/src/app/components/Input";
import { BriefGuidedExperience } from "@/components/brief/BriefPage";
import { videoTypeIconMap } from "@/components/brief/videoTypeIcons";
import {
  StudioAiFollowUp,
  type StudioFollowUpAnswers,
} from "@/components/studio-onboard/StudioAiFollowUp";
import { StudioAiQuestion } from "@/components/studio-onboard/StudioAiQuestion";
import { StudioPreviewLogo } from "@/components/studio-onboard/StudioClientPortalPreview";
import { GeneratedStudioSetup } from "@/components/studio-onboard/GeneratedStudioSetup";
import { DsIcon } from "@/components/video-review/DsIcon";
import {
  briefVideoTypeDetails,
  createInitialBriefFields,
  type BriefFieldId,
  type BriefVideoTypeId,
} from "@/data/brief";
import {
  cloneStudioBriefConfiguration,
  createStudioReviewDraft,
  selectStudioOnboardingScenario,
  type StudioOnboardingAnswer,
  type StudioReviewDraft,
} from "@/data/studio-onboard";

type StudioOnboardView = "sign-in" | "ai-setup";
type StudioSignInMethod = "google" | "magic-link";
type StudioAiPhase = "question" | "analysing" | "follow-up" | "review-handoff";
type StudioOnboardStepId = "ai-setup" | "follow-up" | "review";

type StudioOnboardStep = {
  id: StudioOnboardStepId;
  label: string;
};

const studioOnboardSteps: readonly StudioOnboardStep[] = [
  { id: "ai-setup", label: "AI setup" },
  { id: "follow-up", label: "Follow-up" },
  { id: "review", label: "Review" },
];

export function StudioOnboardScreen() {
  const router = useRouter();
  const [view, setView] = useState<StudioOnboardView>("sign-in");
  const [signInMethod, setSignInMethod] = useState<StudioSignInMethod | null>(null);
  const [workEmail, setWorkEmail] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [studioAnswer, setStudioAnswer] = useState<StudioOnboardingAnswer | null>(null);
  const [aiPhase, setAiPhase] = useState<StudioAiPhase>("question");
  const [followUpAnswers, setFollowUpAnswers] = useState<StudioFollowUpAnswers | null>(null);
  const [hasCompletedFollowUps, setHasCompletedFollowUps] = useState(false);
  const [hasAnalysedStudio, setHasAnalysedStudio] = useState(false);
  const [reviewDraft, setReviewDraft] = useState<StudioReviewDraft | null>(null);
  const [openManualSetupOnReview, setOpenManualSetupOnReview] = useState(false);

  function enterStudioSetup(method: StudioSignInMethod) {
    setSignInMethod(method);
    setView("ai-setup");
  }

  function requestMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!workEmail.trim()) {
      return;
    }

    setSignInMethod("magic-link");
    setMagicLinkSent(true);
  }

  function analyseStudio(answer: StudioOnboardingAnswer) {
    const scenario = selectStudioOnboardingScenario(answer);

    setStudioAnswer(answer);
    setFollowUpAnswers(null);
    setHasCompletedFollowUps(false);
    setHasAnalysedStudio(true);
    setReviewDraft(createStudioReviewDraft(answer, scenario));
    setOpenManualSetupOnReview(false);
    setAiPhase("follow-up");
  }

  function completeStudioAnalysis() {
    setAiPhase(reviewDraft ? "review-handoff" : "question");
  }

  function updateStudioDraft(answer: StudioOnboardingAnswer) {
    setStudioAnswer(answer);
    setFollowUpAnswers(null);
    setHasCompletedFollowUps(false);
    setHasAnalysedStudio(false);
    setReviewDraft(null);
  }

  function updateFollowUpAnswers(answers: StudioFollowUpAnswers) {
    setFollowUpAnswers(answers);
    setHasCompletedFollowUps(false);
  }

  function completeFollowUps(answers: StudioFollowUpAnswers) {
    setFollowUpAnswers(answers);
    setHasCompletedFollowUps(true);

    if (studioAnswer) {
      const scenario = selectStudioOnboardingScenario(studioAnswer);
      const generatedDraft = reviewDraft ?? createStudioReviewDraft(studioAnswer, scenario);
      const excludedFieldIds = answers.voiceoverOffering === "none"
        ? [...new Set([...generatedDraft.briefConfiguration.excludedFieldIds, "voiceover" as const])]
        : generatedDraft.briefConfiguration.excludedFieldIds.filter((fieldId) => fieldId !== "voiceover");

      setReviewDraft({
        ...generatedDraft,
        studioType: answers.productionModel === "post-production-only"
          ? "Post-production studio"
          : generatedDraft.studioType,
        videoTypeIds: [...answers.videoTypeIds],
        briefConfiguration: {
          ...generatedDraft.briefConfiguration,
          excludedFieldIds,
        },
      });
    }

    setOpenManualSetupOnReview(false);
    setAiPhase("analysing");
  }

  function startAgain() {
    setStudioAnswer(null);
    setFollowUpAnswers(null);
    setHasCompletedFollowUps(false);
    setHasAnalysedStudio(false);
    setReviewDraft(null);
    setOpenManualSetupOnReview(false);
    setAiPhase("question");
  }

  return (
    <div className="studio-onboard-shell">
      <StudioOnboardHeader />
      {view === "sign-in" ? (
        <StudioSignIn
          magicLinkSent={magicLinkSent}
          workEmail={workEmail}
          onContinue={() => enterStudioSetup(signInMethod ?? "magic-link")}
          onEmailChange={setWorkEmail}
          onEmailSubmit={requestMagicLink}
          onSignIn={enterStudioSetup}
        />
      ) : (
        <StudioAiSetupShell
          answer={studioAnswer}
          followUpAnswers={followUpAnswers}
          hasCompletedFollowUps={hasCompletedFollowUps}
          hasAnalysedStudio={hasAnalysedStudio}
          phase={aiPhase}
          reviewDraft={reviewDraft}
          onAnalyse={analyseStudio}
          onAnalysisComplete={completeStudioAnalysis}
          onSelectStep={(stepId) => {
            if (stepId === "ai-setup") setAiPhase("question");
            if (stepId === "follow-up" && hasAnalysedStudio) setAiPhase("follow-up");
            if (stepId === "review" && hasCompletedFollowUps && reviewDraft) {
              setAiPhase("review-handoff");
            }
          }}
          onStartAgain={startAgain}
          onStudioDraftChange={updateStudioDraft}
          onFollowUp={completeFollowUps}
          onFollowUpAnswersChange={updateFollowUpAnswers}
          openManualSetupOnReview={openManualSetupOnReview}
          onManualSetupResolved={() => setOpenManualSetupOnReview(false)}
          onReviewDraftChange={setReviewDraft}
          onUseSetup={() => {
            router.push("/active-videos");
          }}
        />
      )}
    </div>
  );
}

function StudioOnboardHeader() {
  return (
    <header className="studio-onboard-header">
      <Link className="studio-onboard-brand" href="/active-videos" aria-label="Brisk dashboard">
        <Image src="/assets/logos/brisk.svg" alt="" width={24} height={16} priority />
        <span className="label-m-semibold">Brisk</span>
      </Link>
    </header>
  );
}

function StudioSignIn({
  magicLinkSent,
  workEmail,
  onContinue,
  onEmailChange,
  onEmailSubmit,
  onSignIn,
}: {
  magicLinkSent: boolean;
  workEmail: string;
  onContinue: () => void;
  onEmailChange: (email: string) => void;
  onEmailSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSignIn: (method: StudioSignInMethod) => void;
}) {
  return (
    <main className="studio-onboard-entry">
      <section className="studio-sign-in-card" aria-labelledby="studio-sign-in-heading">
        <div className="studio-sign-in-intro">
          <div>
            <h1 className="headings-m-bold" id="studio-sign-in-heading">
              Set up your studio
            </h1>
            <p className="paragraph-s">
              Brisk will create your workspace, client brief and first project in a few minutes.
            </p>
          </div>
        </div>

        {magicLinkSent ? (
          <div className="studio-magic-link-state" role="status">
            <span className="studio-magic-link-icon">
              <DsIcon name="check-circle" size={20} />
            </span>
            <div>
              <h2 className="headings-2xs-bold">Check your inbox</h2>
              <p className="paragraph-s">
                We sent a mocked sign-in link to <strong>{workEmail}</strong>.
              </p>
            </div>
            <Button size="M" type="button" variant="primary" onClick={onContinue} className="studio-full-width-button">
              Continue to Studio setup
            </Button>
          </div>
        ) : (
          <>
            <div className="studio-sign-in-options">
              <Button
                size="M"
                type="button"
                variant="primary"
                onClick={() => onSignIn("google")}
                className="studio-full-width-button studio-google-button"
              >
                <Image src="/assets/logos/google.svg" alt="" width={20} height={20} />
                Continue with Google
              </Button>
            </div>

            <div className="studio-sign-in-divider" aria-hidden="true">
              <span />
              <strong className="label-xs-semibold">or</strong>
              <span />
            </div>

            <form className="studio-email-sign-in" onSubmit={onEmailSubmit}>
              <Input
                label="Work email"
                type="email"
                placeholder="you@yourstudio.com"
                value={workEmail}
                onChange={(event) => onEmailChange(event.target.value)}
              />
              <Button size="M" type="submit" variant="secondary" className="studio-full-width-button">
                Email me a sign-in link
              </Button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}

function StudioAiSetupShell({
  answer,
  followUpAnswers,
  hasCompletedFollowUps,
  hasAnalysedStudio,
  phase,
  reviewDraft,
  onAnalyse,
  onAnalysisComplete,
  onSelectStep,
  onStartAgain,
  onStudioDraftChange,
  onFollowUp,
  onFollowUpAnswersChange,
  openManualSetupOnReview,
  onManualSetupResolved,
  onReviewDraftChange,
  onUseSetup,
}: {
  answer: StudioOnboardingAnswer | null;
  followUpAnswers: StudioFollowUpAnswers | null;
  hasCompletedFollowUps: boolean;
  hasAnalysedStudio: boolean;
  phase: StudioAiPhase;
  reviewDraft: StudioReviewDraft | null;
  onAnalyse: (answer: StudioOnboardingAnswer) => void;
  onAnalysisComplete: () => void;
  onSelectStep: (stepId: StudioOnboardStepId) => void;
  onStartAgain: () => void;
  onStudioDraftChange: (answer: StudioOnboardingAnswer) => void;
  onFollowUp: (answers: StudioFollowUpAnswers) => void;
  onFollowUpAnswersChange: (answers: StudioFollowUpAnswers) => void;
  openManualSetupOnReview: boolean;
  onManualSetupResolved: () => void;
  onReviewDraftChange: (draft: StudioReviewDraft) => void;
  onUseSetup: () => void;
}) {
  const activeStepId: StudioOnboardStepId =
    phase === "follow-up"
      ? "follow-up"
      : phase === "review-handoff" || (phase === "analysing" && hasCompletedFollowUps)
        ? "review"
        : "ai-setup";
  const scenario = answer ? selectStudioOnboardingScenario(answer) : null;

  return (
    <main className="studio-onboard-flow">
      <StudioOnboardProgress
        activeStepId={activeStepId}
        availableStepIds={[
          "ai-setup",
          ...(hasAnalysedStudio ? (["follow-up"] as const) : []),
          ...(hasCompletedFollowUps ? (["review"] as const) : []),
        ]}
        onSelectStep={onSelectStep}
      />
      {phase === "question" ? (
        <section className="studio-onboard-stage" aria-labelledby="studio-ai-setup-heading">
          <div className="studio-ai-question-centre">
            <h1 className="headings-m-bold" id="studio-ai-setup-heading">
              Tell Brisk about your studio
            </h1>
            <StudioAiQuestion
              initialAnswer={answer}
              onAnalyse={onAnalyse}
              onDraftChange={onStudioDraftChange}
            />
          </div>
        </section>
      ) : null}
      {phase === "analysing" ? (
        <StudioAnalysisHandoff onComplete={onAnalysisComplete} />
      ) : null}
      {phase === "follow-up" && scenario ? (
        <StudioAiFollowUp
          initialAnswers={followUpAnswers}
          scenario={scenario}
          onAnswersChange={onFollowUpAnswersChange}
          onContinue={onFollowUp}
        />
      ) : null}
      {phase === "review-handoff" && reviewDraft ? (
        <GeneratedStudioSetup
          draft={reviewDraft}
          openManualSetupInitially={openManualSetupOnReview}
          onDraftChange={onReviewDraftChange}
          onManualSetupResolved={onManualSetupResolved}
          onStartAgain={onStartAgain}
          onUseSetup={onUseSetup}
        />
      ) : null}
    </main>
  );
}

function StudioFirstProjectHandoff({ draft }: { draft: StudioReviewDraft }) {
  const router = useRouter();
  const initialVideoTypeId: BriefVideoTypeId = draft.videoTypeIds[0] ?? "Brand Film";
  const [screen, setScreen] = useState<"setup" | "portal-preview" | "complete">("setup");
  const [projectName, setProjectName] = useState("Good Citizens Impact Story");
  const [customerName, setCustomerName] = useState("Good Citizens");
  const [briefMode, setBriefMode] = useState<"preview" | "edit" | null>(null);
  const [projectBriefFields, setProjectBriefFields] = useState(createInitialBriefFields);
  const [projectBriefConfiguration, setProjectBriefConfiguration] = useState(() =>
    cloneStudioBriefConfiguration(draft.briefConfiguration));
  const [isRecommendedBriefSelected, setIsRecommendedBriefSelected] = useState(true);
  const [teamInviteMessage, setTeamInviteMessage] = useState("");
  const selectedVideoType = briefVideoTypeDetails.find((videoType) => videoType.name === initialVideoTypeId)
    ?? briefVideoTypeDetails[0];
  const briefSummary = `A client-facing ${selectedVideoType.name.toLocaleLowerCase("en-AU")} about ${customerName || "your client"}’s community impact programme.`;
  const canPreviewPortal = projectName.trim().length > 0 && customerName.trim().length > 0;

  function inviteTeam() {
    setTeamInviteMessage("You can invite your team from People after onboarding.");
  }

  function useRecommendedBrief() {
    setProjectBriefFields(createInitialBriefFields());
    setProjectBriefConfiguration(cloneStudioBriefConfiguration(draft.briefConfiguration));
    setIsRecommendedBriefSelected(true);
  }

  function toggleProjectBriefFieldExcluded(fieldId: BriefFieldId) {
    setProjectBriefConfiguration((currentConfiguration) => ({
      ...currentConfiguration,
      excludedFieldIds: currentConfiguration.excludedFieldIds.includes(fieldId)
        ? currentConfiguration.excludedFieldIds.filter((currentFieldId) => currentFieldId !== fieldId)
        : [...currentConfiguration.excludedFieldIds, fieldId],
    }));
    setIsRecommendedBriefSelected(false);
  }

  if (briefMode) {
    const isPreview = briefMode === "preview";

    return (
      <section
        className={`studio-first-project-brief studio-branded-brief studio-client-accent-${draft.brandAccentId}`}
        aria-labelledby="studio-first-project-brief-heading"
      >
        <header className="studio-review-brief-experience-header">
          <button className="studio-review-text-button label-s-semibold" type="button" onClick={() => setBriefMode(null)}>
            <DsIcon name="arrow-left" size={16} />
            Back to First project
          </button>
          <div>
            <h1 className="headings-s-bold" id="studio-first-project-brief-heading">
              {isPreview ? "Preview client Brief" : "Edit this project’s Brief"}
            </h1>
            <p className="paragraph-s">
              {isPreview
                ? "This is the six-step Brief your client will see before the project is shared."
                : "Changes apply to this project only. Your Studio default will not change."}
            </p>
          </div>
        </header>
        <BriefGuidedExperience
          doneLabel={isPreview ? "Back to First project" : "Save project Brief"}
          excludedFieldIds={projectBriefConfiguration.excludedFieldIds}
          excludedOptionValues={projectBriefConfiguration.excludedOptionValues}
          fields={projectBriefFields}
          readOnly={isPreview}
          studioName={draft.studioName}
          videoTypeIds={draft.videoTypeIds}
          onDone={() => {
            if (!isPreview) {
              setIsRecommendedBriefSelected(false);
            }
            setBriefMode(null);
          }}
          onFieldsChange={isPreview ? undefined : setProjectBriefFields}
          onToggleFieldExcluded={isPreview ? undefined : toggleProjectBriefFieldExcluded}
        />
      </section>
    );
  }

  if (screen === "complete") {
    return (
      <section className="studio-onboarding-complete" aria-labelledby="studio-onboarding-complete-heading">
        <span className="studio-onboarding-complete-icon"><DsIcon name="check" size={20} /></span>
        <div>
          <span className="label-xs-semibold">Setup complete</span>
          <h1 className="headings-m-bold" id="studio-onboarding-complete-heading">Your studio is ready</h1>
          <p className="paragraph-s">
            {projectName} is ready in Brief for {customerName}.
          </p>
        </div>
        <div className="studio-onboarding-complete-actions">
          <Button size="M" variant="secondary" onClick={inviteTeam}>Invite your team</Button>
          <Button size="M" variant="primary" onClick={() => router.push("/active-videos")}>Open Active Videos</Button>
        </div>
        {teamInviteMessage ? <p className="studio-first-project-team-message label-xs" role="status">{teamInviteMessage}</p> : null}
      </section>
    );
  }

  if (screen === "portal-preview") {
    return (
      <section className="studio-first-project-portal-screen" aria-labelledby="studio-first-project-portal-heading">
        <header className="studio-first-project-portal-heading">
          <span className="label-xs-semibold"><DsIcon name="eye" size={14} /> This is what your clients see</span>
          <h1 className="headings-s-bold" id="studio-first-project-portal-heading">Client portal preview</h1>
        </header>

        <article className={`studio-first-project-portal studio-client-accent-${draft.brandAccentId}`}>
          <header className="studio-first-project-portal-header">
            <StudioPreviewLogo draft={draft} />
            <div>
              <strong className="label-m-semibold">{draft.studioName}</strong>
              <span className="label-xs">Video production</span>
            </div>
          </header>
          <div className="studio-first-project-portal-content">
            <span className="studio-first-project-customer label-xs-semibold">{customerName}</span>
            <div className="studio-first-project-portal-title">
              <div>
                <h2 className="headings-s-bold">{projectName}</h2>
                <p className="paragraph-s">{briefSummary}</p>
              </div>
              <span className="studio-first-project-stage label-xs-semibold">
                <DsIcon name="clipboard-text" size={14} /> Brief
              </span>
            </div>
            <div className="studio-first-project-portal-card">
              <img src="/mock-thumbnails/good-citizens-purple.svg" alt="" />
              <div>
                <span className="label-xs">Next action</span>
                <strong className="headings-2xs-bold">Complete your project Brief</strong>
                <span className="label-s">Tell us what you need so we can prepare the project.</span>
              </div>
              <button className="studio-first-project-client-action label-s-semibold" type="button" onClick={() => setBriefMode("preview")}>
                Open project Brief
              </button>
            </div>
          </div>
        </article>

        <footer className="studio-first-project-portal-actions">
          <Button size="M" variant="secondary" onClick={() => setScreen("setup")}>Back to project</Button>
          <Button size="M" variant="secondary" onClick={inviteTeam}>Invite your team</Button>
          <Button size="M" variant="primary" onClick={() => setScreen("complete")}>Finish setup</Button>
        </footer>
        {teamInviteMessage ? <p className="studio-first-project-team-message label-xs" role="status">{teamInviteMessage}</p> : null}
      </section>
    );
  }

  return (
    <section className="studio-first-project" aria-labelledby="studio-first-project-heading">
      <header className="studio-first-project-heading">
        <span className="label-xs-semibold">{draft.studioName} is ready</span>
        <h1 className="headings-m-bold" id="studio-first-project-heading">Your first project is one click away</h1>
        <p className="paragraph-s">Start with a real project - even a test one.</p>
      </header>

      <div className="studio-first-project-layout">
        <div className="studio-first-project-details">
          <section className="studio-first-project-section" aria-labelledby="studio-first-project-details-heading">
            <h2 className="headings-xs-bold" id="studio-first-project-details-heading">Project details</h2>
            <Input label="Project name" value={projectName} onChange={(event) => setProjectName(event.target.value)} />
            <Input label="Customer name" value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
            <div className="studio-first-project-meta">
              <div>
                <span className="label-xs">Video type</span>
                <strong className="label-s-semibold">
                  <DsIcon name={videoTypeIconMap[selectedVideoType.name] ?? "film-strip"} size={16} />
                  {selectedVideoType.name}
                </strong>
              </div>
              <div>
                <span className="label-xs">Current stage</span>
                <strong className="label-s-semibold"><DsIcon name="clipboard-text" size={16} /> Brief</strong>
              </div>
            </div>
            <div className="studio-first-project-summary">
              <span className="label-xs">Brief summary</span>
              <p className="paragraph-s">{briefSummary}</p>
            </div>
          </section>

          <section className="studio-first-project-section" aria-labelledby="studio-first-project-brief-options-heading">
            <div className="studio-first-project-section-heading">
              <div>
                <h2 className="headings-xs-bold" id="studio-first-project-brief-options-heading">Client Brief</h2>
                <span className="label-s">Six guided questions</span>
              </div>
              {isRecommendedBriefSelected ? (
                <span className="studio-first-project-selection label-xs-semibold" role="status">
                  <DsIcon name="check-circle" size={14} /> Recommended
                </span>
              ) : (
                <span className="studio-first-project-selection customised label-xs-semibold" role="status">Project-specific</span>
              )}
            </div>
            <div className="studio-first-project-brief-actions">
              <Button size="S" variant="secondary" onClick={() => setBriefMode("preview")}>Preview client Brief</Button>
              <Button size="S" variant="secondary" onClick={() => setBriefMode("edit")}>Edit this project&apos;s Brief</Button>
              <Button size="S" variant="tertiary" onClick={useRecommendedBrief}>Use the recommended Brief</Button>
            </div>
            <p className="studio-first-project-scope label-xs">
              Changes apply only to this project. Your studio default will not change.
            </p>
          </section>
        </div>

        <aside className={`studio-first-project-preview-card studio-client-accent-${draft.brandAccentId}`} aria-label="Customer-facing project preview">
          <header>
            <StudioPreviewLogo draft={draft} />
            <div>
              <strong className="label-m-semibold">{draft.studioName}</strong>
              <span className="label-xs">Client portal</span>
            </div>
          </header>
          <img src="/mock-thumbnails/good-citizens-purple.svg" alt="" />
          <div className="studio-first-project-preview-copy">
            <span className="label-xs">{customerName || "Customer"}</span>
            <h2 className="headings-xs-bold">{projectName || "Untitled project"}</h2>
            <span className="studio-first-project-stage label-xs-semibold"><DsIcon name="clipboard-text" size={14} /> Brief</span>
          </div>
        </aside>
      </div>

      <footer className="studio-first-project-actions">
        <div>
          <Button size="M" variant="secondary" onClick={inviteTeam}>Invite your team</Button>
          {teamInviteMessage ? <span className="studio-first-project-team-message label-xs" role="status">{teamInviteMessage}</span> : null}
        </div>
        <Button size="M" variant="primary" onClick={() => {
          if (canPreviewPortal) {
            setScreen("portal-preview");
          }
        }}>
          Preview the client portal
        </Button>
      </footer>
    </section>
  );
}

function StudioAnalysisHandoff({
  onComplete,
}: {
  onComplete: () => void;
}) {
  useEffect(() => {
    const analysisTimer = window.setTimeout(onComplete, 900);

    return () => window.clearTimeout(analysisTimer);
  }, [onComplete]);

  return (
    <section className="studio-analysis-handoff" aria-labelledby="studio-analysis-heading" role="status">
      <span className="studio-analysis-icon">
        <DsIcon name="sparkle" size={20} />
      </span>
      <div>
        <h1 className="headings-m-bold" id="studio-analysis-heading">
          Learning how your studio works...
        </h1>
        <p className="paragraph-s">
          Brisk is preparing suggestions for your review. Nothing has been applied or published.
        </p>
      </div>
    </section>
  );
}

function StudioOnboardProgress({
  activeStepId,
  availableStepIds,
  onSelectStep,
}: {
  activeStepId: StudioOnboardStepId;
  availableStepIds: readonly StudioOnboardStepId[];
  onSelectStep: (stepId: StudioOnboardStepId) => void;
}) {
  const activeStepIndex = studioOnboardSteps.findIndex((step) => step.id === activeStepId);

  return (
    <nav className="studio-onboard-progress" aria-label="Studio setup progress">
      <ol>
        {studioOnboardSteps.map((step, index) => {
          const state = index < activeStepIndex ? "complete" : index === activeStepIndex ? "active" : "upcoming";
          const isAvailable = availableStepIds.includes(step.id);

          return (
            <li className={state} key={step.id} aria-current={state === "active" ? "step" : undefined}>
              <button
                className={`studio-progress-marker label-xs-semibold ${isAvailable ? "available" : ""}`}
                type="button"
                aria-label={`Go to ${step.label}`}
                disabled={!isAvailable}
                onClick={() => onSelectStep(step.id)}
              >
                {state === "complete" ? <DsIcon name="check" size={12} /> : index + 1}
              </button>
              <span className="studio-progress-label label-xs-semibold">{step.label}</span>
              {index < studioOnboardSteps.length - 1 ? <span className="studio-progress-connector" aria-hidden="true" /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
