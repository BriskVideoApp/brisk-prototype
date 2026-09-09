"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  Fragment,
  type CSSProperties,
  type ComponentProps,
  type DragEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { Button } from "../../../Brisk DS/src/app/components/Button";
import type { Project } from "@/components/active-videos/types";
import { BriskDatePicker } from "@/components/brief/BriefPage";
import { BriskSelect } from "@/components/form/BriskSelect";
import { usePrototypeRole, type PrototypeRole } from "@/components/navigation/PrototypeRoleContext";
import { usePeople } from "@/components/people/PeopleDataContext";
import { ProjectStageHeader } from "@/components/project/ProjectStageHeader";
import { useProjectFlow } from "@/components/project/ProjectFlowContext";
import { useProjectStageStatus } from "@/components/project/ProjectStageStatusContext";
import { usePrototypeState } from "@/components/prototype-state/PrototypeStateContext";
import { usePrototypeScenario } from "@/components/prototype-scenarios/PrototypeScenarioContext";
import {
  FloatingCommentShell,
  getFloatingCommentPosition,
  type FloatingCommentPosition,
} from "@/components/script/FloatingCommentShell";
import { ScriptAnnotationPin } from "@/components/script/ScriptAnnotationPin";
import { ScriptMediaPicker, type ScriptMediaPickerOption } from "@/components/script/ScriptMediaPicker";
import { ShareActionRow } from "@/components/share/ShareActionRow";
import { SharedCallSheetPage } from "@/components/shoot/SharedCallSheetPage";
import { useStudioSettings } from "@/components/settings/StudioSettingsContext";
import type { ShootSetupOwner, ShootSetupState } from "@/components/shoot/ShootSetupBuilder";
import { DsIcon, type DsIconName } from "@/components/video-review/DsIcon";
import { mediaAssets, type MediaAssetView } from "@/data/media";
import type { Person } from "@/data/people";
import { selectProjectBrief } from "@/data/prototype-state";
import { scriptUsers, type ScriptComment, type ScriptCommentAnchor } from "@/data/script";
import {
  addMinutes,
  callSheetStorageKey,
  ensureShotNumbers,
  existingPeople,
  formatTime,
  getEmptyCallSheet,
  getInitialCallSheet,
  getMapsLinkLabel,
  getMapsUrl,
  isAssignedToDay,
  shootAccessStorageKey,
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
  type ShotCaptureStatus,
  type ShotGroup,
  type ShotImageSource,
  type ShotPriority,
  type ShotSize,
  type ShootDay,
  type ShootDayAssignment,
  type ShootDayNotes,
  type ShootDocument,
  type ShootLocation,
  type ShootPerson,
  type ShootAssignment,
  type ShootPersonType,
  type ShootVisualReference,
} from "@/data/shoot";

type SaveStatus = "loading" | "saved" | "saving" | "error" | "recovered";
type PersonFilter = "all" | ShootPersonType;
type ScheduleStatusFilter = "all" | "remaining" | "done";
type ScheduleView = "schedule" | "shots";
type ShootMode = "planning" | "on-set";
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
type ExistingShootPlanCoverage = "creative" | "day" | "both";
type ExistingShootPlan = {
  name: string;
  source: "file" | "link";
  url?: string;
  coverage: ExistingShootPlanCoverage;
  addedBy: string;
  addedAt: string;
  secondaryName?: string;
  secondaryUrl?: string;
};
type ShootWorkspaceSection = "quick-start" | "shots" | "questions" | "references" | "locations" | "people" | "schedule" | "notes-documents" | "call-sheet";
type ShootAccessLevel = "viewOnly" | "canEdit" | "canManage";
type ShootAccessSettings = {
  freelancer: ShootAccessLevel;
  client: ShootAccessLevel;
};
type QuickStartCapture = "interviews" | "scripted" | "b-roll" | "not-confirmed";
type ConfirmedQuickStartCapture = Exclude<QuickStartCapture, "not-confirmed">;
type QuickStartStepId = "capture" | "people" | "location" | "date" | "must-haves";
type QuickStartAnswers = {
  captures: QuickStartCapture[];
  people: string;
  peopleNotConfirmed: boolean;
  locationName: string;
  locationAddress: string;
  locationNotConfirmed: boolean;
  shootDate: string;
  dateNotConfirmed: boolean;
  mustHaveShots: string;
  letBriskSuggestShots: boolean;
};
type ShootReadinessAction = "share" | "review" | "approve" | "start";
type SuggestionUndo =
  | { kind: "dismiss-shot"; shots: Array<{ entry: ProductionEntry; shotIndex: number }> }
  | { kind: "dismiss-question"; questions: Array<{ question: InterviewQuestion; questionIndex: number }> };

const scheduleTypeOptions: Array<{ value: ScheduleType; label: string; icon: DsIconName }> = [
  { value: "coverage", label: "Coverage", icon: "video-camera-ds" },
  { value: "setup", label: "Setup", icon: "settings" },
  { value: "lunch", label: "Lunch", icon: "fork-knife" },
  { value: "travel", label: "Travel", icon: "car-simple" },
  { value: "break", label: "Break", icon: "coffee" },
];
const captureStatusOptions: Array<{ value: ShotCaptureStatus; label: string }> = [
  { value: "to-capture", label: "To capture" },
  { value: "captured", label: "Captured" },
  { value: "pickup-needed", label: "Pickup needed" },
  { value: "not-required", label: "Not required" },
];
const quickStartCaptureOptions: Array<{ value: ConfirmedQuickStartCapture; label: string; icon: DsIconName }> = [
  { value: "interviews", label: "Interviews", icon: "quotes" },
  { value: "scripted", label: "Scripted scenes", icon: "film-script" },
  { value: "b-roll", label: "B-roll or general coverage", icon: "video-camera" },
];
const shotCategoryOptions: ShotCategory[] = ["Interview", "Piece to camera", "B-roll", "Demonstration", "Establishing", "Scene / action", "Product / detail"];
const shotSizeOptions: ShotSize[] = ["Extreme close-up", "Close-up", "Medium close-up", "Medium", "Medium wide", "Wide", "Extreme wide"];
const cameraMovementOptions: CameraMovement[] = ["Static", "Handheld", "Pan", "Tilt", "Push in", "Pull out", "Tracking", "Gimbal", "Drone"];
const shotPriorityOptions: Array<{ value: ShotPriority; label: string; icon?: DsIconName }> = [
  { value: "Critical", label: "Critical", icon: "fire-simple" },
  { value: "High", label: "High" },
  { value: "Medium", label: "Medium" },
  { value: "Bonus", label: "Bonus" },
];
const cameraAngleOptions: CameraAngle[] = ["Eye level", "Low angle", "High angle", "Overhead", "Shoulder level", "Hip level", "POV", "Dutch angle", "Other"];
const interiorExteriorOptions: InteriorExterior[] = ["Interior", "Exterior", "Both"];
const lensOptions = ["Wide, 16-35mm", "Standard, 35-70mm", "Telephoto, 70-200mm", "Macro", "Prime", "Zoom", "Custom"];
const gearOptions = ["Tripod", "Monopod", "Shoulder rig", "Handheld", "Gimbal / stabiliser", "Slider / dolly", "Jib / crane", "Drone", "Other"];
const defaultShotFields: ShotFieldId[] = ["captured", "image", "shotNumber", "description", "subject", "location", "category", "size", "movement", "estimatedTime", "notes"];
const allShotFields: Array<{ id: ShotFieldId; label: string; optional?: boolean; help?: string }> = [
  { id: "captured", label: "Captured" }, { id: "image", label: "Image" }, { id: "shotNumber", label: "Shot number" }, { id: "description", label: "Description" },
  { id: "subject", label: "Subject" }, { id: "location", label: "Location" }, { id: "category", label: "Shot type", help: "The kind of coverage, such as interview, demonstration, scene or b-roll." }, { id: "size", label: "Shot size", help: "How tightly the subject is framed, from extreme close-up to extreme wide." },
  { id: "movement", label: "Camera approach", help: "How the camera is handled during the shot, such as static, handheld, pan or tracking." }, { id: "estimatedTime", label: "Est. filming time" }, { id: "notes", label: "Notes" },
  { id: "cameraAngle", label: "Camera angle", optional: true, help: "The camera position relative to the subject, such as eye level, low angle or overhead." }, { id: "lens", label: "Lens", optional: true }, { id: "camera", label: "Camera", optional: true },
  { id: "gear", label: "Gear", optional: true }, { id: "interiorExterior", label: "Interior / Exterior", optional: true },
];
const shotMediaOptions: Array<ScriptMediaPickerOption<ShotImageSource>> = [
  { value: "upload", label: "Upload file", icon: "upload-simple" },
  { value: "project-media", label: "Add from your Media", icon: "play" },
  { value: "stock", label: "Stock footage search", icon: "image-square" },
  { value: "link", label: "Add link", icon: "link" },
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
  const searchParams = useSearchParams();
  const requestedShootMode: ShootMode = searchParams.get("view") === "on-set" ? "on-set" : "planning";
  const initialRequestedShootModeRef = useRef(requestedShootMode);
  const initialRequestedShootSectionRef = useRef(parseShootWorkspaceSection(searchParams.get("section")));
  const requestedShootDayId = searchParams.get("day");
  const { activeScenario } = usePrototypeScenario();
  const isEmptyPlanFixture = searchParams.get("preview") === "empty"
    || activeScenario?.testOverrides?.shootPlanStartsEmpty === true;
  const { selectedRole } = usePrototypeRole();
  const { setProjectStageStatus } = useProjectStageStatus();
  const { state: prototypeState } = usePrototypeState();
  const projectBrief = selectProjectBrief(prototypeState, project.id);
  const { getProjectFlow } = useProjectFlow();
  const projectFlow = getProjectFlow(project);
  const shootStageIndex = projectFlow.stages.indexOf("shoot");
  const scriptStageIndex = projectFlow.stages.indexOf("script");
  const isInterviewLed = briefIncludesInterviews(projectBrief?.fields.liveFootage.value ?? "")
    || (shootStageIndex >= 0 && scriptStageIndex >= 0 && shootStageIndex < scriptStageIndex);
  const { studio } = useStudioSettings();
  const { createPerson, people: directoryPeople, updatePersonIdentity } = usePeople();
  const [callSheet, setCallSheet] = useState<CallSheet>(() => normaliseSimpleShootCallSheet(ensureShotNumbers(getInitialCallSheet(project))));
  const [selectedDayId, setSelectedDayId] = useState(() => getInitialCallSheet(project).days[0]?.id ?? "day-1");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("loading");
  const [toast, setToast] = useState("");
  const [toastAction, setToastAction] = useState<"add-person" | "undo-suggestion" | null>(null);
  const [suggestionUndo, setSuggestionUndo] = useState<SuggestionUndo | null>(null);
  const [entryDraft, setEntryDraft] = useState<EntryDraft | null>(null);
  const [quickEntryDraft, setQuickEntryDraft] = useState<EntryDraft | null>(null);
  const [personDraft, setPersonDraft] = useState<PersonDraft | null>(null);
  const [attachCreatedPersonToQuickEntry, setAttachCreatedPersonToQuickEntry] = useState(false);
  const [assignNewPersonAsContact, setAssignNewPersonAsContact] = useState(false);
  const [isExistingPersonOpen, setIsExistingPersonOpen] = useState(false);
  const [existingPersonAnchor, setExistingPersonAnchor] = useState<HTMLButtonElement | null>(null);
  const [questionPersonTargetId, setQuestionPersonTargetId] = useState<string | null>(null);
  const [locationDraft, setLocationDraft] = useState<LocationDraft | null>(null);
  const [assignNewLocationAsPrimary, setAssignNewLocationAsPrimary] = useState(false);
  const [newLocationShotTargetId, setNewLocationShotTargetId] = useState<string | null>(null);
  const [assignNewLocationToEntryDraft, setAssignNewLocationToEntryDraft] = useState(false);
  const [dayMenuId, setDayMenuId] = useState<string | null>(null);
  const [dayDraft, setDayDraft] = useState<ShootDay | null>(null);
  const [dayDraftMode, setDayDraftMode] = useState<DayDraftMode | null>(null);
  const [dayDraftError, setDayDraftError] = useState("");
  const [deleteDayId, setDeleteDayId] = useState<string | null>(null);
  const [deleteSetupShotId, setDeleteSetupShotId] = useState<string | null>(null);
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
  const [setupState, setSetupState] = useState<ShootSetupState>(() => createInitialShootSetupState(getInitialCallSheet(project), selectedRole));
  const initialSetupRoleRef = useRef(selectedRole);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [skipSetupPath, setSkipSetupPath] = useState<ScheduleView | null>(null);
  const [isExistingPlanOpen, setIsExistingPlanOpen] = useState(false);
  const [existingPlan, setExistingPlan] = useState<ExistingShootPlan | null>(null);
  const [hasStartedShootPlan, setHasStartedShootPlan] = useState(() => {
    if (isEmptyPlanFixture) return false;
    const initialCallSheet = getInitialCallSheet(project);
    return initialCallSheet.entries.length > 0 || isCallSheetConfigured(initialCallSheet);
  });
  const [hasCallSheet, setHasCallSheet] = useState(() => !isEmptyPlanFixture && isCallSheetConfigured(getInitialCallSheet(project)));
  const [isShotListEnabled, setIsShotListEnabled] = useState(() => !isEmptyPlanFixture && getInitialCallSheet(project).entries.length > 0);
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
  const [activeSection, setActiveSection] = useState<ShootWorkspaceSection>("quick-start");
  const [accessSettings, setAccessSettings] = useState<ShootAccessSettings>({ freelancer: "canEdit", client: "viewOnly" });
  const [isAccessOpen, setIsAccessOpen] = useState(false);
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
  const people = callSheet.people.filter((person) => isAssignedToDay(person.shootDayIds, currentDay?.id ?? ""));
  const crew = callSheet.people.filter((person) => person.type === "crew");
  const selectedContactId = crew.find((person) => callSheet.onTheDayContact.startsWith(person.name))?.id ?? "";
  const filteredPeople = people.filter((person) => personFilter === "all" || person.type === personFilter);
  const directoryShootPeople = directoryPeople
    .filter((person) => person.status !== "Archived" && (person.type !== "Client contact" || person.clientId === project.clientId))
    .map((person) => personToShootPerson(person, currentDay?.generalCallTime ?? ""));
  const availableDirectoryPeople = directoryShootPeople.filter((person) => !callSheet.people.some((existing) => isSameShootPerson(existing, person)));
  const peopleDatabase = [
    ...callSheet.people,
    ...availableDirectoryPeople,
    ...existingPeople.filter((person) => !callSheet.people.some((existing) => isSameShootPerson(existing, person))
      && !availableDirectoryPeople.some((existing) => isSameShootPerson(existing, person))),
  ];
  const locations = callSheet.locations.filter((location) => isAssignedToDay(location.shootDayIds, currentDay?.id ?? ""));
  const questions = callSheet.questions.filter((question) => isAssignedToDay(question.shootDayIds, currentDay?.id ?? ""));
  const specialInstructions = [callSheet.notes.trim(), callSheet.practicalInfo.access.trim()].filter(Boolean).join("\n\n");
  const sharedCallSheetHref = `/share/call-sheet/${project.id}?day=${encodeURIComponent(selectedDayId)}`;
  const selectedDayPdfHref = `/share/call-sheet/${project.id}?print=1&day=${encodeURIComponent(selectedDayId)}`;
  const callSheetApprovalFingerprint = useMemo(() => getCallSheetApprovalFingerprint(callSheet), [callSheet]);

  useEffect(() => {
    try {
      const stored = isEmptyPlanFixture ? null : window.localStorage.getItem(callSheetStorageKey(project.id));
      let nextCallSheet = normaliseSimpleShootCallSheet(ensureShotNumbers(isEmptyPlanFixture ? getEmptyCallSheet(project) : getInitialCallSheet(project)));
      if (stored) {
        const parsed = normaliseSimpleShootCallSheet(ensureShotNumbers(JSON.parse(stored) as CallSheet));
        if (parsed.notice.trim() && !parsed.visibleOptionalSections.includes("notice")) {
          parsed.visibleOptionalSections = ["notice", ...parsed.visibleOptionalSections];
        }
        nextCallSheet = parsed;
      }

      const storedPreferences = isEmptyPlanFixture ? null : parseShootPlanPreferences(window.localStorage.getItem(shootPlanPreferencesStorageKey(project.id)));
      const storedSetupState = isEmptyPlanFixture ? null : parseShootSetupState(window.localStorage.getItem(shootSetupStorageKey(project.id)));
      const storedLegacyView = isEmptyPlanFixture ? null : window.localStorage.getItem(`brisk-shoot-view-${project.id}`);
      const hasEntries = nextCallSheet.entries.length > 0;
      const configuredCallSheet = isCallSheetConfigured(nextCallSheet);
      const nextSetupState = storedSetupState ?? createInitialShootSetupState(nextCallSheet, initialSetupRoleRef.current);
      const hasStarted = nextSetupState.scheduleStarted || nextSetupState.shotListStarted || configuredCallSheet || hasEntries || storedPreferences?.hasStarted === true;
      const callSheetEnabled = nextSetupState.scheduleStarted || storedPreferences?.callSheetEnabled
        || configuredCallSheet || (storedPreferences?.hasStarted === true && storedPreferences.scheduleView === "schedule");
      const shotListEnabled = nextSetupState.shotListStarted || storedPreferences?.shotListEnabled || nextCallSheet.entries.some((entry) => entry.type === "shot");
      const preferredView = nextSetupState.phase === "workspace" ? nextSetupState.activePath : storedPreferences?.scheduleView
        ?? (storedLegacyView === "schedule" || storedLegacyView === "shots" ? storedLegacyView : "schedule");

      setCallSheet(nextCallSheet);
      setSetupState(nextSetupState);
      setIsSetupOpen(nextSetupState.phase === "builder");
      setIsWorkspaceOpen(false);
      setSelectedDayId(nextCallSheet.days.some((day) => day.id === requestedShootDayId) ? requestedShootDayId ?? "day-1" : nextCallSheet.days[0]?.id ?? "day-1");
      setHasStartedShootPlan(hasStarted);
      setHasCallSheet(callSheetEnabled);
      setIsShotListEnabled(shotListEnabled);
      setScheduleView(!callSheetEnabled || (preferredView === "shots" && !shotListEnabled) ? (callSheetEnabled ? "schedule" : "shots") : preferredView);
      setSaveStatus("saved");
      setExistingPlan(isEmptyPlanFixture ? null : parseExistingShootPlan(window.localStorage.getItem(existingShootPlanStorageKey(project.id))));
      const storedSection = isEmptyPlanFixture ? null : parseShootWorkspaceSection(window.localStorage.getItem(shootWorkspaceSectionStorageKey(project.id)));
      const availableStoredSection = storedSection === "questions" && !isInterviewLed ? "shots" : storedSection;
      const restoredSection = initialRequestedShootSectionRef.current ?? (hasStarted && availableStoredSection && availableStoredSection !== "quick-start"
        ? availableStoredSection
        : hasStarted
          ? "shots"
          : "quick-start");
      const onSetSections: ShootWorkspaceSection[] = ["schedule", "questions", "call-sheet", "notes-documents"];
      setActiveSection(initialRequestedShootModeRef.current === "on-set" && !onSetSections.includes(restoredSection) ? "schedule" : restoredSection);
      setAccessSettings(isEmptyPlanFixture
        ? { freelancer: "canEdit", client: "viewOnly" }
        : parseShootAccessSettings(window.localStorage.getItem(shootAccessStorageKey(project.id))));
    } catch {
      setSaveStatus("error");
    } finally {
      setHasLoaded(true);
    }
  }, [isEmptyPlanFixture, isInterviewLed, project.id, requestedShootDayId]);

  useEffect(() => {
    if (!hasLoaded || isEmptyPlanFixture) return;
    window.localStorage.setItem(shootWorkspaceSectionStorageKey(project.id), activeSection);
  }, [activeSection, hasLoaded, isEmptyPlanFixture, project.id]);

  useEffect(() => {
    document.body.classList.toggle("is-shoot-setup-screen", activeSection === "quick-start");
    return () => document.body.classList.remove("is-shoot-setup-screen");
  }, [activeSection]);

  useEffect(() => {
    if (!hasLoaded || isEmptyPlanFixture) return;
    window.localStorage.setItem(shootAccessStorageKey(project.id), JSON.stringify(accessSettings));
  }, [accessSettings, hasLoaded, isEmptyPlanFixture, project.id]);

  const initialiseCallSheet = () => {
    const dayId = callSheet.days[0]?.id ?? "day-1";
    const firstDay = callSheet.days[0] ?? createEmptyShootDay(dayId);
    mutateCallSheet((current) => ({
      ...current,
      days: current.days.length ? current.days : [firstDay],
      people: current.people.map((person) => Array.isArray(person.shootDayIds) && person.shootDayIds.length === 0 ? { ...person, shootDayIds: [dayId] } : person),
      locations: current.locations.map((location) => Array.isArray(location.shootDayIds) && location.shootDayIds.length === 0 ? { ...location, shootDayIds: [dayId] } : location),
    }));
    setSelectedDayId(dayId);
    setHasStartedShootPlan(true);
    setHasCallSheet(true);
    setScheduleView("schedule");
  };

  const startShootPlan = (view: ScheduleView, step?: number) => {
    if (view === "schedule") {
      initialiseCallSheet();
    } else {
      setHasStartedShootPlan(true);
      setScheduleView("shots");
      setIsShotListEnabled(true);
    }
    setSetupState((current) => ({
      ...current,
      phase: "builder",
      activePath: view,
      scheduleStarted: current.scheduleStarted || view === "schedule",
      shotListStarted: current.shotListStarted || view === "shots",
      scheduleSkipped: view === "schedule" ? false : current.scheduleSkipped,
      shotListSkipped: view === "shots" ? false : current.shotListSkipped,
      shotListSource: view === "shots" && !current.shotListStarted ? "ai" : current.shotListSource,
      aiGenerated: view === "shots" && !current.shotListStarted ? false : current.aiGenerated,
      scheduleStep: view === "schedule" && typeof step === "number" ? step : current.scheduleStep,
      shotListStep: view === "shots" && typeof step === "number" ? step : current.shotListStep,
      owner: selectedRole === "Customer" ? "client" : "studio",
      status: current.status === "released" ? "released" : "working",
      lastContributor: selectedRole === "Customer" ? "Client" : selectedRole,
      updatedAt: new Date().toISOString(),
    }));
    setHasStartedShootPlan(true);
    setIsWorkspaceOpen(false);
    setIsSetupOpen(true);
  };

  const closeShootSetup = () => {
    const activePath = setupState.activePath;
    setSetupState((current) => ({
      ...current,
      phase: "workspace",
      updatedAt: new Date().toISOString(),
    }));
    if (activePath === "schedule") setHasCallSheet(true);
    if (activePath === "shots") setIsShotListEnabled(true);
    setScheduleView(activePath);
    setIsWorkspaceOpen(false);
    setIsSetupOpen(false);
  };

  const openShootWorkspace = (view: ScheduleView) => {
    setScheduleView(view);
    setSetupState((current) => ({ ...current, activePath: view, phase: "workspace" }));
    setIsWorkspaceOpen(true);
  };

  const confirmSkipSetup = () => {
    if (!skipSetupPath) return;
    setSetupState((current) => ({
      ...current,
      phase: "workspace",
      activePath: skipSetupPath,
      scheduleSkipped: skipSetupPath === "schedule" ? true : current.scheduleSkipped,
      shotListSkipped: skipSetupPath === "shots" ? true : current.shotListSkipped,
      status: "working",
      updatedAt: new Date().toISOString(),
    }));
    setSkipSetupPath(null);
    showToast(skipSetupPath === "schedule" ? "Plan the Day skipped. You can restore it any time." : "Creative Plan skipped. You can restore it any time.");
  };

  const attachExistingPlan = (plan: ExistingShootPlan) => {
    setExistingPlan(plan);
    if (!isEmptyPlanFixture) window.localStorage.setItem(existingShootPlanStorageKey(project.id), JSON.stringify(plan));
    setIsExistingPlanOpen(false);
    showToast("Existing shoot plan attached.");
  };

  const selectScheduleView = (view: ScheduleView) => {
    const isReady = view === "schedule" ? setupState.scheduleComplete : setupState.shotListComplete;
    if (!isReady) {
      startShootPlan(view);
      return;
    }
    setScheduleView(view);
    setSetupState((current) => ({ ...current, activePath: view, phase: "workspace" }));
    if (view === "shots") setIsUnscheduledPanelOpen(false);
    if (!isEmptyPlanFixture) window.localStorage.setItem(`brisk-shoot-view-${project.id}`, view);
  };

  const handoverShootSetup = (owner: ShootSetupOwner) => {
    const status = owner === "client" ? "waiting_on_client" : "waiting_on_studio";
    setSetupState((current) => ({
      ...current,
      owner,
      status,
      lastContributor: selectedRole === "Customer" ? "Client" : selectedRole,
      updatedAt: new Date().toISOString(),
    }));
    setProjectStageStatus(project.id, "shoot", {
      state: owner === "client" ? "waiting" : "in_progress",
      daysAgo: 0,
      assignedTo: owner === "client" ? project.clientName : "Studio",
    });
    showToast(owner === "client" ? "Shoot setup sent to the Client." : "Shoot setup sent to the Studio.");
  };

  const approveShootPlan = () => {
    setSetupState((current) => ({
      ...current,
      status: "released",
      approvalInvalidated: false,
      approvedCallSheetFingerprint: callSheetApprovalFingerprint,
      updatedAt: new Date().toISOString(),
    }));
    setProjectStageStatus(project.id, "shoot", {
      state: "done",
      daysAgo: 0,
      approvedAt: "Today",
      approvedBy: selectedRole === "Customer" ? project.clientName : selectedRole,
    });
    showToast("Shoot plan approved.");
  };

  const unapproveShootPlan = () => {
    setSetupState((current) => ({
      ...current,
      status: "ready_to_finalise",
      approvalInvalidated: false,
      approvedCallSheetFingerprint: undefined,
      updatedAt: new Date().toISOString(),
    }));
    setProjectStageStatus(project.id, "shoot", {
      state: "in_progress",
      daysAgo: 0,
      assignedTo: "Studio",
    });
    showToast("Shoot approval removed.");
  };

  const finaliseCallSheet = () => {
    if (!hasMinimumCallSheetDetails(callSheet) || selectedRole === "Customer") return;
    setSetupState((current) => ({
      ...current,
      status: "released",
      owner: "studio",
      approvalInvalidated: false,
      approvedCallSheetFingerprint: callSheetApprovalFingerprint,
      updatedAt: new Date().toISOString(),
    }));
    setProjectStageStatus(project.id, "shoot", {
      state: "done",
      daysAgo: 0,
      approvedAt: "Today",
      approvedBy: selectedRole,
    });
    showToast("Shoot approved.");
  };

  useEffect(() => {
    if (!hasLoaded || isEmptyPlanFixture) return;
    const preferences: ShootPlanPreferences = {
      hasStarted: hasStartedShootPlan,
      callSheetEnabled: hasCallSheet,
      shotListEnabled: isShotListEnabled,
      scheduleView,
    };
    window.localStorage.setItem(shootPlanPreferencesStorageKey(project.id), JSON.stringify(preferences));
  }, [hasCallSheet, hasLoaded, hasStartedShootPlan, isEmptyPlanFixture, isShotListEnabled, project.id, scheduleView]);

  useEffect(() => {
    if (!hasLoaded || isEmptyPlanFixture) return;
    try {
      window.localStorage.setItem(shootSetupStorageKey(project.id), JSON.stringify(setupState));
    } catch {
      setSaveStatus("error");
    }
  }, [hasLoaded, isEmptyPlanFixture, project.id, setupState]);

  useEffect(() => {
    if (!hasLoaded || setupState.status !== "released") return;

    if (!setupState.approvedCallSheetFingerprint) {
      setSetupState((current) => current.status === "released" && !current.approvedCallSheetFingerprint
        ? { ...current, approvedCallSheetFingerprint: callSheetApprovalFingerprint }
        : current);
      return;
    }

    if (setupState.approvedCallSheetFingerprint === callSheetApprovalFingerprint) return;

    setSetupState((current) => current.status === "released"
      ? {
        ...current,
        status: "ready_to_finalise",
        approvalInvalidated: true,
        approvedCallSheetFingerprint: undefined,
        updatedAt: new Date().toISOString(),
      }
      : current);
    setProjectStageStatus(project.id, "shoot", {
      state: "in_progress",
      daysAgo: 0,
      assignedTo: "Studio",
    });
    showToast("Changes made - approval required again.");
  }, [callSheetApprovalFingerprint, hasLoaded, project.id, setProjectStageStatus, setupState.approvedCallSheetFingerprint, setupState.status]);

  useEffect(() => {
    if (!hasLoaded || isEmptyPlanFixture) return;
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
  }, [callSheet, hasLoaded, isEmptyPlanFixture, project.id]);

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
    setCallSheet((current) => ({ ...ensureShotNumbers(updater(current)), updatedAt: new Date().toISOString() }));
  };

  const showToast = (message: string, action: "add-person" | "undo-suggestion" | null = null) => {
    if (action !== "undo-suggestion") setSuggestionUndo(null);
    setToast(message);
    setToastAction(action);
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = window.setTimeout(() => {
      setToast("");
      setToastAction(null);
      if (action === "undo-suggestion") setSuggestionUndo(null);
    }, 2800);
  };

  const openExistingPersonPicker = (event?: ReactMouseEvent<HTMLButtonElement>) => {
    const activeButton = document.activeElement instanceof HTMLButtonElement ? document.activeElement : null;
    setQuestionPersonTargetId(null);
    setExistingPersonAnchor(event?.currentTarget ?? activeButton);
    setIsExistingPersonOpen(true);
  };

  const openQuestionPersonPicker = (questionId: string, anchor: HTMLButtonElement | null) => {
    setQuestionPersonTargetId(questionId);
    setExistingPersonAnchor(anchor);
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
    type: scheduleView === "shots" ? "shot" : "setup",
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
        dayId: "",
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
    const canBeUntimed = isShot || draft.type === "coverage";
    const startTime = canBeUntimed && draft.timeMode === "unscheduled" ? "" : draft.startTime;
    if ((!canBeUntimed || draft.timeMode === "set") && !startTime) return;
    if (!currentDay && (!canBeUntimed || Boolean(startTime))) return;
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

  const removeSetupShot = (id: string) => {
    mutateCallSheet((current) => ({ ...current, entries: current.entries.filter((entry) => entry.id !== id) }));
    setDeleteSetupShotId(null);
    showToast("Shot deleted.");
  };

  const dismissShotSuggestion = (id: string) => {
    const orderedShots = callSheet.entries
      .filter((entry) => entry.type === "shot")
      .sort((left, right) => (left.shotListOrder ?? 0) - (right.shotListOrder ?? 0));
    const shotIndex = orderedShots.findIndex((entry) => entry.id === id);
    const entry = orderedShots[shotIndex];
    if (!entry?.suggestionStatus) return;
    setSuggestionUndo({ kind: "dismiss-shot", shots: [{ entry, shotIndex }] });
    mutateCallSheet((current) => ({ ...current, entries: current.entries.filter((candidate) => candidate.id !== id) }));
    showToast("Brisk suggestion dismissed.", "undo-suggestion");
  };

  const dismissQuestionSuggestion = (id: string) => {
    const questionIndex = callSheet.questions.findIndex((question) => question.id === id);
    const question = callSheet.questions[questionIndex];
    if (!question?.suggestionStatus) return;
    setSuggestionUndo({ kind: "dismiss-question", questions: [{ question, questionIndex }] });
    mutateCallSheet((current) => ({ ...current, questions: current.questions.filter((candidate) => candidate.id !== id) }));
    showToast("Brisk question suggestion dismissed.", "undo-suggestion");
  };

  const undoSuggestionAction = () => {
    if (!suggestionUndo) return;

    if (suggestionUndo.kind === "dismiss-question") {
      const dismissedQuestions = suggestionUndo.questions;
      mutateCallSheet((current) => {
        const questions = [...current.questions];
        dismissedQuestions
          .filter(({ question }) => !questions.some((candidate) => candidate.id === question.id))
          .sort((left, right) => left.questionIndex - right.questionIndex)
          .forEach(({ question, questionIndex }) => questions.splice(Math.min(questionIndex, questions.length), 0, question));
        return { ...current, questions };
      });
      setSuggestionUndo(null);
      showToast(`${dismissedQuestions.length} Brisk question ${dismissedQuestions.length === 1 ? "suggestion" : "suggestions"} restored.`);
      return;
    }

    const dismissedShots = suggestionUndo.shots;
    mutateCallSheet((current) => {
      const orderedShots = current.entries
        .filter((candidate) => candidate.type === "shot")
        .sort((left, right) => (left.shotListOrder ?? 0) - (right.shotListOrder ?? 0));
      dismissedShots
        .filter(({ entry }) => !current.entries.some((candidate) => candidate.id === entry.id))
        .sort((left, right) => left.shotIndex - right.shotIndex)
        .forEach(({ entry, shotIndex }) => orderedShots.splice(Math.min(shotIndex, orderedShots.length), 0, entry));
      const orderById = new Map(orderedShots.map((candidate, index) => [candidate.id, index]));
      return {
        ...current,
        entries: [
          ...current.entries.map((candidate) => candidate.type === "shot"
            ? { ...candidate, shotListOrder: orderById.get(candidate.id) ?? candidate.shotListOrder }
            : candidate),
          ...dismissedShots
            .filter(({ entry }) => !current.entries.some((candidate) => candidate.id === entry.id))
            .map(({ entry, shotIndex }) => ({ ...entry, shotListOrder: orderById.get(entry.id) ?? shotIndex })),
        ],
      };
    });
    setSuggestionUndo(null);
    showToast(`${dismissedShots.length} Brisk ${dismissedShots.length === 1 ? "suggestion" : "suggestions"} restored.`);
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
    const matchingDirectoryPerson = !draft.id && draft.email.trim()
      ? directoryPeople.find((candidate) => candidate.email.toLocaleLowerCase("en-AU") === draft.email.trim().toLocaleLowerCase("en-AU"))
      : undefined;
    const createdDirectoryPerson = !draft.id && !matchingDirectoryPerson
      ? createPerson(draft.type === "client"
        ? {
            type: "Client contact",
            name: draft.name.trim(),
            email: draft.email.trim(),
            clientId: project.clientId,
            projectIds: [project.id],
          }
        : {
            type: "Freelancer",
            name: draft.name.trim(),
            email: draft.email.trim(),
            jobTitle: draft.role.trim() || personTypeLabels[draft.type],
            defaultRate: 800,
            inviteNow: false,
          })
      : undefined;
    const directoryPerson = matchingDirectoryPerson ?? createdDirectoryPerson;
    const personId = draft.id ?? directoryPerson?.id ?? `person-${Date.now()}`;
    const draftAssignments = draft.assignments?.length ? draft.assignments : [{ id: `assignment-${personId}`, type: draft.type, role: draft.role.trim(), callTime: draft.callTime, shootDayIds: draft.shootDayIds }];
    const assignments = questionPersonTargetId && !draftAssignments.some((assignment) => assignment.type === "talent")
      ? [...draftAssignments, { id: `assignment-talent-${personId}`, type: "talent" as const, role: "Interviewee", callTime: draft.callTime, shootDayIds: draft.shootDayIds }]
      : draftAssignments;
    const person: ShootPerson = {
      ...personFields,
      id: personId,
      name: matchingDirectoryPerson?.name ?? draft.name.trim(),
      email: matchingDirectoryPerson?.email ?? draft.email.trim(),
      phone: matchingDirectoryPerson?.phone || draft.phone.trim(),
      role: draft.role.trim(),
      shootDayIds: draft.shootDayIds,
      assignments,
    };
    const existingDirectoryPerson = directoryPeople.find((candidate) => candidate.id === personId);
    if (draft.id && existingDirectoryPerson) {
      updatePersonIdentity(personId, {
        name: person.name,
        email: person.email.trim(),
        phone: person.phone.trim(),
      });
    } else if (matchingDirectoryPerson && !matchingDirectoryPerson.phone && person.phone) {
      updatePersonIdentity(personId, { phone: person.phone.trim() });
    } else if (createdDirectoryPerson) {
      updatePersonIdentity(personId, { phone: person.phone.trim() });
    }
    mutateCallSheet((current) => ({
      ...current,
      onTheDayContact: assignNewPersonAsContact ? formatPersonContact(person) : current.onTheDayContact,
      people: draft.id && current.people.some((item) => item.id === draft.id)
        ? current.people.map((item) => item.id === draft.id ? person : item)
        : [...current.people, person],
      questions: questionPersonTargetId
        ? current.questions.map((question) => question.id === questionPersonTargetId ? { ...question, personId: person.id } : question)
        : current.questions,
    }));
    if (attachCreatedPersonToQuickEntry && !draft.id) {
      setQuickEntryDraft((current) => current && !current.personIds.includes(person.id)
        ? { ...current, personIds: [...current.personIds, person.id] }
        : current);
    }
    setAttachCreatedPersonToQuickEntry(false);
    setAssignNewPersonAsContact(false);
    setQuestionPersonTargetId(null);
    setPersonDraft(null);
    showToast(draft.id ? "Person updated." : matchingDirectoryPerson ? `${matchingDirectoryPerson.name} reused from People.` : "Person added to the Call Sheet.");
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
    mutateCallSheet((current) => {
      const existing = current.people.find((item) => item.id === person.id);
      const baseAssignments = getShootAssignments(existing ?? person).map((assignment) => ({ ...assignment, shootDayIds: "all" as const }));
      const assignments = questionPersonTargetId && !baseAssignments.some((assignment) => assignment.type === "talent")
        ? [...baseAssignments, { id: `assignment-talent-${person.id}`, type: "talent" as const, role: "Interviewee", callTime: current.days[0]?.generalCallTime ?? "", shootDayIds: "all" as const }]
        : baseAssignments;
      const addedPerson = { ...(existing ?? person), shootDayIds: "all" as const, assignments };
      return {
        ...current,
        people: existing
          ? current.people.map((item) => item.id === existing.id ? addedPerson : item)
          : [...current.people, addedPerson],
        questions: questionPersonTargetId
          ? current.questions.map((question) => question.id === questionPersonTargetId ? { ...question, personId: addedPerson.id } : question)
          : current.questions,
      };
    });
    setQuestionPersonTargetId(null);
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
      wifi: draft.wifi?.trim() ?? "",
      accessibility: draft.accessibility?.trim() ?? "",
      parking: draft.parking.trim(),
      access: draft.access.trim(),
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

  const updatePlanWithBrisk = (answers: QuickStartAnswers) => {
    const result = createBriskShootPlan(callSheet, project, answers, isInterviewLed);
    mutateCallSheet(() => result.callSheet);
    setHasStartedShootPlan(true);
    setIsShotListEnabled(true);
    setSetupState((current) => ({
      ...current,
      phase: "workspace",
      activePath: "shots",
      shotListStarted: true,
      aiGenerated: true,
      status: current.status === "released" ? "released" : "working",
      lastContributor: selectedRole === "Customer" ? "Client" : selectedRole,
      updatedAt: new Date().toISOString(),
    }));
    setActiveSection("shots");
    const parts = [
      result.questionCount ? `${result.questionCount} interview ${result.questionCount === 1 ? "question" : "questions"}` : "",
      result.shotCount ? `${result.shotCount} ${result.shotCount === 1 ? "shot" : "shots"}` : "",
    ].filter(Boolean);
    showToast(parts.length ? `Brisk suggested ${parts.join(" and ")} from your Brief and Script.` : "Your plan is already up to date.");
  };

  const accessLevel: ShootAccessLevel = selectedRole === "Studio Staff"
    ? "canManage"
    : selectedRole === "Studio Freelancer"
      ? accessSettings.freelancer
      : accessSettings.client;
  const canEditShoot = accessLevel !== "viewOnly";
  const canManageShoot = accessLevel === "canManage";
  const isStudioInternal = selectedRole !== "Customer";

  if (hasCallSheet && !currentDay) return null;

  return (
    <main className={`shoot-shell ${activeSection === "quick-start" ? "is-setup-screen" : ""}`}>
      <div className="shoot-main">
        <ProjectStageHeader project={project} activeStage="shoot" showUtilities={false} />
        {!hasLoaded ? <ShootSetupLoading /> : <ShootPreProductionWorkspace
          accessLevel={accessLevel}
          activeSection={activeSection}
          callSheet={callSheet}
          briefCaptures={getBriefShootCaptures(projectBrief?.fields.liveFootage.value ?? "", isInterviewLed)}
          contactOptions={peopleDatabase}
          existingPlan={existingPlan}
          isInterviewLed={isInterviewLed}
          initialShootMode={requestedShootMode}
          isStudioInternal={isStudioInternal}
          persistSetupAnswers={!isEmptyPlanFixture}
          project={project}
          selectedDayId={selectedDayId}
          selectedRole={selectedRole}
          setupState={setupState}
          studioName={studio.details.name}
          onApprove={approveShootPlan}
          onBuildWithBrisk={updatePlanWithBrisk}
          onCallSheetChange={mutateCallSheet}
          onDeleteDay={setDeleteDayId}
          onDeleteShot={setDeleteSetupShotId}
          onDismissQuestionSuggestion={dismissQuestionSuggestion}
          onDismissShotSuggestion={dismissShotSuggestion}
          onEditEntry={(entry) => {
            setDeleteEntryId(null);
            setEntryDraft({ ...entry, timeMode: entry.startTime ? "set" : "unscheduled" });
          }}
          onEditLocation={(location) => setLocationDraft(locationToDraft(location))}
          onEditPerson={(person) => setPersonDraft(personToDraft(person))}
          onAddQuestionPerson={openQuestionPersonPicker}
          onNewLocation={(shotId) => {
            setNewLocationShotTargetId(shotId ?? null);
            openNewLocation();
          }}
          onNewPerson={openExistingPersonPicker}
          onNewScheduleItem={(dayId, startTime) => {
            const day = callSheet.days.find((item) => item.id === dayId) ?? currentDay;
            setSelectedDayId(dayId);
            setScheduleView("schedule");
            setEntryDraft(null);
            setQuickEntryDraft({
              ...createNewEntryDraft(startTime ? "set" : "unscheduled", startTime),
              locationId: day?.primaryLocationId,
            });
          }}
          onNotify={showToast}
          onOpenDocuments={() => setIsDocumentsOpen(true)}
          onOpenExistingPlan={() => setIsExistingPlanOpen(true)}
          onReorderQuestions={reorderQuestion}
          onReorderShots={reorderShotList}
          onRequestReview={handoverShootSetup}
          onSectionChange={setActiveSection}
          onSelectDay={setSelectedDayId}
          onUnapprove={unapproveShootPlan}
        />}
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
        onClose={() => { setAttachCreatedPersonToQuickEntry(false); setAssignNewPersonAsContact(false); setQuestionPersonTargetId(null); setPersonDraft(null); }}
        onDelete={() => personDraft.id ? removePerson(personDraft.id) : undefined}
        onSave={savePerson}
      /> : null}
      {isExistingPersonOpen ? (
        <ExistingPersonPopover
          anchor={existingPersonAnchor}
          existing={peopleDatabase}
          addedPersonIds={callSheet.people.map((person) => person.id)}
          onAdd={addExistingPerson}
          onClose={() => { setIsExistingPersonOpen(false); setQuestionPersonTargetId(null); }}
          onCreate={() => {
            setIsExistingPersonOpen(false);
            const draft = emptyPersonDraft(currentDay?.generalCallTime ?? "", activeDayId);
            setPersonDraft(questionPersonTargetId ? { ...draft, type: "talent" } : draft);
          }}
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
      {deleteSetupShotId ? <DeleteShootShotModal
        entryId={deleteSetupShotId}
        entries={callSheet.entries}
        onCancel={() => setDeleteSetupShotId(null)}
        onConfirm={() => removeSetupShot(deleteSetupShotId)}
      /> : null}
      {skipSetupPath ? <SkipShootModuleModal path={skipSetupPath} onCancel={() => setSkipSetupPath(null)} onConfirm={confirmSkipSetup} /> : null}
      {isExistingPlanOpen ? <ExistingShootPlanModal existingPlan={existingPlan} onClose={() => setIsExistingPlanOpen(false)} onSave={attachExistingPlan} /> : null}
      {isAccessOpen ? <ShootAccessModal settings={accessSettings} onChange={setAccessSettings} onClose={() => setIsAccessOpen(false)} /> : null}
      {toast ? <div className="shoot-toast label-s-semibold" role="status"><DsIcon name="check-circle" size={18} />{toast}{toastAction === "add-person" ? <button className="shoot-text-action label-xs-semibold" type="button" onClick={() => { setToast(""); setToastAction(null); setIsExistingPersonOpen(true); }}>Add another</button> : null}{toastAction === "undo-suggestion" ? <button className="shoot-text-action label-xs-semibold" type="button" onClick={undoSuggestionAction}>Undo</button> : null}</div> : null}
    </main>
  );
}

type ShootPreProductionWorkspaceProps = {
  accessLevel: ShootAccessLevel;
  activeSection: ShootWorkspaceSection;
  briefCaptures: ConfirmedQuickStartCapture[] | null;
  callSheet: CallSheet;
  contactOptions: ShootPerson[];
  existingPlan: ExistingShootPlan | null;
  initialShootMode: ShootMode;
  isInterviewLed: boolean;
  isStudioInternal: boolean;
  persistSetupAnswers: boolean;
  project: Project;
  selectedDayId: string;
  selectedRole: PrototypeRole;
  setupState: ShootSetupState;
  studioName: string;
  onApprove: () => void;
  onBuildWithBrisk: (answers: QuickStartAnswers) => void;
  onCallSheetChange: (updater: (current: CallSheet) => CallSheet) => void;
  onDeleteDay: (dayId: string) => void;
  onDeleteShot: (shotId: string) => void;
  onDismissQuestionSuggestion: (questionId: string) => void;
  onDismissShotSuggestion: (shotId: string) => void;
  onEditEntry: (entry: ProductionEntry) => void;
  onEditLocation: (location: ShootLocation) => void;
  onEditPerson: (person: ShootPerson) => void;
  onAddQuestionPerson: (questionId: string, anchor: HTMLButtonElement | null) => void;
  onNewLocation: (shotId?: string) => void;
  onNewPerson: (event?: ReactMouseEvent<HTMLButtonElement>) => void;
  onNewScheduleItem: (dayId: string, startTime?: string) => void;
  onNotify: (message: string) => void;
  onOpenDocuments: () => void;
  onOpenExistingPlan: () => void;
  onReorderQuestions: (sourceId: string, targetId: string) => void;
  onReorderShots: (sourceId: string, targetId: string) => void;
  onRequestReview: (owner: ShootSetupOwner) => void;
  onSectionChange: (section: ShootWorkspaceSection) => void;
  onSelectDay: (dayId: string) => void;
  onUnapprove: () => void;
};

function ShootPreProductionWorkspace({
  accessLevel,
  activeSection,
  briefCaptures,
  callSheet,
  contactOptions,
  existingPlan,
  initialShootMode,
  isInterviewLed,
  isStudioInternal,
  persistSetupAnswers,
  project,
  selectedDayId,
  selectedRole,
  setupState,
  studioName,
  onApprove,
  onBuildWithBrisk,
  onCallSheetChange,
  onDeleteDay,
  onDeleteShot,
  onDismissQuestionSuggestion,
  onDismissShotSuggestion,
  onEditEntry,
  onEditLocation,
  onEditPerson,
  onAddQuestionPerson,
  onNewLocation,
  onNewPerson,
  onNewScheduleItem,
  onNotify,
  onOpenDocuments,
  onOpenExistingPlan,
  onReorderQuestions,
  onReorderShots,
  onRequestReview,
  onSectionChange,
  onSelectDay,
  onUnapprove,
}: ShootPreProductionWorkspaceProps) {
  const canEdit = accessLevel !== "viewOnly";
  const canManage = accessLevel === "canManage";
  const [quickStartCaptures, setQuickStartCaptures] = useState<QuickStartCapture[]>(briefCaptures ?? ["not-confirmed"]);
  const shots = callSheet.entries.filter((entry) => entry.type === "shot").sort((left, right) => (left.shotListOrder ?? 0) - (right.shotListOrder ?? 0));
  const scheduledCount = callSheet.entries.filter((entry) => Boolean(entry.dayId && entry.startTime)).length;
  const noteCount = callSheet.days.reduce((count, day) => count + Object.values(day.notes ?? emptyShootDayNotes()).filter((value) => value.trim()).length, 0);
  const references = callSheet.visualReferences ?? [];
  const currentDay = callSheet.days.find((day) => day.id === selectedDayId) ?? callSheet.days[0];
  const [readinessAction, setReadinessAction] = useState<ShootReadinessAction | null>(null);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [shootMode, setShootMode] = useState<ShootMode>(initialShootMode);
  const missingReadiness = getMissingCallSheetDetails(callSheet);
  const confirmedQuickStartCaptures = quickStartCaptures.filter((capture) => capture !== "not-confirmed");
  const showInterviewQuestions = confirmedQuickStartCaptures.length
    ? confirmedQuickStartCaptures.includes("interviews")
    : isInterviewLed || callSheet.questions.length > 0;

  useEffect(() => {
    setQuickStartCaptures(briefCaptures ?? ["not-confirmed"]);
  }, [briefCaptures, project.id]);

  useEffect(() => {
    setShootMode(initialShootMode);
  }, [initialShootMode, project.id]);

  useEffect(() => {
    if (!showInterviewQuestions && activeSection === "questions") onSectionChange(shootMode === "on-set" ? "schedule" : "shots");
  }, [activeSection, onSectionChange, shootMode, showInterviewQuestions]);

  const questionsForDay = callSheet.questions.filter((question) => isAssignedToDay(question.shootDayIds, currentDay?.id ?? ""));
  const askedQuestionCount = questionsForDay.filter((question) => question.asked).length;
  const dayScheduledCount = getVisibleOnSetDayEntries(callSheet, currentDay?.id ?? "").length;
  const hasStartedOnSetDay = shootMode === "on-set" && currentDay ? hasOnSetShootStarted(callSheet, currentDay) : false;
  const navigationGroups: Array<{ label: string; items: Array<{ id: ShootWorkspaceSection; label: string; icon: DsIconName; meta?: string }> }> = shootMode === "on-set"
    ? [
      {
        label: currentDay?.label ?? "On set",
        items: [
          { id: "schedule", label: "Shoot day", icon: "clock-clockwise", meta: `${dayScheduledCount} scheduled` },
        ...(showInterviewQuestions ? [{ id: "questions" as const, label: "Interview Questions", icon: "quotes" as const, meta: `${askedQuestionCount} of ${questionsForDay.length} asked` }] : []),
        ],
      },
      {
        label: "Reference",
        items: [
          { id: "call-sheet", label: "Call Sheet", icon: "file-text", meta: "Live plan" },
          { id: "notes-documents", label: "Notes & Documents", icon: "file-text", meta: `${noteCount ? `${noteCount} ${noteCount === 1 ? "note" : "notes"}` : "No notes"} · ${callSheet.documents.length} ${callSheet.documents.length === 1 ? "document" : "documents"}` },
        ],
      },
    ]
    : [
      { label: "Start", items: [{ id: "quick-start", label: "Setup", icon: "sparkle", meta: "Optional" }] },
      {
        label: "What to capture",
        items: [
          { id: "shots", label: "Shot List", icon: "video-camera-ds", meta: `${shots.length} ${shots.length === 1 ? "shot" : "shots"}` },
          ...(showInterviewQuestions ? [{ id: "questions" as const, label: "Interview Questions", icon: "quotes" as const, meta: `${callSheet.questions.length} ${callSheet.questions.length === 1 ? "question" : "questions"}` }] : []),
          { id: "references", label: "Visual References", icon: "image-square", meta: `${references.length} ${references.length === 1 ? "reference" : "references"}` },
        ],
      },
      {
        label: "Plan the day",
        items: [
          { id: "schedule", label: "Schedule", icon: "clock-clockwise", meta: `${callSheet.days.length} shoot ${callSheet.days.length === 1 ? "day" : "days"} · ${scheduledCount} scheduled` },
          { id: "locations", label: "Locations", icon: "push-pin-simple", meta: callSheet.locations.length ? `${callSheet.locations.length} ${callSheet.locations.length === 1 ? "location" : "locations"}` : "Not confirmed" },
          { id: "people", label: "People", icon: "users-three", meta: `${callSheet.people.length} ${callSheet.people.length === 1 ? "person" : "people"}` },
          { id: "call-sheet", label: "Call Sheet", icon: "file-text", meta: "Preview and publish" },
          { id: "notes-documents", label: "Notes & Documents", icon: "file-text", meta: `${noteCount ? `${noteCount} ${noteCount === 1 ? "note" : "notes"}` : "No notes"} · ${callSheet.documents.length} ${callSheet.documents.length === 1 ? "document" : "documents"}` },
        ],
      },
    ];
  const allNavigationItems = navigationGroups.flatMap((group) => group.items);
  const guidedDaySections: ShootWorkspaceSection[] = ["schedule", "locations", "people", "notes-documents"];
  const guidedDayIndex = guidedDaySections.indexOf(activeSection);

  const runReadinessAction = (action: ShootReadinessAction, next: () => void) => {
    if (!missingReadiness.length) {
      next();
      return;
    }
    setReadinessAction(action);
    setPendingAction(() => next);
  };

  const changeShootMode = (nextMode: ShootMode) => {
    setShootMode(nextMode);
    const onSetSections: ShootWorkspaceSection[] = ["schedule", "questions", "call-sheet", "notes-documents"];
    const nextSection = nextMode === "on-set" && !onSetSections.includes(activeSection) ? "schedule" : activeSection;
    if (nextSection !== activeSection) onSectionChange(nextSection);
    const url = new URL(window.location.href);
    url.searchParams.set("section", nextSection);
    if (nextMode === "on-set") {
      url.searchParams.set("view", "on-set");
      if (currentDay?.id) url.searchParams.set("day", currentDay.id);
    } else {
      url.searchParams.delete("view");
    }
    window.history.replaceState(window.history.state, "", url);
  };

  const selectNavigationItem = (itemId: ShootWorkspaceSection) => {
    onSectionChange(itemId);
    const url = new URL(window.location.href);
    url.searchParams.set("section", itemId);
    window.history.replaceState(window.history.state, "", url);
  };
  const selectOnSetDay = (dayId: string) => {
    onSelectDay(dayId);
    const url = new URL(window.location.href);
    url.searchParams.set("day", dayId);
    window.history.replaceState(window.history.state, "", url);
  };
  const openCurrentOnSetBlock = (entryId: string) => {
    selectNavigationItem("schedule");
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      const entry = [...document.querySelectorAll<HTMLElement>("[data-on-set-entry-id]")].find((candidate) => candidate.dataset.onSetEntryId === entryId);
      entry?.scrollIntoView({ behavior: "smooth", block: "center" });
    }));
  };

  useEffect(() => {
    if (shootMode !== "on-set") return;
    const onSetSections: ShootWorkspaceSection[] = ["schedule", "questions", "call-sheet", "notes-documents"];
    if (!onSetSections.includes(activeSection)) onSectionChange("schedule");
  }, [activeSection, onSectionChange, shootMode]);

  const updateCallSheet = (updater: (current: CallSheet) => CallSheet) => {
    if (canEdit) onCallSheetChange(updater);
  };

  let sectionContent: ReactNode;
  if (activeSection === "quick-start") {
    sectionContent = <ShootQuickStart
      briefCaptures={briefCaptures}
      callSheet={callSheet}
      canEdit={canEdit}
      contactOptions={contactOptions}
      onBuild={onBuildWithBrisk}
      onCallSheetChange={updateCallSheet}
      onCaptureChange={setQuickStartCaptures}
      persistAnswers={persistSetupAnswers}
      projectId={project.id}
    />;
  } else if (activeSection === "shots") {
    sectionContent = <PreProductionShotList
      callSheet={callSheet}
      canEdit={canEdit}
      entries={shots}
      mode={shootMode}
      onChange={updateCallSheet}
      onCommentChange={onCallSheetChange}
      onDelete={onDeleteShot}
      projectId={project.id}
      selectedRole={selectedRole}
      selectedDayId={currentDay?.id ?? ""}
    />;
  } else if (activeSection === "questions") {
    sectionContent = <PreProductionInterviewQuestions
      availablePeople={callSheet.people.filter((person) => getShootAssignments(person).some((assignment) => assignment.type === "talent"))}
      callSheet={callSheet}
      canEdit={canEdit}
      mode={shootMode}
      selectedDayId={currentDay?.id ?? ""}
      onAddPerson={onAddQuestionPerson}
      onChange={updateCallSheet}
      onReorder={onReorderQuestions}
    />;
  } else if (activeSection === "references") {
    sectionContent = <PreProductionVisualReferences callSheet={callSheet} canEdit={canEdit} onChange={updateCallSheet} projectId={project.id} />;
  } else if (activeSection === "locations") {
    sectionContent = <PreProductionLocations callSheet={callSheet} canEdit={canEdit} onEdit={onEditLocation} onNew={() => onNewLocation()} />;
  } else if (activeSection === "people") {
    sectionContent = <PreProductionPeople callSheet={callSheet} canEdit={canEdit} isStudioInternal={isStudioInternal} onChange={updateCallSheet} onEdit={onEditPerson} onNew={onNewPerson} />;
  } else if (activeSection === "schedule") {
    sectionContent = <PreProductionSchedule
      callSheet={callSheet}
      canEdit={canEdit}
      mode={shootMode}
      projectId={project.id}
      selectedDayId={currentDay?.id ?? ""}
      onChange={updateCallSheet}
      onDeleteDay={onDeleteDay}
      onEditEntry={onEditEntry}
      onNewEntry={onNewScheduleItem}
      onSelectDay={onSelectDay}
    />;
  } else if (activeSection === "notes-documents") {
    sectionContent = <div className="shoot-notes-documents">
      <PreProductionNotes callSheet={callSheet} canEdit={canEdit} isStudioInternal={isStudioInternal} selectedDayId={currentDay?.id ?? ""} onChange={updateCallSheet} onSelectDay={onSelectDay} />
      <PreProductionDocuments callSheet={callSheet} canEdit={canEdit} onChange={updateCallSheet} onOpenDocuments={onOpenDocuments} />
    </div>;
  } else {
    sectionContent = <section className="shoot-preproduction-call-sheet">
      <header className="shoot-preproduction-call-sheet-actions">
        <div>
          <h2>Call Sheet</h2>
          <p className="paragraph-s">{shootMode === "on-set" ? "Use the live Call Sheet as a reference throughout the shoot day." : "The Call Sheet updates as Planning changes and can be published for the crew."}</p>
        </div>
        <div className="shoot-call-sheet-action-group">
          <a className="shoot-button secondary label-s-semibold" href={`/share/call-sheet/${project.id}?day=${encodeURIComponent(currentDay?.id ?? "")}`} target="_blank" rel="noreferrer"><DsIcon name="arrow-bend-up-right" size={16} />Open Call Sheet</a>
          <a className="shoot-button secondary label-s-semibold" href={`/share/call-sheet/${project.id}?print=1&day=${encodeURIComponent(currentDay?.id ?? "")}`} target="_blank" rel="noreferrer"><DsIcon name="download-simple" size={16} />PDF</a>
          {!canManage ? <Link className="shoot-button secondary label-s-semibold" href={`/chat?project=${project.id}`}><DsIcon name="chat-circle" size={16} />Comment</Link> : null}
          {!canManage && ((selectedRole === "Customer" && setupState.status === "waiting_on_client") || (selectedRole === "Studio Freelancer" && setupState.status === "waiting_on_studio")) ? <button className="shoot-button primary label-s-semibold" type="button" onClick={() => runReadinessAction("approve", onApprove)}><DsIcon name="thumbs-up-like-fill" size={16} />Approve Shoot</button> : null}
        </div>
      </header>
      {setupState.approvalInvalidated ? <ShootApprovalChangedNotice /> : null}
      {existingPlan ? <ExistingPlanCallSheetAttachment plan={existingPlan} onReplace={onOpenExistingPlan} onNotify={onNotify} /> : null}
      <div className="shoot-live-call-sheet-frame">
        <SharedCallSheetPage
          project={project}
          previewMode={false}
          printMode={false}
          embedded
          embeddedCallSheet={callSheet}
          canEdit={shootMode === "planning" && canEdit}
          isStudioInternal={isStudioInternal}
          onEmbeddedChange={updateCallSheet}
        />
      </div>
    </section>;
  }

  return <div className={`shoot-preproduction-shell is-mode-${shootMode}`}>
    <header className="shoot-preproduction-heading">
      <h1 className="sr-only">{shootMode === "on-set" ? "On set" : "Planning"}</h1>
      <div className="shoot-workspace-mode-switch" role="tablist" aria-label="Shoot mode">
        <button data-mode="planning" className={shootMode === "planning" ? "active" : ""} type="button" role="tab" aria-selected={shootMode === "planning"} onClick={() => changeShootMode("planning")}>
          <span className="shoot-workspace-mode-title headings-s-bold">Planning</span>
          <span className="shoot-workspace-mode-description label-xs">Build the shoot plan</span>
        </button>
        <button data-mode="on-set" className={shootMode === "on-set" ? "active" : ""} type="button" role="tab" aria-selected={shootMode === "on-set"} onClick={() => changeShootMode("on-set")}>
          <span className="shoot-workspace-mode-title headings-s-bold">On set</span>
          <span className="shoot-workspace-mode-description label-xs">Run the shoot</span>
        </button>
      </div>
      {shootMode === "on-set" && currentDay && !hasStartedOnSetDay ? <div className="shoot-workspace-day-context">
        <BriskSelect ariaLabel="Choose shoot day" clearable={false} searchable={false} value={currentDay.id} options={callSheet.days.map((day) => ({ value: day.id, label: day.date ? `${day.label} - ${formatEditorDate(day.date)}` : day.label }))} placeholder="Choose day" onChange={(value) => { if (value) selectOnSetDay(value); }} />
      </div> : null}
    </header>

    {shootMode === "on-set" && currentDay && hasStartedOnSetDay ? <OnSetNowNextStrip callSheet={callSheet} day={currentDay} onOpenCurrent={openCurrentOnSetBlock} onSelectDay={selectOnSetDay} /> : null}

    <div className="shoot-preproduction-mobile-select">
      <BriskSelect
        ariaLabel="Choose Shoot section"
        clearable={false}
        searchable={false}
        value={activeSection}
        options={allNavigationItems.map((item) => ({ value: item.id, label: `${item.label} - ${item.meta ?? ""}`, icon: item.icon }))}
        placeholder="Choose section"
        onChange={(value) => { if (value) selectNavigationItem(value); }}
      />
    </div>

    <div className="shoot-preproduction-layout">
      <aside className="shoot-preproduction-navigation" aria-label="Shoot sections">
        {navigationGroups.map((group) => <section key={group.label}>
          <h2 className="label-xs-semibold">{group.label}</h2>
          <div>{group.items.map((item) => {
            const isActive = activeSection === item.id;
            return <button className={isActive ? "active" : ""} type="button" aria-current={isActive ? "page" : undefined} key={item.id} onClick={() => selectNavigationItem(item.id)}>
            <DsIcon name={item.icon} size={17} />
            <span><strong className="label-s-semibold">{item.label}</strong><small className="label-xs">{item.meta}</small></span>
          </button>;
          })}</div>
        </section>)}
      </aside>
      <div className="shoot-preproduction-content">
        {shootMode === "planning" && existingPlan && activeSection !== "quick-start" ? <aside className="shoot-existing-plan-summary">
          <span><DsIcon name={existingPlan.source === "link" ? "link" : "file-text"} size={20} /></span>
          <div><strong>Existing plan attached</strong><small className="label-xs">{existingPlan.name} · {formatExistingPlanCoverage(existingPlan.coverage)} · Added by {existingPlan.addedBy} on {existingPlan.addedAt}</small></div>
          {existingPlan.url ? <a className="shoot-button secondary label-xs-semibold" href={existingPlan.url} target="_blank" rel="noreferrer">Open</a> : null}
          {canEdit ? <button className="shoot-button secondary label-xs-semibold" type="button" onClick={onOpenExistingPlan}>Replace</button> : null}
          {canManage ? <button className="shoot-text-action label-xs-semibold" type="button" onClick={() => onNotify("Review requested for the attached plan.")}>Request review</button> : null}
        </aside> : null}
        {sectionContent}
        {shootMode === "planning" && guidedDayIndex >= 0 ? <nav className="shoot-guided-section-actions" aria-label="Plan the Day navigation">
          <button className="shoot-button secondary label-s-semibold" type="button" disabled={guidedDayIndex === 0} onClick={() => onSectionChange(guidedDaySections[guidedDayIndex - 1])}><DsIcon name="arrow-left" size={16} />Back</button>
          <button className="shoot-text-action label-s-semibold" type="button" onClick={() => onSectionChange(guidedDayIndex < guidedDaySections.length - 1 ? guidedDaySections[guidedDayIndex + 1] : "schedule")}>Skip for now</button>
          {guidedDayIndex < guidedDaySections.length - 1 ? <button className="shoot-button primary label-s-semibold" type="button" onClick={() => onSectionChange(guidedDaySections[guidedDayIndex + 1])}>Continue<DsIcon name="arrow-right" size={16} /></button> : <button className="shoot-button primary label-s-semibold" type="button" onClick={() => onSectionChange("schedule")}>Back to Schedule<DsIcon name="arrow-right" size={16} /></button>}
        </nav> : null}
      </div>
    </div>

    <footer className="shoot-stage-share-footer" aria-label="Shoot sharing and approval">
      <ShareActionRow
        context="shoot"
        userRole={selectedRole}
        projectName={project.name}
        studioName={studioName}
        customerName={project.clientName}
        initialAccess="canComment"
        initialLinkOpens="stageOnly"
        isApproved={setupState.status === "released"}
        approveLabel="Approve Shoot"
        allowRoleApproval={canManage}
        canConfigureLink={selectedRole === "Studio Staff"}
        onApprove={onApprove}
        onRequestReview={(recipient) => onRequestReview(recipient === "customer" ? "client" : "studio")}
        onSendToStudio={() => onRequestReview("studio")}
        onUnapprove={onUnapprove}
        beforeAction={(action, proceed) => runReadinessAction(action === "copy" ? "share" : action, proceed)}
      />
    </footer>

    {readinessAction ? <ShootReadinessModal
      action={readinessAction}
      missing={missingReadiness}
      onAddDetails={() => {
        setReadinessAction(null);
        setPendingAction(null);
        const destination: ShootWorkspaceSection = missingReadiness.includes("Shoot date") || missingReadiness.includes("General call time")
          ? "schedule"
          : missingReadiness.includes("Primary location")
            ? "locations"
            : "people";
        onSectionChange(destination);
      }}
      onCancel={() => { setReadinessAction(null); setPendingAction(null); }}
      onContinue={() => {
        const action = pendingAction;
        setReadinessAction(null);
        setPendingAction(null);
        action?.();
      }}
    /> : null}
  </div>;
}

