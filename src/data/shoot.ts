import type { Project } from "@/components/active-videos/types";
import type { ScriptComment } from "@/data/script";

export type ShootDayAssignment = "all" | string[];

export type ScheduleType = "shot" | "coverage" | "setup" | "lunch" | "travel" | "break";
export type ShotCategory = string;
export type ShotSize = "Extreme close-up" | "Close-up" | "Medium close-up" | "Medium" | "Medium wide" | "Wide" | "Extreme wide";
export type CameraMovement = string;
export type ShotPriority = "Critical" | "High" | "Medium" | "Bonus";
export type CameraAngle = "Eye level" | "Low angle" | "High angle" | "Overhead" | "Shoulder level" | "Hip level" | "POV" | "Dutch angle" | "Other";
export type InteriorExterior = "Interior" | "Exterior" | "Both";
export type ShotImageSource = "upload" | "link" | "stock" | "project-media";
export type ShotCaptureStatus = "to-capture" | "captured" | "pickup-needed" | "not-required";

export type ShotGroup = {
  id: string;
  name: string;
  description?: string;
  subject?: string;
  locationId?: string;
  order: number;
};

export type ShootDay = {
  id: string;
  label: string;
  date: string;
  generalCallTime: string;
  expectedWrapTime: string;
  timelineStartTime?: string;
  timelineEndTime?: string;
  primaryLocationId: string;
  safetyEmergency?: SafetyEmergencyInfo;
  notes?: ShootDayNotes;
};

export type ShootDayNotes = {
  equipment: string;
  wardrobe: string;
  catering: string;
  access: string;
  safety: string;
  weatherConsiderations: string;
  clientNotes: string;
  internalNotes: string;
};

export type SafetyEmergencyInfo = {
  hospitalName: string;
  hospitalAddress: string;
  hospitalPhone?: string;
  travelTime?: string;
  emergencyNumber: string;
  confirmed: boolean;
  needsReview?: boolean;
};

export type ProductionEntry = {
  id: string;
  dayId: string;
  shotNumber?: number;
  startTime: string;
  durationMinutes: number;
  description: string;
  type: ScheduleType;
  locationId?: string;
  personIds: string[];
  captured?: boolean;
  completed?: boolean;
  subject?: string;
  priority?: ShotPriority;
  imageReferenceUrl?: string;
  imageReferenceId?: string;
  imageReferenceSource?: ShotImageSource;
  shotListOrder?: number;
  shotCategory?: ShotCategory;
  shotSize?: ShotSize;
  cameraMovement?: CameraMovement;
  cameraAngle?: CameraAngle;
  lens?: string;
  camera?: string;
  gear?: string[];
  interiorExterior?: InteriorExterior;
  notes?: string;
  scriptSection?: string;
  suggestionStatus?: "suggested";
  comments?: ScriptComment[];
  shotGroupId?: string | null;
  linkedShotGroupId?: string;
  captureStatus?: ShotCaptureStatus;
};

export type ShootPersonType = "talent" | "crew" | "client" | "other";

export type ShootPerson = {
  id: string;
  name: string;
  type: ShootPersonType;
  role: string;
  company?: string;
  contactSource?: "team-member" | "saved-contact";
  phone: string;
  email: string;
  showContactDetails?: boolean;
  callTime: string;
  shootDayIds: ShootDayAssignment;
  assignments?: ShootAssignment[];
};

export type ShootAssignment = {
  id: string;
  type: ShootPersonType;
  role: string;
  callTime: string;
  shootDayIds: ShootDayAssignment;
};

export type ShootLocation = {
  id: string;
  name: string;
  address: string;
  shootDayIds: ShootDayAssignment;
  wifi?: string;
  accessibility?: string;
  parking: string;
  access: string;
  notes: string;
  mapLink?: string;
};

export type ShootAddressSuggestion = {
  id: string;
  name: string;
  address: string;
};

export type InterviewQuestion = {
  id: string;
  personId?: string;
  question: string;
  shootDayIds: ShootDayAssignment;
  suggestionStatus?: "suggested";
  asked?: boolean;
};

export type ShootVisualReference = {
  id: string;
  name: string;
  description?: string;
  url: string;
  thumbnailUrl?: string;
  kind?: "image" | "video";
  source: ShotImageSource;
};

