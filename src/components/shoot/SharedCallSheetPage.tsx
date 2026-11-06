"use client";

import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { FloatingCommentShell, getFloatingCommentPosition, type FloatingCommentPosition } from "@/components/script/FloatingCommentShell";
import { scriptUsers, type ScriptComment } from "@/data/script";
import { usePrototypeViewer } from "@/components/prototype-state/usePrototypeViewer";
import { useSearchParams } from "next/navigation";
import { ShootCommandMenu } from "./ShootCommandMenu";
import { DayNotesEditor, DayNotesText } from "./DayNotesEditor";
import { BriskSelect } from "@/components/form/BriskSelect";
import { IconButton } from "../../../Brisk DS/src/app/components/IconButton";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import type { Project } from "@/components/active-videos/types";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { useStudioCompanyName } from "@/components/prototype-state/useStudioCompanyName";
import { DsIcon, type DsIconName } from "@/components/video-review/DsIcon";
import {
  addMinutes,
  applyShootStudioIdentity,
  callSheetStorageKey,
  formatShootDate,
  formatTime,
  getInitialCallSheet,
  getShootDayShots,
  updateShootDayShot,
  type TrackShot,
  type DayNoteMark,
  getShootShotNumbers,
  getMapsLinkLabel,
  getMapsUrl,
  isAssignedToDay,
  normaliseShootArchitecture,
  type CallSheet,
  type ScheduleType,
  type ShootDay,
  type ShootLocation,
  type ShootPerson,
} from "@/data/shoot";

export const scheduleTypeMeta: Record<ScheduleType, { label: string; icon: DsIconName }> = {
  shot: { label: "Shot", icon: "video-camera-ds" },
  coverage: { label: "Coverage", icon: "folder" },
  setup: { label: "Setup", icon: "settings" },
  lunch: { label: "Lunch", icon: "fork-knife" },
  travel: { label: "Travel", icon: "car-simple" },
  break: { label: "Break", icon: "coffee" },
};

export type CallSheetSectionControls = {
  collapsed: boolean;
  focused: boolean;
  onToggleCollapse: () => void;
  onToggleFocus: () => void;
};

type CallSheetPlanningSection = "locations" | "people" | "schedule";
type LocationActions = {
  add: (day: ShootDay) => void;
  addExisting: (location: ShootLocation, day: ShootDay) => void;
  removeFromDay: (location: ShootLocation, day: ShootDay) => void;
  edit: (location: ShootLocation) => void;
  makePrimary: (locationId: string, dayId: string) => void;
};
type RosterActions = {
  add: (dayId: string) => void;
  edit: (person: ShootPerson) => void;
  removeFromDay: (person: ShootPerson, day: ShootDay) => void;
};

function getWeatherIcon(weather: string): DsIconName {
  const condition = (weather.split(" · ")[1] ?? weather).toLowerCase();

  if (condition.includes("rain") || condition.includes("shower") || condition.includes("storm")) return "weather-rain";
  if (condition.includes("sun") || condition.includes("clear")) return "weather-sun";
  return "weather-cloud";
}