function ShootQuickStart({ briefCaptures, callSheet, canEdit, contactOptions, onBuild, onCallSheetChange, onCaptureChange, persistAnswers, projectId }: {
  briefCaptures: ConfirmedQuickStartCapture[] | null;
  callSheet: CallSheet;
  canEdit: boolean;
  contactOptions: ShootPerson[];
  onBuild: (answers: QuickStartAnswers) => void;
  onCallSheetChange: (updater: (current: CallSheet) => CallSheet) => void;
  onCaptureChange: (captures: QuickStartCapture[]) => void;
  persistAnswers: boolean;
  projectId: string;
}) {
  const { createPerson } = usePeople();
  const [includeCaptureStep, setIncludeCaptureStep] = useState(briefCaptures === null);
  const [activeStepId, setActiveStepId] = useState<QuickStartStepId>(briefCaptures === null ? "capture" : "people");
  const [answers, setAnswers] = useState<QuickStartAnswers>(() => createInitialQuickStartAnswers(briefCaptures));
  const [mustHaveShotDraft, setMustHaveShotDraft] = useState("");
  const [hasLoadedAnswers, setHasLoadedAnswers] = useState(false);
  const questionSteps: Array<{ id: QuickStartStepId; label: string }> = [
    ...(includeCaptureStep ? [{ id: "capture" as const, label: "What to capture" }] : []),
    { id: "people", label: "People" },
    { id: "location", label: "Location" },
    { id: "date", label: "Date" },
    { id: "must-haves", label: "Must-have shots" },
  ];
  const activeStepIndex = Math.max(0, questionSteps.findIndex((step) => step.id === activeStepId));
  const existingTalent = callSheet.people.filter((person) => getShootAssignments(person).some((assignment) => assignment.type === "talent"));
  const existingDates = callSheet.days.filter((day) => Boolean(day.date));
  const mustHaveShots = parseQuickStartList(answers.mustHaveShots);

  useEffect(() => {
    if (!persistAnswers) {
      setHasLoadedAnswers(true);
      return;
    }
    const storedAnswers = parseQuickStartAnswers(window.localStorage.getItem(quickStartAnswersStorageKey(projectId)));
    if (storedAnswers) {
      setAnswers(storedAnswers);
      setIncludeCaptureStep(briefCaptures === null || !areQuickStartCapturesEqual(storedAnswers.captures, briefCaptures));
    }
    setHasLoadedAnswers(true);
  }, [briefCaptures, persistAnswers, projectId]);

  useEffect(() => {
    if (!hasLoadedAnswers || !persistAnswers) return;
    window.localStorage.setItem(quickStartAnswersStorageKey(projectId), JSON.stringify(answers));
  }, [answers, hasLoadedAnswers, persistAnswers, projectId]);

  useEffect(() => {
    onCaptureChange(answers.captures);
  }, [answers.captures, onCaptureChange]);

  const updateAnswers = (next: Partial<QuickStartAnswers>) => setAnswers((current) => ({ ...current, ...next }));
  const toggleQuickStartCapture = (capture: ConfirmedQuickStartCapture) => setAnswers((current) => {
    const confirmedCaptures = current.captures.filter((value): value is ConfirmedQuickStartCapture => value !== "not-confirmed");
    return {
      ...current,
      captures: confirmedCaptures.includes(capture)
        ? confirmedCaptures.filter((value) => value !== capture)
        : [...confirmedCaptures, capture],
    };
  });
  const rememberQuickStartPerson = (name: string) => setAnswers((current) => {
    const people = parseQuickStartPeople(current.people);
    if (people.some((person) => normaliseIdentity(person.name) === normaliseIdentity(name))) {
      return { ...current, peopleNotConfirmed: false };
    }
    return { ...current, people: [...people.map((person) => person.name), name].join("; "), peopleNotConfirmed: false };
  });
  const addQuickStartPerson = (person: ShootPerson) => {
    onCallSheetChange((current) => {
      const existing = current.people.find((candidate) => isSameShootPerson(candidate, person));
      const existingAssignments = existing ? getShootAssignments(existing) : getShootAssignments(person);
      const hasTalentAssignment = existingAssignments.some((assignment) => assignment.type === "talent");
      const talentAssignment: ShootAssignment = {
        id: `assignment-quick-start-${Date.now()}`,
        type: "talent",
        role: "",
        callTime: current.days[0]?.generalCallTime ?? "",
        shootDayIds: "all",
      };

      if (existing) {
        if (hasTalentAssignment) return current;
        return {
          ...current,
          people: current.people.map((candidate) => candidate.id === existing.id
            ? { ...candidate, assignments: [...existingAssignments, talentAssignment] }
            : candidate),
        };
      }

      return {
        ...current,
        people: [...current.people, {
          ...person,
          shootDayIds: "all",
          assignments: hasTalentAssignment ? existingAssignments : [...existingAssignments, talentAssignment],
        }],
      };
    });
    rememberQuickStartPerson(person.name);
  };
  const addNamedQuickStartPerson = (value: string) => {
    const name = value.trim();
    if (!name || !canEdit) return;
    const directoryPerson = createPerson({
      type: "Contact",
      name,
      email: "",
      jobTitle: "",
      inviteNow: false,
    });
    addQuickStartPerson(personToShootPerson(directoryPerson, callSheet.days[0]?.generalCallTime ?? ""));
  };
  const removeQuickStartPerson = (person: ShootPerson) => {
    onCallSheetChange((current) => {
      const matchingPerson = current.people.find((candidate) => isSameShootPerson(candidate, person));
      if (!matchingPerson) return current;
      const remainingAssignments = getShootAssignments(matchingPerson).filter((assignment) => assignment.type !== "talent");
      return {
        ...current,
        people: remainingAssignments.length
          ? current.people.map((candidate) => candidate.id === matchingPerson.id
            ? { ...candidate, type: remainingAssignments[0].type, role: remainingAssignments[0].role, assignments: remainingAssignments }
            : candidate)
          : current.people.filter((candidate) => candidate.id !== matchingPerson.id),
      };
    });
    setAnswers((current) => ({
      ...current,
      people: parseQuickStartPeople(current.people)
        .filter((candidate) => normaliseIdentity(candidate.name) !== normaliseIdentity(person.name))
        .map((candidate) => candidate.name)
        .join("; "),
    }));
  };
  const removeQuickStartLocation = (location: ShootLocation) => {
    onCallSheetChange((current) => ({
      ...current,
      days: current.days.map((day) => day.primaryLocationId === location.id ? { ...day, primaryLocationId: "" } : day),
      entries: current.entries.map((entry) => entry.locationId === location.id ? { ...entry, locationId: undefined } : entry),
      locations: current.locations.filter((candidate) => candidate.id !== location.id),
    }));
  };
  const addQuickStartLocation = (draft: LocationDraft) => {
    const locationInput = draft.address.trim();
    if (!canEdit || !locationInput) return;
    const locationInputIsLink = /^https?:\/\//iu.test(locationInput);
    const location: ShootLocation = {
      id: `location-quick-start-${Date.now()}`,
      name: draft.name.trim() || deriveLocationName(locationInput),
      address: locationInputIsLink ? "" : locationInput,
      mapLink: locationInputIsLink ? locationInput : undefined,
      shootDayIds: "all",
      parking: "",
      access: "",
      notes: "",
    };

    onCallSheetChange((current) => {
      const alreadyAdded = current.locations.some((candidate) => {
        const candidateLocation = candidate.mapLink || candidate.address;
        return normaliseIdentity(candidateLocation) === normaliseIdentity(locationInput);
      });
      return alreadyAdded ? current : { ...current, locations: [...current.locations, location] };
    });
    updateAnswers({ locationName: "", locationAddress: "", locationNotConfirmed: false });
  };
  const addQuickStartShootDate = (date: string) => {
    if (!canEdit || !date) return;
    onCallSheetChange((current) => {
      if (current.days.some((day) => day.date === date)) return current;
      const blankDayIndex = current.days.findIndex((day) => !day.date);
      if (blankDayIndex >= 0) {
        return {
          ...current,
          days: current.days.map((day, index) => index === blankDayIndex ? { ...day, date } : day),
        };
      }
      const newDay = createEmptyShootDay(`day-quick-start-${Date.now()}`);
      return {
        ...current,
        days: [...current.days, { ...newDay, label: `Day ${current.days.length + 1}`, date }],
      };
    });
    updateAnswers({ shootDate: "", dateNotConfirmed: false });
  };
  const addQuickStartMustHaveShot = () => {
    const shot = mustHaveShotDraft.trim();
    if (!canEdit || !shot) return;
    const alreadyAdded = mustHaveShots.some((item) => normaliseIdentity(item) === normaliseIdentity(shot));
    updateAnswers({
      mustHaveShots: alreadyAdded ? answers.mustHaveShots : [...mustHaveShots, shot].join("\n"),
      letBriskSuggestShots: false,
    });
    setMustHaveShotDraft("");
  };
  const removeQuickStartMustHaveShot = (shot: string) => {
    updateAnswers({
      mustHaveShots: mustHaveShots.filter((item) => item !== shot).join("\n"),
      letBriskSuggestShots: false,
    });
  };
  const goToRelativeStep = (offset: number) => {
    const nextStep = questionSteps[activeStepIndex + offset];
    if (nextStep) setActiveStepId(nextStep.id);
  };

  let questionContent: ReactNode;
  if (activeStepId === "capture") {
    questionContent = <QuickStartQuestion
      title="What are you planning to capture?"
    >
      <div className="shoot-quick-start-capture-grid" role="group" aria-label="What are you planning to capture?">
        {quickStartCaptureOptions.map((option) => {
          const isSelected = answers.captures.includes(option.value);
          return <button
            className={`shoot-quick-start-capture-option label-s-semibold${isSelected ? " selected" : ""}`}
            type="button"
            key={option.value}
            aria-pressed={isSelected}
            disabled={!canEdit}
            onClick={() => toggleQuickStartCapture(option.value)}
          >
            <span className="shoot-quick-start-capture-icon" aria-hidden="true"><DsIcon name={option.icon} size={16} /></span>
            <span>{option.label}</span>
          </button>;
        })}
      </div>
      <button
        className={`shoot-quick-start-not-sure label-s-semibold${answers.captures.includes("not-confirmed") ? " selected" : ""}`}
        type="button"
        aria-pressed={answers.captures.includes("not-confirmed")}
        disabled={!canEdit}
        onClick={() => {
          updateAnswers({ captures: ["not-confirmed"] });
          goToRelativeStep(1);
        }}
      >
        Not sure yet - decide later
      </button>
    </QuickStartQuestion>;
  } else if (activeStepId === "people") {
    questionContent = <QuickStartQuestion
      title="Who will be on camera?"
    >
      <PeoplePicker
        disabled={!canEdit}
        display="rows"
        label="People"
        people={contactOptions}
        placeholder="Search or add a person"
        selectedIds={existingTalent.map((person) => person.id)}
        showLabel={false}
        onChange={(selectedIds) => existingTalent.filter((person) => !selectedIds.includes(person.id)).forEach(removeQuickStartPerson)}
        onCreatePerson={addNamedQuickStartPerson}
        onSelectPerson={addQuickStartPerson}
      />
      {!existingTalent.length ? <Button size="S" variant={answers.peopleNotConfirmed ? "tertiary" : "secondary"} disabled={!canEdit} onClick={() => updateAnswers({ peopleNotConfirmed: !answers.peopleNotConfirmed })}>
        No one confirmed yet
      </Button> : null}
    </QuickStartQuestion>;
  } else if (activeStepId === "location") {
    questionContent = <QuickStartQuestion
      title="Where might you be filming?"
    >
      <label className="shoot-preproduction-field">
        <span className="sr-only">Google Maps link or address</span>
        <AddressAutocomplete
          autoFocus={false}
          disabled={!canEdit}
          draft={{
            name: answers.locationName,
            address: answers.locationAddress,
            shootDayIds: "all",
            parking: "",
            access: "",
            notes: "",
          }}
          placeholder="Search Google Maps or paste a link"
          onChange={(draft) => updateAnswers({ locationName: draft.name, locationAddress: draft.address, locationNotConfirmed: false })}
          onSubmit={addQuickStartLocation}
        />
        {answers.locationAddress.trim() ? <a className="shoot-location-link label-xs-semibold" href={getMapsUrl(answers.locationAddress)} target="_blank" rel="noreferrer">{getMapsLinkLabel(answers.locationAddress)}</a> : null}
      </label>
      {callSheet.locations.length ? <ul className="shoot-quick-start-location-list" aria-label="Locations added to this shoot">
        {callSheet.locations.map((location) => {
          const mapValue = location.mapLink || location.address;
          return <li key={location.id}>
            <span className="shoot-quick-start-location-icon" aria-hidden="true"><DsIcon name="push-pin-simple" size={16} /></span>
            <span><strong>{location.name}</strong>{mapValue ? <a className="shoot-location-link label-xs" href={getMapsUrl(mapValue)} target="_blank" rel="noreferrer">{getMapsLinkLabel(location.address || mapValue)}</a> : null}</span>
            {canEdit ? <button className="shoot-icon-button" type="button" aria-label={`Remove ${location.name} from this shoot`} onClick={() => removeQuickStartLocation(location)}><DsIcon name="x-close-cross" size={14} /></button> : null}
          </li>;
        })}
      </ul> : null}
    </QuickStartQuestion>;
  } else if (activeStepId === "date") {
    questionContent = <QuickStartQuestion
      title="When might you be filming?"
    >
      <div className="shoot-preproduction-field shoot-quick-start-date-field">
        <BriskDatePicker
          ariaLabel="Shoot date"
          disabled={!canEdit}
          placeholder="Add a shoot date"
          value={answers.shootDate}
          variant="field"
          onChange={addQuickStartShootDate}
        />
      </div>
      {existingDates.length ? <ul className="shoot-quick-start-day-list" aria-label="Shoot days added to this shoot">
        {existingDates.map((day) => <li key={day.id}>
          <span className="shoot-quick-start-day-icon" aria-hidden="true"><DsIcon name="calendar" size={16} /></span>
          <span><strong>{day.label}</strong><small className="label-xs">{formatEditorDate(day.date)}</small></span>
        </li>)}
      </ul> : null}
    </QuickStartQuestion>;
  } else if (activeStepId === "must-haves") {
    questionContent = <QuickStartQuestion
      title="Are there any must-have shots?"
    >
      <div className="shoot-quick-start-entry-row">
        <label className="shoot-preproduction-field">
          <input
            disabled={!canEdit}
            aria-label="Must-have shot"
            placeholder="For example, a product close-up"
            value={mustHaveShotDraft}
            onChange={(event) => { setMustHaveShotDraft(event.target.value); updateAnswers({ letBriskSuggestShots: false }); }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addQuickStartMustHaveShot();
              }
            }}
          />
        </label>
        <Button size="S" variant="secondary" disabled={!canEdit || !mustHaveShotDraft.trim()} onClick={addQuickStartMustHaveShot}>Add shot</Button>
      </div>
      {mustHaveShots.length ? <ul className="shoot-quick-start-must-have-list" aria-label="Must-have shots added to this shoot">
        {mustHaveShots.map((shot) => <li key={shot}>
          <span className="shoot-quick-start-must-have-icon" aria-hidden="true"><DsIcon name="video-camera-ds" size={16} /></span>
          <strong>{shot}</strong>
          {canEdit ? <button className="shoot-icon-button" type="button" aria-label={`Remove ${shot}`} onClick={() => removeQuickStartMustHaveShot(shot)}><DsIcon name="x-close-cross" size={14} /></button> : null}
        </li>)}
      </ul> : null}
    </QuickStartQuestion>;
  }

  return <section className="shoot-preproduction-section shoot-quick-start-section">
    <PreProductionSectionHeading
      icon="sparkle"
      title="Setup"
      description={`Answer ${questionSteps.length} quick questions, then Brisk will generate a draft shoot plan from your Brief and Script.`}
    />
    {briefCaptures && !includeCaptureStep ? <div className="shoot-quick-start-brief-source">
      <span><strong className="label-xs-semibold">Brief answer:</strong><small className="label-s">{formatQuickStartCaptures(briefCaptures)}</small></span>
      <button className="shoot-text-action label-xs-semibold" type="button" disabled={!canEdit} onClick={() => { setIncludeCaptureStep(true); setActiveStepId("capture"); }}>Change</button>
    </div> : null}
    {questionContent}
    <footer className="shoot-quick-start-footer">
      <span className="shoot-quick-start-footer-side">
        {activeStepIndex > 0 ? <Button size="S" variant="secondary" onClick={() => goToRelativeStep(-1)}>Back</Button> : null}
      </span>
      <nav className="brief-step-dots" aria-label="Shoot setup questions">
        {questionSteps.map((step, index) => <button
          className={`brief-step-dot label-xs-semibold ${index === activeStepIndex ? "active" : ""} ${index < activeStepIndex ? "complete" : ""}`}
          type="button"
          key={step.id}
          aria-current={index === activeStepIndex ? "step" : undefined}
          data-tooltip={step.label}
          onClick={() => setActiveStepId(step.id)}
        >
          {index + 1}
        </button>)}
      </nav>
      <span className="shoot-quick-start-footer-side right">
        {activeStepIndex === questionSteps.length - 1 ? <Button size="S" variant="primary" disabled={!canEdit} onClick={() => onBuild(answers)}><span className="shoot-button-content"><DsIcon name="sparkle" size={16} />Generate plan</span></Button> : <Button size="S" variant="primary" onClick={() => goToRelativeStep(1)}>Next</Button>}
      </span>
    </footer>
  </section>;
}