export type ShootDocument = {
  id: string;
  name: string;
  kind: "pdf" | "release" | "link";
  type?: "General" | "Talent release" | "Location release" | "Safety" | "Call Sheet attachment" | "Other";
  url: string;
  shootDayIds: ShootDayAssignment;
  comments?: string[];
};

export type PracticalInfo = {
  wifi: string;
  access: string;
  safety: string;
  accessibility: string;
  emergencyContact: string;
  equipment?: string;
  wardrobe?: string;
  catering?: string;
  weatherConsiderations?: string;
  clientNotes?: string;
  internalNotes?: string;
};

export type OptionalSectionKey = "notice" | "practical" | "questions" | "documents";

export type CallSheet = {
  projectId: string;
  projectName: string;
  studioName: string;
  studioInitials: string;
  days: ShootDay[];
  notice: string;
  weather: string;
  weatherUpdatedAt: string;
  onTheDayContact: string;
  entries: ProductionEntry[];
  shotGroups?: ShotGroup[];
  shotListTopLevelOrder?: string[];
  people: ShootPerson[];
  locations: ShootLocation[];
  notes: string;
  practicalInfo: PracticalInfo;
  questions: InterviewQuestion[];
  visualReferences?: ShootVisualReference[];
  documents: ShootDocument[];
  visibleOptionalSections: OptionalSectionKey[];
  updatedAt: string;
};

