"use client";

import Image from "next/image";
import Link from "next/link";
import { createPortal } from "react-dom";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ComponentProps,
  type DragEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import type { Project } from "@/components/active-videos/types";
import { BriskSelect } from "@/components/form/BriskSelect";
import { ProjectStageHeader } from "@/components/project/ProjectStageHeader";
import { ScriptMediaPicker, type ScriptMediaPickerOption } from "@/components/script/ScriptMediaPicker";
import { DsIcon, type DsIconName } from "@/components/video-review/DsIcon";
import { mediaAssets, type MediaAsset } from "@/data/media";
import {
  addMinutes,
  callSheetStorageKey,
  ensureShotNumbers,
  existingPeople,
  formatTime,
  getInitialCallSheet,
  getMapsUrl,
  isAssignedToDay,
  shootAddressSuggestions,
  type CallSheet,
  type InterviewQuestion,
  type ProductionEntry,
  type CameraAngle,
  type CameraMovement,
  type InteriorExterior,
  type SafetyEmergencyInfo,
  type ScheduleType,
  type ShotCategory,
  type ShotImageSource,
  type ShotSize,
  type ShootDay,
  type ShootDayAssignment,
  type ShootDocument,
  type ShootLocation,
  type ShootPerson,
  type ShootPersonType,
} from "@/data/shoot";

type SaveStatus = "loading" | "saved" | "saving" | "error" | "recovered";
type PersonFilter = "all" | ShootPersonType;
type ScheduleStatusFilter = "all" | "remaining" | "done";
type ScheduleView = "schedule" | "shots";
type ShotFieldId = "captured" | "image" | "shotNumber" | "description" | "subject" | "location" | "category" | "size" | "movement" | "estimatedTime" | "notes" | "cameraAngle" | "lens" | "camera" | "gear" | "interiorExterior";
type ShootPlanPreferences = {
  hasStarted: boolean;
  callSheetEnabled: boolean;
  shotListEnabled: boolean;
  scheduleView: ScheduleView;
};
type ScheduleClash = {
  entry: ProductionEntry;
  overlapMinutes: number;
  suggestedStartTime: string;
  sharedLocation: boolean;
  sharedPeople: boolean;
};
type DayDraftMode = "add" | "edit";
type ShootDetailKey = "callTime" | "location" | "wrap" | "contact";
type EntryTimeMode = "unscheduled" | "set";
type EntryDraft = Omit<ProductionEntry, "id" | "dayId"> & { id?: string; timeMode?: EntryTimeMode };
type PersonDraft = Omit<ShootPerson, "id"> & { id?: string; sourceContact?: boolean };
type LocationDraft = Omit<ShootLocation, "id"> & { id?: string };

const scheduleTypeOptions: Array<{ value: ScheduleType; label: string; icon: DsIconName }> = [
  { value: "shot", label: "Shot", icon: "video-camera-ds" },
  { value: "setup", label: "Setup", icon: "settings" },
  { value: "lunch", label: "Lunch", icon: "fork-knife" },
  { value: "travel", label: "Travel", icon: "car-simple" },
  { value: "break", label: "Break", icon: "coffee" },
];
const shotCategoryOptions: ShotCategory[] = ["Interview", "B-roll", "Establishing", "Product", "Action", "Demonstration", "Event coverage", "Drone", "Other"];
const shotSizeOptions: ShotSize[] = ["Extreme close-up", "Close-up", "Medium close-up", "Medium", "Medium wide", "Wide", "Extreme wide"];
const cameraMovementOptions: CameraMovement[] = ["Static", "Handheld", "Pan", "Tilt", "Tracking", "Push in", "Pull out", "Gimbal", "Slider / dolly", "Jib / crane", "Other"];
const cameraAngleOptions: CameraAngle[] = ["Eye level", "Low angle", "High angle", "Overhead", "Shoulder level", "Hip level", "POV", "Dutch angle", "Other"];
const interiorExteriorOptions: InteriorExterior[] = ["Interior", "Exterior", "Both"];
const lensOptions = ["Wide, 16-35mm", "Standard, 35-70mm", "Telephoto, 70-200mm", "Macro", "Prime", "Zoom", "Custom"];
const gearOptions = ["Tripod", "Monopod", "Shoulder rig", "Handheld", "Gimbal / stabiliser", "Slider / dolly", "Jib / crane", "Drone", "Other"];
const defaultShotFields: ShotFieldId[] = ["captured", "image", "shotNumber", "description", "subject", "location", "category", "size", "movement", "estimatedTime", "notes"];
const allShotFields: Array<{ id: ShotFieldId; label: string; optional?: boolean }> = [
  { id: "captured", label: "Captured" }, { id: "image", label: "Image" }, { id: "shotNumber", label: "Shot number" }, { id: "description", label: "Description" },
  { id: "subject", label: "Subject" }, { id: "location", label: "Location" }, { id: "category", label: "Shot category" }, { id: "size", label: "Shot size" },
  { id: "movement", label: "Camera movement" }, { id: "estimatedTime", label: "Est. filming time" }, { id: "notes", label: "Notes" },
  { id: "cameraAngle", label: "Camera angle", optional: true }, { id: "lens", label: "Lens", optional: true }, { id: "camera", label: "Camera", optional: true },
  { id: "gear", label: "Gear", optional: true }, { id: "interiorExterior", label: "Interior / Exterior", optional: true },
];
const shotMediaOptions: Array<ScriptMediaPickerOption<ShotImageSource>> = [
  { value: "upload", label: "Upload file", icon: "upload-simple" },
  { value: "link", label: "Add link", icon: "link" },
  { value: "stock", label: "Choose stock", icon: "image-square" },
  { value: "project-media", label: "Choose from Project Media", icon: "play" },
];

const personTypeLabels: Record<ShootPersonType, string> = {
  talent: "Talent",
  crew: "Crew",
  client: "Client",
  other: "Other",
};
const crewRoleOptions = ["Assistant", "Director", "Producer", "Shooter", "Sound"] as const;
const addCrewRoleValue = "add-new-role";

function getWeatherIcon(weather: string): DsIconName {
  const condition = (weather.split(" · ")[1] ?? weather).toLowerCase();

  if (condition.includes("rain") || condition.includes("shower") || condition.includes("storm")) return "weather-rain";
  if (condition.includes("sun") || condition.includes("clear")) return "weather-sun";
  return "weather-cloud";
}