export function SharedCallSheetPage({ SharedSchedule, includeInterviewQuestions, project, previewMode, printMode, viewerId, embedded = false, compact = false, onEditEssentials, embeddedCallSheet, canEdit, isStudioInternal, focusedSectionId = null, openSectionRequest, onOpenDocuments, locationActions, rosterActions, onOpenPlanningSection, onOpenSchedule, onEmbeddedChange, onEmbeddedSelectDay, onExitSectionFocus, onFocusSection, renderInterviewQuestions, renderRunOfDay }: {
  SharedSchedule?: ComponentType<{ callSheet: CallSheet; day: ShootDay; onTrackShot: TrackShot }>;
  project: Project;
  includeInterviewQuestions?: boolean;
  previewMode: boolean;
  printMode: boolean;
  viewerId?: string;
  embedded?: boolean;
  compact?: boolean;
  onEditEssentials?: () => void;
  embeddedCallSheet?: CallSheet;
  canEdit?: boolean;
  isStudioInternal?: boolean;
  focusedSectionId?: string | null;
  openSectionRequest?: { sectionId: string; requestId: number } | null;
  onOpenDocuments?: () => void;
  locationActions?: LocationActions; rosterActions?: RosterActions;
  onOpenPlanningSection?: (section: CallSheetPlanningSection) => void;
  onOpenSchedule?: () => void;
  onEmbeddedChange?: (updater: (current: CallSheet) => CallSheet) => void;
  onEmbeddedSelectDay?: (dayId: string) => void;
  onExitSectionFocus?: () => void;
  onFocusSection?: (sectionId: string) => void;
  renderInterviewQuestions?: (day: ShootDay, controls: CallSheetSectionControls) => ReactNode;
  renderRunOfDay?: (day: ShootDay, controls: CallSheetSectionControls) => ReactNode;
}) {
  const { selectedRole } = usePrototypeRole();
  const studioName = useStudioCompanyName();
  const searchParams = useSearchParams();
  const isEmptyPreview = searchParams.get("preview") === "empty";
  const requestedDayId = searchParams.get("day");
  const printAllDays = searchParams.get("all") === "1";
  const [callSheet, setCallSheet] = useState(() => applyShootStudioIdentity(normaliseShootArchitecture(embeddedCallSheet ?? getInitialCallSheet(project, studioName)), studioName));
  const [selectedDayId, setSelectedDayId] = useState(() => {
    const initialCallSheet = embeddedCallSheet ?? getInitialCallSheet(project, studioName);
    return initialCallSheet.days.some((day) => day.id === requestedDayId)
      ? requestedDayId ?? "day-1"
      : initialCallSheet.days[0]?.id ?? "day-1";
  });
  const [hasLoaded, setHasLoaded] = useState(false);
  const [copyStatus, setCopyStatus] = useState("Copy link");
  const [showPreviewBar, setShowPreviewBar] = useState(previewMode && !printMode);
  const [collapsedSectionIds, setCollapsedSectionIds] = useState<string[]>(compact ? ["documents", "locations", "emergency"] : ["documents"]);
  const effectiveIsStudioInternal = isStudioInternal ?? selectedRole !== "Customer";
  const documentAccess = !embedded && !printMode && !previewMode ? searchParams.get("linkAccess") : null;
  const editableDocument = documentAccess === "canEdit";
  const commentableDocument = editableDocument || documentAccess === "canComment";

  useEffect(() => {
    if (embedded) {
      if (embeddedCallSheet) {
        const next = applyShootStudioIdentity(normaliseShootArchitecture(embeddedCallSheet), studioName);
        setCallSheet(next);
        setSelectedDayId((current) => next.days.some((day) => day.id === current)
          ? current
          : next.days[0]?.id ?? "day-1");
      }
      setHasLoaded(true);
      return;
    }
    const loadStoredCallSheet = (event?: StorageEvent) => {
      if (event && event.key !== callSheetStorageKey(project.id)) return;
      try {
        const stored = window.localStorage.getItem(callSheetStorageKey(project.id));
        if (stored) {
          const next = applyShootStudioIdentity(normaliseShootArchitecture(JSON.parse(stored) as CallSheet), studioName);
          if (next.notice.trim() && !next.visibleOptionalSections.includes("notice")) {
            next.visibleOptionalSections = ["notice", ...next.visibleOptionalSections];
          }
          setCallSheet(next);
          setSelectedDayId((current) => {
            if (!event && requestedDayId && next.days.some((day) => day.id === requestedDayId)) {
              return requestedDayId;
            }

            return next.days.some((day) => day.id === current)
              ? current
              : next.days[0]?.id ?? "day-1";
          });
        }
      } finally {
        setHasLoaded(true);
      }
    };
    loadStoredCallSheet();
    window.addEventListener("storage", loadStoredCallSheet);
    return () => window.removeEventListener("storage", loadStoredCallSheet);
  }, [embedded, embeddedCallSheet, project.id, requestedDayId, studioName]);

  useEffect(() => {
    if (!printMode || !hasLoaded) return;
    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      const images = document.querySelectorAll<HTMLImageElement>(".shared-print-references img");
      await Promise.allSettled(Array.from(images, (image) => image.decode()));
      if (!cancelled) window.print();
    }, 500);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [hasLoaded, printMode]);

  useEffect(() => {
    if (!previewMode || printMode) return;
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) setShowPreviewBar(true);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [previewMode, printMode]);

  const currentDay = callSheet.days.find((day) => day.id === selectedDayId) ?? callSheet.days[0];
  const visibleDays = printMode && printAllDays
    ? callSheet.days
    : currentDay ? [currentDay] : [];
  const viewer = viewerId ? callSheet.people.find((person) => person.id === viewerId) : undefined;

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/share/call-sheet/${project.id}?day=${encodeURIComponent(selectedDayId)}`);
      setCopyStatus("Copied");
      window.setTimeout(() => setCopyStatus("Copy link"), 2000);
    } catch {
      setCopyStatus("Copy failed");
    }
  };

  const enterFullScreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setShowPreviewBar(false);
    } catch {
      window.open(`/share/call-sheet/${project.id}`, "_blank", "noopener,noreferrer");
    }
  };

  const updateLiveCallSheet = (updater: (current: CallSheet) => CallSheet) => {
    if (embedded && onEmbeddedChange) {
      onEmbeddedChange(updater);
      return;
    }
    const key = callSheetStorageKey(project.id);
    const stored = window.localStorage.getItem(key);
    const current = stored ? normaliseShootArchitecture(JSON.parse(stored) as CallSheet) : callSheet;
    const next = { ...updater(current), updatedAt: new Date().toISOString() };
    window.localStorage.setItem(key, JSON.stringify(next));
    setCallSheet(next);
  };

  const selectDay = (dayId: string) => {
    setSelectedDayId(dayId);
    if (embedded) onEmbeddedSelectDay?.(dayId);
  };

  const getSectionControls = (sectionId: string): CallSheetSectionControls => ({
    collapsed: collapsedSectionIds.includes(sectionId),
    focused: focusedSectionId === sectionId,
    onToggleCollapse: () => setCollapsedSectionIds((current) => current.includes(sectionId)
      ? current.filter((id) => id !== sectionId)
      : [...current, sectionId]),
    onToggleFocus: () => focusedSectionId === sectionId ? onExitSectionFocus?.() : onFocusSection?.(sectionId),
  });

  useEffect(() => {
    if (!openSectionRequest) return;
    setCollapsedSectionIds((current) => current.filter((sectionId) => sectionId !== openSectionRequest.sectionId));
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(`[data-call-sheet-section="${openSectionRequest.sectionId}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }));
  }, [openSectionRequest]);

  const Root = embedded ? "div" : "main";

  return (
    <Root className={`shared-call-sheet ${embedded ? "is-embedded" : ""} ${printMode ? "is-print-mode" : ""} ${showPreviewBar ? "has-preview-bar" : ""}`}>
      {showPreviewBar ? <header className="shared-preview-bar">
        <div className="shared-preview-context">
          <Link className="shared-preview-back label-s-semibold" href={`/projects/${project.id}/stages/shoot`}><DsIcon name="arrow-left" size={16} />Back to Shoot</Link>
          <span className="shared-preview-divider" aria-hidden="true" />
          <strong>Previewing Call Sheet</strong>
          <button className="shared-preview-info" type="button" aria-label="About Call Sheet preview" title="This is how the public Call Sheet will appear. Builder changes update it immediately."><DsIcon name="info" size={16} /></button>
        </div>
        <nav className="shared-preview-actions" aria-label="Preview actions">
          <button className="label-s-semibold" type="button" onClick={enterFullScreen}><DsIcon name="frame-corners" size={16} />Full screen</button>
          <Link className="label-s-semibold" href={`/projects/${project.id}/stages/shoot`}><DsIcon name="pencil-simple-ds" size={16} />Edit</Link>
          {effectiveIsStudioInternal ? <Link className="label-s-semibold" href={`/projects/${project.id}/stages/shoot?view=on-set&day=${encodeURIComponent(selectedDayId)}&section=schedule`}><DsIcon name="video-camera-ds" size={16} />Open Shoot day</Link> : null}
          <details className="shared-preview-share">
            <summary className="label-s-semibold"><DsIcon name="link-simple-horizontal" size={16} />Share<DsIcon name="caret-down" size={13} /></summary>
            <div className="shared-preview-share-menu">
              <button className="label-s-semibold" type="button" onClick={copyShareLink}><DsIcon name="copy" size={16} />{copyStatus}</button>
              <a className="label-s-semibold" href={`/share/call-sheet/${project.id}?print=1&day=${encodeURIComponent(selectedDayId)}`} target="_blank" rel="noreferrer"><DsIcon name="download-simple" size={16} />Download selected day</a>
              {callSheet.days.length > 1 ? <a className="label-s-semibold" href={`/share/call-sheet/${project.id}?print=1&all=1`} target="_blank" rel="noreferrer"><DsIcon name="file-text" size={16} />Download all shoot days</a> : null}
              <button className="label-s-semibold" type="button" onClick={() => window.print()}><DsIcon name="printer" size={16} />Print</button>
            </div>
          </details>
        </nav>
      </header> : null}
      {!embedded ? <header className="shared-brand-bar">
        <div className="shared-brand-mark label-s-semibold" aria-hidden="true">{callSheet.studioInitials}</div>
        <div>
          <strong>{callSheet.studioName}</strong>
          <span className="label-xs">Call Sheet</span>
        </div>
      </header> : null}

      {isEmptyPreview && !embedded ? (
        <section className="shared-call-sheet-empty">
          <span className="shared-call-sheet-empty-icon" aria-hidden="true"><DsIcon name="clipboard-text" size={28} /></span>
          <h1>{selectedRole === "Customer" ? "The call sheet is still being prepared" : "This call sheet isn’t ready yet"}</h1>
          <p className="paragraph-s">{selectedRole === "Customer" ? "Production will share the schedule, location and call details here when they are ready." : "Add the schedule, location and key contacts before sharing it."}</p>
          <div className="shared-call-sheet-empty-actions">
            <Link className="shared-primary-action label-s-semibold" href={selectedRole === "Customer" ? "/customer-dashboard" : `/projects/${project.id}/stages/shoot`}>{selectedRole === "Customer" ? "Back to project" : "Open Shoot"}</Link>
            {selectedRole === "Customer" ? <Link className="shared-secondary-action label-s-semibold" href={`/chat?project=${project.id}`}>Message production</Link> : null}
          </div>
        </section>
      ) : !currentDay ? (
        <section className="shared-call-sheet-empty">
          <span className="shared-call-sheet-empty-icon" aria-hidden="true"><DsIcon name="calendar" size={28} /></span>
          <h1>No shoot day has been added yet</h1>
          <p className="paragraph-s">Add a shoot day in Schedule. This live Call Sheet will update immediately.</p>
        </section>
      ) : <div className="shared-call-sheet-content">
        {!embedded ? <header className="shared-project-heading">
          <p className="label-xs-semibold">{project.clientName}</p>
          <h1>{callSheet.projectName}</h1>
        </header> : null}
        {visibleDays.map((day, index) => (
          <SharedDay
            includeInterviewQuestions={includeInterviewQuestions ?? (!embedded && callSheet.visibleOptionalSections.includes("questions"))}
            callSheet={callSheet}
            clientName={project.clientName}
            day={day}
            embedded={embedded}
            compact={compact}
            onEditEssentials={canEdit ? onEditEssentials : undefined}
            projectId={project.id}
            viewer={viewer && isAssignedToDay(viewer.shootDayIds, day.id) ? viewer : undefined}
            isStudioInternal={effectiveIsStudioInternal}
            getSectionControls={embedded && !printMode && (compact || onFocusSection) ? getSectionControls : undefined}
            printIndex={printMode ? index : undefined}
            onSelectDay={!printMode ? selectDay : undefined}
            onChange={(embedded && canEdit && !printMode) || editableDocument ? updateLiveCallSheet : undefined}
            canComment={commentableDocument || Boolean(embedded && canEdit && !printMode)}
            onOpenDocuments={embedded && !printMode ? onOpenDocuments : undefined}
            locationActions={embedded && canEdit && effectiveIsStudioInternal && !printMode ? locationActions : undefined}
            rosterActions={embedded && canEdit && effectiveIsStudioInternal && !printMode ? rosterActions : undefined}
            onOpenPlanningSection={embedded && effectiveIsStudioInternal && !printMode ? onOpenPlanningSection : undefined}
            onOpenSchedule={embedded && effectiveIsStudioInternal && !printMode ? onOpenSchedule : undefined}
            renderInterviewQuestions={!printMode ? renderInterviewQuestions : undefined}
            renderRunOfDay={!embedded && !printMode && !previewMode && SharedSchedule
              ? (shootDay) => <SharedSchedule callSheet={callSheet} day={shootDay} onTrackShot={(shotId, change) => updateLiveCallSheet((sheet) => updateShootDayShot(sheet, shootDay.id, shotId, change))} />
              : !printMode ? renderRunOfDay : undefined}
            key={day.id}
          />
        ))}
      </div>}

      {!embedded ? <footer className="shared-call-sheet-footer">
        <span>{callSheet.studioName}</span>
        <span className="label-xs">Updated {formatUpdatedTime(callSheet.updatedAt)}</span>
      </footer> : null}
    </Root>
  );
}

