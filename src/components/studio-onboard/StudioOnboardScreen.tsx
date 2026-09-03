"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { Input } from "../../../Brisk DS/src/app/components/Input";
import { videoTypeIconMap } from "@/components/brief/videoTypeIcons";
import { ClientAvatar } from "@/components/clients/ClientPrimitives";
import {
  StudioAiFollowUp,
} from "@/components/studio-onboard/StudioAiFollowUp";
import { StudioAiQuestion } from "@/components/studio-onboard/StudioAiQuestion";
import { DsIcon } from "@/components/video-review/DsIcon";
import { ClientPortalScreen } from "@/components/client-portal/ClientPortalScreen";
import { useInvitations } from "@/components/invitations/InvitationContext";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { useStudioSettings } from "@/components/settings/StudioSettingsContext";
import type { PrototypeOnboardingAiPhase, PrototypeOnboardingProgress } from "@/data/prototype-state";
import {
  briefVideoTypeDetails,
  type BriefVideoTypeId,
} from "@/data/brief";
import {
  createStudioReviewDraft,
  selectStudioOnboardingScenario,
  type StudioFollowUpAnswers,
  type StudioFollowUpStepId,
  type StudioOnboardingAnswer,
  type StudioReviewDraft,
} from "@/data/studio-onboard";

type StudioSignInMethod = "google" | "magic-link";
type StudioOnboardStageId = "studio-setup" | "first-client" | "first-video";

type StudioOnboardStage = {
  id: StudioOnboardStageId;
  label: string;
};

const studioOnboardStages: readonly StudioOnboardStage[] = [
  { id: "studio-setup", label: "Set up Studio" },
  { id: "first-client", label: "Add first Client" },
  { id: "first-video", label: "Start first video" },
];

