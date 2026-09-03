import type { StageKey, TeamPerson } from "@/components/active-videos/types";
import { mockTeamPeople, teamRoleLabels } from "@/data/active-videos/teamDefaults";

export type PersonType = "Team" | "Freelancer" | "Client contact";
export type PersonStatus = "Active" | "Invited" | "Paused" | "Archived";
export type PersonAvailability = "Available" | "Busy" | "Away";
export type PersonAccessRole = "Studio Staff" | "Studio Freelancer" | "Customer";
export type StudioPermission = "Team Member" | "Studio Admin" | "Studio Owner";
export type WorkloadStatus = "Waiting on Studio" | "Waiting on Client";
export type AssignmentStatus = "Assigned" | "Accepted" | "Offer sent";
export type CapacityLevel = "plenty" | "near" | "full";

export const prototypeStudioPersonId = "te";
export const prototypeFreelancerPersonId = "np";
export const prototypeCustomerPersonId = "client-jess";

export type PersonActivity = {
  id: string;
  label: string;
  detail: string;
  occurredAt: string;
};

export type PersonWorkload = {
  id: string;
  projectId: string;
  stage: StageKey;
  status: WorkloadStatus;
  predictedHours: number;
  projectRole: string;
  assignmentStatus: AssignmentStatus;
};

export type PersonCommercialDetails = {
  rateType: "Hourly" | "Day rate";
  defaultRate: number;
  currency: "AUD";
  invoices: Array<{
    id: string;
    label: string;
    amount: number;
    status: "Approved" | "Pending" | "Paid";
  }>;
};

export type Person = {
  id: string;
  name: string;
  avatarUrl: string | null;
  email: string;
  phone: string;
  businessName?: string;
  taxNumber?: string;
  department: string | null;
  type: PersonType;
  jobTitles: string[];
  skills: string[];
  styles: string[];
  seniority: "Emerging" | "Midweight" | "Senior" | "Lead";
  location: string;
  timezone: string;
  accessRole: PersonAccessRole;
  studioPermission: StudioPermission | null;
  status: PersonStatus;
  latestActivity: PersonActivity;
  activity: PersonActivity[];
  workloads: PersonWorkload[];
  weeklyCapacityHours: number | null;
  availability: PersonAvailability | null;
  notes: string;
  portfolioUrl: string;
  testingStatus: "Not required" | "Not started" | "In review" | "Complete";
  onboardingStatus: "Not started" | "In progress" | "Complete";
  agreementStatus: "Not required" | "Pending" | "Signed";
  commercial: PersonCommercialDetails | null;
  clientId: string | null;
  clientName: string | null;
  clientMembershipRole: "Client Admin" | "Client Member" | null;
  projectAccessIds: string[];
};

export type PersonProfileUpdate = Partial<Pick<Person,
  | "name"
  | "avatarUrl"
  | "email"
  | "phone"
  | "businessName"
  | "taxNumber"
  | "jobTitles"
  | "skills"
  | "styles"
  | "seniority"
  | "location"
  | "timezone"
  | "weeklyCapacityHours"
  | "availability"
  | "portfolioUrl"
>>;

export type PersonStudioDetailsUpdate = Partial<Pick<Person,
  | "department"
  | "seniority"
  | "studioPermission"
  | "testingStatus"
  | "onboardingStatus"
  | "agreementStatus"
  | "weeklyCapacityHours"
>> & {
  defaultRate?: number;
  rateType?: PersonCommercialDetails["rateType"];
};

export type NewPersonInput = {
  type: Exclude<PersonType, "Client contact">;
  name: string;
  email: string;
  jobTitle: string;
  weeklyCapacityHours?: number;
  skills?: string[];
  location?: string;
  defaultRate?: number;
  inviteNow: boolean;
};

export type ClientContactMetadata = Pick<Person, "jobTitles" | "skills" | "styles" | "seniority" | "location" | "timezone" | "phone" | "notes">;

type NativePersonMetadata = Omit<Person, "id" | "name" | "avatarUrl" | "type" | "department" | "studioPermission" | "weeklyCapacityHours" | "availability" | "workloads" | "latestActivity" | "activity" | "commercial" | "clientId" | "clientName" | "clientMembershipRole" | "projectAccessIds"> & {
  activityLabel: string;
  activityAt: string;
  dayRate?: number;
};