const completeCallSheet: CallSheet = {
  projectId: "loom-launch-film",
  projectName: "Launch Film - Sales Narrative",
  studioName: "North Star Films",
  studioInitials: "NS",
  days: [
    {
      id: "day-1",
      label: "Day 1",
      date: "2026-08-13",
      generalCallTime: "07:30",
      expectedWrapTime: "17:00",
      primaryLocationId: "loc-studio",
      safetyEmergency: {
        hospitalName: "Wollongong Hospital Emergency Department",
        hospitalAddress: "348-352 Crown Street, Wollongong NSW 2500",
        emergencyNumber: "000",
        confirmed: true,
      },
    },
    {
      id: "day-2",
      label: "Day 2",
      date: "2026-08-14",
      generalCallTime: "08:00",
      expectedWrapTime: "15:30",
      primaryLocationId: "loc-office",
      safetyEmergency: {
        hospitalName: "Sydney Hospital Emergency Department",
        hospitalAddress: "8 Macquarie Street, Sydney NSW 2000",
        emergencyNumber: "000",
        confirmed: true,
      },
    },
  ],
  notice: "Loading dock access closes at 8:15 am. Crew vehicles must be inside before then.",
  weather: "18°C · Partly cloudy · 20% rain",
  weatherUpdatedAt: "Forecast updated 6:00 am",
  onTheDayContact: "Tom Maclachlan · Producer · 0412 555 018",
  entries: [
    {
      id: "schedule-1",
      dayId: "day-1",
      startTime: "07:30",
      durationMinutes: 30,
      description: "Crew call and gear unload",
      type: "setup",
      locationId: "loc-studio",
      personIds: ["person-tom", "person-jordan", "person-maya"],
    },
    {
      id: "schedule-2",
      dayId: "day-1",
      startTime: "08:00",
      durationMinutes: 45,
      description: "Lighting and camera setup",
      type: "setup",
      locationId: "loc-studio",
      personIds: ["person-jordan", "person-maya"],
    },
    {
      id: "schedule-3",
      dayId: "day-1",
      startTime: "08:45",
      durationMinutes: 60,
      description: "Founder interview",
      type: "shot",
      locationId: "loc-studio",
      personIds: ["person-amelia", "person-tom", "person-jordan"],
      captured: true,
      subject: "Amelia Chen",
    },
    {
      id: "schedule-4",
      dayId: "day-1",
      startTime: "09:45",
      durationMinutes: 30,
      description: "Product close-ups",
      type: "shot",
      locationId: "loc-studio",
      personIds: ["person-jordan", "person-maya"],
      captured: false,
      subject: "Loom product",
    },
    {
      id: "schedule-5",
      dayId: "day-1",
      startTime: "10:15",
      durationMinutes: 20,
      description: "Travel to Loom office",
      type: "travel",
      locationId: "loc-office",
      personIds: ["person-tom", "person-jordan", "person-maya"],
    },
    {
      id: "schedule-6",
      dayId: "day-1",
      startTime: "10:35",
      durationMinutes: 85,
      description: "Team collaboration coverage",
      type: "shot",
      locationId: "loc-office",
      personIds: ["person-tom", "person-jordan", "person-maya", "person-amelia"],
      captured: false,
      subject: "Loom team",
    },
    {
      id: "schedule-7",
      dayId: "day-1",
      startTime: "12:00",
      durationMinutes: 45,
      description: "Lunch",
      type: "lunch",
      locationId: "loc-office",
      personIds: [],
    },
    {
      id: "schedule-8",
      dayId: "day-2",
      startTime: "08:00",
      durationMinutes: 40,
      description: "Office reset and sound check",
      type: "setup",
      locationId: "loc-office",
      personIds: ["person-tom", "person-jordan", "person-maya"],
    },
    {
      id: "schedule-9",
      dayId: "day-2",
      startTime: "08:40",
      durationMinutes: 90,
      description: "Customer workflow scenes",
      type: "shot",
      locationId: "loc-office",
      personIds: ["person-amelia", "person-jordan", "person-maya"],
      captured: false,
      subject: "Amelia Chen and Loom team",
    },
    {
      id: "entry-unscheduled-1",
      dayId: "day-1",
      startTime: "",
      durationMinutes: 15,
      description: "Exterior establishing shots",
      type: "shot",
      locationId: "loc-studio",
      personIds: [],
      captured: false,
      subject: "Precinct Studio",
    },
    {
      id: "entry-unscheduled-2",
      dayId: "day-1",
      startTime: "",
      durationMinutes: 10,
      description: "Office signage and general atmosphere",
      type: "shot",
      locationId: "loc-office",
      personIds: [],
      captured: false,
      subject: "Loom office",
    },
    {
      id: "entry-unscheduled-3",
      dayId: "day-2",
      startTime: "",
      durationMinutes: 15,
      description: "Hands, screens and workflow cutaways",
      type: "shot",
      locationId: "loc-office",
      personIds: ["person-amelia"],
      captured: false,
      subject: "Amelia Chen",
    },
  ],
  people: [
    {
      id: "person-tom",
      name: "Tom Maclachlan",
      type: "crew",
      role: "Producer / Director",
      company: "North Star Films",
      contactSource: "team-member",
      phone: "0412 555 018",
      email: "tom@northstarfilms.com.au",
      callTime: "07:15",
      shootDayIds: "all",
    },
    {
      id: "person-jordan",
      name: "Jordan Lee",
      type: "crew",
      role: "Camera Operator",
      company: "North Star Films",
      contactSource: "team-member",
      phone: "0422 555 284",
      email: "jordan@northstarfilms.com.au",
      callTime: "07:30",
      shootDayIds: "all",
    },
    {
      id: "person-maya",
      name: "Maya Singh",
      type: "crew",
      role: "Sound Recordist",
      company: "North Star Films",
      contactSource: "team-member",
      phone: "0431 555 906",
      email: "maya@northstarfilms.com.au",
      callTime: "07:30",
      shootDayIds: "all",
    },
    {
      id: "person-amelia",
      name: "Amelia Chen",
      type: "talent",
      role: "Founder / Interviewee",
      company: "Loom",
      contactSource: "saved-contact",
      phone: "0404 555 731",
      email: "amelia@loomexample.com",
      callTime: "08:30",
      shootDayIds: "all",
    },
    {
      id: "person-liam",
      name: "Liam O'Connor",
      type: "client",
      role: "Communications Manager",
      company: "Loom",
      contactSource: "saved-contact",
      phone: "0408 555 412",
      email: "liam@loomexample.com",
      callTime: "08:15",
      shootDayIds: ["day-1"],
    },
    {
      id: "person-ruth",
      name: "Ruth Williams",
      type: "other",
      role: "Venue Contact",
      company: "Precinct Studio",
      contactSource: "saved-contact",
      phone: "0466 555 193",
      email: "ruth@precinctstudios.com.au",
      callTime: "07:00",
      shootDayIds: ["day-1"],
    },
  ],
  locations: [
    {
      id: "loc-studio",
      name: "Precinct Studio 2",
      address: "21 James Street, Thirroul NSW 2515",
      shootDayIds: ["day-1"],
      parking: "Two crew parks in the rear loading dock. Street parking on James Street for clients and talent.",
      access: "Enter via the loading dock off King Lane. Call Ruth on arrival.",
      notes: "Studio is on level one. Freight lift is available for equipment.",
    },
    {
      id: "loc-office",
      name: "Loom Sydney Office",
      address: "44 Market Street, Sydney NSW 2000",
      shootDayIds: "all",
      parking: "Wilson Parking on Clarence Street. Allow ten minutes to walk equipment across.",
      access: "Meet Liam in the ground-floor lobby. Security will issue visitor passes.",
      notes: "Keep the eastern meeting room clear for regular staff from 1:30 pm.",
    },
  ],
  notes: "Quiet set during interviews. Avoid showing unreleased product screens and keep the eastern collaboration area available for staff.",
  practicalInfo: {
    wifi: "Network: Precinct-Guest · Password: create-together",
    access: "Keep the equipment holding area clear and follow the producer's direction when moving between locations.",
    safety: "Keep one clear path to every fire exit. Report cables crossing walkways to the producer immediately.",
    accessibility: "Both locations have lift access. Please tell Tom in advance if you need step-free assistance.",
    emergencyContact: "Tom Maclachlan · 0412 555 018",
  },
  questions: [
    {
      id: "question-1",
      personId: "person-amelia",
      question: "What problem were your customers facing before this launch?",
      shootDayIds: ["day-1"],
    },
    {
      id: "question-2",
      personId: "person-amelia",
      question: "What changed for your team once the new workflow was in place?",
      shootDayIds: ["day-1"],
    },
  ],
  documents: [
    {
      id: "document-1",
      name: "Talent release - Amelia Chen.pdf",
      kind: "release",
      url: "#release-amelia",
      shootDayIds: ["day-1"],
    },
    {
      id: "document-2",
      name: "Studio safety information",
      kind: "link",
      url: "#studio-safety",
      shootDayIds: ["day-1"],
    },
  ],
  visibleOptionalSections: ["notice", "practical", "questions", "documents"],
  updatedAt: "2026-08-04T10:30:00+10:00",
};