export function OnSetLiveView({ callSheet, day, isStudioInternal, project, onBack, onChange }: { callSheet: CallSheet; day?: ShootDay; isStudioInternal: boolean; project: Project; onBack?: () => void; onChange: (updater: (current: CallSheet) => CallSheet) => void }) {
  const [missedShotIds, setMissedShotIds] = useState<string[]>([]);
  const [productionNote, setProductionNote] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const timedEntries = callSheet.entries.filter((entry) => entry.dayId === day?.id && entry.startTime).sort((left, right) => left.startTime.localeCompare(right.startTime));
  const currentEntryIndex = timedEntries.findIndex((entry) => !(entry.completed || entry.captured));
  const currentEntry = currentEntryIndex >= 0 ? timedEntries[currentEntryIndex] : undefined;
  const nextEntry = currentEntryIndex >= 0 ? timedEntries[currentEntryIndex + 1] : undefined;
  const shots = callSheet.entries.filter((entry) => entry.type === "shot" && (!day || entry.dayId === day.id || !entry.dayId));
  const capturedCount = shots.filter((shot) => shot.captured).length;
  const remainingCount = shots.filter((shot) => !shot.captured && !missedShotIds.includes(shot.id) && !(day && shot.skippedShootDayIds?.includes(day.id))).length;
  const people = callSheet.people.filter((person) => !day || isAssignedToDay(person.shootDayIds, day.id));

  return <div className="on-set-live-shell">
    <header className="on-set-live-heading"><div><p className="label-xs-semibold">On Set · {day?.label ?? "Shoot day"}</p><h1>{isComplete ? "Shoot complete" : "Live shoot"}</h1><span className="label-s">{callSheet.projectName}</span></div>{onBack ? <Button size="S" variant="secondary" className="shoot-button secondary" type="button" onClick={onBack}>Back to Call Sheet</Button> : <Link className="shoot-button secondary label-s-semibold" href={`/projects/${project.id}/stages/shoot`}>Back to Shoot</Link>}</header>
    <section className="on-set-live-now"><span className="label-xs-semibold">Current Schedule item</span><strong>{currentEntry?.description ?? "No Schedule item remaining"}</strong>{currentEntry ? <small className="label-s">{formatTime(currentEntry.startTime)} to {formatTime(addMinutes(currentEntry.startTime, currentEntry.durationMinutes))}</small> : null}{currentEntry ? <Button size="S" variant="primary" className="shoot-button primary" type="button" onClick={() => onChange((current) => ({ ...current, entries: current.entries.map((entry) => entry.id === currentEntry.id ? { ...entry, completed: true, captured: entry.type === "shot" ? true : entry.captured } : entry) }))}>Complete item</Button> : null}</section>
    <div className="on-set-live-stats"><article><span className="label-xs">Next Schedule item</span><strong>{nextEntry?.description ?? "Nothing else scheduled"}</strong>{nextEntry ? <small>{formatTime(nextEntry.startTime)}</small> : null}</article><article><span className="label-xs">Shots captured</span><strong>{capturedCount}</strong></article><article><span className="label-xs">Shots remaining</span><strong>{remainingCount}</strong></article></div>
    <section className="on-set-live-section"><header><h2>Shots</h2><span className="label-xs">Tick off coverage as it is captured.</span></header><div className="on-set-live-shot-list">{shots.map((shot, index) => {
      const isMissed = missedShotIds.includes(shot.id);
      return <article className={shot.captured ? "is-captured" : isMissed ? "is-missed" : ""} key={shot.id}><button className="on-set-live-shot-toggle" type="button" aria-label={`${shot.captured ? "Mark remaining" : "Mark captured"}: ${shot.description}`} onClick={() => onChange((current) => ({ ...current, entries: current.entries.map((entry) => entry.id === shot.id ? { ...entry, captured: !shot.captured } : entry) }))}><DsIcon name={shot.captured ? "check-circle" : "video-camera-ds"} size={22} /></button><div><strong>{shot.description}</strong><span className="label-xs">Shot {shot.shotNumber ?? index + 1}{shot.priority ? ` · ${shot.priority}` : ""}</span></div><Button size="S" variant="ghost" className="shoot-text-action" type="button" onClick={() => setMissedShotIds((current) => current.includes(shot.id) ? current.filter((id) => id !== shot.id) : [...current, shot.id])}>{isMissed ? "Restore" : "Missed / pickup"}</Button></article>;
    })}</div></section>
    <section className="on-set-live-section"><header><h2>Quick production notes</h2></header><textarea rows={4} placeholder="Add a note from the set" value={productionNote} onChange={(event) => setProductionNote(event.target.value)} /></section>
    <section className="on-set-live-section"><header><h2>Crew and Talent</h2></header><div className="on-set-live-contact-list">{people.map((person) => <article key={person.id}><div><strong>{person.name}</strong><span className="label-xs">{person.role || person.type} · Call {formatTime(person.callTime)}</span></div>{(isStudioInternal || person.showContactDetails === true) && person.phone ? <a className="shoot-button secondary label-s-semibold" href={`tel:${normalisePhone(person.phone)}`}>Call</a> : null}</article>)}</div></section>
    <footer className="on-set-live-footer">{isComplete ? <Link className="shoot-button primary label-s-semibold" href={`/projects/${project.id}/stages/media`}>Open Media</Link> : <Button size="S" variant="primary" onClick={() => setIsComplete(true)}>Complete Shoot</Button>}</footer>
  </div>;
}