function QuickStartQuestion({ children, existing, title }: {
  children: ReactNode;
  existing?: string;
  title: string;
}) {
  return <div className="shoot-quick-start-question">
    <div className="shoot-quick-start-question-copy">
      <h3 className="headings-xs-bold">{title}</h3>
      {existing ? <small className="shoot-quick-start-existing label-xs">{existing}</small> : null}
    </div>
    <div className="shoot-quick-start-answer">{children}</div>
  </div>;
}

function PreProductionSectionHeading({ icon, title, description, action }: { icon?: DsIconName; title: string; description?: string; action?: ReactNode }) {
  return <header className="shoot-preproduction-section-heading">
    <div>{icon ? <span className="shoot-preproduction-section-icon"><DsIcon name={icon} size={20} /></span> : null}<div><h2>{title}</h2>{description ? <p className="paragraph-s">{description}</p> : null}</div></div>
    {action ? <div>{action}</div> : null}
  </header>;
}

function getShotListTopLevelOrder(callSheet: CallSheet) {
  const groups = [...(callSheet.shotGroups ?? [])].sort((left, right) => left.order - right.order);
  const groupIds = new Set(groups.map((group) => group.id));
  const standaloneShotIds = callSheet.entries
    .filter((entry) => entry.type === "shot" && (!entry.shotGroupId || !groupIds.has(entry.shotGroupId)))
    .sort((left, right) => (left.shotListOrder ?? 0) - (right.shotListOrder ?? 0))
    .map((entry) => entry.id);
  const validIds = new Set([...standaloneShotIds, ...groups.map((group) => group.id)]);
  const nextOrder: string[] = [];
  const addIfMissing = (id: string) => {
    if (!validIds.has(id) || nextOrder.includes(id)) return;
    nextOrder.push(id);
  };

  (callSheet.shotListTopLevelOrder ?? []).forEach(addIfMissing);
  standaloneShotIds.forEach(addIfMissing);
  groups.forEach((group) => addIfMissing(group.id));
  return nextOrder;
}

function applyShotListTopLevelOrder(callSheet: CallSheet, order: string[]) {
  const groupIds = new Set((callSheet.shotGroups ?? []).map((group) => group.id));
  const groupOrderById = new Map(order.filter((id) => groupIds.has(id)).map((id, index) => [id, index]));
  return {
    ...callSheet,
    shotListTopLevelOrder: order,
    shotGroups: (callSheet.shotGroups ?? []).map((group) => ({
      ...group,
      order: groupOrderById.get(group.id) ?? group.order,
    })),
  };
}

function PreProductionShotList({ callSheet, canEdit, entries, mode, onChange, onCommentChange, onDelete, projectId, selectedDayId, selectedRole }: {
  callSheet: CallSheet;
  canEdit: boolean;
  entries: ProductionEntry[];
  mode: ShootMode;
  onChange: (updater: (current: CallSheet) => CallSheet) => void;
  onCommentChange: (updater: (current: CallSheet) => CallSheet) => void;
  onDelete: (shotId: string) => void;
  projectId: string;
  selectedDayId: string;
  selectedRole: PrototypeRole;
}) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropShotId, setDropShotId] = useState<string | null>(null);
  const [dropGroupId, setDropGroupId] = useState<string | null>(null);
  const [dropTopLevelId, setDropTopLevelId] = useState<string | null>(null);
  const [previewShotId, setPreviewShotId] = useState<string | null>(null);
  const [openMenuShotId, setOpenMenuShotId] = useState<string | null>(null);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [commentShotId, setCommentShotId] = useState<string | null>(null);
  const [commentPosition, setCommentPosition] = useState<FloatingCommentPosition | null>(null);
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<string[]>(() => [...(callSheet.shotGroups ?? [])]
    .sort((left, right) => left.order - right.order)
    .slice(1)
    .map((group) => group.id));
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const actionMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const addMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const groupRowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const shotRowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const pendingNewGroupIdRef = useRef<string | null>(null);
  const pendingNewShotIdRef = useRef<string | null>(null);
  const groups = [...(callSheet.shotGroups ?? [])].sort((left, right) => left.order - right.order);
  const groupIds = new Set(groups.map((group) => group.id));
  const standaloneShots = entries.filter((entry) => !entry.shotGroupId || !groupIds.has(entry.shotGroupId));
  const standaloneShotById = new Map(standaloneShots.map((shot) => [shot.id, shot]));
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const topLevelEndDropId = "shot-list-top-level-end";
  const topLevelOrder = getShotListTopLevelOrder(callSheet);
  const planningSections = topLevelOrder.reduce<Array<{ id: string; group: ShotGroup | null; shots: ProductionEntry[] }>>((sections, id) => {
    const standaloneShot = standaloneShotById.get(id);
    if (standaloneShot) {
      sections.push({ id, group: null, shots: [standaloneShot] });
      return sections;
    }
    const group = groupById.get(id);
    if (group) sections.push({ id, group, shots: entries.filter((entry) => entry.shotGroupId === group.id) });
    return sections;
  }, []);
  const topLevelNumberById = new Map(planningSections.map(({ id }, index) => [id, index + 1]));
  const displayShotNumberById = new Map(planningSections.flatMap(({ id, group, shots }) => {
    const topLevelNumber = topLevelNumberById.get(id) ?? 0;
    return shots.map((shot, shotIndex) => [shot.id, group ? `${topLevelNumber}.${shotIndex + 1}` : String(topLevelNumber)] as const);
  }));
  const previewShot = entries.find((entry) => entry.id === previewShotId);
  const commentShot = entries.find((entry) => entry.id === commentShotId);
  const commentShotNumber = commentShot ? displayShotNumberById.get(commentShot.id) ?? String(entries.indexOf(commentShot) + 1) : "";
  const currentCommentUserId = selectedRole === "Customer"
    ? "user-jess"
    : selectedRole === "Studio Freelancer"
      ? "user-david"
      : "user-tom";
  const visibleCommentsForShot = (entry: ProductionEntry) => selectedRole === "Customer"
    ? (entry.comments ?? []).filter((comment) => comment.visibility === "external")
    : entry.comments ?? [];
  const addShot = (targetGroupId?: string) => {
    const id = `entry-${Date.now()}`;
    const shotNumber = Math.max(0, ...entries.map((entry) => entry.shotNumber ?? 0)) + 1;
    const shotListOrder = Math.max(-1, ...entries.map((entry) => entry.shotListOrder ?? -1)) + 1;
    pendingNewShotIdRef.current = id;
    if (targetGroupId) setCollapsedGroupIds((current) => current.filter((groupId) => groupId !== targetGroupId));
    onChange((current) => {
      const currentTopLevelOrder = getShotListTopLevelOrder(current);
      const nextCallSheet: CallSheet = {
        ...current,
        entries: [...current.entries, {
        id,
        dayId: "",
        shotNumber,
        shotListOrder,
        startTime: "",
        durationMinutes: 0,
        description: "New shot",
        type: "shot",
        personIds: [],
        captured: false,
        priority: "Medium",
        captureStatus: "to-capture",
        shotGroupId: targetGroupId ?? null,
      }],
      };
      return applyShotListTopLevelOrder(nextCallSheet, targetGroupId ? currentTopLevelOrder : [...currentTopLevelOrder, id]);
    });
  };
  const addGroup = () => {
    const id = `shot-group-${Date.now()}`;
    pendingNewGroupIdRef.current = id;
    setCollapsedGroupIds((current) => current.filter((groupId) => groupId !== id));
    onChange((current) => {
      const currentTopLevelOrder = getShotListTopLevelOrder(current);
      const nextCallSheet: CallSheet = {
        ...current,
        shotGroups: [...(current.shotGroups ?? []), {
          id,
          name: "New Shot Group",
          description: "Describe the coverage this group needs.",
          order: current.shotGroups?.length ?? 0,
        }],
      };
      return applyShotListTopLevelOrder(nextCallSheet, [...currentTopLevelOrder, id]);
    });
  };
  const updateGroup = (groupId: string, patch: Partial<ShotGroup>) => onChange((current) => ({
    ...current,
    shotGroups: (current.shotGroups ?? []).map((group) => group.id === groupId ? { ...group, ...patch } : group),
  }));
  const toggleGroup = (groupId: string) => {
    const isCollapsed = collapsedGroupIds.includes(groupId);
    setCollapsedGroupIds((current) => isCollapsed ? current.filter((id) => id !== groupId) : [...current, groupId]);
  };
  const reorderTopLevelItem = (sourceId: string, targetId?: string) => {
    if (sourceId === targetId) return;
    onChange((current) => {
      const currentOrder = getShotListTopLevelOrder(current);
      if (!currentOrder.includes(sourceId) || (targetId && !currentOrder.includes(targetId))) return current;
      const nextOrder = currentOrder.filter((id) => id !== sourceId);
      const targetIndex = targetId ? nextOrder.indexOf(targetId) : nextOrder.length;
      nextOrder.splice(targetIndex < 0 ? nextOrder.length : targetIndex, 0, sourceId);
      return applyShotListTopLevelOrder(current, nextOrder);
    });
  };
  const moveShotIntoGroup = (sourceId: string, targetGroupId: string, targetShotId?: string) => {
    if (sourceId === targetShotId) return;
    onChange((current) => {
      const orderedShots = current.entries
        .filter((entry) => entry.type === "shot")
        .sort((left, right) => (left.shotListOrder ?? 0) - (right.shotListOrder ?? 0));
      const sourceIndex = orderedShots.findIndex((entry) => entry.id === sourceId);
      if (sourceIndex < 0) return current;

      const nextShots = [...orderedShots];
      const [sourceShot] = nextShots.splice(sourceIndex, 1);
      const movedShot = { ...sourceShot, shotGroupId: targetGroupId };
      const targetIndex = targetShotId
        ? nextShots.findIndex((entry) => entry.id === targetShotId)
        : nextShots.reduce((lastIndex, entry, index) => entry.shotGroupId === targetGroupId ? index : lastIndex, -1) + 1;
      nextShots.splice(targetIndex < 0 ? nextShots.length : targetIndex, 0, movedShot);
      const shotById = new Map(nextShots.map((entry, index) => [entry.id, { ...entry, shotListOrder: index }]));
      const nextCallSheet: CallSheet = {
        ...current,
        entries: current.entries.map((entry) => entry.type === "shot" ? shotById.get(entry.id) ?? entry : entry),
      };
      return applyShotListTopLevelOrder(nextCallSheet, getShotListTopLevelOrder(current).filter((id) => id !== sourceId));
    });
  };
  const moveShotToTopLevel = (sourceId: string, targetId?: string, placement: "after-source-group" | "end" = "after-source-group") => {
    onChange((current) => {
      const sourceShot = current.entries.find((entry) => entry.type === "shot" && entry.id === sourceId);
      if (!sourceShot) return current;
      const currentOrder = getShotListTopLevelOrder(current);
      if (sourceShot.shotGroupId === null && sourceId === targetId) return current;
      const nextOrder = currentOrder.filter((id) => id !== sourceId);
      const fallbackIndex = sourceShot.shotGroupId ? nextOrder.indexOf(sourceShot.shotGroupId) + 1 : nextOrder.length;
      const targetIndex = targetId ? nextOrder.indexOf(targetId) : placement === "end" ? nextOrder.length : fallbackIndex;
      nextOrder.splice(targetIndex < 0 ? nextOrder.length : targetIndex, 0, sourceId);
      const nextCallSheet: CallSheet = {
        ...current,
        entries: current.entries.map((entry) => entry.id === sourceId ? { ...entry, shotGroupId: null } : entry),
      };
      return applyShotListTopLevelOrder(nextCallSheet, nextOrder);
    });
  };

  useEffect(() => {
    const newGroupId = pendingNewGroupIdRef.current;
    if (!newGroupId || !groups.some((group) => group.id === newGroupId)) return;

    const newGroupRow = groupRowRefs.current[newGroupId];
    if (!newGroupRow) return;

    pendingNewGroupIdRef.current = null;
    newGroupRow.scrollIntoView({ behavior: "smooth", block: "center" });
    window.requestAnimationFrame(() => {
      const nameInput = newGroupRow.querySelector<HTMLInputElement>('input[aria-label="Shot Group name"]');
      nameInput?.focus({ preventScroll: true });
      nameInput?.select();
    });
  }, [groups]);

  useEffect(() => {
    const newShotId = pendingNewShotIdRef.current;
    if (!newShotId || !entries.some((entry) => entry.id === newShotId)) return;

    const newShotRow = shotRowRefs.current[newShotId];
    if (!newShotRow) return;

    pendingNewShotIdRef.current = null;
    newShotRow.scrollIntoView({ behavior: "smooth", block: "center" });
    window.requestAnimationFrame(() => {
      const descriptionInput = newShotRow.querySelector<HTMLInputElement>(".shoot-shot-table-input");
      descriptionInput?.focus({ preventScroll: true });
      descriptionInput?.select();
    });
  }, [entries]);
  const updateShot = (id: string, patch: Partial<ProductionEntry>) => onChange((current) => ({
    ...current,
    entries: current.entries.map((entry) => entry.id === id ? { ...entry, ...patch, suggestionStatus: undefined } : entry),
  }));
  const updateShotComments = (entry: ProductionEntry, previousVisibleComments: ScriptComment[], nextVisibleComments: ScriptComment[]) => {
    const previousVisibleIds = new Set(previousVisibleComments.map((comment) => comment.id));
    const hiddenComments = (entry.comments ?? []).filter((comment) => !previousVisibleIds.has(comment.id));
    onCommentChange((current) => ({
      ...current,
      entries: current.entries.map((candidate) => candidate.id === entry.id
        ? { ...candidate, comments: [...hiddenComments, ...nextVisibleComments] }
        : candidate),
    }));
  };
  const duplicateShot = (entry: ProductionEntry) => onChange((current) => {
    const orderedShots = current.entries
      .filter((candidate) => candidate.type === "shot")
      .sort((left, right) => (left.shotListOrder ?? 0) - (right.shotListOrder ?? 0));
    const sourceIndex = orderedShots.findIndex((candidate) => candidate.id === entry.id);
    if (sourceIndex < 0) return current;
    const isStandalone = !entry.shotGroupId || !(current.shotGroups ?? []).some((group) => group.id === entry.shotGroupId);
    const duplicate: ProductionEntry = {
      ...entry,
      id: `entry-${Date.now()}`,
      shotNumber: Math.max(0, ...orderedShots.map((candidate) => candidate.shotNumber ?? 0)) + 1,
      shotListOrder: sourceIndex + 1,
      startTime: "",
      durationMinutes: 0,
      captured: false,
      completed: undefined,
      suggestionStatus: undefined,
      comments: undefined,
      shotGroupId: isStandalone ? null : entry.shotGroupId,
    };
    const nextShots = [...orderedShots];
    nextShots.splice(sourceIndex + 1, 0, duplicate);
    const orderedShotById = new Map(nextShots.map((shot, index) => [shot.id, { ...shot, shotListOrder: index }]));
    const nextCallSheet: CallSheet = {
      ...current,
      entries: [
        ...current.entries.map((candidate) => candidate.type === "shot"
          ? orderedShotById.get(candidate.id) ?? candidate
          : candidate),
        orderedShotById.get(duplicate.id) ?? duplicate,
      ],
    };
    const currentTopLevelOrder = getShotListTopLevelOrder(current);
    if (!isStandalone) return applyShotListTopLevelOrder(nextCallSheet, currentTopLevelOrder);
    const sourceTopLevelIndex = currentTopLevelOrder.indexOf(entry.id);
    const nextTopLevelOrder = [...currentTopLevelOrder];
    nextTopLevelOrder.splice(sourceTopLevelIndex < 0 ? nextTopLevelOrder.length : sourceTopLevelIndex + 1, 0, duplicate.id);
    return applyShotListTopLevelOrder(nextCallSheet, nextTopLevelOrder);
  });
  useEffect(() => {
    if (!openMenuShotId) return;
    const closeMenu = (event: globalThis.MouseEvent) => {
      if (!actionMenuRef.current?.contains(event.target as Node)) setOpenMenuShotId(null);
    };
    const closeMenuWithKeyboard = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpenMenuShotId(null);
      window.requestAnimationFrame(() => actionMenuTriggerRef.current?.focus());
    };
    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", closeMenuWithKeyboard);
    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", closeMenuWithKeyboard);
    };
  }, [openMenuShotId]);
  useEffect(() => {
    if (!isAddMenuOpen) return;
    const closeMenu = (event: globalThis.MouseEvent) => {
      if (!addMenuRef.current?.contains(event.target as Node)) setIsAddMenuOpen(false);
    };
    const closeMenuWithKeyboard = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsAddMenuOpen(false);
      window.requestAnimationFrame(() => addMenuTriggerRef.current?.focus());
    };
    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", closeMenuWithKeyboard);
    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", closeMenuWithKeyboard);
    };
  }, [isAddMenuOpen]);

  if (mode === "on-set") {
    return <OnSetShotList
      callSheet={callSheet}
      canEdit={canEdit}
      displayShotNumberById={displayShotNumberById}
      entries={entries}
      groups={groups}
      onChange={onChange}
      selectedDayId={selectedDayId}
      onAddShot={addShot}
    />;
  }

  return <>
    <section className="shoot-preproduction-section">
      <PreProductionSectionHeading
        title="Shot List"
        action={<div className="shoot-shot-list-heading-actions">
          {canEdit ? <div className="shoot-shot-list-add-anchor" ref={addMenuRef}>
            <button
              className="shoot-button primary label-s-semibold"
              type="button"
              aria-expanded={isAddMenuOpen}
              aria-haspopup="menu"
              ref={addMenuTriggerRef}
              onClick={() => setIsAddMenuOpen((current) => !current)}
            >
              <DsIcon name="plus" size={16} />
              Add
              <DsIcon name="caret-down" size={14} />
            </button>
            {isAddMenuOpen ? <div className="shoot-shot-list-add-menu" role="menu" aria-label="Add to Shot List">
              <button className="label-s" type="button" role="menuitem" onClick={() => { setIsAddMenuOpen(false); addShot(); }}>Standalone shot</button>
              <button className="label-s" type="button" role="menuitem" onClick={() => { setIsAddMenuOpen(false); addGroup(); }}>Shot group</button>
            </div> : null}
          </div> : null}
        </div>}
      />
      {planningSections.length ? <div className="shoot-shot-table-wrap">
        <table className="shoot-shot-table shoot-planning-shot-table">
          <colgroup>
            <col className="shoot-shot-table-number-column" />
            <col className="shoot-shot-table-description-column" />
            <col className="shoot-shot-table-type-column" />
            <col className="shoot-shot-table-size-column" />
            <col className="shoot-shot-table-approach-column" />
            <col className="shoot-shot-table-priority-column" />
            <col className="shoot-shot-table-reference-column" />
            <col className="shoot-shot-table-notes-column" />
            <col className="shoot-shot-table-actions-column" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col"><span className="sr-only">Reorder and shot number</span></th>
              <th scope="col">Shot</th>
              <th scope="col">Shot type</th>
              <th scope="col">Shot size</th>
              <th scope="col">Camera</th>
              <th scope="col">Priority</th>
              <th className="shoot-shot-reference-header" scope="col">Reference</th>
              <th scope="col">Notes</th>
              <th className="shoot-shot-actions-header" scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {planningSections.map(({ id: sectionId, group, shots }) => <Fragment key={sectionId}>
              <tr
                className={`shoot-shot-top-level-drop-row ${draggedId ? "is-active" : ""} ${dropTopLevelId === sectionId ? "is-drop-target" : ""}`}
                aria-hidden="true"
                onDragOver={(event) => {
                  if (!canEdit || !draggedId) return;
                  event.preventDefault();
                  setDropShotId(null);
                  setDropGroupId(null);
                  setDropTopLevelId(sectionId);
                }}
                onDragLeave={(event) => {
                  if (event.currentTarget.contains(event.relatedTarget as Node)) return;
                  setDropTopLevelId(null);
                }}
                onDrop={() => {
                  if (draggedId) {
                    if (groupIds.has(draggedId)) reorderTopLevelItem(draggedId, sectionId);
                    else moveShotToTopLevel(draggedId, sectionId);
                  }
                  setDraggedId(null);
                  setDropShotId(null);
                  setDropGroupId(null);
                  setDropTopLevelId(null);
                }}
              ><td colSpan={9}><span /></td></tr>
              {group ? <tr
                className={`shoot-shot-group-row ${draggedId === group.id ? "is-dragging" : ""} ${dropGroupId === sectionId ? "is-drop-target" : ""}`}
                ref={(element) => { groupRowRefs.current[sectionId] = element; }}
                onDragOver={(event) => {
                  if (!canEdit || !draggedId) return;
                  event.preventDefault();
                  setDropShotId(null);
                  setDropTopLevelId(null);
                  setDropGroupId(sectionId);
                }}
                onDragLeave={(event) => {
                  if (event.currentTarget.contains(event.relatedTarget as Node)) return;
                  setDropGroupId(null);
                }}
                onDrop={() => {
                  if (draggedId) {
                    if (groupIds.has(draggedId)) reorderTopLevelItem(draggedId, group.id);
                    else moveShotIntoGroup(draggedId, group.id);
                  }
                  setDraggedId(null);
                  setDropShotId(null);
                  setDropGroupId(null);
                  setDropTopLevelId(null);
                }}
              >
                <td colSpan={9}>
                  <div className="shoot-shot-group-heading">
                    <div className="shoot-shot-group-disclosure">
                      <button className="shoot-shot-group-toggle" type="button" aria-label={`${collapsedGroupIds.includes(sectionId) ? "Expand" : "Collapse"} ${group.name}`} aria-expanded={!collapsedGroupIds.includes(sectionId)} onClick={() => toggleGroup(sectionId)}><DsIcon name="caret-down" size={15} /></button>
                      <span className="shoot-shot-group-order">
                        <span className="shoot-shot-group-index label-xs-semibold">{topLevelNumberById.get(group.id)}</span>
                        {canEdit ? <button
                          className="shoot-shot-group-drag"
                          type="button"
                          draggable
                          aria-label={`Drag to reorder group ${topLevelNumberById.get(group.id)}`}
                          onClick={(event) => event.preventDefault()}
                          onDragStart={(event) => {
                            event.dataTransfer.effectAllowed = "move";
                            setDraggedId(group.id);
                          }}
                          onDragEnd={() => {
                            setDraggedId(null);
                            setDropShotId(null);
                            setDropGroupId(null);
                            setDropTopLevelId(null);
                          }}
                        ><DsIcon name="dots-six-vertical" size={16} /></button> : null}
                      </span>
                      <span className="shoot-shot-group-copy">
                        {canEdit ? <input className="shoot-shot-group-name-input" aria-label="Shot Group name" value={group.name} onChange={(event) => updateGroup(group.id, { name: event.target.value })} /> : <strong>{group.name}</strong>}
                        {canEdit ? <input className="shoot-shot-group-description-input" aria-label={`Description for ${group.name}`} value={group.description ?? ""} placeholder="Add a group description" onChange={(event) => updateGroup(group.id, { description: event.target.value })} /> : group.description ? <small>{group.description}</small> : null}
                        <span className="shoot-shot-group-meta">
                          <span className="shoot-shot-group-count label-xs-semibold">{shots.length} {shots.length === 1 ? "shot" : "shots"}</span>
                        </span>
                      </span>
                    </div>
                    <div className="shoot-shot-group-actions">
                      {canEdit && !collapsedGroupIds.includes(sectionId) ? <button className="shoot-button secondary label-xs-semibold" type="button" onClick={() => addShot(group.id)}><DsIcon name="plus" size={14} />Add shot</button> : null}
                    </div>
                  </div>
                </td>
              </tr> : null}
              {group && collapsedGroupIds.includes(sectionId) ? null : shots.map((entry, shotIndex) => {
              const shotNumber = displayShotNumberById.get(entry.id) ?? String(shotIndex + 1);
              const menuOpen = openMenuShotId === entry.id;
              const shotComments = visibleCommentsForShot(entry);

              return <tr
                  className={`shoot-shot-child-row ${canEdit ? "can-reorder" : ""} ${draggedId === entry.id ? "is-dragging" : ""} ${dropShotId === entry.id && draggedId !== entry.id ? "is-drop-target" : ""}`}
                  draggable={canEdit}
                  key={entry.id}
                  ref={(element) => {
                    shotRowRefs.current[entry.id] = element;
                  }}
                  onDragStart={() => {
                    if (canEdit) setDraggedId(entry.id);
                  }}
                  onDragOver={(event) => {
                    if (!canEdit || !draggedId) return;
                    event.preventDefault();
                    setDropTopLevelId(null);
                    if (groupIds.has(draggedId) && group) {
                      setDropShotId(null);
                      setDropGroupId(group.id);
                    } else {
                      setDropGroupId(null);
                      setDropShotId(entry.id);
                    }
                  }}
                  onDrop={() => {
                    if (draggedId) {
                      if (groupIds.has(draggedId)) reorderTopLevelItem(draggedId, group?.id ?? entry.id);
                      else if (group) moveShotIntoGroup(draggedId, group.id, entry.id);
                      else moveShotToTopLevel(draggedId, entry.id);
                    }
                    setDraggedId(null);
                    setDropShotId(null);
                    setDropGroupId(null);
                    setDropTopLevelId(null);
                  }}
                  onDragEnd={() => {
                    setDraggedId(null);
                    setDropShotId(null);
                    setDropGroupId(null);
                    setDropTopLevelId(null);
                  }}
                >
                  <td>
                    <div className="shoot-shot-table-order">
                      <span className="shoot-shot-table-number label-xs-semibold">{shotNumber}</span>
                      {canEdit ? <button
                        className="shoot-shot-table-drag"
                        type="button"
                        draggable
                        aria-label={`Drag to reorder shot ${shotNumber}`}
                        onClick={(event) => event.preventDefault()}
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = "move";
                          setDraggedId(entry.id);
                        }}
                      ><DsIcon name="dots-six-vertical" size={16} /></button> : null}
                    </div>
                  </td>
                  <td className="shoot-shot-table-primary-cell">
                    <div className="shoot-shot-table-description">
                      <input className="shoot-shot-table-input label-s" disabled={!canEdit} aria-label={`Description for shot ${shotNumber}`} value={entry.description} onChange={(event) => updateShot(entry.id, { description: event.target.value })} />
                      {entry.suggestionStatus ? <span className="shoot-shot-suggestion-chip label-xs-semibold" role="img" aria-label="Suggested by Brisk" data-tooltip="Suggested by Brisk" tabIndex={0}><DsIcon name="sparkle" size={12} /><span className="shoot-shot-suggestion-text" aria-hidden="true">Suggested</span></span> : null}
                    </div>
                  </td>
                  <td className="shoot-shot-table-primary-cell">{canEdit ? <ShotTaxonomySelect compact ariaLabel={`Shot type for shot ${shotNumber}`} customPlaceholder="Add a custom shot type" value={entry.shotCategory} options={shotCategoryOptions} placeholder="+ Shot type" onChange={(value) => updateShot(entry.id, { shotCategory: value })} /> : <span className="shoot-shot-table-static label-s">{entry.shotCategory ?? "+ Shot type"}</span>}</td>
                  <td className="shoot-shot-table-primary-cell">{canEdit ? <BriskSelect className="shoot-shot-table-select" ariaLabel={`Shot size for shot ${shotNumber}`} value={entry.shotSize ?? ""} options={shotSizeOptions.map((value) => ({ value, label: value }))} placeholder="+ Shot size" onChange={(value) => updateShot(entry.id, { shotSize: value || undefined })} /> : <span className="shoot-shot-table-static label-s">{entry.shotSize ?? "+ Shot size"}</span>}</td>
                  <td className="shoot-shot-table-primary-cell">{canEdit ? <ShotTaxonomySelect compact ariaLabel={`Camera approach for shot ${shotNumber}`} customPlaceholder="Add a custom camera approach" value={entry.cameraMovement} options={cameraMovementOptions} placeholder="+ Camera" onChange={(value) => updateShot(entry.id, { cameraMovement: value })} /> : <span className="shoot-shot-table-static label-s">{entry.cameraMovement ?? "+ Camera"}</span>}</td>
                  <td className="shoot-shot-table-primary-cell">{canEdit ? <BriskSelect className="shoot-shot-table-select" ariaLabel={`Priority for shot ${shotNumber}`} clearable={false} searchable={false} value={normaliseShotPriority(entry.priority) ?? "Medium"} options={shotPriorityOptions.map(({ value, label }) => ({ value, label }))} placeholder="Choose priority" onChange={(value) => { if (value) updateShot(entry.id, { priority: value }); }} /> : <span className="shoot-shot-table-static label-s">{normaliseShotPriority(entry.priority) ?? "Medium"}</span>}</td>
                  <td>
                    {entry.imageReferenceUrl ? <button className="shoot-shot-reference-thumbnail" type="button" aria-label={`Preview reference for shot ${shotNumber}`} onClick={() => setPreviewShotId(entry.id)}>
                      <img src={entry.imageReferenceUrl} alt="" />
                    </button> : canEdit ? <ShotReferenceImagePicker
                      table
                      entry={entry}
                      projectId={projectId}
                      onChange={(patch) => updateShot(entry.id, patch)}
                    /> : <span className="shoot-shot-reference-indicator label-xs-semibold" role="img" aria-label={`No reference for shot ${shotNumber}`}><DsIcon name="image-square" size={16} /></span>}
                  </td>
                  <td className="shoot-shot-notes-cell">
                    {canEdit ? <textarea
                      className="shoot-shot-notes-input label-xs"
                      aria-label={`Notes for shot ${shotNumber}`}
                      placeholder="Add notes"
                      rows={2}
                      value={entry.notes ?? ""}
                      onChange={(event) => updateShot(entry.id, { notes: event.target.value })}
                    /> : <span className="shoot-shot-notes-static label-xs">{entry.notes || "No notes"}</span>}
                  </td>
                  <td>
                    <div className="shoot-shot-table-actions" ref={menuOpen ? actionMenuRef : undefined}>
                      <ScriptAnnotationPin
                        count={shotComments.length}
                        hasUnresolved={shotComments.some((comment) => !comment.resolved)}
                        label={`shot ${shotNumber}`}
                        onOpen={(triggerRect) => {
                          setOpenMenuShotId(null);
                          setCommentShotId(entry.id);
                          setCommentPosition(getFloatingCommentPosition(triggerRect));
                        }}
                      />
                      {canEdit ? <>
                        <button className="shoot-shot-table-menu-button" type="button" aria-label={`More actions for shot ${shotNumber}`} aria-expanded={menuOpen} aria-haspopup="menu" onClick={(event) => { actionMenuTriggerRef.current = event.currentTarget; setOpenMenuShotId((current) => current === entry.id ? null : entry.id); }}><DsIcon name="dots-three" size={18} /></button>
                        {menuOpen ? <div className="shoot-shot-table-menu" role="menu" onKeyDown={(event) => { if (event.key === "Escape") setOpenMenuShotId(null); }}>
                          {group ? <button className="label-s" type="button" role="menuitem" onClick={() => { moveShotToTopLevel(entry.id); setOpenMenuShotId(null); }}><DsIcon name="arrow-left" size={16} />Move to top level</button> : null}
                          <button className="label-s" type="button" role="menuitem" onClick={() => { duplicateShot(entry); setOpenMenuShotId(null); }}><DsIcon name="copy" size={16} />Duplicate shot</button>
                          <button className="danger label-s" type="button" role="menuitem" onClick={() => {
                            setOpenMenuShotId(null);
                            onDelete(entry.id);
                          }}><DsIcon name="trash-simple" size={16} />Delete shot</button>
                        </div> : null}
                      </> : null}
                    </div>
                  </td>
                </tr>;
            })}</Fragment>)}
            <tr
              className={`shoot-shot-top-level-drop-row ${draggedId ? "is-active" : ""} ${dropTopLevelId === topLevelEndDropId ? "is-drop-target" : ""}`}
              aria-hidden="true"
              onDragOver={(event) => {
                if (!canEdit || !draggedId) return;
                event.preventDefault();
                setDropShotId(null);
                setDropGroupId(null);
                setDropTopLevelId(topLevelEndDropId);
              }}
              onDragLeave={(event) => {
                if (event.currentTarget.contains(event.relatedTarget as Node)) return;
                setDropTopLevelId(null);
              }}
              onDrop={() => {
                if (draggedId) {
                  if (groupIds.has(draggedId)) reorderTopLevelItem(draggedId);
                  else moveShotToTopLevel(draggedId, undefined, "end");
                }
                setDraggedId(null);
                setDropShotId(null);
                setDropGroupId(null);
                setDropTopLevelId(null);
              }}
            ><td colSpan={9}><span /></td></tr>
          </tbody>
        </table>
      </div> : canEdit ? <EmptyState illustrationSrc="/brisk-visuals/shoot-shot-list-empty.png" title="Start your Shot List" action="Add shot" onAction={() => addShot()} /> : <p className="shoot-preproduction-empty-copy">The Shot List has not been started.</p>}
    </section>
    {previewShot?.imageReferenceUrl ? <ModalShell
      wide
      title={`Image for shot ${displayShotNumberById.get(previewShot.id) ?? entries.indexOf(previewShot) + 1}`}
      onClose={() => setPreviewShotId(null)}
      footer={<div className="shoot-modal-actions align-right"><Button size="S" variant="primary" onClick={() => setPreviewShotId(null)}>Done</Button></div>}
    ><div className="shoot-shot-image-preview"><img src={previewShot.imageReferenceUrl} alt={`Reference for ${previewShot.description}`} /></div></ModalShell> : null}
    {commentShot && commentPosition ? createPortal(<FloatingCommentShell
      anchor={{ kind: "row", label: `Shot ${commentShotNumber}`, rowId: commentShot.id } satisfies ScriptCommentAnchor}
      canPostInternal={selectedRole !== "Customer"}
      comments={visibleCommentsForShot(commentShot)}
      currentUserId={currentCommentUserId}
      position={commentPosition}
      users={scriptUsers}
      onCommentsChange={(nextComments) => updateShotComments(commentShot, visibleCommentsForShot(commentShot), nextComments)}
      onDismiss={() => {
        setCommentShotId(null);
        setCommentPosition(null);
      }}
    />, document.body) : null}
  </>;
}

