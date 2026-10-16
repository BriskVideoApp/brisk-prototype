"use client";

import { ConfirmationDialog } from "../../../Brisk DS/src/app/components/ConfirmationDialog";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { Input } from "../../../Brisk DS/src/app/components/Input";
import { ClientAvatar } from "@/components/clients/ClientPrimitives";
import {
  StudioAiFollowUp,
} from "@/components/studio-onboard/StudioAiFollowUp";
import { StudioAiQuestion } from "@/components/studio-onboard/StudioAiQuestion";
import { usePeople } from "@/components/people/PeopleDataContext";
import { prototypeStudioPersonId } from "@/data/people";
import { DsIcon } from "@/components/video-review/DsIcon";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { useStudioSettings } from "@/components/settings/StudioSettingsContext";
import type { PrototypeOnboardingAiPhase, PrototypeOnboardingProgress } from "@/data/prototype-state";
import {
  createStudioReviewDraft,
  selectStudioOnboardingScenario,
  type StudioFollowUpAnswers,
  type StudioFollowUpStepId,
  type StudioOnboardingAnswer,
} from "@/data/studio-onboard";

type StudioSignInMethod = "google" | "magic-link";
type StudioOnboardStageId = "studio-setup" | "first-client";

type StudioOnboardStage = {
  id: StudioOnboardStageId;
  label: string;
};

const studioOnboardStages: readonly StudioOnboardStage[] = [
  { id: "studio-setup", label: "Set up Studio" },
  { id: "first-client", label: "Add first Client" },
];

type OnboardingHistoryStep = "sign-in" | "inbox" | "your-name" | "studio-name" | "contextual"
  | "production-model" | "production-scale" | "video-types" | "first-client";

const onboardingHistorySteps: readonly OnboardingHistoryStep[] = [
  "sign-in", "inbox", "your-name", "studio-name", "contextual", "production-model",
  "production-scale", "video-types", "first-client",
];
const onboardingStepQuery = "onboarding-step";

function readOnboardingHistoryStep(): OnboardingHistoryStep {
  const step = new URLSearchParams(window.location.search).get(onboardingStepQuery);
  if (step === "studio-description") return "studio-name";
  if (step === "brand-review") return "first-client";
  return onboardingHistorySteps.find((candidate) => candidate === step) ?? "sign-in";
}

function progressForHistoryStep(step: OnboardingHistoryStep): Partial<PrototypeOnboardingProgress> {
  if (step === "sign-in" || step === "inbox") return { view: "sign-in", step: "studio-setup" };
  if (step === "your-name" || step === "studio-name") return { view: "ai-setup", aiPhase: "question", step: "studio-setup" };
  if (step === "first-client") return { view: "first-project", step: "first-client" };
  return {
    view: "ai-setup",
    aiPhase: "follow-up",
    step: "studio-setup",
    followUpStepId: step === "production-scale" ? "production-model" : step,
  };
}