export const existingPeople: ShootPerson[] = [
  ...completeCallSheet.people,
  {
    id: "person-sarah",
    name: "Sarah Khan",
    type: "crew",
    role: "Production Assistant",
    company: "North Star Films",
    contactSource: "team-member",
    phone: "0410 555 628",
    email: "sarah@northstarfilms.com.au",
    callTime: "07:30",
    shootDayIds: "all",
  },
  {
    id: "person-david",
    name: "David Ross",
    type: "talent",
    role: "Customer Interviewee",
    contactSource: "saved-contact",
    phone: "0444 555 265",
    email: "david@example.com",
    callTime: "10:00",
    shootDayIds: "all",
  },
];

export const shootAddressSuggestions: ShootAddressSuggestion[] = [
  { id: "hewitts-avenue", name: "Hewitts Avenue", address: "26 Hewitts Avenue, Thirroul NSW 2515" },
  { id: "sydney-opera-house", name: "Sydney Opera House", address: "Bennelong Point, Sydney NSW 2000" },
  { id: "carriageworks", name: "Carriageworks", address: "245 Wilson Street, Eveleigh NSW 2015" },
  { id: "icc-sydney", name: "ICC Sydney", address: "14 Darling Drive, Sydney NSW 2000" },
  { id: "fox-studios", name: "Disney Studios Australia", address: "38 Driver Avenue, Moore Park NSW 2021" },
  { id: "arts-centre-melbourne", name: "Arts Centre Melbourne", address: "100 St Kilda Road, Southbank VIC 3004" },
  { id: "melbourne-convention-centre", name: "Melbourne Convention and Exhibition Centre", address: "1 Convention Centre Place, South Wharf VIC 3006" },
  { id: "brisbane-powerhouse", name: "Brisbane Powerhouse", address: "119 Lamington Street, New Farm QLD 4005" },
  { id: "adelaide-studios", name: "Adelaide Studios", address: "1 Mulberry Road, Glenside SA 5065" },
];