const workloadByPersonId: Record<string, PersonWorkload[]> = {
  te: [
    workload("te-loom", "loom-launch-film", "masters", "Waiting on Studio", 14, "Producer"),
    workload("te-hims", "hims-product-education", "script", "Waiting on Client", 12, "Producer"),
  ],
  sc: [
    workload("sc-hims", "hims-product-education", "media", "Waiting on Studio", 18, "Editor"),
    workload("sc-ramp", "ramp-finance-recap", "edit", "Waiting on Studio", 16, "Editor"),
    workload("sc-loom", "loom-launch-film", "edit", "Waiting on Studio", 14, "Editor"),
    workload("sc-deel", "deel-customer-story", "media", "Waiting on Client", 9, "Editor"),
  ],
  jl: [
    workload("jl-deel", "deel-customer-story", "shoot", "Waiting on Studio", 12, "Shooter", "Accepted"),
    workload("jl-loom", "loom-launch-film", "shoot", "Waiting on Client", 8, "Shooter", "Offer sent"),
    workload("jl-ramp", "ramp-finance-recap", "shoot", "Waiting on Client", 10, "Shooter", "Offer sent"),
  ],
  ct: [
    workload("ct-notion", "notion-workflows", "edit", "Waiting on Studio", 20, "Editor", "Accepted"),
    workload("ct-canva", "canva-brand-refresh", "edit", "Waiting on Studio", 16, "Editor", "Offer sent"),
  ],
  md: [
    workload("md-notion", "notion-workflows", "edit", "Waiting on Studio", 12, "Motion Designer"),
    workload("md-hims", "hims-product-education", "edit", "Waiting on Client", 16, "Motion Designer"),
    workload("md-canva", "canva-brand-refresh", "script", "Waiting on Client", 8, "Motion Designer"),
  ],
  ak: [
    workload("ak-posthog", "posthog-onboarding", "edit", "Waiting on Studio", 12, "Colourist", "Accepted"),
    workload("ak-openai", "openai-partner-update", "edit", "Waiting on Client", 6, "Colourist", "Accepted"),
  ],
  rb: [
    workload("rb-deel", "deel-customer-story", "masters", "Waiting on Studio", 8, "Producer"),
    workload("rb-ramp", "ramp-finance-recap", "brief", "Waiting on Studio", 6, "Producer"),
    workload("rb-notion", "notion-workflows", "masters", "Waiting on Client", 8, "Producer"),
  ],
  ed: [
    workload("ed-canva", "canva-brand-refresh", "edit", "Waiting on Studio", 18, "Animator", "Accepted"),
    workload("ed-figma", "figma-config-highlights", "edit", "Waiting on Client", 12, "Animator", "Accepted"),
  ],
  jm: [
    workload("jm-openai", "openai-partner-update", "masters", "Waiting on Studio", 10, "Sound Designer"),
    workload("jm-linear", "linear-roadmap-film", "masters", "Waiting on Client", 8, "Sound Designer"),
  ],
  np: [
    workload("np-canva", "canva-brand-refresh", "edit", "Waiting on Studio", 12, "VFX Artist", "Offer sent"),
    workload("np-figma", "figma-config-highlights", "edit", "Waiting on Client", 16, "VFX Artist", "Accepted"),
  ],
  os: [
    workload("os-loom", "loom-launch-film", "brief", "Waiting on Studio", 8, "Executive Producer"),
    workload("os-deel", "deel-customer-story", "script", "Waiting on Client", 6, "Executive Producer"),
  ],
  hb: [workload("hb-ramp", "ramp-finance-recap", "shoot", "Waiting on Studio", 10, "Director of Photography", "Offer sent")],
};