function OnSetShotList({ callSheet, canEdit, displayShotNumberById, entries, groups, onAddShot, onChange, selectedDayId }: {
  callSheet: CallSheet;
  canEdit: boolean;
  displayShotNumberById: Map<string, string>;
  entries: ProductionEntry[];
  groups: ShotGroup[];
  onAddShot: (groupId?: string) => void;
  onChange: (updater: (current: CallSheet) => CallSheet) => void;
  selectedDayId: string;
}) {
  const [statusFilter, setStatusFilter] = useState<"all" | "remaining" | "captured">("all");
  const [showUnassigned, setShowUnassigned] = useState(false);
  const coverageEntries = callSheet.entries.filter((entry) => entry.type === "coverage" && entry.linkedShotGroupId);
  const dayCoverage = coverageEntries.filter((entry) => entry.dayId === selectedDayId);
  const orderedDayCoverage = [
    ...dayCoverage.filter((entry) => entry.startTime).sort((left, right) => left.startTime.localeCompare(right.startTime)),
    ...dayCoverage.filter((entry) => !entry.startTime),
  ];
  const scheduledGroupIds = new Set(orderedDayCoverage.flatMap((entry) => entry.linkedShotGroupId ? [entry.linkedShotGroupId] : []));
  const additionalCoverage = groups.find((group) => group.name === "Additional coverage");
  const unassignedGroups = groups.filter((group) => !coverageEntries.some((entry) => entry.linkedShotGroupId === group.id) && group.id !== additionalCoverage?.id);
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const orderedGroups = [
    ...orderedDayCoverage.flatMap((entry) => entry.linkedShotGroupId ? [groupById.get(entry.linkedShotGroupId)].filter((group): group is ShotGroup => Boolean(group)) : []),
    ...(additionalCoverage && !scheduledGroupIds.has(additionalCoverage.id) ? [additionalCoverage] : []),
    ...((showUnassigned || orderedDayCoverage.length === 0) ? unassignedGroups : []),
  ].filter((group, index, values) => values.findIndex((candidate) => candidate.id === group.id) === index);
  const visibleGroups = orderedGroups.map((group) => ({
    group,
    shots: entries.filter((shot) => {
      if (shot.shotGroupId !== group.id) return false;
      const status = shot.captureStatus ?? (shot.captured ? "captured" : "to-capture");
      if (statusFilter === "captured") return status === "captured";
      if (statusFilter === "remaining") return status === "to-capture" || status === "pickup-needed";
      return true;
    }),
  })).filter(({ shots }) => shots.length || statusFilter === "all");
  const standaloneShots = entries.filter((shot) => {
    if (shot.shotGroupId && groupById.has(shot.shotGroupId)) return false;
    const status = shot.captureStatus ?? (shot.captured ? "captured" : "to-capture");
    if (statusFilter === "captured") return status === "captured";
    if (statusFilter === "remaining") return status === "to-capture" || status === "pickup-needed";
    return true;
  });
  const updateShot = (shotId: string, patch: Partial<ProductionEntry>) => onChange((current) => ({
    ...current,
    entries: current.entries.map((entry) => entry.id === shotId ? { ...entry, ...patch } : entry),
  }));
  const createPickupGroup = (sourceGroup: ShotGroup) => onChange((current) => {
    const pickupGroupId = `shot-group-pickups-${Date.now()}`;
    return {
      ...current,
      shotGroups: [...(current.shotGroups ?? []), {
        id: pickupGroupId,
        name: `${sourceGroup.name} pickups`,
        description: "Coverage to complete in a follow-up session.",
        subject: sourceGroup.subject,
        locationId: sourceGroup.locationId,
        order: current.shotGroups?.length ?? 0,
      }],
      entries: current.entries.map((entry) => entry.shotGroupId === sourceGroup.id && entry.captureStatus === "pickup-needed"
        ? { ...entry, shotGroupId: pickupGroupId }
        : entry),
    };
  });

  return <section className="shoot-preproduction-section shoot-on-set-shot-list">
    <PreProductionSectionHeading
      title="Shot List"
      action={<div className="shoot-shot-list-heading-actions">
        {canEdit && additionalCoverage ? <button className="shoot-button primary label-s-semibold" type="button" onClick={() => onAddShot(additionalCoverage.id)}><DsIcon name="plus" size={16} />Add unplanned shot</button> : null}
      </div>}
    />
    <div className="shoot-on-set-toolbar">
      <div className="shoot-on-set-filters" role="group" aria-label="Filter shots">{(["all", "remaining", "captured"] as const).map((filter) => <button className={`${statusFilter === filter ? "active " : ""}label-s-semibold`} type="button" aria-pressed={statusFilter === filter} key={filter} onClick={() => setStatusFilter(filter)}>{filter === "all" ? "All" : filter === "remaining" ? "Remaining" : "Captured"}</button>)}</div>
      {unassignedGroups.length && orderedDayCoverage.length ? <button className="shoot-text-action label-xs-semibold" type="button" onClick={() => setShowUnassigned((current) => !current)}>{showUnassigned ? "Hide unassigned" : `Show ${unassignedGroups.length} unassigned`}</button> : null}
    </div>
    {standaloneShots.length ? <div className="shoot-on-set-table shoot-on-set-standalone-shots" role="table" aria-label="Standalone shots">
      <div className="shoot-on-set-table-header label-xs" role="row"><span>Status</span><span>#</span><span>Description</span><span>Priority</span><span>Reference</span><span>Quick note</span></div>
      {standaloneShots.map((shot) => {
        const status = shot.captureStatus ?? (shot.captured ? "captured" : "to-capture");
        const shotNumber = displayShotNumberById.get(shot.id) ?? String(entries.indexOf(shot) + 1);
        return <div className={`shoot-on-set-row is-${status}`} role="row" key={shot.id}>
          <div>{canEdit ? <BriskSelect className="shoot-on-set-status" ariaLabel={`Status for shot ${shotNumber}`} clearable={false} searchable={false} value={status} options={captureStatusOptions} placeholder="Choose status" onChange={(value) => { if (value) updateShot(shot.id, { captureStatus: value, captured: value === "captured" }); }} /> : <span className="label-xs-semibold">{captureStatusOptions.find((option) => option.value === status)?.label}</span>}</div>
          <span className="label-xs-semibold">{shotNumber}</span>
          <strong>{shot.description}</strong>
          <span className="shoot-on-set-priority label-s">{shot.priority === "Critical" ? <DsIcon name="fire-simple" size={15} /> : null}{shot.priority ?? "Medium"}</span>
          <span>{shot.imageReferenceUrl ? <img className="shoot-on-set-reference" src={shot.imageReferenceUrl} alt="" /> : <DsIcon name="image-square" size={16} />}</span>
          <input disabled={!canEdit} aria-label={`Quick note for shot ${shotNumber}`} placeholder="Add note" value={shot.notes ?? ""} onChange={(event) => updateShot(shot.id, { notes: event.target.value })} />
        </div>;
      })}
    </div> : null}
    <div className="shoot-on-set-groups">
      {visibleGroups.map(({ group, shots }) => {
        const groupRequiredShots = entries.filter((shot) => shot.shotGroupId === group.id && (shot.captureStatus ?? (shot.captured ? "captured" : "to-capture")) !== "not-required");
        const groupCaptured = groupRequiredShots.filter((shot) => (shot.captureStatus ?? (shot.captured ? "captured" : "to-capture")) === "captured").length;
        const pickupCount = groupRequiredShots.filter((shot) => shot.captureStatus === "pickup-needed").length;
        return <section className={`shoot-on-set-group ${groupRequiredShots.length > 0 && groupCaptured === groupRequiredShots.length ? "is-complete" : ""}`} key={group.id}>
          <header><div><h3>{group.name}</h3><p className="label-xs">{groupCaptured} of {groupRequiredShots.length} captured{pickupCount ? ` · ${pickupCount} pickup` : ""}</p></div>{canEdit && pickupCount ? <button className="shoot-button secondary label-xs-semibold" type="button" onClick={() => createPickupGroup(group)}>Create pickup group</button> : null}</header>
          <div className="shoot-on-set-table" role="table" aria-label={group.name}>
            <div className="shoot-on-set-table-header label-xs" role="row"><span>Status</span><span>#</span><span>Description</span><span>Priority</span><span>Reference</span><span>Quick note</span></div>
            {shots.map((shot) => {
              const status = shot.captureStatus ?? (shot.captured ? "captured" : "to-capture");
              const shotNumber = displayShotNumberById.get(shot.id) ?? String(entries.indexOf(shot) + 1);
              return <div className={`shoot-on-set-row is-${status}`} role="row" key={shot.id}>
                <div>{canEdit ? <BriskSelect className="shoot-on-set-status" ariaLabel={`Status for shot ${shotNumber}`} clearable={false} searchable={false} value={status} options={captureStatusOptions} placeholder="Choose status" onChange={(value) => { if (value) updateShot(shot.id, { captureStatus: value, captured: value === "captured" }); }} /> : <span className="label-xs-semibold">{captureStatusOptions.find((option) => option.value === status)?.label}</span>}</div>
                <span className="label-xs-semibold">{shotNumber}</span>
                <strong>{shot.description}</strong>
                <span className="shoot-on-set-priority label-s">{shot.priority === "Critical" ? <DsIcon name="fire-simple" size={15} /> : null}{shot.priority ?? "Medium"}</span>
                <span>{shot.imageReferenceUrl ? <img className="shoot-on-set-reference" src={shot.imageReferenceUrl} alt="" /> : <DsIcon name="image-square" size={16} />}</span>
                <input disabled={!canEdit} aria-label={`Quick note for shot ${shotNumber}`} placeholder="Add note" value={shot.notes ?? ""} onChange={(event) => updateShot(shot.id, { notes: event.target.value })} />
              </div>;
            })}
          </div>
        </section>;
      })}
    </div>
  </section>;
}

function ShotTaxonomySelect({ ariaLabel, compact = false, customPlaceholder, options, placeholder, value, onChange }: {
  ariaLabel: string;
  compact?: boolean;
  customPlaceholder: string;
  options: string[];
  placeholder: string;
  value?: string;
  onChange: (value?: string) => void;
}) {
  const customOptionValue = "__add-custom-shot-taxonomy__";
  const [isCustomising, setIsCustomising] = useState(false);
  const isStandardValue = Boolean(value && options.includes(value));
  const selectOptions = [
    ...options.map((option) => ({ value: option, label: option })),
    ...(value && !isStandardValue ? [{ value, label: value }] : []),
    { value: customOptionValue, label: "Custom", icon: "plus" as const, dividerAbove: true },
  ];

  if (isCustomising) {
    return <input
      autoFocus
      className={`shoot-shot-custom-taxonomy-input${compact ? " is-table" : ""}`}
      aria-label={ariaLabel}
      placeholder={customPlaceholder}
      value={value ?? ""}
      onBlur={() => setIsCustomising(false)}
      onChange={(event) => onChange(event.target.value || undefined)}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          onChange(undefined);
          setIsCustomising(false);
        }
      }}
    />;
  }

  return <BriskSelect
    ariaLabel={ariaLabel}
    className={compact ? "shoot-shot-table-select" : undefined}
    value={value ?? ""}
    options={selectOptions}
    placeholder={placeholder}
    onChange={(nextValue) => {
      if (nextValue === customOptionValue) {
        onChange(undefined);
        setIsCustomising(true);
        return;
      }
      onChange(nextValue || undefined);
    }}
  />;
}

function PreProductionInterviewQuestions({ availablePeople, callSheet, canEdit, mode, selectedDayId, onAddPerson, onChange, onReorder }: {
  availablePeople: ShootPerson[];
  callSheet: CallSheet;
  canEdit: boolean;
  mode: ShootMode;
  selectedDayId: string;
  onAddPerson: (questionId: string, anchor: HTMLButtonElement | null) => void;
  onChange: (updater: (current: CallSheet) => CallSheet) => void;
  onReorder: (sourceId: string, targetId: string) => void;
}) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropQuestionId, setDropQuestionId] = useState<string | null>(null);
  const [activePersonFilter, setActivePersonFilter] = useState("all");
  const [onSetStatusFilter, setOnSetStatusFilter] = useState<"all" | "remaining" | "asked">("all");
  const questionRowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const pendingNewQuestionIdRef = useRef<string | null>(null);
  const peopleOptions = availablePeople.map((person) => ({
    value: person.id,
    label: person.role ? `${person.name} - ${person.role}` : person.name,
    triggerLabel: person.name,
  }));
  const filterPeople = useMemo(() => {
    const seenIds = new Set<string>();
    return callSheet.questions.flatMap((question) => {
      if (!question.personId || seenIds.has(question.personId)) return [];
      const person = availablePeople.find((candidate) => candidate.id === question.personId);
      if (!person) return [];
      seenIds.add(person.id);
      return [person];
    });
  }, [availablePeople, callSheet.questions]);
  const availableFilterPeople = mode === "on-set"
    ? filterPeople.filter((person) => callSheet.questions.some((question) => question.personId === person.id && isAssignedToDay(question.shootDayIds, selectedDayId)))
    : filterPeople;
  const visibleQuestions = activePersonFilter === "all"
    ? callSheet.questions
    : callSheet.questions.filter((question) => question.personId === activePersonFilter);
  const updateQuestion = (id: string, patch: Partial<InterviewQuestion>) => onChange((current) => ({ ...current, questions: current.questions.map((question) => question.id === id ? { ...question, ...patch } : question) }));
  const addQuestion = () => {
    const id = `question-${Date.now()}`;
    pendingNewQuestionIdRef.current = id;
    setActivePersonFilter("all");
    onChange((current) => ({ ...current, questions: [...current.questions, { id, question: "New interview question", shootDayIds: "all" }] }));
  };
  const duplicateQuestion = (question: InterviewQuestion) => onChange((current) => {
    const sourceIndex = current.questions.findIndex((candidate) => candidate.id === question.id);
    if (sourceIndex < 0) return current;
    const duplicate: InterviewQuestion = {
      ...question,
      id: `question-${Date.now()}`,
      suggestionStatus: undefined,
      asked: false,
    };
    const questions = [...current.questions];
    questions.splice(sourceIndex + 1, 0, duplicate);
    return { ...current, questions };
  });
  useEffect(() => {
    if (activePersonFilter === "all" || availableFilterPeople.some((person) => person.id === activePersonFilter)) return;
    setActivePersonFilter("all");
  }, [activePersonFilter, availableFilterPeople]);

  useEffect(() => {
    const newQuestionId = pendingNewQuestionIdRef.current;
    if (!newQuestionId || activePersonFilter !== "all" || !callSheet.questions.some((question) => question.id === newQuestionId)) return;
    const newQuestionRow = questionRowRefs.current[newQuestionId];
    if (!newQuestionRow) return;
    pendingNewQuestionIdRef.current = null;
    newQuestionRow.scrollIntoView({ behavior: "smooth", block: "center" });
    window.requestAnimationFrame(() => {
      const questionInput = newQuestionRow.querySelector<HTMLTextAreaElement>(".shoot-question-table-input");
      questionInput?.focus({ preventScroll: true });
      questionInput?.select();
    });
  }, [activePersonFilter, callSheet.questions]);

  if (mode === "on-set") {
    const dayQuestions = callSheet.questions.filter((question) => isAssignedToDay(question.shootDayIds, selectedDayId));
    const askedCount = dayQuestions.filter((question) => question.asked).length;
    const visibleOnSetQuestions = dayQuestions.filter((question) => (
      activePersonFilter === "all" || question.personId === activePersonFilter
    ) && (
      onSetStatusFilter === "all" || (onSetStatusFilter === "asked" ? question.asked : !question.asked)
    ));

    return <section className="shoot-preproduction-section shoot-on-set-questions">
      <PreProductionSectionHeading
        title="Interview Questions"
        description={`${askedCount} of ${dayQuestions.length} asked today`}
        action={canEdit ? <button className="shoot-button primary label-s-semibold" type="button" onClick={addQuestion}><DsIcon name="plus" size={16} />Add question</button> : null}
      />
      <div className="shoot-on-set-question-toolbar">
        <div className="shoot-on-set-filters" role="group" aria-label="Filter interview questions">{(["all", "remaining", "asked"] as const).map((filter) => <button className={`${onSetStatusFilter === filter ? "active " : ""}label-s-semibold`} type="button" aria-pressed={onSetStatusFilter === filter} key={filter} onClick={() => setOnSetStatusFilter(filter)}>{filter === "all" ? "All" : filter === "remaining" ? "Remaining" : "Asked"}</button>)}</div>
        {availableFilterPeople.length ? <BriskSelect
          ariaLabel="Filter interview questions by talent"
          className="shoot-on-set-talent-filter"
          clearLabel="All talent"
          options={availableFilterPeople.map((person) => ({ value: person.id, label: person.name }))}
          placeholder="All talent"
          value={activePersonFilter === "all" ? "" : activePersonFilter}
          onChange={(value) => setActivePersonFilter(value || "all")}
        /> : null}
      </div>
      {visibleOnSetQuestions.length ? <ol className="shoot-on-set-question-list">
        {visibleOnSetQuestions.map((question) => {
          const questionNumber = callSheet.questions.findIndex((candidate) => candidate.id === question.id) + 1;
          const person = availablePeople.find((candidate) => candidate.id === question.personId);
          return <li className={question.asked ? "is-asked" : ""} key={question.id}>
            <label>
              <input type="checkbox" disabled={!canEdit} checked={question.asked === true} onChange={(event) => updateQuestion(question.id, { asked: event.target.checked })} />
              <span className="shoot-on-set-question-number label-xs-semibold">{questionNumber}</span>
              <span className="shoot-on-set-question-copy"><strong>{question.question}</strong>{person ? <small className="label-s">{person.name}</small> : null}</span>
            </label>
          </li>;
        })}
      </ol> : <p className="shoot-preproduction-empty-copy">{dayQuestions.length ? "No questions match this filter." : "No interview questions are assigned to this shoot day."}</p>}
    </section>;
  }

  return <section className="shoot-preproduction-section">
    <PreProductionSectionHeading title="Interview Questions" action={canEdit ? <button className="shoot-button primary label-s-semibold" type="button" onClick={addQuestion}><DsIcon name="plus" size={16} />Add question</button> : null} />
    {filterPeople.length ? <div className="shoot-question-filter-bar">
      <div className="shoot-filter-tabs" role="tablist" aria-label="Filter interview questions by person">
        <button className={`label-s-semibold ${activePersonFilter === "all" ? "active" : ""}`} type="button" role="tab" aria-selected={activePersonFilter === "all"} onClick={() => setActivePersonFilter("all")}>All</button>
        {filterPeople.map((person) => <button className={`label-s-semibold ${activePersonFilter === person.id ? "active" : ""}`} type="button" role="tab" aria-selected={activePersonFilter === person.id} key={person.id} onClick={() => setActivePersonFilter(person.id)}>{person.name}</button>)}
      </div>
    </div> : null}
    {callSheet.questions.length ? <div className="shoot-shot-table-wrap">
      <table className="shoot-shot-table shoot-question-table" id="shoot-interview-question-table">
        <colgroup>
          <col className="shoot-shot-table-number-column" />
          <col className="shoot-question-table-question-column" />
          <col className="shoot-question-table-divider-column" />
          <col className="shoot-question-table-person-column" />
          <col className="shoot-question-table-actions-column" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col"><span className="sr-only">Reorder and question number</span></th>
            <th scope="col">Question</th>
            <th className="shoot-question-table-divider" aria-hidden="true" />
            <th scope="col">Person</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {visibleQuestions.map((question) => {
            const questionNumber = callSheet.questions.findIndex((candidate) => candidate.id === question.id) + 1;
            const personName = availablePeople.find((person) => person.id === question.personId)?.name ?? "+ Person";

            return <tr
              className={`${canEdit ? "can-reorder" : ""} ${draggedId === question.id ? "is-dragging" : ""} ${dropQuestionId === question.id && draggedId !== question.id ? "is-drop-target" : ""}`}
              draggable={canEdit}
              key={question.id}
              ref={(element) => {
                questionRowRefs.current[question.id] = element;
              }}
              onDragStart={() => {
                if (canEdit) setDraggedId(question.id);
              }}
              onDragOver={(event) => {
                if (!canEdit) return;
                event.preventDefault();
                setDropQuestionId(question.id);
              }}
              onDrop={() => {
                if (draggedId) onReorder(draggedId, question.id);
                setDraggedId(null);
                setDropQuestionId(null);
              }}
              onDragEnd={() => {
                setDraggedId(null);
                setDropQuestionId(null);
              }}
            >
              <td>
                <div className="shoot-shot-table-order">
                  <span className="shoot-shot-table-number label-xs-semibold">{questionNumber}</span>
                  {canEdit ? <button
                    className="shoot-shot-table-drag"
                    type="button"
                    draggable
                    aria-label={`Drag to reorder question ${questionNumber}`}
                    onClick={(event) => event.preventDefault()}
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "move";
                      setDraggedId(question.id);
                    }}
                  ><DsIcon name="dots-six-vertical" size={16} /></button> : null}
                </div>
              </td>
              <td className="shoot-shot-table-primary-cell">
                <div className="shoot-shot-table-description">
                  <textarea className="shoot-shot-table-input shoot-question-table-input" disabled={!canEdit} aria-label={`Interview question ${questionNumber}`} rows={2} value={question.question} onChange={(event) => updateQuestion(question.id, { question: event.target.value, suggestionStatus: undefined })} />
                  {question.suggestionStatus ? <span className="shoot-shot-suggestion-chip label-xs-semibold" role="img" aria-label="Suggested by Brisk" data-tooltip="Suggested by Brisk" tabIndex={0}><DsIcon name="sparkle" size={12} /><span className="shoot-shot-suggestion-text" aria-hidden="true">Suggested</span></span> : null}
                </div>
              </td>
              <td className="shoot-question-table-divider" aria-hidden="true" />
              <td className="shoot-shot-table-primary-cell">
                <div className="shoot-question-person-cell">
                  {canEdit ? <BriskSelect className="shoot-shot-table-select" ariaLabel={`Person for question ${questionNumber}`} footerAction={{ label: "Add new contact", icon: "plus", onSelect: (anchor) => onAddPerson(question.id, anchor) }} value={question.personId ?? ""} options={peopleOptions} placeholder="+ Person" onChange={(value) => {
                    updateQuestion(question.id, { personId: value || undefined });
                  }} /> : <span className="shoot-shot-table-static label-s">{personName}</span>}
                </div>
              </td>
              <td>
                {canEdit ? <div className="shoot-shot-table-actions shoot-question-table-actions">
                  <button className="shoot-text-action label-xs-semibold" type="button" aria-label={`Duplicate question ${questionNumber}`} onClick={() => duplicateQuestion(question)}><DsIcon name="copy" size={16} />Duplicate</button>
                  <button className="shoot-text-action danger label-xs-semibold" type="button" aria-label={`Delete question ${questionNumber}`} onClick={() => {
                    onChange((current) => ({ ...current, questions: current.questions.filter((candidate) => candidate.id !== question.id) }));
                  }}><DsIcon name="trash-simple" size={16} />Delete</button>
                </div> : null}
              </td>
            </tr>;
          })}
        </tbody>
      </table>
    </div> : <p className="shoot-preproduction-empty-copy">No interview questions yet. Add one yourself or return to Setup for Brisk suggestions.</p>}
  </section>;
}

