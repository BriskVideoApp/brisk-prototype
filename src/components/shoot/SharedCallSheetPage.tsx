"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Project } from "@/components/active-videos/types";
import { usePrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { DsIcon, type DsIconName } from "@/components/video-review/DsIcon";
import {
  addMinutes,
  callSheetStorageKey,
  ensureShotNumbers,
  formatShootDate,
  formatTime,
  getInitialCallSheet,
  getMapsUrl,
  isAssignedToDay,
  type CallSheet,
  type ScheduleType,
  type ShootDay,
} from "@/data/shoot";

const scheduleTypeMeta: Record<ScheduleType, { label: string; icon: DsIconName }> = {
  shot: { label: "Shot", icon: "video-camera-ds" },
  setup: { label: "Setup", icon: "settings" },
  lunch: { label: "Lunch", icon: "fork-knife" },
  travel: { label: "Travel", icon: "car-simple" },
  break: { label: "Break", icon: "coffee" },
};

function getWeatherIcon(weather: string): DsIconName {
  const condition = (weather.split(" · ")[1] ?? weather).toLowerCase();

  if (condition.includes("rain") || condition.includes("shower") || condition.includes("storm")) return "weather-rain";
  if (condition.includes("sun") || condition.includes("clear")) return "weather-sun";
  return "weather-cloud";
}

export function SharedCallSheetPage({ project, previewMode, printMode, viewerId }: { project: Project; previewMode: boolean; printMode: boolean; viewerId?: string }) {
  const { selectedRole } = usePrototypeRole();
  const searchParams = useSearchParams();
  const isEmptyPreview = searchParams.get("preview") === "empty";
  const requestedDayId = searchParams.get("day");
  const printAllDays = searchParams.get("all") === "1";
  const [callSheet, setCallSheet] = useState(() => ensureShotNumbers(getInitialCallSheet(project)));
  const [selectedDayId, setSelectedDayId] = useState(() => {
    const initialCallSheet = getInitialCallSheet(project);
    return initialCallSheet.days.some((day) => day.id === requestedDayId)
      ? requestedDayId ?? "day-1"
      : initialCallSheet.days[0]?.id ?? "day-1";
  });
  const [hasLoaded, setHasLoaded] = useState(false);
  const [copyStatus, setCopyStatus] = useState("Copy link");
  const [showPreviewBar, setShowPreviewBar] = useState(previewMode && !printMode);

  useEffect(() => {
    const loadStoredCallSheet = () => {
      try {
        const stored = window.localStorage.getItem(callSheetStorageKey(project.id));
        if (stored) {
          const next = ensureShotNumbers(JSON.parse(stored) as CallSheet);
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
  }, [project.id, requestedDayId]);

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

  return (
    <main className={`shared-call-sheet ${printMode ? "is-print-mode" : ""} ${showPreviewBar ? "has-preview-bar" : ""}`}>
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
      <header className="shared-brand-bar">
        <div className="shared-brand-mark label-s-semibold" aria-hidden="true">{callSheet.studioInitials}</div>
        <div>
          <strong>{callSheet.studioName}</strong>
          <span className="label-xs">Call Sheet</span>
        </div>
      </header>

      {isEmptyPreview ? (
        <section className="shared-call-sheet-empty">
          <span className="shared-call-sheet-empty-icon" aria-hidden="true"><DsIcon name="clipboard-text" size={28} /></span>
          <h1>{selectedRole === "Customer" ? "The call sheet is still being prepared" : "This call sheet isn’t ready yet"}</h1>
          <p className="paragraph-s">{selectedRole === "Customer" ? "Production will share the schedule, location and call details here when they are ready." : "Add the schedule, location and key contacts before sharing it."}</p>
          <div className="shared-call-sheet-empty-actions">
            <Link className="shared-primary-action label-s-semibold" href={selectedRole === "Customer" ? "/customer-dashboard" : `/projects/${project.id}/stages/shoot`}>{selectedRole === "Customer" ? "Back to project" : "Open Shoot"}</Link>
            {selectedRole === "Customer" ? <Link className="shared-secondary-action label-s-semibold" href={`/chat?project=${project.id}`}>Message production</Link> : null}
          </div>
        </section>
      ) : <div className="shared-call-sheet-content">
        <header className="shared-project-heading">
          <p className="label-xs-semibold">{project.clientName}</p>
          <h1>{callSheet.projectName}</h1>
        </header>
        {visibleDays.map((day, index) => (
          <SharedDay
            callSheet={callSheet}
            clientName={project.clientName}
            day={day}
            viewer={viewer && isAssignedToDay(viewer.shootDayIds, day.id) ? viewer : undefined}
            printIndex={printMode ? index : undefined}
            onSelectDay={!printMode ? setSelectedDayId : undefined}
            key={day.id}
          />
        ))}
      </div>}

      <footer className="shared-call-sheet-footer">
        <span>{callSheet.studioName}</span>
        <span className="label-xs">Updated {formatUpdatedTime(callSheet.updatedAt)}</span>
      </footer>
    </main>
  );
}

function SharedDay({ callSheet, clientName, day, viewer, printIndex, onSelectDay }: { callSheet: CallSheet; clientName: string; day: ShootDay; viewer?: CallSheet["people"][number]; printIndex?: number; onSelectDay?: (dayId: string) => void }) {
  const daySwitcherRef = useRef<HTMLElement>(null);
  const activeDayButtonRef = useRef<HTMLButtonElement>(null);
  const location = callSheet.locations.find((item) => item.id === day.primaryLocationId);
  const timedEntries = callSheet.entries.filter((entry) => entry.dayId === day.id && entry.startTime).sort((left, right) => left.startTime.localeCompare(right.startTime));
  const unscheduledShots = callSheet.entries.filter((entry) => entry.dayId === day.id && entry.type === "shot" && !entry.startTime);
  const remainingShots = callSheet.entries.filter((entry) => entry.dayId === day.id && entry.type === "shot" && !entry.captured).length;
  const displayedWeather = getDisplayedWeather(callSheet.weather, Boolean(day.date && location));
  const [temperature, conditions, rainChance] = displayedWeather.split(" · ");
  const people = callSheet.people.filter((person) => isAssignedToDay(person.shootDayIds, day.id));
  const locations = callSheet.locations.filter((item) => isAssignedToDay(item.shootDayIds, day.id));
  const documents = callSheet.documents.filter((document) => isAssignedToDay(document.shootDayIds, day.id));

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
          <p>{location?.address}</p>
          {location ? <a className="shared-primary-action label-s-semibold" href={getMapsUrl(location.address)} target="_blank" rel="noreferrer"><DsIcon name="arrow-bend-up-right" size={18} />Open in Maps</a> : null}
        </div>
        <div className="shared-weather-block">
          <div className="shared-weather-summary"><span className="shared-weather-icon" aria-hidden="true"><DsIcon name={getWeatherIcon(displayedWeather)} size={18} /></span><div><strong>{temperature}</strong><p>{[conditions, rainChance].filter(Boolean).join(" · ")}</p></div></div>
          {callSheet.onTheDayContact ? <div className="shared-production-contact"><span className="label-xs-semibold">Key contacts</span><strong>{callSheet.onTheDayContact}</strong>{getContactPhone(callSheet.onTheDayContact) ? <a className="label-s-semibold" href={`tel:${getContactPhone(callSheet.onTheDayContact)}`}>Call production</a> : null}</div> : null}
        </div>
      </section>

      <section className="shared-day-glance" aria-label="At a glance">
        <article><span className="label-xs-semibold">First up</span><strong>{timedEntries[0]?.description ?? "Run of day not set"}</strong>{timedEntries[0] ? <small>{formatTime(timedEntries[0].startTime)}</small> : null}</article>
        <article><span className="label-xs-semibold">Shots remaining</span><strong>{remainingShots}</strong><small>Scheduled and unscheduled shots</small></article>
      </section>

      <SharedSection title="Run of day" icon="clock-clockwise" count={timedEntries.length}>
        {timedEntries.length ? <div className="shared-schedule-list">{timedEntries.map((entry) => {
          const meta = scheduleTypeMeta[entry.type];
          const rowLocation = callSheet.locations.find((item) => item.id === entry.locationId);
          return (
            <article className={`shared-schedule-row is-${entry.type} ${entry.captured ? "captured" : ""}`} key={entry.id}>
              <div className="shared-schedule-time"><strong>{formatTime(entry.startTime)}</strong>{entry.durationMinutes ? <span className="label-xs">to {formatTime(addMinutes(entry.startTime, entry.durationMinutes))}</span> : null}</div>
              <span className="shared-schedule-icon"><DsIcon name={entry.type === "shot" && entry.captured ? "check-circle" : meta.icon} size={18} /></span>
              <div><strong>{entry.description}</strong><span className="label-xs">{[entry.type === "shot" && entry.shotNumber ? `S${entry.shotNumber}` : meta.label, rowLocation?.name].filter(Boolean).join(" · ")}</span></div>
            </article>
          );
        })}</div> : <p className="shared-empty-copy">The schedule has not been added yet.</p>}
      </SharedSection>

      {unscheduledShots.length ? (
        <SharedSection title="Unscheduled shots" icon="video-camera-ds" count={unscheduledShots.length}>
          <div className="shared-shot-list">{unscheduledShots.map((shot) => (
            <article className={shot.captured ? "captured" : ""} key={shot.id}>
              <span className={`shared-shot-status ${shot.captured ? "captured" : "remaining"}`}>{shot.captured ? <DsIcon name="check-circle" size={20} /> : <span className="label-xs-semibold">To do</span>}</span>
              <div><strong>{shot.description}</strong><span className="label-xs">{[shot.shotNumber ? `S${shot.shotNumber}` : null, shot.subject, callSheet.locations.find((item) => item.id === shot.locationId)?.name].filter(Boolean).join(" · ")}</span></div>
            </article>
          ))}</div>
        </SharedSection>
      ) : null}

      {people.length ? (
        <SharedSection title="Contacts" icon="users-three" count={people.length}>
          <div className="shared-contact-list">{people.map((person) => (
            <article key={person.id}>
              <span className="shared-contact-avatar label-xs-semibold">{getInitials(person.name)}</span>
              <div><strong>{person.name}</strong><span className="label-xs">{person.role || person.type} · Call {formatTime(person.callTime)}</span>{person.email ? <a className="shared-contact-email label-xs" href={`mailto:${person.email}`}>{person.email}</a> : null}</div>
              {person.phone ? <a aria-label={`Call ${person.name}`} href={`tel:${normalisePhone(person.phone)}`}><span className="label-xs-semibold">Call</span><span className="shared-desktop-phone label-xs-semibold">{person.phone}</span></a> : null}
            </article>
          ))}</div>
        </SharedSection>
      ) : null}

      {locations.length ? (
        <SharedSection title="Locations" icon="push-pin-simple" count={locations.length}>
          <div className="shared-location-list">{locations.map((item) => {
            const practicalDetails = getLocationPracticalDetails(item);
            return <article key={item.id}>
              <div className="shared-location-heading"><strong>{item.name}</strong>{item.id === day.primaryLocationId ? <span className="label-xs-semibold">Primary</span> : null}</div>
              <p>{item.address}</p>
              <a className="shared-location-map label-s-semibold" href={getMapsUrl(item.address)} target="_blank" rel="noreferrer"><DsIcon name="arrow-bend-up-right" size={16} />Open in Maps</a>
              {practicalDetails ? <p className="shared-location-practical-details">{practicalDetails}</p> : null}
            </article>
          })}</div>
        </SharedSection>
      ) : null}

      {day.safetyEmergency?.confirmed ? (
        <SharedSection title="Safety and emergency" icon="alert-triangle">
          <div className="shared-safety-emergency">
            <div><span className="label-xs-semibold">Nearest emergency department</span><strong>{day.safetyEmergency.hospitalName}</strong><p>{day.safetyEmergency.hospitalAddress}</p>{day.safetyEmergency.hospitalPhone ? <a href={`tel:${normalisePhone(day.safetyEmergency.hospitalPhone)}`}>{day.safetyEmergency.hospitalPhone}</a> : null}{day.safetyEmergency.travelTime ? <p>{day.safetyEmergency.travelTime}</p> : null}</div>
            <a className="shared-primary-action label-s-semibold" href={getMapsUrl(day.safetyEmergency.hospitalAddress)} target="_blank" rel="noreferrer"><DsIcon name="arrow-bend-up-right" size={16} />Open in Maps</a>
            <div><span className="label-xs-semibold">Emergency contact</span><a href={`tel:${normalisePhone(day.safetyEmergency.emergencyNumber)}`}>{day.safetyEmergency.emergencyNumber}</a></div>
          </div>
        </SharedSection>
      ) : null}

      {callSheet.notes.trim() ? <SharedSection title="Production Notes" icon="file-text"><p className="shared-notes">{callSheet.notes}</p></SharedSection> : null}

      {callSheet.visibleOptionalSections.includes("documents") && documents.length ? (
        <SharedSection title="Documents" icon="folder" count={documents.length}>
          <div className="shared-document-list">{documents.map((document) => <a href={document.url} key={document.id}><DsIcon name={document.kind === "link" ? "link" : "file-text"} size={18} /><span>{document.name}</span><DsIcon name="arrow-bend-up-right" size={16} /></a>)}</div>
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

function SharedSection({ title, icon, count, children }: { title: string; icon: DsIconName; count?: number; children: ReactNode }) {
  return (
    <section className="shared-section">
      <header><div><DsIcon name={icon} size={20} /><h2>{title}</h2>{typeof count === "number" ? <span className="label-xs-semibold">{count}</span> : null}</div></header>
      <div className="shared-section-body">{children}</div>
    </section>
  );
}

function PracticalItem({ title, body }: { title: string; body: string }) {
  return <article><strong>{title}</strong><p>{body}</p></article>;
}

function getLocationPracticalDetails(location: CallSheet["locations"][number]) {
  let notes = location.notes.trim();
  const details = [
    ["Parking", location.parking.trim()],
    ["Access", location.access.trim()],
    ["Accessibility", location.accessibility?.trim() ?? ""],
    ["Wi-Fi", location.wifi?.trim() ?? ""],
  ] as const;
  details.forEach(([label, detail]) => {
    if (!detail || new RegExp(`^${label}:`, "imu").test(notes)) return;
    notes = `${notes}${notes ? "\n" : ""}${label}: ${detail}`;
  });
  return notes;
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