function SharedDay({ includeInterviewQuestions, canComment, callSheet, clientName, day, embedded, compact = false, onEditEssentials, projectId, viewer, isStudioInternal, getSectionControls, printIndex, onSelectDay, onChange, onOpenDocuments, locationActions, rosterActions, onOpenPlanningSection, onOpenSchedule, renderInterviewQuestions, renderRunOfDay }: { includeInterviewQuestions: boolean; canComment: boolean; callSheet: CallSheet; clientName: string; day: ShootDay; embedded: boolean; compact?: boolean; onEditEssentials?: () => void; projectId: string; viewer?: CallSheet["people"][number]; isStudioInternal: boolean; getSectionControls?: (sectionId: string) => CallSheetSectionControls; printIndex?: number; onSelectDay?: (dayId: string) => void; onChange?: (updater: (current: CallSheet) => CallSheet) => void; onOpenDocuments?: () => void; locationActions?: LocationActions; rosterActions?: RosterActions; onOpenPlanningSection?: (section: CallSheetPlanningSection) => void; onOpenSchedule?: () => void; renderInterviewQuestions?: (day: ShootDay, controls: CallSheetSectionControls) => ReactNode; renderRunOfDay?: (day: ShootDay, controls: CallSheetSectionControls) => ReactNode }) {
  const [editingPhones, setEditingPhones] = useState(false);
  const locationSectionActionsRef = useRef<HTMLDivElement>(null);
  const addPersonRef = useRef<HTMLButtonElement>(null);
  const location = callSheet.locations.find((item) => item.id === day.primaryLocationId);
  const timedEntries = callSheet.entries.filter((entry) => entry.dayId === day.id && entry.startTime).sort((left, right) => left.startTime.localeCompare(right.startTime));
  const dayShots = getShootDayShots(callSheet, day.id);
  const scheduledGroups = new Set(timedEntries.flatMap((entry) => entry.linkedShotGroupId ?? []));
  const untimedShots = dayShots.filter((shot) => !shot.startTime && !scheduledGroups.has(shot.shotGroupId ?? ""));
  const dayQuestions = includeInterviewQuestions ? callSheet.questions.filter((question) => isAssignedToDay(question.shootDayIds, day.id)) : [];
  const remainingShots = dayShots.filter((entry) => !entry.captured && entry.captureStatus !== "not-required" && !entry.skippedShootDayIds?.includes(day.id)).length;
  const displayedWeather = getDisplayedWeather(callSheet.weather, Boolean(day.date && location));
  const [temperature, conditions, rainChance] = displayedWeather.split(" · ");
  const people = callSheet.people.filter((person) => isAssignedToDay(person.shootDayIds, day.id));
  const locations = callSheet.locations.filter((item) => isAssignedToDay(item.shootDayIds, day.id));
  const documents = callSheet.documents.filter((document) => isAssignedToDay(document.shootDayIds, day.id));
  const dayNotes = day.notes?.practicalDetails ?? getLegacyDayNotes(callSheet, day, location);
  const nearestEmergencyHospital = day.safetyEmergency?.confirmed && !day.safetyEmergency.needsReview
    && day.safetyEmergency.hospitalName.trim() && day.safetyEmergency.hospitalAddress.trim() ? day.safetyEmergency : undefined;
  const internalNotes = isStudioInternal ? day.notes?.internalNotes?.trim() ?? "" : "";
  const visibleProductionContact = isStudioInternal ? callSheet.onTheDayContact
    : visibleRosterContact(callSheet, callSheet.onTheDayContact);
  const productionPhoneText = visibleProductionContact.match(/(?:\+?\d[\d\s()-]{7,}\d)/u)?.[0]?.trim() ?? "";
  const visibleProductionPhone = normalisePhone(productionPhoneText);
  const productionContactDetails = visibleProductionContact.replace(productionPhoneText, "").replace(/\s*·\s*$/u, "").trim();
  const sectionControls = (sectionId: string): CallSheetSectionControls => getSectionControls?.(sectionId) ?? {
    collapsed: false,
    focused: false,
    onToggleCollapse: () => undefined,
    onToggleFocus: () => undefined,
  };
  const updatePersonPhone = (personId: string, phone: string) => onChange?.((current) => ({
    ...current,
    people: current.people.map((person) => person.id === personId ? { ...person, phone } : person),
  }));
  const updateDayNotes = (value: string, marks: DayNoteMark[]) => onChange?.((current) => ({
    ...current,
    days: current.days.map((item) => item.id === day.id ? {
      ...item,
      notes: {
        equipment: "",
        wardrobe: "",
        catering: "",
        access: "",
        safety: "",
        weatherConsiderations: "",
        clientNotes: "",
        internalNotes: "",
        ...item.notes,
        practicalDetails: value,
        practicalDetailsMarks: marks,
      },
    } : item),
  }));

  const peopleControls = getSectionControls?.("people");
  const compactEmptyPeople = compact && !people.length && !peopleControls?.focused;
  const canEditPhones = Boolean(!rosterActions && onChange && people.some((person) => isStudioInternal || person.showContactDetails === true));
  const peopleActions = (rosterActions || onOpenPlanningSection || canEditPhones) && <div className="shared-section-actions shared-people-actions">
    {rosterActions ? <Button ref={addPersonRef} size="S" variant="ghost" onClick={() => rosterActions.add(day.id)}>Add person</Button> : onOpenPlanningSection && <Button size="S" variant="ghost" onClick={() => onOpenPlanningSection("people")}>{compact ? "Add person" : "Manage people in Planning"}</Button>}
    {canEditPhones && (editingPhones
      ? <Button size="S" variant="secondary" onClick={() => setEditingPhones(false)}>Done</Button>
      : <BriskSelect mode="action" actionMenuSize="compact" ariaLabel="People actions" placeholder="People actions" value="" clearable={false}
          options={[{ value: "phones", label: "Edit phone numbers" }]}
          onChange={() => {
            if (peopleControls?.collapsed && !peopleControls.focused) peopleControls.onToggleCollapse();
            setEditingPhones(true);
          }}
          actionTrigger={(props) => <IconButton {...props} aria-label="People actions" tooltipAlign="end"><DsIcon name="dots-three" size={16} /></IconButton>}
        />)}
  </div>;
  const peopleSection = compactEmptyPeople ? (
    <SharedSection title="People" count={0} headerAction={peopleActions} />
  ) : (
      <SharedSection title="People" count={people.length} controls={peopleControls} headerAction={peopleActions}>
        {people.length ? <div className="shared-contact-list">{people.map((person) => (
          <article key={person.id} className={rosterActions ? "has-roster-actions" : undefined}>
            <span className="shared-contact-avatar label-xs-semibold">{getInitials(person.name)}</span>
            <div><CallSheetRowName name={person.name} onEdit={rosterActions && (() => rosterActions.edit(person))} /><span className="label-xs">{person.role || person.type} · Call {formatTime(person.callTime || (compact ? day.generalCallTime : ""))}</span></div>
            {(isStudioInternal || person.showContactDetails === true) && <div className="shared-contact-details">
              {person.email && <a className="shared-contact-email label-xs" href={`mailto:${person.email}`}>{person.email}</a>}
              {editingPhones ? <OperationalField label="Phone" type="tel" value={person.phone} onChange={(value) => updatePersonPhone(person.id, value)} />
                : person.phone && <a className="shared-contact-email label-s-semibold" aria-label={`Call ${person.name}, ${person.phone}`} href={`tel:${normalisePhone(person.phone)}`}>{person.phone}</a>}
            </div>}
            {rosterActions && <ShootCommandMenu compact align="end" label={`Actions for ${person.name}`}
              fallbackFocus={() => addPersonRef.current}
              actions={[
                { label: "Edit person", onSelect: () => rosterActions.edit(person) },
                { label: `Remove from ${day.label}`, dividerAbove: true, onSelect: () => rosterActions.removeFromDay(person, day) },
              ]} />}
          </article>
        ))}</div> : <div className="shared-section-empty"><strong>No people added</strong><span className="label-xs">{rosterActions ? "Add crew and talent for this day." : "Add crew and talent in Planning before the day begins."}</span></div>}
      </SharedSection>
  );

  return (
    <article className={`shared-print-day ${compact ? "is-compact-call-sheet" : ""} ${typeof printIndex === "number" ? "is-print-day" : ""}`}>
      {typeof printIndex === "number" ? (
        <header className="shared-document-print-header">
          <div className="shared-document-print-studio">
            <span className="shared-brand-mark label-s-semibold" aria-hidden="true">{callSheet.studioInitials}</span>
            <div><strong>{callSheet.studioName}</strong><span>Production call sheet</span></div>
          </div>
          <div className="shared-document-print-title">
            <span>{clientName}</span>
            <h1>{callSheet.projectName}</h1>
            <p>{day.label}</p>
          </div>
          <dl>
            <div><dt>Shoot date</dt><dd>{formatShootDate(day.date)}</dd></div>
            <div><dt>Updated</dt><dd>{formatUpdatedTime(callSheet.updatedAt)}</dd></div>
          </dl>
        </header>
      ) : null}
      <section className="shared-call-hero" aria-label={`${day.label} essentials`}>
        {onSelectDay && (onEditEssentials ? <ShootDayControls days={callSheet.days} day={day} onSelectDay={onSelectDay} onEdit={onEditEssentials} /> : <ShootDaySwitcher days={callSheet.days} activeDayId={day.id} onSelectDay={onSelectDay} />)}
        {typeof printIndex === "number" ? <header className="shared-print-day-heading"><strong>{day.label} of {callSheet.days.length}</strong></header> : null}
        <div className="shared-date-block">
          <h2>{day.date ? formatShootDate(day.date) : "Shoot date not set"}</h2>
          {compact && !day.date && onEditEssentials ? <Button size="S" variant="ghost" onClick={onEditEssentials}>Add shoot date</Button> : null}
        </div>
        <div className="shared-call-time-block">
          <span className="label-xs-semibold">General call</span>
          <strong>{formatTime(day.generalCallTime)}</strong>
          {day.expectedWrapTime ? <small>Expected wrap {formatTime(day.expectedWrapTime)}</small> : compact ? <small>Expected wrap: Not set</small> : null}
          {compact && (!day.generalCallTime || !day.expectedWrapTime) && onEditEssentials ? <Button size="S" variant="ghost" onClick={onEditEssentials}>Set times</Button> : null}
        </div>
        {viewer ? (
          <div className="shared-personal-call">
            <span className="label-xs-semibold">Your call time</span>
            <strong>{formatTime(viewer.callTime)}</strong>
            <small>{viewer.name} · {viewer.role}</small>
          </div>
        ) : null}
        <div className="shared-location-block">
          {location ? <div className="shared-location-title">
            <strong>{location.name}</strong>
            {compact && onOpenPlanningSection && <IconButton aria-label="Edit location" onClick={() => onOpenPlanningSection("locations")}>
              <DsIcon name="pencil-simple-ds" size={16} />
            </IconButton>}
          </div> : compact && onOpenPlanningSection
            ? <Button size="S" variant="ghost" onClick={() => onOpenPlanningSection("locations")}>Add location</Button>
            : <strong>Location not set</strong>}
          {location && (location.mapLink || location.address) ? <a className="shared-location-address label-s-semibold" href={getMapsUrl(location.mapLink || location.address)} target="_blank" rel="noreferrer">{getMapsLinkLabel(location.address || location.mapLink || "")}</a> : null}
        </div>
        {!compact ? <>
          <div className="shared-weather-block">
            <div className="shared-weather-summary"><span className="shared-weather-icon" aria-hidden="true"><DsIcon name={getWeatherIcon(displayedWeather)} size={18} /></span><div><strong>{temperature}</strong><p>{[conditions, rainChance].filter(Boolean).join(" · ")}</p></div></div>
          </div>
          {visibleProductionContact ? <div className="shared-production-contact">
            <span className="label-xs-semibold">Production contact</span>
            <strong>{productionContactDetails}</strong>
            {visibleProductionPhone ? <div className="shared-contact-details"><a className="shared-contact-email label-s-semibold" aria-label={`Call ${productionContactDetails}`} href={`tel:${visibleProductionPhone}`}>{productionPhoneText}</a></div> : null}
          </div> : null}
        </> : null}
      </section>

      {!embedded ? <section className="shared-day-glance is-single" aria-label="At a glance">
        <article><span className="label-xs-semibold">Shots remaining</span><strong>{remainingShots}</strong>{renderRunOfDay && <small>Track detailed coverage below</small>}{!renderRunOfDay && isStudioInternal && typeof printIndex !== "number" ? <Link className="shared-shot-list-link label-s-semibold" href={`/projects/${projectId}/stages/shoot?view=on-set&day=${encodeURIComponent(day.id)}&section=schedule`}>Open Shoot day<DsIcon name="arrow-right" size={14} /></Link> : null}</article>
      </section> : null}

      {renderRunOfDay ? renderRunOfDay(day, sectionControls("run-of-day")) : <SharedSection title="Run of day" count={timedEntries.length} controls={getSectionControls?.("run-of-day")}>
        {timedEntries.length ? <div className="shared-schedule-list">{timedEntries.map((entry) => {
          const meta = scheduleTypeMeta[entry.type];
          const rowLocation = callSheet.locations.find((item) => item.id === entry.locationId);
          const linkedGroup = entry.linkedShotGroupId ? callSheet.shotGroups?.find((group) => group.id === entry.linkedShotGroupId) : undefined;
          const linkedShots = linkedGroup ? dayShots.filter((shot) => shot.shotGroupId === linkedGroup.id) : [];
          return (
            <article className={`shared-schedule-row is-${entry.type} ${entry.captured ? "captured" : ""}`} key={entry.id}>
              <div className="shared-schedule-time"><strong>{formatTime(entry.startTime)}</strong>{entry.durationMinutes ? <span className="label-xs">to {formatTime(addMinutes(entry.startTime, entry.durationMinutes))}</span> : null}</div>
              <span className="shared-schedule-icon"><DsIcon name={entry.type === "shot" && entry.captured ? "check-circle" : meta.icon} size={18} /></span>
              <div><strong>{linkedGroup?.name ?? entry.description}</strong><span className="label-xs">{[entry.type === "coverage" && linkedShots.length ? `${linkedShots.length} ${linkedShots.length === 1 ? "shot" : "shots"}` : meta.label, rowLocation?.name].filter(Boolean).join(" · ")}</span>
                {typeof printIndex === "number" && linkedShots.length > 0 && <ul>{linkedShots.map((shot) => <li className="label-s" key={shot.id}>{shot.description}</li>)}</ul>}
              </div>
            </article>
          );
        })}</div> : <div className="shared-empty-schedule"><p className="shared-empty-copy">{onOpenSchedule ? "The schedule has not been added yet." : "Schedule not yet available."}</p>{onOpenSchedule ? <button className="shared-schedule-helper-link label-s-semibold" type="button" onClick={onOpenSchedule}>Create the run of day in Schedule<DsIcon name="arrow-right" size={14} /></button> : null}</div>}
      </SharedSection>}

      {!renderRunOfDay && untimedShots.length > 0 && <SharedSection title="Shots without a time" count={untimedShots.length}>
        <ol>{untimedShots.map((shot) => <li key={shot.id}><strong>{shot.description}</strong></li>)}</ol>
      </SharedSection>}
      {compact ? peopleSection : null}
      {!embedded && <PrintShotReferences callSheet={callSheet} shots={dayShots} />}

      {renderInterviewQuestions ? renderInterviewQuestions(day, sectionControls("interview-questions"))
        : dayQuestions.length > 0 && <SharedSection title="Interview" count={dayQuestions.length}>
          <ol>{dayQuestions.map((question) => {
            const talent = !question.unassignedDayIds?.includes(day.id) && people.find((person) => person.id === question.personId);
            return <li key={question.id}><strong>{question.question}</strong>{talent && <p className="label-s">{talent.name}</p>}</li>;
          })}</ol>
        </SharedSection>}

      {locationActions || !compact || locations.some((item) => item.id !== location?.id) ? <SharedSection title="Locations" count={locations.length} controls={getSectionControls?.("locations")}
        headerAction={locationActions && <div ref={locationSectionActionsRef}><BriskSelect
          mode="action" ariaLabel={`Add location to ${day.label}`} placeholder="Add location" value="" clearable={false}
          emptyLabel="No other shoot locations"
          options={callSheet.locations.filter((item) => !isAssignedToDay(item.shootDayIds, day.id)).map((item) => ({ value: item.id, label: item.name, description: item.address }))}
          onChange={(id) => {
            const item = callSheet.locations.find((candidate) => candidate.id === id);
            if (item) locationActions.addExisting(item, day);
          }}
          footerAction={{ label: "Create new location", icon: "plus", onSelect: () => locationActions.add(day) }}
          actionTrigger={(props) => <Button {...props} size="S" variant="ghost">Add location</Button>}
        /></div>}>
        <OperationalSectionActions
          editing={false}
          planningLabel={locations.length ? "Manage locations in Planning" : "Add locations in Planning"}
          showEdit={false}
          showPlanning={Boolean(!locationActions && onOpenPlanningSection && !compact)}
          onOpenPlanning={() => onOpenPlanningSection?.("locations")}
        />
        {locations.length ? <div className="shared-location-list">{locations.map((item) => (
          <article key={item.id}>
            <div className="shared-location-heading">
              <CallSheetRowName name={item.name} onEdit={locationActions && (() => locationActions.edit(item))} />
              {item.id === day.primaryLocationId && <span className="label-xs-semibold">Primary</span>}
              {locationActions && <ShootCommandMenu compact align="end" label={`Actions for ${item.name}`}
                fallbackFocus={() => locationSectionActionsRef.current?.querySelector("button") ?? null}
                actions={[
                  { label: "Edit location", onSelect: () => locationActions.edit(item) },
                  ...(item.id === day.primaryLocationId ? [] : [{ label: `Make primary for ${day.label}`, onSelect: () => locationActions.makePrimary(item.id, day.id) }]),
                  { label: `Remove from ${day.label}`, dividerAbove: true, onSelect: () => locationActions.removeFromDay(item, day) },
                ]} />}
            </div>
            {item.mapLink || item.address ? <a className="shared-location-map label-s-semibold" href={getMapsUrl(item.mapLink || item.address)} target="_blank" rel="noreferrer">{getMapsLinkLabel(item.address || item.mapLink || "")}</a> : null}
          </article>
        ))}</div> : <div className="shared-section-empty"><strong>No locations added</strong>{!locationActions && <span className="label-xs">Add the shoot locations in Planning before the day begins.</span>}</div>}
      </SharedSection> : null}

      {!compact ? peopleSection : null}

      {onChange || dayNotes.trim() || internalNotes ? (
        <SharedSection title="Notes for the day" controls={getSectionControls?.("notes")}>
          {onChange ? (
            <DayNotesEditor label={`${day.label} notes`} text={dayNotes} marks={day.notes?.practicalDetailsMarks} onChange={updateDayNotes} />
          ) : dayNotes.trim() ? <p className="shared-notes"><DayNotesText text={dayNotes} marks={day.notes?.practicalDetailsMarks} /></p> : compact ? <p className="label-s">No notes added.</p> : null}
          {internalNotes ? <div className="shared-practical-grid"><PracticalItem title="Internal Studio notes" body={internalNotes} /></div> : null}
        </SharedSection>
      ) : null}

      {typeof printIndex !== "number" && <CallSheetDayComments projectId={projectId} day={day} canComment={canComment} showWhenEmpty={!embedded} />}

      {documents.length || (!compact && onOpenDocuments) ? (
        <SharedSection sectionId="documents" title="Documents" count={documents.length} controls={getSectionControls?.("documents")}>
          <div className="shared-documents-section">
            {documents.length ? <div className="shared-document-list">{documents.map((document) => <a href={document.url} target="_blank" rel="noreferrer" key={document.id}><DsIcon name={document.kind === "link" ? "link" : "file-text"} size={18} /><span>{document.name}</span><DsIcon name="arrow-bend-up-right" size={16} /></a>)}</div> : <div className="shared-documents-empty"><strong>No documents added</strong><span className="label-xs">Add files or links the crew may need on the shoot day.</span></div>}
            {onOpenDocuments ? <Button size="S" variant="secondary" className="shoot-button secondary" type="button" onClick={onOpenDocuments}><DsIcon name="folder" size={16} />Manage documents</Button> : null}
          </div>
        </SharedSection>
      ) : null}

      {nearestEmergencyHospital && location ? (
        <SharedSection title="Nearest emergency hospital" controls={compact ? getSectionControls?.("emergency") : undefined}>
          <div className="shared-safety-emergency">
            <div>
              <strong>{nearestEmergencyHospital.hospitalName}</strong>
              <a className="shared-location-map label-s-semibold" href={getMapsUrl(nearestEmergencyHospital.hospitalAddress)} target="_blank" rel="noreferrer">{nearestEmergencyHospital.hospitalAddress}</a>
              {nearestEmergencyHospital.travelTime && <span className="label-xs">{nearestEmergencyHospital.travelTime}</span>}
            </div>
            <a className="shared-primary-action label-s-semibold" href={getMapsUrl(nearestEmergencyHospital.hospitalAddress)} target="_blank" rel="noreferrer"><DsIcon name="arrow-bend-up-right" size={16} />Directions</a>
            <div>
              <span className="label-xs-semibold">Emergency</span>
              <a href={`tel:${normalisePhone(nearestEmergencyHospital.emergencyNumber)}`}>{nearestEmergencyHospital.emergencyNumber}</a>
              {nearestEmergencyHospital.hospitalPhone ? <a className="label-xs-semibold" href={`tel:${normalisePhone(nearestEmergencyHospital.hospitalPhone)}`}>Hospital {nearestEmergencyHospital.hospitalPhone}</a> : null}
            </div>
          </div>
        </SharedSection>
      ) : embedded && isStudioInternal && location ? <SharedSection title="Nearest emergency hospital" controls={getSectionControls?.("emergency")}>
        <p className="label-s">Needs confirmation</p>
        {onEditEssentials && <Button size="S" variant="ghost" onClick={onEditEssentials}>Review day details</Button>}
      </SharedSection> : null}

      {typeof printIndex === "number" ? (
        <footer className="shared-document-print-footer">
          <span>{callSheet.studioName} · {callSheet.projectName}</span>
          <span>{day.label} of {callSheet.days.length}</span>
        </footer>
      ) : null}
    </article>
  );
}

