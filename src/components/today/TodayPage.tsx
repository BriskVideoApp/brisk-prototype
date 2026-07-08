"use client";

import type {
  CSSProperties,
  DragEvent as ReactDragEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { activeVideoProjects } from "@/data/active-videos/mockData";
import { formatHours, getAcceptedPerson, snapToQuarter, stageLabels } from "@/data/active-videos/teamDefaults";
import { todayCurrentUserId, todayReferenceDate, todayTimeEntries } from "@/data/today/mockData";
import { readSharedTimeEntries, sharedTimeEntriesEventName, toTodayTimeEntry } from "@/data/timeEntries/sharedTimeEntries";
import { DsIcon } from "@/components/video-review/DsIcon";
import type { Project, StageKey } from "@/components/active-videos/types";
import type { DsIconName } from "@/components/video-review/DsIcon";
import type { PrototypeRole, TodayEntryStatus, TodayProjectCard, TodayTimeEntry, WeekDay } from "./types";

const prototypeRoles: PrototypeRole[] = ["Studio Staff", "Studio Freelancer", "Customer"];
const stageOptions: StageKey[] = ["brief", "script", "shoot", "storyboard", "media", "edit", "masters"];
const defaultBlockHours = 2;
const weekDayCount = 5;
const maxEntryHours = 24;
const minEntryHours = 0.25;
const resizePixelsPerQuarterHour = 10;
const cardBaseHeight = 56;
const cardHeightPerHour = 28;
const doneCardBaseHeight = 56;
const doneCardHeightPerHour = 6;
const defaultTodoLanePercent = 68;
const minTodoLanePercent = 45;
const maxTodoLanePercent = 82;

const stageIconByStage: Record<StageKey, DsIconName> = {
  brief: "clipboard-text",
  script: "pen-nib",
  shoot: "video-camera-ds",
  storyboard: "grid-four",
  media: "image-square",
  edit: "stage-edit",
  masters: "film-strip",
};

type EntryEditorState = {
  entryId: string;
  x: number;
  y: number;
};

type EntryTotals = {
  planned: number;
  done: number;
};

export function TodayPage() {
  const [selectedRole, setSelectedRole] = useState<PrototypeRole>("Studio Staff");
  const [weekOffset, setWeekOffset] = useState(0);
  const [entries, setEntries] = useState<TodayTimeEntry[]>(todayTimeEntries);
  const [editorState, setEditorState] = useState<EntryEditorState | null>(null);
  const [todoLanePercent, setTodoLanePercent] = useState(defaultTodoLanePercent);
  const entryCounterRef = useRef(todayTimeEntries.length + 1);

  useEffect(() => {
    const syncSharedEntries = () => {
      const sharedEntries = readSharedTimeEntries().map(toTodayTimeEntry);
      setEntries(mergeTodayEntries(todayTimeEntries, sharedEntries));
    };

    syncSharedEntries();
    window.addEventListener(sharedTimeEntriesEventName, syncSharedEntries);
    window.addEventListener("storage", syncSharedEntries);

    return () => {
      window.removeEventListener(sharedTimeEntriesEventName, syncSharedEntries);
      window.removeEventListener("storage", syncSharedEntries);
    };
  }, []);

  const weekDays = useMemo(() => getWeekDays(weekOffset), [weekOffset]);
  const projectCards = useMemo(
    () => deriveProjectCards(activeVideoProjects, todayCurrentUserId, entries),
    [entries],
  );
  const entriesByDay = useMemo(() => groupEntriesByDay(entries, weekDays), [entries, weekDays]);
  const weekTotals = useMemo(
    () =>
      weekDays.reduce<EntryTotals>(
        (totals, day) => addEntryTotals(totals, getEntryTotals(entriesByDay.get(day.date) ?? [])),
        { planned: 0, done: 0 },
      ),
    [entriesByDay, weekDays],
  );
  const editorEntry = editorState ? entries.find((entry) => entry.id === editorState.entryId) ?? null : null;

  const updateEntry = (entryId: string, updater: (entry: TodayTimeEntry) => TodayTimeEntry) => {
    setEntries((currentEntries) =>
      currentEntries.map((entry) => (entry.id === entryId ? { ...updater(entry), updatedAt: new Date().toISOString() } : entry)),
    );
  };

  const openEditorForEntry = (entryId: string, x: number, y: number) => {
    setEditorState({ entryId, x, y });
  };

  const createEntry = (projectCard: TodayProjectCard, date: string) => {
    const nextEntry: TodayTimeEntry = {
      id: `today-entry-new-${entryCounterRef.current}`,
      projectId: projectCard.projectId,
      personId: projectCard.currentUserId,
      date,
      startMinutes: 0,
      status: "todo",
      hours: snapToQuarter(defaultBlockHours),
      note: "",
      createdAt: new Date().toISOString(),
    };

    entryCounterRef.current += 1;
    setEntries((currentEntries) => [...currentEntries, nextEntry]);
  };

  const moveEntry = (entryId: string, date: string, status: TodayEntryStatus) => {
    updateEntry(entryId, (entry) => (entry.date === date ? { ...entry, status } : entry));
  };

  const resizeEntry = (entryId: string, nextHours: number) => {
    updateEntry(entryId, (entry) => ({ ...entry, hours: snapToQuarter(Math.max(minEntryHours, nextHours)) }));
  };

  return (
    <main className="today-shell">
      <TodaySidebar selectedRole={selectedRole} />
      <section className="today-main" aria-label="Today workspace">
        <TodayHeader
          selectedRole={selectedRole}
          weekDays={weekDays}
          weekTotals={weekTotals}
          onRoleChange={setSelectedRole}
          onPreviousWeek={() => setWeekOffset((currentOffset) => currentOffset - 1)}
          onNextWeek={() => setWeekOffset((currentOffset) => currentOffset + 1)}
          onThisWeek={() => setWeekOffset(0)}
        />

        {selectedRole === "Studio Staff" ? (
          <div className="today-workspace">
            <ProjectRail projectCards={projectCards} />
            <WeekGrid
              entriesByDay={entriesByDay}
              projectCards={projectCards}
              todoLanePercent={todoLanePercent}
              weekDays={weekDays}
              onTodoLanePercentChange={setTodoLanePercent}
              onDropProjectCard={createEntry}
              onMoveEntry={moveEntry}
              onResizeEntry={resizeEntry}
              onOpenEditor={(entry, rect) => openEditorForEntry(entry.id, rect.left, rect.bottom)}
            />
          </div>
        ) : (
          <TodayUnavailable selectedRole={selectedRole} />
        )}

        {editorState && editorEntry ? (
          <TimeEntryEditor
            entry={editorEntry}
            position={editorState}
            projectCards={projectCards}
            onClose={() => setEditorState(null)}
            onDelete={() => {
              setEntries((currentEntries) => currentEntries.filter((entry) => entry.id !== editorEntry.id));
              setEditorState(null);
            }}
            onSave={(nextEntry) => {
              updateEntry(editorEntry.id, () => nextEntry);
              setEditorState(null);
            }}
          />
        ) : null}
      </section>
    </main>
  );
}

function TodaySidebar({ selectedRole }: { selectedRole: PrototypeRole }) {
  return (
    <aside className="today-sidebar" aria-label="Primary navigation">
      <nav className="today-sidebar-nav" aria-label="Workspace">
        <Link className="today-sidebar-link label-s-semibold" href="/active-videos">
          <DsIcon name="queue" size={16} />
          Active Videos
        </Link>
        {selectedRole === "Studio Staff" ? (
          <Link className="today-sidebar-link active label-s-semibold" href="/today">
            <DsIcon name="check-circle" size={16} />
            Today
          </Link>
        ) : null}
        <Link className="today-sidebar-link label-s-semibold" href="/projects/mock-project/script?role=studio">
          <DsIcon name="film-script" size={16} />
          Script
        </Link>
        <Link className="today-sidebar-link label-s-semibold" href="/review">
          <DsIcon name="play" size={16} />
          Video Review
        </Link>
      </nav>
    </aside>
  );
}

function TodayHeader({
  selectedRole,
  weekDays,
  weekTotals,
  onRoleChange,
  onPreviousWeek,
  onNextWeek,
  onThisWeek,
}: {
  selectedRole: PrototypeRole;
  weekDays: WeekDay[];
  weekTotals: EntryTotals;
  onRoleChange: (role: PrototypeRole) => void;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onThisWeek: () => void;
}) {
  const firstDay = weekDays[0];
  const lastDay = weekDays[weekDays.length - 1];

  return (
    <header className="today-header">
      <div className="today-header-title">
        <span className="today-date label-s-semibold">{formatLongDate(todayReferenceDate)}</span>
        <h1>Today</h1>
      </div>
      <div className="today-header-actions">
        <div className="today-week-nav" aria-label="Week navigator">
          <button className="today-icon-button" type="button" aria-label="Previous week" onClick={onPreviousWeek}>
            <DsIcon name="caret-left" size={16} />
          </button>
          <button className="today-week-current label-s-semibold" type="button" onClick={onThisWeek}>
            {formatShortDate(firstDay.date)} - {formatShortDate(lastDay.date)}
          </button>
          <button className="today-icon-button" type="button" aria-label="Next week" onClick={onNextWeek}>
            <DsIcon name="caret-right" size={16} />
          </button>
        </div>
        <span className="today-week-total label-s-semibold">
          {formatHours(weekTotals.planned)} planned · {formatHours(weekTotals.done)} done
        </span>
        <div className="today-role-switcher" role="group" aria-label="View as role">
          {prototypeRoles.map((role) => (
            <button
              className={`today-role-option label-s-semibold ${selectedRole === role ? "selected" : ""}`}
              type="button"
              key={role}
              aria-pressed={selectedRole === role}
              onClick={() => onRoleChange(role)}
            >
              {role}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

function ProjectRail({ projectCards }: { projectCards: TodayProjectCard[] }) {
  return (
    <aside className="today-stage-rail" aria-label="To do projects">
      <header className="today-stage-rail-header">
        <div>
          <h2 className="heading-3xs" data-tooltip="Videos assigned to you that are In Production">
            {projectCards.length} active projects
          </h2>
        </div>
      </header>
      <div className="today-project-list">
        {projectCards.map((projectCard) => (
          <ProjectCard key={projectCard.id} projectCard={projectCard} />
        ))}
      </div>
    </aside>
  );
}

function ProjectCard({ projectCard }: { projectCard: TodayProjectCard }) {
  const handleDragStart = (event: ReactDragEvent<HTMLDivElement>) => {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("text/plain", `project-card:${projectCard.id}`);
  };

  return (
    <div className="today-project-card" draggable onDragStart={handleDragStart}>
      <div className="today-project-card-line">
        <strong className="label-s-semibold">{projectCard.projectName}</strong>
        <span className="today-client-badge label-xs-semibold">{projectCard.clientBadge}</span>
        {projectCard.isCritical ? <DsIcon name="fire-simple" size={15} /> : null}
      </div>
      <div className="today-project-card-meta label-xs-semibold">
        <span>{formatDeadlineDistance(projectCard.deadlineAt)}</span>
        <span>{formatWholeHours(projectCard.loggedHours)} / {formatWholeHours(projectCard.assignedHours)}</span>
      </div>
    </div>
  );
}

function WeekGrid({
  weekDays,
  entriesByDay,
  projectCards,
  todoLanePercent,
  onDropProjectCard,
  onMoveEntry,
  onResizeEntry,
  onOpenEditor,
  onTodoLanePercentChange,
}: {
  weekDays: WeekDay[];
  entriesByDay: Map<string, TodayTimeEntry[]>;
  projectCards: TodayProjectCard[];
  todoLanePercent: number;
  onDropProjectCard: (projectCard: TodayProjectCard, date: string) => void;
  onMoveEntry: (entryId: string, date: string, status: TodayEntryStatus) => void;
  onResizeEntry: (entryId: string, nextHours: number) => void;
  onOpenEditor: (entry: TodayTimeEntry, rect: DOMRect) => void;
  onTodoLanePercentChange: (percent: number) => void;
}) {
  const gridBodyRef = useRef<HTMLDivElement>(null);
  const gridBodyStyle = {
    "--today-todo-lane-fr": `${todoLanePercent}fr`,
    "--today-done-lane-fr": `${100 - todoLanePercent}fr`,
    "--today-todo-lane-percent": `${todoLanePercent}%`,
  } as CSSProperties;

  const handleDividerPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const gridBody = gridBodyRef.current;

    if (!gridBody) {
      return;
    }

    const updateLanePercent = (clientY: number) => {
      const rect = gridBody.getBoundingClientRect();
      const nextPercent = ((clientY - rect.top) / rect.height) * 100;
      onTodoLanePercentChange(clamp(nextPercent, minTodoLanePercent, maxTodoLanePercent));
    };

    const handlePointerMove = (pointerEvent: PointerEvent) => {
      updateLanePercent(pointerEvent.clientY);
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    updateLanePercent(event.clientY);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  return (
    <section className="today-week-grid" aria-label="Working week">
      <div className="today-grid-header">
        {weekDays.map((day) => {
          const dayEntries = entriesByDay.get(day.date) ?? [];
          const dayTotals = getEntryTotals(dayEntries);

          return (
            <div className={`today-day-head ${day.isToday ? "today" : ""}`} key={day.date}>
              <span className="label-s-semibold">{day.dayLabel}</span>
              <span className="label-xs">{day.dateLabel}</span>
              <strong className="today-day-total label-xs-semibold">
                <span>{formatHours(dayTotals.planned)} planned</span>
                <span>{formatHours(dayTotals.done)} done</span>
              </strong>
            </div>
          );
        })}
      </div>
      <div className="today-grid-body" ref={gridBodyRef} style={gridBodyStyle}>
        <button
          className="today-lane-divider"
          type="button"
          aria-label="Resize To do and Done split"
          onPointerDown={handleDividerPointerDown}
        />
        {weekDays.map((day) => (
          <DayColumn
            day={day}
            entries={entriesByDay.get(day.date) ?? []}
            projectCards={projectCards}
            key={day.date}
            onDropProjectCard={onDropProjectCard}
            onMoveEntry={onMoveEntry}
            onResizeEntry={onResizeEntry}
            onOpenEditor={onOpenEditor}
          />
        ))}
      </div>
    </section>
  );
}

function DayColumn({
  day,
  entries,
  projectCards,
  onDropProjectCard,
  onMoveEntry,
  onResizeEntry,
  onOpenEditor,
}: {
  day: WeekDay;
  entries: TodayTimeEntry[];
  projectCards: TodayProjectCard[];
  onDropProjectCard: (projectCard: TodayProjectCard, date: string) => void;
  onMoveEntry: (entryId: string, date: string, status: TodayEntryStatus) => void;
  onResizeEntry: (entryId: string, nextHours: number) => void;
  onOpenEditor: (entry: TodayTimeEntry, rect: DOMRect) => void;
}) {
  const todoEntries = entries.filter((entry) => getEntryStatus(entry) === "todo");
  const doneEntries = entries.filter((entry) => getEntryStatus(entry) === "done");

  return (
    <div className={`today-day-column ${day.isToday ? "today" : ""}`}>
      <DaySection
        date={day.date}
        entries={todoEntries}
        projectCards={projectCards}
        status="todo"
        title="To do"
        onDropProjectCard={onDropProjectCard}
        onMoveEntry={onMoveEntry}
        onResizeEntry={onResizeEntry}
        onOpenEditor={onOpenEditor}
      />
      <DaySection
        date={day.date}
        entries={doneEntries}
        projectCards={projectCards}
        status="done"
        title="Done"
        onDropProjectCard={onDropProjectCard}
        onMoveEntry={onMoveEntry}
        onResizeEntry={onResizeEntry}
        onOpenEditor={onOpenEditor}
      />
    </div>
  );
}

function DaySection({
  date,
  entries,
  projectCards,
  status,
  title,
  onDropProjectCard,
  onMoveEntry,
  onResizeEntry,
  onOpenEditor,
}: {
  date: string;
  entries: TodayTimeEntry[];
  projectCards: TodayProjectCard[];
  status: TodayEntryStatus;
  title: string;
  onDropProjectCard: (projectCard: TodayProjectCard, date: string) => void;
  onMoveEntry: (entryId: string, date: string, status: TodayEntryStatus) => void;
  onResizeEntry: (entryId: string, nextHours: number) => void;
  onOpenEditor: (entry: TodayTimeEntry, rect: DOMRect) => void;
}) {
  const handleDragOver = (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = status === "todo" ? "copy" : "move";
  };

  const handleDrop = (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const payload = event.dataTransfer.getData("text/plain");

    if (payload.startsWith("project-card:") && status === "todo") {
      const projectCardId = payload.replace("project-card:", "");
      const projectCard = projectCards.find((card) => card.id === projectCardId);

      if (projectCard) {
        onDropProjectCard(projectCard, date);
      }

      return;
    }

    if (payload.startsWith("time-entry:")) {
      const entryId = payload.replace("time-entry:", "");
      onMoveEntry(entryId, date, status);
    }
  };

  return (
    <section
      className={`today-day-section ${status}`}
      aria-label={title}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <header className="today-day-section-header">
        <strong>{title}</strong>
      </header>
      <div className="today-day-card-list">
        {entries.map((entry) => {
          const projectCard = projectCards.find((card) => card.projectId === entry.projectId);

          return <TimeBlock entry={entry} key={entry.id} projectCard={projectCard} onOpenEditor={onOpenEditor} onResizeEntry={onResizeEntry} />;
        })}
      </div>
    </section>
  );
}

function TimeBlock({
  entry,
  projectCard,
  onOpenEditor,
  onResizeEntry,
}: {
  entry: TodayTimeEntry;
  projectCard?: TodayProjectCard;
  onOpenEditor: (entry: TodayTimeEntry, rect: DOMRect) => void;
  onResizeEntry: (entryId: string, nextHours: number) => void;
}) {
  const stageLabel = entry.stage ? stageLabels[entry.stage] : "Unspecified";
  const status = getEntryStatus(entry);
  const blockStyle = {
    "--today-entry-card-height": `${getEntryCardHeight(entry.hours, status)}px`,
  } as CSSProperties;

  const handleDragStart = (event: ReactDragEvent<HTMLDivElement>) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", `time-entry:${entry.id}`);
  };

  const handleResizeStart = (event: ReactPointerEvent<HTMLButtonElement>, edge: "top" | "bottom") => {
    event.preventDefault();
    event.stopPropagation();

    const startY = event.clientY;
    const startingHours = entry.hours;

    const handlePointerMove = (pointerEvent: PointerEvent) => {
      const pointerDelta = edge === "top" ? startY - pointerEvent.clientY : pointerEvent.clientY - startY;
      const quarterHourDelta = Math.round(pointerDelta / resizePixelsPerQuarterHour);
      const nextHours = startingHours + quarterHourDelta * minEntryHours;
      onResizeEntry(entry.id, Math.max(minEntryHours, nextHours));
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  return (
    <div
      className={`today-time-block ${entry.stage ? "" : "unspecified"} ${status} ${getTodoColourClass(entry)}`}
      draggable
      role="button"
      tabIndex={0}
      style={blockStyle}
      onClick={(event) => onOpenEditor(entry, event.currentTarget.getBoundingClientRect())}
      onDragStart={handleDragStart}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          onOpenEditor(entry, event.currentTarget.getBoundingClientRect());
        }
      }}
    >
      <span className="today-time-block-main">
        <span className="label-xs-semibold">{stageLabel}</span>
        <span className="label-xs-semibold">{formatHours(entry.hours)}</span>
      </span>
      <span className="today-time-block-project label-xs">{projectCard?.projectName ?? "Project time"}</span>
      {!entry.stage ? <span className="today-time-block-warning label-xs-semibold">Set stage</span> : null}
      <button
        className="today-duration-handle top"
        type="button"
        aria-label="Resize hours from top"
        onPointerDown={(event) => handleResizeStart(event, "top")}
      />
      <button
        className="today-duration-handle bottom"
        type="button"
        aria-label="Resize hours from bottom"
        onPointerDown={(event) => handleResizeStart(event, "bottom")}
      />
    </div>
  );
}

function TimeEntryEditor({
  entry,
  projectCards,
  position,
  onDelete,
  onSave,
  onClose,
}: {
  entry: TodayTimeEntry;
  projectCards: TodayProjectCard[];
  position: EntryEditorState;
  onDelete: () => void;
  onSave: (entry: TodayTimeEntry) => void;
  onClose: () => void;
}) {
  const projectCard = projectCards.find((card) => card.projectId === entry.projectId);
  const [draftStage, setDraftStage] = useState<StageKey | "">(entry.stage ?? "");
  const [draftHours, setDraftHours] = useState(String(entry.hours));
  const [draftNote, setDraftNote] = useState(entry.note ?? "");
  const viewportWidth = typeof window === "undefined" ? 1440 : window.innerWidth;
  const viewportHeight = typeof window === "undefined" ? 900 : window.innerHeight;
  const editorStyle = {
    "--editor-left": `${Math.min(position.x, viewportWidth - 340)}px`,
    "--editor-top": `${Math.min(position.y + 8, viewportHeight - 360)}px`,
  } as CSSProperties;

  const saveEntry = () => {
    const parsedHours = Number(draftHours);
    const hours = Number.isFinite(parsedHours) ? snapToQuarter(clamp(parsedHours, 0.25, maxEntryHours)) : entry.hours;

    onSave({
      ...entry,
      stage: draftStage || undefined,
      hours,
      note: draftNote.trim(),
    });
  };

  return (
    <aside className="today-entry-editor" style={editorStyle} aria-label="Log time">
      <header className="today-entry-editor-header">
        <strong className="heading-3xs">{projectCard?.projectName ?? "Project time"}</strong>
        <button className="today-icon-button" type="button" aria-label="Close editor" onClick={onClose}>
          <DsIcon name="x-close-cross" size={16} />
        </button>
      </header>
      <label className="today-field label-s-semibold">
        Stage
        <span className="today-stage-select-wrap">
          {draftStage ? <StageFlowIcon stage={draftStage} /> : null}
          <select value={draftStage} onChange={(event) => setDraftStage(event.target.value as StageKey | "")}>
            <option value="">Select stage</option>
            {stageOptions.map((stage) => (
              <option value={stage} key={stage}>
                {stageLabels[stage]}
              </option>
            ))}
          </select>
        </span>
      </label>
      <label className="today-field label-s-semibold">
        Hours
        <input min="0.25" step="0.25" type="number" value={draftHours} onChange={(event) => setDraftHours(event.target.value)} />
      </label>
      <label className="today-field label-s-semibold">
        Note
        <textarea value={draftNote} onChange={(event) => setDraftNote(event.target.value)} />
      </label>
      <div className="today-entry-editor-actions">
        <button className="today-delete-time label-s-semibold" type="button" onClick={onDelete}>
          Delete
        </button>
        <span className="today-entry-editor-action-group">
          <button className="today-cancel-time label-s-semibold" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="today-save-time label-s-semibold" type="button" onClick={saveEntry}>
            Save
          </button>
        </span>
      </div>
    </aside>
  );
}

function TodayUnavailable({ selectedRole }: { selectedRole: PrototypeRole }) {
  return (
    <section className="today-unavailable">
      <h2>Today is for Studio Staff</h2>
      <p className="paragraph-s">
        {selectedRole} users do not log Brisk time here. The Today nav item is hidden for this role.
      </p>
      <Link className="today-secondary-link label-s-semibold" href="/active-videos">
        Go to Active Videos
      </Link>
    </section>
  );
}

function StageFlowIcon({ stage }: { stage: StageKey }) {
  return (
    <span className={`today-flow-icon today-flow-icon-${stage}`} aria-hidden="true">
      <DsIcon name={stageIconByStage[stage]} size={20} />
    </span>
  );
}

function getEntryStatus(entry: TodayTimeEntry): TodayEntryStatus {
  return entry.status ?? "done";
}

function getEntryTotals(entries: TodayTimeEntry[]): EntryTotals {
  return entries.reduce<EntryTotals>(
    (totals, entry) => {
      if (getEntryStatus(entry) === "done") {
        return { ...totals, done: totals.done + entry.hours };
      }

      return { ...totals, planned: totals.planned + entry.hours };
    },
    { planned: 0, done: 0 },
  );
}

function addEntryTotals(firstTotals: EntryTotals, secondTotals: EntryTotals): EntryTotals {
  return {
    planned: firstTotals.planned + secondTotals.planned,
    done: firstTotals.done + secondTotals.done,
  };
}

function getEntryCardHeight(hours: number, status: TodayEntryStatus) {
  const baseHeight = status === "done" ? doneCardBaseHeight : cardBaseHeight;
  const heightPerHour = status === "done" ? doneCardHeightPerHour : cardHeightPerHour;

  return baseHeight + Math.max(minEntryHours, hours) * heightPerHour;
}

function getTodoColourClass(entry: TodayTimeEntry) {
  if (getEntryStatus(entry) !== "todo") {
    return "";
  }

  const colourIndex = Array.from(entry.projectId).reduce((total, character) => total + character.charCodeAt(0), 0) % 5;
  return `todo-colour-${colourIndex}`;
}

function mergeTodayEntries(baseEntries: TodayTimeEntry[], sharedEntries: TodayTimeEntry[]) {
  const entriesById = new Map<string, TodayTimeEntry>();

  [...baseEntries, ...sharedEntries].forEach((entry) => {
    entriesById.set(entry.id, entry);
  });

  return Array.from(entriesById.values());
}

function deriveProjectCards(projects: Project[], currentUserId: string, entries: TodayTimeEntry[]): TodayProjectCard[] {
  return projects
    .filter((project) => project.status === "Queued" || project.status === "In Production" || project.status === "Paused")
    .flatMap((project) => {
      const currentUserRoles = project.team.filter((roleSlot) => {
        const person = getAcceptedPerson(roleSlot);
        return person?.id === currentUserId && person.personType === "Studio Staff" && roleSlot.stages.some((stage) => stage.estimatedHours > 0);
      });
      const todayEntriesForProject = entries.filter((entry) => entry.projectId === project.id && entry.personId === currentUserId);

      if (currentUserRoles.length === 0 && todayEntriesForProject.length === 0) {
        return [];
      }

      const assignedHours = currentUserRoles.reduce(
        (total, roleSlot) => total + roleSlot.stages.reduce((stageTotal, stage) => stageTotal + stage.estimatedHours, 0),
        0,
      );
      const existingLoggedHours = project.timeEntries
        .filter((entry) => entry.personId === currentUserId)
        .reduce((total, entry) => total + entry.hours, 0);
      const todayLoggedHours = todayEntriesForProject.reduce((total, entry) => total + entry.hours, 0);

      return [
        {
          id: project.id,
          projectId: project.id,
          projectName: project.name,
          clientBadge: project.clientBadge,
          deadlineAt: project.deadlineAt,
          isCritical: project.isCritical,
          assignedHours,
          loggedHours: existingLoggedHours + todayLoggedHours,
          currentUserId,
        },
      ];
    })
    .sort(sortProjectCards);
}

function sortProjectCards(firstCard: TodayProjectCard, secondCard: TodayProjectCard) {
  if (firstCard.isCritical !== secondCard.isCritical) {
    return firstCard.isCritical ? -1 : 1;
  }

  const deadlineDifference = parseDateKey(firstCard.deadlineAt).getTime() - parseDateKey(secondCard.deadlineAt).getTime();

  if (deadlineDifference !== 0) {
    return deadlineDifference;
  }

  return firstCard.projectName.localeCompare(secondCard.projectName);
}

function groupEntriesByDay(entries: TodayTimeEntry[], weekDays: WeekDay[]) {
  const dayKeys = new Set(weekDays.map((day) => day.date));

  return entries
    .filter((entry) => dayKeys.has(entry.date))
    .reduce<Map<string, TodayTimeEntry[]>>((entriesByDay, entry) => {
      const existingEntries = entriesByDay.get(entry.date) ?? [];
      entriesByDay.set(entry.date, [...existingEntries, entry].sort(sortTodayEntries));
      return entriesByDay;
    }, new Map());
}

function sortTodayEntries(firstEntry: TodayTimeEntry, secondEntry: TodayTimeEntry) {
  if (getEntryStatus(firstEntry) !== getEntryStatus(secondEntry)) {
    return getEntryStatus(firstEntry) === "todo" ? -1 : 1;
  }

  return firstEntry.createdAt.localeCompare(secondEntry.createdAt);
}

function getWeekDays(weekOffset: number): WeekDay[] {
  const referenceDate = parseDateKey(todayReferenceDate);
  const monday = getMonday(referenceDate);
  monday.setDate(monday.getDate() + weekOffset * 7);

  return Array.from({ length: weekDayCount }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const dateKey = formatDateKey(date);

    return {
      date: dateKey,
      dayLabel: new Intl.DateTimeFormat("en-AU", { weekday: "short" }).format(date),
      dateLabel: new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short" }).format(date),
      isToday: dateKey === todayReferenceDate,
    };
  });
}

function getMonday(date: Date) {
  const monday = new Date(date);
  const day = monday.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(monday.getDate() + diff);
  return monday;
}

function parseDateKey(dateKey: string) {
  return new Date(`${dateKey.slice(0, 10)}T00:00:00`);
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatLongDate(dateKey: string) {
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parseDateKey(dateKey));
}

function formatShortDate(dateKey: string) {
  return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short" }).format(parseDateKey(dateKey));
}

function formatWholeHours(hours: number) {
  return `${Math.round(hours)}h`;
}

function formatDeadlineDistance(deadlineAt: string) {
  const deadline = parseDateKey(deadlineAt);
  const today = parseDateKey(todayReferenceDate);
  const daysLeft = getWorkingDayDistance(today, deadline);

  if (daysLeft < 0) {
    const overdueDays = Math.abs(daysLeft);
    return overdueDays === 1 ? "1 day overdue" : `${overdueDays} days overdue`;
  }

  if (daysLeft === 0) {
    return "Due today";
  }

  return daysLeft === 1 ? "1 day left" : `${daysLeft} days left`;
}

function getWorkingDayDistance(startDate: Date, endDate: Date) {
  const direction = endDate >= startDate ? 1 : -1;
  const cursor = new Date(startDate);
  let workingDays = 0;

  while (formatDateKey(cursor) !== formatDateKey(endDate)) {
    cursor.setDate(cursor.getDate() + direction);

    if (isWorkingDay(cursor)) {
      workingDays += direction;
    }
  }

  return workingDays;
}

function isWorkingDay(date: Date) {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