export function ShootStagePage({ project }: { project: Project }) {
  const [callSheet, setCallSheet] = useState<CallSheet>(() => normaliseSimpleShootCallSheet(ensureShotNumbers(getInitialCallSheet(project))));
  const [selectedDayId, setSelectedDayId] = useState(() => getInitialCallSheet(project).days[0]?.id ?? "day-1");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("loading");
  const [toast, setToast] = useState("");
  const [toastAction, setToastAction] = useState<"add-person" | null>(null);
  const [entryDraft, setEntryDraft] = useState<EntryDraft | null>(null);
  const [quickEntryDraft, setQuickEntryDraft] = useState<EntryDraft | null>(null);
  const [personDraft, setPersonDraft] = useState<PersonDraft | null>(null);
  const [attachCreatedPersonToQuickEntry, setAttachCreatedPersonToQuickEntry] = useState(false);
  const [assignNewPersonAsContact, setAssignNewPersonAsContact] = useState(false);
  const [isExistingPersonOpen, setIsExistingPersonOpen] = useState(false);
  const [existingPersonAnchor, setExistingPersonAnchor] = useState<HTMLButtonElement | null>(null);
  const [locationDraft, setLocationDraft] = useState<LocationDraft | null>(null);
  const [assignNewLocationAsPrimary, setAssignNewLocationAsPrimary] = useState(false);
  const [newLocationShotTargetId, setNewLocationShotTargetId] = useState<string | null>(null);
  const [assignNewLocationToEntryDraft, setAssignNewLocationToEntryDraft] = useState(false);
  const [dayMenuId, setDayMenuId] = useState<string | null>(null);
  const [dayDraft, setDayDraft] = useState<ShootDay | null>(null);
  const [dayDraftMode, setDayDraftMode] = useState<DayDraftMode | null>(null);
  const [dayDraftError, setDayDraftError] = useState("");
  const [deleteDayId, setDeleteDayId] = useState<string | null>(null);
  const [editingShootDetail, setEditingShootDetail] = useState<ShootDetailKey | null>(null);
  const [isNoticeEditing, setIsNoticeEditing] = useState(false);
  const [noticeDraft, setNoticeDraft] = useState("");
  const [isSpecialInstructionsEditing, setIsSpecialInstructionsEditing] = useState(false);
  const [specialInstructionsDraft, setSpecialInstructionsDraft] = useState("");
  const [isDocumentsOpen, setIsDocumentsOpen] = useState(false);
  const [questionDraft, setQuestionDraft] = useState("");
  const [questionPersonId, setQuestionPersonId] = useState("");
  const [questionPersonFilter, setQuestionPersonFilter] = useState("all");
  const [personFilter, setPersonFilter] = useState<PersonFilter>("all");
  const [scheduleView, setScheduleView] = useState<ScheduleView>("schedule");
  const [hasStartedShootPlan, setHasStartedShootPlan] = useState(() => {
    const initialCallSheet = getInitialCallSheet(project);
    return initialCallSheet.entries.length > 0 || isCallSheetConfigured(initialCallSheet);
  });
  const [hasCallSheet, setHasCallSheet] = useState(() => isCallSheetConfigured(getInitialCallSheet(project)));
  const [isShotListEnabled, setIsShotListEnabled] = useState(() => getInitialCallSheet(project).entries.length > 0);
  const [scheduleStatusFilter, setScheduleStatusFilter] = useState<ScheduleStatusFilter>("all");
  const [scheduleTypeFilters, setScheduleTypeFilters] = useState<ScheduleType[]>([]);
  const [scheduleLocationFilters, setScheduleLocationFilters] = useState<string[]>([]);
  const [schedulePersonFilters, setSchedulePersonFilters] = useState<string[]>([]);
  const [isUnscheduledPanelOpen, setIsUnscheduledPanelOpen] = useState(false);
  const [draggedEntryId, setDraggedEntryId] = useState<string | null>(null);
  const [draggedQuestionId, setDraggedQuestionId] = useState<string | null>(null);
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);
  const [highlightedEntryId, setHighlightedEntryId] = useState<string | null>(null);
  const [focusedShotDescriptionId, setFocusedShotDescriptionId] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const toastTimeoutRef = useRef<number | null>(null);
  const saveRecoveryTimeoutRef = useRef<number | null>(null);
  const skipInitialSaveRef = useRef(true);
  const hadSaveErrorRef = useRef(false);
  const noticeCancelRef = useRef(false);
  const shootDateInputRef = useRef<HTMLInputElement>(null);
  const scheduleAddButtonRef = useRef<HTMLButtonElement>(null);
  const activeDayTabRef = useRef<HTMLDivElement>(null);

  const currentDay = callSheet.days.find((day) => day.id === selectedDayId) ?? callSheet.days[0];
  const activeDayId = currentDay?.id ?? "";
  const currentLocation = callSheet.locations.find((location) => location.id === currentDay?.primaryLocationId);
  const displayedWeather = getDisplayedWeather(callSheet.weather, Boolean(currentDay?.date && currentLocation));
  const dayEntries = callSheet.entries.filter((entry) => entry.dayId === currentDay?.id);
  const shotEntries = callSheet.entries.filter((entry) => entry.type === "shot");
  const timedEntries = dayEntries
    .filter((entry) => Boolean(entry.startTime))
    .sort((left, right) => left.startTime.localeCompare(right.startTime));
  const unscheduledShots = dayEntries.filter((entry) => entry.type === "shot" && !entry.startTime);
  const entryClashes = getScheduleClashes(timedEntries);
  const activeScheduleTypeFilters = scheduleView === "schedule" ? scheduleTypeFilters : [];
  const visibleTimedEntries = timedEntries.filter((entry) => matchesScheduleFilters(entry, scheduleStatusFilter, activeScheduleTypeFilters, scheduleLocationFilters, schedulePersonFilters));
  const timelineStartTime = currentDay?.timelineStartTime || currentDay?.generalCallTime || "08:00";
  const timelineEndTime = currentDay?.timelineEndTime || currentDay?.expectedWrapTime || "17:00";
  const timelineStartMinute = timeToMinutes(timelineStartTime);
  const timelineEndMinute = Math.max(timelineStartMinute + 30, timeToMinutes(timelineEndTime));
  const entriesBeforeTimeline = visibleTimedEntries.filter((entry) => timeToMinutes(entry.startTime) < timelineStartMinute);
  const entriesAfterTimeline = visibleTimedEntries.filter((entry) => timeToMinutes(entry.startTime) + entry.durationMinutes > timelineEndMinute);
  const outOfRangeEntryCount = new Set([...entriesBeforeTimeline, ...entriesAfterTimeline].map((entry) => entry.id)).size;
  const visibleTimelineEntries = visibleTimedEntries.filter((entry) => {
    const startMinute = timeToMinutes(entry.startTime);
    return startMinute >= timelineStartMinute && startMinute + entry.durationMinutes <= timelineEndMinute;
  });
  const visibleShotListEntries = [...shotEntries];
  const hasVisibleScheduleEntries = visibleTimedEntries.length + unscheduledShots.length > 0;
  const entriesForCurrentView = scheduleView === "schedule" ? dayEntries : shotEntries;
  const canReturnToSetup = !isCallSheetConfigured(callSheet) && callSheet.entries.length === 0;
  const people = callSheet.people.filter((person) => isAssignedToDay(person.shootDayIds, currentDay?.id ?? ""));
  const crew = callSheet.people.filter((person) => person.type === "crew");
  const selectedContactId = crew.find((person) => callSheet.onTheDayContact.startsWith(person.name))?.id ?? "";
  const filteredPeople = people.filter((person) => personFilter === "all" || person.type === personFilter);
  const peopleDatabase = [
    ...callSheet.people,
    ...existingPeople.filter((person) => !callSheet.people.some((existing) => existing.id === person.id)),
  ];
  const locations = callSheet.locations.filter((location) => isAssignedToDay(location.shootDayIds, currentDay?.id ?? ""));
  const questions = callSheet.questions.filter((question) => isAssignedToDay(question.shootDayIds, currentDay?.id ?? ""));
  const specialInstructions = [callSheet.notes.trim(), callSheet.practicalInfo.access.trim()].filter(Boolean).join("\n\n");
  const sharedCallSheetHref = `/share/call-sheet/${project.id}?preview=1`;

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(callSheetStorageKey(project.id));
      let nextCallSheet = normaliseSimpleShootCallSheet(ensureShotNumbers(getInitialCallSheet(project)));
      if (stored) {
        const parsed = normaliseSimpleShootCallSheet(ensureShotNumbers(JSON.parse(stored) as CallSheet));
        if (parsed.notice.trim() && !parsed.visibleOptionalSections.includes("notice")) {
          parsed.visibleOptionalSections = ["notice", ...parsed.visibleOptionalSections];
        }
        nextCallSheet = parsed;
      }

      const storedPreferences = parseShootPlanPreferences(window.localStorage.getItem(shootPlanPreferencesStorageKey(project.id)));
      const storedLegacyView = window.localStorage.getItem(`brisk-shoot-view-${project.id}`);
      const hasEntries = nextCallSheet.entries.length > 0;
      const configuredCallSheet = isCallSheetConfigured(nextCallSheet);
      const hasStarted = configuredCallSheet || hasEntries || storedPreferences?.hasStarted === true;
      const callSheetEnabled = storedPreferences?.callSheetEnabled
        ?? (configuredCallSheet || (storedPreferences?.hasStarted === true && storedPreferences.scheduleView === "schedule"));
      const shotListEnabled = storedPreferences?.shotListEnabled ?? nextCallSheet.entries.some((entry) => entry.type === "shot");
      const preferredView = storedPreferences?.scheduleView
        ?? (storedLegacyView === "schedule" || storedLegacyView === "shots" ? storedLegacyView : "schedule");

      setCallSheet(nextCallSheet);
      setSelectedDayId(nextCallSheet.days[0]?.id ?? "day-1");
      setHasStartedShootPlan(hasStarted);
      setHasCallSheet(callSheetEnabled);
      setIsShotListEnabled(shotListEnabled);
      setScheduleView(!callSheetEnabled || (preferredView === "shots" && !shotListEnabled) ? (callSheetEnabled ? "schedule" : "shots") : preferredView);
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    } finally {
      setHasLoaded(true);
    }
  }, [project.id]);

  const selectScheduleView = (view: ScheduleView) => {
    if (view === "shots" && !isShotListEnabled) return;
    setScheduleView(view);
    if (view === "shots") setIsUnscheduledPanelOpen(false);
    window.localStorage.setItem(`brisk-shoot-view-${project.id}`, view);
  };

  const initialiseCallSheet = () => {
    const dayId = callSheet.days[0]?.id ?? "day-1";
    const firstDay = callSheet.days[0] ?? createEmptyShootDay(dayId);
    mutateCallSheet((current) => ({
      ...current,
      days: current.days.length ? current.days : [firstDay],
      entries: current.entries.map((entry) => entry.type === "shot" && !entry.dayId ? { ...entry, dayId } : entry),
      people: current.people.map((person) => Array.isArray(person.shootDayIds) && person.shootDayIds.length === 0 ? { ...person, shootDayIds: [dayId] } : person),
      locations: current.locations.map((location) => Array.isArray(location.shootDayIds) && location.shootDayIds.length === 0 ? { ...location, shootDayIds: [dayId] } : location),
    }));
    setSelectedDayId(dayId);
    setHasStartedShootPlan(true);
    setHasCallSheet(true);
    setScheduleView("schedule");
  };

  const startShootPlan = (view: ScheduleView) => {
    if (view === "schedule") {
      setIsShotListEnabled(false);
      initialiseCallSheet();
      return;
    }
    setHasStartedShootPlan(true);
    setHasCallSheet(false);
    setScheduleView("shots");
    setIsShotListEnabled(true);
  };

  const returnToShootSetup = () => {
    if (!canReturnToSetup) return;
    mutateCallSheet((current) => ({ ...current, days: [] }));
    setSelectedDayId("");
    setHasStartedShootPlan(false);
    setHasCallSheet(false);
    setIsShotListEnabled(false);
    setScheduleView("schedule");
    setQuickEntryDraft(null);
    setEntryDraft(null);
  };

  useEffect(() => {
    if (!hasLoaded) return;
    const preferences: ShootPlanPreferences = {
      hasStarted: hasStartedShootPlan,
      callSheetEnabled: hasCallSheet,
      shotListEnabled: isShotListEnabled,
      scheduleView,
    };
    window.localStorage.setItem(shootPlanPreferencesStorageKey(project.id), JSON.stringify(preferences));
  }, [hasCallSheet, hasLoaded, hasStartedShootPlan, isShotListEnabled, project.id, scheduleView]);

  useEffect(() => {
    if (!hasLoaded) return;
    if (skipInitialSaveRef.current) {
      skipInitialSaveRef.current = false;
      return;
    }
    setSaveStatus("saving");
    const timeoutId = window.setTimeout(() => {
      try {
        window.localStorage.setItem(callSheetStorageKey(project.id), JSON.stringify(callSheet));
        if (hadSaveErrorRef.current) {
          hadSaveErrorRef.current = false;
          setSaveStatus("recovered");
          if (saveRecoveryTimeoutRef.current) window.clearTimeout(saveRecoveryTimeoutRef.current);
          saveRecoveryTimeoutRef.current = window.setTimeout(() => setSaveStatus("saved"), 1800);
        } else {
          setSaveStatus("saved");
        }
      } catch {
        hadSaveErrorRef.current = true;
        setSaveStatus("error");
      }
    }, 450);
    return () => window.clearTimeout(timeoutId);
  }, [callSheet, hasLoaded, project.id]);

  useEffect(() => () => {
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    if (saveRecoveryTimeoutRef.current) window.clearTimeout(saveRecoveryTimeoutRef.current);
  }, []);

  useEffect(() => {
    activeDayTabRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [selectedDayId]);

  useEffect(() => {
    if (scheduleView !== "schedule" || !highlightedEntryId) return;
    const frameId = window.requestAnimationFrame(() => {
      const matchingEntries = Array.from(document.querySelectorAll<HTMLElement>(`[data-shoot-entry-id="${highlightedEntryId}"]`));
      matchingEntries.find((element) => element.offsetParent !== null)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    const timeoutId = window.setTimeout(() => setHighlightedEntryId(null), 1800);
    return () => { window.cancelAnimationFrame(frameId); window.clearTimeout(timeoutId); };
  }, [highlightedEntryId, scheduleView, selectedDayId]);

  useEffect(() => {
    if (!unscheduledShots.length) setIsUnscheduledPanelOpen(false);
  }, [unscheduledShots.length]);

  const mutateCallSheet = (updater: (current: CallSheet) => CallSheet) => {
    setCallSheet((current) => ({ ...updater(current), updatedAt: new Date().toISOString() }));
  };

  const showToast = (message: string, action: "add-person" | null = null) => {
    setToast(message);
    setToastAction(action);
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = window.setTimeout(() => { setToast(""); setToastAction(null); }, 2800);
  };

  const openExistingPersonPicker = (event?: ReactMouseEvent<HTMLButtonElement>) => {
    const activeButton = document.activeElement instanceof HTMLButtonElement ? document.activeElement : null;
    setExistingPersonAnchor(event?.currentTarget ?? activeButton);
    setIsExistingPersonOpen(true);
  };

  const updateCurrentDay = (patch: Partial<ShootDay>) => {
    if (!currentDay) return;
    mutateCallSheet((current) => ({
      ...current,
      days: current.days.map((day) => day.id === currentDay.id ? { ...day, ...patch } : day),
    }));
  };

  const updateGeneralCallTime = (generalCallTime: string) => {
    if (!currentDay) return;
    updateCurrentDay({
      generalCallTime,
      timelineStartTime: !currentDay.timelineStartTime || currentDay.timelineStartTime === currentDay.generalCallTime
        ? generalCallTime
        : currentDay.timelineStartTime,
    });
  };

  const updateExpectedWrapTime = (expectedWrapTime: string) => {
    if (!currentDay) return;
    updateCurrentDay({
      expectedWrapTime,
      timelineEndTime: !currentDay.timelineEndTime || currentDay.timelineEndTime === currentDay.expectedWrapTime
        ? expectedWrapTime
        : currentDay.timelineEndTime,
    });
  };

  const getNextStartTime = () => {
    const lastEntry = timedEntries.at(-1);
    return roundTimeToFifteen(lastEntry ? addMinutes(lastEntry.startTime, lastEntry.durationMinutes) : currentDay?.generalCallTime || "08:00");
  };

  const closeQuickEntry = (returnFocus = true) => {
    setQuickEntryDraft(null);
    if (returnFocus) window.requestAnimationFrame(() => scheduleAddButtonRef.current?.focus());
  };

  const createNewEntryDraft = (timeMode: EntryTimeMode, startTime = ""): EntryDraft => ({
    startTime: timeMode === "set" ? startTime : "",
    timeMode,
    durationMinutes: 30,
    description: "",
    type: "shot",
    locationId: currentDay?.primaryLocationId,
    personIds: [],
    captured: false,
    subject: "",
    imageReferenceUrl: "",
    shotCategory: undefined,
    shotSize: undefined,
    cameraMovement: undefined,
    cameraAngle: undefined,
    lens: "",
    camera: "",
    gear: [],
    interiorExterior: undefined,
    notes: "",
  });

  const openNewEntry = () => {
    setDeleteEntryId(null);
    if (scheduleView === "shots") {
      setQuickEntryDraft(null);
      setEntryDraft({ ...createNewEntryDraft("unscheduled"), durationMinutes: 0 });
      return;
    }
    setEntryDraft(null);
    setQuickEntryDraft(createNewEntryDraft("unscheduled"));
  };

  const addShotListRow = () => {
    const entryId = `entry-${Date.now()}`;
    mutateCallSheet((current) => {
      const shots = current.entries.filter((entry) => entry.type === "shot");
      const shotNumber = Math.max(0, ...shots.map((entry) => entry.shotNumber ?? 0)) + 1;
      const shotListOrder = Math.max(-1, ...shots.map((entry) => entry.shotListOrder ?? -1)) + 1;
      const entry: ProductionEntry = {
        id: entryId,
        dayId: activeDayId,
        shotNumber,
        shotListOrder,
        startTime: "",
        durationMinutes: 0,
        description: "",
        type: "shot",
        locationId: currentDay?.primaryLocationId,
        personIds: [],
        captured: false,
      };
      return { ...current, entries: [...current.entries, entry] };
    });
    setFocusedShotDescriptionId(entryId);
  };

  const openNewEntryAtTime = (startTime: string) => {
    setDeleteEntryId(null);
    setEntryDraft(null);
    setQuickEntryDraft(createNewEntryDraft("set", startTime));
  };

  const saveEntry = (draft: EntryDraft) => {
    if (!draft.description.trim()) return;
    const isShot = draft.type === "shot";
    const startTime = isShot && draft.timeMode === "unscheduled" ? "" : draft.startTime;
    if ((!isShot || draft.timeMode === "set") && !startTime) return;
    if (!currentDay && (!isShot || Boolean(startTime))) return;
    const existingEntry = draft.id ? callSheet.entries.find((entry) => entry.id === draft.id) : undefined;
    const { timeMode: _timeMode, ...entryFields } = draft;
    const entryBase: ProductionEntry = {
      ...entryFields,
      id: draft.id ?? `entry-${Date.now()}`,
      dayId: existingEntry?.dayId || activeDayId,
      description: draft.description.trim(),
      startTime,
      captured: isShot ? Boolean(draft.captured) : undefined,
      subject: isShot ? draft.subject?.trim() : undefined,
      imageReferenceUrl: isShot ? draft.imageReferenceUrl?.trim() || undefined : undefined,
    };
    mutateCallSheet((current) => {
      const nextShotNumber = Math.max(
        0,
        ...current.entries
          .filter((item) => item.type === "shot")
          .map((item) => item.shotNumber ?? 0),
      ) + 1;
      const entry: ProductionEntry = {
        ...entryBase,
        shotNumber: isShot ? draft.shotNumber ?? nextShotNumber : undefined,
        shotListOrder: isShot ? draft.shotListOrder ?? current.entries.filter((item) => item.type === "shot").length : undefined,
      };
      return {
        ...current,
        entries: draft.id
          ? current.entries.map((item) => item.id === draft.id ? entry : item)
          : [...current.entries, entry],
      };
    });
    setEntryDraft(null);
    const wasQuickEntry = !draft.id;
    closeQuickEntry(wasQuickEntry);
    setDeleteEntryId(null);
    showToast(draft.id ? "Entry updated." : entryBase.startTime ? "Added to the schedule." : "Unscheduled shot added.");
  };

  const removeEntry = (id: string) => {
    mutateCallSheet((current) => ({ ...current, entries: current.entries.filter((entry) => entry.id !== id) }));
    setEntryDraft(null);
    setDeleteEntryId(null);
    showToast("Entry removed.");
  };

  const reorderEntries = (sourceId: string, targetId: string) => {
    if (sourceId === targetId || !currentDay) return;
    mutateCallSheet((current) => {
      const dayEntries = current.entries.filter((entry) => entry.dayId === currentDay.id);
      const sourceIndex = dayEntries.findIndex((entry) => entry.id === sourceId);
      const targetIndex = dayEntries.findIndex((entry) => entry.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) return current;
      const nextDayEntries = [...dayEntries];
      const [moved] = nextDayEntries.splice(sourceIndex, 1);
      nextDayEntries.splice(targetIndex, 0, moved);
      const otherEntries = current.entries.filter((entry) => entry.dayId !== currentDay.id);
      return { ...current, entries: [...otherEntries, ...nextDayEntries] };
    });
  };

  const reorderShotList = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    mutateCallSheet((current) => {
      const shots = current.entries.filter((entry) => entry.type === "shot").sort((left, right) => (left.shotListOrder ?? 0) - (right.shotListOrder ?? 0));
      const sourceIndex = shots.findIndex((entry) => entry.id === sourceId);
      const targetIndex = shots.findIndex((entry) => entry.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) return current;
      const nextShots = [...shots];
      const [moved] = nextShots.splice(sourceIndex, 1);
      nextShots.splice(targetIndex, 0, moved);
      const orderById = new Map(nextShots.map((entry, index) => [entry.id, index]));
      return { ...current, entries: current.entries.map((entry) => entry.type === "shot" ? { ...entry, shotListOrder: orderById.get(entry.id) ?? entry.shotListOrder } : entry) };
    });
  };

  const updateShot = (entryId: string, patch: Partial<ProductionEntry>) => {
    mutateCallSheet((current) => ({ ...current, entries: current.entries.map((entry) => entry.id === entryId && entry.type === "shot" ? { ...entry, ...patch } : entry) }));
  };

  const moveEntry = (id: string, scheduled: boolean) => {
    mutateCallSheet((current) => ({
      ...current,
      entries: current.entries.map((entry) => entry.id === id
        ? { ...entry, startTime: scheduled ? getNextStartTime() : "", durationMinutes: scheduled ? entry.durationMinutes || 30 : entry.durationMinutes }
        : entry),
    }));
    showToast(scheduled ? "Shot added to the schedule." : "Shot moved to Unscheduled shots.");
  };

  const toggleEntryCompletion = (id: string) => {
    mutateCallSheet((current) => ({
      ...current,
      entries: current.entries.map((entry) => entry.id !== id
        ? entry
        : entry.type === "shot"
          ? { ...entry, captured: !isEntryComplete(entry), completed: undefined }
          : { ...entry, completed: !entry.completed }),
    }));
  };

  const moveTimelineEntry = (entryId: string, nextStartTime: string) => {
    const entry = callSheet.entries.find((item) => item.id === entryId);
    if (!entry || entry.startTime === nextStartTime) return;
    mutateCallSheet((current) => ({
      ...current,
      entries: current.entries.map((item) => item.id === entryId ? { ...item, startTime: nextStartTime, durationMinutes: item.durationMinutes || 30 } : item),
    }));
    setDraggedEntryId(null);
    showToast("Entry moved.");
  };

  const resizeTimelineEntry = (entryId: string, durationMinutes: number) => {
    mutateCallSheet((current) => ({
      ...current,
      entries: current.entries.map((entry) => entry.id === entryId
        ? { ...entry, durationMinutes: Math.max(15, Math.min(240, Math.round(durationMinutes / 15) * 15)) }
        : entry),
    }));
  };

  const savePerson = (draft: PersonDraft) => {
    if (!draft.name.trim()) return;
    const { sourceContact: _sourceContact, ...personFields } = draft;
    const person: ShootPerson = {
      ...personFields,
      id: draft.id ?? `person-${Date.now()}`,
      name: draft.name.trim(),
      role: draft.role.trim(),
      shootDayIds: draft.shootDayIds,
    };
    mutateCallSheet((current) => ({
      ...current,
      onTheDayContact: assignNewPersonAsContact ? formatPersonContact(person) : current.onTheDayContact,
      people: draft.id && current.people.some((item) => item.id === draft.id)
        ? current.people.map((item) => item.id === draft.id ? person : item)
        : [...current.people, person],
    }));
    if (attachCreatedPersonToQuickEntry && !draft.id) {
      setQuickEntryDraft((current) => current && !current.personIds.includes(person.id)
        ? { ...current, personIds: [...current.personIds, person.id] }
        : current);
    }
    setAttachCreatedPersonToQuickEntry(false);
    setAssignNewPersonAsContact(false);
    setPersonDraft(null);
    showToast(draft.id ? "Person updated." : "Person added to the Call Sheet.");
  };

  const removePerson = (id: string) => {
    mutateCallSheet((current) => {
      const removedPerson = current.people.find((person) => person.id === id);
      return {
        ...current,
        onTheDayContact: removedPerson && current.onTheDayContact.startsWith(removedPerson.name) ? "" : current.onTheDayContact,
        people: current.people.filter((person) => person.id !== id),
        entries: current.entries.map((entry) => ({
          ...entry,
          personIds: entry.personIds.filter((personId) => personId !== id),
        })),
        questions: current.questions.map((question) => question.personId === id
          ? { ...question, personId: undefined }
          : question),
      };
    });
    setPersonDraft(null);
    showToast("Person removed from the Call Sheet.");
  };

  const addExistingPerson = (person: ShootPerson) => {
    mutateCallSheet((current) => current.people.some((item) => item.id === person.id)
      ? current
      : {
          ...current,
          people: [...current.people, { ...person, shootDayIds: activeDayId ? [activeDayId] : [] }],
        });
    showToast(`${person.name} added to the shoot.`, "add-person");
  };

  const selectOnTheDayContact = (personId: string) => {
    const person = callSheet.people.find((item) => item.id === personId && item.type === "crew");
    if (!person) return;
    mutateCallSheet((current) => ({
      ...current,
      onTheDayContact: formatPersonContact(person),
      people: current.people.map((item) => {
        if (item.id !== person.id || item.shootDayIds === "all" || !activeDayId || item.shootDayIds.includes(activeDayId)) return item;
        return { ...item, shootDayIds: [...item.shootDayIds, activeDayId] };
      }),
    }));
  };

  const selectPersonForQuickEntry = (person: ShootPerson) => {
    mutateCallSheet((current) => {
      const existing = current.people.find((item) => item.id === person.id);
      const personForDay = {
        ...(existing ?? person),
        shootDayIds: existing?.shootDayIds === "all" || person.shootDayIds === "all"
          ? "all" as const
          : [...new Set([...(existing?.shootDayIds ?? person.shootDayIds), ...(activeDayId ? [activeDayId] : [])])],
      };

      return {
        ...current,
        people: existing
          ? current.people.map((item) => item.id === person.id ? personForDay : item)
          : [...current.people, personForDay],
      };
    });
    setQuickEntryDraft((current) => current && !current.personIds.includes(person.id)
      ? { ...current, personIds: [...current.personIds, person.id] }
      : current);
  };

  const saveLocation = (draft: LocationDraft) => {
    if (!draft.address.trim()) return;
    const location: ShootLocation = {
      ...draft,
      id: draft.id ?? `location-${Date.now()}`,
      name: draft.name.trim() || deriveLocationName(draft.address),
      address: draft.address.trim(),
      wifi: "",
      accessibility: "",
      parking: "",
      access: "",
      notes: draft.notes.trim(),
      shootDayIds: draft.shootDayIds,
    };
    mutateCallSheet((current) => ({
      ...current,
      locations: draft.id
        ? current.locations.map((item) => item.id === draft.id ? location : item)
        : [...current.locations, location],
      entries: !draft.id && newLocationShotTargetId
        ? current.entries.map((entry) => entry.id === newLocationShotTargetId ? { ...entry, locationId: location.id } : entry)
        : current.entries,
      days: current.days.map((day) => {
        const becomesPrimary = !draft.id && (assignNewLocationAsPrimary || current.locations.length === 0) && day.id === activeDayId;
        const primaryAddressChanged = Boolean(draft.id && day.primaryLocationId === location.id && current.locations.some((item) => item.id === location.id && item.address !== location.address));
        if (!becomesPrimary && !primaryAddressChanged) return day;
        return {
          ...day,
          primaryLocationId: becomesPrimary ? location.id : day.primaryLocationId,
          safetyEmergency: markEmergencyDetailsForReview(day.safetyEmergency),
        };
      }),
    }));
    if (!draft.id && assignNewLocationToEntryDraft) setEntryDraft((current) => current ? { ...current, locationId: location.id } : current);
    setLocationDraft(null);
    setAssignNewLocationAsPrimary(false);
    setNewLocationShotTargetId(null);
    setAssignNewLocationToEntryDraft(false);
    showToast(draft.id ? "Location updated." : "Location added to the Call Sheet.");
  };

  const openNewLocation = (asPrimary = false) => {
    setAssignNewLocationAsPrimary(asPrimary);
    setLocationDraft(emptyLocationDraft(activeDayId));
  };

  const selectPrimaryLocation = (locationId: string) => {
    mutateCallSheet((current) => ({
      ...current,
      days: current.days.map((day) => day.id === activeDayId ? {
        ...day,
        primaryLocationId: locationId,
        safetyEmergency: day.primaryLocationId !== locationId
          ? markEmergencyDetailsForReview(day.safetyEmergency)
          : day.safetyEmergency,
      } : day),
      locations: current.locations.map((location) => location.id !== locationId || location.shootDayIds === "all" || location.shootDayIds.includes(activeDayId)
        ? location
        : { ...location, shootDayIds: [...location.shootDayIds, activeDayId] }),
    }));
  };

  const removeLocation = (locationId: string) => {
    mutateCallSheet((current) => ({
      ...current,
      locations: current.locations.filter((location) => location.id !== locationId),
      days: current.days.map((day) => day.primaryLocationId === locationId ? { ...day, primaryLocationId: "", safetyEmergency: markEmergencyDetailsForReview(day.safetyEmergency) } : day),
      entries: current.entries.map((entry) => entry.locationId === locationId ? { ...entry, locationId: undefined } : entry),
    }));
    setLocationDraft(null);
    setAssignNewLocationAsPrimary(false);
    showToast("Location removed from the Call Sheet.");
  };

  const reorderQuestion = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    mutateCallSheet((current) => {
      const sourceIndex = current.questions.findIndex((question) => question.id === sourceId);
      const targetIndex = current.questions.findIndex((question) => question.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) return current;
      const next = [...current.questions];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return { ...current, questions: next };
    });
  };

  const startNoticeEditing = () => {
    noticeCancelRef.current = false;
    setNoticeDraft(callSheet.notice);
    setIsNoticeEditing(true);
  };

  const saveNotice = () => {
    if (noticeCancelRef.current) {
      noticeCancelRef.current = false;
      setIsNoticeEditing(false);
      return;
    }
    if (noticeDraft !== callSheet.notice) {
      mutateCallSheet((current) => ({
        ...current,
        notice: noticeDraft,
        visibleOptionalSections: noticeDraft.trim()
          ? current.visibleOptionalSections
          : current.visibleOptionalSections.filter((item) => item !== "notice"),
      }));
    }
    setIsNoticeEditing(false);
  };

  const cancelNoticeEditing = () => {
    noticeCancelRef.current = true;
    setNoticeDraft(callSheet.notice);
    setIsNoticeEditing(false);
    if (!callSheet.notice.trim()) {
      mutateCallSheet((current) => ({ ...current, visibleOptionalSections: current.visibleOptionalSections.filter((item) => item !== "notice") }));
    }
  };

  const openAddShootDay = () => {
    const previousDay = callSheet.days.at(-1);
    setDayDraft({
      id: `day-${Date.now()}`,
      label: `Day ${callSheet.days.length + 1}`,
      date: getFollowingDate(getLatestShootDate(callSheet.days)),
      generalCallTime: previousDay?.generalCallTime || "08:00",
      expectedWrapTime: previousDay?.expectedWrapTime || "17:00",
      primaryLocationId: previousDay?.primaryLocationId ?? "",
    });
    setDayDraftMode("add");
    setDayDraftError("");
    setDayMenuId(null);
  };

  const saveDayDraft = () => {
    if (!dayDraft || !dayDraftMode) return;
    const error = validateShootDay(dayDraft, callSheet.days, callSheet.entries, dayDraftMode);
    if (error) {
      setDayDraftError(error);
      return;
    }
    mutateCallSheet((current) => ({
      ...current,
      days: dayDraftMode === "add" ? [...current.days, dayDraft] : current.days.map((day) => day.id === dayDraft.id ? {
        ...dayDraft,
        safetyEmergency: day.primaryLocationId !== dayDraft.primaryLocationId ? markEmergencyDetailsForReview(dayDraft.safetyEmergency) : dayDraft.safetyEmergency,
      } : day),
    }));
    setSelectedDayId(dayDraft.id);
    setDayDraft(null);
    setDayDraftMode(null);
    setDayDraftError("");
    showToast(dayDraftMode === "add" ? `${dayDraft.label} added.` : `${dayDraft.label} updated.`);
  };

  const addLocationToDayDraft = (name: string, address: string) => {
    if (!name.trim() || !address.trim()) return;
    const location: ShootLocation = {
      id: `location-${Date.now()}`,
      name: name.trim(),
      address: address.trim(),
      shootDayIds: "all",
      parking: "",
      access: "",
      notes: "",
    };
    mutateCallSheet((current) => ({ ...current, locations: [...current.locations, location] }));
    setDayDraft((current) => current ? { ...current, primaryLocationId: location.id } : current);
    showToast("Location added.");
  };

  const duplicateShootDay = (dayId: string) => {
    const sourceDay = callSheet.days.find((day) => day.id === dayId);
    if (!sourceDay) return;
    const timestamp = Date.now();
    const newDayId = `day-${timestamp}`;
    const duplicate: ShootDay = {
      ...sourceDay,
      id: newDayId,
      label: `Day ${callSheet.days.length + 1}`,
      date: getFollowingDate(getLatestShootDate(callSheet.days)),
    };
    const extendAssignment = (assignment: ShootPerson["shootDayIds"]) => assignment === "all" || !assignment.includes(dayId) ? assignment : [...assignment, newDayId];
    mutateCallSheet((current) => ({
      ...current,
      days: [...current.days, duplicate],
      people: current.people.map((person) => ({ ...person, shootDayIds: extendAssignment(person.shootDayIds) })),
      locations: current.locations.map((location) => ({ ...location, shootDayIds: extendAssignment(location.shootDayIds) })),
    }));
    setSelectedDayId(newDayId);
    setDayMenuId(null);
    showToast(`${duplicate.label} added with settings and people. Schedule not copied.`);
  };

  const deleteShootDay = (dayId: string) => {
    if (callSheet.days.length === 1) return;
    const remainingDays = callSheet.days.filter((day) => day.id !== dayId).map((day, index) => ({ ...day, label: `Day ${index + 1}` }));
    const nextSelectedDayId = remainingDays.find((day) => day.id !== dayId)?.id ?? "";
    const removeAssignment = (assignment: ShootPerson["shootDayIds"]) => assignment === "all" ? assignment : assignment.filter((id) => id !== dayId);
    mutateCallSheet((current) => ({
      ...current,
      days: remainingDays,
      entries: current.entries.filter((entry) => entry.dayId !== dayId),
      people: current.people.map((person) => ({ ...person, shootDayIds: removeAssignment(person.shootDayIds) })),
      locations: current.locations.map((location) => ({ ...location, shootDayIds: removeAssignment(location.shootDayIds) })),
      questions: current.questions.map((question) => ({ ...question, shootDayIds: removeAssignment(question.shootDayIds) })),
      documents: current.documents.map((document) => ({ ...document, shootDayIds: removeAssignment(document.shootDayIds) })),
    }));
    if (selectedDayId === dayId) setSelectedDayId(nextSelectedDayId);
    setDayMenuId(null);
    setDayDraft(null);
    setDayDraftMode(null);
    setDeleteDayId(null);
    showToast("Shoot day deleted.");
  };

  if (hasCallSheet && !currentDay) return null;

  return (
    <main className="shoot-shell">
      <div className="shoot-main">
        <ProjectStageHeader project={project} activeStage="shoot" showUtilities={false} />
        {hasStartedShootPlan ? <ShootStageNavigation
          value={scheduleView}
          showShotList={isShotListEnabled}
          showSchedule={hasCallSheet}
          canReturnToSetup={canReturnToSetup}
          onChange={selectScheduleView}
          onReturnToSetup={returnToShootSetup}
        /> : null}
        <div className={`shoot-workspace ${hasStartedShootPlan && scheduleView === "shots" ? "is-shot-list-page" : ""}`}>
          {!hasStartedShootPlan ? <ShootPlanEntryChoice onChoose={startShootPlan} /> : <>
          {hasCallSheet && currentDay && scheduleView === "schedule" ? <>
          <header className="shoot-page-heading">
            <div>
              <h1>{callSheet.projectName}</h1>
              <SaveIndicator status={saveStatus} />
            </div>
            <div className="shoot-heading-actions">
              <button className="shoot-button secondary label-s-semibold" type="button" onClick={() => setIsDocumentsOpen(true)}>
                <DsIcon name="folder" size={16} />
                Documents
              </button>
              <Link className="shoot-button primary label-s-semibold" href={sharedCallSheetHref} target="_blank">
                <DsIcon name="eye" size={16} />
                Preview
              </Link>
            </div>
          </header>

          <section className="shoot-call-sheet-hero" aria-labelledby="call-sheet-overview-title">
            <div className="shoot-day-controls">
              <div className="shoot-day-tabs-wrap">
                <div className="shoot-segmented shoot-day-tabs">
                  <div className="shoot-day-tabs-scroll" role="tablist" aria-label="Shoot days">{callSheet.days.map((day) => {
                    const isActive = day.id === currentDay.id;
                    return (
                      <div ref={isActive ? activeDayTabRef : undefined} className={`shoot-day-tab ${isActive ? "active" : ""}`} key={day.id}>
                        <button className="shoot-day-tab-label label-s-semibold" type="button" role="tab" aria-selected={isActive} onClick={() => { setSelectedDayId(day.id); setDayMenuId(null); setDayDraft(null); setDayDraftMode(null); setDeleteDayId(null); }}>{day.label}</button>
                        {isActive ? <button className="shoot-day-tab-menu-button" type="button" aria-label={`Manage ${day.label}`} aria-expanded={dayMenuId === day.id || (dayDraftMode === "edit" && dayDraft?.id === day.id)} onClick={() => { setDayDraft(null); setDayDraftMode(null); setDayDraftError(""); setDeleteDayId(null); setDayMenuId((current) => current === day.id ? null : day.id); }}><DsIcon name="caret-down" size={13} /></button> : null}
                      </div>
                    );
                  })}</div>
                  <div className="shoot-day-add-anchor"><button className="shoot-day-add" type="button" aria-label="Add shoot day" aria-expanded={dayDraftMode === "add"} onClick={() => dayDraftMode === "add" ? (setDayDraft(null), setDayDraftMode(null), setDayDraftError("")) : openAddShootDay()}><DsIcon name="plus" size={15} /></button></div>
                </div>
                {dayMenuId === currentDay.id ? <div className="shoot-day-menu" role="menu" aria-label={`${currentDay.label} options`}>
                  <button className="label-s" type="button" role="menuitem" onClick={() => { setDayMenuId(null); setDayDraft(structuredClone(currentDay)); setDayDraftMode("edit"); setDayDraftError(""); }}><DsIcon name="pencil-simple-ds" size={16} />Edit day</button>
                  <button className="label-s" type="button" role="menuitem" onClick={() => duplicateShootDay(currentDay.id)}><DsIcon name="copy" size={16} />Duplicate day</button>
                  <button className="label-s danger" type="button" role="menuitem" disabled={callSheet.days.length === 1} onClick={() => { setDayMenuId(null); setDeleteDayId(currentDay.id); }}><DsIcon name="trash-simple" size={16} />Delete day</button>
                </div> : null}
                {dayDraft && dayDraftMode ? <DayEditorPopover draft={dayDraft} mode={dayDraftMode} error={dayDraftError} locations={callSheet.locations} onCreateLocation={addLocationToDayDraft} onCancel={() => { setDayDraft(null); setDayDraftMode(null); setDayDraftError(""); }} onChange={(next) => { setDayDraft(next); setDayDraftError(""); }} onSave={saveDayDraft} /> : null}
              </div>
            </div>
            <div className="shoot-hero-grid">
              <div className="shoot-hero-intro">
                <p className="label-xs-semibold" id="call-sheet-overview-title">General call time</p>
                {editingShootDetail === "callTime" ? <label className="shoot-hero-time"><span className="sr-only">General call time</span><TimeSelect autoFocus value={currentDay.generalCallTime} onBlur={() => setEditingShootDetail(null)} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); if (event.key === "Escape") setEditingShootDetail(null); }} onChange={updateGeneralCallTime} /></label> : <button className="shoot-editable-call-time" type="button" aria-label={`Edit general call time, ${formatTime(currentDay.generalCallTime)}`} onClick={() => setEditingShootDetail("callTime")}><strong className="shoot-hero-time-read">{formatTime(currentDay.generalCallTime)}</strong></button>}
                <div className="shoot-day-summary-pair">
                  <div className="shoot-date-control"><button className="shoot-editable-detail" type="button" aria-label={`Edit shoot date, ${formatEditorDate(currentDay.date)}`} onClick={() => shootDateInputRef.current?.showPicker?.()}><span className="label-xs-semibold">Shoot date</span><strong>{formatEditorDate(currentDay.date)}</strong></button><input ref={shootDateInputRef} className="shoot-date-picker-input" type="date" tabIndex={-1} aria-hidden="true" value={currentDay.date} onChange={(event) => updateCurrentDay({ date: event.target.value })} /></div>
                  {editingShootDetail === "wrap" ? <label className="shoot-inline-field"><span className="label-xs-semibold">Expected wrap</span><TimeSelect autoFocus value={currentDay.expectedWrapTime} onBlur={() => setEditingShootDetail(null)} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); if (event.key === "Escape") setEditingShootDetail(null); }} onChange={updateExpectedWrapTime} /></label> : <button className="shoot-editable-detail" type="button" onClick={() => setEditingShootDetail("wrap")}><span className="label-xs-semibold">Expected wrap</span><strong>{formatTime(currentDay.expectedWrapTime)}</strong></button>}
                </div>
              </div>
              <div className="shoot-hero-details">
                {editingShootDetail === "location" ? <label className="shoot-inline-field"><span className="label-xs-semibold">Primary location</span><BriskSelect autoOpen clearable={false} ariaLabel="Choose primary location" placeholder="Location not set" value={currentDay.primaryLocationId} options={[...callSheet.locations.map((location) => ({ value: location.id, label: location.name })), { value: "new", label: "Add new location", icon: "plus" as const, dividerAbove: callSheet.locations.length > 0 }]} onOpenChange={(isOpen) => { if (!isOpen) setEditingShootDetail(null); }} onChange={(value) => {
                  if (value === "new") {
                    setEditingShootDetail(null);
                    openNewLocation(true);
                    return;
                  }
                  if (value) selectPrimaryLocation(value);
                  setEditingShootDetail(null);
                }} /></label> : <button className="shoot-editable-detail" type="button" onClick={() => setEditingShootDetail("location")}><span className="label-xs-semibold">Primary location</span><strong>{currentLocation?.name ?? "Location not set"}</strong>{currentLocation?.address ? <small>{currentLocation.address}</small> : null}</button>}
                {currentLocation ? (
                  <a className="shoot-map-link label-s-semibold" href={getMapsUrl(currentLocation.address)} target="_blank" rel="noreferrer">
                    <DsIcon name="arrow-bend-up-right" size={16} />
                    Open in Maps
                  </a>
                ) : null}
              </div>
              <div className="shoot-hero-support">
                <div className="shoot-weather-panel">
                  <span className="shoot-weather-icon" aria-hidden="true"><DsIcon name={getWeatherIcon(displayedWeather)} size={18} /></span>
                  <div>
                    <strong>{displayedWeather}</strong>
                  </div>
                </div>
                {editingShootDetail === "contact" ? <label className="shoot-inline-field"><span className="label-xs-semibold">Key contacts</span><BriskSelect autoOpen clearable={false} ariaLabel="Choose key contact" placeholder="Choose crew" value={selectedContactId} options={[...crew.map((person) => ({ value: person.id, label: person.role ? `${person.name} · ${person.role}` : person.name })), { value: "new", label: "Add new crew member" }]} onOpenChange={(isOpen) => { if (!isOpen) setEditingShootDetail(null); }} onChange={(value) => {
                  if (value === "new") {
                    setEditingShootDetail(null);
                    setAssignNewPersonAsContact(true);
                    setPersonDraft(emptyPersonDraft(currentDay.generalCallTime, activeDayId));
                    return;
                  }
                  if (value) selectOnTheDayContact(value);
                  setEditingShootDetail(null);
                }} /></label> : <button className="shoot-editable-detail" type="button" onClick={() => setEditingShootDetail("contact")}><span className="label-xs-semibold">Key contacts</span><strong>{callSheet.onTheDayContact || "Not set"}</strong></button>}
              </div>
            </div>
          </section>

          </> : null}

          <Section
            className={`shoot-schedule-section ${scheduleView === "shots" ? "is-shot-list-section" : ""}`}
            title={scheduleView === "schedule" ? "Schedule" : "Shot list"}
            icon={scheduleView === "schedule" ? "clock-clockwise" : "video-camera-ds"}
            hideHeader={scheduleView === "shots"}
            action={scheduleView === "schedule" ? <div className="shoot-section-actions">
              <CallSheetSettings
                startTime={timelineStartTime}
                endTime={timelineEndTime}
                onStartTimeChange={(timelineStartTime) => updateCurrentDay({ timelineStartTime })}
                onEndTimeChange={(timelineEndTime) => updateCurrentDay({ timelineEndTime })}
              />
              {scheduleView === "schedule" && entriesForCurrentView.length > 0 ? <ScheduleFilters
                status={scheduleStatusFilter}
                selectedTypes={scheduleTypeFilters}
                showType={scheduleView === "schedule"}
                locations={scheduleView === "schedule" ? locations : callSheet.locations}
                people={scheduleView === "schedule" ? people : callSheet.people}
                selectedLocationIds={scheduleLocationFilters}
                selectedPersonIds={schedulePersonFilters}
                onStatusChange={setScheduleStatusFilter}
                onTypeChange={setScheduleTypeFilters}
                onLocationChange={setScheduleLocationFilters}
                onPersonChange={setSchedulePersonFilters}
                onClear={() => { setScheduleStatusFilter("all"); setScheduleTypeFilters([]); setScheduleLocationFilters([]); setSchedulePersonFilters([]); }}
              /> : null}
              {!quickEntryDraft ? <button ref={scheduleAddButtonRef} className={`shoot-button ${hasCallSheet ? "primary" : "secondary"} label-s-semibold`} type="button" onClick={openNewEntry}><DsIcon name="plus" size={16} />{scheduleView === "schedule" ? "Add to schedule" : "Add shot"}</button> : null}
              {!hasCallSheet ? <button className="shoot-button primary label-s-semibold" type="button" onClick={initialiseCallSheet}>Build schedule</button> : null}
            </div> : undefined}
          >
            {hasCallSheet && scheduleView === "schedule" ? <>
              {outOfRangeEntryCount ? <div className="shoot-timeline-range-notice" role="status">
                <span className="label-xs">{outOfRangeEntryCount} scheduled {outOfRangeEntryCount === 1 ? "entry sits" : "entries sit"} outside the visible timeline.</span>
                <div>
                  {entriesBeforeTimeline.length ? <button className="shoot-text-action label-xs-semibold" type="button" onClick={() => updateCurrentDay({ timelineStartTime: entriesBeforeTimeline.reduce((earliest, entry) => entry.startTime < earliest ? entry.startTime : earliest, entriesBeforeTimeline[0].startTime) })}>Show earlier</button> : null}
                  {entriesAfterTimeline.length ? <button className="shoot-text-action label-xs-semibold" type="button" onClick={() => updateCurrentDay({ timelineEndTime: minutesToTime(Math.max(...entriesAfterTimeline.map((entry) => timeToMinutes(entry.startTime) + entry.durationMinutes))) })}>Show later</button> : null}
                </div>
              </div> : null}
              {dayEntries.length > 0 && !hasVisibleScheduleEntries && !quickEntryDraft ? <ScheduleFilterEmptyState label="No schedule entries match these filters" onClear={() => { setScheduleStatusFilter("all"); setScheduleTypeFilters([]); setScheduleLocationFilters([]); setSchedulePersonFilters([]); }} /> : null}
              {dayEntries.length === 0 || hasVisibleScheduleEntries ? <>
              <div className="shoot-desktop-timeline">
                <div className={`shoot-schedule-layout ${unscheduledShots.length ? isUnscheduledPanelOpen ? "has-unscheduled-sidebar" : "is-unscheduled-collapsed" : ""}`}>
                  {unscheduledShots.length > 0 ? <UnscheduledShotsPanel
                    entries={unscheduledShots}
                    isOpen={isUnscheduledPanelOpen}
                    onClose={() => setIsUnscheduledPanelOpen(false)}
                    onOpen={() => setIsUnscheduledPanelOpen(true)}
                    onDragEnd={() => setDraggedEntryId(null)}
                    onDragStart={setDraggedEntryId}
                    onEdit={(entry) => { setDeleteEntryId(null); setEntryDraft({ ...entry, timeMode: "unscheduled" }); }}
                    onToggleCompletion={toggleEntryCompletion}
                  /> : null}
                  <ScheduleTimeline
                    day={currentDay}
                    entries={visibleTimelineEntries}
                    highlightedEntryId={highlightedEntryId}
                    locations={callSheet.locations}
                    people={callSheet.people}
                    clashes={entryClashes}
                    onEdit={(entry) => { setDeleteEntryId(null); setEntryDraft({ ...entry, timeMode: entry.startTime ? "set" : "unscheduled" }); }}
                    onAddAtTime={openNewEntryAtTime}
                    onMove={moveTimelineEntry}
                    onResize={resizeTimelineEntry}
                    onToggleCompletion={toggleEntryCompletion}
                  />
                </div>
              </div>
              <div className="shoot-mobile-schedule">
                {unscheduledShots.length > 0 ? <button className="shoot-button secondary shoot-mobile-unscheduled-trigger label-s-semibold" type="button" aria-expanded={isUnscheduledPanelOpen} onClick={() => setIsUnscheduledPanelOpen(true)}><span>Unscheduled shots</span><span>{unscheduledShots.length}<DsIcon name="caret-right" size={14} /></span></button> : null}
                {visibleTimedEntries.length > 0 ? <EntryGroup
                  title="Run of day"
                  description=""
                  hideHeader
                  entries={visibleTimedEntries}
                  highlightedEntryId={highlightedEntryId}
                  locations={callSheet.locations}
                  people={callSheet.people}
                  clashes={entryClashes}
                  emptyTitle="No entries in this view"
                  emptyBody="Change the view or add a shot."
                  draggedEntryId={draggedEntryId}
                  onDragStart={setDraggedEntryId}
                  onDropEntry={(targetId) => {
                    if (draggedEntryId && unscheduledShots.some((entry) => entry.id === draggedEntryId)) moveEntry(draggedEntryId, true);
                    else if (draggedEntryId) reorderEntries(draggedEntryId, targetId);
                    setDraggedEntryId(null);
                  }}
                  onDropGroup={() => {
                    if (draggedEntryId && unscheduledShots.some((entry) => entry.id === draggedEntryId)) moveEntry(draggedEntryId, true);
                    setDraggedEntryId(null);
                  }}
                  onEdit={(entry) => { setDeleteEntryId(null); setEntryDraft({ ...entry, timeMode: entry.startTime ? "set" : "unscheduled" }); }}
                  onToggleCompletion={toggleEntryCompletion}
                /> : <ScheduleEmptyState />}
              </div>
              </> : null}
            </> : null}

            {scheduleView === "shots" ? <DetailedShotList
              entries={visibleShotListEntries}
              locations={callSheet.locations}
              people={callSheet.people}
              projectId={project.id}
              onCreateLocation={(entryId) => { setNewLocationShotTargetId(entryId); openNewLocation(); }}
              focusedDescriptionId={focusedShotDescriptionId}
              onAddShot={addShotListRow}
              onDescriptionFocused={() => setFocusedShotDescriptionId(null)}
              onEdit={(entry) => { setDeleteEntryId(null); setEntryDraft({ ...entry, timeMode: entry.startTime ? "set" : "unscheduled" }); }}
              onReorder={reorderShotList}
              onToggleCaptured={toggleEntryCompletion}
              onUpdate={updateShot}
            /> : null}
          </Section>

          {hasCallSheet && currentDay && scheduleView === "schedule" ? <>
          <Section
            className={`shoot-people-section ${!people.length ? "is-empty" : ""}`}
            title="People"
            icon="users-three"
            count={people.length || undefined}
            action={people.length ? <div className="shoot-section-actions">
              <PeopleFilters value={personFilter} onChange={setPersonFilter} />
              <button className="shoot-button secondary label-s-semibold" type="button" onClick={openExistingPersonPicker}><DsIcon name="plus" size={16} />Add person</button>
            </div> : undefined}
          >
            {people.length ? <>
              {filteredPeople.length ? (
              <div className="shoot-people-list">
                {filteredPeople.map((person) => (
                  <article className="shoot-person-row" key={person.id}>
                    <span className={`shoot-avatar is-${person.contactSource ?? "saved-contact"} label-xs-semibold`} aria-hidden="true">{getInitials(person.name)}</span>
                    <div className="shoot-person-name">
                      <strong className="label-s-semibold">{person.name}</strong>
                      <span className="label-xs">{person.role}</span>
                    </div>
                    <span className={`shoot-type-badge is-${person.type} label-xs-semibold`}>{personTypeLabels[person.type]}</span>
                    <div className="shoot-person-call">
                      <span className="label-xs">Call time</span>
                      <strong className="label-s-semibold">{formatTime(person.callTime)}</strong>
                    </div>
                    <div className="shoot-person-contact label-xs">
                      <a href={`tel:${normalisePhone(person.phone)}`}>{person.phone || "Add phone"}</a>
                      <a href={`mailto:${person.email}`}>{person.email || "Add email"}</a>
                    </div>
                    {person.phone ? <a className="shoot-mobile-call label-s-semibold" href={`tel:${normalisePhone(person.phone)}`} aria-label={`Call ${person.name}`}>Call</a> : null}
                    <details className="shoot-person-secondary">
                      <summary className="label-xs-semibold">Contact details</summary>
                      {person.phone ? <a href={`tel:${normalisePhone(person.phone)}`}>{person.phone}</a> : <span>No phone</span>}
                      {person.email ? <a href={`mailto:${person.email}`}>{person.email}</a> : <span>No email</span>}
                    </details>
                    <button className="shoot-icon-button" type="button" aria-label={`Edit ${person.name}`} onClick={() => setPersonDraft(personToDraft(person))}>
                      <DsIcon name="pencil-simple-ds" size={16} />
                    </button>
                  </article>
                ))}
              </div>
              ) : <div className="shoot-filter-empty"><strong>No people in this category</strong><button className="shoot-text-action label-s-semibold" type="button" onClick={() => setPersonFilter("all")}>Show all</button></div>}
            </> : (
              <EmptyState
                illustrationSrc="/brisk-visuals/shoot-people-empty.png"
                title="Add people to your shoot"
                action="Add person"
                onAction={openExistingPersonPicker}
              />
            )}
          </Section>

          <Section
            className={!locations.length ? "is-empty" : ""}
            title="Locations"
            icon="push-pin-simple"
            count={locations.length || undefined}
            action={locations.length ? <button className="shoot-button secondary label-s-semibold" type="button" onClick={() => openNewLocation()}><DsIcon name="plus" size={16} />Add location</button> : undefined}
          >
            {locations.length ? (
              <div className="shoot-location-list">
                {locations.map((location) => (
                  <article className="shoot-location-row" key={location.id}>
                    <div className="shoot-location-title">
                      <strong>{location.name}</strong>
                      {location.id === currentDay.primaryLocationId ? <span className="shoot-primary-badge label-xs-semibold">Primary</span> : null}
                    </div>
                    <p>{location.address}</p>
                    <div className="shoot-location-meta label-xs">
                      <span><strong>Used:</strong> {formatDayAssignment(location.shootDayIds, callSheet.days)}</span>
                      {getLocationNotes(location) ? <span><strong>Notes:</strong> {getLocationNotes(location)}</span> : null}
                    </div>
                    <div className="shoot-location-actions">
                      <a className="shoot-text-action label-s-semibold" href={getMapsUrl(location.address)} target="_blank" rel="noreferrer">Open in Maps</a>
                      <button className="shoot-icon-button" type="button" aria-label={`Edit ${location.name}`} onClick={() => setLocationDraft(locationToDraft(location))}><DsIcon name="pencil-simple-ds" size={16} /></button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState illustrationSrc="/brisk-visuals/shoot-locations-empty.png" title="Add the primary shoot location" action="Add location" onAction={() => openNewLocation()} />
            )}
          </Section>

          <Section
            className="shoot-compact-summary-section"
            title="Special instructions"
            icon="file-text"
            action={!isSpecialInstructionsEditing ? <button className="shoot-text-action label-s-semibold" type="button" onClick={() => { setSpecialInstructionsDraft(specialInstructions); setIsSpecialInstructionsEditing(true); }}><DsIcon name={specialInstructions ? "pencil-simple-ds" : "plus"} size={14} />{specialInstructions ? "Edit" : "Add instructions"}</button> : undefined}
          >
            {isSpecialInstructionsEditing ? <div className="shoot-special-instructions-editor">
              <label className="shoot-textarea-field">
                <span className="sr-only">Special instructions</span>
                <textarea autoFocus rows={4} placeholder="Add shoot-wide access, timing or filming instructions." value={specialInstructionsDraft} onChange={(event) => setSpecialInstructionsDraft(event.target.value)} />
              </label>
              <div className="shoot-summary-edit-actions"><button className="shoot-button secondary label-s-semibold" type="button" onClick={() => { setSpecialInstructionsDraft(specialInstructions); setIsSpecialInstructionsEditing(false); }}>Cancel</button><button className="shoot-button primary label-s-semibold" type="button" onClick={() => { mutateCallSheet((current) => ({ ...current, notes: specialInstructionsDraft.trim(), practicalInfo: { ...current.practicalInfo, access: "" } })); setIsSpecialInstructionsEditing(false); }}>Save</button></div>
            </div> : <p className={`shoot-special-instructions-summary ${specialInstructions ? "" : "is-empty"}`}>{specialInstructions || "No special instructions"}</p>}
          </Section>

          <Section className="shoot-safety-section shoot-compact-summary-section" title="Safety and emergency" icon="alert-triangle">
            <SafetyEmergencySection
              key={currentDay.id}
              info={currentDay.safetyEmergency}
              primaryLocation={currentLocation}
              onAddPrimaryLocation={() => openNewLocation(true)}
              onChange={(safetyEmergency) => updateCurrentDay({ safetyEmergency })}
            />
          </Section>

          </> : null}
          </>}

        </div>
      </div>

      {quickEntryDraft ? <div className="shoot-quick-entry-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeQuickEntry(); }}>
        <section className="shoot-quick-entry-dialog" role="dialog" aria-modal="true" aria-label={quickEntryDraft.timeMode === "unscheduled" ? "Add shot" : "Add to schedule"}>
          <QuickEntryRow
            draft={quickEntryDraft}
            shotOnly={scheduleView === "shots"}
            locations={callSheet.locations}
            people={peopleDatabase}
            onCancel={closeQuickEntry}
            onChange={setQuickEntryDraft}
            onCreatePerson={(name) => {
              setAttachCreatedPersonToQuickEntry(true);
              setPersonDraft({ ...emptyPersonDraft(currentDay?.generalCallTime ?? "", activeDayId), name });
            }}
            onSelectPerson={selectPersonForQuickEntry}
            onSave={saveEntry}
          />
        </section>
      </div> : null}

      {isUnscheduledPanelOpen && scheduleView === "schedule" ? <UnscheduledShotsPanel
        entries={unscheduledShots}
        isMobileDrawer
        isOpen
        onClose={() => setIsUnscheduledPanelOpen(false)}
        onOpen={() => setIsUnscheduledPanelOpen(true)}
        onDragEnd={() => setDraggedEntryId(null)}
        onDragStart={setDraggedEntryId}
        onEdit={(entry) => { setDeleteEntryId(null); setEntryDraft({ ...entry, timeMode: "unscheduled" }); }}
        onToggleCompletion={toggleEntryCompletion}
      /> : null}

      {entryDraft ? (
        <EntryModal
          draft={entryDraft}
          hideScheduling={scheduleView === "shots"}
          locations={callSheet.locations}
          people={people}
          projectId={project.id}
          confirmDelete={deleteEntryId === entryDraft.id}
          onCancelDelete={() => setDeleteEntryId(null)}
          onChange={setEntryDraft}
          onClose={() => { setEntryDraft(null); setDeleteEntryId(null); }}
          onDelete={() => entryDraft.id ? (deleteEntryId === entryDraft.id ? removeEntry(entryDraft.id) : setDeleteEntryId(entryDraft.id)) : undefined}
          onCreateLocation={() => { setAssignNewLocationToEntryDraft(true); openNewLocation(); }}
          onSave={saveEntry}
        />
      ) : null}
      {personDraft ? <PersonModal
        draft={personDraft}
        days={callSheet.days}
        canDelete={Boolean(personDraft.id && callSheet.people.some((person) => person.id === personDraft.id))}
        onChange={setPersonDraft}
        onClose={() => { setAttachCreatedPersonToQuickEntry(false); setAssignNewPersonAsContact(false); setPersonDraft(null); }}
        onDelete={() => personDraft.id ? removePerson(personDraft.id) : undefined}
        onSave={savePerson}
      /> : null}
      {isExistingPersonOpen ? (
        <ExistingPersonPopover
          anchor={existingPersonAnchor}
          existing={peopleDatabase}
          addedPersonIds={callSheet.people.map((person) => person.id)}
          onAdd={addExistingPerson}
          onClose={() => setIsExistingPersonOpen(false)}
          onCreate={() => { setIsExistingPersonOpen(false); setPersonDraft(emptyPersonDraft(currentDay?.generalCallTime ?? "", activeDayId)); }}
        />
      ) : null}
      {locationDraft ? <LocationModal draft={locationDraft} days={callSheet.days} onChange={setLocationDraft} onClose={() => { setLocationDraft(null); setAssignNewLocationAsPrimary(false); setNewLocationShotTargetId(null); setAssignNewLocationToEntryDraft(false); }} onDelete={() => locationDraft.id ? removeLocation(locationDraft.id) : undefined} onSave={saveLocation} /> : null}
      {isDocumentsOpen ? <DocumentsModal
        activeDayId={activeDayId}
        days={callSheet.days}
        documents={callSheet.documents}
        onChange={(documents) => mutateCallSheet((current) => ({
          ...current,
          documents,
          visibleOptionalSections: documents.length
            ? current.visibleOptionalSections.includes("documents") ? current.visibleOptionalSections : [...current.visibleOptionalSections, "documents"]
            : current.visibleOptionalSections.filter((section) => section !== "documents"),
        }))}
        onClose={() => setIsDocumentsOpen(false)}
      /> : null}
      {deleteDayId ? <DeleteShootDayModal
        day={callSheet.days.find((day) => day.id === deleteDayId)}
        entries={callSheet.entries.filter((entry) => entry.dayId === deleteDayId)}
        onCancel={() => setDeleteDayId(null)}
        onConfirm={() => deleteShootDay(deleteDayId)}
      /> : null}
      {toast ? <div className="shoot-toast label-s-semibold" role="status"><DsIcon name="check-circle" size={18} />{toast}{toastAction === "add-person" ? <button className="shoot-text-action label-xs-semibold" type="button" onClick={() => { setToast(""); setToastAction(null); setIsExistingPersonOpen(true); }}>Add another</button> : null}</div> : null}
    </main>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  const labels: Record<SaveStatus, string> = {
    loading: "",
    saving: "Saving…",
    saved: "",
    error: "Couldn’t save",
    recovered: "Saved",
  };
  if (status === "loading" || status === "saved") return null;
  return <span className={`shoot-save-status is-${status} label-xs`} role="status">{labels[status]}</span>;
}

function Section({ className = "", title, icon, count, headingAccessory, action, children, hideHeader = false }: { className?: string; title: string; icon: DsIconName; count?: number; headingAccessory?: ReactNode; action?: ReactNode; children: ReactNode; hideHeader?: boolean }) {
  return (
    <section className={`shoot-section ${hideHeader ? "has-internal-header" : ""} ${className}`.trim()}>
      {!hideHeader ? <header className="shoot-section-header">
        <div className="shoot-section-title">
          <DsIcon name={icon} size={20} />
          <h2>{title}</h2>
          {typeof count === "number" ? <span className="shoot-count label-xs-semibold">{count}</span> : null}
          {headingAccessory}
        </div>
        {action}
      </header> : null}
      <div className="shoot-section-body">{children}</div>
    </section>
  );
}

function EmptyState({ illustrationSrc, title, body, action, onAction, secondaryAction, onSecondaryAction }: { illustrationSrc: string; title: string; body?: string; action: string; onAction: () => void; secondaryAction?: string; onSecondaryAction?: () => void }) {
  return (
    <div className="shoot-empty-state">
      <Image className="shoot-empty-state-illustration" src={illustrationSrc} alt="" width={160} height={160} />
      <div><strong>{title}</strong>{body ? <p className="paragraph-s">{body}</p> : null}</div>
      <div className="shoot-empty-actions"><Button size="S" variant="primary" onClick={onAction}>{action}</Button>{secondaryAction && onSecondaryAction ? <Button size="S" variant="secondary" onClick={onSecondaryAction}>{secondaryAction}</Button> : null}</div>
    </div>
  );
}

function ShootPlanEntryChoice({ onChoose }: { onChoose: (view: ScheduleView) => void }) {
  return (
    <div className="shoot-plan-entry-choice">
      <Image className="shoot-plan-entry-illustration" src="/brisk-visuals/shoot-schedule-empty-transparent.png" alt="" width={160} height={160} priority />
      <div className="shoot-plan-entry-options">
        <button className="shoot-plan-entry-option" type="button" onClick={() => onChoose("schedule")}>
          <span className="shoot-plan-entry-copy"><strong>Build a schedule</strong><span className="paragraph-s">Create a call sheet and start planning the shoot day.</span></span>
          <span className="shoot-plan-entry-action">Start →</span>
        </button>
        <button className="shoot-plan-entry-option" type="button" onClick={() => onChoose("shots")}>
          <span className="shoot-plan-entry-copy"><strong>Create a shot list</strong><span className="paragraph-s">Plan your coverage first. Build the schedule when you’re ready.</span></span>
          <span className="shoot-plan-entry-action">Start →</span>
        </button>
      </div>
      <p className="shoot-plan-entry-guidance paragraph-s">Choose where you’d like to begin. You can change this later.</p>
    </div>
  );
}

function ScheduleEmptyState() {
  return (
    <div className="shoot-schedule-empty">
      <Image className="shoot-schedule-empty-illustration" src="/brisk-visuals/shoot-schedule-empty.png" alt="" width={160} height={160} priority />
      <strong>No schedule entries yet</strong>
      <p className="paragraph-s">Add a shot or activity, or choose a time on the timeline.</p>
    </div>
  );
}

function ShotListEmptyState() {
  return <div className="shoot-entry-empty"><strong>No shots yet</strong><p className="paragraph-s">Add your first shot to begin planning the coverage.</p></div>;
}

function ScheduleFilterEmptyState({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <div className="shoot-filter-empty">
      <strong>{label}</strong>
      <button className="shoot-text-action label-s-semibold" type="button" onClick={onClear}>Clear filters</button>
    </div>
  );
}

function ShootStageNavigation({ value, showShotList, showSchedule, canReturnToSetup, onChange, onReturnToSetup }: {
  value: ScheduleView;
  showShotList: boolean;
  showSchedule: boolean;
  canReturnToSetup: boolean;
  onChange: (view: ScheduleView) => void;
  onReturnToSetup: () => void;
}) {
  return <nav className="shoot-stage-navigation" aria-label="Shoot pages">
    <div className="shoot-stage-navigation-inner">
      <div className="shoot-stage-tabs" role="tablist" aria-label="Shoot pages">
        {showShotList ? <button className={`label-s-semibold ${value === "shots" ? "active" : ""}`} type="button" role="tab" aria-selected={value === "shots"} aria-current={value === "shots" ? "page" : undefined} onClick={() => onChange("shots")}><DsIcon name="video-camera-ds" size={18} /><span>Shot list</span></button> : null}
        {showSchedule ? <button className={`label-s-semibold ${value === "schedule" ? "active" : ""}`} type="button" role="tab" aria-selected={value === "schedule"} aria-current={value === "schedule" ? "page" : undefined} onClick={() => onChange("schedule")}><DsIcon name="clipboard-text" size={18} /><span>Call sheet</span></button> : null}
      </div>
      <div className="shoot-stage-navigation-actions">
        {canReturnToSetup ? <button className="shoot-back-to-setup label-s-semibold" type="button" aria-label="Back to setup" onClick={onReturnToSetup}><DsIcon name="arrow-left" size={16} /><span>Back to setup</span></button> : null}
      </div>
    </div>
  </nav>;
}

function ScheduleFilters({ status, selectedTypes, showType, locations, people, selectedLocationIds, selectedPersonIds, onStatusChange, onTypeChange, onLocationChange, onPersonChange, onClear }: {
  status: ScheduleStatusFilter;
  selectedTypes: ScheduleType[];
  showType: boolean;
  locations: ShootLocation[];
  people: ShootPerson[];
  selectedLocationIds: string[];
  selectedPersonIds: string[];
  onStatusChange: (status: ScheduleStatusFilter) => void;
  onTypeChange: (types: ScheduleType[]) => void;
  onLocationChange: (ids: string[]) => void;
  onPersonChange: (ids: string[]) => void;
  onClear: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const activeCount = (status === "all" ? 0 : 1) + (showType ? selectedTypes.length : 0) + selectedLocationIds.length + selectedPersonIds.length;

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!anchorRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <div className="shoot-schedule-filter-anchor" ref={anchorRef}>
      <button className={`shoot-button secondary label-s-semibold ${activeCount ? "is-active" : ""}`} type="button" aria-expanded={isOpen} aria-haspopup="dialog" onClick={() => setIsOpen((current) => !current)}>
        Filters{activeCount ? ` · ${activeCount}` : ""}
        <DsIcon name="caret-down" size={14} />
      </button>
      {isOpen ? <div className="shoot-schedule-filter-popover" role="dialog" aria-label="Filter schedule">
        <div className="shoot-schedule-filter-group" role="radiogroup" aria-label="Status">
          <strong className="label-xs-semibold">Status</strong>
          {(["all", "remaining", "done"] as ScheduleStatusFilter[]).map((value) => <button className="shoot-filter-choice label-s" type="button" role="radio" aria-checked={status === value} key={value} onClick={() => onStatusChange(value)}>
            <span className={`shoot-filter-checkbox ${status === value ? "checked" : ""}`}>{status === value ? <DsIcon name="check" size={12} /> : null}</span>
            <span>{value === "all" ? "All" : value === "remaining" ? "Remaining" : "Done"}</span>
          </button>)}
        </div>
        {showType ? <div className="shoot-schedule-filter-group" role="group" aria-label="Type">
          <strong className="label-xs-semibold">Type</strong>
          {scheduleTypeOptions.map((type) => {
            const isSelected = selectedTypes.includes(type.value);
            return <button className="shoot-filter-choice label-s" type="button" aria-pressed={isSelected} key={type.value} onClick={() => onTypeChange(isSelected ? selectedTypes.filter((value) => value !== type.value) : [...selectedTypes, type.value])}>
              <span className={`shoot-filter-checkbox ${isSelected ? "checked" : ""}`}>{isSelected ? <DsIcon name="check" size={12} /> : null}</span>
              <DsIcon name={type.icon} size={16} />
              <span>{type.label}</span>
            </button>;
          })}
        </div> : null}
        {locations.length ? <div className="shoot-schedule-filter-group" role="group" aria-label="Location">
          <strong className="label-xs-semibold">Location</strong>
          {locations.map((location) => {
            const isSelected = selectedLocationIds.includes(location.id);
            return <button className="shoot-filter-choice label-s" type="button" aria-pressed={isSelected} key={location.id} onClick={() => onLocationChange(isSelected ? selectedLocationIds.filter((id) => id !== location.id) : [...selectedLocationIds, location.id])}>
              <span className={`shoot-filter-checkbox ${isSelected ? "checked" : ""}`}>{isSelected ? <DsIcon name="check" size={12} /> : null}</span>
              <span>{location.name}</span>
            </button>;
          })}
        </div> : null}
        {people.length ? <div className="shoot-schedule-filter-group" role="group" aria-label="People">
          <strong className="label-xs-semibold">People</strong>
          {people.map((person) => {
            const isSelected = selectedPersonIds.includes(person.id);
            return <button className="shoot-filter-choice label-s" type="button" aria-pressed={isSelected} key={person.id} onClick={() => onPersonChange(isSelected ? selectedPersonIds.filter((id) => id !== person.id) : [...selectedPersonIds, person.id])}>
              <span className={`shoot-filter-checkbox ${isSelected ? "checked" : ""}`}>{isSelected ? <DsIcon name="check" size={12} /> : null}</span>
              <span>{person.name}</span>
            </button>;
          })}
        </div> : null}
        {activeCount > 0 ? <button className="shoot-filter-clear label-s-semibold" type="button" onClick={onClear}>Clear filters</button> : null}
      </div> : null}
    </div>
  );
}

function PeopleFilters({ value, onChange }: { value: PersonFilter; onChange: (value: PersonFilter) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const options: PersonFilter[] = ["all", "talent", "crew", "client", "other"];

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!anchorRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <div className="shoot-schedule-filter-anchor" ref={anchorRef}>
      <button className={`shoot-button secondary label-s-semibold ${value !== "all" ? "is-active" : ""}`} type="button" aria-expanded={isOpen} aria-haspopup="dialog" onClick={() => setIsOpen((current) => !current)}>
        Filters{value !== "all" ? " · 1" : ""}
        <DsIcon name="caret-down" size={14} />
      </button>
      {isOpen ? <div className="shoot-schedule-filter-popover" role="dialog" aria-label="Filter people">
        <div className="shoot-schedule-filter-group" role="radiogroup" aria-label="Person type">
          <strong className="label-xs-semibold">Type</strong>
          {options.map((option) => <button className="shoot-filter-choice label-s" type="button" role="radio" aria-checked={value === option} key={option} onClick={() => { onChange(option); setIsOpen(false); }}>
            <span className={`shoot-filter-checkbox ${value === option ? "checked" : ""}`}>{value === option ? <DsIcon name="check" size={12} /> : null}</span>
            <span>{option === "all" ? "All" : personTypeLabels[option]}</span>
          </button>)}
        </div>
        {value !== "all" ? <button className="shoot-filter-clear label-s-semibold" type="button" onClick={() => { onChange("all"); setIsOpen(false); }}>Clear filter</button> : null}
      </div> : null}
    </div>
  );
}

function CallSheetSettings({ startTime, endTime, onStartTimeChange, onEndTimeChange }: {
  startTime: string;
  endTime: string;
  onStartTimeChange: (value: string) => void;
  onEndTimeChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!anchorRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return <div className="shoot-call-sheet-settings-anchor" ref={anchorRef}>
    <button className="shoot-icon-button" type="button" aria-label="Call sheet settings" aria-describedby="shoot-call-sheet-settings-tooltip" aria-expanded={isOpen} aria-haspopup="dialog" onClick={() => setIsOpen((current) => !current)}>
      <DsIcon name="clock-clockwise" size={18} />
    </button>
    <span className="shoot-page-menu-tooltip label-xs-semibold" id="shoot-call-sheet-settings-tooltip" role="tooltip">Settings</span>
    {isOpen ? <div className="shoot-call-sheet-settings-popover" role="dialog" aria-label="Call sheet settings">
      <div className="shoot-call-sheet-settings-section">
        <strong className="label-s-semibold">Time range</strong>
        <div className="shoot-timeline-range-fields">
          <Field label="Starts"><TimeSelect value={startTime} onChange={onStartTimeChange} /></Field>
          <Field label="Ends"><TimeSelect value={endTime} onChange={onEndTimeChange} /></Field>
        </div>
      </div>
    </div> : null}
  </div>;
}

type TimelinePlacement = {
  entry: ProductionEntry;
  column: number;
  columnCount: number;
};

type TimelineStyle = CSSProperties & {
  "--timeline-slot-count"?: number;
  "--timeline-slot-offset"?: number;
  "--timeline-slot-span"?: number;
};

function ScheduleTimeline({ day, entries, highlightedEntryId, locations, people, clashes, onEdit, onAddAtTime, onMove, onResize, onToggleCompletion }: {
  day: ShootDay;
  entries: ProductionEntry[];
  highlightedEntryId: string | null;
  locations: ShootLocation[];
  people: ShootPerson[];
  clashes: Map<string, ScheduleClash>;
  onEdit: (entry: ProductionEntry) => void;
  onAddAtTime: (startTime: string) => void;
  onMove: (entryId: string, startTime: string) => void;
  onResize: (entryId: string, durationMinutes: number) => void;
  onToggleCompletion: (entryId: string) => void;
}) {
  const [resizePreview, setResizePreview] = useState<{ entryId: string; durationMinutes: number } | null>(null);
  const [dragPreview, setDragPreview] = useState<{ entryId: string; startTime: string } | null>(null);
  const [dropPreviewTime, setDropPreviewTime] = useState<string | null>(null);
  const suppressClickRef = useRef(false);
  const timelineEntries = entries.map((entry) => ({
    ...entry,
    startTime: dragPreview?.entryId === entry.id ? dragPreview.startTime : entry.startTime,
    durationMinutes: resizePreview?.entryId === entry.id ? resizePreview.durationMinutes : entry.durationMinutes,
  }));
  const startMinute = Math.floor(timeToMinutes(day.timelineStartTime || day.generalCallTime || "08:00") / 15) * 15;
  const requestedEndMinute = Math.ceil(timeToMinutes(day.timelineEndTime || day.expectedWrapTime || "17:00") / 15) * 15;
  const endMinute = Math.max(startMinute + 30, requestedEndMinute);
  const slotCount = Math.max(4, Math.ceil((endMinute - startMinute) / 15));
  const timeMarks = Array.from({ length: Math.floor(slotCount / 4) + 1 }, (_, index) => startMinute + index * 60);
  const placements = layoutTimelineEntries(timelineEntries);

  const timeAtPointer = (clientY: number, canvas: HTMLElement) => {
    const slotHeight = canvas.getBoundingClientRect().height / slotCount;
    const slot = Math.max(0, Math.min(slotCount - 1, Math.floor((clientY - canvas.getBoundingClientRect().top) / slotHeight)));
    return minutesToTime(startMinute + slot * 15);
  };

  const beginMove = (event: ReactPointerEvent<HTMLElement>, entry: ProductionEntry) => {
    if ((event.target as HTMLElement).closest("button, input, label")) return;
    const canvas = event.currentTarget.closest<HTMLElement>(".shoot-timeline-canvas");
    if (!canvas) return;
    const originY = event.clientY;
    const originalStartMinute = timeToMinutes(entry.startTime);
    const slotHeight = canvas.getBoundingClientRect().height / slotCount;
    let nextStartTime = entry.startTime;
    let didMove = false;

    const handlePointerMove = (pointerEvent: PointerEvent) => {
      const slotDelta = Math.round((pointerEvent.clientY - originY) / slotHeight);
      const nextMinute = Math.max(startMinute, Math.min(startMinute + (slotCount - 1) * 15, originalStartMinute + slotDelta * 15));
      nextStartTime = minutesToTime(nextMinute);
      didMove = didMove || nextStartTime !== entry.startTime;
      if (didMove) {
        pointerEvent.preventDefault();
        setDragPreview({ entryId: entry.id, startTime: nextStartTime });
      }
    };
    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      setDragPreview(null);
      if (didMove && nextStartTime !== entry.startTime) {
        suppressClickRef.current = true;
        onMove(entry.id, nextStartTime);
        window.setTimeout(() => { suppressClickRef.current = false; }, 0);
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
  };

  const beginResize = (event: ReactPointerEvent<HTMLButtonElement>, entry: ProductionEntry) => {
    event.preventDefault();
    event.stopPropagation();
    const canvas = event.currentTarget.closest<HTMLElement>(".shoot-timeline-canvas");
    if (!canvas) return;
    const originY = event.clientY;
    const slotHeight = canvas.getBoundingClientRect().height / slotCount;
    let nextDuration = entry.durationMinutes;

    const handlePointerMove = (pointerEvent: PointerEvent) => {
      const slotDelta = Math.round((pointerEvent.clientY - originY) / slotHeight);
      nextDuration = Math.max(15, Math.min(240, entry.durationMinutes + slotDelta * 15));
      setResizePreview({ entryId: entry.id, durationMinutes: nextDuration });
    };
    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      setResizePreview(null);
      if (nextDuration !== entry.durationMinutes) onResize(entry.id, nextDuration);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  return (
    <div className="shoot-timeline" aria-label={`${day.label} schedule timeline`}>
      <p className="shoot-visually-hidden">Drag entries to change their start time. Resize an entry from its bottom edge to change its duration.</p>
      <div className="shoot-timeline-time-rail" style={{ "--timeline-slot-count": slotCount } as TimelineStyle} aria-hidden="true">
        {timeMarks.map((minute) => <span key={minute} style={{ "--timeline-slot-offset": (minute - startMinute) / 15 } as TimelineStyle}>{formatTime(minutesToTime(minute))}</span>)}
      </div>
      <div
        className="shoot-timeline-canvas"
        style={{ "--timeline-slot-count": slotCount } as TimelineStyle}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest(".shoot-timeline-block")) return;
          onAddAtTime(timeAtPointer(event.clientY, event.currentTarget));
        }}
        onDragOver={(event) => {
          if (!event.dataTransfer.types.includes("text/plain")) return;
          event.preventDefault();
          const nextTime = timeAtPointer(event.clientY, event.currentTarget);
          if (nextTime !== dropPreviewTime) setDropPreviewTime(nextTime);
        }}
        onDragLeave={(event) => {
          if (event.currentTarget.contains(event.relatedTarget as Node)) return;
          setDropPreviewTime(null);
        }}
        onDrop={(event) => {
          const entryId = event.dataTransfer.getData("text/plain");
          if (!entryId) return;
          event.preventDefault();
          const nextTime = timeAtPointer(event.clientY, event.currentTarget);
          setDropPreviewTime(null);
          onMove(entryId, nextTime);
        }}
      >
        {timeMarks.map((minute) => <span className="shoot-timeline-rule" key={minute} style={{ "--timeline-slot-offset": (minute - startMinute) / 15 } as TimelineStyle} />)}
        {dropPreviewTime ? <div className="shoot-timeline-drop-indicator" style={{ "--timeline-slot-offset": (timeToMinutes(dropPreviewTime) - startMinute) / 15 } as TimelineStyle} aria-hidden="true"><span className="label-xs-semibold">{formatTime(dropPreviewTime)}</span></div> : null}
        {placements.map(({ entry, column, columnCount }) => {
          const type = scheduleTypeOptions.find((option) => option.value === entry.type) ?? scheduleTypeOptions[0];
          const location = locations.find((item) => item.id === entry.locationId);
          const assignedPeople = people.filter((person) => entry.personIds.includes(person.id));
          const clash = clashes.get(entry.id);
          const isComplete = isEntryComplete(entry);
          const completionTooltip = entry.type === "shot" ? "Captured" : "Done";
          const completionTooltipId = `shoot-completion-${entry.id}`;
          const startOffset = (timeToMinutes(entry.startTime) - startMinute) / 15;
          const durationSlots = Math.max(1, entry.durationMinutes / 15);
          const columnWidth = 100 / columnCount;
          const blockStyle: TimelineStyle = {
            "--timeline-slot-offset": startOffset,
            "--timeline-slot-span": durationSlots,
            left: `calc(${column * columnWidth}% + var(--brisk-space-xs))`,
            width: `calc(${columnWidth}% - var(--brisk-space-s))`,
          };
          return <article
            className={`shoot-timeline-block is-${entry.type} ${entry.durationMinutes <= 45 ? "is-short" : ""} ${isComplete ? "is-complete" : ""} ${dragPreview?.entryId === entry.id ? "is-dragging" : ""} ${highlightedEntryId === entry.id ? "is-highlighted" : ""}`}
            data-shoot-entry-id={entry.id}
            role="button"
            tabIndex={0}
            style={blockStyle}
            aria-label={`Edit ${entry.description}, ${formatTime(entry.startTime)}, ${entry.durationMinutes} minutes`}
            key={entry.id}
            onClick={() => { if (!suppressClickRef.current) onEdit(entry); }}
            onPointerDown={(event) => beginMove(event, entry)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onEdit(entry); }
              if (event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
                event.preventDefault();
                onMove(entry.id, minutesToTime(timeToMinutes(entry.startTime) + (event.key === "ArrowUp" ? -15 : 15)));
              }
            }}
          >
            <div className="shoot-timeline-block-heading">
              <span className={`shoot-schedule-type is-${entry.type} label-xs-semibold`}><DsIcon name={type.icon} size={14} />{entry.type === "shot" && entry.shotNumber ? entry.shotNumber : type.label}</span>
              <label className="shoot-checkbox" title={completionTooltip} aria-describedby={completionTooltipId} onClick={(event) => event.stopPropagation()}>
                <input type="checkbox" checked={isComplete} aria-label={`Mark ${entry.description} as ${entry.type === "shot" ? "captured" : "completed"}`} onChange={() => onToggleCompletion(entry.id)} />
                <span aria-hidden="true"><DsIcon name="check" size={14} /></span>
                <small className="shoot-checkbox-tooltip label-xs-semibold" id={completionTooltipId} role="tooltip">{completionTooltip}</small>
              </label>
            </div>
            <strong className="shoot-timeline-block-title">{entry.description}</strong>
            <span className="shoot-timeline-block-time label-xs">{formatTime(entry.startTime)} - {formatTime(addMinutes(entry.startTime, entry.durationMinutes))}{clash ? <ClashIndicator clash={clash} /> : null}</span>
            <span className="shoot-timeline-block-meta label-xs">{[location?.name, assignedPeople.map((person) => person.name).join(", ")].filter(Boolean).join(" · ")}</span>
            <button
              className="shoot-timeline-resize-handle"
              type="button"
              aria-label={`Resize ${entry.description}`}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => {
                if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                  event.preventDefault();
                  event.stopPropagation();
                  onResize(entry.id, entry.durationMinutes + (event.key === "ArrowUp" ? -15 : 15));
                }
              }}
              onPointerDown={(event) => beginResize(event, entry)}
            />
          </article>;
        })}
      </div>
    </div>
  );
}