function visibleRosterContact(callSheet: CallSheet, value: string) {
  if (!value.trim()) return "";
  const digits = normalisePhone(value);
  const contact = callSheet.people.find((person) => {
    const phone = normalisePhone(person.phone);
    return value.split(" · ")[0].trim() === person.name || Boolean(phone && digits.includes(phone));
  });
  if (!contact) return "";
  return [contact.name, contact.role, contact.showContactDetails ? contact.phone : ""].filter(Boolean).join(" · ");
}

function getLegacyDayNotes(callSheet: CallSheet, day: ShootDay, location: CallSheet["locations"][number] | undefined) {
  const emergency = day.safetyEmergency;
  const sharedEmergencyContact = visibleRosterContact(callSheet, callSheet.practicalInfo.emergencyContact);
  const details: Array<[string, string]> = [
    ["Parking", location?.parking ?? ""],
    ["Access", [location?.access, day.notes?.access, callSheet.practicalInfo.access].filter(Boolean).join(" ")],
    ["Accessibility", location?.accessibility ?? callSheet.practicalInfo.accessibility],
    ["Wi-Fi", location?.wifi ?? callSheet.practicalInfo.wifi],
    ["Emergency contact", [emergency?.emergencyNumber, sharedEmergencyContact].filter(Boolean).join(" - ")],
    ["Equipment", day.notes?.equipment ?? ""],
    ["Wardrobe", day.notes?.wardrobe ?? ""],
    ["Catering", day.notes?.catering ?? ""],
    ["Safety", [day.notes?.safety, callSheet.practicalInfo.safety].filter(Boolean).join(" ")],
    ["Weather", day.notes?.weatherConsiderations ?? ""],
    ["Other practical details", [day.notes?.clientNotes, callSheet.notes, location?.notes].filter(Boolean).join(" ")],
  ];

  return details
    .map(([label, value]) => [label, value.trim()] as const)
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n");
}