function PreProductionVisualReferences({ callSheet, canEdit, onChange, projectId }: { callSheet: CallSheet; canEdit: boolean; onChange: (updater: (current: CallSheet) => CallSheet) => void; projectId: string }) {
  const [isSourceOpen, setIsSourceOpen] = useState(false);
  const [replaceSourceReferenceId, setReplaceSourceReferenceId] = useState<string | null>(null);
  const [pendingUploadReferenceId, setPendingUploadReferenceId] = useState<string | null>(null);
  const [librarySelection, setLibrarySelection] = useState<{ source: "stock" | "project-media"; replaceReferenceId?: string } | null>(null);
  const [linkDraft, setLinkDraft] = useState<{ url: string; replaceReferenceId?: string } | null>(null);
  const [editDraft, setEditDraft] = useState<ShootVisualReference | null>(null);
  const [openMenuReferenceId, setOpenMenuReferenceId] = useState<string | null>(null);
  const openMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const references = callSheet.visualReferences ?? [];

  useEffect(() => {
    if (!openMenuReferenceId) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (target instanceof Element && target.closest(".script-media-menu")) return;
      if (!openMenuRef.current?.contains(target)) {
        setOpenMenuReferenceId(null);
        setReplaceSourceReferenceId(null);
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [openMenuReferenceId]);

  const saveReference = (reference: ShootVisualReference, replaceReferenceId?: string) => onChange((current) => ({
    ...current,
    visualReferences: replaceReferenceId
      ? (current.visualReferences ?? []).map((item) => item.id === replaceReferenceId ? { ...reference, id: item.id } : item)
      : [...(current.visualReferences ?? []), reference],
  }));

  const chooseSource = (source: ShotImageSource, replaceReferenceId?: string) => {
    setIsSourceOpen(false);
    setReplaceSourceReferenceId(null);
    setOpenMenuReferenceId(null);
    if (source === "upload") {
      setPendingUploadReferenceId(replaceReferenceId ?? null);
      fileInputRef.current?.click();
      return;
    }
    if (source === "link") {
      const existing = references.find((reference) => reference.id === replaceReferenceId);
      setLinkDraft({
        url: existing?.url ?? "",
        replaceReferenceId,
      });
      return;
    }
    setLibrarySelection({ source, replaceReferenceId });
  };

  const removeReference = (referenceId: string) => {
    setOpenMenuReferenceId(null);
    onChange((current) => ({ ...current, visualReferences: (current.visualReferences ?? []).filter((item) => item.id !== referenceId) }));
  };

  return <section className="shoot-preproduction-section">
    <PreProductionSectionHeading title="Visual References" action={canEdit ? <ScriptMediaPicker
      isOpen={isSourceOpen}
      options={shotMediaOptions}
      triggerLabel="Add reference"
      triggerClassName="shoot-reference-add-trigger label-s-semibold"
      triggerIcon="plus"
      triggerText="Add reference"
      onOpenChange={setIsSourceOpen}
      onSelect={(source) => chooseSource(source)}
    /> : null} />
    <input aria-hidden="true" className="shoot-visually-hidden" ref={fileInputRef} type="file" accept="image/*,video/*" tabIndex={-1} onChange={(event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        if (typeof reader.result !== "string") return;
        saveReference({
          id: `reference-${Date.now()}`,
          name: removeFileExtension(file.name),
          url: reader.result,
          kind: file.type.startsWith("video/") ? "video" : "image",
          source: "upload",
        }, pendingUploadReferenceId ?? undefined);
        setPendingUploadReferenceId(null);
      });
      reader.readAsDataURL(file);
      event.currentTarget.value = "";
    }} />
    {references.length ? <div className="shoot-reference-gallery">{references.map((reference) => {
      const previewUrl = getVisualReferencePreviewUrl(reference);
      const isVideo = isVisualReferenceVideo(reference);
      const menuOpen = openMenuReferenceId === reference.id;
      return <article className="shoot-reference-card" key={reference.id}>
        <a className="shoot-reference-card-link" href={reference.url} target="_blank" rel="noreferrer" aria-label={`Open ${reference.name}`}>
          <span className="shoot-reference-image">
            {previewUrl ? <img src={previewUrl} alt="" /> : reference.url.startsWith("data:video/") ? <video src={reference.url} muted preload="metadata" /> : <DsIcon name={isVideo ? "play" : "link"} size={28} />}
            {isVideo ? <span className="shoot-reference-play" aria-hidden="true"><DsIcon name="play" size={20} /></span> : null}
          </span>
          <span className="shoot-reference-card-copy">
            <strong className="label-s-semibold">{reference.name}</strong>
            {reference.description ? <small className="label-xs">{reference.description}</small> : <small className="label-xs">{visualReferenceSourceLabel(reference.source)}</small>}
          </span>
        </a>
        {canEdit ? <div className="shoot-reference-card-actions" ref={menuOpen ? openMenuRef : undefined}>
          <button className="shoot-icon-button shoot-reference-card-menu-trigger" type="button" aria-label={`More actions for ${reference.name}`} aria-expanded={menuOpen} aria-haspopup="menu" onClick={() => { setReplaceSourceReferenceId(null); setOpenMenuReferenceId((current) => current === reference.id ? null : reference.id); }}><DsIcon name="dots-three" size={18} /></button>
          {menuOpen ? <div className="shoot-shot-table-menu shoot-reference-card-menu" role="menu" onKeyDown={(event) => { if (event.key === "Escape") setOpenMenuReferenceId(null); }}>
            <button className="label-s" type="button" role="menuitem" onClick={() => { setEditDraft({ ...reference }); setOpenMenuReferenceId(null); }}><DsIcon name="pencil-simple-ds" size={16} />Edit details</button>
            <ScriptMediaPicker
              isOpen={replaceSourceReferenceId === reference.id}
              options={shotMediaOptions}
              triggerLabel={`Replace ${reference.name}`}
              triggerClassName="shoot-reference-replace-action label-s"
              triggerIcon="arrows-clockwise"
              triggerIconSize={16}
              triggerText="Replace reference"
              onOpenChange={(isOpen) => setReplaceSourceReferenceId(isOpen ? reference.id : null)}
              onSelect={(source) => chooseSource(source, reference.id)}
            />
            <button className="danger label-s" type="button" role="menuitem" onClick={() => removeReference(reference.id)}><DsIcon name="trash-simple" size={16} />Remove reference</button>
          </div> : null}
        </div> : null}
      </article>;
    })}</div> : <div className="shoot-reference-empty"><span><DsIcon name="image-square" size={24} /></span><div><strong className="label-s-semibold">No visual references yet</strong><p className="label-xs">Add images or videos to set the visual direction for the shoot.</p></div></div>}
    {librarySelection ? <ShotMediaLibraryModal source={librarySelection.source} projectId={projectId} onClose={() => setLibrarySelection(null)} onSelect={(asset) => {
      const url = asset.playbackUrl ?? asset.thumbnailUrl;
      if (!url) return;
      saveReference({
        id: `reference-${Date.now()}`,
        name: removeFileExtension(asset.name),
        url,
        thumbnailUrl: asset.thumbnailUrl,
        kind: asset.kind === "video" ? "video" : "image",
        source: librarySelection.source,
      }, librarySelection.replaceReferenceId);
      setLibrarySelection(null);
    }} /> : null}
    {linkDraft ? <ModalShell compact title={linkDraft.replaceReferenceId ? "Replace link" : "Add link"} onClose={() => setLinkDraft(null)} footer={<div className="shoot-modal-actions align-right"><Button size="S" variant="secondary" onClick={() => setLinkDraft(null)}>Cancel</Button><button className="shoot-button primary label-s-semibold" type="button" disabled={!linkDraft.url.trim()} onClick={() => {
      const url = linkDraft.url.trim();
      saveReference({
        id: `reference-${Date.now()}`,
        name: deriveReferenceName(url),
        url,
        thumbnailUrl: getYouTubeThumbnailUrl(url),
        kind: isVideoReferenceUrl(url) ? "video" : undefined,
        source: "link",
      }, linkDraft.replaceReferenceId);
      setLinkDraft(null);
    }}>{linkDraft.replaceReferenceId ? "Replace link" : "Add link"}</button></div>}>
      <Field label="Link"><input autoFocus type="url" placeholder="Paste a link" value={linkDraft.url} onChange={(event) => setLinkDraft((current) => current ? { ...current, url: event.target.value } : null)} /></Field>
    </ModalShell> : null}
    {editDraft ? <ModalShell compact title="Edit reference details" onClose={() => setEditDraft(null)} footer={<div className="shoot-modal-actions align-right"><Button size="S" variant="secondary" onClick={() => setEditDraft(null)}>Cancel</Button><button className="shoot-button primary label-s-semibold" type="button" disabled={!editDraft.name.trim()} onClick={() => {
      onChange((current) => ({ ...current, visualReferences: (current.visualReferences ?? []).map((reference) => reference.id === editDraft.id ? { ...editDraft, name: editDraft.name.trim(), description: editDraft.description?.trim() || undefined } : reference) }));
      setEditDraft(null);
    }}>Save changes</button></div>}>
      <Field label="Title"><input autoFocus value={editDraft.name} onChange={(event) => setEditDraft((current) => current ? { ...current, name: event.target.value } : null)} /></Field>
      <Field label="Description (optional)"><textarea rows={3} placeholder="What should the team take from this reference?" value={editDraft.description ?? ""} onChange={(event) => setEditDraft((current) => current ? { ...current, description: event.target.value } : null)} /></Field>
    </ModalShell> : null}
  </section>;
}

function PreProductionLocations({ callSheet, canEdit, onEdit, onNew }: { callSheet: CallSheet; canEdit: boolean; onEdit: (location: ShootLocation) => void; onNew: () => void }) {
  return <section className="shoot-preproduction-section">
    <PreProductionSectionHeading icon="push-pin-simple" title="Where are you shooting?" description="Add locations, practical access details and their shoot days." action={canEdit ? <button className="shoot-button primary label-s-semibold" type="button" onClick={onNew}><DsIcon name="plus" size={16} />Add location</button> : null} />
    {callSheet.locations.length ? <div className="shoot-preproduction-location-list">{callSheet.locations.map((location) => {
      const usedBy = callSheet.days.filter((day) => day.primaryLocationId === location.id);
      const mapValue = location.mapLink || location.address;
      return <article key={location.id}>
        <div><strong>{location.name}</strong><p>{mapValue ? <a className="shoot-location-link" href={getMapsUrl(mapValue)} target="_blank" rel="noreferrer">{getMapsLinkLabel(location.address || mapValue)}</a> : "Address not confirmed"}</p><span className="label-xs">{formatDayAssignment(location.shootDayIds, callSheet.days)}</span></div>
        <dl><div><dt>Parking</dt><dd>{location.parking || "Not confirmed"}</dd></div><div><dt>Access</dt><dd>{location.access || "Not confirmed"}</dd></div><div><dt>Weather</dt><dd>{usedBy.length && usedBy.some((day) => day.date) ? getDisplayedWeather(callSheet.weather, true) : "Waiting for a confirmed date and primary location"}</dd></div></dl>
        {canEdit ? <div className="shoot-location-actions"><button className="shoot-icon-button" type="button" aria-label={`Edit ${location.name}`} onClick={() => onEdit(location)}><DsIcon name="pencil-simple-ds" size={16} /></button></div> : null}
      </article>;
    })}</div> : <p className="shoot-preproduction-empty-copy">No shoot location is confirmed yet.</p>}
  </section>;
}

function PreProductionPeople({ callSheet, canEdit, isStudioInternal, onChange, onEdit, onNew }: { callSheet: CallSheet; canEdit: boolean; isStudioInternal: boolean; onChange: (updater: (current: CallSheet) => CallSheet) => void; onEdit: (person: ShootPerson) => void; onNew: (event?: ReactMouseEvent<HTMLButtonElement>) => void }) {
  return <section className="shoot-preproduction-section">
    <PreProductionSectionHeading icon="users-three" title="Who is involved?" description="Use one contact identity and add every shoot assignment they need." action={canEdit ? <button className="shoot-button primary label-s-semibold" type="button" onClick={onNew}><DsIcon name="plus" size={16} />Add new contact</button> : null} />
    {callSheet.people.length ? <div className="shoot-preproduction-people-list">{callSheet.people.map((person) => <article key={person.id}>
      <span className="shoot-avatar label-xs-semibold">{getInitials(person.name)}</span>
      <div className="shoot-person-identity"><strong>{person.name}</strong><span className="label-xs">{person.email || "Details needed"}</span>{isStudioInternal && person.phone ? <span className="label-xs">{person.phone}</span> : null}</div>
      <div className="shoot-assignment-list">{getShootAssignments(person).map((assignment) => <span className={`shoot-type-badge is-${assignment.type} label-xs-semibold`} key={assignment.id}>{personTypeLabels[assignment.type]}{assignment.role ? ` - ${assignment.role}` : ""}</span>)}</div>
      <div className="shoot-person-call"><span className="label-xs">Call time</span><strong>{person.callTime ? formatTime(person.callTime) : "Not confirmed"}</strong></div>
      <label className="shoot-contact-visibility label-xs"><input type="checkbox" disabled={!canEdit} checked={person.showContactDetails === true} onChange={(event) => onChange((current) => ({ ...current, people: current.people.map((item) => item.id === person.id ? { ...item, showContactDetails: event.target.checked } : item) }))} />Share contact details</label>
      {canEdit ? <div className="shoot-person-row-actions"><AddShootAssignment person={person} days={callSheet.days} onChange={onChange} /><button className="shoot-icon-button" type="button" aria-label={`Edit ${person.name}`} onClick={() => onEdit(person)}><DsIcon name="pencil-simple-ds" size={16} /></button></div> : null}
    </article>)}</div> : <p className="shoot-preproduction-empty-copy">No people have been added. Search Brisk contacts or create a shoot contact.</p>}
  </section>;
}

function AddShootAssignment({ person, days, onChange }: { person: ShootPerson; days: ShootDay[]; onChange: (updater: (current: CallSheet) => CallSheet) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<ShootPersonType>("crew");
  const [role, setRole] = useState("");
  const add = () => {
    const assignment: ShootAssignment = { id: `assignment-${Date.now()}`, type, role: role.trim(), callTime: days[0]?.generalCallTime ?? "", shootDayIds: "all" };
    onChange((current) => ({ ...current, people: current.people.map((item) => item.id === person.id ? { ...item, assignments: [...getShootAssignments(item), assignment] } : item) }));
    setRole("");
    setIsOpen(false);
  };
  return <div className="shoot-add-assignment"><button className="shoot-text-action label-xs-semibold" type="button" onClick={() => setIsOpen((open) => !open)}>Add assignment</button>{isOpen ? <div className="shoot-add-assignment-popover"><BriskSelect ariaLabel="Assignment type" clearable={false} searchable={false} value={type} options={(["crew", "talent", "client"] satisfies ShootPersonType[]).map((value) => ({ value, label: personTypeLabels[value] }))} placeholder="Choose type" onChange={(value) => { if (value) setType(value); }} /><input autoFocus placeholder="Shoot-specific role" value={role} onChange={(event) => setRole(event.target.value)} /><button className="shoot-button primary label-xs-semibold" type="button" onClick={add}>Add</button></div> : null}</div>;
}

function getVisibleOnSetDayEntries(callSheet: CallSheet, dayId: string) {
  const groupsWithShots = new Set(callSheet.entries
    .filter((entry) => entry.type === "shot" && entry.shotGroupId)
    .map((entry) => entry.shotGroupId));
  return callSheet.entries
    .filter((entry) => entry.type !== "shot" && entry.dayId === dayId && entry.startTime)
    .filter((entry) => entry.type !== "coverage" || Boolean(entry.linkedShotGroupId && groupsWithShots.has(entry.linkedShotGroupId)))
    .sort((left, right) => left.startTime.localeCompare(right.startTime));
}

function getOnSetPosition(callSheet: CallSheet, dayId: string) {
  const entries = getVisibleOnSetDayEntries(callSheet, dayId);
  const incompleteEntries = entries.filter((entry) => !isEntryComplete(entry));
  return { entries, currentEntry: incompleteEntries[0], nextEntry: incompleteEntries[1] };
}

function getOnSetEntryTitle(callSheet: CallSheet, entry: ProductionEntry | undefined) {
  if (!entry) return "Shoot complete";
  return callSheet.shotGroups?.find((group) => group.id === entry.linkedShotGroupId)?.name ?? entry.description;
}

function getOnSetEntryDetails(callSheet: CallSheet, entry: ProductionEntry | undefined) {
  if (!entry) return "Everything scheduled for this day is complete.";
  const location = callSheet.locations.find((candidate) => candidate.id === entry.locationId);
  return [formatTime(entry.startTime), entry.durationMinutes ? `${entry.durationMinutes} min` : null, location?.name].filter(Boolean).join(" · ");
}

function hasOnSetShootStarted(callSheet: CallSheet, day: ShootDay | undefined) {
  if (!day) return false;
  const scheduledEntries = getVisibleOnSetDayEntries(callSheet, day.id);
  if (scheduledEntries.some(isEntryComplete)) return true;
  const scheduledGroupIds = new Set(scheduledEntries.flatMap((entry) => entry.linkedShotGroupId ? [entry.linkedShotGroupId] : []));
  const hasShotActivity = callSheet.entries.some((entry) => entry.type === "shot"
    && (entry.shotGroupId ? scheduledGroupIds.has(entry.shotGroupId) : entry.dayId === day.id)
    && (entry.captureStatus ?? (entry.captured ? "captured" : "to-capture")) !== "to-capture");
  if (hasShotActivity || callSheet.questions.some((question) => question.asked && isAssignedToDay(question.shootDayIds, day.id))) return true;

  const now = new Date();
  const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const localTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return day.date === localDate && Boolean(day.generalCallTime) && localTime >= day.generalCallTime;
}

function OnSetNowNextStrip({ callSheet, day, onOpenCurrent, onSelectDay }: {
  callSheet: CallSheet;
  day: ShootDay;
  onOpenCurrent: (entryId: string) => void;
  onSelectDay: (dayId: string) => void;
}) {
  const { currentEntry, nextEntry } = getOnSetPosition(callSheet, day.id);
  const currentTitle = getOnSetEntryTitle(callSheet, currentEntry);
  const nextTitle = nextEntry ? getOnSetEntryTitle(callSheet, nextEntry) : "No more scheduled items";
  return <aside className="shoot-on-set-global-now-next" aria-label="Current shoot-day position">
    <div className="shoot-on-set-global-day"><BriskSelect
      ariaLabel="Choose shoot day"
      className="shoot-on-set-global-day-select"
      clearable={false}
      searchable={false}
      value={day.id}
      options={callSheet.days.map((shootDay) => ({ value: shootDay.id, label: shootDay.date ? `${shootDay.label} - ${formatEditorDate(shootDay.date)}` : shootDay.label }))}
      placeholder="Choose day"
      triggerClassName="shoot-on-set-global-day-trigger"
      triggerContent={<><span className="label-xs-semibold">{day.label} of {callSheet.days.length}</span><strong>{day.date ? formatEditorDate(day.date) : "Date not confirmed"}</strong></>}
      onChange={(value) => { if (value) onSelectDay(value); }}
    /></div>
    {currentEntry ? <button className="shoot-on-set-global-current" type="button" onClick={() => onOpenCurrent(currentEntry.id)}><span className="label-xs-semibold">Now</span><strong>{currentTitle}</strong><small className="label-xs">{getOnSetEntryDetails(callSheet, currentEntry)}</small></button> : <div className="shoot-on-set-global-current is-complete"><span className="label-xs-semibold">Now</span><strong>{currentTitle}</strong><small className="label-xs">{getOnSetEntryDetails(callSheet, currentEntry)}</small></div>}
    <div className="shoot-on-set-global-next"><span className="label-xs-semibold">Next</span><strong>{nextTitle}</strong>{nextEntry ? <small className="label-xs">{getOnSetEntryDetails(callSheet, nextEntry)}</small> : null}</div>
  </aside>;
}

function OnSetCaptureControl({ canEdit, shotNumber, status, onChange }: {
  canEdit: boolean;
  shotNumber: string;
  status: ShotCaptureStatus;
  onChange: (status: ShotCaptureStatus) => void;
}) {
  const isCaptured = status === "captured";
  return <div className="shoot-on-set-capture-control">
    <label className="shoot-checkbox shoot-on-set-shot-check">
      <input type="checkbox" disabled={!canEdit} checked={isCaptured} aria-label={`Mark shot ${shotNumber} as ${isCaptured ? "not captured" : "captured"}`} onChange={() => onChange(isCaptured ? "to-capture" : "captured")} />
      <span aria-hidden="true"><DsIcon name="check" size={14} /></span>
    </label>
  </div>;
}

function OnSetRunOfDay({ callSheet, canEdit, currentDay, entries, onChange, onToggleCompletion }: {
  callSheet: CallSheet;
  canEdit: boolean;
  currentDay: ShootDay | undefined;
  entries: ProductionEntry[];
  onChange: (updater: (current: CallSheet) => CallSheet) => void;
  onToggleCompletion: (entryId: string) => void;
}) {
  const groups = [...(callSheet.shotGroups ?? [])].sort((left, right) => left.order - right.order);
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const shots = callSheet.entries
    .filter((entry) => entry.type === "shot")
    .sort((left, right) => (left.shotListOrder ?? 0) - (right.shotListOrder ?? 0));
  const scheduledGroupIds = new Set(entries.flatMap((entry) => entry.linkedShotGroupId ? [entry.linkedShotGroupId] : []));
  const dayShots = shots.filter((shot) => shot.shotGroupId
    ? scheduledGroupIds.has(shot.shotGroupId)
    : shot.dayId === currentDay?.id);
  const requiredShots = dayShots.filter((shot) => (shot.captureStatus ?? (shot.captured ? "captured" : "to-capture")) !== "not-required");
  const capturedCount = requiredShots.filter((shot) => (shot.captureStatus ?? (shot.captured ? "captured" : "to-capture")) === "captured").length;
  const topLevelOrder = getShotListTopLevelOrder(callSheet);
  const topLevelNumberById = new Map(topLevelOrder.map((id, index) => [id, index + 1]));
  const displayShotNumberById = new Map<string, string>();
  groups.forEach((group) => {
    const groupNumber = topLevelNumberById.get(group.id);
    shots.filter((shot) => shot.shotGroupId === group.id).forEach((shot, index) => {
      displayShotNumberById.set(shot.id, groupNumber ? `${groupNumber}.${index + 1}` : String(index + 1));
    });
  });
  shots.filter((shot) => !shot.shotGroupId || !groupById.has(shot.shotGroupId)).forEach((shot) => {
    displayShotNumberById.set(shot.id, String(topLevelNumberById.get(shot.id) ?? shots.indexOf(shot) + 1));
  });
  const standaloneShots = shots.filter((shot) => (!shot.shotGroupId || !groupById.has(shot.shotGroupId)) && shot.dayId === currentDay?.id);
  const visibleEntries = entries.filter((entry) => entry.type !== "coverage" || Boolean(entry.linkedShotGroupId && shots.some((shot) => shot.shotGroupId === entry.linkedShotGroupId)));
  const incompleteEntries = visibleEntries.filter((entry) => !isEntryComplete(entry));
  const currentEntry = incompleteEntries[0];
  const nextEntry = incompleteEntries[1];
  const [expandedEntryIds, setExpandedEntryIds] = useState<string[]>(() => currentEntry?.type === "coverage" ? [currentEntry.id] : []);

  useEffect(() => {
    setExpandedEntryIds(currentEntry?.type === "coverage" ? [currentEntry.id] : []);
  }, [currentDay?.id, currentEntry?.id]);

  const updateShot = (shotId: string, patch: Partial<ProductionEntry>) => onChange((current) => ({
    ...current,
    entries: current.entries.map((entry) => entry.id === shotId ? { ...entry, ...patch } : entry),
  }));
  const addShot = (groupId?: string) => {
    const id = `entry-${Date.now()}`;
    onChange((current) => {
      const currentShots = current.entries.filter((entry) => entry.type === "shot");
      const currentTopLevelOrder = getShotListTopLevelOrder(current);
      const nextCallSheet: CallSheet = {
        ...current,
        entries: [...current.entries, {
          id,
          dayId: groupId ? "" : currentDay?.id ?? "",
          shotNumber: Math.max(0, ...currentShots.map((shot) => shot.shotNumber ?? 0)) + 1,
          shotListOrder: Math.max(-1, ...currentShots.map((shot) => shot.shotListOrder ?? -1)) + 1,
          startTime: "",
          durationMinutes: 0,
          description: "New shot",
          type: "shot",
          personIds: [],
          captured: false,
          priority: "Medium",
          captureStatus: "to-capture",
          shotGroupId: groupId ?? null,
        }],
      };
      return applyShotListTopLevelOrder(nextCallSheet, groupId ? currentTopLevelOrder : [...currentTopLevelOrder, id]);
    });
  };
  const toggleExpanded = (id: string) => setExpandedEntryIds((current) => current.includes(id)
    ? current.filter((entryId) => entryId !== id)
    : [...current, id]);
  const renderShotTable = (groupShots: ProductionEntry[], label: string) => groupShots.length ? <div className="shoot-on-set-table" role="table" aria-label={label}>
    <div className="shoot-on-set-table-header label-xs" role="row"><span>Capture</span><span>#</span><span>Shot</span><span>Priority</span><span>Reference</span><span>Quick note</span></div>
    {groupShots.map((shot) => {
      const status = shot.captureStatus ?? (shot.captured ? "captured" : "to-capture");
      const shotNumber = displayShotNumberById.get(shot.id) ?? String(shots.indexOf(shot) + 1);
      const shotDetails = [shot.shotSize, shot.cameraMovement].filter(Boolean).join(" · ");
      return <div className={`shoot-on-set-row is-${status}`} role="row" key={shot.id}>
        <OnSetCaptureControl canEdit={canEdit} shotNumber={shotNumber} status={status} onChange={(value) => updateShot(shot.id, { captureStatus: value, captured: value === "captured" })} />
        <span className="label-xs-semibold">{shotNumber}</span>
        <span className="shoot-on-set-shot-copy"><strong>{shot.description}</strong>{shotDetails ? <small className="label-xs">{shotDetails}</small> : null}</span>
        <span className="shoot-on-set-priority label-s">{shot.priority === "Critical" ? <DsIcon name="fire-simple" size={15} /> : null}{shot.priority ?? "Medium"}</span>
        <span>{shot.imageReferenceUrl ? <img className="shoot-on-set-reference" src={shot.imageReferenceUrl} alt={`Reference for ${shot.description}`} /> : <DsIcon name="image-square" size={16} />}</span>
        <input disabled={!canEdit} aria-label={`Quick note for shot ${shotNumber}`} placeholder="Add note" value={shot.notes ?? ""} onChange={(event) => updateShot(shot.id, { notes: event.target.value })} />
      </div>;
    })}
  </div> : <p className="shoot-preproduction-empty-copy">No shots have been added to this coverage yet.</p>;
  const renderCoverageDetails = (group: ShotGroup) => {
    const groupShots = shots.filter((shot) => shot.shotGroupId === group.id);
    const requiredShots = groupShots.filter((shot) => (shot.captureStatus ?? (shot.captured ? "captured" : "to-capture")) !== "not-required");
    const capturedShots = requiredShots.filter((shot) => (shot.captureStatus ?? (shot.captured ? "captured" : "to-capture")) === "captured");
    return <div className="shoot-on-set-run-details">
      <div className="shoot-on-set-coverage-heading">
        <p className="label-s-semibold">{capturedShots.length} of {requiredShots.length} captured</p>
        {canEdit ? <button className="shoot-button secondary label-xs-semibold" type="button" onClick={() => addShot(group.id)}><DsIcon name="plus" size={15} />Add shot</button> : null}
      </div>
      {renderShotTable(groupShots, `${group.name} shots`)}
    </div>;
  };
  const renderOperationalDetails = (entry: ProductionEntry) => {
    const assignedPeople = callSheet.people.filter((person) => entry.personIds.includes(person.id));
    return <div className="shoot-on-set-run-details shoot-on-set-operational-details">
      <dl>
        {assignedPeople.length ? <div><dt className="label-xs-semibold">People</dt><dd className="label-s">{assignedPeople.map((person) => person.role ? `${person.name} - ${person.role}` : person.name).join(" · ")}</dd></div> : null}
        {entry.notes ? <div><dt className="label-xs-semibold">Notes</dt><dd className="label-s">{entry.notes}</dd></div> : null}
      </dl>
    </div>;
  };

  return <section className="shoot-preproduction-section shoot-on-set-run-of-day">
    <PreProductionSectionHeading
      title="Shoot day"
      description={currentDay ? `${currentDay.label}${currentDay.date ? ` - ${formatEditorDate(currentDay.date)}` : ""}` : "Choose a shoot day to see its schedule."}
      action={<div className="shoot-preproduction-heading-inline-actions">
        <div className="shoot-workspace-progress"><strong className="label-s-semibold">{capturedCount} of {requiredShots.length} captured</strong><span aria-hidden="true"><i style={{ width: `${requiredShots.length ? (capturedCount / requiredShots.length) * 100 : 0}%` }} /></span></div>
      </div>}
    />
    {visibleEntries.length ? <ol className="shoot-on-set-run-list">
      {visibleEntries.map((entry) => {
        const isComplete = isEntryComplete(entry);
        const scheduleType = scheduleTypeOptions.find((option) => option.value === entry.type);
        const linkedGroup = groupById.get(entry.linkedShotGroupId ?? "");
        const location = callSheet.locations.find((candidate) => candidate.id === entry.locationId);
        const status = isComplete ? "Done" : entry.id === currentEntry?.id ? "Now" : entry.id === nextEntry?.id ? "Next" : "Upcoming";
        const isExpandable = Boolean(linkedGroup || entry.personIds.length || entry.notes);
        const isExpanded = expandedEntryIds.includes(entry.id);
        const groupShots = linkedGroup ? shots.filter((shot) => shot.shotGroupId === linkedGroup.id) : [];
        const capturedShots = groupShots.filter((shot) => (shot.captureStatus ?? (shot.captured ? "captured" : "to-capture")) === "captured").length;
        return <li className={`${isComplete ? "is-complete " : ""}${status === "Now" ? "is-current" : ""}`} data-on-set-entry-id={entry.id} key={entry.id}>
          <div className="shoot-on-set-run-summary">
            <label className="shoot-checkbox shoot-on-set-run-check">
              <input type="checkbox" disabled={!canEdit} checked={isComplete} aria-label={`Mark ${linkedGroup?.name ?? entry.description} as ${isComplete ? "not complete" : "complete"}`} onChange={() => onToggleCompletion(entry.id)} />
              <span aria-hidden="true"><DsIcon name="check" size={14} /></span>
            </label>
            <time className="label-s-semibold">{formatTime(entry.startTime)}</time>
            <span className={`shoot-schedule-type is-${entry.type} label-xs-semibold`}>{scheduleType ? <DsIcon name={scheduleType.icon} size={14} /> : null}{scheduleType?.label ?? "Schedule"}</span>
            {isExpandable ? <button className="shoot-on-set-run-expand" type="button" aria-expanded={isExpanded} onClick={() => toggleExpanded(entry.id)}><DsIcon name="caret-right" size={15} /><span className="shoot-on-set-run-copy"><strong>{linkedGroup?.name ?? entry.description}</strong><small className="label-s">{[linkedGroup ? `${capturedShots} of ${groupShots.length} captured` : null, entry.durationMinutes ? `${entry.durationMinutes} min` : null, location?.name].filter(Boolean).join(" · ")}</small></span></button> : <span className="shoot-on-set-run-copy"><strong>{entry.description}</strong><small className="label-s">{[entry.durationMinutes ? `${entry.durationMinutes} min` : null, location?.name].filter(Boolean).join(" · ")}</small></span>}
            {!isComplete ? <span className={`shoot-on-set-run-status is-${status.toLowerCase()} label-xs-semibold`}>{status}</span> : null}
          </div>
          {isExpanded ? linkedGroup ? renderCoverageDetails(linkedGroup) : renderOperationalDetails(entry) : null}
        </li>;
      })}
    </ol> : <p className="shoot-preproduction-empty-copy">Nothing has been scheduled for this shoot day yet. Switch to Planning to build the run of day.</p>}
    {standaloneShots.length ? <section className="shoot-on-set-unplanned">
      <header><div><h3>Unplanned coverage</h3><p className="label-xs">Keep useful pickups visible without adding them to the schedule.</p></div></header>
      {renderShotTable(standaloneShots, "Unplanned standalone shots")}
    </section> : null}
  </section>;
}

function PreProductionSchedule({ callSheet, canEdit, mode, projectId, selectedDayId, onChange, onDeleteDay, onEditEntry, onNewEntry, onSelectDay }: {
  callSheet: CallSheet;
  canEdit: boolean;
  mode: ShootMode;
  projectId: string;
  selectedDayId: string;
  onChange: (updater: (current: CallSheet) => CallSheet) => void;
  onDeleteDay: (dayId: string) => void;
  onEditEntry: (entry: ProductionEntry) => void;
  onNewEntry: (dayId: string, startTime?: string) => void;
  onSelectDay: (dayId: string) => void;
}) {
  const [isMobileBacklogOpen, setIsMobileBacklogOpen] = useState(false);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const isPublished = publishedAt === callSheet.updatedAt;
  const currentDay = callSheet.days.find((day) => day.id === selectedDayId) ?? callSheet.days[0];
  const shotGroups = [...(callSheet.shotGroups ?? [])].sort((left, right) => left.order - right.order);
  const coverageEntries = callSheet.entries.filter((entry) => entry.type === "coverage" && entry.linkedShotGroupId);
  const unassignedGroups = shotGroups.filter((group) => !coverageEntries.some((entry) => entry.linkedShotGroupId === group.id));
  const dayEntries = callSheet.entries.filter((entry) => entry.type !== "shot" && entry.dayId === currentDay?.id);
  const scheduled = dayEntries.filter((entry) => Boolean(entry.startTime)).sort((left, right) => left.startTime.localeCompare(right.startTime));
  const unscheduledGroups = dayEntries.filter((entry) => entry.type === "coverage" && !entry.startTime).flatMap((entry) => {
    const group = shotGroups.find((candidate) => candidate.id === entry.linkedShotGroupId);
    return group ? [group] : [];
  });
  const clashes = getScheduleClashes(scheduled);
  const backlogCount = unassignedGroups.length + unscheduledGroups.length;

  const applyChange = (updater: (current: CallSheet) => CallSheet) => {
    setPublishedAt(null);
    onChange(updater);
  };

  const updateDay = (patch: Partial<ShootDay>) => {
    if (!currentDay) return;
    applyChange((current) => ({ ...current, days: current.days.map((day) => day.id === currentDay.id ? { ...day, ...patch } : day) }));
  };

  const addDay = () => {
    const id = `day-${Date.now()}`;
    applyChange((current) => ({
      ...current,
      days: [...current.days, {
        ...createEmptyShootDay(id),
        label: `Day ${current.days.length + 1}`,
        date: getFollowingDate(getLatestShootDate(current.days)),
      }],
    }));
    onSelectDay(id);
  };

  const moveEntry = (entryId: string, startTime: string) => {
    if (!canEdit || !currentDay) return;
    applyChange((current) => {
      const group = (current.shotGroups ?? []).find((candidate) => candidate.id === entryId);
      const existingCoverage = group ? current.entries.find((entry) => entry.type === "coverage" && entry.linkedShotGroupId === group.id) : undefined;
      if (group && !existingCoverage) {
        const groupShots = current.entries.filter((entry) => entry.type === "shot" && entry.shotGroupId === group.id);
        return {
          ...current,
          entries: [...current.entries, {
            id: `coverage-${group.id}-${Date.now()}`,
            dayId: currentDay.id,
            startTime,
            durationMinutes: 60,
            description: group.name,
            type: "coverage",
            locationId: group.locationId ?? currentDay.primaryLocationId,
            personIds: [...new Set(groupShots.flatMap((shot) => shot.personIds))],
            linkedShotGroupId: group.id,
          }],
        };
      }
      return {
        ...current,
        entries: current.entries.map((entry) => entry.id === (existingCoverage?.id ?? entryId) ? {
          ...entry,
          dayId: currentDay.id,
          startTime,
          durationMinutes: entry.durationMinutes || 30,
        } : entry),
      };
    });
  };

  const resizeEntry = (entryId: string, durationMinutes: number) => {
    if (!canEdit) return;
    applyChange((current) => ({
      ...current,
      entries: current.entries.map((entry) => entry.id === entryId ? { ...entry, durationMinutes: Math.max(15, Math.min(240, durationMinutes)) } : entry),
    }));
  };

  const toggleCompletion = (entryId: string) => {
    if (!canEdit) return;
    applyChange((current) => ({
      ...current,
      entries: current.entries.map((entry) => entry.id === entryId
        ? entry.type === "shot"
          ? { ...entry, captured: !isEntryComplete(entry) }
          : { ...entry, completed: !isEntryComplete(entry) }
        : entry),
    }));
  };

  if (mode === "on-set") {
    return <OnSetRunOfDay callSheet={callSheet} canEdit={canEdit} currentDay={currentDay} entries={scheduled} onChange={applyChange} onToggleCompletion={toggleCompletion} />;
  }

  return <section className="shoot-preproduction-section">
    <PreProductionSectionHeading
      title="Schedule"
      description="Arrange Shot Groups and operational blocks into the run of day."
      action={<div className="shoot-preproduction-heading-inline-actions">
        <span className={`shoot-publish-state label-xs-semibold ${isPublished ? "is-published" : ""}`}>{isPublished ? "Call Sheet published" : "Unpublished changes"}</span>
        {currentDay ? <a className="shoot-button secondary label-s-semibold" href={`/share/call-sheet/${projectId}?day=${encodeURIComponent(currentDay.id)}`} target="_blank" rel="noreferrer"><DsIcon name="arrow-bend-up-right" size={16} />Preview Call Sheet</a> : null}
        {canEdit && currentDay ? <button className="shoot-button secondary label-s-semibold" type="button" onClick={() => setPublishedAt(callSheet.updatedAt)}>Publish</button> : null}
        {canEdit ? <button className="shoot-button secondary label-s-semibold" type="button" onClick={addDay}><DsIcon name="plus" size={16} />Add shoot day</button> : null}
      </div>}
    />
    <div className="shoot-preproduction-schedule">
      <div className="shoot-schedule-day-tabs" role="tablist" aria-label="Shoot days">{callSheet.days.map((day) => <button className={day.id === currentDay?.id ? "active label-s-semibold" : "label-s-semibold"} type="button" role="tab" aria-selected={day.id === currentDay?.id} key={day.id} onClick={() => onSelectDay(day.id)}>{day.label}<small>{day.date ? formatEditorDate(day.date) : "Date not confirmed"}</small></button>)}</div>
      {currentDay ? <>
        <section className="shoot-schedule-day-settings" aria-label={`${currentDay.label} settings`}>
          <header>
            <div><h3>{currentDay.label}</h3><p className="label-xs">Set the working bounds for the timeline.</p></div>
            {canEdit && callSheet.days.length > 1 ? <button className="shoot-icon-button" type="button" aria-label={`Remove ${currentDay.label}`} onClick={() => onDeleteDay(currentDay.id)}><DsIcon name="trash-simple" size={16} /></button> : null}
          </header>
          <div>
            <label className="shoot-preproduction-field"><span>Shoot date</span><input disabled={!canEdit} type="date" value={currentDay.date} onChange={(event) => updateDay({ date: event.target.value })} /></label>
            <label className="shoot-preproduction-field"><span>General call</span><TimeSelect disabled={!canEdit} value={currentDay.generalCallTime} onChange={(generalCallTime) => updateDay({ generalCallTime, timelineStartTime: generalCallTime })} /></label>
            <label className="shoot-preproduction-field"><span>Expected wrap</span><TimeSelect disabled={!canEdit} value={currentDay.expectedWrapTime} onChange={(expectedWrapTime) => updateDay({ expectedWrapTime, timelineEndTime: expectedWrapTime })} /></label>
            <label className="shoot-preproduction-field"><span>Primary location</span>{canEdit ? <BriskSelect ariaLabel={`Primary location for ${currentDay.label}`} value={currentDay.primaryLocationId ?? ""} options={callSheet.locations.map((location) => ({ value: location.id, label: location.name }))} placeholder="Not confirmed" onChange={(primaryLocationId) => updateDay({ primaryLocationId })} /> : <span className="shoot-readonly-field">{callSheet.locations.find((location) => location.id === currentDay.primaryLocationId)?.name ?? "Not confirmed"}</span>}</label>
          </div>
        </section>
        <div className="shoot-preproduction-schedule-layout">
          <section className="shoot-run-of-day">
            <header>
              <div><h3>Run of day</h3><p className="label-xs">Drag Shot Groups onto a time. Add calls, setup, travel, breaks and wrap as separate blocks.</p></div>
              {canEdit ? <button className="shoot-button primary label-s-semibold" type="button" onClick={() => onNewEntry(currentDay.id)}><DsIcon name="plus" size={16} />Add schedule item</button> : null}
            </header>
            <button className="shoot-button secondary shoot-mobile-backlog-trigger label-s-semibold" type="button" onClick={() => setIsMobileBacklogOpen(true)}>Shot Groups<span>{backlogCount}<DsIcon name="caret-down" size={14} /></span></button>
            <ScheduleTimeline
              canEdit={canEdit}
              day={currentDay}
              entries={scheduled}
              highlightedEntryId={null}
              locations={callSheet.locations}
              people={callSheet.people}
              shotEntries={callSheet.entries.filter((entry) => entry.type === "shot")}
              shotGroups={shotGroups}
              clashes={clashes}
              onEdit={onEditEntry}
              onAddAtTime={(startTime) => onNewEntry(currentDay.id, startTime)}
              onMove={moveEntry}
              onResize={resizeEntry}
              onToggleCompletion={toggleCompletion}
            />
          </section>
          <ScheduleShotBacklog
            canEdit={canEdit}
            currentDay={currentDay}
            entries={callSheet.entries}
            unassignedGroups={unassignedGroups}
            unscheduledGroups={unscheduledGroups}
          />
        </div>
        {isMobileBacklogOpen ? <div className="shoot-mobile-backlog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsMobileBacklogOpen(false); }}><ScheduleShotBacklog
          canEdit={canEdit}
          currentDay={currentDay}
          isMobile
          entries={callSheet.entries}
          unassignedGroups={unassignedGroups}
          unscheduledGroups={unscheduledGroups}
          onClose={() => setIsMobileBacklogOpen(false)}
        /></div> : null}
      </> : <p className="shoot-preproduction-empty-copy">Add a shoot day before building the Schedule.</p>}
    </div>
  </section>;
}

function ScheduleShotBacklog({ canEdit, currentDay, entries, isMobile = false, unassignedGroups, unscheduledGroups, onClose }: {
  canEdit: boolean;
  currentDay: ShootDay;
  entries: ProductionEntry[];
  isMobile?: boolean;
  unassignedGroups: ShotGroup[];
  unscheduledGroups: ShotGroup[];
  onClose?: () => void;
}) {
  const renderGroups = (groups: ShotGroup[]) => groups.length ? <div className="shoot-schedule-backlog-list" role="list">{groups.map((group) => {
    const groupShots = entries.filter((entry) => entry.type === "shot" && entry.shotGroupId === group.id);
    const metadata = `${groupShots.length} ${groupShots.length === 1 ? "shot" : "shots"}${group.subject ? ` · ${group.subject}` : ""}`;
    return <article
      className="shoot-schedule-backlog-card"
      draggable={canEdit}
      role="listitem"
      key={group.id}
      onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", group.id); }}
    >
      <span className="shoot-drag-handle" aria-hidden="true"><DsIcon name="dots-six-vertical" size={16} /></span>
      <span className="shoot-schedule-type is-coverage label-xs-semibold"><DsIcon name="video-camera-ds" size={14} /></span>
      <div><strong>{group.name}</strong><span className="label-xs">{metadata}</span></div>
    </article>;
  })}</div> : <p className="shoot-schedule-backlog-empty label-xs">None</p>;

  return <aside className={`shoot-schedule-backlog ${isMobile ? "is-mobile" : ""}`} aria-label="Shots to schedule" role={isMobile ? "dialog" : undefined} aria-modal={isMobile ? true : undefined}>
    <header>
      <div><h3>Shot Groups</h3><p className="label-xs">Drag a group onto the timeline.</p></div>
      {isMobile ? <button className="shoot-icon-button" type="button" aria-label="Close shots to schedule" onClick={onClose}><DsIcon name="x-close-cross" size={16} /></button> : null}
    </header>
    <section>
      <div className="shoot-schedule-backlog-heading"><div><h4>Unassigned</h4><span className="label-xs">No shoot day</span></div><span className="shoot-count-badge label-xs-semibold">{unassignedGroups.length}</span></div>
      {renderGroups(unassignedGroups)}
    </section>
    <section>
      <div className="shoot-schedule-backlog-heading"><div><h4>{currentDay.label} - no time</h4><span className="label-xs">Assigned to this day</span></div><span className="shoot-count-badge label-xs-semibold">{unscheduledGroups.length}</span></div>
      {renderGroups(unscheduledGroups)}
    </section>
  </aside>;
}

const shootDayNoteFields: Array<{ key: keyof ShootDayNotes; label: string; description: string; private?: boolean }> = [
  { key: "equipment", label: "Equipment", description: "Camera, lighting, sound and specialist kit." },
  { key: "wardrobe", label: "Wardrobe", description: "Clothing, styling and continuity requirements." },
  { key: "catering", label: "Catering", description: "Meals, dietary needs and refreshment arrangements." },
  { key: "access", label: "Access", description: "Arrival, loading, entry and site instructions." },
  { key: "safety", label: "Safety", description: "Hazards, controls and emergency information." },
  { key: "weatherConsiderations", label: "Weather considerations", description: "Weather-specific contingencies or requirements." },
  { key: "clientNotes", label: "Client-visible notes", description: "Useful notes that may appear on the shared Call Sheet." },
  { key: "internalNotes", label: "Internal Studio notes", description: "Visible only to Studio-internal users.", private: true },
];

function PreProductionNotes({ callSheet, canEdit, isStudioInternal, selectedDayId, onChange, onSelectDay }: { callSheet: CallSheet; canEdit: boolean; isStudioInternal: boolean; selectedDayId: string; onChange: (updater: (current: CallSheet) => CallSheet) => void; onSelectDay: (dayId: string) => void }) {
  const day = callSheet.days.find((item) => item.id === selectedDayId) ?? callSheet.days[0];
  const notes = day?.notes ?? emptyShootDayNotes();
  const updateNote = (key: keyof ShootDayNotes, value: string) => {
    if (!day) return;
    onChange((current) => ({ ...current, days: current.days.map((item) => item.id === day.id ? { ...item, notes: { ...emptyShootDayNotes(), ...item.notes, [key]: value } } : item) }));
  };
  return <section className="shoot-preproduction-section">
    <PreProductionSectionHeading icon="file-text" title="What should everyone know?" description="Add only the production note sections needed for each shoot day." />
    <div className="shoot-note-day-control"><span className="label-s-semibold">Notes for</span><BriskSelect ariaLabel="Choose shoot day for notes" clearable={false} searchable={false} value={day?.id ?? ""} options={callSheet.days.map((item) => ({ value: item.id, label: item.label }))} placeholder="Choose day" onChange={(value) => { if (value) onSelectDay(value); }} /></div>
    <div className="shoot-day-notes-list">{shootDayNoteFields.filter((field) => !field.private || isStudioInternal).map((field) => <details open={Boolean(notes[field.key])} key={field.key}>
      <summary><span><strong>{field.label}</strong><small className="label-xs">{notes[field.key] ? "Added" : field.description}</small></span><DsIcon name="caret-down" size={14} /></summary>
      <textarea disabled={!canEdit} rows={4} placeholder={`Add ${field.label.toLowerCase()} for ${day?.label ?? "the day"}`} value={notes[field.key]} onChange={(event) => updateNote(field.key, event.target.value)} />
    </details>)}</div>
  </section>;
}

function PreProductionDocuments({ callSheet, canEdit, onChange, onOpenDocuments }: { callSheet: CallSheet; canEdit: boolean; onChange: (updater: (current: CallSheet) => CallSheet) => void; onOpenDocuments: () => void }) {
  return <section className="shoot-preproduction-section">
    <PreProductionSectionHeading icon="folder" title="Supporting shoot documents" description="Attach reference files without changing the coverage or status of the native production plan." action={canEdit ? <button className="shoot-button primary label-s-semibold" type="button" onClick={onOpenDocuments}><DsIcon name="plus" size={16} />Add supporting document</button> : null} />
    {callSheet.documents.length ? <div className="shoot-supporting-document-list">{callSheet.documents.map((document) => <article key={document.id}><span><DsIcon name={document.kind === "link" ? "link" : "file-text"} size={20} /></span><div><strong>{document.name}</strong><small className="label-xs">{document.type ?? "Supporting document"} · {formatDayAssignment(document.shootDayIds, callSheet.days)}</small></div><a className="shoot-button secondary label-xs-semibold" href={document.url} target="_blank" rel="noreferrer">Open</a>{document.kind !== "link" ? <a className="shoot-icon-button" aria-label={`Download ${document.name}`} href={document.url} download><DsIcon name="download-simple" size={16} /></a> : null}{canEdit ? <button className="shoot-icon-button" type="button" aria-label={`Remove ${document.name}`} onClick={() => onChange((current) => ({ ...current, documents: current.documents.filter((item) => item.id !== document.id) }))}><DsIcon name="trash-simple" size={16} /></button> : null}</article>)}</div> : <p className="shoot-preproduction-empty-copy">No supporting shoot documents have been added.</p>}
  </section>;
}

function ExistingPlanCallSheetAttachment({ plan, onReplace, onNotify }: { plan: ExistingShootPlan; onReplace: () => void; onNotify: (message: string) => void }) {
  const callSheetName = plan.secondaryName ?? (plan.coverage === "day" || plan.coverage === "both" ? plan.name : "");
  if (!callSheetName) return null;
  return <aside className="shoot-existing-call-sheet-attachment"><span><DsIcon name="paperclip" size={18} /></span><div><strong>Attached Call Sheet</strong><small className="label-xs">{callSheetName} · Added by {plan.addedBy} on {plan.addedAt}</small></div>{plan.secondaryUrl || plan.url ? <a className="shoot-button secondary label-xs-semibold" href={plan.secondaryUrl ?? plan.url} target="_blank" rel="noreferrer">Open</a> : null}<button className="shoot-button secondary label-xs-semibold" type="button" onClick={onReplace}>Replace</button><button className="shoot-text-action label-xs-semibold" type="button" onClick={() => onNotify("Review requested for the attached plan.")}>Request review</button></aside>;
}

function ShootReadinessModal({ action, missing, onAddDetails, onCancel, onContinue }: { action: ShootReadinessAction; missing: string[]; onAddDetails: () => void; onCancel: () => void; onContinue: () => void }) {
  const labels: Record<ShootReadinessAction, string> = { share: "share the Call Sheet", review: "request review", approve: "approve the Shoot", start: "start the shoot" };
  return <div className="shoot-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}><section className="shoot-modal shoot-readiness-modal" role="dialog" aria-modal="true" aria-labelledby="shoot-readiness-title"><header><span className="shoot-modal-icon warning"><DsIcon name="alert-triangle" size={22} /></span><div><h2 id="shoot-readiness-title">Some Call Sheet details are not confirmed</h2><p>You can still {labels[action]}.</p></div></header><div className="shoot-readiness-list">{missing.map((item) => <span className="label-s" key={item}><DsIcon name="info" size={15} />{item}</span>)}</div><div className="shoot-modal-actions"><button className="shoot-button secondary label-s-semibold" type="button" onClick={onCancel}>Cancel</button><button className="shoot-button secondary label-s-semibold" type="button" onClick={onContinue}>Continue anyway</button><button className="shoot-button primary label-s-semibold" type="button" onClick={onAddDetails}>Add details</button></div></section></div>;
}

function ShootAccessModal({ settings, onChange, onClose }: { settings: ShootAccessSettings; onChange: (settings: ShootAccessSettings) => void; onClose: () => void }) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const options: Array<{ value: ShootAccessLevel; label: string }> = [
    { value: "viewOnly", label: "View only" },
    { value: "canEdit", label: "Can edit" },
    { value: "canManage", label: "Can manage" },
  ];

  const copyShootLink = () => {
    const url = `${window.location.origin}${window.location.pathname}`;
    void navigator.clipboard.writeText(url).then(
      () => setCopyStatus("copied"),
      () => setCopyStatus("error"),
    );
  };

  return <ModalShell
    compact
    title="Manage access"
    onClose={onClose}
    footer={<div className="shoot-modal-actions align-right"><Button size="S" variant="secondary" onClick={onClose}>Done</Button></div>}
  >
    <div className="shoot-access-share">
      <Button size="M" variant="primary" onClick={copyShootLink}>{copyStatus === "copied" ? "Link copied" : "Copy Shoot link"}</Button>
      <small className="label-xs">Share this Shoot workspace.</small>
      {copyStatus === "error" ? <small className="label-xs" role="status">Could not copy the link.</small> : null}
    </div>
    <div className="shoot-access-groups">
      <ShootAccessGroup
        label="Filmmaker access"
        name="shoot-filmmaker-access"
        options={options}
        value={settings.freelancer}
        onChange={(freelancer) => onChange({ ...settings, freelancer })}
      />
      <ShootAccessGroup
        label="Client access"
        name="shoot-client-access"
        options={options}
        value={settings.client}
        onChange={(client) => onChange({ ...settings, client })}
      />
    </div>
  </ModalShell>;
}