export function StudioOnboardScreen() {
  const { applyOnboardingSetup } = useStudioSettings();
  const { state, hasHydrated, updateOnboardingProgress } = usePrototypeState();
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
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [showSetupSavedToast, setShowSetupSavedToast] = useState(false);

  useEffect(() => {
    if (!showSetupSavedToast) return;
    const timeout = window.setTimeout(() => setShowSetupSavedToast(false), 4000);
    return () => window.clearTimeout(timeout);
  }, [showSetupSavedToast]);

  useEffect(() => {
    if (!hasHydrated || !["analysing", "review-handoff"].includes(aiPhase) || !reviewDraft || state.onboarding.studioSetupCommitted) return;
    applyOnboardingSetup(reviewDraft);
    updateOnboardingProgress({ view: "first-project" });
    setShowSetupSavedToast(true);
  }, [aiPhase, applyOnboardingSetup, hasHydrated, reviewDraft, state.onboarding.studioSetupCommitted, updateOnboardingProgress]);

  useEffect(() => {
    document.querySelector<HTMLElement>(".prototype-test-content")?.scrollTo({ top: 0, left: 0 });
  }, [aiPhase, followUpStepId, state.onboarding.step, view]);

  function enterStudioSetup(method: StudioSignInMethod) {
    setSignInMethod(method);
    updateOnboardingProgress({ view: "ai-setup" });
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

    updateOnboardingProgress({
      aiPhase: "follow-up",
      followUpAnswers: null,
      followUpStepId: "contextual",
      hasCompletedFollowUps: false,
      hasAnalysedStudio: true,
      reviewDraft: createStudioReviewDraft(answer, scenario),
      studioAnswer: answer,
    });
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
      const scenario = selectStudioOnboardingScenario(studioAnswer);
      const generatedDraft = reviewDraft ?? createStudioReviewDraft(studioAnswer, scenario);

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
      aiPhase: "review-handoff",
      followUpAnswers: answers,
      hasCompletedFollowUps: true,
      reviewDraft: nextReviewDraft,
      view: "first-project",
    });
    setShowSetupSavedToast(true);
  }

  function revisitOnboardingStage(stageId: StudioOnboardStageId) {
    if (stageId === "studio-setup") {
      updateOnboardingProgress({
        view: "ai-setup",
        step: "studio-setup",
        aiPhase: "question",
      });
      return;
    }

    if (stageId === "first-client") {
      updateOnboardingProgress({ view: "first-project", step: "first-client" });
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
      ) : view === "first-project" && reviewDraft ? (
        <>
          <StudioFirstProjectHandoff draft={reviewDraft} />
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
          onBackToSignIn={() => updateOnboardingProgress({ view: "sign-in" })}
          onBackToStudioQuestion={() => updateOnboardingProgress({ aiPhase: "question" })}
          onStudioDraftChange={updateStudioDraft}
          onFollowUp={completeFollowUps}
          onFollowUpAnswersChange={updateFollowUpAnswers}
          followUpStepId={followUpStepId}
          onFollowUpStepChange={(stepId) => updateOnboardingProgress({ followUpStepId: stepId })}
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
                We sent a sign-in link to <strong>{workEmail}</strong>. Open it to continue setting up your Studio.
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
              Tell Brisk about your studio
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

function StudioFirstProjectHandoff({ draft }: { draft: StudioReviewDraft }) {
  const router = useRouter();
  const { openInvitePerson } = useInvitations();
  const {
    state,
    completeOnboarding,
    createClient,
    createProject,
    markClientPreviewed,
    updateOnboardingProgress,
  } = usePrototypeState();
  const onboardingClient = state.clients.find((client) => client.workspaceId === state.session.activeWorkspaceId
    && client.id === state.onboarding.clientId) ?? null;
  const onboardingProject = state.projects.find((project) => project.workspaceId === state.session.activeWorkspaceId
    && project.id === state.onboarding.projectId) ?? null;
  const initialVideoTypeId: BriefVideoTypeId = draft.videoTypeIds[0] ?? "Brand Film";
  const selectedVideoType = briefVideoTypeDetails.find((videoType) => videoType.name === initialVideoTypeId)
    ?? briefVideoTypeDetails[0];
  const [clientName, setClientName] = useState(onboardingClient?.name ?? "");
  const [projectName, setProjectName] = useState(onboardingProject?.name ?? "");
  const [showSkipConfirmation, setShowSkipConfirmation] = useState(false);
  const [screen, setScreen] = useState<"setup" | "portal-preview">(() => (
    ["client-preview", "invite-client", "complete"].includes(state.onboarding.step)
      ? "portal-preview"
      : "setup"
  ));

  useEffect(() => {
    if (onboardingClient && !projectName) setProjectName(`${onboardingClient.name} first video`);
  }, [onboardingClient, projectName]);

  useEffect(() => {
    document.querySelector<HTMLElement>(".prototype-test-content")?.scrollTo({ top: 0, left: 0 });
  }, [screen, state.onboarding.step]);

  function finishOnProject() {
    if (!onboardingProject) return;
    completeOnboarding();
    router.push(`/projects/${onboardingProject.id}`);
  }

  function addFirstClient() {
    if (!clientName.trim()) return;
    const client = createClient({ name: clientName.trim() });
    setClientName(client.name);
    setProjectName(`${client.name} first video`);
  }

  function skipClientSetup() {
    completeOnboarding();
    router.push("/today?onboarding=add-client");
  }

  function startFirstVideo() {
    if (!onboardingClient || !projectName.trim()) return;
    const project = createProject({
      clientId: onboardingClient.id,
      name: projectName.trim(),
    });
    if (!project) return;
    markClientPreviewed();
    setScreen("portal-preview");
  }

  function inviteFirstClientTeammate() {
    if (!onboardingClient) return;
    openInvitePerson({ role: "Customer", clientId: onboardingClient.id });
  }

  function viewClientProfile() {
    if (!onboardingClient) return;
    router.push(`/clients/${encodeURIComponent(onboardingClient.id)}`);
  }

  function continueToFirstVideo() {
    if (onboardingProject) {
      updateOnboardingProgress({
        step: state.onboarding.clientPreviewed ? "invite-client" : "client-preview",
      });
      setScreen("portal-preview");
      return;
    }

    updateOnboardingProgress({ step: "first-project" });
    setScreen("setup");
  }

  if (!onboardingClient) {
    return (
      <section className="studio-first-project studio-first-client-step" aria-labelledby="studio-first-client-heading">
        <header className="studio-first-project-heading">
          <span className="label-xs-semibold">Next, create your first Client workspace</span>
          <h1 className="headings-m-bold" id="studio-first-client-heading">Add your first Client</h1>
          <p className="paragraph-s">You only need the Client name. Add a contact when you are ready to invite them.</p>
        </header>
        <div className="studio-onboarding-step-card">
          <Input
            label="Client name"
            placeholder="Client name"
            value={clientName}
            onChange={(event) => setClientName(event.target.value)}
          />
          {showSkipConfirmation ? (
            <div className="studio-onboarding-skip-confirmation">
              <p className="paragraph-s">You can add your first Client from the Studio dashboard whenever you are ready.</p>
              <div>
                <Button size="M" variant="secondary" onClick={() => setShowSkipConfirmation(false)}>Back</Button>
                <Button size="M" variant="primary" onClick={skipClientSetup}>Skip for now</Button>
              </div>
            </div>
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

  if (state.onboarding.step === "first-client") {
    return (
      <section className="studio-first-project studio-first-client-step studio-first-client-complete" aria-labelledby="studio-first-client-created-heading">
        <div className="studio-first-client-confirmation">
          <div className="studio-first-client-identity">
            <ClientAvatar client={onboardingClient} size="L" />
            <div className="studio-first-client-confirmation-copy">
              <span className="label-xs-semibold">Client added</span>
              <h1 className="headings-m-bold" id="studio-first-client-created-heading">{onboardingClient.name}</h1>
              <p className="paragraph-s">Your Client workspace is ready.</p>
            </div>
          </div>
          <div className="studio-first-client-ready-actions">
            <Button size="M" variant="secondary" onClick={inviteFirstClientTeammate}>
              Invite first Client teammate
            </Button>
            <button className="studio-first-client-profile-action label-s-semibold" type="button" onClick={viewClientProfile}>
              View Client profile
              <DsIcon name="arrow-right" size={14} />
            </button>
          </div>
        </div>
        <footer className="studio-follow-up-footer">
          <div className="studio-follow-up-actions">
            <button
              className="studio-follow-up-back label-s-semibold"
              type="button"
              onClick={() => updateOnboardingProgress({
                view: "ai-setup",
                step: "studio-setup",
                aiPhase: "question",
              })}
            >
              Back
            </button>
            <button className="studio-follow-up-continue label-m-semibold" type="button" onClick={continueToFirstVideo}>
              {onboardingProject ? "Return to first video" : "Start first video"}
            </button>
          </div>
        </footer>
      </section>
    );
  }

  if (screen === "portal-preview" && onboardingProject) {
    return (
      <section className="studio-first-project-portal-screen" aria-labelledby="studio-first-project-portal-heading">
        <header className="studio-first-project-portal-heading">
          <span className="label-xs-semibold"><DsIcon name="eye" size={14} /> Studio preview</span>
          <h1 className="headings-s-bold" id="studio-first-project-portal-heading">Preview the Client experience</h1>
          <p className="paragraph-s">
            This is {onboardingClient.name}&apos;s real dashboard and Brief for {onboardingProject.name}. Nothing has been sent.
          </p>
        </header>

        <ClientPortalScreen
          clientId={onboardingClient.id}
          embedded
          studioPreview
          workspaceId={state.session.activeWorkspaceId}
        />

        <section className="studio-onboarding-brief-choice" aria-labelledby="studio-onboarding-brief-choice-heading">
          <div>
            <span className="label-xs-semibold">Brief</span>
            <h2 className="headings-xs-bold" id="studio-onboarding-brief-choice-heading">How would you like to begin?</h2>
            <p className="paragraph-s">Choose an option when you are ready. No invitation or email has been sent.</p>
          </div>
          <div className="studio-onboarding-brief-choice-actions">
            <Button size="M" variant="primary" onClick={() => {
              openInvitePerson(
                { role: "Customer", clientId: onboardingClient.id, projectId: onboardingProject.id },
                finishOnProject,
              );
            }}>Invite Client to complete the Brief</Button>
            <Button size="M" variant="secondary" onClick={finishOnProject}>Complete the Brief with the Client</Button>
            <Button size="M" variant="tertiary" onClick={finishOnProject}>Do this later</Button>
          </div>
        </section>

        <footer className="studio-first-project-portal-actions">
          <Button size="M" variant="secondary" onClick={() => setScreen("setup")}>Back to video</Button>
        </footer>
      </section>
    );
  }

  return (
    <section className="studio-first-project studio-first-video-step" aria-labelledby="studio-first-video-heading">
      <header className="studio-first-project-heading">
        <span className="label-xs-semibold">Client added: {onboardingClient.name}</span>
        <h1 className="headings-m-bold" id="studio-first-video-heading">Start your first video</h1>
        <p className="paragraph-s">This creates a real video with its own copy of your Studio&apos;s default Brief.</p>
      </header>
      <div className="studio-onboarding-step-card">
        <section className="studio-first-client-ready" aria-label="Client created">
          <div>
            <span className="label-xs">Client</span>
            <strong className="headings-xs-bold">{onboardingClient.name}</strong>
          </div>
          <div className="studio-first-client-ready-actions">
            <Button size="M" variant="secondary" onClick={inviteFirstClientTeammate}>
              Invite first Client teammate
            </Button>
            <Button size="M" variant="tertiary" onClick={viewClientProfile}>
              View Client profile
            </Button>
          </div>
        </section>
        <Input
          label="Video name"
          placeholder={`${onboardingClient.name} first video`}
          value={projectName}
          onChange={(event) => setProjectName(event.target.value)}
        />
        <div className="studio-first-project-meta">
          <div>
            <span className="label-xs">Video type</span>
            <strong className="label-s-semibold">
              <DsIcon name={videoTypeIconMap[selectedVideoType.name] ?? "film-strip"} size={16} />
              {selectedVideoType.name}
            </strong>
          </div>
          <div>
            <span className="label-xs">Starting state</span>
            <strong className="label-s-semibold">Queued - Brief not sent</strong>
          </div>
        </div>
        <div className="studio-onboarding-step-actions">
          <span />
          <Button size="M" variant="primary" disabled={!projectName.trim()} onClick={startFirstVideo}>Start first video</Button>
        </div>
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
  if (onboarding.view === "sign-in") return "studio-setup";
  if (onboarding.step === "first-client") return "first-client";
  if (["first-project", "client-preview", "invite-client", "complete"].includes(onboarding.step)) {
    return "first-video";
  }
  return "studio-setup";
}