const nativeMetadata: Record<string, NativePersonMetadata> = {
  te: metadata("tom@northstarfilms.com.au", "+61 412 555 101", ["Producer", "Studio Director"], ["Producing", "Creative direction"], ["Documentary", "Brand film"], "Lead", "Sydney, NSW", "Australia/Sydney", "Studio Staff", "Active", "Approved the Loom production schedule", "2026-08-13T10:42:00+10:00", "Owns production oversight and final Studio decisions."),
  sc: metadata("sarah@northstarfilms.com.au", "+61 403 555 205", ["Editor"], ["Editing", "Story structure", "Colour review"], ["Documentary", "Customer story"], "Senior", "Melbourne, VIC", "Australia/Melbourne", "Studio Staff", "Active", "Shared the Hims media handover", "2026-08-13T09:18:00+10:00", "Strong narrative editor. Flag workload before assigning another urgent cut."),
  jl: metadata("jordan@leevisuals.com", "+61 401 555 118", ["Shooter", "Director of Photography"], ["Cinematography", "Lighting", "Gimbal"], ["Live action", "Interview"], "Senior", "Sydney, NSW", "Australia/Sydney", "Studio Freelancer", "Active", "Accepted the Deel shoot offer", "2026-08-12T16:34:00+10:00", "Preferred for small-footprint interview crews.", 980),
  ct: metadata("chris@tayloredits.com.au", "+61 409 555 292", ["Editor"], ["Editing", "Motion graphics", "Premiere Pro"], ["Product", "Social"], "Senior", "Brisbane, QLD", "Australia/Brisbane", "Studio Freelancer", "Active", "Uploaded a Notion rough cut", "2026-08-12T14:09:00+10:00", "Fast, reliable editor for product-led work.", 880),
  md: metadata("maddie@northstarfilms.com.au", "+61 422 555 630", ["Motion Designer"], ["Motion design", "Animation", "After Effects"], ["Explainer", "Product"], "Midweight", "Melbourne, VIC", "Australia/Melbourne", "Studio Staff", "Active", "Added direction to the Canva Script", "2026-08-13T08:45:00+10:00", "Pair with a senior editor for long-form narrative projects."),
  ak: metadata("aisha@khancolour.com", "+61 414 555 309", ["Colourist"], ["Colour grading", "Conform", "DaVinci Resolve"], ["Cinematic", "Commercial"], "Senior", "Adelaide, SA", "Australia/Adelaide", "Studio Freelancer", "Active", "Delivered the OpenAI grade", "2026-08-12T11:22:00+10:00", "Remote colourist with calibrated suite.", 1_100),
  rb: metadata("riley@northstarfilms.com.au", "+61 407 555 441", ["Producer"], ["Producing", "Client management", "Scheduling"], ["Brand film", "Customer story"], "Senior", "Sydney, NSW", "Australia/Sydney", "Studio Staff", "Active", "Moved Deel into Media", "2026-08-13T07:56:00+10:00", "Primary producer for retained Clients."),
  ed: metadata("emma@davisanimation.com", "+61 406 555 557", ["Animator"], ["2D animation", "Character animation", "After Effects"], ["Playful", "Illustration-led"], "Midweight", "Hobart, TAS", "Australia/Hobart", "Studio Freelancer", "Active", "Accepted the Canva animation offer", "2026-08-11T15:40:00+10:00", "Best suited to graphic and character-led explainers.", 920),
  jm: metadata("marcus@northstarfilms.com.au", "+61 420 555 694", ["Sound Designer"], ["Sound design", "Mixing", "Dialogue edit"], ["Documentary", "Cinematic"], "Senior", "Sydney, NSW", "Australia/Sydney", "Studio Staff", "Active", "Uploaded the OpenAI mix", "2026-08-12T17:03:00+10:00", "Maintains the Studio sound library and delivery standards."),
  np: metadata("nina@patelvfx.com", "+61 418 555 772", ["VFX Artist"], ["Compositing", "Rotoscoping", "Cleanup"], ["Invisible VFX", "Product"], "Senior", "Perth, WA", "Australia/Perth", "Studio Freelancer", "Active", "Reviewed the Figma cleanup notes", "2026-08-10T12:48:00+10:00", "Book at least five working days ahead.", 1_180),
};

