"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import { BriskDatePicker } from "@/components/brief/BriefPage";
import type { PrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { ShareActionRow } from "@/components/share/ShareActionRow";
import { DsIcon, type DsIconName } from "@/components/video-review/DsIcon";
import {
  formatShootDate,
  formatTime,
  isAssignedToDay,
  type CallSheet,
  type InterviewQuestion,
  type ProductionEntry,
  type ScheduleType,
  type ShootDay,
  type ShootLocation,
  type ShootPerson,
  type ShootPersonType,
} from "@/data/shoot";

type BriskTimePickerProps = {
  ariaLabel: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
};

type TimePeriod = "am" | "pm";

const timePickerOptions = Array.from({ length: 24 * 12 }, (_, index) => {
  const totalMinutes = index * 5;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
});

function BriskTimePicker({ ariaLabel, placeholder = "Choose time", value, onChange }: BriskTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(value ? formatTime(value) : "");
  const pickerRef = useRef<HTMLDivElement>(null);
  const selectedOptionRef = useRef<HTMLButtonElement>(null);
  const parts = getTimePickerParts(value);
  const typedOption = normaliseTypedTime(draft, parts.period);
  const selectedOption = typedOption === null
    ? toTimePickerValue(parts.hour, parts.minute, parts.period)
    : typedOption;

  useEffect(() => {
    setDraft(value ? formatTime(value) : "");
  }, [value]);

  useEffect(() => {
    if (!isOpen) return;

    function closeOnPointerDown(event: PointerEvent) {
      if (pickerRef.current?.contains(event.target as Node)) return;
      setIsOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("pointerdown", closeOnPointerDown, true);
    document.addEventListener("keydown", closeOnEscape);

    const animationFrame = window.requestAnimationFrame(() => {
      centreTimeOption(selectedOptionRef.current);
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
      document.removeEventListener("pointerdown", closeOnPointerDown, true);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen, selectedOption]);

  function commitDraft() {
    const nextValue = normaliseTypedTime(draft, parts.period);
    if (nextValue === null) {
      setDraft(value ? formatTime(value) : "");
      return;
    }

    setDraft(nextValue ? formatTime(nextValue) : "");
    if (nextValue !== value) onChange(nextValue);
  }

  function selectCurrentTime() {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    onChange(normaliseTypedTime(currentTime, parts.period) ?? currentTime);
    setIsOpen(false);
  }

  return (
    <div
      className="shoot-brisk-time-picker"
      ref={pickerRef}
      onBlur={(event) => {
        const nextFocus = event.relatedTarget;
        if (!(nextFocus instanceof Node) || !event.currentTarget.contains(nextFocus)) setIsOpen(false);
      }}
    >
      <div className="shoot-brisk-time-trigger" data-open={isOpen}>
        <input
          aria-label={ariaLabel}
          inputMode="text"
          placeholder={placeholder}
          value={draft}
          onBlur={commitDraft}
          onChange={(event) => {
            setDraft(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitDraft();
              event.currentTarget.blur();
            }
            if (event.key === "Escape") {
              setDraft(value ? formatTime(value) : "");
              setIsOpen(false);
              event.currentTarget.blur();
            }
          }}
        />
        <button
          className="shoot-brisk-time-toggle"
          type="button"
          aria-label={`Open ${ariaLabel} picker`}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          onClick={() => setIsOpen((current) => !current)}
        >
          <DsIcon name="clock-clockwise" size={16} />
        </button>
      </div>
      {isOpen ? (
        <div className="shoot-brisk-time-popover" role="dialog" aria-label={ariaLabel}>
          <div className="shoot-brisk-time-options" role="listbox" aria-label="Available times">
            {timePickerOptions.map((option) => {
              const isSelected = option === selectedOption;
              return (
                <button
                  className={`shoot-brisk-time-option label-s-semibold${isSelected ? " is-selected" : ""}`}
                  key={option}
                  ref={isSelected ? selectedOptionRef : undefined}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option);
                    setDraft(formatTime(option));
                    setIsOpen(false);
                  }}
                >
                  {formatTime(option)}
                </button>
              );
            })}
          </div>
          <div className="shoot-brisk-time-actions">
            <button className="label-xs-semibold" type="button" onClick={() => {
              onChange("");
              setIsOpen(false);
            }}>Clear</button>
            <button className="label-xs-semibold" type="button" onClick={selectCurrentTime}>Now</button>
            <button className="label-xs-semibold" type="button" onClick={() => setIsOpen(false)}>Done</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getTimePickerParts(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  const hour24 = match ? Number(match[1]) : 9;
  const minute = match ? Number(match[2]) : 0;
  const safeHour = hour24 >= 0 && hour24 <= 23 ? hour24 : 9;
  const safeMinute = minute >= 0 && minute <= 59 ? minute : 0;
  const roundedMinutes = Math.round(((safeHour * 60) + safeMinute) / 5) * 5;
  const wrappedMinutes = roundedMinutes % (24 * 60);
  const roundedHour = Math.floor(wrappedMinutes / 60);

  return {
    hour: roundedHour % 12 || 12,
    minute: wrappedMinutes % 60,
    period: (roundedHour >= 12 ? "pm" : "am") as TimePeriod,
  };
}

function toTimePickerValue(hour: number, minute: number, period: TimePeriod) {
  const hour24 = (hour % 12) + (period === "pm" ? 12 : 0);
  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function normaliseTypedTime(input: string, fallbackPeriod: TimePeriod): string | null {
  const compact = input.trim().toLowerCase().replace(/\./g, "").replace(/\s+/g, "");
  if (!compact) return "";

  const periodMatch = compact.match(/(am|pm|a|p)$/);
  const explicitPeriod = periodMatch
    ? periodMatch[1].startsWith("p") ? "pm" : "am"
    : null;
  const numericPart = periodMatch ? compact.slice(0, -periodMatch[1].length) : compact;
  let hour: number;
  let minute: number;

  if (numericPart.includes(":")) {
    const [hourPart, minutePart, ...remainder] = numericPart.split(":");
    if (remainder.length || !/^\d{1,2}$/.test(hourPart) || !/^\d{1,2}$/.test(minutePart)) return null;
    hour = Number(hourPart);
    minute = Number(minutePart);
  } else if (/^\d{1,4}$/.test(numericPart)) {
    if (numericPart.length <= 2) {
      hour = Number(numericPart);
      minute = 0;
    } else {
      hour = Number(numericPart.slice(0, -2));
      minute = Number(numericPart.slice(-2));
    }
  } else {
    return null;
  }

  if (minute > 59) return null;

  let hour24: number;
  if (explicitPeriod) {
    if (hour < 1 || hour > 12) return null;
    hour24 = (hour % 12) + (explicitPeriod === "pm" ? 12 : 0);
  } else if (hour >= 0 && hour <= 23) {
    hour24 = hour >= 1 && hour <= 12
      ? (hour % 12) + (fallbackPeriod === "pm" ? 12 : 0)
      : hour;
  } else {
    return null;
  }

  const roundedMinutes = Math.round(((hour24 * 60) + minute) / 5) * 5;
  const wrappedMinutes = roundedMinutes % (24 * 60);
  const roundedHour = Math.floor(wrappedMinutes / 60);
  const roundedMinute = wrappedMinutes % 60;
  return `${String(roundedHour).padStart(2, "0")}:${String(roundedMinute).padStart(2, "0")}`;
}

function centreTimeOption(option: HTMLButtonElement | null) {
  const list = option?.parentElement;
  if (!option || !list) return;
  list.scrollTop = Math.max(0, option.offsetTop - ((list.clientHeight - option.offsetHeight) / 2));
}

export type ShootSetupPath = "schedule" | "shots";
export type ShootSetupOwner = "studio" | "client";
export type ShootSetupStatus = "working" | "waiting_on_studio" | "waiting_on_client" | "ready_to_finalise" | "released";
export type ShootSetupPhase = "entry" | "builder" | "paused" | "workspace";
export type ShotListSource = "ai" | "blank";

export type ShootSetupState = {
  version: 1;
  phase: ShootSetupPhase;
  activePath: ShootSetupPath;
  scheduleStarted: boolean;
  shotListStarted: boolean;
  scheduleSkipped: boolean;
  shotListSkipped: boolean;
  scheduleComplete: boolean;
  shotListComplete: boolean;
  scheduleStep: number;
  shotListStep: number;
  shotListSource: ShotListSource;
  aiGenerated: boolean;
  owner: ShootSetupOwner;
  status: ShootSetupStatus;
  approvalInvalidated: boolean;
  approvedCallSheetFingerprint?: string;
  lastContributor: string;
  updatedAt: string;
};

const scheduleSteps = [
  { title: "When are you shooting?", description: "Set the timing for each shoot day.", icon: "calendar" },
  { title: "Where are you shooting?", description: "Add the primary location and practical access details.", icon: "push-pin-simple" },
  { title: "Who is involved?", description: "Add Crew, Talent and Client contacts with the details they need on the day.", icon: "users-three" },
  { title: "What happens during the day?", description: "Build the run of day and keep flexible coverage visible as Unscheduled shots.", icon: "clock-clockwise" },
  { title: "What should everyone know?", description: "Capture equipment, wardrobe, catering, access, safety and weather notes.", icon: "info" },
] as const satisfies ReadonlyArray<{ title: string; description: string; icon: DsIconName }>;

const shotListSteps = [
  { title: "Create your Creative Plan", description: "Start with Brisk suggestions or build the plan yourself.", icon: "sparkle" },
  { title: "Plan the questions and shots", description: "Edit, add, remove and reorder what the team should ask and capture.", icon: "clipboard-text" },
  { title: "Add essential shot details", description: "Keep the working plan focused, with technical choices available under More details.", icon: "video-camera-ds" },
  { title: "Review the Creative Plan", description: "Check the Interview Questions and Shot List before sharing the plan.", icon: "list-checks" },
] as const satisfies ReadonlyArray<{ title: string; description: string; icon: DsIconName }>;

const scheduleTypeLabels: Record<ScheduleType, string> = {
  shot: "Shot",
  setup: "Setup",
  lunch: "Lunch",
  travel: "Travel",
  break: "Break",
};

const personTypeLabels: Record<ShootPersonType, string> = {
  crew: "Crew",
  talent: "Talent",
  client: "Client contact",
  other: "Other",
};

type ShootSetupBuilderProps = {
  callSheet: CallSheet;
  customerName: string;
  isApproved: boolean;
  projectName: string;
  selectedRole: PrototypeRole;
  state: ShootSetupState;
  studioName: string;
  saveStatus: "loading" | "saved" | "saving" | "error" | "recovered";
  sharedCallSheetHref: string;
  onApprove: () => void;
  onCallSheetChange: (updater: (current: CallSheet) => CallSheet) => void;
  onClose: () => void;
  onHandover: (owner: ShootSetupOwner) => void;
  onOpenDetailedShotList: () => void;
  onRemoveShootDay: (dayId: string) => void;
  onRemoveShot: (shotId: string) => void;
  onUnapprove: () => void;
  onStateChange: (state: ShootSetupState) => void;
  onSwitchPath: (path: ShootSetupPath, step?: number) => void;
  briskContacts: ShootPerson[];
  isInterviewLed: boolean;
};

export function ShootSetupBuilder({
  callSheet,
  customerName,
  isApproved,
  projectName,
  selectedRole,
  state,
  studioName,
  saveStatus,
  sharedCallSheetHref,
  onApprove,
  onCallSheetChange,
  onClose,
  onHandover,
  onOpenDetailedShotList,
  onRemoveShootDay,
  onRemoveShot,
  onUnapprove,
  onStateChange,
  onSwitchPath,
  briskContacts,
  isInterviewLed,
}: ShootSetupBuilderProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const callSheetChangeRef = useRef(onCallSheetChange);
  const stateChangeRef = useRef(onStateChange);
  const roleLabel = selectedRole === "Customer" ? "Client" : selectedRole;
  const steps = state.activePath === "schedule" ? scheduleSteps : shotListSteps;
  const storedStep = state.activePath === "schedule" ? state.scheduleStep : state.shotListStep;
  const currentStep = Math.max(0, Math.min(steps.length - 1, storedStep));
  const step = steps[currentStep] ?? steps[0];
  const scheduleReady = state.scheduleComplete;
  const shotListReady = state.shotListComplete;
  const canApproveShootPlan = (scheduleReady || state.scheduleSkipped) && (shotListReady || state.shotListSkipped);
  const isLastStep = currentStep === steps.length - 1;

  useEffect(() => {
    callSheetChangeRef.current = onCallSheetChange;
    stateChangeRef.current = onStateChange;
  }, [onCallSheetChange, onStateChange]);

  const touchState = (patch: Partial<ShootSetupState> = {}) => {
    onStateChange({
      ...state,
      ...patch,
      lastContributor: roleLabel,
      updatedAt: new Date().toISOString(),
    });
  };

  const mutateCallSheet = (updater: (current: CallSheet) => CallSheet) => {
    onCallSheetChange(updater);
    touchState();
  };

  const changeStep = (stepIndex: number) => {
    const boundedStep = Math.max(0, Math.min(steps.length - 1, stepIndex));
    touchState(state.activePath === "schedule" ? { scheduleStep: boundedStep } : { shotListStep: boundedStep });
  };

  const canContinue = state.activePath === "schedule"
    ? true
    : currentStep === 0
      ? state.shotListSource === "blank" || (state.aiGenerated && !isGenerating)
      : true;

  const continueLabel = state.activePath === "shots" && currentStep === 0 ? "Review suggested shots" : "Continue";

  const continueSetup = () => {
    if (!canContinue) return;
    if (isLastStep) {
      const scheduleComplete = state.scheduleComplete || state.activePath === "schedule";
      const shotListComplete = state.shotListComplete || state.activePath === "shots";
      const allModulesReady = (scheduleComplete || state.scheduleSkipped) && (shotListComplete || state.shotListSkipped);
      onStateChange({
        ...state,
        scheduleComplete,
        shotListComplete,
        status: state.status === "released" ? "released" : allModulesReady ? "ready_to_finalise" : "working",
        lastContributor: roleLabel,
        updatedAt: new Date().toISOString(),
      });
      onClose();
      return;
    }
    changeStep(currentStep + 1);
  };

  const openDetailedShotList = () => {
    const allModulesReady = state.scheduleComplete || state.scheduleSkipped;
    onStateChange({
      ...state,
      shotListComplete: true,
      status: state.status === "released" ? "released" : allModulesReady ? "ready_to_finalise" : "working",
      lastContributor: roleLabel,
      updatedAt: new Date().toISOString(),
    });
    onOpenDetailedShotList();
  };

  const requestAiSuggestions = () => {
    if (isGenerating) return;
    setIsGenerating(true);
    touchState({ shotListSource: "ai", aiGenerated: false });
    window.setTimeout(() => {
      callSheetChangeRef.current((current) => ({
        ...current,
        entries: current.entries.some((entry) => entry.id.startsWith("ai-shot-"))
          ? current.entries
          : [...current.entries, ...createGeneratedShots(current)],
        questions: !isInterviewLed || current.questions.length
          ? current.questions
          : createGeneratedInterviewQuestions(current),
      }));
      stateChangeRef.current({
        ...state,
        shotListSource: "ai",
        aiGenerated: true,
        lastContributor: "Brisk AI",
        updatedAt: new Date().toISOString(),
      });
      setIsGenerating(false);
    }, 700);
  };

  return (
    <section className="shoot-setup-builder" aria-labelledby="shoot-setup-question-title">
      <div className="shoot-setup-builder-content">
        <header className="shoot-setup-toolbar">
          <div className="shoot-setup-module-title">
            <span className="shoot-setup-module-icon" aria-hidden="true"><DsIcon name={state.activePath === "schedule" ? "calendar" : "film-slate"} size={18} /></span>
            <div><span className="label-xs">Shoot</span><strong className="label-s-semibold">{state.activePath === "schedule" ? "Plan the Day" : "Creative Plan"}</strong></div>
          </div>
          <div className="shoot-setup-toolbar-actions">
            <Button size="S" variant="secondary" onClick={onClose}><DsIcon name="arrow-left" size={16} />Back to Shoot</Button>
          </div>
        </header>

        <div className="shoot-setup-main">
          {state.status === "waiting_on_client" || state.status === "waiting_on_studio" ? (
            <div className="shoot-setup-handover-banner" role="status">
              <DsIcon name="user-switch" size={18} />
              <div>
                <strong className="label-s-semibold">{formatSetupStatus(state.status)}</strong>
                <span className="label-xs">Progress is shared. Any authorised project member can continue.</span>
              </div>
            </div>
          ) : null}

          <article className="shoot-setup-question">
            <header className="shoot-setup-question-heading">
              <span className="shoot-setup-question-icon" aria-hidden="true"><DsIcon name={step.icon} size={24} /></span>
              <div>
                <div className="shoot-setup-question-meta">
                  <SetupSaveStatus status={saveStatus} contributor={state.lastContributor} />
                </div>
                <h1 id="shoot-setup-question-title">{step.title}</h1>
                <p className="paragraph-s">{step.description}</p>
              </div>
            </header>

            <div className="shoot-setup-question-body">
              {state.activePath === "schedule" ? renderScheduleStep({
                callSheet,
                currentStep,
                isClient: selectedRole === "Customer",
                briskContacts,
                mutateCallSheet,
                onRemoveShootDay,
              }) : renderShotListStep({
                callSheet,
                currentStep,
                isGenerating,
                state,
                mutateCallSheet,
                onBlankShotList: () => {
                  mutateCallSheet((current) => ({ ...current, entries: current.entries.filter((entry) => !entry.id.startsWith("ai-shot-")) }));
                  touchState({ shotListSource: "blank", aiGenerated: true });
                  setIsGenerating(false);
                },
                onUseAi: requestAiSuggestions,
                onOpenDetailedShotList: openDetailedShotList,
                onRemoveShot,
                isInterviewLed,
              })}
            </div>
          </article>
        </div>

      </div>

      <footer className="shoot-setup-footer">
          <span className="shoot-setup-footer-side">
            <Button size="S" variant="secondary" disabled={currentStep === 0} onClick={() => changeStep(currentStep - 1)}>Back</Button>
          </span>
          <ShootSetupStepDots activeStep={currentStep} path={state.activePath} steps={steps} onSelectStep={changeStep} />
          <span className="shoot-setup-footer-side right">
            {!isLastStep && (state.activePath === "schedule" || isOptionalStep(state.activePath, currentStep)) ? <button className="shoot-text-action label-s-semibold" type="button" onClick={() => changeStep(currentStep + 1)}>Skip for now</button> : null}
              <Button size="S" variant="primary" disabled={(!isLastStep && !canContinue) || isGenerating} onClick={continueSetup}>
                {isGenerating
                  ? "Creating Creative Plan..."
                  : isLastStep
                    ? "Back to Shoot"
                    : continueLabel}
              </Button>
          </span>
          {isLastStep ? <div className="shoot-setup-footer-share">
            <ShareActionRow
              context="shoot"
              userRole={selectedRole}
              density="compact"
              initialAccess="canEdit"
              initialLinkOpens="stageOnly"
              projectName={projectName}
              studioName={studioName}
              customerName={customerName}
              copyLinkIconOnly
              approveLabel="Approve Shoot"
              approveDisabled={!canApproveShootPlan}
              approveDisabledTooltip="Complete Creative Plan and Plan the Day first"
              isApproved={isApproved}
              onApprove={onApprove}
              onRequestReview={(recipient) => onHandover(recipient === "customer" ? "client" : "studio")}
              onSendToStudio={() => onHandover("studio")}
              onUnapprove={onUnapprove}
            />
          </div> : null}
      </footer>
    </section>
  );
}

function SetupSaveStatus({ status, contributor }: { status: ShootSetupBuilderProps["saveStatus"]; contributor: string }) {
  const label = status === "saving" || status === "loading"
    ? "Autosaving..."
    : status === "error"
      ? "Could not save"
      : contributor ? `Saved - ${contributor}` : "Saved";
  return <span className={`shoot-setup-save is-${status} label-xs`} role="status">{label}</span>;
}

function ShootSetupStepDots({ activeStep, path, steps, onSelectStep }: {
  activeStep: number;
  path: ShootSetupPath;
  steps: ReadonlyArray<{ title: string }>;
  onSelectStep: (step: number) => void;
}) {
  return (
    <nav className="shoot-setup-step-dots" aria-label={`${path === "schedule" ? "Schedule" : "Shot List"} setup steps`}>
      {steps.map((item, index) => (
        <button
          className={`shoot-setup-step-dot label-xs-semibold${index === activeStep ? " active" : ""}${index < activeStep ? " complete" : ""}`}
          key={item.title}
          type="button"
          aria-current={index === activeStep ? "step" : undefined}
          data-tooltip={`${index + 1}. ${item.title}`}
          onClick={() => onSelectStep(index)}
        >
          {index + 1}
        </button>
      ))}
    </nav>
  );
}

function ShootCallSheetCompanion({
  callSheet,
  isClient,
  scheduleReady,
  sharedCallSheetHref,
  shotListReady,
  onClose,
  onEdit,
}: {
  callSheet: CallSheet;
  isClient: boolean;
  scheduleReady: boolean;
  sharedCallSheetHref: string;
  shotListReady: boolean;
  onClose: () => void;
  onEdit: (path: ShootSetupPath, step: number) => void;
}) {
  const [selectedDayId, setSelectedDayId] = useState(callSheet.days[0]?.id ?? "");

  useEffect(() => {
    if (callSheet.days.some((day) => day.id === selectedDayId)) return;
    setSelectedDayId(callSheet.days[0]?.id ?? "");
  }, [callSheet.days, selectedDayId]);

  const day = callSheet.days.find((item) => item.id === selectedDayId) ?? callSheet.days[0];
  const location = callSheet.locations.find((item) => item.id === day?.primaryLocationId) ?? getPrimaryLocation(callSheet);
  const dayEntries = callSheet.entries
    .filter((entry) => !day || entry.dayId === day.id || !entry.dayId)
    .sort((left, right) => {
      if (!left.startTime && !right.startTime) return (left.shotListOrder ?? 0) - (right.shotListOrder ?? 0);
      if (!left.startTime) return 1;
      if (!right.startTime) return -1;
      return left.startTime.localeCompare(right.startTime);
    });
  const scheduledEntries = dayEntries.filter((entry) => entry.startTime);
  const shots = dayEntries.filter((entry) => entry.type === "shot");
  const people = day
    ? callSheet.people.filter((person) => isAssignedToDay(person.shootDayIds, day.id))
    : callSheet.people;
  const missingCount = getMissingScheduleRequirements(callSheet).length + (shotListReady ? 0 : 1);
  const isReady = scheduleReady && shotListReady;

  return (
    <aside className="shoot-setup-call-sheet" aria-label="Call sheet preview">
      <header className="shoot-setup-call-sheet-header">
        <div>
          <span className={`shoot-setup-call-sheet-status label-xs-semibold${isReady ? " is-ready" : ""}`}>
            {isReady ? "Ready" : `${missingCount} ${missingCount === 1 ? "area" : "areas"} incomplete`}
          </span>
          <h2 className="headings-xs-bold">Call sheet</h2>
          <p className="paragraph-s">Live preview from your Schedule and Shot List.</p>
        </div>
        <button className="shoot-icon-button" type="button" aria-label="Close call sheet" onClick={onClose}>
          <DsIcon name="x-close-cross" size={16} />
        </button>
      </header>

      {callSheet.days.length > 1 ? (
        <nav className="shoot-setup-call-sheet-days" aria-label="Call sheet shoot days">
          {callSheet.days.map((shootDay, index) => (
            <button
              className={`label-xs-semibold${shootDay.id === day?.id ? " active" : ""}`}
              type="button"
              aria-current={shootDay.id === day?.id ? "page" : undefined}
              key={shootDay.id}
              onClick={() => setSelectedDayId(shootDay.id)}
            >
              Day {index + 1}
            </button>
          ))}
        </nav>
      ) : null}

      <div className="shoot-setup-call-sheet-body">
        <CallSheetCompanionSection title="Essentials">
          <div className="shoot-setup-call-sheet-essentials">
            <CallSheetCompanionEssential label="Shoot date" value={formatShootDate(day?.date ?? "")} missing={!day?.date} onEdit={() => onEdit("schedule", 0)} />
            <CallSheetCompanionEssential label="General call" value={formatTime(day?.generalCallTime ?? "")} missing={!day?.generalCallTime} onEdit={() => onEdit("schedule", 0)} />
            <CallSheetCompanionEssential label="Expected wrap" value={formatTime(day?.expectedWrapTime ?? "")} missing={!day?.expectedWrapTime} onEdit={() => onEdit("schedule", 0)} />
            <CallSheetCompanionEssential label="Primary location" value={location?.name || "Not set"} detail={location?.address} missing={!location?.name.trim() || !location.address.trim()} onEdit={() => onEdit("schedule", 1)} />
          </div>
        </CallSheetCompanionSection>

        <CallSheetCompanionSection title="Run of day" count={scheduledEntries.length} onEdit={() => onEdit("schedule", 3)}>
          {scheduledEntries.length ? (
            <div className="shoot-setup-call-sheet-list">
              {scheduledEntries.map((entry) => (
                <article key={entry.id}>
                  <strong className="label-xs-semibold">{formatTime(entry.startTime)}</strong>
                  <span className="label-s">{entry.description || "Untitled Schedule block"}</span>
                  <small className="label-xs">{scheduleTypeLabels[entry.type]}</small>
                </article>
              ))}
            </div>
          ) : <p className="shoot-setup-call-sheet-empty label-s">No scheduled blocks yet.</p>}
        </CallSheetCompanionSection>

        <CallSheetCompanionSection title="Shot List" count={shots.length} onEdit={() => onEdit("shots", shots.length ? 2 : 1)}>
          {shots.length ? (
            <div className="shoot-setup-call-sheet-list is-shots">
              {shots.map((shot, index) => (
                <article key={shot.id}>
                  <strong className="label-xs-semibold">{shot.shotNumber ? `Shot ${shot.shotNumber}` : `Shot ${index + 1}`}</strong>
                  <span className="label-s">{shot.description || "Untitled shot"}</span>
                  <small className="label-xs">{[shot.shotSize, shot.cameraMovement, shot.subject].filter(Boolean).join(" · ") || (shot.startTime ? formatTime(shot.startTime) : "Unscheduled")}</small>
                </article>
              ))}
            </div>
          ) : <p className="shoot-setup-call-sheet-empty label-s">No shots added yet.</p>}
        </CallSheetCompanionSection>

        <CallSheetCompanionSection title="People" count={people.length} onEdit={() => onEdit("schedule", 2)}>
          {people.length ? (
            <div className="shoot-setup-call-sheet-list is-people">
              {people.map((person) => (
                <article key={person.id}>
                  <strong className="label-xs-semibold">{person.name || personTypeLabels[person.type]}</strong>
                  <span className="label-s">{person.role || personTypeLabels[person.type]}</span>
                  <small className="label-xs">Call {formatTime(person.callTime)}</small>
                </article>
              ))}
            </div>
          ) : <p className="shoot-setup-call-sheet-empty label-s">No people added yet.</p>}
        </CallSheetCompanionSection>

        <CallSheetCompanionSection title="Production notes" onEdit={() => onEdit("schedule", 4)}>
          {hasProductionNotes(callSheet) || callSheet.notes.trim() ? (
            <div className="shoot-setup-call-sheet-notes">
              {callSheet.practicalInfo.equipment ? <CompanionNote label="Equipment" value={callSheet.practicalInfo.equipment} /> : null}
              {callSheet.practicalInfo.wardrobe ? <CompanionNote label="Wardrobe" value={callSheet.practicalInfo.wardrobe} /> : null}
              {callSheet.practicalInfo.catering ? <CompanionNote label="Catering" value={callSheet.practicalInfo.catering} /> : null}
              {callSheet.practicalInfo.access ? <CompanionNote label="Access" value={callSheet.practicalInfo.access} /> : null}
              {callSheet.practicalInfo.safety ? <CompanionNote label="Safety" value={callSheet.practicalInfo.safety} /> : null}
              {callSheet.practicalInfo.weatherConsiderations ? <CompanionNote label="Weather" value={callSheet.practicalInfo.weatherConsiderations} /> : null}
              {callSheet.practicalInfo.clientNotes ? <CompanionNote label="Client notes" value={callSheet.practicalInfo.clientNotes} /> : null}
              {!isClient && callSheet.practicalInfo.internalNotes ? <CompanionNote label="Internal Studio notes" value={callSheet.practicalInfo.internalNotes} /> : null}
              {callSheet.notes ? <CompanionNote label="Special instructions" value={callSheet.notes} /> : null}
            </div>
          ) : <p className="shoot-setup-call-sheet-empty label-s">No production notes added yet.</p>}
        </CallSheetCompanionSection>
      </div>

      <footer className="shoot-setup-call-sheet-footer">
        <Link className="shoot-button secondary label-s-semibold" href={sharedCallSheetHref} target="_blank" rel="noreferrer">
          Open full call sheet<DsIcon name="arrow-bend-up-right" size={16} />
        </Link>
      </footer>
    </aside>
  );
}

function CallSheetCompanionSection({ children, count, title, onEdit }: { children: ReactNode; count?: number; title: string; onEdit?: () => void }) {
  return (
    <section className="shoot-setup-call-sheet-section">
      <header>
        <div><h3 className="label-s-semibold">{title}</h3>{typeof count === "number" ? <span className="label-xs-semibold">{count}</span> : null}</div>
        {onEdit ? <button className="shoot-text-action label-xs-semibold" type="button" onClick={onEdit}>Edit</button> : null}
      </header>
      {children}
    </section>
  );
}

function CallSheetCompanionEssential({ detail, label, missing = false, value, onEdit }: { detail?: string; label: string; missing?: boolean; value: string; onEdit: () => void }) {
  return (
    <button className={missing ? "is-missing" : ""} type="button" onClick={onEdit}>
      <span className="label-xs">{label}</span>
      <strong className="label-s-semibold">{value}</strong>
      {detail ? <small className="label-xs">{detail}</small> : null}
      <span className="shoot-setup-call-sheet-edit label-xs-semibold">Edit</span>
    </button>
  );
}

function CompanionNote({ label, value }: { label: string; value: string }) {
  return <div><strong className="label-xs-semibold">{label}</strong><p className="label-s">{value}</p></div>;
}

type ScheduleStepProps = {
  callSheet: CallSheet;
  currentStep: number;
  isClient: boolean;
  briskContacts: ShootPerson[];
  mutateCallSheet: (updater: (current: CallSheet) => CallSheet) => void;
  onRemoveShootDay: (dayId: string) => void;
};

function renderScheduleStep({ callSheet, currentStep, isClient, briskContacts, mutateCallSheet, onRemoveShootDay }: ScheduleStepProps) {
  const firstDay = callSheet.days[0];
  const primaryLocation = getPrimaryLocation(callSheet);

  if (currentStep === 0) {
    return <div className="shoot-setup-stack">
      {callSheet.days.map((day, index) => <section className="shoot-setup-day-card" key={day.id}>
        <header><strong>Shoot day {index + 1}</strong>{callSheet.days.length > 1 ? <button className="shoot-text-action danger label-xs-semibold" type="button" onClick={() => onRemoveShootDay(day.id)}>Remove day</button> : null}</header>
        <div className="shoot-setup-grid three-column">
          <div className="shoot-setup-field"><span className="label-xs-semibold">Shoot date</span><BriskDatePicker ariaLabel={`${day.label} shoot date`} placeholder="Choose date" value={day.date} variant="field" onChange={(value) => mutateCallSheet((current) => updateShootDay(current, day.id, { date: value }))} /></div>
          <div className="shoot-setup-field"><span className="label-xs-semibold">General call time</span><BriskTimePicker ariaLabel={`${day.label} general call time`} value={day.generalCallTime} onChange={(value) => mutateCallSheet((current) => updateShootDay(current, day.id, { generalCallTime: value }))} /></div>
          <div className="shoot-setup-field"><span className="label-xs-semibold">Expected wrap</span><BriskTimePicker ariaLabel={`${day.label} expected wrap time`} value={day.expectedWrapTime} onChange={(value) => mutateCallSheet((current) => updateShootDay(current, day.id, { expectedWrapTime: value }))} /></div>
        </div>
      </section>)}
      <Button className="shoot-setup-add-day" size="S" variant="secondary" onClick={() => mutateCallSheet((current) => ({ ...current, days: [...current.days, createSetupDay(current.days.length + 1, current.days.at(-1))] }))}><DsIcon name="plus" size={16} />Add shoot day</Button>
    </div>;
  }

  if (currentStep === 1) {
    return <div className="shoot-setup-stack">
      <div className="shoot-setup-grid two-column">
        <SetupField label="Location name"><input placeholder="e.g. Precinct Studio 2" value={primaryLocation?.name ?? ""} onChange={(event) => mutateCallSheet((current) => updatePrimaryLocation(current, { name: event.target.value }))} /></SetupField>
        <SetupField label="Address"><input placeholder="Street address" value={primaryLocation?.address ?? ""} onChange={(event) => mutateCallSheet((current) => updatePrimaryLocation(current, { address: event.target.value }))} /></SetupField>
        <SetupField label="Parking and access"><textarea rows={3} placeholder="Where to park and how to enter" value={[primaryLocation?.parking, primaryLocation?.access].filter(Boolean).join("\n")} onChange={(event) => mutateCallSheet((current) => updatePrimaryLocation(current, { access: event.target.value, parking: "" }))} /></SetupField>
        <SetupField label="Map link"><input type="url" placeholder="https://maps.google.com/..." value={primaryLocation?.mapLink ?? ""} onChange={(event) => mutateCallSheet((current) => updatePrimaryLocation(current, { mapLink: event.target.value }))} /></SetupField>
      </div>
      <fieldset className="shoot-setup-checkboxes">
        <legend className="label-xs-semibold">Use this location for</legend>
        {callSheet.days.map((day) => <label className="label-s" key={day.id}><input type="checkbox" checked={primaryLocation?.shootDayIds === "all" || primaryLocation?.shootDayIds.includes(day.id) || false} onChange={(event) => mutateCallSheet((current) => toggleLocationDay(current, day.id, event.target.checked))} />{day.label}</label>)}
      </fieldset>
    </div>;
  }

  if (currentStep === 2) {
    const availableContacts = briskContacts.filter((contact) => !callSheet.people.some((person) => person.email === contact.email && person.type === contact.type));
    return <div className="shoot-setup-stack">
      {callSheet.people.length ? <div className="shoot-setup-person-list">{callSheet.people.map((person) => <article className="shoot-setup-person-card" key={person.id}>
        <div className="shoot-setup-grid four-column">
          <SetupField label="Type"><select value={person.type} onChange={(event) => mutateCallSheet((current) => updatePerson(current, person.id, { type: event.target.value as ShootPersonType }))}>{Object.entries(personTypeLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></SetupField>
          <SetupField label="Name"><input placeholder="Full name" value={person.name} onChange={(event) => mutateCallSheet((current) => updatePerson(current, person.id, { name: event.target.value }))} /></SetupField>
          <SetupField label="Role"><input placeholder="e.g. Director of Photography" value={person.role} onChange={(event) => mutateCallSheet((current) => updatePerson(current, person.id, { role: event.target.value }))} /></SetupField>
          <div className="shoot-setup-field"><span className="label-xs-semibold">Call time</span><BriskTimePicker ariaLabel={`${person.name || personTypeLabels[person.type]} call time`} value={person.callTime} onChange={(value) => mutateCallSheet((current) => updatePerson(current, person.id, { callTime: value }))} /></div>
        </div>
        {!isClient ? <label className="shoot-setup-contact-visibility label-xs"><input type="checkbox" checked={person.showContactDetails !== false} onChange={(event) => mutateCallSheet((current) => updatePerson(current, person.id, { showContactDetails: event.target.checked }))} />Show email and phone on the shared Call Sheet</label> : null}
        <button className="shoot-icon-button" type="button" aria-label={`Remove ${person.name || personTypeLabels[person.type]}`} onClick={() => mutateCallSheet((current) => ({ ...current, people: current.people.filter((item) => item.id !== person.id) }))}><DsIcon name="trash-simple" size={16} /></button>
      </article>)}</div> : <SetupEmpty title="No people added yet" body="Add Crew, Talent or a Client contact. You can skip this and return later." />}
      <div className="shoot-setup-inline-actions">
        <BriskContactPicker contacts={availableContacts} onAdd={(contact) => mutateCallSheet((current) => ({ ...current, people: [...current.people, { ...contact, id: `${contact.id}-${Date.now()}`, showContactDetails: true }] }))} />
        <button className="shoot-button secondary label-s-semibold" type="button" onClick={() => mutateCallSheet((current) => ({ ...current, people: [...current.people, createSetupPerson("crew", firstDay)] }))}><DsIcon name="plus" size={16} />Create new contact</button>
      </div>
      <p className="shoot-setup-helper label-xs">Assign each person as Crew, Talent or Client contact. A person can be added again with another shoot role when needed.</p>
    </div>;
  }

  if (currentStep === 3) {
    const scheduledEntries = callSheet.entries.filter((entry) => entry.startTime);
    const unscheduledShots = callSheet.entries.filter((entry) => entry.type === "shot" && !entry.startTime);
    return <div className="shoot-setup-stack">
      <SetupEntryList entries={scheduledEntries} days={callSheet.days} mutateCallSheet={mutateCallSheet} />
      <button className="shoot-button secondary label-s-semibold shoot-setup-add-button" type="button" onClick={() => mutateCallSheet((current) => ({ ...current, entries: [...current.entries, createSetupEntry(current, true)] }))}><DsIcon name="plus" size={16} />Add Schedule block</button>
      <section className="shoot-setup-unscheduled">
        <header><div><strong>Unscheduled shots</strong><span className="label-xs">Shots that have not been assigned to a time yet.</span></div><button className="shoot-text-action label-s-semibold" type="button" onClick={() => mutateCallSheet((current) => ({ ...current, entries: [...current.entries, createSetupEntry(current, false)] }))}><DsIcon name="plus" size={16} />Add shot</button></header>
        {unscheduledShots.length ? <SetupEntryList entries={unscheduledShots} days={callSheet.days} mutateCallSheet={mutateCallSheet} /> : <SetupEmpty title="No unscheduled shots" body="Flexible coverage can stay here until you assign it to a time." />}
      </section>
    </div>;
  }

  if (currentStep === 4) {
    return <div className="shoot-setup-stack">
      <ProductionNotesBuilder callSheet={callSheet} isClient={isClient} mutateCallSheet={mutateCallSheet} />
      {isClient ? <p className="shoot-setup-privacy-note label-xs"><DsIcon name="lock" size={16} />Studio-only logistics and crew notes are hidden from Clients.</p> : null}
    </div>;
  }

  return null;
}

type ShotListStepProps = {
  callSheet: CallSheet;
  currentStep: number;
  isGenerating: boolean;
  state: ShootSetupState;
  mutateCallSheet: (updater: (current: CallSheet) => CallSheet) => void;
  onBlankShotList: () => void;
  onUseAi: () => void;
  onOpenDetailedShotList: () => void;
  onRemoveShot: (shotId: string) => void;
  isInterviewLed: boolean;
};

function renderShotListStep({ callSheet, currentStep, isGenerating, state, mutateCallSheet, onBlankShotList, onUseAi, onOpenDetailedShotList, onRemoveShot, isInterviewLed }: ShotListStepProps) {
  const shots = callSheet.entries.filter((entry) => entry.type === "shot").sort((left, right) => (left.shotListOrder ?? 0) - (right.shotListOrder ?? 0));

  if (currentStep === 0) {
    return <div className="shoot-setup-source-options">
      <button className={`shoot-setup-source-card ${state.shotListSource === "ai" ? "active" : ""}`} type="button" aria-pressed={state.shotListSource === "ai"} onClick={onUseAi}>
        <span className="shoot-setup-source-icon"><DsIcon name="sparkle" size={24} /></span>
        <span><strong>Get Brisk to suggest the plan</strong><span className="paragraph-s">Use the approved Brief and Script to suggest {isInterviewLed ? "Interview Questions and shots" : "the shots to capture"}. Nothing is created until you choose this option.</span></span>
        <span className="shoot-setup-selected label-xs-semibold">{isGenerating ? "Creating..." : state.aiGenerated ? `${shots.length} suggested shots` : "Suggest shots"}</span>
      </button>
      <button className={`shoot-setup-source-card ${state.shotListSource === "blank" ? "active" : ""}`} type="button" aria-pressed={state.shotListSource === "blank"} onClick={onBlankShotList}>
        <span className="shoot-setup-source-icon"><DsIcon name="file-text" size={24} /></span>
        <span><strong>Build the Creative Plan myself</strong><span className="paragraph-s">Start with an empty plan and add only the questions and shots you need.</span></span>
        <span className="shoot-setup-selected label-xs-semibold">Start manually</span>
      </button>
    </div>;
  }

  if (currentStep === 1) {
    return <div className="shoot-setup-stack">
      {isInterviewLed ? <section className="shoot-setup-creative-section">
        <header><div><strong>What should we ask?</strong><span className="label-xs">Interview Questions suggested from the approved Brief and Script.</span></div><button className="shoot-text-action label-s-semibold" type="button" onClick={() => mutateCallSheet((current) => ({ ...current, questions: [...current.questions, createAdditionalInterviewQuestion(current)] }))}><DsIcon name="sparkle" size={16} />Generate more questions</button></header>
        {callSheet.questions.length ? <div className="shoot-setup-question-list">{callSheet.questions.map((question, index) => <article key={question.id}>
          <span className="shoot-setup-shot-number label-xs-semibold">{index + 1}</span>
          <input aria-label={`Interview question ${index + 1}`} value={question.question} onChange={(event) => mutateCallSheet((current) => updateInterviewQuestion(current, question.id, event.target.value))} />
          <div className="shoot-setup-reorder-actions"><button className="shoot-icon-button" type="button" disabled={index === 0} aria-label={`Move question ${index + 1} up`} onClick={() => mutateCallSheet((current) => moveInterviewQuestion(current, question.id, -1))}><DsIcon name="caret-left" size={16} /></button><button className="shoot-icon-button" type="button" disabled={index === callSheet.questions.length - 1} aria-label={`Move question ${index + 1} down`} onClick={() => mutateCallSheet((current) => moveInterviewQuestion(current, question.id, 1))}><DsIcon name="caret-right" size={16} /></button></div>
          <button className="shoot-icon-button" type="button" aria-label={`Remove question ${index + 1}`} onClick={() => mutateCallSheet((current) => ({ ...current, questions: current.questions.filter((item) => item.id !== question.id) }))}><DsIcon name="trash-simple" size={16} /></button>
        </article>)}</div> : <SetupEmpty title="No Interview Questions yet" body="Generate suggestions or add a question manually." />}
        <button className="shoot-button secondary label-s-semibold shoot-setup-add-button" type="button" onClick={() => mutateCallSheet((current) => ({ ...current, questions: [...current.questions, createBlankInterviewQuestion(current)] }))}><DsIcon name="plus" size={16} />Add question</button>
      </section> : null}
      <section className="shoot-setup-creative-section"><header><div><strong>What should we capture?</strong><span className="label-xs">Add, edit, remove and reorder the shots planned for the shoot.</span></div></header>
      {shots.length ? <div className="shoot-setup-shot-review-list">{shots.map((shot, index) => <article key={shot.id}>
        <span className="shoot-setup-shot-number label-xs-semibold">{index + 1}</span>
        <div><span className="label-xs">{shot.scriptSection || "Approved Script"}</span><input aria-label={`Shot ${index + 1} description`} value={shot.description} onChange={(event) => mutateCallSheet((current) => updateEntry(current, shot.id, { description: event.target.value }))} /></div>
        <span className="shoot-setup-included label-xs-semibold"><DsIcon name="check" size={14} />Included</span>
        <button className="shoot-icon-button" type="button" aria-label={`Remove shot ${index + 1}`} onClick={() => onRemoveShot(shot.id)}><DsIcon name="trash-simple" size={16} /></button>
      </article>)}</div> : <SetupEmpty title="Start adding shots" body="Your blank Shot List is ready. Add the first piece of coverage below." />}
      <button className="shoot-button secondary label-s-semibold shoot-setup-add-button" type="button" onClick={() => mutateCallSheet((current) => ({ ...current, entries: [...current.entries, createBlankShot(current)] }))}><DsIcon name="plus" size={16} />Add shot</button>
      </section>
    </div>;
  }

  if (currentStep === 2) {
    return <div className="shoot-setup-stack">
      {shots.length ? shots.map((shot, index) => <section className="shoot-setup-shot-details" key={shot.id}>
        <header><strong>Shot {index + 1}</strong><span className="label-xs">{shot.description || "Untitled shot"}</span></header>
        <div className="shoot-setup-grid two-column">
          <SetupField label="Description"><input value={shot.description} onChange={(event) => mutateCallSheet((current) => updateEntry(current, shot.id, { description: event.target.value }))} /></SetupField>
          <SetupField label="Talent or subject"><input placeholder="Person, product or action" value={shot.subject ?? ""} onChange={(event) => mutateCallSheet((current) => updateEntry(current, shot.id, { subject: event.target.value }))} /></SetupField>
          <SetupField label="Location"><select value={shot.locationId ?? ""} onChange={(event) => mutateCallSheet((current) => updateEntry(current, shot.id, { locationId: event.target.value || undefined }))}><option value="">No location yet</option>{callSheet.locations.map((location) => <option value={location.id} key={location.id}>{location.name}</option>)}</select></SetupField>
          <SetupField label="Priority"><select value={shot.priority ?? "Useful"} onChange={(event) => mutateCallSheet((current) => updateEntry(current, shot.id, { priority: event.target.value as ProductionEntry["priority"] }))}><option>Essential</option><option>Useful</option><option>Optional</option></select></SetupField>
        </div>
        <details className="shoot-setup-more-details"><summary className="label-s-semibold">More details</summary><div className="shoot-setup-grid three-column"><SetupField label="Shot size"><select value={shot.shotSize ?? ""} onChange={(event) => mutateCallSheet((current) => updateEntry(current, shot.id, { shotSize: event.target.value as ProductionEntry["shotSize"] || undefined }))}><option value="">Choose size</option>{["Extreme close-up", "Close-up", "Medium", "Wide", "Extreme wide"].map((value) => <option value={value} key={value}>{value}</option>)}</select></SetupField><SetupField label="Camera movement"><select value={shot.cameraMovement ?? ""} onChange={(event) => mutateCallSheet((current) => updateEntry(current, shot.id, { cameraMovement: event.target.value as ProductionEntry["cameraMovement"] || undefined }))}><option value="">Choose movement</option>{["Static", "Handheld", "Pan", "Tilt", "Tracking", "Push in", "Pull out", "Gimbal"].map((value) => <option value={value} key={value}>{value}</option>)}</select></SetupField><SetupField label="Reference image"><input type="url" placeholder="Paste an image link" value={shot.imageReferenceUrl ?? ""} onChange={(event) => mutateCallSheet((current) => updateEntry(current, shot.id, { imageReferenceUrl: event.target.value || undefined, imageReferenceSource: event.target.value ? "link" : undefined }))} /></SetupField></div></details>
      </section>) : <SetupEmpty title="No shots to detail" body="Go back to add a shot, or continue and add one in the working Shot List." />}
    </div>;
  }

  if (currentStep === 3) {
    return <div className="shoot-setup-stack">
      {isInterviewLed ? <section className="shoot-setup-creative-section"><header><div><strong>Interview Questions</strong><span className="label-xs">{callSheet.questions.length} planned</span></div></header>{callSheet.questions.length ? <ol className="shoot-setup-review-question-list">{callSheet.questions.map((question) => <li className="label-s" key={question.id}>{question.question}</li>)}</ol> : <SetupEmpty title="No Interview Questions" body="Return to the previous step to add questions." />}</section> : null}
      <section className="shoot-setup-creative-section"><header><div><strong>Shot List</strong><span className="label-xs">{shots.length} shots planned</span></div></header>
      {shots.length ? <div className="shoot-setup-organise-list">{shots.map((shot, index) => <article key={shot.id}>
        <span className="shoot-shot-drag" aria-hidden="true"><DsIcon name="dots-six-vertical" size={16} /></span>
        <span className="shoot-setup-shot-number label-xs-semibold">{index + 1}</span>
        <div><strong>{shot.description || "Untitled shot"}</strong><span className="label-xs">{[shot.priority ?? "Useful", shot.subject].filter(Boolean).join(" · ")}</span></div>
        <div className="shoot-setup-reorder-actions">
          <button className="shoot-icon-button" type="button" disabled={index === 0} aria-label={`Move shot ${index + 1} up`} onClick={() => mutateCallSheet((current) => moveShot(current, shot.id, -1))}><DsIcon name="caret-left" size={16} /></button>
          <button className="shoot-icon-button" type="button" disabled={index === shots.length - 1} aria-label={`Move shot ${index + 1} down`} onClick={() => mutateCallSheet((current) => moveShot(current, shot.id, 1))}><DsIcon name="caret-right" size={16} /></button>
        </div>
      </article>)}</div> : <SetupEmpty title="No shots to organise" body="Add coverage in the previous question or continue to the working Shot List." />}
      </section>
      <div className="shoot-setup-review-actions">
        <p className="shoot-setup-helper label-xs"><DsIcon name="calendar" size={16} />Shoot days and Schedule blocks are assigned later in Plan the Day.</p>
        <Button size="S" variant="secondary" onClick={onOpenDetailedShotList}><DsIcon name="grid-four" size={16} />Open detailed Shot List</Button>
      </div>
    </div>;
  }

  return null;
}

function SetupEntryList({ entries, days, mutateCallSheet }: { entries: ProductionEntry[]; days: ShootDay[]; mutateCallSheet: ScheduleStepProps["mutateCallSheet"] }) {
  if (!entries.length) return <SetupEmpty title="No Schedule blocks yet" body="Add the first block to shape the run of day." />;
  return <div className="shoot-setup-entry-list">{entries.map((entry, index) => <article key={entry.id}>
    <span className="shoot-setup-shot-number label-xs-semibold">{index + 1}</span>
    <input aria-label={`Schedule block ${index + 1} description`} placeholder="Describe this block" value={entry.description} onChange={(event) => mutateCallSheet((current) => updateEntry(current, entry.id, { description: event.target.value }))} />
    <select aria-label={`Schedule block ${index + 1} type`} value={entry.type} onChange={(event) => mutateCallSheet((current) => updateEntry(current, entry.id, { type: event.target.value as ScheduleType }))}>{Object.entries(scheduleTypeLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
    <BriskTimePicker ariaLabel={`Schedule block ${index + 1} time`} value={entry.startTime} onChange={(value) => mutateCallSheet((current) => updateEntry(current, entry.id, { startTime: value }))} />
    <select aria-label={`Schedule block ${index + 1} shoot day`} value={entry.dayId} onChange={(event) => mutateCallSheet((current) => updateEntry(current, entry.id, { dayId: event.target.value }))}>{days.map((day) => <option value={day.id} key={day.id}>{day.label}</option>)}</select>
    <button className="shoot-icon-button" type="button" aria-label={`Remove ${entry.description || `Schedule block ${index + 1}`}`} onClick={() => mutateCallSheet((current) => removeEntry(current, entry.id))}><DsIcon name="trash-simple" size={16} /></button>
  </article>)}</div>;
}

type ProductionNoteKey = "equipment" | "wardrobe" | "catering" | "access" | "safety" | "weatherConsiderations" | "clientNotes" | "internalNotes";

const productionNoteSections: ReadonlyArray<{ key: ProductionNoteKey; label: string; placeholder: string; studioOnly?: boolean }> = [
  { key: "equipment", label: "Equipment", placeholder: "Camera, lighting, sound and grip" },
  { key: "wardrobe", label: "Wardrobe", placeholder: "Wardrobe guidance for Talent" },
  { key: "catering", label: "Catering", placeholder: "Meals, breaks and dietary notes" },
  { key: "access", label: "Access", placeholder: "Arrival and access instructions" },
  { key: "safety", label: "Safety", placeholder: "Known hazards and controls" },
  { key: "weatherConsiderations", label: "Weather considerations", placeholder: "Wet weather or heat plan" },
  { key: "clientNotes", label: "Client-visible notes", placeholder: "Instructions everyone can see" },
  { key: "internalNotes", label: "Internal Studio notes", placeholder: "Private crew and logistics notes", studioOnly: true },
];

function ProductionNotesBuilder({ callSheet, isClient, mutateCallSheet }: { callSheet: CallSheet; isClient: boolean; mutateCallSheet: ScheduleStepProps["mutateCallSheet"] }) {
  const visibleSections = productionNoteSections.filter((section) => !section.studioOnly || !isClient);
  return <section className="shoot-setup-notes-builder">
    <header><div><strong>Add notes for the day</strong><span className="label-xs">Open only the sections this shoot needs. Weather is generated automatically once the date and location are confirmed.</span></div></header>
    <div className="shoot-setup-note-sections">{visibleSections.map((section) => {
      const value = callSheet.practicalInfo[section.key] ?? "";
      return <details key={section.key} open={Boolean(value) || undefined}>
        <summary className="label-s-semibold"><span>{section.label}</span><span className="label-xs">{value ? "Added" : "Add notes"}</span></summary>
        <div><textarea rows={3} placeholder={section.placeholder} value={value} onChange={(event) => mutateCallSheet((current) => updatePracticalInfo(current, { [section.key]: event.target.value }))} />{section.studioOnly ? <small className="label-xs">Only Filmmakers can see these notes.</small> : null}</div>
      </details>;
    })}</div>
  </section>;
}

function BriskContactPicker({ contacts, onAdd }: { contacts: ShootPerson[]; onAdd: (contact: ShootPerson) => void }) {
  const [query, setQuery] = useState("");
  const filteredContacts = contacts.filter((contact) => `${contact.name} ${contact.email} ${contact.role}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <details className="shoot-setup-contact-picker">
    <summary className="shoot-button secondary label-s-semibold"><DsIcon name="users-three" size={16} />Add from Brisk</summary>
    <div className="shoot-setup-contact-picker-menu">
      <label className="shoot-setup-contact-search"><span className="sr-only">Search Brisk contacts</span><DsIcon name="search" size={16} /><input placeholder="Search contacts" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      {filteredContacts.length ? filteredContacts.map((contact) => <button className="label-s" type="button" key={`${contact.id}-${contact.type}`} onClick={() => onAdd(contact)}><span><strong>{contact.name}</strong><small>{contact.role || personTypeLabels[contact.type]} · {contact.email}</small></span><DsIcon name="plus" size={16} /></button>) : <span className="label-xs">{contacts.length ? "No contacts match your search." : "All matching Brisk contacts are already added."}</span>}
    </div>
  </details>;
}

function SetupField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="shoot-setup-field"><span className="label-xs-semibold">{label}</span>{children}{hint ? <small className="label-xs">{hint}</small> : null}</label>;
}

function SetupEmpty({ title, body }: { title: string; body: string }) {
  return <div className="shoot-setup-inline-empty"><DsIcon name="plus" size={18} /><div><strong>{title}</strong><span className="label-xs">{body}</span></div></div>;
}

function createSetupDay(index: number, previous?: ShootDay): ShootDay {
  return {
    id: `day-${Date.now()}-${index}`,
    label: `Day ${index}`,
    date: "",
    generalCallTime: previous?.generalCallTime || "08:00",
    expectedWrapTime: previous?.expectedWrapTime || "17:00",
    primaryLocationId: previous?.primaryLocationId || "",
  };
}

function createSetupPerson(type: ShootPersonType, day?: ShootDay): ShootPerson {
  return {
    id: `person-${Date.now()}-${type}`,
    name: "",
    type,
    role: "",
    phone: "",
    email: "",
    callTime: day?.generalCallTime || "08:00",
    shootDayIds: day ? [day.id] : [],
  };
}

function createSetupEntry(callSheet: CallSheet, scheduled: boolean): ProductionEntry {
  const shots = callSheet.entries.filter((entry) => entry.type === "shot");
  return {
    id: `entry-${Date.now()}`,
    dayId: callSheet.days[0]?.id ?? "",
    shotNumber: scheduled ? undefined : shots.length + 1,
    shotListOrder: scheduled ? undefined : shots.length,
    startTime: scheduled ? callSheet.days[0]?.generalCallTime || "08:00" : "",
    durationMinutes: 30,
    description: scheduled ? "New Schedule block" : "New shot",
    type: scheduled ? "setup" : "shot",
    personIds: [],
    captured: scheduled ? undefined : false,
  };
}

function createBlankShot(callSheet: CallSheet): ProductionEntry {
  const shots = callSheet.entries.filter((entry) => entry.type === "shot");
  const nextShotNumber = Math.max(0, ...shots.map((shot) => shot.shotNumber ?? 0)) + 1;
  const nextShotListOrder = Math.max(-1, ...shots.map((shot) => shot.shotListOrder ?? -1)) + 1;
  return {
    id: `shot-${Date.now()}`,
    dayId: callSheet.days[0]?.id ?? "",
    shotNumber: nextShotNumber,
    shotListOrder: nextShotListOrder,
    startTime: "",
    durationMinutes: 15,
    description: "New shot",
    type: "shot",
    personIds: [],
    captured: false,
    priority: "Useful",
    scriptSection: "Added manually",
  };
}

function createBlankInterviewQuestion(callSheet: CallSheet): InterviewQuestion {
  return {
    id: `question-${Date.now()}`,
    question: "New interview question",
    shootDayIds: callSheet.days.length ? "all" : [],
  };
}

function createAdditionalInterviewQuestion(callSheet: CallSheet): InterviewQuestion {
  const suggestions = [
    "What changed for you after making this decision?",
    "What would you say to someone facing the same challenge?",
    "Can you describe the moment you knew this was working?",
  ];
  return {
    id: `ai-question-${Date.now()}`,
    question: suggestions[callSheet.questions.length % suggestions.length],
    shootDayIds: callSheet.days.length ? "all" : [],
  };
}

function createGeneratedInterviewQuestions(callSheet: CallSheet): InterviewQuestion[] {
  return [
    "What problem were you trying to solve?",
    "What was the experience like before this project?",
    "What changed once the new approach was in place?",
    "What result are you most proud of?",
  ].map((question, index) => ({ id: `ai-question-${index + 1}`, question, shootDayIds: callSheet.days.length ? "all" : [] }));
}

function updateInterviewQuestion(callSheet: CallSheet, questionId: string, question: string): CallSheet {
  return { ...callSheet, questions: callSheet.questions.map((item) => item.id === questionId ? { ...item, question } : item) };
}

function moveInterviewQuestion(callSheet: CallSheet, questionId: string, direction: -1 | 1): CallSheet {
  const index = callSheet.questions.findIndex((question) => question.id === questionId);
  const targetIndex = index + direction;
  if (index < 0 || targetIndex < 0 || targetIndex >= callSheet.questions.length) return callSheet;
  const questions = [...callSheet.questions];
  const [moved] = questions.splice(index, 1);
  questions.splice(targetIndex, 0, moved);
  return { ...callSheet, questions };
}

function createGeneratedShots(callSheet: CallSheet): ProductionEntry[] {
  const dayId = callSheet.days[0]?.id ?? "";
  const startOrder = callSheet.entries.filter((entry) => entry.type === "shot").length;
  const suggestions = [
    { description: "Wide exterior establishing shot of the location", subject: "Shoot location", shotSize: "Wide", cameraMovement: "Static", scriptSection: "Opening" },
    { description: "Founder delivers the opening statement to camera", subject: "Founder", shotSize: "Medium", cameraMovement: "Static", scriptSection: "The customer challenge" },
    { description: "Over-the-shoulder product workflow demonstration", subject: "Product workflow", shotSize: "Medium close-up", cameraMovement: "Tracking", scriptSection: "How it works" },
    { description: "Team collaborating around the product", subject: "Client team", shotSize: "Medium wide", cameraMovement: "Gimbal", scriptSection: "The outcome" },
    { description: "Detail cutaways of hands, screens and reactions", subject: "Product details", shotSize: "Close-up", cameraMovement: "Handheld", scriptSection: "Supporting coverage" },
    { description: "Closing portrait and confident look to camera", subject: "Founder", shotSize: "Medium close-up", cameraMovement: "Push in", scriptSection: "Closing" },
  ] as const;

  return suggestions.map((suggestion, index) => ({
    id: `ai-shot-${index + 1}`,
    dayId,
    shotNumber: startOrder + index + 1,
    shotListOrder: startOrder + index,
    startTime: "",
    durationMinutes: 15,
    description: suggestion.description,
    type: "shot",
    personIds: [],
    captured: false,
    priority: index < 2 ? "Essential" : index < 5 ? "Useful" : "Optional",
    subject: suggestion.subject,
    shotSize: suggestion.shotSize,
    cameraMovement: suggestion.cameraMovement,
    scriptSection: suggestion.scriptSection,
  }));
}

function updateShootDay(callSheet: CallSheet, dayId: string, patch: Partial<ShootDay>): CallSheet {
  return { ...callSheet, days: callSheet.days.map((day) => day.id === dayId ? { ...day, ...patch } : day) };
}

function getPrimaryLocation(callSheet: CallSheet) {
  const primaryLocationId = callSheet.days[0]?.primaryLocationId;
  return callSheet.locations.find((location) => location.id === primaryLocationId) ?? callSheet.locations[0];
}

function updatePrimaryLocation(callSheet: CallSheet, patch: Partial<ShootLocation>): CallSheet {
  const existing = getPrimaryLocation(callSheet);
  const locationId = existing?.id ?? "location-primary";
  const location: ShootLocation = existing
    ? { ...existing, ...patch }
    : { id: locationId, name: "", address: "", parking: "", access: "", notes: "", shootDayIds: "all", ...patch };
  return {
    ...callSheet,
    locations: existing ? callSheet.locations.map((item) => item.id === existing.id ? location : item) : [...callSheet.locations, location],
    days: callSheet.days.map((day) => ({ ...day, primaryLocationId: day.primaryLocationId || locationId })),
  };
}

function toggleLocationDay(callSheet: CallSheet, dayId: string, checked: boolean): CallSheet {
  const existing = getPrimaryLocation(callSheet);
  const next = updatePrimaryLocation(callSheet, {});
  const location = getPrimaryLocation(next);
  if (!location) return next;
  const currentIds = location.shootDayIds === "all" ? next.days.map((day) => day.id) : location.shootDayIds;
  const shootDayIds = checked ? [...new Set([...currentIds, dayId])] : currentIds.filter((id) => id !== dayId);
  return { ...next, locations: next.locations.map((item) => item.id === (existing?.id ?? location.id) ? { ...item, shootDayIds } : item) };
}

function updatePerson(callSheet: CallSheet, personId: string, patch: Partial<ShootPerson>): CallSheet {
  return { ...callSheet, people: callSheet.people.map((person) => person.id === personId ? { ...person, ...patch } : person) };
}

function updateEntry(callSheet: CallSheet, entryId: string, patch: Partial<ProductionEntry>): CallSheet {
  return { ...callSheet, entries: callSheet.entries.map((entry) => entry.id === entryId ? { ...entry, ...patch } : entry) };
}

function removeEntry(callSheet: CallSheet, entryId: string): CallSheet {
  return { ...callSheet, entries: callSheet.entries.filter((entry) => entry.id !== entryId) };
}

function moveShot(callSheet: CallSheet, entryId: string, direction: -1 | 1): CallSheet {
  const shots = callSheet.entries.filter((entry) => entry.type === "shot").sort((left, right) => (left.shotListOrder ?? 0) - (right.shotListOrder ?? 0));
  const index = shots.findIndex((entry) => entry.id === entryId);
  const targetIndex = index + direction;
  if (index < 0 || targetIndex < 0 || targetIndex >= shots.length) return callSheet;
  const reordered = [...shots];
  const [moved] = reordered.splice(index, 1);
  reordered.splice(targetIndex, 0, moved);
  const orderById = new Map(reordered.map((entry, order) => [entry.id, order]));
  return { ...callSheet, entries: callSheet.entries.map((entry) => entry.type === "shot" ? { ...entry, shotListOrder: orderById.get(entry.id) ?? entry.shotListOrder } : entry) };
}

function updatePracticalInfo(callSheet: CallSheet, patch: Partial<CallSheet["practicalInfo"]>): CallSheet {
  return { ...callSheet, practicalInfo: { ...callSheet.practicalInfo, ...patch } };
}

function getMissingScheduleRequirements(callSheet: CallSheet) {
  const missing: string[] = [];
  if (!callSheet.days.length || callSheet.days.some((day) => !day.date || !day.generalCallTime || !day.expectedWrapTime)) missing.push("Shoot date and times");
  const primaryLocation = getPrimaryLocation(callSheet);
  if (!primaryLocation?.name.trim() || !primaryLocation.address.trim()) missing.push("Primary location");
  return missing;
}

function hasProductionNotes(callSheet: CallSheet) {
  const practicalInfo = callSheet.practicalInfo;
  return Boolean(practicalInfo.equipment || practicalInfo.wardrobe || practicalInfo.catering || practicalInfo.access || practicalInfo.safety || practicalInfo.weatherConsiderations || practicalInfo.clientNotes || practicalInfo.internalNotes);
}

function isOptionalStep(path: ShootSetupPath, step: number) {
  return path === "schedule" ? step === 2 || step === 4 : step === 2 || step === 3;
}

function formatSetupStatus(status: ShootSetupStatus) {
  if (status === "waiting_on_client") return "Waiting on Client";
  if (status === "waiting_on_studio") return "Waiting on Studio";
  if (status === "ready_to_finalise") return "Ready for approval";
  if (status === "released") return "Shoot approved";
  return "Setup handover";
}