export function getEmptyCallSheet(project: Project): CallSheet {
  return {
    projectId: project.id,
    projectName: project.name,
    studioName: "North Star Films",
    studioInitials: "NS",
    days: [],
    notice: "",
    weather: "Weather will appear after a date and primary location are set.",
    weatherUpdatedAt: "Waiting for shoot details",
    onTheDayContact: "",
    entries: [],
    people: [],
    locations: [],
    notes: "",
    practicalInfo: { wifi: "", access: "", safety: "", accessibility: "", emergencyContact: "" },
    questions: [],
    documents: [],
    visibleOptionalSections: [],
    updatedAt: project.latestUpdate.timestamp,
  };
}

export function getInitialCallSheet(project: Project): CallSheet {
  if (project.id === completeCallSheet.projectId) {
    return normaliseShootArchitecture(structuredClone(completeCallSheet));
  }

  const locationId = `location-${project.id}`;
  const dayId = "day-1";
  const isPartial = project.id === "deel-customer-story";

  return {
    projectId: project.id,
    projectName: project.name,
    studioName: "North Star Films",
    studioInitials: "NS",
    days: isPartial
      ? [{
        id: dayId,
        label: "Day 1",
        date: "2026-08-20",
        generalCallTime: "08:00",
        expectedWrapTime: "",
        primaryLocationId: locationId,
      }]
      : [],
    notice: "",
    weather: "Weather will appear after a date and primary location are set.",
    weatherUpdatedAt: "Waiting for shoot details",
    onTheDayContact: "",
    entries: isPartial
      ? [
          {
            id: "schedule-1",
            dayId,
            startTime: "08:00",
            durationMinutes: 30,
            description: "Crew call and setup",
            type: "setup",
            locationId,
            personIds: [],
          },
        ]
      : [],
    people: [],
    locations: isPartial
      ? [
          {
            id: locationId,
            name: "Harbour Meeting Room",
            address: "11 York Street, Sydney NSW 2000",
            shootDayIds: "all",
            parking: "",
            access: "",
            notes: "",
          },
        ]
      : [],
    notes: "",
    practicalInfo: { wifi: "", access: "", safety: "", accessibility: "", emergencyContact: "" },
    questions: [],
    documents: [],
    visibleOptionalSections: [],
    updatedAt: new Date().toISOString(),
  };
}

export function callSheetStorageKey(projectId: string) {
  return `brisk-call-sheet-${projectId}-v3`;
}

export function shootAccessStorageKey(projectId: string) {
  return `brisk-shoot-access-${projectId}-v1`;
}

export function ensureShotNumbers(callSheet: CallSheet) {
  const orderedShots = callSheet.entries
    .filter((entry) => entry.type === "shot")
    .map((entry, index) => ({ entry, fallbackOrder: index }))
    .sort((left, right) => (left.entry.shotListOrder ?? left.fallbackOrder) - (right.entry.shotListOrder ?? right.fallbackOrder));
  const positionById = new Map(orderedShots.map(({ entry }, index) => [entry.id, index]));
  let changed = false;
  const entries = callSheet.entries.map((entry) => {
    if (entry.type !== "shot") {
      if (entry.shotNumber === undefined) return entry;
      changed = true;
      return { ...entry, shotNumber: undefined };
    }
    const shotListOrder = positionById.get(entry.id) ?? 0;
    const shotNumber = shotListOrder + 1;
    if (entry.shotListOrder === shotListOrder && entry.shotNumber === shotNumber) return entry;
    changed = true;
    return { ...entry, shotNumber, shotListOrder };
  });

  return changed ? { ...callSheet, entries } : callSheet;
}