const additionalPeople: Person[] = [
  standalonePerson("tom-maclachlan", "Tom Maclachlan", "tom@chopchop.film", "Team", ["Studio Director"], ["Producing", "Creative direction"], "Lead", "Sydney, NSW", "Studio Staff", "Active", 40, "Available", "Reviewed Studio access", "2026-08-13T11:20:00+10:00", "Studio Director and billing administrator."),
  standalonePerson("producer", "Producer", "producer@chopchop.film", "Team", ["Producer"], ["Producing", "Client management"], "Senior", "Sydney, NSW", "Studio Staff", "Active", 40, "Available", "Updated a production schedule", "2026-08-13T10:15:00+10:00", "Studio producer with full workspace access."),
  standalonePerson("editor", "Editor", "editor@chopchop.film", "Team", ["Editor"], ["Editing", "Story structure"], "Midweight", "Sydney, NSW", "Studio Staff", "Invited", 40, "Available", "Studio invitation sent", "2026-08-13T11:05:00+10:00", "Invited Studio Staff member. Profile details can be completed after acceptance."),
  standalonePerson("os", "Olivia Singh", "olivia@northstarfilms.com.au", "Team", ["Executive Producer"], ["Producing", "Commercial strategy"], "Lead", "Sydney, NSW", "Studio Staff", "Active", 32, "Available", "Reviewed the Loom client plan", "2026-08-12T13:36:00+10:00", "Supports key accounts and producer mentoring."),
  standalonePerson("hb", "Hugo Bennett", "hugo@bennettcamera.com", "Freelancer", ["Director of Photography"], ["Cinematography", "Lighting", "Drone"], "Senior", "Newcastle, NSW", "Studio Freelancer", "Active", null, "Available", "Sent availability for the Ramp shoot", "2026-08-11T11:07:00+10:00", "CAA-certified drone operator.", 1_250),
  standalonePerson("dc", "Darcy Cole", "darcy@colepost.com", "Freelancer", ["Editor"], ["Editing", "Premiere Pro"], "Midweight", "Melbourne, VIC", "Studio Freelancer", "Invited", null, "Available", "Invitation sent", "2026-08-10T09:20:00+10:00", "New freelancer. Portfolio review complete.", 760),
  standalonePerson("me", "Max Evans", "max@northstarfilms.com.au", "Team", ["Production Coordinator"], ["Scheduling", "Call sheets"], "Midweight", "Sydney, NSW", "Studio Staff", "Paused", 40, "Away", "Access paused by Olivia", "2026-08-02T16:18:00+10:00", "On extended leave until September."),
  standalonePerson("lr", "Leila Rahman", "leila@northstarfilms.com.au", "Team", ["Producer"], ["Producing", "Client management"], "Senior", "Brisbane, QLD", "Studio Staff", "Archived", 40, "Away", "Person archived", "2026-06-28T14:05:00+10:00", "Former team member. Keep project history intact."),
  standalonePerson("zo", "Zoe Okafor", "zoe@okaforstudio.com", "Freelancer", ["Illustrator", "Animator"], ["Illustration", "2D animation"], "Senior", "Auckland, NZ", "Studio Freelancer", "Archived", null, "Away", "Person archived", "2026-05-19T10:30:00+10:00", "Past collaborator. Agreement and invoices retained.", 900),
];