export function ShootDayControls({ days, day, onSelectDay, onEdit, children }: {
  days: ShootDay[]; day: ShootDay; onSelectDay: (id: string) => void; onEdit?: () => void; children?: ReactNode;
}) {
  return <header className="shared-day-edit-row">
    <ShootDaySwitcher days={days} activeDayId={day.id} onSelectDay={onSelectDay} />
    {days.length === 1 && <strong className="label-s-semibold">{day.label}</strong>}
    {onEdit && <IconButton aria-label={`Edit ${day.label} details`} tooltipPlacement="bottom" onClick={onEdit}>
      <DsIcon name="pencil-simple-ds" size={16} />
    </IconButton>}
    {children}
  </header>;
}

export function ShootDaySwitcher({ days, activeDayId, onSelectDay }: { days: ShootDay[]; activeDayId: string; onSelectDay: (id: string) => void }) {
  const daySwitcherRef = useRef<HTMLElement>(null);
  const activeDayButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const switcher = daySwitcherRef.current;
    const activeButton = activeDayButtonRef.current;
    if (!switcher || !activeButton) return;
    const centredLeft = activeButton.offsetLeft - ((switcher.clientWidth - activeButton.offsetWidth) / 2);
    switcher.scrollTo({ left: Math.max(0, centredLeft), behavior: "smooth" });
  }, [activeDayId]);

  if (days.length < 2) return null;
  return <nav className="shared-day-switcher" ref={daySwitcherRef} aria-label="Shoot days">
    {days.map((shootDay) => {
      const isActive = shootDay.id === activeDayId;
      return <button ref={isActive ? activeDayButtonRef : undefined} data-dialog-autofocus={isActive || undefined} className={`label-s-semibold ${isActive ? "active" : ""}`} type="button" aria-current={isActive ? "page" : undefined} key={shootDay.id} onClick={() => onSelectDay(shootDay.id)}>
        <span>{shootDay.label}</span>
        <small>{shootDay.date ? formatShortDate(shootDay.date) : "Date not set"}</small>
      </button>;
    })}
  </nav>;
}

