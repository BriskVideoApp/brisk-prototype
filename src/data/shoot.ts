import type { Project } from "@/components/active-videos/types";

export type ShootDayAssignment = "all" | string[];

export type ScheduleType = "shot" | "setup" | "lunch" | "travel" | "break";
export type ShotCategory = "Interview" | "B-roll" | "Establishing" | "Product" | "Action" | "Demonstration" | "Event coverage" | "Drone" | "Other";
export type ShotSize = "Extreme close-up" | "Close-up" | "Medium close-up" | "Medium" | "Medium wide" | "Wide" | "Extreme wide";
export type CameraMovement = "Static" | "Handheld" | "Pan" | "Tilt" | "Tracking" | "Push in" | "Pull out" | "Gimbal" | "Slider / dolly" | "Jib / crane" | "Other";
export type CameraAngle = "Eye level" | "Low angle" | "High angle" | "Overhead" | "Shoulder level" | "Hip level" | "POV" | "Dutch angle" | "Other";
export type InteriorExterior = "Interior" | "Exterior" | "Both";
export type ShotImageSource = "upload" | "link" | "stock" | "project-media";

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
  people: ShootPerson[];
  locations: ShootLocation[];
  notes: string;
  practicalInfo: PracticalInfo;
  questions: InterviewQuestion[];
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
  { id: "sydney-opera-house", name: "Sydney Opera House", address: "Bennelong Point, Sydney NSW 2000" },
  { id: "carriageworks", name: "Carriageworks", address: "245 Wilson Street, Eveleigh NSW 2015" },
  { id: "icc-sydney", name: "ICC Sydney", address: "14 Darling Drive, Sydney NSW 2000" },
  { id: "fox-studios", name: "Disney Studios Australia", address: "38 Driver Avenue, Moore Park NSW 2021" },
  { id: "arts-centre-melbourne", name: "Arts Centre Melbourne", address: "100 St Kilda Road, Southbank VIC 3004" },
  { id: "melbourne-convention-centre", name: "Melbourne Convention and Exhibition Centre", address: "1 Convention Centre Place, South Wharf VIC 3006" },
  { id: "brisbane-powerhouse", name: "Brisbane Powerhouse", address: "119 Lamington Street, New Farm QLD 4005" },
  { id: "adelaide-studios", name: "Adelaide Studios", address: "1 Mulberry Road, Glenside SA 5065" },
];

export function getInitialCallSheet(project: Project): CallSheet {
  if (project.id === completeCallSheet.projectId) {
    return structuredClone(completeCallSheet);
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

export function ensureShotNumbers(callSheet: CallSheet) {
  const usedNumbers = new Set<number>();
  let nextNumber = Math.max(0, ...callSheet.entries
    .filter((entry) => entry.type === "shot")
    .map((entry) => entry.shotNumber ?? 0)) + 1;

  let changed = false;
  let shotOrder = 0;
  const entries = callSheet.entries.map((entry) => {
    if (entry.type !== "shot") {
      if (entry.shotNumber === undefined) return entry;
      changed = true;
      return { ...entry, shotNumber: undefined };
    }
    const shotListOrder = entry.shotListOrder ?? shotOrder;
    shotOrder += 1;
    if (entry.shotListOrder === undefined) changed = true;
    if (entry.shotNumber && !usedNumbers.has(entry.shotNumber)) {
      usedNumbers.add(entry.shotNumber);
      return entry.shotListOrder === undefined ? { ...entry, shotListOrder } : entry;
    }

    while (usedNumbers.has(nextNumber)) nextNumber += 1;
    const shotNumber = nextNumber;
    usedNumbers.add(shotNumber);
    nextNumber += 1;
    changed = true;
    return { ...entry, shotNumber, shotListOrder };
  });

  return changed ? { ...callSheet, entries } : callSheet;
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

export function getMapsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function addMinutes(time: string, minutes: number) {
  if (!time) return "";
  const [hours, minuteValue] = time.split(":").map(Number);
  const total = (hours * 60 + minuteValue + minutes) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