function ShootAccessGroup({ label, name, onChange, options, value }: {
  label: string;
  name: string;
  onChange: (value: ShootAccessLevel) => void;
  options: Array<{ value: ShootAccessLevel; label: string }>;
  value: ShootAccessLevel;
}) {
  return <fieldset className="shoot-access-group">
    <legend><span>{label}</span><strong>{formatShootAccessLevel(value)}</strong></legend>
    {options.map((option) => <label className="shoot-access-choice" key={option.value}>
      <input type="radio" name={name} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} />
      <span className="label-s">{option.label}</span>
    </label>)}
  </fieldset>;
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

function ShootDashboard({ callSheet, existingPlan, project, selectedRole, setupState, sharedCallSheetHref, selectedDayPdfHref, studioName, onApprove, onAttachPlan, onHandover, onOpenModule, onRestore, onSkip, onUnapprove }: {
  callSheet: CallSheet;
  existingPlan: ExistingShootPlan | null;
  project: Project;
  selectedRole: PrototypeRole;
  setupState: ShootSetupState;
  sharedCallSheetHref: string;
  selectedDayPdfHref: string;
  studioName: string;
  onApprove: () => void;
  onAttachPlan: () => void;
  onHandover: (owner: ShootSetupOwner) => void;
  onOpenModule: (view: ScheduleView) => void;
  onRestore: (view: ScheduleView) => void;
  onSkip: (view: ScheduleView) => void;
  onUnapprove: () => void;
}) {
  const [clientReview, setClientReview] = useState<"creative" | "details" | null>(null);
  const isClient = selectedRole === "Customer";
  const shotCount = callSheet.entries.filter((entry) => entry.type === "shot").length;
  const questionCount = callSheet.questions.length;
  const creativeCoveredByPlan = existingPlan?.coverage === "creative" || existingPlan?.coverage === "both";
  const dayCoveredByPlan = existingPlan?.coverage === "day" || existingPlan?.coverage === "both";
  const creativeReady = setupState.shotListComplete || creativeCoveredByPlan;
  const dayReady = setupState.scheduleComplete || dayCoveredByPlan;
  const canOpenCallSheet = dayReady || Boolean(existingPlan);
  const canApprove = (creativeReady || setupState.shotListSkipped) && (dayReady || setupState.scheduleSkipped);
  const callSheetStatus = setupState.status === "released"
    ? "Shoot ready"
    : setupState.approvalInvalidated
      ? "Changes made - approval required again"
    : canApprove
      ? "Ready to share"
      : setupState.scheduleStarted || setupState.shotListStarted || existingPlan
        ? "Call Sheet draft"
        : "Waiting for details";
  if (isClient) {
    return <section className="shoot-dashboard is-client" aria-labelledby="shoot-dashboard-title">
      <header className="shoot-dashboard-heading"><div><h1 id="shoot-dashboard-title">{project.name}</h1><p className="paragraph-s">Review the plans and shoot-day information shared by {studioName}.</p></div></header>
      <div className="shoot-dashboard-client-list">
        <ShootClientCard icon="film-slate" title="Creative Plan" description="Review the Interview Questions and shots planned for the shoot." action="Review Creative Plan" onClick={() => setClientReview("creative")} />
        <ShootClientCard icon="calendar" title="Shoot details" description="Confirm the date, location, Talent and access information." action="Review Shoot details" onClick={() => setClientReview("details")} />
        <article className="shoot-dashboard-client-card"><span className="shoot-dashboard-card-icon"><DsIcon name="clipboard-text" size={24} /></span><div><h2>Call Sheet</h2><p className="paragraph-s">Everything you need for the shoot day.</p></div>{canOpenCallSheet ? <Link className="shoot-button secondary label-s-semibold" href={sharedCallSheetHref} target="_blank">Open Call Sheet</Link> : <button className="shoot-button secondary label-s-semibold" type="button" disabled>Not ready yet</button>}</article>
      </div>
      {clientReview ? <ClientShootReview
        callSheet={callSheet}
        mode={clientReview}
        project={project}
        canApprove={canApprove && setupState.status === "waiting_on_client"}
        onApprove={onApprove}
        onClose={() => setClientReview(null)}
        onConfirm={() => onHandover("studio")}
      /> : null}
    </section>;
  }

  return <section className="shoot-dashboard" aria-labelledby="shoot-dashboard-title">
    <header className="shoot-dashboard-heading">
      <div><h1 id="shoot-dashboard-title">Plan and run the shoot</h1><p className="paragraph-s">Creative Plan and Plan the Day can be completed in either order. Both feed On Set.</p></div>
    </header>
    {setupState.approvalInvalidated ? <ShootApprovalChangedNotice /> : null}
    <div className="shoot-dashboard-modules">
      <ShootDashboardModule
        icon="film-slate"
        eyebrow="1"
        title="Creative Plan"
        description="Questions and shots"
        status={creativeCoveredByPlan ? "Existing plan attached" : setupState.shotListSkipped ? "Skipped" : shotCount ? `${questionCount ? `${questionCount} questions · ` : ""}${shotCount} shots drafted` : setupState.shotListStarted ? "In progress" : "Not started"}
        primaryLabel={creativeReady ? "Open" : "Continue"}
        skipped={setupState.shotListSkipped}
        onPrimary={() => onOpenModule("shots")}
        onRestore={() => onRestore("shots")}
        onSkip={() => onSkip("shots")}
      />
      <ShootDashboardModule
        icon="calendar"
        eyebrow="2"
        title="Plan the Day"
        description="Logistics and timing"
        status={dayCoveredByPlan ? "Existing plan attached" : setupState.scheduleSkipped ? "Skipped" : setupState.scheduleComplete ? "5 of 5 complete" : setupState.scheduleStarted ? `${Math.min(setupState.scheduleStep + 1, 5)} of 5 in progress` : "Not started"}
        primaryLabel={dayReady ? "Open" : "Continue"}
        skipped={setupState.scheduleSkipped}
        onPrimary={() => onOpenModule("schedule")}
        onRestore={() => onRestore("schedule")}
        onSkip={() => onSkip("schedule")}
      />
      <article className="shoot-dashboard-module is-on-set">
        <header><span className="shoot-dashboard-card-icon"><DsIcon name="clipboard-text" size={24} /></span><span className="shoot-dashboard-card-number label-xs-semibold">3</span></header>
        <div><h2>On Set</h2><p className="paragraph-s">Call Sheet and live shoot</p></div>
        <strong className="shoot-dashboard-module-status label-s-semibold">{callSheetStatus}</strong>
        <div className="shoot-dashboard-module-actions">
          {canOpenCallSheet ? <Link className="shoot-button primary label-s-semibold" href={sharedCallSheetHref} target="_blank">Open Call Sheet</Link> : <button className="shoot-button primary label-s-semibold" type="button" disabled title="Add shoot details or attach an existing plan first">Open Call Sheet</button>}
          {canOpenCallSheet ? <Link className="shoot-button secondary label-s-semibold" href={selectedDayPdfHref} target="_blank"><DsIcon name="download-simple" size={16} />PDF</Link> : null}
          <Link className="shoot-button secondary label-s-semibold" href={`/projects/${project.id}/stages/shoot?view=on-set&day=${encodeURIComponent(callSheet.days[0]?.id ?? "")}&section=schedule`}><DsIcon name="video-camera-ds" size={16} />Open On set</Link>
        </div>
      </article>
    </div>
    {existingPlan ? <section className="shoot-existing-plan"><span className="shoot-dashboard-card-icon"><DsIcon name={existingPlan.source === "link" ? "link-simple-horizontal" : "file-text"} size={22} /></span><div><strong>Existing plan attached</strong><span className="label-xs">{existingPlan.name} · {formatExistingPlanCoverage(existingPlan.coverage)}</span><small className="label-xs">Added by {existingPlan.addedBy} on {existingPlan.addedAt}</small></div><div>{existingPlan.url ? <a className="shoot-button secondary label-s-semibold" href={existingPlan.url} target="_blank" rel="noreferrer">Open</a> : null}<button className="shoot-button secondary label-s-semibold" type="button" onClick={onAttachPlan}>Replace</button><button className="shoot-button secondary label-s-semibold" type="button" onClick={() => onHandover("client")}>Request review</button></div></section> : null}
    <button className="shoot-use-existing-plan label-s-semibold" type="button" onClick={onAttachPlan}><DsIcon name="upload-simple" size={18} />{existingPlan ? "Replace the existing shoot plan" : "Use an existing shoot plan"}</button>
    <div className="shoot-dashboard-review-row">
      <ShareActionRow
        context="shoot"
        userRole={selectedRole}
        density="compact"
        initialAccess="canEdit"
        initialLinkOpens="stageOnly"
        projectName={project.name}
        studioName={studioName}
        customerName={project.clientName}
        copyLinkIconOnly
        approveLabel="Approve Shoot"
        approveDisabled={!canApprove}
        approveDisabledTooltip="Complete or skip both planning modules first"
        isApproved={setupState.status === "released"}
        onApprove={onApprove}
        onRequestReview={(recipient) => onHandover(recipient === "customer" ? "client" : "studio")}
        onSendToStudio={() => onHandover("studio")}
        onUnapprove={onUnapprove}
      />
    </div>
  </section>;
}

function ShootApprovalChangedNotice() {
  return <div className="shoot-approval-changed-notice" role="status">
    <DsIcon name="alert-triangle" size={18} />
    <div>
      <strong className="label-s-semibold">Changes made - approval required again</strong>
      <span className="label-xs">Important information on the live Call Sheet has changed since it was approved.</span>
    </div>
  </div>;
}

function ShootDashboardModule({ icon, eyebrow, title, description, status, primaryLabel, skipped, onPrimary, onRestore, onSkip }: { icon: DsIconName; eyebrow: string; title: string; description: string; status: string; primaryLabel: string; skipped: boolean; onPrimary: () => void; onRestore: () => void; onSkip: () => void }) {
  return <article className={`shoot-dashboard-module${skipped ? " is-skipped" : ""}`}>
    <header><span className="shoot-dashboard-card-icon"><DsIcon name={icon} size={24} /></span><span className="shoot-dashboard-card-number label-xs-semibold">{eyebrow}</span></header>
    <div><h2>{title}</h2><p className="paragraph-s">{description}</p></div>
    <strong className="shoot-dashboard-module-status label-s-semibold">{status}</strong>
    <div className="shoot-dashboard-module-actions">{skipped ? <Button size="S" variant="primary" onClick={onRestore}>Restore</Button> : <><Button size="S" variant="primary" onClick={onPrimary}>{primaryLabel}</Button><button className="shoot-text-action label-s-semibold" type="button" onClick={onSkip}>Skip</button></>}</div>
  </article>;
}

function ShootClientCard({ icon, title, description, action, onClick }: { icon: DsIconName; title: string; description: string; action: string; onClick: () => void }) {
  return <article className="shoot-dashboard-client-card"><span className="shoot-dashboard-card-icon"><DsIcon name={icon} size={24} /></span><div><h2>{title}</h2><p className="paragraph-s">{description}</p></div><Button size="S" variant="secondary" onClick={onClick}>{action}</Button></article>;
}

function ClientShootReview({ callSheet, mode, project, canApprove, onApprove, onClose, onConfirm }: { callSheet: CallSheet; mode: "creative" | "details"; project: Project; canApprove: boolean; onApprove: () => void; onClose: () => void; onConfirm: () => void }) {
  const day = callSheet.days[0];
  const location = callSheet.locations.find((item) => item.id === day?.primaryLocationId) ?? callSheet.locations[0];
  const shots = callSheet.entries.filter((entry) => entry.type === "shot").sort((left, right) => (left.shotListOrder ?? 0) - (right.shotListOrder ?? 0));
  const talent = callSheet.people.filter((person) => person.type === "talent");

  return <section className="shoot-client-review" aria-labelledby="shoot-client-review-title">
    <header><div><span className="label-xs-semibold">Client review</span><h2 id="shoot-client-review-title">{mode === "creative" ? "Creative Plan" : "Shoot details"}</h2></div><button className="shoot-icon-button" type="button" aria-label="Close review" onClick={onClose}><DsIcon name="x-close-cross" size={16} /></button></header>
    {mode === "creative" ? <div className="shoot-client-review-columns">
      {callSheet.questions.length ? <section><h3 className="label-s-semibold">Interview Questions</h3><ol>{callSheet.questions.map((question) => <li className="label-s" key={question.id}>{question.question}</li>)}</ol></section> : null}
      <section><h3 className="label-s-semibold">Shot List</h3>{shots.length ? <ol>{shots.map((shot) => <li key={shot.id}><strong className="label-s-semibold">{shot.description}</strong><span className="label-xs">{[shot.subject, shot.priority].filter(Boolean).join(" · ")}</span></li>)}</ol> : <p className="paragraph-s">No shots have been shared yet.</p>}</section>
    </div> : <dl className="shoot-client-review-details">
      <div><dt className="label-xs">Shoot date</dt><dd className="label-s-semibold">{day?.date ? formatEditorDate(day.date) : "Not confirmed yet"}</dd></div>
      <div><dt className="label-xs">Location</dt><dd className="label-s-semibold">{location?.name || "Not confirmed yet"}</dd>{location && (location.mapLink || location.address) ? <small className="label-xs"><a className="shoot-location-link" href={getMapsUrl(location.mapLink || location.address)} target="_blank" rel="noreferrer">{getMapsLinkLabel(location.address || location.mapLink || "")}</a></small> : null}</div>
      <div><dt className="label-xs">Talent</dt><dd className="label-s-semibold">{talent.length ? talent.map((person) => person.name).join(", ") : "Not confirmed yet"}</dd></div>
      <div><dt className="label-xs">Access</dt><dd className="label-s-semibold">{callSheet.practicalInfo.access || "Not confirmed yet"}</dd></div>
    </dl>}
    <footer><Link className="shoot-button secondary label-s-semibold" href={`/chat?project=${project.id}`}><DsIcon name="chat-circle" size={16} />Comment</Link>{canApprove ? <><Button size="S" variant="secondary" onClick={onConfirm}>Confirm details</Button><Button size="S" variant="primary" onClick={onApprove}>Approve Shoot</Button></> : null}</footer>
  </section>;
}

function SkipShootModuleModal({ path, onCancel, onConfirm }: { path: ScheduleView; onCancel: () => void; onConfirm: () => void }) {
  const isCreative = path === "shots";
  return <ModalShell
    compact
    title={`Skip ${isCreative ? "Creative Plan" : "Plan the Day"}?`}
    description={isCreative
      ? "Brisk will not create Interview Questions or a Shot List. You can restore this module later or add an existing plan."
      : "Brisk will not create a native Schedule or Call Sheet. You can upload an existing plan or continue without one."}
    onClose={onCancel}
    footer={<div className="shoot-modal-actions align-right"><Button size="S" variant="secondary" onClick={onCancel}>Cancel</Button><Button size="S" variant="primary" onClick={onConfirm}>Skip {isCreative ? "Creative Plan" : "Plan the Day"}</Button></div>}
  ><p className="paragraph-s">This will not delete any work already saved.</p></ModalShell>;
}

function ExistingShootPlanModal({ existingPlan, onClose, onSave }: { existingPlan: ExistingShootPlan | null; onClose: () => void; onSave: (plan: ExistingShootPlan) => void }) {
  const [source, setSource] = useState<ExistingShootPlan["source"]>(existingPlan?.source ?? "file");
  const [coverage, setCoverage] = useState<ExistingShootPlanCoverage>(existingPlan?.coverage ?? "both");
  const [name, setName] = useState(existingPlan?.name ?? "");
  const [url, setUrl] = useState(existingPlan?.url ?? "");
  const [secondaryFileName, setSecondaryFileName] = useState(existingPlan?.secondaryName ?? "");
  const [secondaryFileUrl, setSecondaryFileUrl] = useState(existingPlan?.secondaryUrl ?? "");
  const canSave = Boolean(name.trim() && (source === "file" || url.trim()));

  return <ModalShell
    wide
    title={existingPlan ? "Replace the existing shoot plan" : "Use an existing shoot plan"}
    description="Attach a PDF, spreadsheet or shared plan. For V1, Brisk displays and shares the original file without importing its contents."
    onClose={onClose}
    footer={<div className="shoot-modal-actions align-right"><Button size="S" variant="secondary" onClick={onClose}>Cancel</Button><Button size="S" variant="primary" disabled={!canSave} onClick={() => onSave({ name: name.trim(), source, url: url.trim() || undefined, coverage, addedBy: "Tom", addedAt: "7 September", secondaryName: secondaryFileName || undefined, secondaryUrl: secondaryFileUrl || undefined })}>{existingPlan ? "Replace plan" : "Attach plan"}</Button></div>}
  >
    <div className="shoot-existing-plan-form">
      <fieldset className="shoot-setup-checkboxes"><legend className="label-xs-semibold">Add the plan as</legend><label className="label-s"><input type="radio" name="plan-source" checked={source === "file"} onChange={() => setSource("file")} />Upload file</label><label className="label-s"><input type="radio" name="plan-source" checked={source === "link"} onChange={() => setSource("link")} />Paste share link</label></fieldset>
      {source === "file" ? <div className="shoot-setup-grid two-column"><label className="shoot-setup-field"><span className="label-xs-semibold">Shot List or Call Sheet</span><input type="file" accept=".pdf,.xls,.xlsx,.csv,.tsv" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; setName(file.name); setUrl(URL.createObjectURL(file)); }} /></label><label className="shoot-setup-field"><span className="label-xs-semibold">Optional second file</span><input type="file" accept=".pdf,.xls,.xlsx,.csv,.tsv" onChange={(event) => { const file = event.target.files?.[0]; setSecondaryFileName(file?.name ?? ""); setSecondaryFileUrl(file ? URL.createObjectURL(file) : ""); }} /></label></div> : <label className="shoot-setup-field"><span className="label-xs-semibold">Share link</span><input type="url" placeholder="https://" value={url} onChange={(event) => { setUrl(event.target.value); if (!name) setName("Shared shoot plan"); }} /></label>}
      <fieldset className="shoot-setup-checkboxes"><legend className="label-xs-semibold">What does this plan cover?</legend>{(["creative", "day", "both"] as const).map((value) => <label className="label-s" key={value}><input type="radio" name="plan-coverage" checked={coverage === value} onChange={() => setCoverage(value)} />{formatExistingPlanCoverage(value)}</label>)}</fieldset>
    </div>
  </ModalShell>;
}

function ShootPlanEntryChoice({ onChoose }: { onChoose: (view: ScheduleView) => void }) {
  return (
    <div className="shoot-plan-entry-choice">
      <div className="shoot-plan-entry-heading">
        <h1>Plan your shoot</h1>
      </div>
      <div className="shoot-plan-entry-options">
        <button className="shoot-plan-entry-option" type="button" onClick={() => onChoose("schedule")}>
          <span className="shoot-plan-entry-icon" aria-hidden="true"><DsIcon name="calendar" size={28} /></span>
          <span className="shoot-plan-entry-copy"><strong>Schedule</strong><span className="paragraph-s">Set dates, locations, people and the run of day.</span></span>
          <span className="shoot-plan-entry-action">Create schedule<DsIcon name="arrow-right" size={16} /></span>
        </button>
        <button className="shoot-plan-entry-option" type="button" onClick={() => onChoose("shots")}>
          <span className="shoot-plan-entry-icon" aria-hidden="true"><DsIcon name="film-slate" size={28} /></span>
          <span className="shoot-plan-entry-copy"><strong>Shot list</strong><span className="paragraph-s">Plan the shots you need to capture.</span></span>
          <span className="shoot-plan-entry-action">Create shot list<DsIcon name="arrow-right" size={16} /></span>
        </button>
      </div>
      <p className="shoot-plan-entry-guidance paragraph-s">Start with either - you can use both.</p>
    </div>
  );
}

function ShootSetupLoading() {
  return <div className="shoot-setup-loading" role="status" aria-label="Loading Shoot setup"><span /><span /><span /></div>;
}

function ShootSetupResume({ state, onContinue, onSwitchPath }: { state: ShootSetupState; onContinue: () => void; onSwitchPath: (path: ScheduleView) => void }) {
  const activeLabel = state.activePath === "schedule" ? "Schedule" : "Shot List";
  const otherPath: ScheduleView = state.activePath === "schedule" ? "shots" : "schedule";
  const otherLabel = otherPath === "schedule" ? "Schedule" : "Shot List";
  return <section className="shoot-setup-resume">
    <span className="shoot-setup-resume-icon"><DsIcon name="film-slate" size={28} /></span>
    <div><p className="shoot-eyebrow label-xs-semibold">Setup saved</p><h1>Continue planning your shoot</h1><p className="paragraph-s">Your shared progress is safe. Pick up the {activeLabel} or switch to the {otherLabel}.</p></div>
    <div className="shoot-setup-resume-progress">
      <span><strong className="label-s-semibold">Schedule</strong><small className="label-xs">{state.scheduleComplete ? "Ready" : state.scheduleStarted ? `Question ${state.scheduleStep + 1} of 6` : "Not started"}</small></span>
      <span><strong className="label-s-semibold">Shot List</strong><small className="label-xs">{state.shotListComplete ? "Ready" : state.shotListStarted ? `Question ${state.shotListStep + 1} of 5` : "Not started"}</small></span>
    </div>
    <div className="shoot-setup-resume-actions"><Button size="M" variant="primary" onClick={onContinue}>Continue {activeLabel}</Button><Button size="M" variant="secondary" onClick={() => onSwitchPath(otherPath)}>Open {otherLabel}</Button></div>
  </section>;
}

function ScheduleEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="shoot-schedule-empty">
      <Image className="shoot-schedule-empty-illustration" src="/brisk-visuals/shoot-schedule-empty.png" alt="" width={160} height={160} priority />
      <strong>No schedule entries yet</strong>
      <p className="paragraph-s">Add a shot or activity, or choose a time on the timeline.</p>
      <Button size="S" variant="primary" onClick={onAdd}>Add schedule item</Button>
    </div>
  );
}