export function normaliseShootArchitecture(callSheet: CallSheet): CallSheet {
  const originalShots = callSheet.entries.filter((entry) => entry.type === "shot");
  const groups = [...(callSheet.shotGroups ?? [])].sort((left, right) => left.order - right.order);
  const groupByName = new Map(groups.map((group) => [shootIdentityKey(group.name), group]));
  const shots = originalShots.map((shot) => {
    if (shot.shotGroupId === null) {
      return {
        ...shot,
        dayId: "",
        startTime: "",
        durationMinutes: 0,
        captureStatus: shot.captureStatus ?? (shot.captured ? "captured" : "to-capture"),
      } satisfies ProductionEntry;
    }
    let group = shot.shotGroupId ? groups.find((candidate) => candidate.id === shot.shotGroupId) : undefined;
    if (!group) {
      const groupName = inferArchitectureGroupName(shot);
      group = groupByName.get(shootIdentityKey(groupName));
      if (!group) {
        group = {
          id: `shot-group-${shootIdentityKey(groupName).replaceAll(" ", "-") || groups.length + 1}`,
          name: groupName,
          description: inferArchitectureGroupDescription(groupName),
          subject: shot.subject,
          locationId: shot.locationId,
          order: groups.length,
        };
        groups.push(group);
        groupByName.set(shootIdentityKey(groupName), group);
      }
    }
    return {
      ...shot,
      dayId: "",
      startTime: "",
      durationMinutes: 0,
      shotGroupId: group.id,
      captureStatus: shot.captureStatus ?? (shot.captured ? "captured" : "to-capture"),
    } satisfies ProductionEntry;
  });
  const scheduleEntries = callSheet.entries.filter((entry) => entry.type !== "shot");
  const coveredGroupIds = new Set(scheduleEntries.flatMap((entry) => entry.linkedShotGroupId ? [entry.linkedShotGroupId] : []));
  const migratedCoverageEntries = groups.flatMap((group) => {
    if (coveredGroupIds.has(group.id)) return [];
    const legacyScheduledShots = originalShots.filter((shot) => shots.find((candidate) => candidate.id === shot.id)?.shotGroupId === group.id && Boolean(shot.dayId));
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

  return ensureShotNumbers({
    ...callSheet,
    shotGroups: groups,
    entries: [...scheduleEntries, ...shots, ...migratedCoverageEntries],
  });
}

function inferArchitectureGroupName(shot: ProductionEntry) {
  if (shot.scriptSection?.trim()) return shot.scriptSection.trim();
  const value = `${shot.description} ${shot.shotCategory ?? ""}`.toLocaleLowerCase("en-AU");
  if (/interview|founder|piece to camera|portrait|talking head/u.test(value)) return "Founder interview";
  if (/product|demonstration|workflow|screen|detail/u.test(value)) return "Product demonstration";
  if (/establish|exterior|location|signage|atmosphere/u.test(value)) return "Establishing coverage";
  if (/team|collaboration|workplace|office|b-roll|cutaway|hands/u.test(value)) return "Team and workplace B-roll";
  return "Additional coverage";
}

function inferArchitectureGroupDescription(groupName: string) {
  if (groupName === "Founder interview") return "Primary frame, alternate angle, reactions and cutaways.";
  if (groupName === "Product demonstration") return "Product workflow, screen detail and supporting inserts.";
  if (groupName === "Establishing coverage") return "Location, signage and atmosphere that set the scene.";
  if (groupName === "Team and workplace B-roll") return "Natural team activity and workplace coverage.";
  return "Extra shots to capture if the day allows.";
}

function shootIdentityKey(value: string) {
  return value.trim().toLocaleLowerCase("en-AU").replace(/[\p{P}\p{S}]+/gu, " ").replace(/\s+/gu, " ");
}

export function isAssignedToDay(assignment: ShootDayAssignment, dayId: string) {
  return assignment === "all" || assignment.includes(dayId);
}

export function formatTime(time: string) {
  if (!time) return "Not set";
  const [hourValue, minuteValue] = time.split(":").map(Number);
  const period = hourValue >= 12 ? "pm" : "am";
  const hour = hourValue % 12 || 12;
  return `${hour}:${String(minuteValue).padStart(2, "0")} ${period}`;
}

export function formatShootDate(value: string) {
  if (!value) return "Date not set";
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function getMapsUrl(addressOrLink: string) {
  const value = addressOrLink.trim();
  if (/^https?:\/\//iu.test(value)) return value;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`;
}

export function getMapsLinkLabel(addressOrLink: string) {
  const value = addressOrLink.trim();
  return /^https?:\/\//iu.test(value) ? "Open in Google Maps" : value;
}

export function addMinutes(time: string, minutes: number) {
  if (!time) return "";
  const [hours, minuteValue] = time.split(":").map(Number);
  const total = (hours * 60 + minuteValue + minutes) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