function layoutTimelineEntries(entries: ProductionEntry[]): TimelinePlacement[] {
  const sorted = [...entries].sort((left, right) => left.startTime.localeCompare(right.startTime));
  const placements: TimelinePlacement[] = [];
  let cluster: ProductionEntry[] = [];
  let clusterEnd = -1;

  const flushCluster = () => {
    if (!cluster.length) return;
    const columnEnds: number[] = [];
    const assigned = cluster.map((entry) => {
      const start = timeToMinutes(entry.startTime);
      const availableColumn = columnEnds.findIndex((end) => end <= start);
      const column = availableColumn >= 0 ? availableColumn : columnEnds.length;
      columnEnds[column] = start + entry.durationMinutes;
      return { entry, column };
    });
    assigned.forEach(({ entry, column }) => placements.push({ entry, column, columnCount: columnEnds.length }));
    cluster = [];
    clusterEnd = -1;
  };

  sorted.forEach((entry) => {
    const start = timeToMinutes(entry.startTime);
    const end = start + entry.durationMinutes;
    if (cluster.length && start >= clusterEnd) flushCluster();
    cluster.push(entry);
    clusterEnd = Math.max(clusterEnd, end);
  });
  flushCluster();
  return placements;
}

function UnscheduledShotsPanel({ entries, isOpen, isMobileDrawer = false, onClose, onOpen, onDragEnd, onDragStart, onEdit, onToggleCompletion }: {
  entries: ProductionEntry[];
  isOpen: boolean;
  isMobileDrawer?: boolean;
  onClose: () => void;
  onOpen: () => void;
  onDragEnd: () => void;
  onDragStart: (id: string) => void;
  onEdit: (entry: ProductionEntry) => void;
  onToggleCompletion: (id: string) => void;
}) {
  if (!isOpen) return <aside className="shoot-unscheduled-panel is-collapsed" aria-label="Unscheduled shots">
    <button type="button" aria-expanded="false" onClick={onOpen}><DsIcon name="caret-right" size={16} /><span className="label-s-semibold">Unscheduled</span><span className="shoot-group-count label-xs-semibold">{entries.length}</span></button>
  </aside>;

  return <aside className={`shoot-unscheduled-panel ${isMobileDrawer ? "is-mobile-drawer" : ""}`} aria-label="Unscheduled shots" onKeyDown={(event) => { if (event.key === "Escape") onClose(); }}>
    <header>
      <div className="shoot-entry-group-title"><h3>Unscheduled shots</h3><span className="shoot-group-count label-xs-semibold">{entries.length}</span></div>
      <button className="shoot-icon-button" type="button" aria-label="Collapse Unscheduled shots" onClick={onClose}><DsIcon name={isMobileDrawer ? "x-close-cross" : "caret-left"} size={16} /></button>
    </header>
    <p className="paragraph-s">Drag a shot onto the timeline to schedule it.</p>
    <div className="shoot-unscheduled-list" role="list">
      {entries.map((entry) => <article
          className="shoot-unscheduled-card"
          draggable
          role="button"
          tabIndex={0}
          aria-label={`Edit shot ${entry.shotNumber}, ${entry.description}`}
          key={entry.id}
          onClick={() => onEdit(entry)}
          onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onEdit(entry); } }}
          onDragStart={(event) => { onDragStart(entry.id); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", entry.id); }}
          onDragEnd={onDragEnd}
        >
          <span className="shoot-drag-handle" aria-hidden="true"><DsIcon name="dots-six-vertical" size={16} /></span>
          <span className="shoot-schedule-type is-shot label-xs-semibold">{entry.shotNumber}</span>
          <div><strong>{entry.description}</strong><span className="label-xs">Est. {entry.durationMinutes} min</span></div>
          <label className="shoot-checkbox" onClick={(event) => event.stopPropagation()}>
            <input type="checkbox" checked={isEntryComplete(entry)} aria-label={`Mark ${entry.description} as captured`} onChange={() => onToggleCompletion(entry.id)} />
            <span aria-hidden="true"><DsIcon name="check" size={14} /></span>
          </label>
        </article>)}
    </div>
  </aside>;
}