function ShotListEmptyState({ onAdd }: { onAdd: () => void }) {
  return <div className="shoot-entry-empty"><strong>No shots yet</strong><p className="paragraph-s">Add your first shot to begin planning the coverage.</p><Button size="S" variant="primary" onClick={onAdd}>Add shot</Button></div>;
}

function ScheduleFilterEmptyState({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <div className="shoot-filter-empty">
      <strong>{label}</strong>
      <button className="shoot-text-action label-s-semibold" type="button" onClick={onClear}>Clear filters</button>
    </div>
  );
}

function ShootStageNavigation({ value, onBack, onEditSetup }: {
  value: ScheduleView;
  onBack: () => void;
  onEditSetup: () => void;
}) {
  return <nav className="shoot-stage-navigation" aria-label="Shoot pages">
    <div className="shoot-stage-navigation-inner">
      <button className="shoot-back-to-setup label-s-semibold" type="button" onClick={onBack}><DsIcon name="arrow-left" size={16} /><span>{value === "shots" ? "Back to Creative Plan" : "Back to Shoot"}</span></button>
      <strong className="label-s-semibold">{value === "schedule" ? "Plan the Day" : "Creative Plan"}</strong>
      <div className="shoot-stage-navigation-actions">
        <button className="shoot-back-to-setup label-s-semibold" type="button" onClick={onEditSetup}><DsIcon name="pencil-simple-ds" size={16} /><span>{value === "shots" ? "Edit questions" : "Edit setup"}</span></button>
      </div>
    </div>
  </nav>;
}

function ShootWorkspaceHeader({ callSheetReady, isCallSheetReleased, project, saveStatus, selectedDayPdfHref, selectedRole, setupStatus, sharedCallSheetHref, onContinueSetup, onDocuments, onFinalise, onHandover }: {
  callSheetReady: boolean;
  isCallSheetReleased: boolean;
  project: Project;
  saveStatus: SaveStatus;
  selectedDayPdfHref: string;
  selectedRole: PrototypeRole;
  setupStatus: ShootSetupState["status"];
  sharedCallSheetHref: string;
  onContinueSetup?: () => void;
  onDocuments: () => void;
  onFinalise: () => void;
  onHandover: (owner: ShootSetupOwner) => void;
}) {
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActionsOpen) return;
    const closeOnOutsideClick = (event: globalThis.MouseEvent) => {
      if (!actionsRef.current?.contains(event.target as Node)) setIsActionsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsActionsOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isActionsOpen]);

  const primaryAction = onContinueSetup ? <Button size="S" variant="primary" onClick={onContinueSetup}>Continue setup</Button>
    : isCallSheetReleased ? <Link className="shoot-button primary label-s-semibold" href={sharedCallSheetHref} target="_blank"><DsIcon name="link" size={16} />Share Call Sheet</Link>
      : selectedRole === "Customer" ? setupStatus === "waiting_on_studio"
        ? <Button size="S" variant="primary" disabled>Waiting on Studio</Button>
        : <Button size="S" variant="primary" onClick={() => onHandover("studio")}>Send to Studio</Button>
        : <Button size="S" variant="primary" disabled={!callSheetReady} onClick={onFinalise}>Approve Shoot</Button>;

  return <header className="shoot-page-heading">
    <div><p className="shoot-eyebrow label-xs-semibold">Shoot workspace</p><h1>{project.name}</h1><div className="shoot-heading-state"><SaveIndicator status={saveStatus} />{setupStatus === "waiting_on_studio" ? <span className="label-xs">Waiting on Studio</span> : setupStatus === "waiting_on_client" ? <span className="label-xs">Waiting on Client</span> : null}</div></div>
    <div className="shoot-heading-actions">
      {callSheetReady ? <Link className="shoot-button secondary label-s-semibold" href={sharedCallSheetHref} target="_blank"><DsIcon name="eye" size={16} />Open Call Sheet</Link> : <button className="shoot-button secondary label-s-semibold" type="button" disabled title="Add a shoot date, times and primary location first"><DsIcon name="eye" size={16} />Open Call Sheet</button>}
      <div className="shoot-workspace-actions" ref={actionsRef}>
        <button className="shoot-button secondary label-s-semibold" type="button" aria-expanded={isActionsOpen} onClick={() => setIsActionsOpen((current) => !current)}>Actions<DsIcon name="caret-down" size={14} /></button>
        {isActionsOpen ? <div className="shoot-workspace-actions-menu" role="menu">
          <button className="label-s-semibold" type="button" role="menuitem" onClick={() => { setIsActionsOpen(false); onDocuments(); }}><DsIcon name="folder" size={16} />Documents</button>
          <Link className="label-s-semibold" href={selectedDayPdfHref} target="_blank" role="menuitem" onClick={() => setIsActionsOpen(false)}><DsIcon name="download-simple" size={16} />Download PDF</Link>
        </div> : null}
      </div>
      <Link className="shoot-button secondary label-s-semibold" href={`/chat?project=${project.id}`}><DsIcon name="chat-circle" size={16} />Comments</Link>
      {primaryAction}
    </div>
  </header>;
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

function ScheduleTimeline({ canEdit, day, entries, highlightedEntryId, locations, people, shotEntries, shotGroups, clashes, onEdit, onAddAtTime, onMove, onResize, onToggleCompletion }: {
  canEdit: boolean;
  day: ShootDay;
  entries: ProductionEntry[];
  highlightedEntryId: string | null;
  locations: ShootLocation[];
  people: ShootPerson[];
  shotEntries: ProductionEntry[];
  shotGroups: ShotGroup[];
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
  const earliestEntryMinute = entries.length ? Math.min(...entries.map((entry) => timeToMinutes(entry.startTime))) : Number.POSITIVE_INFINITY;
  const latestEntryMinute = entries.length ? Math.max(...entries.map((entry) => timeToMinutes(entry.startTime) + entry.durationMinutes)) : Number.NEGATIVE_INFINITY;
  const configuredStartMinute = timeToMinutes(day.timelineStartTime || day.generalCallTime || "08:00");
  const configuredEndMinute = timeToMinutes(day.timelineEndTime || day.expectedWrapTime || "17:00");
  const startMinute = Math.floor(Math.min(configuredStartMinute, earliestEntryMinute) / 15) * 15;
  const requestedEndMinute = Math.ceil(Math.max(configuredEndMinute, latestEntryMinute) / 15) * 15;
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
          if (canEdit) onAddAtTime(timeAtPointer(event.clientY, event.currentTarget));
        }}
        onDragOver={(event) => {
          if (!canEdit) return;
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
          if (!canEdit) return;
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
          const linkedGroup = shotGroups.find((group) => group.id === entry.linkedShotGroupId);
          const linkedShotCount = linkedGroup ? shotEntries.filter((shot) => shot.shotGroupId === linkedGroup.id).length : 0;
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
            aria-label={`Edit ${linkedGroup?.name ?? entry.description}, ${formatTime(entry.startTime)}, ${entry.durationMinutes} minutes`}
            key={entry.id}
            onClick={() => { if (!suppressClickRef.current) onEdit(entry); }}
            onPointerDown={(event) => { if (canEdit) beginMove(event, entry); }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onEdit(entry); }
              if (canEdit && event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
                event.preventDefault();
                onMove(entry.id, minutesToTime(timeToMinutes(entry.startTime) + (event.key === "ArrowUp" ? -15 : 15)));
              }
            }}
          >
            <div className="shoot-timeline-block-heading">
              <span className={`shoot-schedule-type is-${entry.type} label-xs-semibold`}><DsIcon name={type.icon} size={14} />{type.label}</span>
              <label className="shoot-checkbox" title={completionTooltip} aria-describedby={completionTooltipId} onClick={(event) => event.stopPropagation()}>
                <input type="checkbox" disabled={!canEdit} checked={isComplete} aria-label={`Mark ${entry.description} as ${entry.type === "shot" ? "captured" : "completed"}`} onChange={() => onToggleCompletion(entry.id)} />
                <span aria-hidden="true"><DsIcon name="check" size={14} /></span>
                <small className="shoot-checkbox-tooltip label-xs-semibold" id={completionTooltipId} role="tooltip">{completionTooltip}</small>
              </label>
            </div>
            <strong className="shoot-timeline-block-title">{linkedGroup?.name ?? entry.description}</strong>
            <span className="shoot-timeline-block-time label-xs">{formatTime(entry.startTime)} - {formatTime(addMinutes(entry.startTime, entry.durationMinutes))}{clash ? <ClashIndicator clash={clash} /> : null}</span>
            <span className="shoot-timeline-block-meta label-xs">{[linkedGroup && linkedShotCount ? `${linkedShotCount} ${linkedShotCount === 1 ? "shot" : "shots"}` : "", location?.name, assignedPeople.map((person) => person.name).join(", ")].filter(Boolean).join(" · ")}</span>
            {canEdit ? <button
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
            /> : null}
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
  const fieldsControlRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!isFieldsOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!fieldsControlRef.current?.contains(event.target as Node)) setIsFieldsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsFieldsOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isFieldsOpen]);

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
      <div className="shoot-fields-control" ref={fieldsControlRef}>
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
        <label><span className="label-xs-semibold">Shot type</span><BriskSelect ariaLabel="Filter by shot type" options={shotCategoryOptions.map((option) => ({ value: option, label: option }))} placeholder="All" value={categoryFilter as ShotCategory | ""} onChange={(value) => setCategoryFilter(value)} /></label>
        <label><span className="label-xs-semibold">Location</span><BriskSelect ariaLabel="Filter by location" options={locations.map((location) => ({ value: location.id, label: location.name }))} placeholder="All" value={locationFilter} onChange={setLocationFilter} /></label>
        <label><span className="label-xs-semibold">Subject</span><BriskSelect ariaLabel="Filter by subject" options={subjectOptions} placeholder="All" value={subjectFilter} onChange={setSubjectFilter} /></label>
        <label><span className="label-xs-semibold">Status</span><BriskSelect ariaLabel="Filter by status" options={[{ value: "", label: "All" }, { value: "remaining", label: "Remaining" }, { value: "captured", label: "Captured" }]} placeholder="All" value={capturedFilter} onChange={(value) => setCapturedFilter(value as "" | "captured" | "remaining")} /></label>
        <label><span className="label-xs-semibold">Sort</span><BriskSelect clearable={false} ariaLabel="Sort shots" options={[{ value: "shotNumber", label: "Shot number" }, { value: "manual", label: "Manual order" }, { value: "category", label: "Shot type" }, { value: "location", label: "Location" }, { value: "subject", label: "Subject" }, { value: "captured", label: "Captured" }]} placeholder="Shot number" value={sortBy} onChange={(value) => { if (value) setSortBy(value as typeof sortBy); }} /></label>
      </div>
      {activeFilterCount ? <div className="shoot-shot-filter-summary"><span className="shoot-count label-xs-semibold">{activeFilterCount}</span><span className="label-xs">active {activeFilterCount === 1 ? "filter" : "filters"}</span><button className="shoot-text-action label-xs-semibold" type="button" onClick={resetFilters}>Clear filters</button></div> : null}
    </div> : null}

    {entries.length === 0 ? <ShotListEmptyState onAdd={onAddShot} /> : filteredEntries.length === 0 ? <div className="shoot-filter-empty"><strong>No shots match these filters</strong><button className="shoot-text-action label-s-semibold" type="button" onClick={resetFilters}>Clear filters</button></div> : <>
      <div
        className={`shoot-shot-grid-wrap ${hasStickyPrefix ? "has-sticky-prefix" : ""} ${isGridScrolled ? "is-horizontally-scrolled" : ""}`}
        ref={gridRef}
        onScroll={(event) => setIsGridScrolled(event.currentTarget.scrollLeft > 1)}
      >
        <div className="shoot-shot-grid-header" style={gridStyle} role="row">{visibleFields.map((field) => {
          const fieldMeta = allShotFields.find((item) => item.id === field);
          return <div className={`shoot-shot-cell is-${field} label-xs-semibold`} data-shot-field={field} role="columnheader" key={field}>
          <span>{fieldMeta?.label}</span>
          {fieldMeta?.help ? <span className="shoot-shot-field-help"><button type="button" aria-label={`About ${fieldMeta.label}`}><DsIcon name="info" size={14} /></button><span className="label-xs" role="tooltip">{fieldMeta.help}</span></span> : null}
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
        </div>;})}</div>
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
        {filteredEntries.map((entry) => <article className={entry.captured ? "is-captured" : ""} key={entry.id}>
          <ShotReferenceImagePicker entry={entry} projectId={projectId} compact onChange={(patch) => onUpdate(entry.id, patch)} />
          <div className="shoot-shot-card-heading"><span className="shoot-schedule-type is-shot label-xs-semibold">{entry.shotNumber}</span><label className="shoot-checkbox" onClick={(event) => event.stopPropagation()}><input type="checkbox" checked={Boolean(entry.captured)} aria-label={`Mark ${entry.description} as captured`} onChange={() => onToggleCaptured(entry.id)} /><span aria-hidden="true"><DsIcon name="check" size={14} /></span></label></div>
          <strong>{entry.description}</strong>
          <p className="label-xs">{[entry.shotCategory, entry.shotSize, entry.durationMinutes ? `${entry.durationMinutes} min` : null].filter(Boolean).join(" · ")}</p>
          <button className="shoot-text-action label-s-semibold" type="button" onClick={() => onEdit(entry)}>Edit shot<DsIcon name="arrow-right" size={16} /></button>
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
  if (field === "description") return <div {...cellProps}><input autoFocus={autoFocusDescription} required aria-label="Description" placeholder="Describe what needs to be captured…" value={entry.description} onFocus={onDescriptionFocused} onChange={(event) => onUpdate({ description: event.target.value })} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") event.currentTarget.blur(); }} /><button className="shoot-shot-edit-action label-xs-semibold" type="button" onClick={onEdit}>Edit shot</button></div>;
  if (field === "subject") return <div {...cellProps}><input aria-label="Subject" placeholder="Person, product, place or activity" value={entry.subject ?? ""} onChange={(event) => onUpdate({ subject: event.target.value })} /></div>;
  if (field === "location") return <div {...cellProps}><BriskSelect ariaLabel="Location" options={[...locations.map((location) => ({ value: location.id, label: location.name })), { value: "create-new", label: "Create new location" }]} placeholder="No location" value={entry.locationId ?? ""} onChange={(value) => value === "create-new" ? onCreateLocation() : onUpdate({ locationId: value || undefined })} /></div>;
  if (field === "category") return <div {...cellProps}><ShotTaxonomySelect ariaLabel="Shot type" customPlaceholder="Add a custom shot type" options={shotCategoryOptions} placeholder="Shot type" value={entry.shotCategory} onChange={(value) => onUpdate({ shotCategory: value })} /></div>;
  if (field === "size") return <div {...cellProps}><BriskSelect ariaLabel="Shot size" options={shotSizeOptions.map((option) => ({ value: option, label: option }))} placeholder="Shot size" value={entry.shotSize ?? ""} onChange={(value) => onUpdate({ shotSize: value || undefined })} /></div>;
  if (field === "movement") return <div {...cellProps}><ShotTaxonomySelect ariaLabel="Camera approach" customPlaceholder="Add a custom camera approach" options={cameraMovementOptions} placeholder="Camera approach" value={entry.cameraMovement} onChange={(value) => onUpdate({ cameraMovement: value })} /></div>;
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

function ShotReferenceImagePicker({ entry, projectId, compact = false, table = false, onChange }: { entry: ProductionEntry | EntryDraft; projectId: string; compact?: boolean; table?: boolean; onChange: (patch: Partial<ProductionEntry>) => void }) {
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

  return <div className={`shoot-shot-image-picker${compact ? " is-compact" : ""}${table ? " is-table" : ""}`} onClick={(event) => event.stopPropagation()}>
    {entry.imageReferenceUrl ? <div className="shoot-shot-image-filled">
      <button type="button" aria-label={`Preview image for ${entry.description}`} onClick={() => setIsPreviewOpen(true)}><img src={entry.imageReferenceUrl} alt="" /></button>
      {!compact ? <div className="shoot-shot-image-actions">
        <button className="shoot-shot-image-action" type="button" aria-label={`Preview image for ${entry.description}`} title="Preview" onClick={() => setIsPreviewOpen(true)}><DsIcon name="eye" size={14} /></button>
        <ScriptMediaPicker isOpen={isSourceOpen} options={shotMediaOptions} triggerLabel={`Replace image for ${entry.description}`} triggerClassName="shoot-shot-image-action" triggerIcon="arrows-clockwise" onOpenChange={setIsSourceOpen} onSelect={chooseSource} />
        <button className="shoot-shot-image-action" type="button" aria-label={`Remove image from ${entry.description}`} title="Remove" onClick={clearImage}><DsIcon name="trash" size={14} /></button>
      </div> : null}
    </div> : <ScriptMediaPicker isOpen={isSourceOpen} options={shotMediaOptions} triggerLabel={`Add image to ${entry.description}`} triggerClassName={table ? "shoot-shot-reference-indicator label-xs-semibold" : "shoot-shot-image-empty"} triggerIcon={compact || table ? "image-square" : "plus"} triggerText={compact && !table ? "Add image" : undefined} onOpenChange={setIsSourceOpen} onSelect={chooseSource} />}
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

function ShotMediaLibraryModal({ source, projectId, onClose, onSelect }: { source: "stock" | "project-media"; projectId: string; onClose: () => void; onSelect: (asset: MediaAssetView) => void }) {
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
  const canBeUntimed = draft.type === "shot" || draft.type === "coverage";
  const timeMode: EntryTimeMode = canBeUntimed ? draft.timeMode ?? (draft.startTime ? "set" : "unscheduled") : "set";
  const isUnscheduled = canBeUntimed && timeMode === "unscheduled";
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
          {scheduleTypeOptions.filter((option) => option.value !== "coverage").map((option) => (
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

function PeoplePicker({ compact = false, disabled = false, display = "chips", label = "People (optional)", people, placeholder = "Add people…", selectedIds, showLabel = true, single = false, onChange, onCreatePerson, onSelectPerson }: {
  compact?: boolean;
  disabled?: boolean;
  display?: "chips" | "rows";
  label?: string;
  people: ShootPerson[];
  placeholder?: string;
  selectedIds: string[];
  showLabel?: boolean;
  single?: boolean;
  onChange: (ids: string[]) => void;
  onCreatePerson?: (name: string) => void;
  onSelectPerson?: (person: ShootPerson) => void;
}) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const pickerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const normalisedSearch = search.trim().toLocaleLowerCase("en-AU");
  const uniquePeople = people.filter((person, index, candidates) => candidates.findIndex((candidate) => isSameShootPerson(candidate, person)) === index);
  const selectedPeople = selectedIds.map((id) => people.find((person) => person.id === id)).filter((person): person is ShootPerson => Boolean(person));
  const results = uniquePeople
    .filter((person) => !selectedPeople.some((selectedPerson) => isSameShootPerson(selectedPerson, person)) && `${person.name} ${person.role}`.toLocaleLowerCase("en-AU").includes(normalisedSearch))
    .slice(0, 8);
  const hasExactMatch = uniquePeople.some((person) => normaliseIdentity(person.name) === normaliseIdentity(search));
  const canCreatePerson = Boolean(onCreatePerson && search.trim() && !hasExactMatch);
  const canClearSelection = single && selectedIds.length > 0;
  const optionCount = results.length + Number(canCreatePerson);

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(0, optionCount - 1)));
  }, [optionCount]);

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
    setIsOpen(false);
    setActiveIndex(0);
  };

  const createNewPerson = () => {
    const name = search.trim();
    if (!name || !onCreatePerson) return;
    onCreatePerson(name);
    setSearch("");
    setIsOpen(false);
    setActiveIndex(0);
  };

  const clearSelection = () => {
    onChange([]);
    setSearch("");
    setIsOpen(false);
    setActiveIndex(0);
  };

  return (
    <div className={`shoot-people-picker${compact ? " is-compact" : ""}${single ? " is-single" : ""}${isOpen ? " is-open" : ""}`}>
      {showLabel ? <span className="label-xs-semibold">{label}</span> : null}
      {!disabled ? <div className="shoot-people-search" ref={pickerRef}>
        <input
          className={single ? "label-s" : undefined}
          aria-activedescendant={isOpen && optionCount ? `${listboxId}-option-${activeIndex}` : undefined}
          aria-autocomplete="list"
          aria-controls={isOpen ? listboxId : undefined}
          aria-expanded={isOpen}
          aria-label={label}
          role="combobox"
          placeholder={placeholder}
          value={single && !isOpen ? selectedPeople[0]?.name ?? "" : search}
          onFocus={() => { if (single) setSearch(""); setIsOpen(true); }}
          onChange={(event) => { setSearch(event.target.value); setIsOpen(true); setActiveIndex(0); }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setIsOpen(false);
            } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setIsOpen(true);
              setActiveIndex((current) => event.key === "ArrowDown" ? Math.min(current + 1, Math.max(0, optionCount - 1)) : Math.max(current - 1, 0));
            } else if (event.key === "Enter") {
              event.preventDefault();
              if (results[activeIndex]) selectPerson(results[activeIndex]);
              else if (canCreatePerson && activeIndex === results.length) createNewPerson();
            }
          }}
        />
        {compact || single ? <span className="shoot-people-picker-caret" aria-hidden="true"><DsIcon name="caret-down" size={12} /></span> : null}
        {isOpen ? <div className="shoot-people-results" id={listboxId} role="listbox" aria-label="Matching people">
          {results.map((person, index) => <button
            className={`label-s ${index === activeIndex ? "is-active" : ""}`}
            id={`${listboxId}-option-${index}`}
            type="button"
            role="option"
            aria-selected={index === activeIndex}
            key={person.id}
            onMouseEnter={() => setActiveIndex(index)}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => selectPerson(person)}
          ><span className="shoot-people-option-avatar label-xs-semibold" aria-hidden="true">{getInitials(person.name)}</span><span><strong>{person.name}</strong>{person.role ? <small className="label-xs">{person.role}</small> : null}</span></button>)}
          {canCreatePerson ? <button
            className={`shoot-people-create-option label-s-semibold ${activeIndex === results.length ? "is-active" : ""}`}
            id={`${listboxId}-option-${results.length}`}
            type="button"
            role="option"
            aria-selected={activeIndex === results.length}
            onMouseEnter={() => setActiveIndex(results.length)}
            onMouseDown={(event) => event.preventDefault()}
            onClick={createNewPerson}
          ><DsIcon name="plus" size={16} />Add “{search.trim()}” as a new person</button> : null}
          {!results.length && !canCreatePerson && !canClearSelection ? <div className="shoot-people-no-results"><span className="label-xs">{search.trim() ? "This person has already been added" : "Start typing to find or add someone"}</span></div> : null}
          {canClearSelection ? <button className="shoot-people-clear-option label-s-semibold" type="button" onMouseDown={(event) => event.preventDefault()} onClick={clearSelection}><DsIcon name="x-close-cross" size={16} />Clear selection</button> : null}
        </div> : null}
      </div> : null}
      {!single && selectedPeople.length ? display === "rows" ? <ul className="shoot-quick-start-person-list" aria-label="People added to this shoot">
        {selectedPeople.map((person) => <li key={person.id}>
          <span className="shoot-avatar label-xs-semibold" aria-hidden="true">{getInitials(person.name)}</span>
          <strong>{person.name}</strong>
          {!disabled ? <button className="shoot-icon-button" type="button" aria-label={`Remove ${person.name} from this shoot`} onClick={() => onChange(selectedIds.filter((id) => id !== person.id))}><DsIcon name="x-close-cross" size={14} /></button> : null}
        </li>)}
      </ul> : <div className="shoot-people-chips">{selectedPeople.map((person) => <button className="shoot-person-chip label-xs-semibold" type="button" disabled={disabled} aria-label={`Remove ${person.name}`} key={person.id} onClick={() => onChange(selectedIds.filter((id) => id !== person.id))}>{person.name}<DsIcon name="x-close-cross" size={12} /></button>)}</div> : null}
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

function DeleteShootItemModal({ title, message, confirmLabel, onCancel, onConfirm }: { title: string; message: string; confirmLabel: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <ModalShell
      compact
      title={title}
      onClose={onCancel}
      footer={<div className="shoot-modal-actions align-right">
        <button autoFocus className="shoot-button secondary label-s-semibold" type="button" onClick={onCancel}>Cancel</button>
        <button className="shoot-button danger label-s-semibold" type="button" onClick={onConfirm}><DsIcon name="trash-simple" size={16} />{confirmLabel}</button>
      </div>}
    >
      <p className="paragraph-s">{message}</p>
    </ModalShell>
  );
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

  return <DeleteShootItemModal title={`Delete ${day.label}?`} message={impactMessage} confirmLabel="Delete day" onCancel={onCancel} onConfirm={onConfirm} />;
}

