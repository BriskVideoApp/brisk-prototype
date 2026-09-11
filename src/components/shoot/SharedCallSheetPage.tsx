"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import type { Project } from "@/components/active-videos/types";
import { usePrototypeRole, type PrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { DsIcon, type DsIconName } from "@/components/video-review/DsIcon";
import {
  addMinutes,
  callSheetStorageKey,
  formatShootDate,
  formatTime,
  getInitialCallSheet,
  getShootDayShots,
  getMapsLinkLabel,
  getMapsUrl,
  isAssignedToDay,
  normaliseShootArchitecture,
  shootAccessStorageKey,
  type CallSheet,
  type SafetyEmergencyInfo,
  type ScheduleType,
  type ShootDay,
  type ShootLocation,
} from "@/data/shoot";

const scheduleTypeMeta: Record<ScheduleType, { label: string; icon: DsIconName }> = {
  shot: { label: "Shot", icon: "video-camera-ds" },
  coverage: { label: "Coverage", icon: "video-camera-ds" },
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
type EditableOperationalSection = "people";

type SharedShootAccessLevel = "viewOnly" | "canEdit" | "canManage";

function getDefaultShootAccess(role: PrototypeRole): SharedShootAccessLevel {
  if (role === "Studio Staff") return "canManage";
  if (role === "Studio Freelancer") return "canEdit";
  return "viewOnly";
}

function readShootAccess(projectId: string, role: PrototypeRole): SharedShootAccessLevel {
  if (role === "Studio Staff") return "canManage";
  try {
    const rawValue = window.localStorage.getItem(shootAccessStorageKey(projectId));
    if (!rawValue) return getDefaultShootAccess(role);
    const parsed: unknown = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== "object") return getDefaultShootAccess(role);
    const value = role === "Studio Freelancer"
      ? (parsed as Record<string, unknown>).freelancer
      : (parsed as Record<string, unknown>).client;
    return value === "viewOnly" || value === "canEdit" || value === "canManage"
      ? value
      : getDefaultShootAccess(role);
  } catch {
    return getDefaultShootAccess(role);
  }
}

function getWeatherIcon(weather: string): DsIconName {
  const condition = (weather.split(" · ")[1] ?? weather).toLowerCase();

  if (condition.includes("rain") || condition.includes("shower") || condition.includes("storm")) return "weather-rain";
  if (condition.includes("sun") || condition.includes("clear")) return "weather-sun";
  return "weather-cloud";
}

export function SharedCallSheetPage({ project, previewMode, printMode, viewerId, embedded = false, embeddedCallSheet, canEdit, isStudioInternal, focusedSectionId = null, openSectionRequest, onOpenDocuments, onOpenPlanningSection, onOpenSchedule, onEmbeddedChange, onEmbeddedSelectDay, onExitSectionFocus, onFocusSection, renderInterviewQuestions, renderRunOfDay }: {
  project: Project;
  previewMode: boolean;
  printMode: boolean;
  viewerId?: string;
  embedded?: boolean;
  embeddedCallSheet?: CallSheet;
  canEdit?: boolean;
  isStudioInternal?: boolean;
  focusedSectionId?: string | null;
  openSectionRequest?: { sectionId: string; requestId: number } | null;
  onOpenDocuments?: () => void;
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
  const searchParams = useSearchParams();
  const isEmptyPreview = searchParams.get("preview") === "empty";
  const requestedDayId = searchParams.get("day");
  const printAllDays = searchParams.get("all") === "1";
  const [callSheet, setCallSheet] = useState(() => normaliseShootArchitecture(embeddedCallSheet ?? getInitialCallSheet(project)));
  const [selectedDayId, setSelectedDayId] = useState(() => {
    const initialCallSheet = embeddedCallSheet ?? getInitialCallSheet(project);
    return initialCallSheet.days.some((day) => day.id === requestedDayId)
      ? requestedDayId ?? "day-1"
      : initialCallSheet.days[0]?.id ?? "day-1";
  });
  const [hasLoaded, setHasLoaded] = useState(false);
  const [copyStatus, setCopyStatus] = useState("Copy link");
  const [showPreviewBar, setShowPreviewBar] = useState(previewMode && !printMode);
  const [collapsedSectionIds, setCollapsedSectionIds] = useState<string[]>(["documents"]);
  const [standaloneAccess, setStandaloneAccess] = useState<SharedShootAccessLevel>(() => getDefaultShootAccess(selectedRole));
  const effectiveIsStudioInternal = isStudioInternal ?? selectedRole !== "Customer";

  useEffect(() => {
    if (embedded) return;
    const loadAccess = () => setStandaloneAccess(readShootAccess(project.id, selectedRole));
    loadAccess();
    window.addEventListener("storage", loadAccess);
    return () => window.removeEventListener("storage", loadAccess);
  }, [embedded, project.id, selectedRole]);

  useEffect(() => {
    if (embedded) {
      if (embeddedCallSheet) {
        const next = normaliseShootArchitecture(embeddedCallSheet);
        setCallSheet(next);
        setSelectedDayId((current) => next.days.some((day) => day.id === current)
          ? current
          : next.days[0]?.id ?? "day-1");
      }
      setHasLoaded(true);
      return;
    }
    const loadStoredCallSheet = () => {
      try {
        const stored = window.localStorage.getItem(callSheetStorageKey(project.id));
        if (stored) {
          const next = normaliseShootArchitecture(JSON.parse(stored) as CallSheet);
          if (next.notice.trim() && !next.visibleOptionalSections.includes("notice")) {
            next.visibleOptionalSections = ["notice", ...next.visibleOptionalSections];
          }
          setCallSheet(next);
          setSelectedDayId((current) => {
            if (requestedDayId && next.days.some((day) => day.id === requestedDayId)) {
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
  }, [embedded, embeddedCallSheet, project.id, requestedDayId]);

  useEffect(() => {
    if (!printMode || !hasLoaded) return;
    const timeoutId = window.setTimeout(() => window.print(), 500);
    return () => window.clearTimeout(timeoutId);
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
      await navigator.clipboard.writeText(`${window.location.origin}/share/call-sheet/${project.id}`);
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
    setCallSheet((current) => {
      const next = { ...updater(current), updatedAt: new Date().toISOString() };
      window.localStorage.setItem(callSheetStorageKey(project.id), JSON.stringify(next));
      return next;
    });
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
            callSheet={callSheet}
            clientName={project.clientName}
            day={day}
            embedded={embedded}
            projectId={project.id}
            viewer={viewer && isAssignedToDay(viewer.shootDayIds, day.id) ? viewer : undefined}
            isStudioInternal={effectiveIsStudioInternal}
            getSectionControls={embedded && !printMode && onFocusSection ? getSectionControls : undefined}
            printIndex={printMode ? index : undefined}
            onSelectDay={!printMode ? selectDay : undefined}
            onChange={embedded && canEdit && !printMode ? updateLiveCallSheet : undefined}
            onOpenDocuments={embedded && !printMode ? onOpenDocuments : undefined}
            onOpenPlanningSection={embedded && effectiveIsStudioInternal && !printMode ? onOpenPlanningSection : undefined}
            onOpenSchedule={embedded && effectiveIsStudioInternal && !printMode ? onOpenSchedule : undefined}
            renderInterviewQuestions={!printMode ? renderInterviewQuestions : undefined}
            renderRunOfDay={!printMode ? renderRunOfDay : undefined}
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
    <header className="on-set-live-heading"><div><p className="label-xs-semibold">On Set · {day?.label ?? "Shoot day"}</p><h1>{isComplete ? "Shoot complete" : "Live shoot"}</h1><span className="label-s">{callSheet.projectName}</span></div>{onBack ? <button className="shoot-button secondary label-s-semibold" type="button" onClick={onBack}>Back to Call Sheet</button> : <Link className="shoot-button secondary label-s-semibold" href={`/projects/${project.id}/stages/shoot`}>Back to Shoot</Link>}</header>
    <section className="on-set-live-now"><span className="label-xs-semibold">Current Schedule item</span><strong>{currentEntry?.description ?? "No Schedule item remaining"}</strong>{currentEntry ? <small className="label-s">{formatTime(currentEntry.startTime)} to {formatTime(addMinutes(currentEntry.startTime, currentEntry.durationMinutes))}</small> : null}{currentEntry ? <button className="shoot-button primary label-s-semibold" type="button" onClick={() => onChange((current) => ({ ...current, entries: current.entries.map((entry) => entry.id === currentEntry.id ? { ...entry, completed: true, captured: entry.type === "shot" ? true : entry.captured } : entry) }))}>Complete item</button> : null}</section>
    <div className="on-set-live-stats"><article><span className="label-xs">Next Schedule item</span><strong>{nextEntry?.description ?? "Nothing else scheduled"}</strong>{nextEntry ? <small>{formatTime(nextEntry.startTime)}</small> : null}</article><article><span className="label-xs">Shots captured</span><strong>{capturedCount}</strong></article><article><span className="label-xs">Shots remaining</span><strong>{remainingCount}</strong></article></div>
    <section className="on-set-live-section"><header><h2>Shots</h2><span className="label-xs">Tick off coverage as it is captured.</span></header><div className="on-set-live-shot-list">{shots.map((shot, index) => {
      const isMissed = missedShotIds.includes(shot.id);
      return <article className={shot.captured ? "is-captured" : isMissed ? "is-missed" : ""} key={shot.id}><button className="on-set-live-shot-toggle" type="button" aria-label={`${shot.captured ? "Mark remaining" : "Mark captured"}: ${shot.description}`} onClick={() => onChange((current) => ({ ...current, entries: current.entries.map((entry) => entry.id === shot.id ? { ...entry, captured: !shot.captured } : entry) }))}><DsIcon name={shot.captured ? "check-circle" : "video-camera-ds"} size={22} /></button><div><strong>{shot.description}</strong><span className="label-xs">Shot {shot.shotNumber ?? index + 1}{shot.priority ? ` · ${shot.priority}` : ""}</span></div><button className="shoot-text-action label-xs-semibold" type="button" onClick={() => setMissedShotIds((current) => current.includes(shot.id) ? current.filter((id) => id !== shot.id) : [...current, shot.id])}>{isMissed ? "Restore" : "Missed / pickup"}</button></article>;
    })}</div></section>
    <section className="on-set-live-section"><header><h2>Quick production notes</h2></header><textarea rows={4} placeholder="Add a note from the set" value={productionNote} onChange={(event) => setProductionNote(event.target.value)} /></section>
    <section className="on-set-live-section"><header><h2>Crew and Talent</h2></header><div className="on-set-live-contact-list">{people.map((person) => <article key={person.id}><div><strong>{person.name}</strong><span className="label-xs">{person.role || person.type} · Call {formatTime(person.callTime)}</span></div>{(isStudioInternal || person.showContactDetails === true) && person.phone ? <a className="shoot-button secondary label-s-semibold" href={`tel:${normalisePhone(person.phone)}`}>Call</a> : null}</article>)}</div></section>
    <footer className="on-set-live-footer">{isComplete ? <Link className="shoot-button primary label-s-semibold" href={`/projects/${project.id}/stages/media`}>Open Media</Link> : <Button size="S" variant="primary" onClick={() => setIsComplete(true)}>Complete Shoot</Button>}</footer>
  </div>;
}

function SharedDay({ callSheet, clientName, day, embedded, projectId, viewer, isStudioInternal, getSectionControls, printIndex, onSelectDay, onChange, onOpenDocuments, onOpenPlanningSection, onOpenSchedule, renderInterviewQuestions, renderRunOfDay }: { callSheet: CallSheet; clientName: string; day: ShootDay; embedded: boolean; projectId: string; viewer?: CallSheet["people"][number]; isStudioInternal: boolean; getSectionControls?: (sectionId: string) => CallSheetSectionControls; printIndex?: number; onSelectDay?: (dayId: string) => void; onChange?: (updater: (current: CallSheet) => CallSheet) => void; onOpenDocuments?: () => void; onOpenPlanningSection?: (section: CallSheetPlanningSection) => void; onOpenSchedule?: () => void; renderInterviewQuestions?: (day: ShootDay, controls: CallSheetSectionControls) => ReactNode; renderRunOfDay?: (day: ShootDay, controls: CallSheetSectionControls) => ReactNode }) {
  const daySwitcherRef = useRef<HTMLElement>(null);
  const activeDayButtonRef = useRef<HTMLButtonElement>(null);
  const [editingOperationalSection, setEditingOperationalSection] = useState<EditableOperationalSection | null>(null);
  const location = callSheet.locations.find((item) => item.id === day.primaryLocationId);
  const timedEntries = callSheet.entries.filter((entry) => entry.dayId === day.id && entry.startTime).sort((left, right) => left.startTime.localeCompare(right.startTime));
  const dayShots = getShootDayShots(callSheet, day.id);
  const remainingShots = dayShots.filter((entry) => !entry.captured && entry.captureStatus !== "not-required" && !entry.skippedShootDayIds?.includes(day.id)).length;
  const displayedWeather = getDisplayedWeather(callSheet.weather, Boolean(day.date && location));
  const [temperature, conditions, rainChance] = displayedWeather.split(" · ");
  const people = callSheet.people.filter((person) => isAssignedToDay(person.shootDayIds, day.id));
  const locations = callSheet.locations.filter((item) => isAssignedToDay(item.shootDayIds, day.id));
  const documents = callSheet.documents.filter((document) => isAssignedToDay(document.shootDayIds, day.id));
  const dayNotes = day.notes?.practicalDetails ?? getLegacyDayNotes(callSheet, day, location);
  const nearestEmergencyHospital = getNearestEmergencyHospital(location, day.safetyEmergency);
  const internalNotes = isStudioInternal ? day.notes?.internalNotes?.trim() ?? "" : "";
  const selectedProductionContact = callSheet.people.find((person) => callSheet.onTheDayContact.startsWith(person.name));
  const hideProductionContactDetails = Boolean(!isStudioInternal && selectedProductionContact && selectedProductionContact.showContactDetails !== true);
  const visibleProductionContact = hideProductionContactDetails && selectedProductionContact
    ? [selectedProductionContact.name, selectedProductionContact.role].filter(Boolean).join(" · ")
    : callSheet.onTheDayContact;
  const visibleProductionPhone = hideProductionContactDetails ? "" : getContactPhone(callSheet.onTheDayContact);
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
  const updateDayNotes = (value: string) => onChange?.((current) => ({
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
      },
    } : item),
  }));

  useEffect(() => {
    const switcher = daySwitcherRef.current;
    const activeButton = activeDayButtonRef.current;
    if (!switcher || !activeButton) return;
    const centredLeft = activeButton.offsetLeft - ((switcher.clientWidth - activeButton.offsetWidth) / 2);
    switcher.scrollTo({ left: Math.max(0, centredLeft), behavior: "smooth" });
  }, [day.id]);

  return (
    <article className={`shared-print-day ${typeof printIndex === "number" ? "is-print-day" : ""}`}>
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
        {onSelectDay && callSheet.days.length > 1 ? <nav className="shared-day-switcher" ref={daySwitcherRef} aria-label="Shoot days">
          {callSheet.days.map((shootDay) => {
            const isActive = shootDay.id === day.id;
            return <button ref={isActive ? activeDayButtonRef : undefined} className={`label-s-semibold ${isActive ? "active" : ""}`} type="button" aria-current={isActive ? "page" : undefined} key={shootDay.id} onClick={() => onSelectDay(shootDay.id)}>
              <span>{shootDay.label}</span>
              <small>{shootDay.date ? formatShortDate(shootDay.date) : "Date not set"}</small>
            </button>;
          })}
        </nav> : null}
        {typeof printIndex === "number" ? <header className="shared-print-day-heading"><strong>{day.label} of {callSheet.days.length}</strong></header> : null}
        <div className="shared-date-block">
          <span className="label-xs-semibold">Shoot date</span>
          <h2>{formatShootDate(day.date)}</h2>
        </div>
        <div className="shared-call-time-block">
          <span className="label-xs-semibold">General call time</span>
          <strong>{formatTime(day.generalCallTime)}</strong>
          {day.expectedWrapTime ? <small>Expected wrap {formatTime(day.expectedWrapTime)}</small> : null}
        </div>
        {viewer ? (
          <div className="shared-personal-call">
            <span className="label-xs-semibold">Your call time</span>
            <strong>{formatTime(viewer.callTime)}</strong>
            <small>{viewer.name} · {viewer.role}</small>
          </div>
        ) : null}
        <div className="shared-location-block">
          <span className="label-xs-semibold">Primary location</span>
          <strong>{location?.name ?? "Location not set"}</strong>
          {location && (location.mapLink || location.address) ? <a className="shared-location-address label-s-semibold" href={getMapsUrl(location.mapLink || location.address)} target="_blank" rel="noreferrer">{getMapsLinkLabel(location.address || location.mapLink || "")}</a> : null}
        </div>
        <div className="shared-weather-block">
          <div className="shared-weather-summary"><span className="shared-weather-icon" aria-hidden="true"><DsIcon name={getWeatherIcon(displayedWeather)} size={18} /></span><div><strong>{temperature}</strong><p>{[conditions, rainChance].filter(Boolean).join(" · ")}</p></div></div>
          {visibleProductionContact ? <div className="shared-production-contact"><span className="label-xs-semibold">Key contacts</span><strong>{visibleProductionContact}</strong>{visibleProductionPhone ? <a className="label-s-semibold" href={`tel:${visibleProductionPhone}`}>Call production</a> : null}</div> : null}
        </div>
      </section>

      {!embedded ? <section className="shared-day-glance is-single" aria-label="At a glance">
        <article><span className="label-xs-semibold">Shots remaining</span><strong>{remainingShots}</strong><small>{renderRunOfDay ? "Track detailed coverage below" : "Track detailed coverage in Shoot day"}</small>{!renderRunOfDay && isStudioInternal && typeof printIndex !== "number" ? <Link className="shared-shot-list-link label-s-semibold" href={`/projects/${projectId}/stages/shoot?view=on-set&day=${encodeURIComponent(day.id)}&section=schedule`}>Open Shoot day<DsIcon name="arrow-right" size={14} /></Link> : null}</article>
      </section> : null}

      {renderRunOfDay ? renderRunOfDay(day, sectionControls("run-of-day")) : <SharedSection title="Run of day" count={timedEntries.length} controls={getSectionControls?.("run-of-day")}>
        {timedEntries.length ? <div className="shared-schedule-list">{timedEntries.map((entry) => {
          const meta = scheduleTypeMeta[entry.type];
          const rowLocation = callSheet.locations.find((item) => item.id === entry.locationId);
          const linkedGroup = entry.linkedShotGroupId ? callSheet.shotGroups?.find((group) => group.id === entry.linkedShotGroupId) : undefined;
          const linkedShotCount = entry.linkedShotGroupId ? callSheet.entries.filter((shot) => shot.type === "shot" && shot.shotGroupId === entry.linkedShotGroupId).length : 0;
          return (
            <article className={`shared-schedule-row is-${entry.type} ${entry.captured ? "captured" : ""}`} key={entry.id}>
              <div className="shared-schedule-time"><strong>{formatTime(entry.startTime)}</strong>{entry.durationMinutes ? <span className="label-xs">to {formatTime(addMinutes(entry.startTime, entry.durationMinutes))}</span> : null}</div>
              <span className="shared-schedule-icon"><DsIcon name={entry.type === "shot" && entry.captured ? "check-circle" : meta.icon} size={18} /></span>
              <div><strong>{linkedGroup?.name ?? entry.description}</strong><span className="label-xs">{[entry.type === "coverage" && linkedShotCount ? `${linkedShotCount} shots` : meta.label, rowLocation?.name].filter(Boolean).join(" · ")}</span></div>
            </article>
          );
        })}</div> : <div className="shared-empty-schedule"><p className="shared-empty-copy">{onOpenSchedule ? "The schedule has not been added yet." : "Schedule not yet available."}</p>{onOpenSchedule ? <button className="shared-schedule-helper-link label-s-semibold" type="button" onClick={onOpenSchedule}>Create the run of day in Schedule<DsIcon name="arrow-right" size={14} /></button> : null}</div>}
      </SharedSection>}

      {renderInterviewQuestions ? renderInterviewQuestions(day, sectionControls("interview-questions")) : null}

      <SharedSection title="Locations" count={locations.length} controls={getSectionControls?.("locations")}>
        <OperationalSectionActions
          editing={false}
          planningLabel={locations.length ? "Manage locations in Planning" : "Add locations in Planning"}
          showEdit={false}
          showPlanning={Boolean(onOpenPlanningSection)}
          onOpenPlanning={() => onOpenPlanningSection?.("locations")}
        />
        {locations.length ? <div className="shared-location-list">{locations.map((item) => (
          <article key={item.id}>
            <div className="shared-location-heading"><strong>{item.name}</strong>{item.id === day.primaryLocationId ? <span className="label-xs-semibold">Primary</span> : null}</div>
            {item.mapLink || item.address ? <a className="shared-location-map label-s-semibold" href={getMapsUrl(item.mapLink || item.address)} target="_blank" rel="noreferrer">{getMapsLinkLabel(item.address || item.mapLink || "")}</a> : null}
          </article>
        ))}</div> : <div className="shared-section-empty"><strong>No locations added</strong><span className="label-xs">Add the shoot locations in Planning before the day begins.</span></div>}
      </SharedSection>

      <SharedSection title="People" count={people.length} controls={getSectionControls?.("people")}>
        <OperationalSectionActions
          editing={editingOperationalSection === "people"}
          editLabel="Edit phone numbers"
          planningLabel={people.length ? "Manage people in Planning" : "Add people in Planning"}
          showEdit={Boolean(onChange && people.length)}
          showPlanning={Boolean(onOpenPlanningSection)}
          onEdit={() => setEditingOperationalSection((current) => current === "people" ? null : "people")}
          onOpenPlanning={() => onOpenPlanningSection?.("people")}
        />
        {people.length ? <div className="shared-contact-list">{people.map((person) => (
          <article key={person.id}>
            <span className="shared-contact-avatar label-xs-semibold">{getInitials(person.name)}</span>
            <div><strong>{person.name}</strong><span className="label-xs">{person.role || person.type} · Call {formatTime(person.callTime)}</span>{(isStudioInternal || person.showContactDetails === true) && person.email ? <a className="shared-contact-email label-xs" href={`mailto:${person.email}`}>{person.email}</a> : null}{editingOperationalSection === "people" ? <OperationalField label="Phone" type="tel" value={person.phone} onChange={(value) => updatePersonPhone(person.id, value)} /> : null}</div>
            {editingOperationalSection !== "people" && (isStudioInternal || person.showContactDetails === true) && person.phone ? <a aria-label={`Call ${person.name}`} href={`tel:${normalisePhone(person.phone)}`}><span className="label-xs-semibold">Call</span><span className="shared-desktop-phone label-xs-semibold">{person.phone}</span></a> : null}
          </article>
        ))}</div> : <div className="shared-section-empty"><strong>No people added</strong><span className="label-xs">Add crew and talent in Planning before the day begins.</span></div>}
      </SharedSection>

      {onChange || dayNotes.trim() || internalNotes ? (
        <SharedSection title="Notes for the day" controls={getSectionControls?.("notes")}>
          {onChange ? (
            <label className="shared-notes-editor">
              <span className="label-xs-semibold">{day.label} notes</span>
              <textarea
                aria-label={`${day.label} notes`}
                placeholder={"Parking:\nAccess:\nWi-Fi:\nOther practical details:"}
                rows={7}
                value={dayNotes}
                onChange={(event) => updateDayNotes(event.target.value)}
              />
            </label>
          ) : dayNotes.trim() ? <p className="shared-notes">{dayNotes}</p> : null}
          {internalNotes ? <div className="shared-practical-grid"><PracticalItem title="Internal Studio notes" body={internalNotes} /></div> : null}
        </SharedSection>
      ) : null}

      {onOpenDocuments || documents.length ? (
        <SharedSection sectionId="documents" title="Documents" count={documents.length} controls={getSectionControls?.("documents")}>
          <div className="shared-documents-section">
            {documents.length ? <div className="shared-document-list">{documents.map((document) => <a href={document.url} target="_blank" rel="noreferrer" key={document.id}><DsIcon name={document.kind === "link" ? "link" : "file-text"} size={18} /><span>{document.name}</span><DsIcon name="arrow-bend-up-right" size={16} /></a>)}</div> : <div className="shared-documents-empty"><strong>No documents added</strong><span className="label-xs">Add files or links the crew may need on the shoot day.</span></div>}
            {onOpenDocuments ? <button className="shoot-button secondary label-s-semibold" type="button" onClick={onOpenDocuments}><DsIcon name="folder" size={16} />Manage documents</button> : null}
          </div>
        </SharedSection>
      ) : null}

      {nearestEmergencyHospital && location ? (
        <SharedSection title="Nearest emergency hospital">
          <div className="shared-safety-emergency">
            <div>
              <strong>{nearestEmergencyHospital.hospitalName}</strong>
              <a className="shared-location-map label-s-semibold" href={getMapsUrl(nearestEmergencyHospital.hospitalAddress)} target="_blank" rel="noreferrer">{nearestEmergencyHospital.hospitalAddress}</a>
              <span className="label-xs">{nearestEmergencyHospital.travelTime || `Calculated from ${location.name}`}</span>
            </div>
            <a className="shared-primary-action label-s-semibold" href={getMapsUrl(nearestEmergencyHospital.hospitalAddress)} target="_blank" rel="noreferrer"><DsIcon name="arrow-bend-up-right" size={16} />Directions</a>
            <div>
              <span className="label-xs-semibold">Emergency</span>
              <a href={`tel:${normalisePhone(nearestEmergencyHospital.emergencyNumber)}`}>{nearestEmergencyHospital.emergencyNumber}</a>
              {nearestEmergencyHospital.hospitalPhone ? <a className="label-xs-semibold" href={`tel:${normalisePhone(nearestEmergencyHospital.hospitalPhone)}`}>Hospital {nearestEmergencyHospital.hospitalPhone}</a> : null}
            </div>
          </div>
        </SharedSection>
      ) : null}

      {typeof printIndex === "number" ? (
        <footer className="shared-document-print-footer">
          <span>{callSheet.studioName} · {callSheet.projectName}</span>
          <span>{day.label} of {callSheet.days.length}</span>
        </footer>
      ) : null}
    </article>
  );
}

function getLegacyDayNotes(callSheet: CallSheet, day: ShootDay, location: CallSheet["locations"][number] | undefined) {
  const emergency = day.safetyEmergency;
  const details: Array<[string, string]> = [
    ["Parking", location?.parking ?? ""],
    ["Access", [location?.access, day.notes?.access, callSheet.practicalInfo.access].filter(Boolean).join(" ")],
    ["Accessibility", location?.accessibility ?? callSheet.practicalInfo.accessibility],
    ["Wi-Fi", location?.wifi ?? callSheet.practicalInfo.wifi],
    ["Emergency contact", [emergency?.emergencyNumber, callSheet.practicalInfo.emergencyContact].filter(Boolean).join(" - ")],
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

function getNearestEmergencyHospital(location: ShootLocation | undefined, existing: SafetyEmergencyInfo | undefined): SafetyEmergencyInfo | undefined {
  if (!location) return undefined;
  if (existing?.hospitalName.trim() && existing.hospitalAddress.trim() && !existing.needsReview) return existing;

  const locationText = `${location.name} ${location.address}`.toLowerCase();
  if (locationText.includes("carriageworks") || locationText.includes("eveleigh") || locationText.includes("camperdown") || locationText.includes("newtown")) {
    return { hospitalName: "Royal Prince Alfred Hospital Emergency Department", hospitalAddress: "Missenden Road, Camperdown NSW 2050", hospitalPhone: "02 9515 6111", emergencyNumber: "000", confirmed: true };
  }
  if (locationText.includes("thirroul") || locationText.includes("wollongong")) {
    return { hospitalName: "Wollongong Hospital Emergency Department", hospitalAddress: "348-352 Crown Street, Wollongong NSW 2500", hospitalPhone: "02 4222 5000", emergencyNumber: "000", confirmed: true };
  }
  if (locationText.includes("vic")) {
    return { hospitalName: "The Royal Melbourne Hospital Emergency Department", hospitalAddress: "300 Grattan Street, Parkville VIC 3050", hospitalPhone: "03 9342 7000", emergencyNumber: "000", confirmed: true };
  }
  if (locationText.includes("qld")) {
    return { hospitalName: "Royal Brisbane and Women's Hospital Emergency Department", hospitalAddress: "Butterfield Street, Herston QLD 4029", hospitalPhone: "07 3646 8111", emergencyNumber: "000", confirmed: true };
  }
  if (locationText.includes("sa ")) {
    return { hospitalName: "Royal Adelaide Hospital Emergency Department", hospitalAddress: "Port Road, Adelaide SA 5000", hospitalPhone: "08 7074 0000", emergencyNumber: "000", confirmed: true };
  }

  return { hospitalName: "Sydney Hospital Emergency Department", hospitalAddress: "8 Macquarie Street, Sydney NSW 2000", hospitalPhone: "02 9382 7111", emergencyNumber: "000", confirmed: true };
}

function SharedSection({ title, count, children, controls, sectionId }: { title: string; count?: number; children: ReactNode; controls?: CallSheetSectionControls; sectionId?: string }) {
  const isExpanded = controls?.focused || !controls?.collapsed;
  return (
    <section className={`shared-section shoot-call-sheet-focus-section ${controls?.focused ? "is-focused" : ""}`} data-call-sheet-section={sectionId} role={controls?.focused ? "dialog" : undefined} aria-modal={controls?.focused ? "true" : undefined} aria-label={controls?.focused ? `Focused ${title}` : undefined}>
      <header>
        <div><h2>{title}</h2>{typeof count === "number" ? <span className="shoot-call-sheet-section-count label-xs-semibold">{count}</span> : null}</div>
        {controls ? <div className="shared-section-actions">
          {controls.focused
            ? <button className="shoot-button secondary label-s-semibold" type="button" onClick={controls.onToggleFocus}><DsIcon name="x-close-cross" size={16} />Exit focus</button>
            : <>
              <button className="shoot-icon-button shoot-call-sheet-collapse-button" type="button" aria-expanded={isExpanded} aria-label={`${isExpanded ? "Collapse" : "Expand"} ${title}`} title={`${isExpanded ? "Collapse" : "Expand"} ${title}`} onClick={controls.onToggleCollapse}><DsIcon name="caret-down" size={16} /></button>
              <button className="shoot-icon-button shoot-call-sheet-focus-button" type="button" aria-label={`Focus on ${title}`} title={`Focus on ${title}`} onClick={controls.onToggleFocus}><DsIcon name="frame-corners" size={17} /></button>
            </>}
        </div> : null}
      </header>
      {isExpanded ? <div className="shared-section-body">{children}</div> : null}
    </section>
  );
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
    {showEdit && onEdit && editLabel ? <button className="shoot-button secondary label-s-semibold" type="button" onClick={onEdit}><DsIcon name={editing ? "check" : "pencil-simple-ds"} size={16} />{editing ? "Done" : editLabel}</button> : null}
    {showPlanning && onOpenPlanning && planningLabel ? <button className="shoot-text-action label-s-semibold" type="button" onClick={onOpenPlanning}>{planningLabel}<DsIcon name="arrow-right" size={14} /></button> : null}
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

function getContactPhone(contact: string) {
  const match = contact.match(/(?:\+?\d[\d\s()-]{7,}\d)/u);
  return match ? normalisePhone(match[0]) : "";
}