type ShotColumnWidths = Partial<Record<ShotFieldId, number>>;
type ShotGridStyle = CSSProperties & {
  "--shot-grid-columns": string;
  "--shot-grid-width": string;
  "--shot-sticky-image-left": string;
  "--shot-sticky-number-left": string;
  "--shot-sticky-description-left": string;
};

function DetailedShotList({ entries, locations, people, projectId, focusedDescriptionId, onAddShot, onCreateLocation, onDescriptionFocused, onEdit, onReorder, onToggleCaptured, onUpdate }: {
  entries: ProductionEntry[];
  locations: ShootLocation[];
  people: ShootPerson[];
  projectId: string;
  focusedDescriptionId: string | null;
  onAddShot: () => void;
  onCreateLocation: (entryId: string) => void;
  onDescriptionFocused: () => void;
  onEdit: (entry: ProductionEntry) => void;
  onReorder: (sourceId: string, targetId: string) => void;
  onToggleCaptured: (entryId: string) => void;
  onUpdate: (entryId: string, patch: Partial<ProductionEntry>) => void;
}) {
  const [orderedFields, setOrderedFields] = useState<ShotFieldId[]>([
    ...defaultShotFields,
    ...allShotFields.filter((field) => !defaultShotFields.includes(field.id)).map((field) => field.id),
  ]);
  const [hiddenFields, setHiddenFields] = useState<ShotFieldId[]>(allShotFields.filter((field) => field.optional).map((field) => field.id));
  const [isFieldsOpen, setIsFieldsOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [capturedFilter, setCapturedFilter] = useState<"" | "captured" | "remaining">("");
  const [sortBy, setSortBy] = useState<"shotNumber" | "manual" | "category" | "location" | "subject" | "captured">("shotNumber");
  const [draggedShotId, setDraggedShotId] = useState<string | null>(null);
  const [draggedFieldId, setDraggedFieldId] = useState<ShotFieldId | null>(null);
  const [columnWidths, setColumnWidths] = useState<ShotColumnWidths>({});
  const [columnWidthsLoaded, setColumnWidthsLoaded] = useState(false);
  const [isGridScrolled, setIsGridScrolled] = useState(false);
  const resizeStateRef = useRef<{ field: ShotFieldId; pointerId: number; startX: number; startWidth: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const visibleFields = orderedFields.filter((field) => !hiddenFields.includes(field));
  const hasStickyPrefix = ["captured", "image", "shotNumber", "description"].every((field, index) => visibleFields[index] === field);
  const getColumnWidth = (field: ShotFieldId) => columnWidths[field] ? `max(var(--shot-min-${field}), ${columnWidths[field]}px)` : `var(--shot-col-${field})`;
  const gridStyle = {
    "--shot-grid-columns": visibleFields.map(getColumnWidth).join(" "),
    "--shot-grid-width": `calc(${visibleFields.map(getColumnWidth).join(" + ")})`,
    "--shot-sticky-image-left": getColumnWidth("captured"),
    "--shot-sticky-number-left": `calc(${getColumnWidth("captured")} + ${getColumnWidth("image")})`,
    "--shot-sticky-description-left": `calc(${getColumnWidth("captured")} + ${getColumnWidth("image")} + ${getColumnWidth("shotNumber")})`,
  } as ShotGridStyle;
  const getSubjectLabel = (entry: ProductionEntry) => [
    ...entry.personIds.map((personId) => people.find((person) => person.id === personId)?.name).filter((name): name is string => Boolean(name)),
    entry.subject?.trim(),
  ].filter((value): value is string => Boolean(value)).join(", ");
  const subjectOptions = [
    ...people.filter((person) => entries.some((entry) => entry.personIds.includes(person.id))).map((person) => ({ value: `person:${person.id}`, label: person.name })),
    ...[...new Set(entries.map((entry) => entry.subject?.trim()).filter((value): value is string => Boolean(value)))].map((subject) => ({ value: `text:${subject}`, label: subject })),
  ].sort((left, right) => left.label.localeCompare(right.label));
  const activeFilterCount = [categoryFilter, locationFilter, subjectFilter, capturedFilter].filter(Boolean).length;
  const filteredEntries = entries.filter((entry) => {
    if (categoryFilter && entry.shotCategory !== categoryFilter) return false;
    if (locationFilter && entry.locationId !== locationFilter) return false;
    if (subjectFilter.startsWith("person:") && !entry.personIds.includes(subjectFilter.slice(7))) return false;
    if (subjectFilter.startsWith("text:") && entry.subject !== subjectFilter.slice(5)) return false;
    if (capturedFilter === "captured" && !entry.captured) return false;
    if (capturedFilter === "remaining" && entry.captured) return false;
    return true;
  }).sort((left, right) => {
    if (sortBy === "shotNumber") return (left.shotNumber ?? Number.MAX_SAFE_INTEGER) - (right.shotNumber ?? Number.MAX_SAFE_INTEGER);
    if (sortBy === "manual") return (left.shotListOrder ?? 0) - (right.shotListOrder ?? 0);
    if (sortBy === "captured") return Number(Boolean(left.captured)) - Number(Boolean(right.captured));
    if (sortBy === "location") return (locations.find((item) => item.id === left.locationId)?.name ?? "").localeCompare(locations.find((item) => item.id === right.locationId)?.name ?? "");
    return (sortBy === "category" ? left.shotCategory ?? "" : getSubjectLabel(left)).localeCompare(sortBy === "category" ? right.shotCategory ?? "" : getSubjectLabel(right));
  });

  useEffect(() => {
    try {
      const storedWidths = window.localStorage.getItem(`brisk:shot-list:${projectId}:column-widths`);
      if (storedWidths) {
        const parsed = JSON.parse(storedWidths) as unknown;
        if (parsed && typeof parsed === "object") {
          const validWidths: ShotColumnWidths = {};
          Object.entries(parsed).forEach(([field, width]) => {
            if (allShotFields.some((item) => item.id === field) && typeof width === "number" && Number.isFinite(width)) validWidths[field as ShotFieldId] = width;
          });
          setColumnWidths(validWidths);
        }
      }
    } catch {
      setColumnWidths({});
    } finally {
      setColumnWidthsLoaded(true);
    }
  }, [projectId]);

  useEffect(() => {
    if (!columnWidthsLoaded) return;
    try {
      window.localStorage.setItem(`brisk:shot-list:${projectId}:column-widths`, JSON.stringify(columnWidths));
    } catch {
      // The Shot List remains usable when browser storage is unavailable.
    }
  }, [columnWidths, columnWidthsLoaded, projectId]);

  const getMinimumColumnWidth = (field: ShotFieldId) => {
    const grid = gridRef.current;
    if (!grid) return 0;
    const measurer = document.createElement("span");
    measurer.style.display = "block";
    measurer.style.position = "absolute";
    measurer.style.visibility = "hidden";
    measurer.style.width = `var(--shot-min-${field})`;
    grid.appendChild(measurer);
    const width = measurer.getBoundingClientRect().width;
    measurer.remove();
    return width;
  };

  const beginColumnResize = (event: ReactPointerEvent<HTMLElement>, field: ShotFieldId) => {
    event.preventDefault();
    event.stopPropagation();
    const headerCell = event.currentTarget.parentElement;
    if (!headerCell) return;
    resizeStateRef.current = { field, pointerId: event.pointerId, startX: event.clientX, startWidth: headerCell.getBoundingClientRect().width };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const continueColumnResize = (event: ReactPointerEvent<HTMLElement>) => {
    const resizeState = resizeStateRef.current;
    if (!resizeState || resizeState.pointerId !== event.pointerId) return;
    const minimumWidth = getMinimumColumnWidth(resizeState.field);
    const width = Math.max(minimumWidth, Math.round(resizeState.startWidth + event.clientX - resizeState.startX));
    setColumnWidths((current) => ({ ...current, [resizeState.field]: width }));
  };

  const endColumnResize = (event: ReactPointerEvent<HTMLElement>) => {
    if (resizeStateRef.current?.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    resizeStateRef.current = null;
  };

  const autoFitColumn = (field: ShotFieldId) => {
    const cells = gridRef.current?.querySelectorAll<HTMLElement>(`[data-shot-field="${field}"]`);
    if (!cells?.length) return;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const minimumWidth = getMinimumColumnWidth(field);
    const preferredWidth = Math.max(...Array.from(cells).map((cell) => {
      const content = cell.querySelector<HTMLElement>("input, textarea, button, strong") ?? cell;
      const text = content instanceof HTMLInputElement || content instanceof HTMLTextAreaElement ? content.value || content.placeholder : content.textContent ?? "";
      if (!context) return cell.scrollWidth;
      context.font = getComputedStyle(content).font;
      return Math.ceil(context.measureText(text.trim()).width + (field === "image" ? 0 : 48));
    }));
    setColumnWidths((current) => ({ ...current, [field]: Math.max(minimumWidth, preferredWidth) }));
  };

  const reorderField = (sourceField: ShotFieldId, targetField: ShotFieldId) => {
    if (sourceField === targetField || ["captured", "image", "shotNumber"].includes(sourceField) || ["captured", "image", "shotNumber"].includes(targetField)) return;
    setOrderedFields((current) => {
      const sourceIndex = current.indexOf(sourceField);
      const targetIndex = current.indexOf(targetField);
      if (sourceIndex < 0 || targetIndex < 0) return current;
      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const resetFilters = () => {
    setCategoryFilter("");
    setLocationFilter("");
    setSubjectFilter("");
    setCapturedFilter("");
  };

  const fixedFields: ShotFieldId[] = ["captured", "image", "shotNumber"];
  const visibleFieldSettings = orderedFields.filter((field) => !hiddenFields.includes(field));
  const additionalFieldSettings = orderedFields.filter((field) => hiddenFields.includes(field));

  const renderFieldSetting = (field: ShotFieldId, isVisible: boolean) => {
    const meta = allShotFields.find((item) => item.id === field);
    const isFixed = fixedFields.includes(field);
    const canHide = !isFixed && field !== "description";
    return <div
      className={`shoot-field-setting ${isFixed ? "is-fixed" : ""}`}
      draggable={isVisible && !isFixed}
      key={field}
      onDragStart={(event) => { if (isFixed) return; setDraggedFieldId(field); event.dataTransfer.effectAllowed = "move"; }}
      onDragOver={(event) => { if (isVisible && !isFixed) event.preventDefault(); }}
      onDrop={(event) => { event.preventDefault(); if (draggedFieldId) reorderField(draggedFieldId, field); setDraggedFieldId(null); }}
      onDragEnd={() => setDraggedFieldId(null)}
    >
      <span className="shoot-field-drag" aria-hidden="true">{isVisible && !isFixed ? <DsIcon name="dots-six-vertical" size={15} /> : null}</span>
      <label className="label-s"><input type="checkbox" checked={isVisible} disabled={!canHide} onChange={() => setHiddenFields((current) => isVisible ? [...current, field] : current.filter((item) => item !== field))} />{meta?.label}</label>
    </div>;
  };

  return <div className="shoot-detailed-shot-list">
    <header className="shoot-section-header shoot-shot-list-primary-toolbar">
      <div className="shoot-section-title"><DsIcon name="video-camera-ds" size={20} /><h2>Shot list</h2></div>
      <div className="shoot-section-actions">
        <button className="shoot-button primary label-s-semibold" type="button" onClick={() => { resetFilters(); setSortBy("shotNumber"); onAddShot(); }}><DsIcon name="plus" size={16} />Add shot</button>
        <button
          className="shoot-button secondary shoot-shot-filter-toggle label-s-semibold"
          type="button"
          aria-expanded={isFiltersOpen}
          aria-controls="shoot-shot-list-filters"
          onClick={() => { setIsFieldsOpen(false); setIsFiltersOpen((current) => !current); }}
        >
          Filters{activeFilterCount ? ` · ${activeFilterCount}` : ""}<DsIcon name="caret-down" size={14} />
        </button>
      <div className="shoot-fields-control">
        <button className="shoot-button secondary label-s-semibold" type="button" aria-expanded={isFieldsOpen} onClick={() => { setIsFiltersOpen(false); setIsFieldsOpen((current) => !current); }}><DsIcon name="settings" size={16} />Fields</button>
        {isFieldsOpen ? <div className="shoot-fields-popover" role="dialog" aria-label="Shot List fields">
          <header><strong>Fields</strong><span className="label-xs">Show, hide or reorder columns.</span></header>
          <section><h3 className="label-xs-semibold">Visible fields</h3>{visibleFieldSettings.map((field) => renderFieldSetting(field, true))}</section>
          {additionalFieldSettings.length ? <section><h3 className="label-xs-semibold">Additional fields</h3>{additionalFieldSettings.map((field) => renderFieldSetting(field, false))}</section> : null}
          <button className="shoot-text-action label-s-semibold" type="button" onClick={() => { setOrderedFields([...defaultShotFields, ...allShotFields.filter((field) => !defaultShotFields.includes(field.id)).map((field) => field.id)]); setHiddenFields(allShotFields.filter((field) => field.optional).map((field) => field.id)); }}>Reset fields</button>
        </div> : null}
      </div>
      </div>
    </header>
    <div className="shoot-detailed-shot-list-body">
    {isFiltersOpen ? <div className="shoot-shot-list-controls" id="shoot-shot-list-filters">
      <div className="shoot-shot-list-filters">
        <label><span className="label-xs-semibold">Category</span><BriskSelect ariaLabel="Filter by category" options={shotCategoryOptions.map((option) => ({ value: option, label: option }))} placeholder="All" value={categoryFilter as ShotCategory | ""} onChange={(value) => setCategoryFilter(value)} /></label>
        <label><span className="label-xs-semibold">Location</span><BriskSelect ariaLabel="Filter by location" options={locations.map((location) => ({ value: location.id, label: location.name }))} placeholder="All" value={locationFilter} onChange={setLocationFilter} /></label>
        <label><span className="label-xs-semibold">Subject</span><BriskSelect ariaLabel="Filter by subject" options={subjectOptions} placeholder="All" value={subjectFilter} onChange={setSubjectFilter} /></label>
        <label><span className="label-xs-semibold">Status</span><BriskSelect ariaLabel="Filter by status" options={[{ value: "", label: "All" }, { value: "remaining", label: "Remaining" }, { value: "captured", label: "Captured" }]} placeholder="All" value={capturedFilter} onChange={(value) => setCapturedFilter(value as "" | "captured" | "remaining")} /></label>
        <label><span className="label-xs-semibold">Sort</span><BriskSelect clearable={false} ariaLabel="Sort shots" options={[{ value: "shotNumber", label: "Shot number" }, { value: "manual", label: "Manual order" }, { value: "category", label: "Category" }, { value: "location", label: "Location" }, { value: "subject", label: "Subject" }, { value: "captured", label: "Captured" }]} placeholder="Shot number" value={sortBy} onChange={(value) => { if (value) setSortBy(value as typeof sortBy); }} /></label>
      </div>
      {activeFilterCount ? <div className="shoot-shot-filter-summary"><span className="shoot-count label-xs-semibold">{activeFilterCount}</span><span className="label-xs">active {activeFilterCount === 1 ? "filter" : "filters"}</span><button className="shoot-text-action label-xs-semibold" type="button" onClick={resetFilters}>Clear filters</button></div> : null}
    </div> : null}

    {entries.length === 0 ? <ShotListEmptyState /> : filteredEntries.length === 0 ? <div className="shoot-filter-empty"><strong>No shots match these filters</strong><button className="shoot-text-action label-s-semibold" type="button" onClick={resetFilters}>Clear filters</button></div> : <>
      <div
        className={`shoot-shot-grid-wrap ${hasStickyPrefix ? "has-sticky-prefix" : ""} ${isGridScrolled ? "is-horizontally-scrolled" : ""}`}
        ref={gridRef}
        onScroll={(event) => setIsGridScrolled(event.currentTarget.scrollLeft > 1)}
      >
        <div className="shoot-shot-grid-header" style={gridStyle} role="row">{visibleFields.map((field) => <div className={`shoot-shot-cell is-${field} label-xs-semibold`} data-shot-field={field} role="columnheader" key={field}>
          <span>{allShotFields.find((item) => item.id === field)?.label}</span>
          <span
            className="shoot-column-resize-handle"
            role="separator"
            tabIndex={0}
            aria-label={`Resize ${allShotFields.find((item) => item.id === field)?.label} column`}
            aria-orientation="vertical"
            onDoubleClick={() => autoFitColumn(field)}
            onPointerDown={(event) => beginColumnResize(event, field)}
            onPointerMove={continueColumnResize}
            onPointerUp={endColumnResize}
            onPointerCancel={endColumnResize}
            onKeyDown={(event) => {
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
              event.preventDefault();
              const cell = event.currentTarget.parentElement;
              if (!cell) return;
              const minimumWidth = getMinimumColumnWidth(field);
              const direction = event.key === "ArrowRight" ? 1 : -1;
              setColumnWidths((current) => ({ ...current, [field]: Math.max(minimumWidth, Math.round(cell.getBoundingClientRect().width + (direction * 16))) }));
            }}
          />
        </div>)}</div>
        <div className="shoot-shot-grid-body">
          {filteredEntries.map((entry) => <div className={`shoot-shot-grid-row ${entry.captured ? "is-captured" : ""}`} style={gridStyle} role="row" key={entry.id}
            onClick={(event) => { if (!(event.target as HTMLElement).closest("input, button, textarea, a, label, details, summary")) onEdit(entry); }}
            onDragOver={(event) => { if (sortBy === "manual") event.preventDefault(); }}
            onDrop={(event) => { event.preventDefault(); if (draggedShotId) onReorder(draggedShotId, entry.id); setDraggedShotId(null); }}
            >
            {visibleFields.map((field) => <ShotGridCell entry={entry} field={field} locations={locations} projectId={projectId} autoFocusDescription={focusedDescriptionId === entry.id} showDragHandle={sortBy === "manual"} onCreateLocation={() => onCreateLocation(entry.id)} onDescriptionFocused={onDescriptionFocused} onDragEnd={() => setDraggedShotId(null)} onDragStart={(event) => { setDraggedShotId(entry.id); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", entry.id); }} onEdit={() => onEdit(entry)} onToggleCaptured={() => onToggleCaptured(entry.id)} onUpdate={(patch) => onUpdate(entry.id, patch)} key={field} />)}
          </div>)}
        </div>
      </div>
      <div className="shoot-shot-card-list">
        {filteredEntries.map((entry) => <article className={entry.captured ? "is-captured" : ""} role="button" tabIndex={0} key={entry.id} onClick={() => onEdit(entry)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onEdit(entry); }}>
          <ShotReferenceImagePicker entry={entry} projectId={projectId} compact onChange={(patch) => onUpdate(entry.id, patch)} />
          <div className="shoot-shot-card-heading"><span className="shoot-schedule-type is-shot label-xs-semibold">{entry.shotNumber}</span><label className="shoot-checkbox" onClick={(event) => event.stopPropagation()}><input type="checkbox" checked={Boolean(entry.captured)} aria-label={`Mark ${entry.description} as captured`} onChange={() => onToggleCaptured(entry.id)} /><span aria-hidden="true"><DsIcon name="check" size={14} /></span></label></div>
          <strong>{entry.description}</strong>
          <p className="label-xs">{[entry.shotCategory, entry.shotSize, entry.durationMinutes ? `${entry.durationMinutes} min` : null].filter(Boolean).join(" · ")}</p>
        </article>)}
      </div>
    </>}
    <datalist id="shoot-lens-options">{lensOptions.map((option) => <option value={option} key={option} />)}</datalist>
    </div>
  </div>;
}

function ShotGridCell({ entry, field, locations, projectId, autoFocusDescription, showDragHandle, onCreateLocation, onDescriptionFocused, onDragEnd, onDragStart, onEdit, onToggleCaptured, onUpdate }: {
  entry: ProductionEntry; field: ShotFieldId; locations: ShootLocation[]; projectId: string; autoFocusDescription: boolean; showDragHandle: boolean; onCreateLocation: () => void; onDescriptionFocused: () => void; onDragEnd: () => void; onDragStart: (event: DragEvent<HTMLElement>) => void; onEdit: () => void; onToggleCaptured: () => void; onUpdate: (patch: Partial<ProductionEntry>) => void;
}) {
  const className = `shoot-shot-cell is-${field}`;
  const cellProps = { className, "data-shot-field": field, role: "cell" as const };
  if (field === "captured") return <div {...cellProps}><label className="shoot-checkbox"><input type="checkbox" checked={Boolean(entry.captured)} aria-label={`Mark ${entry.description} as captured`} onChange={onToggleCaptured} /><span aria-hidden="true"><DsIcon name="check" size={14} /></span></label></div>;
  if (field === "image") return <div {...cellProps}><ShotReferenceImagePicker entry={entry} projectId={projectId} onChange={onUpdate} /></div>;
  if (field === "shotNumber") return <div {...cellProps}>{showDragHandle ? <span className="shoot-shot-drag" draggable aria-label="Drag to reorder shot" onDragEnd={onDragEnd} onDragStart={onDragStart}><DsIcon name="dots-six-vertical" size={15} /></span> : null}<strong>{entry.shotNumber}</strong></div>;
  if (field === "description") return <div {...cellProps}><input autoFocus={autoFocusDescription} required aria-label="Description" placeholder="Describe what needs to be captured…" value={entry.description} onFocus={onDescriptionFocused} onChange={(event) => onUpdate({ description: event.target.value })} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") event.currentTarget.blur(); }} /></div>;
  if (field === "subject") return <div {...cellProps}><input aria-label="Subject" placeholder="Person, product, place or activity" value={entry.subject ?? ""} onChange={(event) => onUpdate({ subject: event.target.value })} /></div>;
  if (field === "location") return <div {...cellProps}><BriskSelect ariaLabel="Location" options={[...locations.map((location) => ({ value: location.id, label: location.name })), { value: "create-new", label: "Create new location" }]} placeholder="No location" value={entry.locationId ?? ""} onChange={(value) => value === "create-new" ? onCreateLocation() : onUpdate({ locationId: value || undefined })} /></div>;
  if (field === "category") return <div {...cellProps}><BriskSelect ariaLabel="Shot category" options={shotCategoryOptions.map((option) => ({ value: option, label: option }))} placeholder="Category" value={entry.shotCategory ?? ""} onChange={(value) => onUpdate({ shotCategory: value || undefined })} /></div>;
  if (field === "size") return <div {...cellProps}><BriskSelect ariaLabel="Shot size" options={shotSizeOptions.map((option) => ({ value: option, label: option }))} placeholder="Shot size" value={entry.shotSize ?? ""} onChange={(value) => onUpdate({ shotSize: value || undefined })} /></div>;
  if (field === "movement") return <div {...cellProps}><BriskSelect ariaLabel="Camera movement" options={cameraMovementOptions.map((option) => ({ value: option, label: option }))} placeholder="Movement" value={entry.cameraMovement ?? ""} onChange={(value) => onUpdate({ cameraMovement: value || undefined })} /></div>;
  if (field === "estimatedTime") return <div {...cellProps}><FilmingTimeInput value={entry.durationMinutes} onChange={(durationMinutes) => onUpdate({ durationMinutes })} /></div>;
  if (field === "notes") return <div {...cellProps}><input aria-label="Notes" placeholder="Creative or practical notes" value={entry.notes ?? ""} onChange={(event) => onUpdate({ notes: event.target.value })} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") event.currentTarget.blur(); }} /></div>;
  if (field === "cameraAngle") return <div {...cellProps}><BriskSelect ariaLabel="Camera angle" options={cameraAngleOptions.map((option) => ({ value: option, label: option }))} placeholder="Camera angle" value={entry.cameraAngle ?? ""} onChange={(value) => onUpdate({ cameraAngle: value || undefined })} /></div>;
  if (field === "lens") return <div {...cellProps}><input aria-label="Lens" list="shoot-lens-options" placeholder="Lens or focal length" value={entry.lens ?? ""} onChange={(event) => onUpdate({ lens: event.target.value })} /></div>;
  if (field === "camera") return <div {...cellProps}><input aria-label="Camera" placeholder="Camera" value={entry.camera ?? ""} onChange={(event) => onUpdate({ camera: event.target.value })} /></div>;
  if (field === "interiorExterior") return <div {...cellProps}><BriskSelect ariaLabel="Interior or exterior" options={interiorExteriorOptions.map((option) => ({ value: option, label: option }))} placeholder="Interior / Exterior" value={entry.interiorExterior ?? ""} onChange={(value) => onUpdate({ interiorExterior: value || undefined })} /></div>;
  if (field === "gear") return <div {...cellProps}><details className="shoot-gear-picker"><summary>{entry.gear?.length ? `${entry.gear.length} selected` : "Choose gear"}</summary><div>{gearOptions.map((option) => <label className="label-xs" key={option}><input type="checkbox" checked={entry.gear?.includes(option) ?? false} onChange={(event) => onUpdate({ gear: event.target.checked ? [...(entry.gear ?? []), option] : (entry.gear ?? []).filter((item) => item !== option) })} />{option}</label>)}</div></details></div>;
  return <div {...cellProps}><button type="button" onClick={onEdit}>Edit</button></div>;
}

function FilmingTimeInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return <DurationInput value={value} onChange={onChange} />;
}

function ShotReferenceImagePicker({ entry, projectId, compact = false, onChange }: { entry: ProductionEntry | EntryDraft; projectId: string; compact?: boolean; onChange: (patch: Partial<ProductionEntry>) => void }) {
  const [isSourceOpen, setIsSourceOpen] = useState(false);
  const [librarySource, setLibrarySource] = useState<"stock" | "project-media" | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const chooseSource = (source: ShotImageSource) => {
    setIsSourceOpen(false);
    if (source === "upload") {
      fileInputRef.current?.click();
      return;
    }
    if (source === "link") {
      setLinkValue(entry.imageReferenceSource === "link" ? entry.imageReferenceUrl ?? "" : "");
      setIsLinkOpen(true);
      return;
    }
    setLibrarySource(source);
  };
  const clearImage = () => onChange({ imageReferenceUrl: undefined, imageReferenceId: undefined, imageReferenceSource: undefined });

  return <div className={`shoot-shot-image-picker ${compact ? "is-compact" : ""}`} onClick={(event) => event.stopPropagation()}>
    {entry.imageReferenceUrl ? <div className="shoot-shot-image-filled">
      <button type="button" aria-label={`Preview image for ${entry.description}`} onClick={() => setIsPreviewOpen(true)}><img src={entry.imageReferenceUrl} alt="" /></button>
      {!compact ? <div className="shoot-shot-image-actions">
        <button className="shoot-shot-image-action" type="button" aria-label={`Preview image for ${entry.description}`} title="Preview" onClick={() => setIsPreviewOpen(true)}><DsIcon name="eye" size={14} /></button>
        <ScriptMediaPicker isOpen={isSourceOpen} options={shotMediaOptions} triggerLabel={`Replace image for ${entry.description}`} triggerClassName="shoot-shot-image-action" triggerIcon="arrows-clockwise" onOpenChange={setIsSourceOpen} onSelect={chooseSource} />
        <button className="shoot-shot-image-action" type="button" aria-label={`Remove image from ${entry.description}`} title="Remove" onClick={clearImage}><DsIcon name="trash" size={14} /></button>
      </div> : null}
    </div> : <ScriptMediaPicker isOpen={isSourceOpen} options={shotMediaOptions} triggerLabel={`Add image to ${entry.description}`} triggerClassName="shoot-shot-image-empty" triggerIcon={compact ? "image-square" : "plus"} triggerText={compact ? "Add image" : undefined} onOpenChange={setIsSourceOpen} onSelect={chooseSource} />}
    <input className="shoot-visually-hidden" ref={fileInputRef} type="file" accept="image/*" tabIndex={-1} onChange={(event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.addEventListener("load", () => { if (typeof reader.result === "string") onChange({ imageReferenceUrl: reader.result, imageReferenceId: `upload-${file.name}`, imageReferenceSource: "upload" }); });
      reader.readAsDataURL(file);
      event.target.value = "";
    }} />
    {librarySource ? <ShotMediaLibraryModal source={librarySource} projectId={projectId} onClose={() => setLibrarySource(null)} onSelect={(asset) => { onChange({ imageReferenceUrl: asset.thumbnailUrl, imageReferenceId: asset.id, imageReferenceSource: librarySource }); setLibrarySource(null); }} /> : null}
    {isLinkOpen ? <ModalShell compact title="Add image link" onClose={() => setIsLinkOpen(false)} footer={<div className="shoot-modal-actions align-right"><Button size="S" variant="secondary" onClick={() => setIsLinkOpen(false)}>Cancel</Button><button className="shoot-button primary label-s-semibold" type="button" disabled={!linkValue.trim()} onClick={() => { onChange({ imageReferenceUrl: linkValue.trim(), imageReferenceId: `link-${Date.now()}`, imageReferenceSource: "link" }); setIsLinkOpen(false); }}>Add image</button></div>}><Field label="Image URL"><input autoFocus type="url" placeholder="https://" value={linkValue} onChange={(event) => setLinkValue(event.target.value)} /></Field></ModalShell> : null}
    {isPreviewOpen && entry.imageReferenceUrl ? <ModalShell title={`Image for shot ${entry.shotNumber}`} onClose={() => setIsPreviewOpen(false)} footer={<><button className="shoot-text-action danger label-s-semibold" type="button" onClick={() => { clearImage(); setIsPreviewOpen(false); }}>Remove</button><div className="shoot-modal-actions"><Button size="S" variant="secondary" onClick={() => { setIsPreviewOpen(false); setIsSourceOpen(true); }}>Replace</Button><Button size="S" variant="primary" onClick={() => setIsPreviewOpen(false)}>Done</Button></div></>}><div className="shoot-shot-image-preview"><img src={entry.imageReferenceUrl} alt={`Reference for ${entry.description}`} /></div></ModalShell> : null}
  </div>;
}

function ShotMediaLibraryModal({ source, projectId, onClose, onSelect }: { source: "stock" | "project-media"; projectId: string; onClose: () => void; onSelect: (asset: MediaAsset) => void }) {
  const projectAssets = mediaAssets.filter((asset) => asset.thumbnailUrl && (asset.projectId === projectId || !mediaAssets.some((item) => item.projectId === projectId && item.thumbnailUrl)));
  const stockAssets = mediaAssets.filter((asset) => asset.thumbnailUrl).slice(0, 8);
  const assets = source === "stock" ? stockAssets : projectAssets;
  return <ModalShell title={source === "stock" ? "Choose stock" : "Choose from Project Media"} onClose={onClose} footer={<div className="shoot-modal-actions align-right"><Button size="S" variant="secondary" onClick={onClose}>Cancel</Button></div>}>
    {assets.length ? <div className="shoot-shot-media-library">{assets.map((asset) => <button type="button" key={asset.id} onClick={() => onSelect(asset)}><img src={asset.thumbnailUrl} alt="" /><span><strong className="label-s-semibold">{asset.name}</strong><small className="label-xs">{source === "stock" ? "Stock library" : "Referenced from Project Media"}</small></span></button>)}</div> : <p className="paragraph-s">No image references are available from this source yet.</p>}
  </ModalShell>;
}

function EntryGroup({ title, description, hideHeader = false, tone = "default", entries, highlightedEntryId = null, locations, people, clashes, emptyTitle, emptyBody, inlineAdd, draggedEntryId, onAdd, onDragStart, onDropEntry, onDropGroup, onEdit, onToggleCompletion }: {
  title: string;
  description: string;
  hideHeader?: boolean;
  tone?: "default" | "unscheduled";
  entries: ProductionEntry[];
  highlightedEntryId?: string | null;
  locations: ShootLocation[];
  people: ShootPerson[];
  clashes: Map<string, ScheduleClash>;
  emptyTitle: string;
  emptyBody: string;
  inlineAdd?: ReactNode;
  draggedEntryId: string | null;
  onAdd?: () => void;
  onDragStart: (id: string) => void;
  onDropEntry: (id: string) => void;
  onDropGroup: () => void;
  onEdit: (entry: ProductionEntry) => void;
  onToggleCompletion: (id: string) => void;
}) {
  const tooltipId = `shoot-entry-help-${title.toLowerCase().replaceAll(" ", "-")}`;
  return (
    <section
      className={`shoot-entry-group ${hideHeader ? "is-run-of-day" : ""} ${tone === "unscheduled" ? "is-unscheduled" : ""} ${draggedEntryId ? "is-dragging" : ""}`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => { event.preventDefault(); onDropGroup(); }}
    >
      {!hideHeader ? <header className="shoot-entry-group-header">
        <div className="shoot-entry-group-title">
          <h3>{title}</h3>
          {description ? <span className="shoot-entry-help">
            <button type="button" aria-label={`About ${title}`} aria-describedby={tooltipId}><DsIcon name="info" size={16} /></button>
            <span className="label-xs" id={tooltipId} role="tooltip">{description}</span>
          </span> : null}
        </div>
        {onAdd ? <button className="shoot-text-action label-s-semibold" type="button" onClick={onAdd}><DsIcon name="plus" size={16} />Add shot</button> : null}
      </header> : null}
      {entries.length || inlineAdd ? (
        <div className="shoot-schedule-list" role="list" aria-label={title}>
          {entries.map((entry) => (
            <ProductionEntryRow
              entry={entry}
              location={locations.find((location) => location.id === entry.locationId)}
              people={people.filter((person) => entry.personIds.includes(person.id))}
              clash={clashes.get(entry.id)}
              highlighted={highlightedEntryId === entry.id}
              key={entry.id}
              onDragStart={(event) => { onDragStart(entry.id); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", entry.id); }}
              onDrop={(event) => { event.preventDefault(); event.stopPropagation(); onDropEntry(entry.id); }}
              onEdit={() => onEdit(entry)}
              onToggleCompletion={() => onToggleCompletion(entry.id)}
            />
          ))}
          {inlineAdd}
        </div>
      ) : (
        <div className="shoot-entry-empty"><strong>{emptyTitle}</strong>{emptyBody ? <p className="paragraph-s">{emptyBody}</p> : null}</div>
      )}
    </section>
  );
}

function ProductionEntryRow({ entry, location, people, clash, highlighted = false, onDragStart, onDrop, onEdit, onToggleCompletion }: {
  entry: ProductionEntry;
  location?: ShootLocation;
  people: ShootPerson[];
  clash?: ScheduleClash;
  highlighted?: boolean;
  onDragStart: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
  onEdit: () => void;
  onToggleCompletion: () => void;
}) {
  const type = scheduleTypeOptions.find((option) => option.value === entry.type) ?? scheduleTypeOptions[0];
  const isComplete = isEntryComplete(entry);
  const completionLabel = entry.type === "shot" ? "captured" : "completed";
  return (
    <article
      className={`shoot-schedule-row is-${entry.type} ${entry.startTime ? "" : "is-untimed"} ${isComplete ? "is-complete" : ""} ${highlighted ? "is-highlighted" : ""}`}
      draggable
      data-shoot-entry-id={entry.id}
      role="button"
      tabIndex={0}
      aria-label={`Edit ${entry.description}`}
      onClick={onEdit}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onEdit();
        }
      }}
      onDragStart={onDragStart}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
    >
      <span className="shoot-drag-handle" aria-label="Drag to reorder"><DsIcon name="dots-six-vertical" size={16} /></span>
      <label className="shoot-checkbox" title={entry.type === "shot" ? "Captured" : "Done"} onClick={(event) => event.stopPropagation()}>
        <input type="checkbox" checked={isComplete} aria-label={`Mark ${entry.description} as ${completionLabel}`} onChange={onToggleCompletion} />
        <span aria-hidden="true"><DsIcon name="check" size={14} /></span>
      </label>
      {entry.startTime ? <div className="shoot-schedule-time">
        <div className="shoot-schedule-time-value">
          <strong>{formatTime(entry.startTime)}</strong>
          {clash ? <ClashIndicator clash={clash} /> : null}
        </div>
        {entry.durationMinutes ? <span className="label-xs">{entry.durationMinutes} min</span> : null}
      </div> : null}
      <div className="shoot-schedule-state">
        <span className={`shoot-schedule-type is-${entry.type} label-xs-semibold`}><DsIcon name={type.icon} size={16} />{entry.type === "shot" && entry.shotNumber ? entry.shotNumber : type.label}</span>
      </div>
      <div className="shoot-schedule-copy">
        <div className="shoot-schedule-title-line">
          <strong>{entry.description}</strong>
          {!entry.startTime && entry.durationMinutes ? <span className="shoot-unscheduled-duration label-xs">Est. {entry.durationMinutes} min</span> : null}
        </div>
        <span className="label-xs">{[location?.name, people.map((person) => person.name).join(", ")].filter(Boolean).join(" · ")}</span>
      </div>
    </article>
  );
}

function ClashIndicator({ clash }: { clash: ScheduleClash }) {
  const detail = getClashDetail(clash);
  return <span className={`shoot-clash-indicator ${clash.sharedLocation || clash.sharedPeople ? "is-strong" : ""}`} tabIndex={0} aria-label={detail}>
    <DsIcon name="alert-triangle" size={14} />
    <span className="label-xs" role="tooltip">{detail}</span>
  </span>;
}

function QuickEntryRow({ draft, shotOnly, locations, people, onCancel, onChange, onCreatePerson, onSelectPerson, onSave }: {
  draft: EntryDraft;
  shotOnly: boolean;
  locations: ShootLocation[];
  people: ShootPerson[];
  onCancel: () => void;
  onChange: (draft: EntryDraft) => void;
  onCreatePerson?: (name: string) => void;
  onSelectPerson?: (person: ShootPerson) => void;
  onSave: (draft: EntryDraft) => void;
}) {
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const timeMode: EntryTimeMode = draft.type === "shot" ? draft.timeMode ?? (draft.startTime ? "set" : "unscheduled") : "set";
  const isUnscheduled = draft.type === "shot" && timeMode === "unscheduled";
  const requiresStartTime = !isUnscheduled && !draft.startTime;

  const selectType = (type: ScheduleType) => {
    onChange({
      ...draft,
      type,
      timeMode: type === "shot" ? timeMode : "set",
    });
  };

  return (
    <form
      className="shoot-quick-entry is-scheduled"
      aria-label="Add shot"
      onSubmit={(event) => { event.preventDefault(); onSave(draft); }}
      onKeyDown={(event) => { if (event.key === "Escape") onCancel(); }}
    >
      <div className={`shoot-quick-entry-main ${isUnscheduled ? "is-unscheduled" : ""}`}>
        {!isUnscheduled ? <div className="shoot-quick-time-column">
          <label className="shoot-quick-field is-time">
            <span className="label-xs-semibold">Time</span>
            <TimeSelect required value={draft.startTime} onChange={(value) => onChange({ ...draft, startTime: value, timeMode: "set" })} />
          </label>
        </div> : null}
        <label className="shoot-quick-field is-description">
          <span className="label-xs-semibold">Description</span>
          <input autoFocus required placeholder={entryPlaceholder(draft.type)} value={draft.description} onChange={(event) => onChange({ ...draft, description: event.target.value })} />
        </label>
        <label className="shoot-quick-field is-duration">
          <span className="label-xs-semibold">Duration <small>(optional)</small></span>
          <DurationInput value={draft.durationMinutes} onChange={(durationMinutes) => onChange({ ...draft, durationMinutes })} />
        </label>
      </div>

      {!shotOnly ? <fieldset className="shoot-type-options">
        <legend className="label-xs-semibold">Type</legend>
        <div>
          {scheduleTypeOptions.map((option) => (
            <button className={`shoot-type-option is-${option.value} label-xs-semibold ${draft.type === option.value ? "active" : ""}`} type="button" aria-pressed={draft.type === option.value} key={option.value} onClick={() => selectType(option.value)}>
              <DsIcon name={option.icon} size={15} />{option.label}
            </button>
          ))}
        </div>
      </fieldset> : null}

      {showMoreOptions ? (
        <div className="shoot-quick-more-options">
          <Field label="Location"><select value={draft.locationId ?? ""} onChange={(event) => onChange({ ...draft, locationId: event.target.value || undefined })}><option value="">No location</option>{locations.map((location) => <option value={location.id} key={location.id}>{location.name}</option>)}</select></Field>
          <PeoplePicker people={people} selectedIds={draft.personIds} onChange={(personIds) => onChange({ ...draft, personIds })} onCreatePerson={onCreatePerson} onSelectPerson={onSelectPerson} />
        </div>
      ) : null}

      <footer className="shoot-quick-entry-actions">
        <button className="shoot-text-action label-xs-semibold" type="button" aria-expanded={showMoreOptions} onClick={() => setShowMoreOptions((current) => !current)}>{showMoreOptions ? "Fewer options" : "More options"}<DsIcon name="caret-down" size={14} /></button>
        <div><button className="shoot-text-action label-s-semibold" type="button" onClick={onCancel}>Cancel</button><button className="shoot-button primary label-s-semibold" type="submit" disabled={!draft.description.trim() || requiresStartTime}><span className="shoot-add-label-desktop">{draft.type === "shot" ? "Add shot" : "Add to schedule"}</span><span className="shoot-add-label-mobile">Add</span></button></div>
      </footer>
    </form>
  );
}

function PeoplePicker({ people, selectedIds, onChange, onCreatePerson, onSelectPerson }: { people: ShootPerson[]; selectedIds: string[]; onChange: (ids: string[]) => void; onCreatePerson?: (name: string) => void; onSelectPerson?: (person: ShootPerson) => void }) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const results = people.filter((person) => !selectedIds.includes(person.id) && `${person.name} ${person.role}`.toLowerCase().includes(search.trim().toLowerCase()));
  const selectedPeople = selectedIds.map((id) => people.find((person) => person.id === id)).filter((person): person is ShootPerson => Boolean(person));

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [isOpen]);

  const selectPerson = (person: ShootPerson) => {
    if (onSelectPerson) onSelectPerson(person);
    else onChange([...selectedIds, person.id]);
    setSearch("");
  };

  return (
    <div className="shoot-people-picker">
      <span className="label-xs-semibold">People (optional)</span>
      {selectedPeople.length ? <div className="shoot-people-chips">{selectedPeople.map((person) => <button className="shoot-person-chip label-xs-semibold" type="button" aria-label={`Remove ${person.name}`} key={person.id} onClick={() => onChange(selectedIds.filter((id) => id !== person.id))}>{person.name}<DsIcon name="x-close-cross" size={12} /></button>)}</div> : null}
      <div className="shoot-people-search" ref={pickerRef}>
        <input aria-label="Add people" aria-autocomplete="list" aria-controls={listboxId} aria-expanded={isOpen} role="combobox" placeholder="Add people…" value={search} onFocus={() => setIsOpen(true)} onChange={(event) => { setSearch(event.target.value); setIsOpen(true); }} onKeyDown={(event) => { if (event.key === "Escape") setIsOpen(false); if (event.key === "Enter") { event.preventDefault(); if (results[0]) selectPerson(results[0]); } }} />
        {isOpen ? <div className="shoot-people-results" id={listboxId} role="listbox" aria-label="Matching people">{results.length ? results.slice(0, 8).map((person) => <button className="label-s" type="button" role="option" aria-selected="false" key={person.id} onMouseDown={(event) => event.preventDefault()} onClick={() => selectPerson(person)}><span className="shoot-people-option-avatar label-xs-semibold" aria-hidden="true">{getInitials(person.name)}</span><span><strong>{person.name}</strong><small className="label-xs">{person.role}</small></span></button>) : <div className="shoot-people-no-results"><span className="label-xs">{search.trim() ? "No matching people" : "No people available"}</span>{onCreatePerson && search.trim() ? <button className="shoot-text-action label-s-semibold" type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { onCreatePerson(search.trim()); setSearch(""); setIsOpen(false); }}><DsIcon name="plus" size={16} />Create new person</button> : null}</div>}</div> : null}
      </div>
    </div>
  );
}

function DayEditorPopover({ draft, mode, error, locations, onCreateLocation, onCancel, onChange, onSave }: {
  draft: ShootDay;
  mode: DayDraftMode;
  error: string;
  locations: ShootLocation[];
  onCreateLocation: (name: string, address: string) => void;
  onCancel: () => void;
  onChange: (draft: ShootDay) => void;
  onSave: () => void;
}) {
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [newLocation, setNewLocation] = useState({ name: "", address: "" });
  const title = mode === "add" ? "Add shoot day" : `Edit ${draft.label}`;
  return (
    <div className="shoot-day-edit-popover" role="dialog" aria-label={title}>
      <header><strong>{title}</strong><button className="shoot-icon-button" type="button" aria-label={`Close ${title}`} onClick={onCancel}><DsIcon name="x-close-cross" size={14} /></button></header>
      <div className="shoot-day-edit-fields">
        <Field label="Date"><input type="date" value={draft.date} onChange={(event) => onChange({ ...draft, date: event.target.value })} /></Field>
        <Field label="General call"><TimeSelect value={draft.generalCallTime} onChange={(value) => onChange({ ...draft, generalCallTime: value })} /></Field>
        <Field label="Expected wrap"><TimeSelect value={draft.expectedWrapTime} onChange={(value) => onChange({ ...draft, expectedWrapTime: value })} /></Field>
        <Field label="Primary location"><select value={draft.primaryLocationId} onChange={(event) => event.target.value === "__add__" ? setIsAddingLocation(true) : onChange({ ...draft, primaryLocationId: event.target.value })}><option value="">Choose location</option>{locations.map((location) => <option value={location.id} key={location.id}>{location.name}</option>)}<option value="__add__">+ Add new location</option></select></Field>
        {isAddingLocation ? <div className="shoot-day-inline-location"><Field label="Location name"><input autoFocus placeholder="e.g. Precinct Studio 2" value={newLocation.name} onChange={(event) => setNewLocation((current) => ({ ...current, name: event.target.value }))} /></Field><Field label="Address"><input placeholder="Street, suburb, state and postcode" value={newLocation.address} onChange={(event) => setNewLocation((current) => ({ ...current, address: event.target.value }))} /></Field><div><button className="shoot-text-action label-s-semibold" type="button" onClick={() => { setIsAddingLocation(false); setNewLocation({ name: "", address: "" }); }}>Cancel</button><button className="shoot-button secondary label-s-semibold" type="button" disabled={!newLocation.name.trim() || !newLocation.address.trim()} onClick={() => { onCreateLocation(newLocation.name, newLocation.address); setIsAddingLocation(false); setNewLocation({ name: "", address: "" }); }}>Add location</button></div></div> : null}
      </div>
      {error ? <p className="shoot-day-draft-error label-xs-semibold" role="alert">{error}</p> : null}
      <footer><button className="shoot-button secondary label-s-semibold" type="button" onClick={onCancel}>Cancel</button><button className="shoot-button primary label-s-semibold" type="button" onClick={onSave}>{mode === "add" ? "Add day" : "Done"}</button></footer>
    </div>
  );
}

function PracticalField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="shoot-practical-field"><span className="label-s-semibold">{label}</span><textarea rows={3} placeholder={`Add ${label.toLowerCase()} details`} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function SafetyEmergencySection({ info, primaryLocation, onAddPrimaryLocation, onChange }: {
  info?: SafetyEmergencyInfo;
  primaryLocation?: ShootLocation;
  onAddPrimaryLocation: () => void;
  onChange: (info?: SafetyEmergencyInfo) => void;
}) {
  const [isReviewing, setIsReviewing] = useState(Boolean(info && !info.confirmed && !info.needsReview));
  const [reviewSnapshot, setReviewSnapshot] = useState<SafetyEmergencyInfo | undefined>();
  const value: SafetyEmergencyInfo = info ?? emptyEmergencyInfo();
  const canConfirm = Boolean(value.hospitalName.trim() && value.hospitalAddress.trim());

  const beginReview = (nextInfo: SafetyEmergencyInfo) => {
    setReviewSnapshot(info);
    onChange(nextInfo);
    setIsReviewing(true);
  };
  const suggest = () => {
    if (!primaryLocation) return;
    if (!isReviewing) setReviewSnapshot(info);
    onChange(suggestEmergencyInfo(primaryLocation));
    setIsReviewing(true);
  };
  const update = (patch: Partial<SafetyEmergencyInfo>) => onChange({ ...value, ...patch, confirmed: false });
  const cancelReview = () => {
    onChange(reviewSnapshot);
    setReviewSnapshot(undefined);
    setIsReviewing(false);
  };
  const removeHospital = () => {
    onChange(undefined);
    setReviewSnapshot(undefined);
    setIsReviewing(false);
  };

  if (!primaryLocation) return <div className="shoot-safety-state is-location-required">
    <div className="shoot-safety-state-copy">
      <strong>Add a primary location to suggest the nearest emergency department.</strong>
      <span className="shoot-status-label label-xs-semibold">Needs location</span>
      <p className="label-xs">Emergency number: 000</p>
    </div>
    <div className="shoot-safety-state-actions">
      <button className="shoot-button secondary label-s-semibold" type="button" disabled>Suggest nearest hospital</button>
      <button className="shoot-text-action label-s-semibold" type="button" onClick={onAddPrimaryLocation}>Add primary location</button>
    </div>
  </div>;

  if (value.confirmed && !isReviewing) return <div className="shoot-safety-summary">
    <div className="shoot-safety-summary-copy">
      <strong>{value.hospitalName}</strong>
      <span className="label-xs">{value.hospitalAddress}</span>
    </div>
    <div className="shoot-safety-summary-actions">
      <button className="shoot-text-action shoot-safety-edit-action label-s-semibold" type="button" onClick={() => beginReview({ ...value, confirmed: false })}><DsIcon name="pencil-simple-ds" size={14} />Edit</button>
      <button className="shoot-text-action label-s-semibold" type="button" onClick={suggest}>Suggest again</button>
    </div>
  </div>;

  if (value.needsReview && !isReviewing) return <div className="shoot-safety-state">
    <div className="shoot-safety-state-copy">
      <span className="shoot-status-label is-review label-xs-semibold">Needs review</span>
      <strong>Primary location changed. Review emergency details.</strong>
      <p className="label-xs">The previous details will not be shared until they are confirmed again.</p>
    </div>
    <div className="shoot-safety-state-actions">
      <button className="shoot-button primary label-s-semibold" type="button" onClick={() => beginReview(value)}>Review details</button>
      <button className="shoot-text-action label-s-semibold" type="button" onClick={suggest}>Suggest again</button>
    </div>
  </div>;

  if (!info && !isReviewing) return <div className="shoot-safety-state">
    <div className="shoot-safety-state-copy">
      <strong>Primary location: {primaryLocation.name}</strong>
      <p className="label-xs">Emergency number: 000</p>
    </div>
    <div className="shoot-safety-state-actions">
      <button className="shoot-button primary label-s-semibold" type="button" onClick={suggest}>Suggest nearest hospital</button>
      <button className="shoot-text-action label-s-semibold" type="button" onClick={() => beginReview(emptyEmergencyInfo())}>Enter manually</button>
    </div>
  </div>;

  return <div className="shoot-safety-review">
    <div className="shoot-safety-review-heading">
      <div>
        <strong>Nearest emergency department</strong>
        <p className="label-xs">Using {primaryLocation.name} as the primary location.</p>
      </div>
      {value.needsReview ? <span className="shoot-status-label is-review label-xs-semibold">Needs review</span> : null}
    </div>
    {value.needsReview ? <p className="shoot-safety-review-warning label-xs-semibold"><DsIcon name="alert-triangle" size={16} />Primary location changed. Review emergency details.</p> : null}
    <div className="shoot-safety-fields">
      <Field label="Hospital name"><input value={value.hospitalName} placeholder="Hospital with an emergency department" onChange={(event) => update({ hospitalName: event.target.value })} /></Field>
      <Field label="Hospital address"><input value={value.hospitalAddress} placeholder="Full address" onChange={(event) => update({ hospitalAddress: event.target.value })} /></Field>
      <Field label="Emergency department phone"><input value={value.hospitalPhone ?? ""} placeholder="Phone number, if available" onChange={(event) => update({ hospitalPhone: event.target.value })} /></Field>
    </div>
    {value.travelTime ? <p className="shoot-safety-travel-time label-xs">{value.travelTime}</p> : null}
    <div className="shoot-safety-actions">
      <button className="shoot-text-action danger label-s-semibold" type="button" onClick={removeHospital}><DsIcon name="trash-simple" size={16} />Remove hospital</button>
      <button className="shoot-button primary label-s-semibold" type="button" disabled={!canConfirm} onClick={() => { onChange({ ...value, emergencyNumber: "000", confirmed: true, needsReview: false }); setReviewSnapshot(undefined); setIsReviewing(false); }}>Confirm for Call Sheet</button>
      <button className="shoot-text-action label-s-semibold" type="button" onClick={cancelReview}>Cancel</button>
    </div>
  </div>;
}

function ModalShell({ title, description, compact = false, wide = false, onClose, children, footer }: { title: string; description?: string; compact?: boolean; wide?: boolean; onClose: () => void; children: ReactNode; footer: ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="team-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className={`team-modal shoot-modal ${compact ? "is-compact" : ""} ${wide ? "is-wide" : ""}`} role="dialog" aria-modal="true" aria-label={title} onKeyDown={(event) => { if (event.key === "Escape") onClose(); }}>
        <header className="team-modal-header"><div><h2 className="team-modal-title headings-xs-bold">{title}</h2>{description ? <p className="team-modal-subtitle label-s">{description}</p> : null}</div><button className="team-modal-close" type="button" aria-label={`Close ${title}`} onClick={onClose}><DsIcon name="x-close-cross" size={16} /></button></header>
        <div className="shoot-modal-body">{children}</div>
        <footer className="shoot-modal-footer">{footer}</footer>
      </section>
    </div>,
    document.body,
  );
}

function CustomiseShootPlanModal({ hasShots, shotListEnabled, onClose, onShotListEnabledChange }: {
  hasShots: boolean;
  shotListEnabled: boolean;
  onClose: () => void;
  onShotListEnabledChange: (enabled: boolean) => void;
}) {
  return <ModalShell
    compact
    title="Customise shoot plan"
    description="Choose which planning views are shown. Your shot data is never deleted when a view is hidden."
    onClose={onClose}
    footer={<div className="shoot-modal-actions align-right"><Button size="S" variant="primary" onClick={onClose}>Done</Button></div>}
  >
    <div className="shoot-customise-plan-options">
      <label className="shoot-customise-plan-toggle">
        <span><strong className="label-s-semibold">Show Shot list</strong><small className="label-xs">Use a coverage-first view alongside the Schedule.</small></span>
        <input type="checkbox" checked={shotListEnabled} onChange={(event) => onShotListEnabledChange(event.target.checked)} />
      </label>
      {!shotListEnabled && hasShots ? <p className="shoot-customise-plan-warning label-xs" role="status"><DsIcon name="alert-triangle" size={16} />The Shot list view will be hidden, but its shots will remain available in the Schedule and Unscheduled shots.</p> : null}
    </div>
  </ModalShell>;
}

function DeleteShootDayModal({ day, entries, onCancel, onConfirm }: { day?: ShootDay; entries: ProductionEntry[]; onCancel: () => void; onConfirm: () => void }) {
  if (!day) return null;
  const scheduledCount = entries.filter((entry) => entry.startTime).length;
  const unscheduledCount = entries.filter((entry) => entry.type === "shot" && !entry.startTime).length;
  const removedContent = [
    scheduledCount ? `${scheduledCount} scheduled ${scheduledCount === 1 ? "entry" : "entries"}` : null,
    unscheduledCount ? `${unscheduledCount} unscheduled ${unscheduledCount === 1 ? "shot" : "shots"}` : null,
  ].filter(Boolean).join(" and ");
  const impactMessage = removedContent
    ? `This will permanently remove ${removedContent}. People and locations will remain in the project.`
    : "This will permanently remove the shoot day. People and locations will remain in the project.";

  return (
    <ModalShell
      compact
      title={`Delete ${day.label}?`}
      onClose={onCancel}
      footer={<div className="shoot-modal-actions align-right">
        <button autoFocus className="shoot-button secondary label-s-semibold" type="button" onClick={onCancel}>Cancel</button>
        <button className="shoot-button danger label-s-semibold" type="button" onClick={onConfirm}><DsIcon name="trash-simple" size={16} />Delete day</button>
      </div>}
    >
      <p className="paragraph-s">{impactMessage}</p>
    </ModalShell>
  );
}

function EntryModal({ draft, hideScheduling, locations, people, projectId, confirmDelete, onCancelDelete, onChange, onClose, onDelete, onCreateLocation, onSave }: {
  draft: EntryDraft;
  hideScheduling: boolean;
  locations: ShootLocation[];
  people: ShootPerson[];
  projectId: string;
  confirmDelete: boolean;
  onCancelDelete: () => void;
  onChange: (draft: EntryDraft) => void;
  onClose: () => void;
  onDelete: () => void;
  onCreateLocation: () => void;
  onSave: (draft: EntryDraft) => void;
}) {
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const timeMode: EntryTimeMode = draft.type === "shot" ? draft.timeMode ?? (draft.startTime ? "set" : "unscheduled") : "set";
  const isUnscheduled = draft.type === "shot" && timeMode === "unscheduled";
  const requiresStartTime = !hideScheduling && !isUnscheduled && !draft.startTime;
  const title = draft.id ? hideScheduling ? "Edit shot" : "Edit entry" : isUnscheduled ? "Add shot" : "Add to schedule";
  return (
    <ModalShell title={title} onClose={onClose} footer={
      <>
        {draft.id ? <div className="shoot-delete-confirm">{confirmDelete ? <><span className="label-xs-semibold">Remove this entry?</span><button className="shoot-text-action danger label-xs-semibold" type="button" onClick={onDelete}>Yes, remove</button><button className="shoot-text-action label-xs-semibold" type="button" onClick={onCancelDelete}>Keep it</button></> : <button className="shoot-text-action danger label-s-semibold" type="button" onClick={onDelete}><DsIcon name="trash-simple" size={16} />Delete</button>}</div> : <span />}
        <div className="shoot-modal-actions"><Button size="S" variant="secondary" onClick={onClose}>Cancel</Button><button className="shoot-button primary label-s-semibold" type="button" disabled={requiresStartTime || !draft.description.trim()} onClick={() => onSave(draft)}>{draft.id ? "Save changes" : isUnscheduled ? "Add shot" : "Add to schedule"}</button></div>
      </>
    }>
      <div className="shoot-entry-modal-form" onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && !requiresStartTime && draft.description.trim()) { event.preventDefault(); onSave(draft); } }}>
      {hideScheduling ? <ShotDetailsForm draft={draft} locations={locations} projectId={projectId} onChange={onChange} onCreateLocation={onCreateLocation} /> : <>
      <div className="shoot-form-grid two-column shoot-entry-timing-grid">
        {!hideScheduling ? <div className="shoot-field">
          {!isUnscheduled ? <><span className="label-xs-semibold">Start time</span><TimeSelect required value={draft.startTime} onChange={(value) => onChange({ ...draft, startTime: value, timeMode: "set" })} /></> : null}
          {draft.type === "shot" ? <label className="shoot-unscheduled-checkbox label-s">
            <input type="checkbox" checked={isUnscheduled} onChange={(event) => onChange({ ...draft, startTime: event.target.checked ? "" : draft.startTime, timeMode: event.target.checked ? "unscheduled" : "set" })} />
            {draft.id ? "Remove from schedule" : "Unscheduled"}
          </label> : null}
        </div> : null}
        <Field label="Duration"><DurationInput value={draft.durationMinutes} onChange={(durationMinutes) => onChange({ ...draft, durationMinutes })} /></Field>
      </div>
      <Field label="Description"><input autoFocus placeholder="e.g. Founder interview" value={draft.description} onChange={(event) => onChange({ ...draft, description: event.target.value })} /></Field>
      <fieldset className="shoot-type-options">
        <legend className="label-xs-semibold">Type</legend>
        <div>{scheduleTypeOptions.map((option) => <button className={`shoot-type-option is-${option.value} label-xs-semibold ${draft.type === option.value ? "active" : ""}`} type="button" aria-pressed={draft.type === option.value} key={option.value} onClick={() => onChange({ ...draft, type: option.value, timeMode: option.value === "shot" ? timeMode : "set" })}><DsIcon name={option.icon} size={15} />{option.label}</button>)}</div>
      </fieldset>
      <button className="shoot-text-action label-s-semibold" type="button" aria-expanded={showMoreOptions} onClick={() => setShowMoreOptions((current) => !current)}>{showMoreOptions ? "Fewer options" : "More options"}<DsIcon name="caret-down" size={14} /></button>
      {showMoreOptions ? <div className="shoot-quick-more-options">
        <Field label="Location"><select value={draft.locationId ?? ""} onChange={(event) => onChange({ ...draft, locationId: event.target.value || undefined })}><option value="">No location</option>{locations.map((location) => <option value={location.id} key={location.id}>{location.name}</option>)}</select></Field>
        <PeoplePicker people={people} selectedIds={draft.personIds} onChange={(personIds) => onChange({ ...draft, personIds })} />
      </div> : null}
      </>}
      </div>
    </ModalShell>
  );
}

function ShotDetailsForm({ draft, locations, projectId, onChange, onCreateLocation }: { draft: EntryDraft; locations: ShootLocation[]; projectId: string; onChange: (draft: EntryDraft) => void; onCreateLocation: () => void }) {
  const [showMoreOptions, setShowMoreOptions] = useState(Boolean(draft.cameraMovement || draft.cameraAngle || draft.lens || draft.camera || draft.interiorExterior || draft.gear?.length || draft.notes));
  return <div className="shoot-shot-details-form">
    <Field label="Description"><input autoFocus required placeholder="Describe what needs to be captured…" value={draft.description} onChange={(event) => onChange({ ...draft, description: event.target.value })} /></Field>
    <div className="shoot-shot-details-primary">
      <div className="shoot-field"><span className="label-xs-semibold">Image</span><ShotReferenceImagePicker entry={draft} projectId={projectId} onChange={(patch) => onChange({ ...draft, ...patch })} /></div>
      <Field label="Subject"><input placeholder="Person, product, place or activity" value={draft.subject ?? ""} onChange={(event) => onChange({ ...draft, subject: event.target.value })} /></Field>
      <Field label="Location"><BriskSelect ariaLabel="Location" options={[...locations.map((location) => ({ value: location.id, label: location.name })), { value: "create-new", label: "Create new location" }]} placeholder="No location" value={draft.locationId ?? ""} onChange={(value) => value === "create-new" ? onCreateLocation() : onChange({ ...draft, locationId: value || undefined })} /></Field>
      <Field label="Shot category"><BriskSelect ariaLabel="Shot category" options={shotCategoryOptions.map((option) => ({ value: option, label: option }))} placeholder="Category" value={draft.shotCategory ?? ""} onChange={(value) => onChange({ ...draft, shotCategory: value || undefined })} /></Field>
      <Field label="Shot size"><BriskSelect ariaLabel="Shot size" options={shotSizeOptions.map((option) => ({ value: option, label: option }))} placeholder="Shot size" value={draft.shotSize ?? ""} onChange={(value) => onChange({ ...draft, shotSize: value || undefined })} /></Field>
      <Field label="Est. filming time"><FilmingTimeInput value={draft.durationMinutes} onChange={(durationMinutes) => onChange({ ...draft, durationMinutes })} /></Field>
    </div>
    <button className="shoot-text-action label-s-semibold" type="button" aria-expanded={showMoreOptions} onClick={() => setShowMoreOptions((current) => !current)}>{showMoreOptions ? "Fewer options" : "More options"}<DsIcon name="caret-down" size={14} /></button>
    {showMoreOptions ? <>
    <div className="shoot-shot-details-secondary">
      <Field label="Camera movement"><BriskSelect ariaLabel="Camera movement" options={cameraMovementOptions.map((option) => ({ value: option, label: option }))} placeholder="Movement" value={draft.cameraMovement ?? ""} onChange={(value) => onChange({ ...draft, cameraMovement: value || undefined })} /></Field>
      <Field label="Camera angle"><BriskSelect ariaLabel="Camera angle" options={cameraAngleOptions.map((option) => ({ value: option, label: option }))} placeholder="Camera angle" value={draft.cameraAngle ?? ""} onChange={(value) => onChange({ ...draft, cameraAngle: value || undefined })} /></Field>
      <Field label="Lens"><input list="shoot-shot-detail-lenses" placeholder="Lens or focal length" value={draft.lens ?? ""} onChange={(event) => onChange({ ...draft, lens: event.target.value })} /></Field>
      <Field label="Camera"><input placeholder="Camera" value={draft.camera ?? ""} onChange={(event) => onChange({ ...draft, camera: event.target.value })} /></Field>
      <Field label="Interior / Exterior"><BriskSelect ariaLabel="Interior or exterior" options={interiorExteriorOptions.map((option) => ({ value: option, label: option }))} placeholder="Interior / Exterior" value={draft.interiorExterior ?? ""} onChange={(value) => onChange({ ...draft, interiorExterior: value || undefined })} /></Field>
    </div>
    <fieldset className="shoot-shot-gear-options"><legend className="label-xs-semibold">Gear</legend><div>{gearOptions.map((option) => <label className="label-xs" key={option}><input type="checkbox" checked={draft.gear?.includes(option) ?? false} onChange={(event) => onChange({ ...draft, gear: event.target.checked ? [...(draft.gear ?? []), option] : (draft.gear ?? []).filter((item) => item !== option) })} />{option}</label>)}</div></fieldset>
    <Field label="Notes"><textarea rows={3} placeholder="Creative direction, framing, props or practical instructions" value={draft.notes ?? ""} onChange={(event) => onChange({ ...draft, notes: event.target.value })} /></Field>
    </> : null}
    <datalist id="shoot-shot-detail-lenses">{lensOptions.map((option) => <option value={option} key={option} />)}</datalist>
  </div>;
}

function ShootDayMultiSelect({ days, value, onChange }: { days: ShootDay[]; value: ShootDayAssignment; onChange: (value: ShootDayAssignment) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedDayIds = value === "all" ? days.map((day) => day.id) : value;
  const label = value === "all"
    ? "All days"
    : selectedDayIds.length === 0
      ? "Choose shoot days"
      : selectedDayIds.length === 1
        ? days.find((day) => day.id === selectedDayIds[0])?.label ?? "1 day selected"
        : `${selectedDayIds.length} days selected`;

  useEffect(() => {
    if (!isOpen) return;
    const positionMenu = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const viewportPadding = 8;
      const gap = 4;
      const width = Math.min(Math.max(rect.width, 240), window.innerWidth - (viewportPadding * 2));
      const preferredHeight = menuRef.current?.scrollHeight ?? (((days.length + 1) * 52) + 16);
      const spaceBelow = window.innerHeight - rect.bottom - gap - viewportPadding;
      const spaceAbove = rect.top - gap - viewportPadding;
      const openAbove = spaceBelow < preferredHeight && spaceAbove > spaceBelow;
      const availableHeight = openAbove ? spaceAbove : spaceBelow;
      setMenuStyle({
        bottom: openAbove ? window.innerHeight - rect.top + gap : undefined,
        left: Math.min(Math.max(viewportPadding, rect.left), window.innerWidth - width - viewportPadding),
        maxHeight: availableHeight >= preferredHeight ? "none" : Math.max(96, availableHeight),
        top: openAbove ? undefined : rect.bottom + gap,
        width,
      });
    };
    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) setIsOpen(false);
    };
    positionMenu();
    window.addEventListener("resize", positionMenu);
    window.addEventListener("scroll", positionMenu, true);
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => {
      window.removeEventListener("resize", positionMenu);
      window.removeEventListener("scroll", positionMenu, true);
      document.removeEventListener("mousedown", closeOnOutsideClick);
    };
  }, [days.length, isOpen]);

  const toggleDay = (dayId: string) => {
    const current = value === "all" ? days.map((day) => day.id) : value;
    if (current.length === 1 && current.includes(dayId)) return;
    const next = current.includes(dayId) ? current.filter((id) => id !== dayId) : [...current, dayId];
    onChange(next);
  };

  return <div className="brisk-select shoot-day-multi-select">
    <button className="brisk-select-trigger shoot-day-multi-trigger label-s" ref={triggerRef} type="button" aria-haspopup="listbox" aria-expanded={isOpen} onClick={() => setIsOpen((current) => !current)}>
      <span>{label}</span><DsIcon name="caret-down" size={12} />
    </button>
    {isOpen ? createPortal(<div className="shoot-day-multi-menu" ref={menuRef} style={menuStyle} role="listbox" aria-label="Shoot days" aria-multiselectable="true" onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); setIsOpen(false); triggerRef.current?.focus(); } }}>
      <div className="shoot-day-multi-options">
        {days.map((day) => {
          const isSelected = selectedDayIds.includes(day.id);
          return <button className="shoot-day-multi-option" type="button" role="option" aria-selected={isSelected} key={day.id} onClick={() => toggleDay(day.id)}>
            <span className={`shoot-day-multi-check ${isSelected ? "is-checked" : ""}`} aria-hidden="true">{isSelected ? <DsIcon name="check" size={14} /> : null}</span>
            <span><strong className="label-s-semibold">{day.label}</strong><small className="label-xs">{formatEditorDate(day.date)}</small></span>
          </button>;
        })}
      </div>
      <button className="shoot-day-multi-option is-all" type="button" role="option" aria-selected={value === "all"} onClick={() => { onChange("all"); setIsOpen(false); }}>
        <span className={`shoot-day-multi-check ${value === "all" ? "is-checked" : ""}`} aria-hidden="true">{value === "all" ? <DsIcon name="check" size={14} /> : null}</span>
        <span><strong className="label-s-semibold">All days</strong></span>
      </button>
    </div>, document.body) : null}
  </div>;
}