function DeleteShootShotModal({ entryId, entries, onCancel, onConfirm }: { entryId: string; entries: ProductionEntry[]; onCancel: () => void; onConfirm: () => void }) {
  const shots = entries
    .filter((entry) => entry.type === "shot")
    .sort((left, right) => (left.shotListOrder ?? 0) - (right.shotListOrder ?? 0));
  const shotIndex = shots.findIndex((shot) => shot.id === entryId);
  const shot = shots[shotIndex];
  if (!shot) return null;
  const shotLabel = shotIndex + 1;
  const message = shot.description
    ? `“${shot.description}” will be permanently removed from the Shot List.`
    : "This shot will be permanently removed from the Shot List.";

  return <DeleteShootItemModal title={`Delete shot ${shotLabel}?`} message={message} confirmLabel="Delete shot" onCancel={onCancel} onConfirm={onConfirm} />;
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
  const canBeUntimed = draft.type === "shot" || draft.type === "coverage";
  const timeMode: EntryTimeMode = canBeUntimed ? draft.timeMode ?? (draft.startTime ? "set" : "unscheduled") : "set";
  const isUnscheduled = canBeUntimed && timeMode === "unscheduled";
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
          {canBeUntimed ? <label className="shoot-unscheduled-checkbox label-s">
            <input type="checkbox" checked={isUnscheduled} onChange={(event) => onChange({ ...draft, startTime: event.target.checked ? "" : draft.startTime, timeMode: event.target.checked ? "unscheduled" : "set" })} />
            {draft.type === "coverage" ? "Assign to day without a time" : draft.id ? "Remove from schedule" : "Unscheduled"}
          </label> : null}
        </div> : null}
        <Field label="Duration"><DurationInput value={draft.durationMinutes} onChange={(durationMinutes) => onChange({ ...draft, durationMinutes })} /></Field>
      </div>
      <Field label="Description"><input autoFocus placeholder="e.g. Founder interview" value={draft.description} onChange={(event) => onChange({ ...draft, description: event.target.value })} /></Field>
      <fieldset className="shoot-type-options">
        <legend className="label-xs-semibold">Type</legend>
        <div>{scheduleTypeOptions.filter((option) => draft.linkedShotGroupId ? option.value === "coverage" : option.value !== "coverage").map((option) => <button className={`shoot-type-option is-${option.value} label-xs-semibold ${draft.type === option.value ? "active" : ""}`} type="button" aria-pressed={draft.type === option.value} key={option.value} onClick={() => onChange({ ...draft, type: option.value, timeMode: option.value === "coverage" ? timeMode : "set" })}><DsIcon name={option.icon} size={15} />{option.label}</button>)}</div>
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
      <Field label="Shot type"><ShotTaxonomySelect ariaLabel="Shot type" customPlaceholder="Add a custom shot type" options={shotCategoryOptions} placeholder="Shot type" value={draft.shotCategory} onChange={(value) => onChange({ ...draft, shotCategory: value })} /></Field>
      <Field label="Shot size"><BriskSelect ariaLabel="Shot size" options={shotSizeOptions.map((option) => ({ value: option, label: option }))} placeholder="Shot size" value={draft.shotSize ?? ""} onChange={(value) => onChange({ ...draft, shotSize: value || undefined })} /></Field>
      <Field label="Est. filming time"><FilmingTimeInput value={draft.durationMinutes} onChange={(durationMinutes) => onChange({ ...draft, durationMinutes })} /></Field>
    </div>
    <button className="shoot-text-action label-s-semibold" type="button" aria-expanded={showMoreOptions} onClick={() => setShowMoreOptions((current) => !current)}>{showMoreOptions ? "Fewer options" : "More options"}<DsIcon name="caret-down" size={14} /></button>
    {showMoreOptions ? <>
    <div className="shoot-shot-details-secondary">
      <Field label="Camera approach"><ShotTaxonomySelect ariaLabel="Camera approach" customPlaceholder="Add a custom camera approach" options={cameraMovementOptions} placeholder="Camera approach" value={draft.cameraMovement} onChange={(value) => onChange({ ...draft, cameraMovement: value })} /></Field>
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
    <ModalShell title={isExistingContact ? "Confirm person details" : draft.id ? "Edit person" : "Create new contact"} description={isExistingContact ? "Contact details are reused. Confirm their role, call time and shoot days for this production." : "Keep only the details needed on the day."} onClose={onClose} footer={<>
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
  return createPortal(<section className="shoot-person-search-popover" ref={popoverRef} style={popoverStyle} role="dialog" aria-label="Add new contact" onKeyDown={(event) => { if (event.key === "Escape") onClose(); }}>
    <header><h2 className="headings-xs-bold">Add new contact</h2><button className="team-modal-close" type="button" aria-label="Close contact picker" onClick={onClose}><DsIcon name="x-close-cross" size={16} /></button></header>
    <label className="shoot-person-search-field"><span className="sr-only">Search people</span><DsIcon name="search" size={16} /><input ref={searchRef} type="search" placeholder="Search by name, role or email…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
    <div className="shoot-person-search-results">
      <span className="shoot-person-search-label label-xs-semibold">{normalisedQuery ? "Results from Brisk" : "Add from Brisk"}</span>
      {matchingContacts.length ? matchingContacts.map((person) => {
        return <button className="shoot-person-search-result" type="button" key={person.id} onClick={() => { onAdd(person); onClose(); }}>
          <span className={`shoot-avatar is-${person.contactSource ?? "saved-contact"} label-xs-semibold`} aria-hidden="true">{getInitials(person.name)}</span>
          <span className="shoot-person-search-copy"><strong className="label-s-semibold">{person.name}</strong><span className="label-xs">{[person.role, person.company].filter(Boolean).join(" · ")}</span></span>
          <span className="shoot-person-search-add label-xs-semibold">Add</span>
        </button>;
      }) : <p className="shoot-person-search-empty label-s">{normalisedQuery ? "No saved contacts match this search." : "No recent contacts to show."}</p>}
    </div>
    <button className="shoot-create-person-action label-s-semibold" type="button" onClick={onCreate}><DsIcon name="plus" size={16} />Create new contact</button>
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
      <Field label="Location name"><input value={draft.name} placeholder="Studio, office or venue" onChange={(event) => onChange({ ...draft, name: event.target.value })} /></Field>
      <Field label="Address"><AddressAutocomplete draft={draft} onChange={onChange} /></Field>
      <Field label="Map link"><input type="url" value={draft.mapLink ?? ""} placeholder="https://maps.google.com/..." onChange={(event) => onChange({ ...draft, mapLink: event.target.value })} /></Field>
      <div className="shoot-modal-grid two-column"><Field label="Parking"><textarea rows={3} placeholder="Parking and loading details" value={draft.parking} onChange={(event) => onChange({ ...draft, parking: event.target.value })} /></Field><Field label="Access"><textarea rows={3} placeholder="Entry, lift or access details" value={draft.access} onChange={(event) => onChange({ ...draft, access: event.target.value })} /></Field></div>
      <Field label="Other practical details"><textarea rows={4} placeholder="Anything else the crew should know about arriving or working here?" value={draft.notes} onChange={(event) => onChange({ ...draft, notes: event.target.value })} /></Field>
      {containsWifiDetails ? <p className="shoot-location-wifi-warning label-xs"><DsIcon name="info" size={16} />Wi-Fi details will appear on the public Call Sheet when it is shared.</p> : null}
      <Field label="Shoot days"><ShootDayMultiSelect days={days} value={draft.shootDayIds} onChange={(shootDayIds) => onChange({ ...draft, shootDayIds })} /></Field>
    </ModalShell>
  );
}

function AddressAutocomplete({ autoFocus = true, disabled = false, draft, onChange, onSubmit, placeholder = "Start typing an address" }: {
  autoFocus?: boolean;
  disabled?: boolean;
  draft: LocationDraft;
  onChange: (draft: LocationDraft) => void;
  onSubmit?: (draft: LocationDraft) => void;
  placeholder?: string;
}) {
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
    const selectedDraft = {
      ...draft,
      name: draft.name.trim() ? draft.name : suggestion.name,
      address: suggestion.address,
    };
    onChange(selectedDraft);
    onSubmit?.(selectedDraft);
    setIsOpen(false);
    setActiveIndex(0);
  };

  return <div className="shoot-address-search">
    <input
      autoFocus={autoFocus}
      autoComplete="off"
      disabled={disabled}
      placeholder={placeholder}
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
        } else if (event.key === "Enter" && onSubmit && draft.address.trim()) {
          event.preventDefault();
          onSubmit(draft);
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
  const options = Array.from({ length: 24 * 12 }, (_, index) => {
    const hours = Math.floor(index / 12);
    const minutes = (index % 12) * 5;
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
      const roundedValue = roundTimeToFive(parsedValue);
      onChange(roundedValue);
      setInputValue(formatTime(roundedValue));
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
        onChange={(event) => {
          const nextInput = event.target.value;
          const parsedValue = parseTimeInput(nextInput);
          setInputValue(nextInput);
          setActiveIndex(parsedValue ? options.findIndex((option) => option.value === roundTimeToFive(parsedValue)) : null);
        }}
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

function emptyPersonDraft(callTime: string, _activeDayId: string): PersonDraft {
  return { name: "", type: "crew", role: "", contactSource: "saved-contact", phone: "", email: "", showContactDetails: false, callTime, shootDayIds: "all" };
}

function personToDraft(person: ShootPerson): PersonDraft {
  return { ...person };
}

function personToShootPerson(person: Person, callTime: string): ShootPerson {
  const shootType: ShootPersonType = person.type === "Client contact" ? "client" : person.type === "Contact" ? "talent" : "crew";
  const shootRole = person.jobTitles[0] ?? (person.type === "Client contact" ? "Client representative" : person.type === "Contact" ? "Talent" : "Crew");
  return {
    id: person.id,
    name: person.name,
    type: shootType,
    role: shootRole,
    company: person.clientName ?? (person.type === "Team" ? "North Star Films" : undefined),
    contactSource: person.type === "Team" ? "team-member" : "saved-contact",
    phone: person.phone,
    email: person.email,
    showContactDetails: false,
    callTime,
    shootDayIds: [],
    assignments: [{
      id: `assignment-${person.id}`,
      type: shootType,
      role: shootRole,
      callTime,
      shootDayIds: [],
    }],
  };
}

function isSameShootPerson(left: ShootPerson, right: ShootPerson) {
  if (left.id === right.id) return true;
  const leftEmail = left.email.trim().toLocaleLowerCase("en-AU");
  const rightEmail = right.email.trim().toLocaleLowerCase("en-AU");
  if (leftEmail && rightEmail) return leftEmail === rightEmail;
  return normaliseIdentity(left.name) === normaliseIdentity(right.name);
}

function formatPersonContact(person: ShootPerson) {
  return [person.name, person.role, person.phone].filter(Boolean).join(" · ");
}

function emptyLocationDraft(activeDayId: string): LocationDraft {
  return { name: "", address: "", wifi: "", accessibility: "", parking: "", access: "", notes: "", shootDayIds: activeDayId ? [activeDayId] : [] };
}

function locationToDraft(location: ShootLocation): LocationDraft {
  return { ...location };
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
  const normalisedShotEntries = callSheet.entries
    .filter((entry) => entry.type === "shot")
    .map((entry) => ({
      ...entry,
      priority: normaliseShotPriority(entry.priority) ?? "Medium",
      shotCategory: normaliseShotCategory(entry.shotCategory),
      captureStatus: entry.captureStatus ?? (entry.captured ? "captured" : "to-capture"),
    } satisfies ProductionEntry));
  const { groups: shotGroups, shots } = ensureShotGroups(normalisedShotEntries, callSheet.shotGroups ?? []);
  const existingScheduleEntries = callSheet.entries.filter((entry) => entry.type !== "shot");
  const existingCoverageGroupIds = new Set(existingScheduleEntries.flatMap((entry) => entry.linkedShotGroupId ? [entry.linkedShotGroupId] : []));
  const migratedCoverageEntries = shotGroups.flatMap((group) => {
    if (existingCoverageGroupIds.has(group.id)) return [];
    const legacyScheduledShots = shots.filter((shot) => shot.shotGroupId === group.id && Boolean(shot.dayId));
    if (!legacyScheduledShots.length) return [];
    const firstTimedShot = legacyScheduledShots.filter((shot) => shot.startTime).sort((left, right) => left.startTime.localeCompare(right.startTime))[0];
    const firstAssignedShot = firstTimedShot ?? legacyScheduledShots[0];
    return [{
      id: `coverage-${group.id}`,
      dayId: firstAssignedShot.dayId,
      startTime: firstTimedShot?.startTime ?? "",
      durationMinutes: Math.min(240, Math.max(30, legacyScheduledShots.reduce((total, shot) => total + (shot.durationMinutes || 0), 0))),
      description: group.name,
      type: "coverage" as const,
      locationId: firstAssignedShot.locationId ?? group.locationId,
      personIds: [...new Set(legacyScheduledShots.flatMap((shot) => shot.personIds))],
      linkedShotGroupId: group.id,
    }];
  });
  return {
    ...callSheet,
    notes,
    shotGroups,
    days: callSheet.days.map((day) => ({ ...day, notes: { ...emptyShootDayNotes(), ...day.notes } })),
    entries: [
      ...existingScheduleEntries,
      ...shots.map((shot) => ({ ...shot, dayId: "", startTime: "", durationMinutes: 0 })),
      ...migratedCoverageEntries,
    ],
    people: callSheet.people.map((person) => ({ ...person, showContactDetails: person.showContactDetails === true, assignments: getShootAssignments(person) })),
    locations: callSheet.locations.map((location) => ({
      ...location,
      wifi: location.wifi || legacyPracticalInfo.wifi,
      accessibility: location.accessibility || legacyPracticalInfo.accessibility,
    })),
    practicalInfo: {
      ...legacyPracticalInfo,
      wifi: "",
      access: "",
      safety: "",
      accessibility: "",
    },
    visibleOptionalSections: callSheet.visibleOptionalSections.filter((section) => section !== "practical"),
    visualReferences: callSheet.visualReferences ?? [],
  };
}

function ensureShotGroups(shots: ProductionEntry[], storedGroups: ShotGroup[]) {
  const groups = [...storedGroups].sort((left, right) => left.order - right.order);
  const groupIds = new Set(groups.map((group) => group.id));
  const nextShots = shots.map((shot) => shot.shotGroupId && groupIds.has(shot.shotGroupId)
    ? shot
    : { ...shot, shotGroupId: null });
  return { groups, shots: nextShots };
}

function inferShotGroupName(shot: ProductionEntry) {
  if (shot.scriptSection?.trim()) return shot.scriptSection.trim();
  const value = `${shot.description} ${shot.shotCategory ?? ""}`.toLocaleLowerCase("en-AU");
  if (/interview|founder|piece to camera|portrait|talking head/u.test(value)) return "Founder interview";
  if (/product|demonstration|workflow|screen|detail/u.test(value)) return "Product demonstration";
  if (/establish|exterior|location|signage|atmosphere/u.test(value)) return "Establishing coverage";
  if (/team|collaboration|workplace|office|b-roll|cutaway|hands/u.test(value)) return "Team and workplace B-roll";
  return "Additional coverage";
}

function inferShotGroupDescription(groupName: string) {
  if (groupName === "Founder interview") return "Primary frame, alternate angle, reactions and cutaways.";
  if (groupName === "Product demonstration") return "Product workflow, screen detail and supporting inserts.";
  if (groupName === "Establishing coverage") return "Location, signage and atmosphere that set the scene.";
  if (groupName === "Team and workplace B-roll") return "Natural team activity and workplace coverage.";
  return "Extra shots to capture if the day allows.";
}

function normaliseShotPriority(value: unknown): ShotPriority | undefined {
  if (value === "Critical" || value === "High" || value === "Medium" || value === "Bonus") return value;
  if (value === "Essential") return "Critical";
  if (value === "Useful") return "Medium";
  if (value === "Optional") return "Bonus";
  return undefined;
}

function normaliseShotCategory(value?: ShotCategory): ShotCategory | undefined {
  if (value === "Action") return "Scene / action";
  if (value === "Product") return "Product / detail";
  return value;
}

function deriveLocationName(addressOrLink: string) {
  const value = addressOrLink.trim();
  if (/^https?:\/\//iu.test(value)) return "Google Maps location";
  return value.split(",")[0]?.trim() || value;
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

function createBriskShootPlan(current: CallSheet, project: Project, answers: QuickStartAnswers, interviewLed: boolean) {
  const confirmedCaptures = answers.captures.filter((capture): capture is ConfirmedQuickStartCapture => capture !== "not-confirmed");
  const captures: ConfirmedQuickStartCapture[] = confirmedCaptures.length ? confirmedCaptures : [interviewLed ? "interviews" : "scripted"];
  const shouldAddQuestions = captures.includes("interviews");
  const existingPlanningContent = current.entries.some((entry) => entry.type === "shot") || current.questions.length > 0;
  const suggestionStatus = existingPlanningContent ? "suggested" as const : undefined;
  const now = Date.now();
  const addedPeople = parseQuickStartPeople(answers.people).map<ShootPerson>((person, index) => ({
    id: `person-quick-start-${now}-${index}`,
    name: person.name,
    type: "talent",
    role: person.role,
    phone: "",
    email: "",
    showContactDetails: false,
    callTime: current.days[0]?.generalCallTime ?? "",
    shootDayIds: "all",
    assignments: [{ id: `assignment-quick-start-${now}-${index}`, type: "talent", role: person.role, callTime: current.days[0]?.generalCallTime ?? "", shootDayIds: "all" }],
  })).filter((person) => !current.people.some((existing) => isSameShootPerson(existing, person)));
  const existingTalent = current.people.find((person) => getShootAssignments(person).some((assignment) => assignment.type === "talent"));
  const provisionalTalent: ShootPerson | undefined = shouldAddQuestions && !existingTalent && addedPeople.length === 0 ? {
    id: `person-brisk-${project.id}`,
    name: "Interviewee not confirmed",
    type: "talent",
    role: "CEO interviewee",
    phone: "",
    email: "",
    showContactDetails: false,
    callTime: current.days[0]?.generalCallTime ?? "",
    shootDayIds: "all",
    assignments: [{ id: `assignment-brisk-${project.id}`, type: "talent", role: "CEO interviewee", callTime: current.days[0]?.generalCallTime ?? "", shootDayIds: "all" }],
  } : undefined;
  const targetTalent = addedPeople[0] ?? existingTalent ?? provisionalTalent;
  const subject = targetTalent?.name ?? (captures.length === 1 && captures[0] === "b-roll" ? "Product and team" : "Primary subject");
  const shotTemplates = getBriskShotTemplates(captures, subject);
  const questionTemplates = shouldAddQuestions ? [
    "What problem were you trying to solve?",
    "What changed after you started using the product?",
    "Can you describe the moment you knew it was working?",
    "What would you tell someone considering the same change?",
    "What result are you most proud of?",
    "What should the audience remember from this story?",
  ] : [];
  const existingShots = current.entries.filter((entry) => entry.type === "shot");
  const mustHaveDescriptions = answers.letBriskSuggestShots ? [] : parseQuickStartList(answers.mustHaveShots);
  const uniqueMustHaveDescriptions = mustHaveDescriptions.filter((description) => !existingShots.some((entry) => normaliseIdentity(entry.description) === normaliseIdentity(description)));
  const nextShots = shotTemplates.filter((template) => ![...existingShots, ...uniqueMustHaveDescriptions.map((description) => ({ description, subject }))].some((entry) => normaliseIdentity(entry.description) === normaliseIdentity(template.description) && normaliseIdentity(entry.subject ?? "") === normaliseIdentity(template.subject)));
  const existingQuestions = current.questions;
  const nextQuestions = questionTemplates.filter((question) => !existingQuestions.some((entry) => {
    const entryPerson = current.people.find((person) => person.id === entry.personId)?.name ?? "";
    return normaliseIdentity(entry.question) === normaliseIdentity(question) && normaliseIdentity(entryPerson) === normaliseIdentity(targetTalent?.name ?? "");
  }));
  const maxShotNumber = Math.max(0, ...existingShots.map((entry) => entry.shotNumber ?? 0));
  const maxShotOrder = Math.max(-1, ...existingShots.map((entry) => entry.shotListOrder ?? -1));
  const mustHaveShots: ProductionEntry[] = uniqueMustHaveDescriptions.map((description, index) => ({
    id: `entry-must-have-${now}-${index}`,
    dayId: "",
    shotNumber: maxShotNumber + index + 1,
    shotListOrder: maxShotOrder + index + 1,
    startTime: "",
    durationMinutes: 0,
    description,
    type: "shot",
    personIds: targetTalent ? [targetTalent.id] : [],
    subject,
    captured: false,
    priority: "Critical",
  }));
  const generatedShots: ProductionEntry[] = nextShots.map((template, index) => ({
    id: `entry-brisk-${now}-${index}`,
    dayId: "",
    shotNumber: maxShotNumber + mustHaveShots.length + index + 1,
    shotListOrder: maxShotOrder + mustHaveShots.length + index + 1,
    startTime: "",
    durationMinutes: 0,
    description: template.description,
    type: "shot",
    personIds: targetTalent ? [targetTalent.id] : [],
    subject: template.subject,
    captured: false,
    priority: template.priority,
    shotCategory: template.category,
    suggestionStatus,
  }));
  const generatedQuestions: InterviewQuestion[] = nextQuestions.map((question, index) => ({ id: `question-brisk-${now}-${index}`, question, personId: targetTalent?.id, shootDayIds: "all", suggestionStatus }));
  const groupedPlan = ensureShotGroups([...existingShots, ...mustHaveShots, ...generatedShots], current.shotGroups ?? []);
  const locationInput = answers.locationAddress.trim();
  const locationInputIsLink = /^https?:\/\//iu.test(locationInput);
  const locationName = answers.locationName.trim() || deriveLocationName(locationInput);
  const locationAddress = locationInputIsLink ? "" : locationInput;
  const locationMapLink = locationInputIsLink ? locationInput : "";
  const matchedLocation = current.locations.find((location) => normaliseIdentity(location.name) === normaliseIdentity(locationName)
    && normaliseIdentity(location.address) === normaliseIdentity(locationAddress)
    && normaliseIdentity(location.mapLink ?? "") === normaliseIdentity(locationMapLink));
  const addedLocation: ShootLocation | undefined = !answers.locationNotConfirmed && (locationName || locationInput) && !matchedLocation ? {
    id: `location-quick-start-${now}`,
    name: locationName || "Google Maps location",
    address: locationAddress,
    mapLink: locationMapLink || undefined,
    shootDayIds: "all",
    parking: "",
    access: "",
    notes: "",
  } : undefined;
  const nextLocations = addedLocation ? [...current.locations, addedLocation] : current.locations;
  let nextDays = current.days;
  if (!answers.dateNotConfirmed && answers.shootDate && !current.days.some((day) => day.date === answers.shootDate)) {
    const blankDayIndex = current.days.findIndex((day) => !day.date);
    nextDays = blankDayIndex >= 0
      ? current.days.map((day, index) => index === blankDayIndex ? { ...day, date: answers.shootDate } : day)
      : [...current.days, { ...createEmptyShootDay(`day-quick-start-${now}`), label: `Day ${current.days.length + 1}`, date: answers.shootDate }];
  }
  nextDays = suggestPrimaryLocations(nextDays, nextLocations);
  const nextPeople = [...current.people, ...addedPeople, ...(provisionalTalent ? [provisionalTalent] : [])];
  return {
    callSheet: {
      ...current,
      days: nextDays,
      locations: nextLocations,
      people: nextPeople,
      shotGroups: groupedPlan.groups,
      entries: ensureShotNumbers({
        ...current,
        entries: [...current.entries.filter((entry) => entry.type !== "shot"), ...groupedPlan.shots],
      }).entries,
      questions: [...current.questions, ...generatedQuestions],
    },
    shotCount: mustHaveShots.length + generatedShots.length,
    questionCount: generatedQuestions.length,
  };
}

function parseQuickStartPeople(value: string) {
  return value.split(";").map((item) => item.trim()).filter(Boolean).map((item) => {
    const [name = "", ...roleParts] = item.split(",");
    return { name: name.trim(), role: roleParts.join(",").trim() || "Talent" };
  }).filter((person) => person.name);
}

function suggestPrimaryLocations(days: ShootDay[], locations: ShootLocation[]) {
  const unassignedDayIndexes = days
    .map((day, index) => day.primaryLocationId ? -1 : index)
    .filter((index) => index >= 0);
  if (!unassignedDayIndexes.length || !locations.length) return days;

  if (locations.length === 1) {
    return days.map((day) => day.primaryLocationId ? day : { ...day, primaryLocationId: locations[0].id });
  }

  const assignedLocationIds = new Set(days.map((day) => day.primaryLocationId).filter(Boolean));
  const availableLocations = locations.filter((location) => !assignedLocationIds.has(location.id));
  if (availableLocations.length !== unassignedDayIndexes.length) return days;

  const locationByDayIndex = new Map(unassignedDayIndexes.map((dayIndex, index) => [dayIndex, availableLocations[index].id]));
  return days.map((day, index) => {
    const primaryLocationId = locationByDayIndex.get(index);
    return primaryLocationId ? { ...day, primaryLocationId } : day;
  });
}

function parseQuickStartList(value: string) {
  return value.split(/[;\n]+/u).map((item) => item.trim()).filter(Boolean);
}

function createInitialQuickStartAnswers(briefCaptures: ConfirmedQuickStartCapture[] | null): QuickStartAnswers {
  return {
    captures: briefCaptures ?? ["not-confirmed"],
    people: "",
    peopleNotConfirmed: false,
    locationName: "",
    locationAddress: "",
    locationNotConfirmed: false,
    shootDate: "",
    dateNotConfirmed: false,
    mustHaveShots: "",
    letBriskSuggestShots: false,
  };
}

function areQuickStartCapturesEqual(left: readonly QuickStartCapture[], right: readonly QuickStartCapture[]) {
  return left.length === right.length && left.every((capture) => right.includes(capture));
}

function quickStartAnswersStorageKey(projectId: string) {
  return `brisk-shoot-quick-start-${projectId}-v1`;
}

function parseQuickStartAnswers(value: string | null): QuickStartAnswers | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return null;
    const answers = parsed as Partial<QuickStartAnswers> & { capture?: unknown };
    const captures: QuickStartCapture[] = ["interviews", "scripted", "b-roll", "not-confirmed"];
    const rawCaptures: unknown[] = Array.isArray(answers.captures)
      ? answers.captures
      : typeof answers.capture === "string"
        ? [answers.capture]
        : [];
    const migratedCaptures = rawCaptures.flatMap((capture) => capture === "mixture" ? ["interviews", "scripted"] : [capture]);
    const validCaptures = migratedCaptures.filter((capture): capture is QuickStartCapture => typeof capture === "string" && captures.includes(capture as QuickStartCapture));
    const selectedCaptures: QuickStartCapture[] = validCaptures.includes("not-confirmed")
      ? ["not-confirmed"]
      : [...new Set(validCaptures)];
    return {
      captures: selectedCaptures.length ? selectedCaptures : ["not-confirmed"],
      people: typeof answers.people === "string" ? answers.people : "",
      peopleNotConfirmed: answers.peopleNotConfirmed === true,
      locationName: typeof answers.locationName === "string" ? answers.locationName : "",
      locationAddress: typeof answers.locationAddress === "string" ? answers.locationAddress : "",
      locationNotConfirmed: answers.locationNotConfirmed === true,
      shootDate: typeof answers.shootDate === "string" ? answers.shootDate : "",
      dateNotConfirmed: answers.dateNotConfirmed === true,
      mustHaveShots: typeof answers.mustHaveShots === "string" ? answers.mustHaveShots : "",
      letBriskSuggestShots: answers.letBriskSuggestShots === true,
    };
  } catch {
    return null;
  }
}

function getBriskShotTemplates(captures: ConfirmedQuickStartCapture[], subject: string): Array<{ description: string; subject: string; priority: ProductionEntry["priority"]; category: ShotCategory }> {
  type QuickStartShotTemplate = { description: string; subject: string; priority: ProductionEntry["priority"]; category: ShotCategory };
  const interviewShots: QuickStartShotTemplate[] = [
    { description: "Wide establishing shot of the location", subject: "Shoot location", priority: "Critical" as const, category: "Establishing" as const },
    { description: "Primary interview framed to camera", subject, priority: "Critical" as const, category: "Interview" as const },
    { description: "Alternative interview angle", subject, priority: "Medium" as const, category: "Interview" as const },
    { description: "Interviewee listening and reacting", subject, priority: "Medium" as const, category: "B-roll" as const },
    { description: "Hands and detail cutaways", subject, priority: "Medium" as const, category: "B-roll" as const },
    { description: "Subject working in their environment", subject, priority: "Critical" as const, category: "Scene / action" as const },
    { description: "Team collaboration coverage", subject: "Team", priority: "Medium" as const, category: "B-roll" as const },
    { description: "Closing portrait and confident look to camera", subject, priority: "Bonus" as const, category: "Interview" as const },
  ];
  const scriptedShots: QuickStartShotTemplate[] = [
    { description: "Wide exterior establishing shot of the location", subject: "Shoot location", priority: "Critical" as const, category: "Establishing" as const },
    { description: "Opening scripted scene", subject, priority: "Critical" as const, category: "Scene / action" as const },
    { description: "Primary action in a medium frame", subject, priority: "Critical" as const, category: "Scene / action" as const },
    { description: "Over-the-shoulder product demonstration", subject: "Product workflow", priority: "Critical" as const, category: "Demonstration" as const },
    { description: "Reaction and listening coverage", subject, priority: "Medium" as const, category: "B-roll" as const },
    { description: "Detail cutaways of hands and screens", subject: "Product details", priority: "Medium" as const, category: "Product / detail" as const },
    { description: "Team collaborating around the product", subject: "Team", priority: "Medium" as const, category: "B-roll" as const },
    { description: "Closing hero shot", subject: "Product", priority: "Critical" as const, category: "Product / detail" as const },
  ];
  const templatesByCapture: Record<ConfirmedQuickStartCapture, QuickStartShotTemplate[]> = {
    interviews: interviewShots,
    scripted: scriptedShots,
    "b-roll": scriptedShots.filter((shot) => shot.category === "B-roll" || shot.category === "Product / detail" || shot.category === "Establishing"),
  };
  return captures
    .flatMap((capture) => templatesByCapture[capture])
    .filter((shot, index, shots) => shots.findIndex((candidate) => normaliseIdentity(candidate.description) === normaliseIdentity(shot.description) && normaliseIdentity(candidate.subject) === normaliseIdentity(shot.subject)) === index);
}

function shootWorkspaceSectionStorageKey(projectId: string) {
  return `brisk-shoot-workspace-section-${projectId}-v1`;
}

function parseShootWorkspaceSection(value: string | null): ShootWorkspaceSection | null {
  if (value === "dates") return "schedule";
  if (value === "shoot-helper") return "schedule";
  if (value === "notes" || value === "documents") return "notes-documents";
  const sections: ShootWorkspaceSection[] = ["quick-start", "shots", "questions", "references", "locations", "people", "schedule", "notes-documents", "call-sheet"];
  return sections.includes(value as ShootWorkspaceSection) ? value as ShootWorkspaceSection : null;
}

function parseShootAccessSettings(rawValue: string | null): ShootAccessSettings {
  const fallback: ShootAccessSettings = { freelancer: "canEdit", client: "viewOnly" };
  if (!rawValue) return fallback;
  try {
    const value: unknown = JSON.parse(rawValue);
    if (!value || typeof value !== "object") return fallback;
    const settings = value as Partial<ShootAccessSettings>;
    const accessLevels: ShootAccessLevel[] = ["viewOnly", "canEdit", "canManage"];
    if (!accessLevels.includes(settings.freelancer as ShootAccessLevel) || !accessLevels.includes(settings.client as ShootAccessLevel)) return fallback;
    return settings as ShootAccessSettings;
  } catch {
    return fallback;
  }
}

function formatShootAccessLevel(value: ShootAccessLevel) {
  if (value === "canManage") return "Can manage";
  if (value === "canEdit") return "Can edit";
  return "View only";
}

function getMissingCallSheetDetails(callSheet: CallSheet) {
  const day = callSheet.days[0];
  const location = callSheet.locations.find((item) => item.id === day?.primaryLocationId);
  const contactPhone = getContactPhone(callSheet.onTheDayContact) || callSheet.people.find((person) => callSheet.onTheDayContact.startsWith(person.name))?.phone.trim();
  return [
    !day?.date ? "Shoot date" : "",
    !day?.generalCallTime ? "General call time" : "",
    !location || !(location.address.trim() || location.mapLink?.trim()) ? "Primary location" : "",
    !callSheet.onTheDayContact.trim() || !contactPhone ? "On-the-day contact and phone number" : "",
  ].filter(Boolean);
}

function getShootAssignments(person: ShootPerson): ShootAssignment[] {
  return person.assignments?.length ? person.assignments : [{ id: `assignment-${person.id}`, type: person.type, role: person.role, callTime: person.callTime, shootDayIds: person.shootDayIds }];
}

function emptyShootDayNotes(): ShootDayNotes {
  return { equipment: "", wardrobe: "", catering: "", access: "", safety: "", weatherConsiderations: "", clientNotes: "", internalNotes: "" };
}

function normaliseIdentity(value: string) {
  return value.trim().toLocaleLowerCase("en-AU").replace(/[\p{P}\p{S}]+/gu, " ").replace(/\s+/gu, " ");
}

function deriveReferenceName(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./u, "");
    if (host === "youtu.be" || host.endsWith("youtube.com")) return "YouTube reference";
    if (host.endsWith("vimeo.com")) return "Vimeo reference";
    return decodeURIComponent(url.pathname.split("/").filter(Boolean).at(-1) ?? "") || url.hostname;
  } catch {
    return "Visual reference";
  }
}

function removeFileExtension(value: string) {
  return value.replace(/\.[^.]+$/u, "");
}

function getYouTubeThumbnailUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./u, "");
    let videoId = host === "youtu.be" ? url.pathname.split("/").filter(Boolean)[0] : url.searchParams.get("v");
    if (!videoId && (url.pathname.includes("/shorts/") || url.pathname.includes("/embed/"))) videoId = url.pathname.split("/").filter(Boolean).at(-1) ?? null;
    return videoId ? `https://img.youtube.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg` : undefined;
  } catch {
    return undefined;
  }
}

function isVideoReferenceUrl(value: string) {
  return Boolean(getYouTubeThumbnailUrl(value)) || /\.(mp4|mov|m4v|webm)(?:[?#].*)?$/iu.test(value) || value.startsWith("data:video/");
}

function isVisualReferenceVideo(reference: ShootVisualReference) {
  return reference.kind === "video" || isVideoReferenceUrl(reference.url);
}

function getVisualReferencePreviewUrl(reference: ShootVisualReference) {
  if (reference.thumbnailUrl) return reference.thumbnailUrl;
  const youtubeThumbnail = getYouTubeThumbnailUrl(reference.url);
  if (youtubeThumbnail) return youtubeThumbnail;
  if (reference.kind === "image" || reference.url.startsWith("data:image/") || /\.(avif|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/iu.test(reference.url)) return reference.url;
  return undefined;
}

function visualReferenceSourceLabel(source: ShotImageSource) {
  if (source === "upload") return "Uploaded file";
  if (source === "project-media") return "Project Media";
  if (source === "stock") return "Stock footage";
  return "Linked reference";
}

function roundTimeToFive(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
  const roundedMinutes = Math.round((hours * 60 + minutes) / 5) * 5;
  return minutesToTime(roundedMinutes);
}

function entryPlaceholder(type: ScheduleType) {
  const placeholders: Record<ScheduleType, string> = {
    shot: "e.g. Founder interview",
    coverage: "e.g. Founder interview",
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

function shootSetupStorageKey(projectId: string) {
  return `brisk-shoot-guided-setup-${projectId}-v1`;
}

function createInitialShootSetupState(callSheet: CallSheet, role: PrototypeRole): ShootSetupState {
  const scheduleStarted = isCallSheetConfigured(callSheet);
  const shotListStarted = callSheet.entries.some((entry) => entry.type === "shot");
  const hasWorkingView = scheduleStarted || shotListStarted;
  return {
    version: 1,
    phase: hasWorkingView ? "workspace" : "entry",
    activePath: scheduleStarted ? "schedule" : "shots",
    scheduleStarted,
    shotListStarted,
    scheduleSkipped: false,
    shotListSkipped: false,
    scheduleComplete: scheduleStarted,
    shotListComplete: shotListStarted,
    scheduleStep: scheduleStarted ? 4 : 0,
    shotListStep: shotListStarted ? 3 : 0,
    shotListSource: "ai",
    aiGenerated: shotListStarted,
    owner: role === "Customer" ? "client" : "studio",
    status: scheduleStarted ? "ready_to_finalise" : "working",
    approvalInvalidated: false,
    lastContributor: scheduleStarted || shotListStarted ? "Studio" : "",
    updatedAt: callSheet.updatedAt,
  };
}

function parseShootSetupState(rawValue: string | null): ShootSetupState | null {
  if (!rawValue) return null;
  try {
    const value: unknown = JSON.parse(rawValue);
    if (!value || typeof value !== "object") return null;
    const state = value as Partial<ShootSetupState>;
    if (
      state.version !== 1
      || !["entry", "builder", "paused", "workspace"].includes(state.phase ?? "")
      || !["schedule", "shots"].includes(state.activePath ?? "")
      || typeof state.scheduleStarted !== "boolean"
      || typeof state.shotListStarted !== "boolean"
      || typeof state.scheduleComplete !== "boolean"
      || typeof state.shotListComplete !== "boolean"
      || typeof state.scheduleStep !== "number"
      || typeof state.shotListStep !== "number"
      || !["ai", "blank"].includes(state.shotListSource ?? "")
      || typeof state.aiGenerated !== "boolean"
      || !["studio", "client"].includes(state.owner ?? "")
      || !["working", "waiting_on_studio", "waiting_on_client", "ready_to_finalise", "released"].includes(state.status ?? "")
      || (typeof state.approvalInvalidated !== "undefined" && typeof state.approvalInvalidated !== "boolean")
      || (typeof state.approvedCallSheetFingerprint !== "undefined" && typeof state.approvedCallSheetFingerprint !== "string")
      || typeof state.lastContributor !== "string"
      || typeof state.updatedAt !== "string"
    ) return null;
    return {
      ...(state as ShootSetupState),
      approvalInvalidated: state.approvalInvalidated === true,
      approvedCallSheetFingerprint: typeof state.approvedCallSheetFingerprint === "string" ? state.approvedCallSheetFingerprint : undefined,
      scheduleSkipped: state.scheduleSkipped === true,
      shotListSkipped: state.shotListSkipped === true,
      scheduleComplete: state.status === "released" || (state.scheduleComplete === true && state.scheduleStep >= 4),
      shotListComplete: state.status === "released" || (state.shotListComplete === true && state.shotListStep >= 3),
    };
  } catch {
    return null;
  }
}

function getCallSheetApprovalFingerprint(callSheet: CallSheet) {
  return JSON.stringify({
    projectName: normaliseApprovalText(callSheet.projectName),
    days: callSheet.days.map((day) => ({
      id: day.id,
      label: normaliseApprovalText(day.label),
      date: day.date,
      generalCallTime: day.generalCallTime,
      expectedWrapTime: day.expectedWrapTime,
      primaryLocationId: day.primaryLocationId,
      safetyEmergency: day.safetyEmergency ? {
        hospitalName: normaliseApprovalText(day.safetyEmergency.hospitalName),
        hospitalAddress: normaliseApprovalText(day.safetyEmergency.hospitalAddress),
        hospitalPhone: normaliseApprovalText(day.safetyEmergency.hospitalPhone ?? ""),
        travelTime: normaliseApprovalText(day.safetyEmergency.travelTime ?? ""),
        emergencyNumber: normaliseApprovalText(day.safetyEmergency.emergencyNumber),
        confirmed: day.safetyEmergency.confirmed,
      } : null,
      notes: day.notes ? {
        equipment: normaliseApprovalText(day.notes.equipment),
        wardrobe: normaliseApprovalText(day.notes.wardrobe),
        catering: normaliseApprovalText(day.notes.catering),
        access: normaliseApprovalText(day.notes.access),
        safety: normaliseApprovalText(day.notes.safety),
        weatherConsiderations: normaliseApprovalText(day.notes.weatherConsiderations),
        clientNotes: normaliseApprovalText(day.notes.clientNotes),
      } : null,
    })),
    notice: normaliseApprovalText(callSheet.notice),
    onTheDayContact: normaliseApprovalText(callSheet.onTheDayContact),
    entries: callSheet.entries.map((entry) => ({
      id: entry.id,
      dayId: entry.dayId,
      shotNumber: entry.shotNumber,
      startTime: entry.startTime,
      durationMinutes: entry.durationMinutes,
      description: normaliseApprovalText(entry.description),
      type: entry.type,
      locationId: entry.locationId,
      personIds: entry.personIds,
      subject: normaliseApprovalText(entry.subject ?? ""),
      priority: entry.priority,
    })),
    people: callSheet.people.map((person) => ({
      id: person.id,
      name: normaliseApprovalText(person.name),
      type: person.type,
      role: normaliseApprovalText(person.role),
      company: normaliseApprovalText(person.company ?? ""),
      phone: normaliseApprovalText(person.phone),
      email: normaliseApprovalText(person.email),
      showContactDetails: person.showContactDetails === true,
      callTime: person.callTime,
      shootDayIds: person.shootDayIds,
      assignments: getShootAssignments(person).map((assignment) => ({
        id: assignment.id,
        type: assignment.type,
        role: normaliseApprovalText(assignment.role),
        callTime: assignment.callTime,
        shootDayIds: assignment.shootDayIds,
      })),
    })),
    locations: callSheet.locations.map((location) => ({
      id: location.id,
      name: normaliseApprovalText(location.name),
      address: normaliseApprovalText(location.address),
      shootDayIds: location.shootDayIds,
      wifi: normaliseApprovalText(location.wifi ?? ""),
      accessibility: normaliseApprovalText(location.accessibility ?? ""),
      parking: normaliseApprovalText(location.parking),
      access: normaliseApprovalText(location.access),
      notes: normaliseApprovalText(location.notes),
      mapLink: normaliseApprovalText(location.mapLink ?? ""),
    })),
    notes: normaliseApprovalText(callSheet.notes),
    practicalInfo: {
      wifi: normaliseApprovalText(callSheet.practicalInfo.wifi),
      access: normaliseApprovalText(callSheet.practicalInfo.access),
      safety: normaliseApprovalText(callSheet.practicalInfo.safety),
      accessibility: normaliseApprovalText(callSheet.practicalInfo.accessibility),
      emergencyContact: normaliseApprovalText(callSheet.practicalInfo.emergencyContact),
      equipment: normaliseApprovalText(callSheet.practicalInfo.equipment ?? ""),
      wardrobe: normaliseApprovalText(callSheet.practicalInfo.wardrobe ?? ""),
      catering: normaliseApprovalText(callSheet.practicalInfo.catering ?? ""),
      weatherConsiderations: normaliseApprovalText(callSheet.practicalInfo.weatherConsiderations ?? ""),
      clientNotes: normaliseApprovalText(callSheet.practicalInfo.clientNotes ?? ""),
    },
    questions: callSheet.questions.map((question) => ({
      id: question.id,
      personId: question.personId,
      question: normaliseApprovalText(question.question),
      shootDayIds: question.shootDayIds,
    })),
    visualReferences: (callSheet.visualReferences ?? []).map((reference) => ({
      id: reference.id,
      name: normaliseApprovalText(reference.name),
      description: normaliseApprovalText(reference.description ?? ""),
      url: reference.url,
      source: reference.source,
      kind: reference.kind,
    })),
    documents: callSheet.documents.map((document) => ({
      id: document.id,
      name: normaliseApprovalText(document.name),
      kind: document.kind,
      type: document.type,
      url: document.url,
      shootDayIds: document.shootDayIds,
    })),
    visibleOptionalSections: callSheet.visibleOptionalSections,
  });
}

function normaliseApprovalText(value: string) {
  return value.trim().toLocaleLowerCase().replace(/[\p{P}\p{S}]+/gu, "").replace(/\s+/gu, " ");
}

function existingShootPlanStorageKey(projectId: string) {
  return `brisk-existing-shoot-plan-${projectId}-v1`;
}

function parseExistingShootPlan(rawValue: string | null): ExistingShootPlan | null {
  if (!rawValue) return null;
  try {
    const value: unknown = JSON.parse(rawValue);
    if (!value || typeof value !== "object") return null;
    const plan = value as Partial<ExistingShootPlan>;
    if (typeof plan.name !== "string" || !["file", "link"].includes(plan.source ?? "") || !["creative", "day", "both"].includes(plan.coverage ?? "") || typeof plan.addedBy !== "string" || typeof plan.addedAt !== "string") return null;
    return plan as ExistingShootPlan;
  } catch {
    return null;
  }
}

function formatExistingPlanCoverage(coverage: ExistingShootPlanCoverage) {
  if (coverage === "creative") return "Creative Plan";
  if (coverage === "day") return "Plan the Day";
  return "Creative Plan and Plan the Day";
}

function getBriefShootCaptures(liveFootageValue: string, fallbackIsInterviewLed: boolean): ConfirmedQuickStartCapture[] | null {
  const [footageValue = "", , filmingContentValue = ""] = liveFootageValue.split("|");
  const usesNewFootage = footageValue.split("+").some((choice) => choice === "Shoot new" || choice === "New footage");
  const filmingChoices = filmingContentValue === "Both" ? ["Interviews", "Scripted scenes"] : filmingContentValue.split("+").filter(Boolean);
  if (filmingChoices.includes("Not sure yet") || filmingChoices.includes("I'll decide later")) return null;
  const captures: ConfirmedQuickStartCapture[] = [];
  if (usesNewFootage && filmingChoices.includes("Interviews")) captures.push("interviews");
  if (usesNewFootage && filmingChoices.includes("Scripted scenes")) captures.push("scripted");
  if (captures.length) return captures;
  if (!liveFootageValue.trim() && fallbackIsInterviewLed) return ["interviews"];
  return null;
}

function formatQuickStartCaptures(captures: ConfirmedQuickStartCapture[]) {
  const labels: Record<ConfirmedQuickStartCapture, string> = {
    interviews: "Interviews",
    scripted: "Scripted scenes",
    "b-roll": "B-roll or general coverage",
  };
  return captures.map((capture) => labels[capture]).join(" + ");
}

function briefIncludesInterviews(liveFootageValue: string) {
  const [footageValue = "", , filmingContentValue = ""] = liveFootageValue.split("|");
  const usesNewFootage = footageValue
    .split("+")
    .some((choice) => choice === "Shoot new" || choice === "New footage");
  const filmingChoices = filmingContentValue === "Both"
    ? ["Interviews", "Scripted scenes"]
    : filmingContentValue.split("+");
  return usesNewFootage && filmingChoices.includes("Interviews");
}

function hasMinimumCallSheetDetails(callSheet: CallSheet) {
  const hasReadyDay = callSheet.days.some((day) => Boolean(day.date && day.generalCallTime && day.expectedWrapTime));
  const primaryLocationIds = new Set(callSheet.days.map((day) => day.primaryLocationId).filter(Boolean));
  const hasPrimaryLocation = callSheet.locations.some((location) => primaryLocationIds.has(location.id) && Boolean(location.address.trim() || location.mapLink?.trim()));
  return hasReadyDay && hasPrimaryLocation;
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