export function StudioOnboardScreen() {
  const { applyOnboardingSetup } = useStudioSettings();
  const { updatePersonIdentity } = usePeople();
  const { state, hasHydrated, updateOnboardingOwner, updateOnboardingProgress } = usePrototypeState();
  const {
    aiPhase,
    followUpAnswers,
    followUpStepId,
    reviewDraft,
    studioAnswer,
    view,
  } = state.onboarding;
  const [signInMethod, setSignInMethod] = useState<StudioSignInMethod | null>(null);
  const [workEmail, setWorkEmail] = useState("");
  const [ownerNameDraft, setOwnerNameDraft] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [showSetupSavedToast, setShowSetupSavedToast] = useState(false);
  const [historyStep, setHistoryStep] = useState<OnboardingHistoryStep>("sign-in");
  const updateProgressRef = useRef(updateOnboardingProgress);
  updateProgressRef.current = updateOnboardingProgress;

  useEffect(() => {
    if (!hasHydrated) return;
    setOwnerNameDraft(state.onboarding.ownerName ?? "");
    const restoreStep = () => {
      const requestedStep = new URLSearchParams(window.location.search).get(onboardingStepQuery);
      if (requestedStep === "brand-review") {
        const setupDraft = state.onboarding.reviewDraft;
        if (setupDraft && !state.onboarding.studioSetupCommitted) {
          applyOnboardingSetup(setupDraft);
          setShowSetupSavedToast(true);
        }
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set(onboardingStepQuery, "first-client");
        window.history.replaceState(window.history.state, "", currentUrl);
        updateProgressRef.current({ view: "first-project", step: "first-client" });
      }
      const step = readOnboardingHistoryStep();
      const historyState: unknown = window.history.state;
      const email = historyState && typeof historyState === "object"
        ? (historyState as Record<string, unknown>).briskOnboardingEmail : null;
      if (typeof email === "string") setWorkEmail(email);
      setMagicLinkSent(step === "inbox");
      setHistoryStep(step);
      updateProgressRef.current(progressForHistoryStep(step));
    };
    restoreStep();
    window.addEventListener("popstate", restoreStep);
    return () => window.removeEventListener("popstate", restoreStep);
  }, [applyOnboardingSetup, hasHydrated, state.onboarding.reviewDraft, state.onboarding.studioSetupCommitted]);

  function advanceToStep(step: OnboardingHistoryStep) {
    const url = new URL(window.location.href);
    url.searchParams.set(onboardingStepQuery, step);
    const currentHistoryState: unknown = window.history.state;
    const currentState = currentHistoryState && typeof currentHistoryState === "object"
      ? currentHistoryState as Record<string, unknown> : {};
    window.history.pushState({ ...currentState, briskOnboardingEmail: workEmail }, "", url);
    setHistoryStep(step);
  }

  useEffect(() => {
    if (!showSetupSavedToast) return;
    const timeout = window.setTimeout(() => setShowSetupSavedToast(false), 4000);
    return () => window.clearTimeout(timeout);
  }, [showSetupSavedToast]);

  useEffect(() => {
    document.querySelector<HTMLElement>(".prototype-test-content")?.scrollTo({ top: 0, left: 0 });
  }, [aiPhase, followUpStepId, state.onboarding.step, view]);

  function enterStudioSetup(method: StudioSignInMethod) {
    setSignInMethod(method);
    updateOnboardingProgress({ view: "ai-setup", aiPhase: "question", step: "studio-setup" });
    advanceToStep("your-name");
  }

  function saveOwnerName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = ownerNameDraft.trim();
    if (!name) return;
    updateOnboardingOwner(name, workEmail.trim());
    updatePersonIdentity(prototypeStudioPersonId, { name, ...(workEmail.trim() ? { email: workEmail.trim() } : {}) });
    updateOnboardingProgress({ view: "ai-setup", aiPhase: "question", step: "studio-setup" });
    advanceToStep("studio-name");
  }

  function requestMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!workEmail.trim()) {
      return;
    }

    setSignInMethod("magic-link");
    setMagicLinkSent(true);
    advanceToStep("inbox");
  }

  function analyseStudio(answer: StudioOnboardingAnswer) {
    const scenario = selectStudioOnboardingScenario(answer);

    updateOnboardingProgress({
      aiPhase: "follow-up",
      followUpAnswers: null,
      followUpStepId: "contextual",
      hasCompletedFollowUps: false,
      hasAnalysedStudio: true,
      reviewDraft: createStudioReviewDraft(answer, scenario),
      studioAnswer: answer,
    });
    advanceToStep("contextual");
  }

  function updateStudioDraft(answer: StudioOnboardingAnswer) {
    updateOnboardingProgress({
      studioAnswer: answer,
      followUpAnswers: null,
      followUpStepId: "contextual",
      hasCompletedFollowUps: false,
      hasAnalysedStudio: false,
      reviewDraft: null,
    });
  }

  function updateFollowUpAnswers(answers: StudioFollowUpAnswers) {
    updateOnboardingProgress({ followUpAnswers: answers, hasCompletedFollowUps: false });
  }

  function completeFollowUps(answers: StudioFollowUpAnswers) {
    let nextReviewDraft = reviewDraft;

    if (studioAnswer) {
      const scenarioAnswer = answers.productionModel === "post-production-only"
        ? { ...studioAnswer, studioDescription: "post-production studio" }
        : answers.videoTypeIds.includes("Animation")
          ? { ...studioAnswer, studioDescription: "animation studio" }
          : { ...studioAnswer, studioDescription: "" };
      const scenario = selectStudioOnboardingScenario(scenarioAnswer);
      const generatedDraft = createStudioReviewDraft(studioAnswer, scenario);

      nextReviewDraft = {
        ...generatedDraft,
        studioType: answers.productionModel === "post-production-only"
          ? "Post-production studio"
          : generatedDraft.studioType,
        videoTypeIds: [...answers.videoTypeIds],
        customVideoTypes: answers.customVideoTypes?.map((videoType) => ({ ...videoType })) ?? [],
        customVideoType: answers.customVideoTypes?.[0]?.name ?? answers.customVideoType,
      };
    }

    if (!nextReviewDraft) return;

    applyOnboardingSetup(nextReviewDraft);
    updateOnboardingProgress({
      aiPhase: "follow-up",
      followUpAnswers: answers,
      hasCompletedFollowUps: true,
      reviewDraft: nextReviewDraft,
      view: "first-project",
      step: "first-client",
    });
    advanceToStep("first-client");
    setShowSetupSavedToast(true);
  }

  function revisitOnboardingStage(stageId: StudioOnboardStageId) {
    if (stageId === "studio-setup") {
      updateOnboardingProgress({
        view: "ai-setup",
        step: "studio-setup",
        aiPhase: "question",
      });
      advanceToStep("studio-name");
      return;
    }

    if (stageId === "first-client") {
      updateOnboardingProgress({ view: "first-project", step: "first-client" });
      advanceToStep("first-client");
    }
  }

  if (!hasHydrated) {
    return <div className="studio-onboard-shell is-sign-in"><StudioOnboardHeader /></div>;
  }

  return (
    <div className={`studio-onboard-shell${view === "sign-in" ? " is-sign-in" : ""}`}>
      <StudioOnboardHeader />
      {view !== "sign-in" ? (
        <StudioOnboardProgress
          activeStageId={getActiveOnboardingStage(state.onboarding)}
          onStageSelect={revisitOnboardingStage}
        />
      ) : null}
      {view === "sign-in" ? (
        <StudioSignIn
          magicLinkSent={magicLinkSent}
          workEmail={workEmail}
          onContinue={() => enterStudioSetup(signInMethod ?? "magic-link")}
          onEmailChange={setWorkEmail}
          onEmailSubmit={requestMagicLink}
          onSignIn={enterStudioSetup}
        />
      ) : historyStep === "your-name" ? (
        <main className="studio-onboard-flow">
          <section className="studio-onboard-stage" aria-labelledby="studio-owner-name-heading">
            <div className="studio-ai-question-centre">
              <h1 className="headings-m-bold" id="studio-owner-name-heading">What&apos;s your name?</h1>
              <form className="studio-ai-question" onSubmit={saveOwnerName}>
                <Input
                  label="Your name"
                  autoComplete="name"
                  value={ownerNameDraft}
                  onChange={(event) => setOwnerNameDraft(event.target.value)}
                />
                <footer className="studio-follow-up-footer">
                  <div className="studio-follow-up-actions">
                    <Button size="S" variant="secondary" className="studio-follow-up-back" type="button" onClick={() => window.history.back()}>Back</Button>
                    <Button size="M" variant="primary" className="studio-follow-up-continue" type="submit" disabled={!ownerNameDraft.trim()}>Continue</Button>
                  </div>
                </footer>
              </form>
            </div>
          </section>
        </main>
      ) : view === "first-project" ? (
        <>
          <StudioFirstClientHandoff />
          {showSetupSavedToast ? (
            <div className="studio-onboarding-toast label-s-semibold" role="status">
              <DsIcon name="check-circle" size={16} /> Studio setup saved
            </div>
          ) : null}
        </>
      ) : (
        <StudioAiSetupShell
          answer={studioAnswer}
          followUpAnswers={followUpAnswers}
          phase={aiPhase}
          onAnalyse={analyseStudio}
          historyStep={historyStep}
          onBackToSignIn={() => window.history.back()}
          onBackToStudioQuestion={() => window.history.back()}
          onStudioDraftChange={updateStudioDraft}
          onFollowUp={completeFollowUps}
          onFollowUpAnswersChange={updateFollowUpAnswers}
          followUpStepId={followUpStepId}
          onFollowUpStepChange={(stepId) => {
            updateOnboardingProgress({ followUpStepId: stepId });
            advanceToStep(stepId);
          }}
        />
      )}
    </div>
  );
}