function PersonModal({ draft, days, canDelete, onChange, onClose, onDelete, onSave }: { draft: PersonDraft; days: ShootDay[]; canDelete: boolean; onChange: (draft: PersonDraft) => void; onClose: () => void; onDelete: () => void; onSave: (draft: PersonDraft) => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isAddingCrewRole, setIsAddingCrewRole] = useState(draft.type === "crew" && Boolean(draft.role) && !crewRoleOptions.some((role) => role === draft.role));
  const isExistingContact = Boolean(draft.sourceContact);
  const isCreating = !draft.id && !isExistingContact;
  const isCustomCrewRole = isAddingCrewRole || (draft.type === "crew" && Boolean(draft.role) && !crewRoleOptions.some((role) => role === draft.role));
  return (
    <ModalShell title={isExistingContact ? "Confirm person details" : draft.id ? "Edit person" : "Create new person"} description={isExistingContact ? "Contact details are reused. Confirm their role, call time and shoot days for this production." : "Keep only the details needed on the day."} onClose={onClose} footer={<>
      {canDelete ? <div className="shoot-delete-confirm">{confirmDelete ? <><span className="label-xs-semibold">Remove {draft.name}?</span><button className="shoot-text-action danger label-xs-semibold" type="button" onClick={onDelete}>Yes, remove</button><button className="shoot-text-action label-xs-semibold" type="button" onClick={() => setConfirmDelete(false)}>Keep person</button></> : <button className="shoot-text-action danger label-s-semibold" type="button" onClick={() => setConfirmDelete(true)}><DsIcon name="trash-simple" size={16} />Delete</button>}</div> : <span />}
      <div className="shoot-modal-actions"><Button size="S" variant="secondary" onClick={onClose}>Cancel</Button><Button size="S" variant="primary" onClick={() => onSave(draft)}>{isExistingContact ? "Add person" : isCreating ? "Create and add" : "Save person"}</Button></div>
    </>}>
      {isCreating ? <span className="shoot-contact-source-badge is-new label-xs-semibold">New person</span> : null}
      <Field label="Name"><input autoFocus value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value })} /></Field>
      <div className="shoot-form-grid two-column">
        <Field label="Type"><select value={draft.type} onChange={(event) => onChange({ ...draft, type: event.target.value as ShootPersonType })}>{(Object.keys(personTypeLabels) as ShootPersonType[]).map((type) => <option value={type} key={type}>{personTypeLabels[type]}</option>)}</select></Field>
        <Field label={isCreating ? "Role (optional)" : "Role"}>{draft.type === "crew" && !isCustomCrewRole ? <BriskSelect
          ariaLabel="Crew role"
          options={[
            ...crewRoleOptions.map((role) => ({ value: role, label: role })),
            { value: addCrewRoleValue, label: "Add new role", icon: "plus" as const, dividerAbove: true },
          ]}
          placeholder="Role"
          value={crewRoleOptions.some((role) => role === draft.role) ? draft.role : ""}
          onChange={(value) => {
            if (value === addCrewRoleValue) {
              setIsAddingCrewRole(true);
              onChange({ ...draft, role: "" });
              return;
            }
            onChange({ ...draft, role: value });
          }}
        /> : draft.type === "crew" ? <div className="shoot-custom-crew-role"><input autoFocus placeholder="Enter crew role" value={draft.role} onChange={(event) => onChange({ ...draft, role: event.target.value })} /><button className="shoot-text-action label-xs-semibold" type="button" onClick={() => { setIsAddingCrewRole(false); onChange({ ...draft, role: "" }); }}>Choose a standard role</button></div> : <input placeholder={draft.type === "client" ? "e.g. Client Rep" : "Enter role"} value={draft.role} onChange={(event) => onChange({ ...draft, role: event.target.value })} />}</Field>
        <Field label={isCreating ? "Phone (optional)" : "Phone"}><input type="tel" value={draft.phone} onChange={(event) => onChange({ ...draft, phone: event.target.value })} /></Field>
        <Field label={isCreating ? "Email (optional)" : "Email"}><input type="email" value={draft.email} onChange={(event) => onChange({ ...draft, email: event.target.value })} /></Field>
        <Field label="Call time"><TimeSelect value={draft.callTime} onChange={(value) => onChange({ ...draft, callTime: value })} /></Field>
        <Field label="Shoot days"><ShootDayMultiSelect days={days} value={draft.shootDayIds} onChange={(shootDayIds) => onChange({ ...draft, shootDayIds })} /></Field>
      </div>
    </ModalShell>
  );
}