function CallSheetDayComments({ projectId, day, canComment, showWhenEmpty }: {
  projectId: string; day: ShootDay; canComment: boolean; showWhenEmpty: boolean;
}) {
  const key = `brisk-call-sheet-comments-${projectId}-${day.id}`;
  const viewer = usePrototypeViewer();
  const [comments, setComments] = useState<ScriptComment[]>([]);
  const [position, setPosition] = useState<FloatingCommentPosition | null>(null);
  useEffect(() => {
    const load = () => {
      const raw = localStorage.getItem(key);
      setComments(raw ? (JSON.parse(raw) as ScriptComment[]).filter((comment) => comment.visibility === "external") : []);
    };
    load();
    window.addEventListener("storage", load);
    return () => window.removeEventListener("storage", load);
  }, [key]);
  if (!comments.length && !(showWhenEmpty && canComment)) return null;
  const authorId = viewer?.chatUserId ?? "call-sheet-guest";
  const users = [...scriptUsers.filter((user) => user.id !== authorId), {
    id: authorId, name: viewer?.name ?? "Guest", initials: getInitials(viewer?.name ?? "Guest"),
    team: "customer" as const, avatarTone: "sand" as const,
  }];
  return <div className="shared-day-comments">
    {canComment ? <Button size="S" variant="secondary" onClick={(event) => setPosition(getFloatingCommentPosition(event.currentTarget.getBoundingClientRect()))}>
      Comments{comments.length ? ` (${comments.length})` : ""}
    </Button> : <SharedSection title="Comments" count={comments.length}>{comments.map((comment) => <div key={comment.id}><p>{comment.body}</p>{comment.replies.map((reply) => <p key={reply.id}>{reply.body}</p>)}</div>)}</SharedSection>}
    {canComment && position && createPortal(<FloatingCommentShell anchor={{kind: "overall", label: day.label}}
      currentUserId={authorId} users={users} canPostInternal={false} comments={comments} position={position}
      onDismiss={() => setPosition(null)} onCommentsChange={(next) => {
        localStorage.setItem(key, JSON.stringify(next));
        setComments(next);
      }} />, document.body)}
  </div>;
}