function StudioOnboardHeader() {
  return (
    <header className="studio-onboard-header">
      <div className="studio-onboard-brand" aria-label="Brisk">
        <Image src="/assets/logos/brisk.svg" alt="" width={24} height={16} priority />
        <span className="label-m-semibold">Brisk</span>
      </div>
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
  const [workEmailIsValid, setWorkEmailIsValid] = useState(false);

  return (
    <main className="studio-onboard-entry studio-sign-up-entry">
      <section
        className="studio-sign-in-card"
        aria-labelledby={magicLinkSent ? "studio-magic-link-heading" : "studio-sign-in-heading"}
      >
        {magicLinkSent ? (
          <div className="studio-magic-link-state" role="status">
            <div>
              <h1 className="headings-m-bold" id="studio-magic-link-heading">Check your inbox</h1>
              <p className="paragraph-s">
                We sent a sign-in link to <strong>{workEmail}</strong>.
              </p>
            </div>
            <Button size="M" type="button" variant="primary" onClick={onContinue} className="studio-full-width-button">
              Open sign-in link
            </Button>
          </div>
        ) : (
          <>
            <div className="studio-sign-in-intro">
              <div>
                <h1 className="headings-m-bold" id="studio-sign-in-heading">
                  Start your Brisk studio
                </h1>
                <p className="paragraph-s">
                  Create your workspace, add your first Client and start a real video in under 10 minutes.
                </p>
              </div>
            </div>

            <div className="studio-sign-in-options">
              <Button
                size="M"
                type="button"
                variant={workEmailIsValid ? "secondary" : "primary"}
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
                id="studio-work-email"
                name="email"
                autoComplete="email"
                label="Work email"
                type="email"
                placeholder="you@yourstudio.com"
                value={workEmail}
                onChange={(event) => {
                  onEmailChange(event.target.value);
                  setWorkEmailIsValid(Boolean(event.target.value.trim()) && event.target.validity.valid);
                }}
              />
              <Button
                size="M"
                type="submit"
                variant={workEmailIsValid ? "primary" : "secondary"}
                className="studio-full-width-button"
              >
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
  followUpStepId,
  historyStep,
  phase,
  onAnalyse,
  onBackToSignIn,
  onBackToStudioQuestion,
  onStudioDraftChange,
  onFollowUp,
  onFollowUpAnswersChange,
  onFollowUpStepChange,
}: {
  answer: StudioOnboardingAnswer | null;
  followUpAnswers: StudioFollowUpAnswers | null;
  followUpStepId: StudioFollowUpStepId;
  historyStep: OnboardingHistoryStep;
  phase: PrototypeOnboardingAiPhase;
  onAnalyse: (answer: StudioOnboardingAnswer) => void;
  onBackToSignIn: () => void;
  onBackToStudioQuestion: () => void;
  onStudioDraftChange: (answer: StudioOnboardingAnswer) => void;
  onFollowUp: (answers: StudioFollowUpAnswers) => void;
  onFollowUpAnswersChange: (answers: StudioFollowUpAnswers) => void;
  onFollowUpStepChange: (stepId: StudioFollowUpStepId) => void;
}) {
  const scenario = answer ? selectStudioOnboardingScenario(answer) : null;

  return (
    <main className="studio-onboard-flow">
      {phase === "question" ? (
        <section className="studio-onboard-stage" aria-labelledby="studio-ai-setup-heading">
          <div className="studio-ai-question-centre">
            <h1 className="headings-m-bold" id="studio-ai-setup-heading">
              What&apos;s your studio called?
            </h1>
            <StudioAiQuestion
              initialAnswer={answer}
              onAnalyse={onAnalyse}
              onBack={onBackToSignIn}
              onDraftChange={onStudioDraftChange}
            />
          </div>
        </section>
      ) : null}
      {phase === "follow-up" && scenario ? (
        <StudioAiFollowUp
          key={historyStep}
          initialAnswers={followUpAnswers}
          initialStepId={followUpStepId}
          scenario={scenario}
          onAnswersChange={onFollowUpAnswersChange}
          onBack={onBackToStudioQuestion}
          onContinue={onFollowUp}
          onStepChange={onFollowUpStepChange}
        />
      ) : null}
    </main>
  );
}

function StudioFirstClientHandoff() {
  const router = useRouter();
  const {
    state,
    completeOnboarding,
    createClient,
  } = usePrototypeState();
  const onboardingClient = state.clients.find((client) => client.workspaceId === state.session.activeWorkspaceId
    && client.id === state.onboarding.clientId) ?? null;
  const [clientName, setClientName] = useState(onboardingClient?.name ?? "");
  const [showSkipConfirmation, setShowSkipConfirmation] = useState(false);
  const [isOpeningClientDashboard, setIsOpeningClientDashboard] = useState(false);

  useEffect(() => {
    document.querySelector<HTMLElement>(".prototype-test-content")?.scrollTo({ top: 0, left: 0 });
  }, [state.onboarding.step]);

  useEffect(() => {
    if (!onboardingClient || !isOpeningClientDashboard) return;
    if (state.onboarding.step !== "complete") completeOnboarding();
    const timeout = window.setTimeout(() => {
      router.push(`/customer-dashboard/start-video?client=${encodeURIComponent(onboardingClient.id)}`);
    }, 900);
    return () => window.clearTimeout(timeout);
  }, [completeOnboarding, isOpeningClientDashboard, onboardingClient, router, state.onboarding.step, state.session.activeWorkspaceId]);

  function addFirstClient() {
    if (!clientName.trim()) return;
    createClient({ name: clientName.trim() });
  }

  function finishFirstClientSetupLater() {
    completeOnboarding();
    router.push("/active-videos");
  }

  function skipClientSetup() {
    completeOnboarding();
    router.push("/active-videos");
  }

  if (!onboardingClient) {
    return (
      <section className="studio-first-project studio-first-client-step" aria-labelledby="studio-first-client-heading">
        <header className="studio-first-project-heading">
          <h1 className="headings-m-bold" id="studio-first-client-heading">Add your first Client</h1>
          <p className="paragraph-s">Add their company name to start a video together. They won&apos;t be notified until you invite them.</p>
        </header>
        <div className="studio-onboarding-step-card">
          <Input
            label="Client name"
            value={clientName}
            onChange={(event) => setClientName(event.target.value)}
          />
          {showSkipConfirmation ? (
            <ConfirmationDialog title="Skip adding a Client?" description="You can add your first Client from the Studio dashboard whenever you are ready." cancelLabel="Back" confirmLabel="Skip for now" onCancel={() => setShowSkipConfirmation(false)} onConfirm={skipClientSetup} />
          ) : (
            <div className="studio-onboarding-step-actions">
              <Button size="M" variant="secondary" onClick={() => setShowSkipConfirmation(true)}>I don&apos;t have a Client yet</Button>
              <Button size="M" variant="primary" disabled={!clientName.trim()} onClick={addFirstClient}>Add a Client</Button>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="studio-first-project studio-first-client-step studio-first-client-complete" aria-labelledby="studio-first-client-created-heading" role="status">
      <div className="studio-first-client-confirmation">
        <div className="studio-first-client-identity">
          <ClientAvatar client={onboardingClient} size="L" />
          <div className="studio-first-client-confirmation-copy">
            <span className="label-xs-semibold">Client added</span>
            <h1 className="headings-m-bold" id="studio-first-client-created-heading">{onboardingClient.name}</h1>
            <p className="paragraph-s">{isOpeningClientDashboard ? "Opening video setup..." : "They won’t be notified unless you invite them."}</p>
          </div>
        </div>
        {!isOpeningClientDashboard ? (
          <div className="studio-first-client-ready-actions">
            <Button size="M" variant="secondary" onClick={finishFirstClientSetupLater}>Do this later</Button>
            <Button size="M" variant="primary" onClick={() => setIsOpeningClientDashboard(true)}>Start a video</Button>
          </div>
        ) : null}
      </div>
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
  activeStageId,
  onStageSelect,
}: {
  activeStageId: StudioOnboardStageId;
  onStageSelect: (stageId: StudioOnboardStageId) => void;
}) {
  const activeStageIndex = studioOnboardStages.findIndex((stage) => stage.id === activeStageId);

  return (
    <section className="studio-onboard-progress" aria-label="Studio onboarding progress">
      <ol>
        {studioOnboardStages.map((stage, index) => {
          const state = index < activeStageIndex ? "complete" : index === activeStageIndex ? "active" : "upcoming";

          return (
            <li className={state} key={stage.id} aria-current={state === "active" ? "step" : undefined}>
              {state === "complete" ? (
                <button
                  className="studio-progress-stage-action"
                  type="button"
                  aria-label={`Go to ${stage.label}`}
                  onClick={() => onStageSelect(stage.id)}
                >
                  <span className="studio-progress-marker label-xs-semibold" aria-hidden="true">
                    <DsIcon name="check" size={12} />
                  </span>
                  <span className="studio-progress-label label-xs-semibold">{stage.label}</span>
                </button>
              ) : (
                <span className="studio-progress-stage-label">
                  <span className="studio-progress-marker label-xs-semibold" aria-hidden="true">{index + 1}</span>
                  <span className="studio-progress-label label-xs-semibold">{stage.label}</span>
                </span>
              )}
              {index < studioOnboardStages.length - 1 ? <span className="studio-progress-connector" aria-hidden="true" /> : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function getActiveOnboardingStage(onboarding: PrototypeOnboardingProgress): StudioOnboardStageId {
  return onboarding.view === "first-project" ? "first-client" : "studio-setup";
}