function ExistingPersonPopover({ anchor, existing, addedPersonIds, onAdd, onClose, onCreate }: { anchor: HTMLButtonElement | null; existing: ShootPerson[]; addedPersonIds: string[]; onAdd: (person: ShootPerson) => void; onClose: () => void; onCreate: () => void }) {
  const [query, setQuery] = useState("");
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties>({});
  const popoverRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const normalisedQuery = query.trim().toLowerCase();
  const availableContacts = existing.filter((person) => !addedPersonIds.includes(person.id));
  const matchingContacts = normalisedQuery
    ? availableContacts.filter((person) => `${person.name} ${person.role} ${person.email} ${person.company ?? ""}`.toLowerCase().includes(normalisedQuery))
    : availableContacts.slice(0, 4);

  useEffect(() => {
    const positionPopover = () => {
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const viewportPadding = 16;
      const gap = 8;
      const width = Math.min(440, window.innerWidth - (viewportPadding * 2));
      const estimatedHeight = 420;
      const openAbove = window.innerHeight - rect.bottom < estimatedHeight && rect.top > estimatedHeight;
      setPopoverStyle({
        bottom: openAbove ? window.innerHeight - rect.top + gap : undefined,
        left: Math.min(Math.max(viewportPadding, rect.right - width), window.innerWidth - width - viewportPadding),
        top: openAbove ? undefined : rect.bottom + gap,
        width,
      });
    };
    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!popoverRef.current?.contains(target) && !anchor?.contains(target)) onClose();
    };
    positionPopover();
    window.addEventListener("resize", positionPopover);
    window.addEventListener("scroll", positionPopover, true);
    document.addEventListener("mousedown", closeOnOutsideClick);
    window.requestAnimationFrame(() => searchRef.current?.focus());
    return () => {
      window.removeEventListener("resize", positionPopover);
      window.removeEventListener("scroll", positionPopover, true);
      document.removeEventListener("mousedown", closeOnOutsideClick);
    };
  }, [anchor, onClose]);

  if (typeof document === "undefined") return null;
  return createPortal(<section className="shoot-person-search-popover" ref={popoverRef} style={popoverStyle} role="dialog" aria-label="Search people" onKeyDown={(event) => { if (event.key === "Escape") onClose(); }}>
    <header><h2 className="headings-xs-bold">Search people</h2><button className="team-modal-close" type="button" aria-label="Close people search" onClick={onClose}><DsIcon name="x-close-cross" size={16} /></button></header>
    <label className="shoot-person-search-field"><span className="sr-only">Search people</span><DsIcon name="search" size={16} /><input ref={searchRef} type="search" placeholder="Search by name, role or email…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
    <div className="shoot-person-search-results">
      <span className="shoot-person-search-label label-xs-semibold">{normalisedQuery ? "Results" : "Recently used"}</span>
      {matchingContacts.length ? matchingContacts.map((person) => {
        return <button className="shoot-person-search-result" type="button" key={person.id} onClick={() => { onAdd(person); onClose(); }}>
          <span className={`shoot-avatar is-${person.contactSource ?? "saved-contact"} label-xs-semibold`} aria-hidden="true">{getInitials(person.name)}</span>
          <span className="shoot-person-search-copy"><strong className="label-s-semibold">{person.name}</strong><span className="label-xs">{[person.role, person.company].filter(Boolean).join(" · ")}</span></span>
          <span className="shoot-person-search-add label-xs-semibold">Add</span>
        </button>;
      }) : <p className="shoot-person-search-empty label-s">{normalisedQuery ? "No saved contacts match this search." : "No recent contacts to show."}</p>}
    </div>
    <button className="shoot-create-person-action label-s-semibold" type="button" onClick={onCreate}><DsIcon name="plus" size={16} />Create new person</button>
  </section>, document.body);
}