export const clientContactMetadata: Record<string, ClientContactMetadata> = {
  "client-jess": contactMetadata(["Marketing Director"], ["Brand approvals", "Campaign strategy"], "Lead", "Sydney, NSW", "+61 412 555 820", "Primary Client administrator for Loom."),
  "client-sarah": contactMetadata(["Brand Manager"], ["Brand approvals", "Campaign delivery"], "Senior", "Sydney, NSW", "+61 419 555 430", "Supports campaign reviews and approvals."),
  "client-daniel": contactMetadata(["Product Marketing Manager"], ["Product messaging"], "Senior", "Melbourne, VIC", "+61 408 555 712", "Invited Loom collaborator."),
  "loom-contact-1": contactMetadata(["Marketing Director"], ["Brand approvals", "Campaign strategy"], "Lead", "Sydney, NSW", "+61 410 555 014", "Primary Loom approver."),
  "loom-contact-2": contactMetadata(["Product Marketing Manager"], ["Product messaging"], "Senior", "San Francisco, USA", "+1 415 555 0124", "Provides product and launch details."),
  "deel-contact-1": contactMetadata(["Regional Marketing Lead"], ["Campaign strategy"], "Lead", "Singapore", "+65 6555 0184", "Primary APAC stakeholder."),
  "hims-contact-1": contactMetadata(["Content Producer"], ["Content review"], "Senior", "London, UK", "+44 20 7555 0134", "Coordinates product and medical review."),
  "notion-contact-1": contactMetadata(["Developer Marketing Manager"], ["Product messaging"], "Senior", "San Francisco, USA", "+1 415 555 0168", "Project paused at Client request."),
  "openai-contact-1": contactMetadata(["Partner Marketing Lead"], ["Partner communications"], "Lead", "San Francisco, USA", "+1 415 555 0190", "Final approval contact."),
  "posthog-contact-1": contactMetadata(["Product Marketing Manager"], ["Product messaging"], "Senior", "London, UK", "+44 20 7555 0196", "Portal access paused with archived Client."),
  "ramp-contact-1": contactMetadata(["Brand Manager"], ["Brand approvals"], "Senior", "New York, USA", "+1 212 555 0138", "Requested the current production pause."),
  "canva-contact-1": contactMetadata(["Creative Operations Lead"], ["Creative operations"], "Lead", "Sydney, NSW", "+61 421 555 811", "Owns creative direction and review routing."),
  "linear-contact-1": contactMetadata(["Head of Content"], ["Content strategy"], "Lead", "San Francisco, USA", "+1 415 555 0172", "Completed project contact."),
  "alex-contact-1": contactMetadata(["Founder"], ["Approvals"], "Lead", "Melbourne, VIC", "+61 404 555 628", "Client contact and approver."),
};

export const initialNativePeople: Person[] = [
  ...mockTeamPeople.map((teamPerson) => makeNativePerson(teamPerson, nativeMetadata[teamPerson.id])),
  ...additionalPeople,
];

export function createNativePerson(input: NewPersonInput, id: string): Person {
  const now = new Date().toISOString();
  const activityLabel = input.inviteNow ? "Invitation sent" : "Person added";
  const activity = makeActivity(id, activityLabel, input.inviteNow ? `Invitation sent to ${input.email}` : "Profile created in People", now);
  const isFreelancer = input.type === "Freelancer";

  return {
    id,
    name: input.name.trim(),
    avatarUrl: null,
    email: input.email.trim(),
    phone: "",
    department: input.type === "Team" ? inferTeamDepartment([input.jobTitle]) : null,
    type: input.type,
    jobTitles: [input.jobTitle.trim() || (isFreelancer ? "Freelancer" : "Team member")],
    skills: input.skills?.filter(Boolean) ?? [],
    styles: [],
    seniority: "Midweight",
    location: input.location?.trim() || "Location not added",
    timezone: "Australia/Sydney",
    accessRole: isFreelancer ? "Studio Freelancer" : "Studio Staff",
    studioPermission: input.type === "Team" ? "Team Member" : null,
    status: input.inviteNow ? "Invited" : "Active",
    latestActivity: activity,
    activity: [activity],
    workloads: [],
    weeklyCapacityHours: input.type === "Team" ? input.weeklyCapacityHours ?? 40 : null,
    availability: "Available",
    notes: "",
    portfolioUrl: "",
    testingStatus: isFreelancer ? "Not started" : "Not required",
    onboardingStatus: input.inviteNow ? "Not started" : "In progress",
    agreementStatus: isFreelancer ? "Pending" : "Not required",
    commercial: isFreelancer ? {
      rateType: "Day rate",
      defaultRate: input.defaultRate ?? 800,
      currency: "AUD",
      invoices: [],
    } : null,
    clientId: null,
    clientName: null,
    clientMembershipRole: null,
    projectAccessIds: [],
  };
}

export function getPersonInitials(name: string) {
  return name
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase("en-AU"))
    .join("");
}

export function hasStudioAdministrationAccess(person: Pick<Person, "studioPermission"> | null | undefined) {
  return person?.studioPermission === "Studio Admin" || person?.studioPermission === "Studio Owner";
}