function PrintShotReferences({ callSheet, shots }: { callSheet: CallSheet; shots: CallSheet["entries"] }) {
  const references = shots.filter((shot) => shot.imageReferenceUrl);
  if (!references.length) return null;
  const numbers = getShootShotNumbers(callSheet);
  references.sort((a, b) => (numbers.get(a.id) ?? "").localeCompare(numbers.get(b.id) ?? "", "en", { numeric: true }));
  return <section className="shared-print-references" aria-label="Shot references">
    <h2>Shot references</h2>
    {references.map((shot) => <figure key={shot.id}>
      <figcaption className="label-s-semibold">Shot {numbers.get(shot.id)} · {shot.description}</figcaption>
      <img src={shot.imageReferenceUrl} alt={`Reference for ${shot.description}`} />
    </figure>)}
  </section>;
}

export function CallSheetSectionTitle({ title, count, expanded = true, onToggle }: {
  title: string;
  count?: ReactNode;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  return <h2 className="shared-section-title" aria-label={title}>
    {onToggle ? <button type="button" aria-expanded={expanded} aria-label={`${expanded ? "Collapse" : "Expand"} ${title}`} onClick={onToggle}>
      <DsIcon name={expanded ? "caret-down" : "caret-right"} size={14} />{title}{count}
    </button> : <>{title}{count}</>}
  </h2>;
}

function SharedSection({ title, count, children, controls, sectionId, headerAction }: { title: string; count?: number; children?: ReactNode; headerAction?: ReactNode; controls?: CallSheetSectionControls; sectionId?: string }) {
  const isExpanded = controls?.focused || !controls?.collapsed;
  const countBadge = typeof count === "number" && <span className="shoot-call-sheet-section-count label-xs-semibold">{count}</span>;
  return (
    <section className={`shared-section shoot-call-sheet-focus-section ${controls?.focused ? "is-focused" : ""}`} data-call-sheet-section={sectionId} role={controls?.focused ? "dialog" : undefined} aria-modal={controls?.focused ? "true" : undefined} aria-label={controls?.focused ? `Focused ${title}` : undefined}>
      <header>
        <CallSheetSectionTitle
          title={title}
          count={countBadge}
          expanded={isExpanded}
          onToggle={controls && !controls.focused ? controls.onToggleCollapse : undefined}
        />
        {headerAction}
        {controls && (controls.focused
          ? <Button size="S" variant="secondary" type="button" onClick={controls.onToggleFocus}><DsIcon name="x-close-cross" size={16} />Exit focus</Button>
          : <span className="shared-section-focus"><IconButton aria-label={`Focus on ${title}`} tooltipAlign="end" onClick={controls.onToggleFocus}><DsIcon name="frame-corners" size={16} /></IconButton></span>)}

      </header>
      {isExpanded && children ? <div className="shared-section-body">{children}</div> : null}
    </section>
  );
}

export function CallSheetRowName({ name, onEdit }: { name: string; onEdit?: () => void }) {
  return onEdit
    ? <button type="button" className="shoot-on-set-shot-copy" aria-label={`Edit ${name}`} onClick={onEdit}><strong>{name}</strong></button>
    : <strong>{name}</strong>;
}

function OperationalSectionActions({ editing, editLabel, planningLabel, showEdit, showPlanning = false, onEdit, onOpenPlanning }: {
  editing: boolean;
  editLabel?: string;
  planningLabel?: string;
  showEdit: boolean;
  showPlanning?: boolean;
  onEdit?: () => void;
  onOpenPlanning?: () => void;
}) {
  if (!showEdit && !showPlanning) return null;
  return <div className="shared-on-set-section-actions">
    {showEdit && onEdit && editLabel ? <Button size="S" variant="secondary" className="shoot-button secondary" type="button" onClick={onEdit}><DsIcon name={editing ? "check" : "pencil-simple-ds"} size={16} />{editing ? "Done" : editLabel}</Button> : null}
    {showPlanning && onOpenPlanning && planningLabel ? <Button size="S" variant="ghost" className="shoot-text-action" type="button" onClick={onOpenPlanning}>{planningLabel}<DsIcon name="arrow-right" size={14} /></Button> : null}
  </div>;
}

function OperationalField({ label, value, placeholder = "Not confirmed", multiline = false, wide = false, type = "text", onChange }: {
  label: string;
  value: string;
  placeholder?: string;
  multiline?: boolean;
  wide?: boolean;
  type?: "text" | "tel";
  onChange: (value: string) => void;
}) {
  return <label className={`shared-on-set-edit-field ${wide ? "is-wide" : ""}`}>
    <span className="label-xs-semibold">{label}</span>
    {multiline
      ? <textarea rows={3} value={value} placeholder={placeholder.trim() || "Not confirmed"} onChange={(event) => onChange(event.target.value)} />
      : <input type={type} value={value} placeholder={placeholder.trim() || "Not confirmed"} onChange={(event) => onChange(event.target.value)} />}
  </label>;
}

function PracticalItem({ title, body }: { title: string; body: string }) {
  return <article><strong>{title}</strong><p>{body}</p></article>;
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

function getDisplayedWeather(weather: string, hasShootDetails: boolean) {
  if (!hasShootDetails) return "Weather will appear after a date and primary location are set.";
  return weather.startsWith("Weather will appear") ? "22°C · Partly cloudy · 10% rain" : weather;
}

function formatUpdatedTime(value: string) {
  return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function getInitials(name: string) {
  return name.split(/\s+/u).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function normalisePhone(phone: string) {
  return phone.replace(/[^+\d]/gu, "");
}