function DocumentsModal({ activeDayId, days, documents, onChange, onClose }: { activeDayId: string; days: ShootDay[]; documents: ShootDocument[]; onChange: (documents: ShootDocument[]) => void; onClose: () => void }) {
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [linkDraft, setLinkDraft] = useState("");
  const [renamingDocumentId, setRenamingDocumentId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [commentDocumentId, setCommentDocumentId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const hasUnsavedRename = renamingDocumentId !== null && renameDraft.trim() !== (documents.find((document) => document.id === renamingDocumentId)?.name ?? "");
  const hasUnsavedChanges = (isAddingLink && Boolean(linkDraft.trim())) || Boolean(commentDraft.trim()) || hasUnsavedRename;
  const resetLinkDraft = () => { setIsAddingLink(false); setLinkDraft(""); };
  const requestClose = () => {
    if (hasUnsavedChanges && !window.confirm("Discard your unsaved changes?")) return;
    onClose();
  };
  const addLink = () => {
    if (!linkDraft.trim()) return;
    const document: ShootDocument = {
      id: `document-${Date.now()}`,
      name: getDocumentNameFromUrl(linkDraft),
      kind: "link",
      type: "General",
      url: linkDraft.trim(),
      shootDayIds: activeDayId ? [activeDayId] : [],
    };
    onChange([...documents, document]);
    resetLinkDraft();
  };
  const renameDocument = (documentId: string) => {
    const name = renameDraft.trim();
    if (name) onChange(documents.map((document) => document.id === documentId ? { ...document, name } : document));
    setRenamingDocumentId(null);
    setRenameDraft("");
  };
  const shareDocument = (document: ShootDocument) => {
    void navigator.clipboard.writeText(document.url).then(
      () => setActionMessage(`Share link copied for ${document.name}.`),
      () => setActionMessage("Could not copy the share link."),
    );
  };
  const addComment = (documentId: string) => {
    const comment = commentDraft.trim();
    if (!comment) return;
    onChange(documents.map((document) => document.id === documentId ? { ...document, comments: [...(document.comments ?? []), comment] } : document));
    setCommentDraft("");
    setCommentDocumentId(null);
    setActionMessage("Comment added.");
  };

  return <ModalShell title="Documents" onClose={requestClose} footer={<div className="shoot-modal-actions align-right"><Button size="S" variant="secondary" onClick={requestClose}>Close</Button></div>}>
    <div className="shoot-documents-window">
      <div className="shoot-documents-window-heading">
        <strong className="label-s-semibold">{documents.length ? `${documents.length} ${documents.length === 1 ? "document" : "documents"}` : "No documents attached"}</strong>
        {!isAddingLink ? <div className="shoot-documents-window-actions">
          <button className="shoot-button primary label-s-semibold" type="button" onClick={() => uploadInputRef.current?.click()}><DsIcon name="upload-simple" size={16} />Upload documents</button>
          <button className="shoot-text-action label-s-semibold" type="button" onClick={() => setIsAddingLink(true)}><DsIcon name="link" size={16} />Add link</button>
        </div> : null}
      </div>
      <input ref={uploadInputRef} className="sr-only" type="file" multiple accept=".pdf,.doc,.docx,.rtf,.txt,.xls,.xlsx,.ppt,.pptx,application/pdf" onChange={(event) => {
        const files = Array.from(event.target.files ?? []);
        if (files.length) onChange([...documents, ...files.map((file, index): ShootDocument => ({ id: `document-${Date.now()}-${index}`, name: file.name, kind: "pdf", type: "General", url: URL.createObjectURL(file), shootDayIds: activeDayId ? [activeDayId] : [] }))]);
        event.currentTarget.value = "";
      }} />
      {documents.length ? <div className="shoot-documents-window-list">{documents.map((document) => <div className="shoot-document-list-item" key={document.id}>
        <article>
          <span className="shoot-document-file-icon"><DsIcon name={document.kind === "link" ? "link" : "file-text"} size={18} /></span>
          <div className="shoot-document-copy">
            {renamingDocumentId === document.id ? <input className="shoot-document-rename-input label-s-semibold" autoFocus aria-label={`Rename ${document.name}`} value={renameDraft} onChange={(event) => setRenameDraft(event.target.value)} onBlur={() => renameDocument(document.id)} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); if (event.key === "Escape") { setRenamingDocumentId(null); setRenameDraft(""); } }} /> : <strong className="label-s-semibold">{document.name}</strong>}
            <span className="label-xs">{document.kind === "link" ? "Link" : document.type ?? "Document"}{formatDocumentDays(document.shootDayIds, days) ? ` · ${formatDocumentDays(document.shootDayIds, days)}` : ""}{document.comments?.length ? ` · ${document.comments.length} ${document.comments.length === 1 ? "comment" : "comments"}` : ""}</span>
          </div>
          <div className="media-asset-actions is-compact shoot-document-actions" aria-label={`Actions for ${document.name}`}>
            <a className="media-icon-button" href={document.url} target="_blank" rel="noreferrer" aria-label={`Open ${document.name}`} data-tooltip="Open" title="Open"><DsIcon name="eye" size={16} /></a>
            <a className="media-icon-button" href={document.url} download={document.name} aria-label={`Download ${document.name}`} data-tooltip="Download" title="Download"><DsIcon name="download" size={16} /></a>
            <button className="media-icon-button" type="button" aria-label={`Share ${document.name}`} data-tooltip="Share" title="Share" onClick={() => shareDocument(document)}><DsIcon name="link" size={16} /></button>
            <button className="media-icon-button" type="button" aria-label={`Comment on ${document.name}`} data-tooltip="Comment" title="Comment" onClick={() => { setCommentDocumentId((current) => current === document.id ? null : document.id); setCommentDraft(""); }}><DsIcon name="chat-circle" size={16} />{document.comments?.length ? <span className="media-comment-count label-xs-semibold">{document.comments.length}</span> : null}</button>
            <button className="media-icon-button" type="button" aria-label={`Rename ${document.name}`} data-tooltip="Rename" title="Rename" onClick={() => { setRenamingDocumentId(document.id); setRenameDraft(document.name); }}><DsIcon name="pencil-simple" size={16} /></button>
            <button className="media-icon-button" type="button" aria-label={`Delete ${document.name}`} data-tooltip="Delete" title="Delete" onClick={() => { if (window.confirm(`Delete ${document.name}?`)) onChange(documents.filter((item) => item.id !== document.id)); }}><DsIcon name="trash" size={16} /></button>
          </div>
        </article>
        {commentDocumentId === document.id ? <div className="shoot-document-comment-form">
          <label className="shoot-field"><span className="label-xs-semibold">Comment</span><textarea autoFocus rows={2} placeholder="Add a comment…" value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} /></label>
          <div className="shoot-document-add-actions"><button className="shoot-button secondary label-s-semibold" type="button" onClick={() => { setCommentDocumentId(null); setCommentDraft(""); }}>Cancel</button><button className="shoot-button primary label-s-semibold" type="button" disabled={!commentDraft.trim()} onClick={() => addComment(document.id)}>Add comment</button></div>
        </div> : null}
      </div>)}</div> : <div className="shoot-documents-empty"><DsIcon name="file-text" size={24} /><strong className="label-s-semibold">Upload files for the shoot</strong><span className="label-xs">PDFs and common office documents are supported.</span></div>}
      {isAddingLink ? <div className="shoot-document-link-form">
        <Field label="Link"><input autoFocus type="url" placeholder="https://" value={linkDraft} onChange={(event) => setLinkDraft(event.target.value)} /></Field>
        <div className="shoot-document-add-actions"><button className="shoot-button secondary label-s-semibold" type="button" onClick={resetLinkDraft}>Cancel</button><button className="shoot-button primary label-s-semibold" type="button" disabled={!linkDraft.trim()} onClick={addLink}>Add link</button></div>
      </div> : null}
      <span className="sr-only" role="status" aria-live="polite">{actionMessage}</span>
    </div>
  </ModalShell>;
}