export function getWorkloadRollup(person: Pick<Person, "workloads" | "weeklyCapacityHours">) {
  const activeHours = sumHours(person.workloads.filter((item) => item.status === "Waiting on Studio"));
  const potentialHours = sumHours(person.workloads.filter((item) => item.status === "Waiting on Client"));
  const capacity = getCapacitySummary(activeHours, person.weeklyCapacityHours ?? 0);

  return {
    activeHours,
    potentialHours,
    ...capacity,
    isOverCapacity: person.weeklyCapacityHours !== null && activeHours > person.weeklyCapacityHours,
  };
}

export function getCapacitySummary(bookedHours: number, weeklyCapacityHours: number, incomingHours = 0) {
  const capacityHours = Math.max(0, weeklyCapacityHours);
  const projectedHours = Math.max(0, bookedHours) + Math.max(0, incomingHours);
  const utilisation = capacityHours > 0 ? projectedHours / capacityHours : projectedHours > 0 ? Number.POSITIVE_INFINITY : 0;
  const level: CapacityLevel = utilisation >= 1 ? "full" : utilisation >= 0.75 ? "near" : "plenty";

  return {
    level,
    label: level === "full" ? "Full" : level === "near" ? "Near capacity" : "Plenty of capacity",
    projectedHours,
    availableHours: Math.max(0, capacityHours - projectedHours),
    overbookedHours: Math.max(0, projectedHours - capacityHours),
    utilisation,
  };
}

function makeNativePerson(teamPerson: TeamPerson, details: NativePersonMetadata | undefined): Person {
  if (!details) throw new Error(`Missing People metadata for ${teamPerson.id}`);
  const type = teamPerson.personType === "Studio Staff" ? "Team" : "Freelancer";
  const activity = makeActivity(teamPerson.id, details.activityLabel, `${teamPerson.name} in Brisk`, details.activityAt);
  const isFreelancer = type === "Freelancer";

  return {
    id: teamPerson.id,
    name: teamPerson.name,
    avatarUrl: null,
    email: details.email,
    phone: details.phone,
    department: type === "Team" ? inferTeamDepartment(details.jobTitles) : null,
    type,
    jobTitles: details.jobTitles.length ? details.jobTitles : [teamRoleLabels[teamPerson.defaultRole]],
    skills: details.skills,
    styles: details.styles,
    seniority: details.seniority,
    location: details.location,
    timezone: details.timezone,
    accessRole: details.accessRole,
    studioPermission: initialStudioPermission(teamPerson.id, type),
    status: details.status,
    latestActivity: activity,
    activity: [
      activity,
      makeActivity(`${teamPerson.id}-project`, "Project assignment updated", "Project role and predicted hours changed", "2026-08-09T11:12:00+10:00"),
      makeActivity(`${teamPerson.id}-profile`, "Profile details updated", "Skills and availability reviewed", "2026-08-04T15:25:00+10:00"),
    ],
    workloads: workloadByPersonId[teamPerson.id] ?? [],
    weeklyCapacityHours: type === "Team" ? teamPerson.weeklyCapacityHours : null,
    availability: teamPerson.availabilityLabel,
    notes: details.notes,
    portfolioUrl: details.portfolioUrl,
    testingStatus: details.testingStatus,
    onboardingStatus: details.onboardingStatus,
    agreementStatus: details.agreementStatus,
    commercial: isFreelancer ? {
      rateType: details.dayRate ? "Day rate" : "Hourly",
      defaultRate: details.dayRate ?? teamPerson.hourlyRate ?? 0,
      currency: "AUD",
      invoices: [
        { id: `${teamPerson.id}-inv-aug`, label: "August project invoice", amount: (details.dayRate ?? teamPerson.hourlyRate ?? 0) * 2, status: "Pending" },
        { id: `${teamPerson.id}-inv-jul`, label: "July project invoice", amount: (details.dayRate ?? teamPerson.hourlyRate ?? 0) * 3, status: "Paid" },
      ],
    } : null,
    clientId: null,
    clientName: null,
    clientMembershipRole: null,
    projectAccessIds: [],
  };
}

function metadata(
  email: string,
  phone: string,
  jobTitles: string[],
  skills: string[],
  styles: string[],
  seniority: Person["seniority"],
  location: string,
  timezone: string,
  accessRole: PersonAccessRole,
  status: PersonStatus,
  activityLabel: string,
  activityAt: string,
  notes: string,
  dayRate?: number,
): NativePersonMetadata {
  return {
    email,
    phone,
    jobTitles,
    skills,
    styles,
    seniority,
    location,
    timezone,
    accessRole,
    status,
    activityLabel,
    activityAt,
    dayRate,
    notes,
    portfolioUrl: dayRate ? "https://portfolio.example/reel" : "",
    testingStatus: dayRate ? "Complete" : "Not required",
    onboardingStatus: "Complete",
    agreementStatus: dayRate ? "Signed" : "Not required",
  };
}

function standalonePerson(
  id: string,
  name: string,
  email: string,
  type: Exclude<PersonType, "Client contact">,
  jobTitles: string[],
  skills: string[],
  seniority: Person["seniority"],
  location: string,
  accessRole: PersonAccessRole,
  status: PersonStatus,
  weeklyCapacityHours: number | null,
  availability: PersonAvailability,
  activityLabel: string,
  activityAt: string,
  notes: string,
  dayRate?: number,
): Person {
  const latestActivity = makeActivity(id, activityLabel, `${name} in Brisk`, activityAt);
  return {
    id,
    name,
    avatarUrl: null,
    email,
    phone: "",
    department: type === "Team" ? inferTeamDepartment(jobTitles) : null,
    type,
    jobTitles,
    skills,
    styles: ["Brand film"],
    seniority,
    location,
    timezone: location.includes("Auckland") ? "Pacific/Auckland" : "Australia/Sydney",
    accessRole,
    studioPermission: initialStudioPermission(id, type),
    status,
    latestActivity,
    activity: [latestActivity],
    workloads: workloadByPersonId[id] ?? [],
    weeklyCapacityHours,
    availability,
    notes,
    portfolioUrl: dayRate ? "https://portfolio.example/reel" : "",
    testingStatus: dayRate ? "Complete" : "Not required",
    onboardingStatus: status === "Invited" ? "Not started" : "Complete",
    agreementStatus: dayRate ? "Signed" : "Not required",
    commercial: type === "Freelancer" ? { rateType: "Day rate", defaultRate: dayRate ?? 800, currency: "AUD", invoices: [] } : null,
    clientId: null,
    clientName: null,
    clientMembershipRole: null,
    projectAccessIds: [],
  };
}

function initialStudioPermission(id: string, type: Exclude<PersonType, "Client contact">): StudioPermission | null {
  if (type !== "Team") return null;
  return id === prototypeStudioPersonId || id === "tom-maclachlan" ? "Studio Owner" : "Team Member";
}

function inferTeamDepartment(jobTitles: string[]) {
  const roleCopy = jobTitles.join(" ").toLocaleLowerCase("en-AU");
  if (roleCopy.includes("edit") || roleCopy.includes("motion") || roleCopy.includes("sound") || roleCopy.includes("colour")) return "Post-production";
  if (roleCopy.includes("director")) return "Studio leadership";
  return "Production";
}

function workload(id: string, projectId: string, stage: StageKey, status: WorkloadStatus, predictedHours: number, projectRole: string, assignmentStatus: AssignmentStatus = "Assigned"): PersonWorkload {
  return { id, projectId, stage, status, predictedHours, projectRole, assignmentStatus };
}

function contactMetadata(jobTitles: string[], skills: string[], seniority: Person["seniority"], location: string, phone: string, notes: string): ClientContactMetadata {
  return { jobTitles, skills, styles: [], seniority, location, timezone: location.includes("Sydney") || location.includes("Melbourne") ? "Australia/Sydney" : "UTC", phone, notes };
}

function makeActivity(id: string, label: string, detail: string, occurredAt: string): PersonActivity {
  return { id: `${id}-activity-${occurredAt}`, label, detail, occurredAt };
}

function sumHours(workloads: PersonWorkload[]) {
  return workloads.reduce((total, item) => total + item.predictedHours, 0);
}