function getDocumentNameFromUrl(value: string) {
  try {
    const url = new URL(value.trim());
    const pathName = decodeURIComponent(url.pathname.split("/").filter(Boolean).at(-1) ?? "");
    return pathName || url.hostname;
  } catch {
    return "Document link";
  }
}

function formatDocumentDays(shootDayIds: ShootDayAssignment, days: ShootDay[]) {
  if (shootDayIds === "all") return "All days";
  if (shootDayIds.length === 1) return days.find((day) => day.id === shootDayIds[0])?.label ?? "";
  return shootDayIds.length ? `${shootDayIds.length} days` : "";
}

function LocationModal({ draft, days, onChange, onClose, onDelete, onSave }: { draft: LocationDraft; days: ShootDay[]; onChange: (draft: LocationDraft) => void; onClose: () => void; onDelete: () => void; onSave: (draft: LocationDraft) => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const containsWifiDetails = /^Wi-Fi:\s*\S+/imu.test(draft.notes);
  return (
    <ModalShell title={draft.id ? "Edit location" : "Add location"} onClose={onClose} footer={<>
      {draft.id ? <div className="shoot-delete-confirm">{confirmDelete ? <><span className="label-xs-semibold">Remove {draft.name}?</span><button className="shoot-text-action danger label-xs-semibold" type="button" onClick={onDelete}>Yes, remove</button><button className="shoot-text-action label-xs-semibold" type="button" onClick={() => setConfirmDelete(false)}>Keep location</button></> : <button className="shoot-text-action danger label-s-semibold" type="button" onClick={() => setConfirmDelete(true)}><DsIcon name="trash-simple" size={16} />Delete</button>}</div> : <span />}
      <div className="shoot-modal-actions"><Button size="S" variant="secondary" onClick={onClose}>Cancel</Button><Button size="S" variant="primary" onClick={() => onSave(draft)}>Save location</Button></div>
    </>}>
      <Field label="Address"><AddressAutocomplete draft={draft} onChange={onChange} /></Field>
      <Field label="Practical details"><textarea rows={5} placeholder="Anything the crew should know about arriving or working here? Like Wi-Fi, access and parking." value={draft.notes} onChange={(event) => onChange({ ...draft, notes: event.target.value })} /></Field>
      {containsWifiDetails ? <p className="shoot-location-wifi-warning label-xs"><DsIcon name="info" size={16} />Wi-Fi details will appear on the public Call Sheet when it is shared.</p> : null}
      <Field label="Shoot days"><ShootDayMultiSelect days={days} value={draft.shootDayIds} onChange={(shootDayIds) => onChange({ ...draft, shootDayIds })} /></Field>
    </ModalShell>
  );
}

function AddressAutocomplete({ draft, onChange }: { draft: LocationDraft; onChange: (draft: LocationDraft) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const listboxId = useId();
  const query = draft.address.trim().toLowerCase();
  const results = query
    ? shootAddressSuggestions.filter((suggestion) => `${suggestion.name} ${suggestion.address}`.toLowerCase().includes(query)).slice(0, 6)
    : [];

  const chooseSuggestion = (index: number) => {
    const suggestion = results[index];
    if (!suggestion) return;
    onChange({
      ...draft,
      name: draft.name.trim() ? draft.name : suggestion.name,
      address: suggestion.address,
    });
    setIsOpen(false);
    setActiveIndex(0);
  };

  return <div className="shoot-address-search">
    <input
      autoFocus
      autoComplete="off"
      placeholder="Start typing an address"
      value={draft.address}
      role="combobox"
      aria-autocomplete="list"
      aria-controls={listboxId}
      aria-expanded={isOpen && results.length > 0}
      onBlur={() => setIsOpen(false)}
      onChange={(event) => { onChange({ ...draft, address: event.target.value }); setIsOpen(true); setActiveIndex(0); }}
      onFocus={() => setIsOpen(Boolean(query))}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown" && results.length) {
          event.preventDefault();
          setIsOpen(true);
          setActiveIndex((current) => Math.min(current + 1, results.length - 1));
        } else if (event.key === "ArrowUp" && results.length) {
          event.preventDefault();
          setIsOpen(true);
          setActiveIndex((current) => Math.max(current - 1, 0));
        } else if (event.key === "Enter" && isOpen && results.length) {
          event.preventDefault();
          chooseSuggestion(activeIndex);
        } else if (event.key === "Escape") {
          setIsOpen(false);
        }
      }}
    />
    {isOpen && results.length ? <div className="shoot-address-results" id={listboxId} role="listbox" aria-label="Address suggestions">
      {results.map((suggestion, index) => <button
        className={index === activeIndex ? "active" : ""}
        type="button"
        role="option"
        aria-selected={index === activeIndex}
        key={suggestion.id}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => chooseSuggestion(index)}
      >
        <DsIcon name="push-pin-simple" size={16} />
        <span><strong className="label-s-semibold">{suggestion.name}</strong><small className="label-xs">{suggestion.address}</small></span>
      </button>)}
    </div> : null}
  </div>;
}

function TimeSelect({ value, onChange, onBlur, onFocus, onKeyDown, disabled, ...props }: Omit<ComponentProps<"input">, "value" | "onChange"> & { value: string; onChange: (value: string) => void }) {
  const options = Array.from({ length: 24 * 4 }, (_, index) => {
    const hours = Math.floor(index / 4);
    const minutes = (index % 4) * 15;
    const optionValue = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    return { value: optionValue, label: formatTime(optionValue) };
  });
  const [inputValue, setInputValue] = useState(value ? formatTime(value) : "");
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listboxId = useId();

  useEffect(() => {
    if (!isEditing) setInputValue(value ? formatTime(value) : "");
  }, [isEditing, value]);

  useEffect(() => {
    if (!isOpen) return;
    const selectedIndex = options.findIndex((option) => option.value === value);
    const index = activeIndex ?? selectedIndex;
    const listbox = listboxRef.current;
    const option = index >= 0 ? optionRefs.current[index] : null;
    if (listbox && option) listbox.scrollTop = Math.max(0, option.offsetTop - ((listbox.clientHeight - option.offsetHeight) / 2));
  }, [activeIndex, isOpen, options, value]);

  const commitValue = (rawValue: string) => {
    const parsedValue = parseTimeInput(rawValue);
    if (parsedValue) {
      onChange(parsedValue);
      setInputValue(formatTime(parsedValue));
      return;
    }
    if (!rawValue.trim()) {
      onChange("");
      setInputValue("");
      return;
    }
    setInputValue(value ? formatTime(value) : "");
  };

  const chooseOption = (optionValue: string) => {
    onChange(optionValue);
    setInputValue(formatTime(optionValue));
    setIsOpen(false);
    setIsEditing(false);
    window.requestAnimationFrame(() => inputRef.current?.blur());
  };

  return (
    <div className="shoot-time-input">
      <input
        {...props}
        ref={inputRef}
        type="text"
        autoComplete="off"
        disabled={disabled}
        value={inputValue}
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={isOpen}
        role="combobox"
        onChange={(event) => { setInputValue(event.target.value); setActiveIndex(null); }}
        onFocus={(event) => { setIsEditing(true); setIsOpen(!disabled); onFocus?.(event); }}
        onBlur={(event) => { commitValue(event.currentTarget.value); setIsOpen(false); setIsEditing(false); setActiveIndex(null); onBlur?.(event); }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setIsOpen(true);
            setActiveIndex((current) => {
              const selectedIndex = options.findIndex((option) => option.value === value);
              const startIndex = current ?? Math.max(selectedIndex, 0);
              return event.key === "ArrowDown" ? Math.min(startIndex + 1, options.length - 1) : Math.max(startIndex - 1, 0);
            });
          } else if (event.key === "Enter") {
            event.preventDefault();
            if (activeIndex !== null) chooseOption(options[activeIndex].value);
            else event.currentTarget.blur();
          } else if (event.key === "Escape") {
            setInputValue(value ? formatTime(value) : "");
            setIsOpen(false);
            setActiveIndex(null);
          }
          onKeyDown?.(event);
        }}
      />
      {isOpen ? <div className="shoot-time-options" id={listboxId} ref={listboxRef} role="listbox" aria-label="Suggested times">
        {options.map((option, index) => <button
          className={`shoot-time-option label-s ${option.value === value ? "selected" : ""} ${activeIndex === index ? "active" : ""}`}
          type="button"
          role="option"
          aria-selected={option.value === value}
          tabIndex={-1}
          ref={(element) => { optionRefs.current[index] = element; }}
          key={option.value}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => chooseOption(option.value)}
        >{option.label}</button>)}
      </div> : null}
    </div>
  );
}

function DurationInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const options = Array.from({ length: 48 }, (_, index) => (index + 1) * 5);
  const [inputValue, setInputValue] = useState(value ? String(value) : "");
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listboxId = useId();

  useEffect(() => {
    if (!isEditing) setInputValue(value ? String(value) : "");
  }, [isEditing, value]);

  useEffect(() => {
    if (!isOpen) return;
    const selectedIndex = options.indexOf(value);
    const index = activeIndex ?? selectedIndex;
    const listbox = listboxRef.current;
    const option = index >= 0 ? optionRefs.current[index] : null;
    if (listbox && option) listbox.scrollTop = Math.max(0, option.offsetTop - ((listbox.clientHeight - option.offsetHeight) / 2));
  }, [activeIndex, isOpen, options, value]);

  const commitValue = (rawValue: string) => {
    if (!rawValue.trim()) {
      onChange(0);
      setInputValue("");
      return;
    }
    const parsedValue = Number(rawValue);
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      setInputValue(value ? String(value) : "");
      return;
    }
    const roundedValue = Math.min(240, Math.max(5, Math.round(parsedValue / 5) * 5));
    onChange(roundedValue);
    setInputValue(String(roundedValue));
  };

  const chooseOption = (optionValue: number) => {
    onChange(optionValue);
    setInputValue(String(optionValue));
    setIsOpen(false);
    setIsEditing(false);
    window.requestAnimationFrame(() => inputRef.current?.blur());
  };

  return (
    <div className="shoot-duration-combobox">
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="Optional"
        value={inputValue}
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={isOpen}
        role="combobox"
        onChange={(event) => { setInputValue(event.target.value); setActiveIndex(null); }}
        onFocus={() => { setIsEditing(true); setIsOpen(true); }}
        onBlur={(event) => { commitValue(event.currentTarget.value); setIsOpen(false); setIsEditing(false); setActiveIndex(null); }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setIsOpen(true);
            setActiveIndex((current) => {
              const selectedIndex = options.indexOf(value);
              const startIndex = current ?? Math.max(selectedIndex, 0);
              return event.key === "ArrowDown" ? Math.min(startIndex + 1, options.length - 1) : Math.max(startIndex - 1, 0);
            });
          } else if (event.key === "Enter") {
            event.preventDefault();
            if (activeIndex !== null) chooseOption(options[activeIndex]);
            else event.currentTarget.blur();
          } else if (event.key === "Escape") {
            setInputValue(value ? String(value) : "");
            setIsOpen(false);
            setActiveIndex(null);
          }
        }}
      />
      <span className="shoot-duration-suffix label-s">min</span>
      {isOpen ? <div className="shoot-duration-options" id={listboxId} ref={listboxRef} role="listbox" aria-label="Suggested durations">
        {options.map((option, index) => <button
          className={`shoot-duration-option label-s ${option === value ? "selected" : ""} ${activeIndex === index ? "active" : ""}`}
          type="button"
          role="option"
          aria-selected={option === value}
          tabIndex={-1}
          ref={(element) => { optionRefs.current[index] = element; }}
          key={option}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => chooseOption(option)}
        >{formatDuration(option)}</button>)}
      </div> : null}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="shoot-field"><span className="label-xs-semibold">{label}</span>{children}{hint ? <small className="shoot-field-hint label-xs">{hint}</small> : null}</label>;
}

function updatePracticalInfo(key: keyof CallSheet["practicalInfo"], value: string, mutate: (updater: (current: CallSheet) => CallSheet) => void) {
  mutate((current) => ({ ...current, practicalInfo: { ...current.practicalInfo, [key]: value } }));
}

function getScheduleClashes(entries: ProductionEntry[]) {
  const clashes = new Map<string, ScheduleClash>();
  const timed = entries.filter((entry) => entry.startTime && entry.durationMinutes);

  const addClash = (entry: ProductionEntry, conflict: ProductionEntry, overlapMinutes: number) => {
    const clash: ScheduleClash = {
      entry: conflict,
      overlapMinutes,
      suggestedStartTime: minutesToTime(timeToMinutes(conflict.startTime) + conflict.durationMinutes),
      sharedLocation: Boolean(entry.locationId && entry.locationId === conflict.locationId),
      sharedPeople: entry.personIds.some((personId) => conflict.personIds.includes(personId)),
    };
    const existing = clashes.get(entry.id);
    const clashStrength = Number(clash.sharedLocation) + Number(clash.sharedPeople);
    const existingStrength = existing ? Number(existing.sharedLocation) + Number(existing.sharedPeople) : -1;
    if (!existing || clashStrength > existingStrength || (clashStrength === existingStrength && overlapMinutes > existing.overlapMinutes)) clashes.set(entry.id, clash);
  };

  timed.forEach((entry, index) => {
    const entryStart = timeToMinutes(entry.startTime);
    const entryEnd = entryStart + entry.durationMinutes;
    timed.slice(index + 1).forEach((other) => {
      const otherStart = timeToMinutes(other.startTime);
      const otherEnd = otherStart + other.durationMinutes;
      const overlapMinutes = Math.min(entryEnd, otherEnd) - Math.max(entryStart, otherStart);
      if (overlapMinutes <= 0) return;
      addClash(entry, other, overlapMinutes);
      addClash(other, entry, overlapMinutes);
    });
  });

  return clashes;
}

function getClashDetail(clash: ScheduleClash) {
  const shared = clash.sharedPeople && clash.sharedLocation
    ? " They share people and a location."
    : clash.sharedPeople
      ? " They share people."
      : clash.sharedLocation
        ? " They use the same location."
        : "";
  return `Overlaps with ${clash.entry.description} by ${clash.overlapMinutes} minutes.${shared}`;
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(value: number) {
  const normalised = ((value % (24 * 60)) + (24 * 60)) % (24 * 60);
  return `${String(Math.floor(normalised / 60)).padStart(2, "0")}:${String(normalised % 60).padStart(2, "0")}`;
}

function emptyPersonDraft(callTime: string, activeDayId: string): PersonDraft {
  return { name: "", type: "crew", role: "", contactSource: "saved-contact", phone: "", email: "", callTime, shootDayIds: activeDayId ? [activeDayId] : [] };
}

function personToDraft(person: ShootPerson): PersonDraft {
  return { ...person };
}

function formatPersonContact(person: ShootPerson) {
  return [person.name, person.role, person.phone].filter(Boolean).join(" · ");
}

function emptyLocationDraft(activeDayId: string): LocationDraft {
  return { name: "", address: "", wifi: "", accessibility: "", parking: "", access: "", notes: "", shootDayIds: activeDayId ? [activeDayId] : [] };
}

function locationToDraft(location: ShootLocation): LocationDraft {
  return { ...location, wifi: "", accessibility: "", parking: "", access: "", notes: mergeLocationPracticalDetails(location) };
}

function getLocationNotes(location: ShootLocation) {
  return mergeLocationPracticalDetails(location);
}

function mergeLocationPracticalDetails(location: ShootLocation, fallback?: { wifi?: string; accessibility?: string }) {
  let notes = location.notes.trim();
  const details = [
    ["Parking", location.parking.trim()],
    ["Access", location.access.trim()],
    ["Accessibility", location.accessibility?.trim() || fallback?.accessibility?.trim() || ""],
    ["Wi-Fi", location.wifi?.trim() || fallback?.wifi?.trim() || ""],
  ] as const;
  details.forEach(([label, detail]) => {
    if (!detail || new RegExp(`^${label}:`, "imu").test(notes)) return;
    notes = `${notes}${notes ? "\n" : ""}${label}: ${detail}`;
  });
  return notes;
}

function normaliseSimpleShootCallSheet(callSheet: CallSheet): CallSheet {
  const legacyPracticalInfo = callSheet.practicalInfo;
  const notes = [callSheet.notes.trim(), legacyPracticalInfo.access.trim()].filter(Boolean).join("\n\n");
  return {
    ...callSheet,
    notes,
    locations: callSheet.locations.map((location) => ({
      ...location,
      notes: mergeLocationPracticalDetails(location, { wifi: legacyPracticalInfo.wifi, accessibility: legacyPracticalInfo.accessibility }),
      wifi: "",
      accessibility: "",
      parking: "",
      access: "",
    })),
    practicalInfo: {
      ...legacyPracticalInfo,
      wifi: "",
      access: "",
      safety: "",
      accessibility: "",
    },
    visibleOptionalSections: callSheet.visibleOptionalSections.filter((section) => section !== "practical"),
  };
}

function deriveLocationName(address: string) {
  return address.split(",")[0]?.trim() || address.trim();
}

function getInitials(name: string) {
  return name.split(/\s+/u).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function normalisePhone(phone: string) {
  return phone.replace(/[^+\d]/gu, "");
}

function formatEditorDate(value: string) {
  if (!value) return "Choose date";
  const parts = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).formatToParts(new Date(`${value}T00:00:00Z`));
  const day = parts.find((part) => part.type === "day")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const year = parts.find((part) => part.type === "year")?.value;
  return `${day} ${month}, ${year}`;
}

function getFollowingDate(value?: string) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function getLatestShootDate(days: ShootDay[]) {
  return days.map((day) => day.date).filter(Boolean).sort().at(-1);
}

function roundTimeToFifteen(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
  const roundedMinutes = Math.round((hours * 60 + minutes) / 15) * 15;
  const nextHours = Math.floor(roundedMinutes / 60) % 24;
  const nextMinutes = roundedMinutes % 60;
  return `${String(nextHours).padStart(2, "0")}:${String(nextMinutes).padStart(2, "0")}`;
}

function parseTimeInput(value: string) {
  const normalised = value.trim().toLowerCase().replaceAll(".", "").replace(/\s+/g, "");
  if (!normalised) return "";
  const periodMatch = normalised.match(/(am|pm)$/);
  const period = periodMatch?.[1];
  const timePart = period ? normalised.slice(0, -period.length) : normalised;
  let hours: number;
  let minutes: number;

  if (timePart.includes(":")) {
    const parts = timePart.split(":");
    if (parts.length !== 2 || !/^\d{1,2}$/.test(parts[0]) || !/^\d{1,2}$/.test(parts[1])) return null;
    hours = Number(parts[0]);
    minutes = Number(parts[1]);
  } else if (/^\d{3,4}$/.test(timePart)) {
    hours = Number(timePart.slice(0, -2));
    minutes = Number(timePart.slice(-2));
  } else if (/^\d{1,2}$/.test(timePart)) {
    hours = Number(timePart);
    minutes = 0;
  } else {
    return null;
  }

  if (minutes > 59) return null;
  if (period) {
    if (hours < 1 || hours > 12) return null;
    hours = hours % 12 + (period === "pm" ? 12 : 0);
  } else if (hours > 23) {
    return null;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours} hr ${remainingMinutes} min` : `${hours} hr`;
}

function getDisplayedWeather(weather: string, hasShootDetails: boolean) {
  if (!hasShootDetails) return "Weather will appear after a date and primary location are set.";
  return weather.startsWith("Weather will appear") ? "22°C · Partly cloudy · 10% rain" : weather;
}

function suggestEmergencyInfo(location?: ShootLocation): SafetyEmergencyInfo {
  const address = location?.address.toLowerCase() ?? "";
  if (address.includes("vic")) return { hospitalName: "The Royal Melbourne Hospital Emergency Department", hospitalAddress: "300 Grattan Street, Parkville VIC 3050", hospitalPhone: "03 9342 7000", travelTime: "Approximately 14 minutes away", emergencyNumber: "000", confirmed: false, needsReview: false };
  if (address.includes("qld")) return { hospitalName: "Royal Brisbane and Women's Hospital Emergency Department", hospitalAddress: "Butterfield Street, Herston QLD 4029", hospitalPhone: "07 3646 8111", travelTime: "Approximately 16 minutes away", emergencyNumber: "000", confirmed: false, needsReview: false };
  if (address.includes("sa ")) return { hospitalName: "Royal Adelaide Hospital Emergency Department", hospitalAddress: "Port Road, Adelaide SA 5000", hospitalPhone: "08 7074 0000", travelTime: "Approximately 12 minutes away", emergencyNumber: "000", confirmed: false, needsReview: false };
  if (address.includes("thirroul") || address.includes("wollongong")) return { hospitalName: "Wollongong Hospital Emergency Department", hospitalAddress: "348-352 Crown Street, Wollongong NSW 2500", hospitalPhone: "02 4222 5000", travelTime: "Approximately 18 minutes away", emergencyNumber: "000", confirmed: false, needsReview: false };
  return { hospitalName: "Sydney Hospital Emergency Department", hospitalAddress: "8 Macquarie Street, Sydney NSW 2000", hospitalPhone: "02 9382 7111", travelTime: "Approximately 12 minutes away", emergencyNumber: "000", confirmed: false, needsReview: false };
}

function emptyEmergencyInfo(): SafetyEmergencyInfo {
  return {
    hospitalName: "",
    hospitalAddress: "",
    hospitalPhone: "",
    travelTime: "",
    emergencyNumber: "000",
    confirmed: false,
    needsReview: false,
  };
}

function markEmergencyDetailsForReview(info?: SafetyEmergencyInfo): SafetyEmergencyInfo | undefined {
  if (!info) return undefined;
  return { ...info, confirmed: false, needsReview: true };
}

function entryPlaceholder(type: ScheduleType) {
  const placeholders: Record<ScheduleType, string> = {
    shot: "e.g. Founder interview",
    setup: "e.g. Lighting and camera setup",
    lunch: "e.g. Crew lunch",
    travel: "e.g. Travel to second location",
    break: "e.g. Coffee break",
  };
  return placeholders[type];
}

function shootPlanPreferencesStorageKey(projectId: string) {
  return `brisk-shoot-plan-preferences-${projectId}-v2`;
}

function createEmptyShootDay(id = "day-1"): ShootDay {
  return {
    id,
    label: "Day 1",
    date: "",
    generalCallTime: "",
    expectedWrapTime: "",
    primaryLocationId: "",
  };
}

function isCallSheetConfigured(callSheet: CallSheet) {
  const hasConfiguredDay = callSheet.days.some((day) => Boolean(day.date || day.generalCallTime || day.expectedWrapTime || day.primaryLocationId));
  const hasScheduleContent = callSheet.entries.some((entry) => entry.type !== "shot" || Boolean(entry.startTime));
  return hasConfiguredDay
    || hasScheduleContent
    || callSheet.people.length > 0
    || callSheet.locations.length > 0
    || Boolean(callSheet.notice.trim() || callSheet.notes.trim() || callSheet.onTheDayContact.trim())
    || callSheet.visibleOptionalSections.length > 0;
}

function parseShootPlanPreferences(rawValue: string | null): ShootPlanPreferences | null {
  if (!rawValue) return null;
  try {
    const value: unknown = JSON.parse(rawValue);
    if (!value || typeof value !== "object") return null;
    const preferences = value as Record<string, unknown>;
    if (
      typeof preferences.hasStarted !== "boolean"
      || typeof preferences.shotListEnabled !== "boolean"
      || (preferences.scheduleView !== "schedule" && preferences.scheduleView !== "shots")
    ) return null;
    return {
      hasStarted: preferences.hasStarted,
      callSheetEnabled: typeof preferences.callSheetEnabled === "boolean"
        ? preferences.callSheetEnabled
        : preferences.hasStarted && preferences.scheduleView === "schedule",
      shotListEnabled: preferences.shotListEnabled,
      scheduleView: preferences.scheduleView,
    };
  } catch {
    return null;
  }
}

function validateShootDay(draft: ShootDay, days: ShootDay[], entries: ProductionEntry[], mode: DayDraftMode) {
  if (!draft.date) return "Add a shoot date before saving this day.";
  if (days.some((day) => day.id !== draft.id && day.date === draft.date)) return "Another shoot day already uses this date.";
  if (draft.generalCallTime && draft.expectedWrapTime && draft.expectedWrapTime <= draft.generalCallTime) return "Expected wrap must be later than the general call time.";
  if (mode === "edit" && entries.some((entry) => entry.dayId === draft.id) && !draft.primaryLocationId) return "Choose a primary location because this day already contains schedule entries.";
  return "";
}

function matchesScheduleFilters(entry: ProductionEntry, status: ScheduleStatusFilter, types: ScheduleType[], locationIds: string[], personIds: string[]) {
  if (types.length > 0 && !types.includes(entry.type)) return false;
  if (locationIds.length > 0 && (!entry.locationId || !locationIds.includes(entry.locationId))) return false;
  if (personIds.length > 0 && !personIds.some((personId) => entry.personIds.includes(personId))) return false;
  if (status === "all") return true;
  return status === "done" ? isEntryComplete(entry) : !isEntryComplete(entry);
}

function isEntryComplete(entry: ProductionEntry) {
  return entry.type === "shot"
    ? Boolean(entry.captured ?? entry.completed)
    : Boolean(entry.completed);
}

function formatDayAssignment(assignment: ShootPerson["shootDayIds"], days: ShootDay[]) {
  if (assignment === "all") return "All shoot days";
  return assignment.map((dayId) => days.find((day) => day.id === dayId)?.label).filter(Boolean).join(", ") || "No days";
}
