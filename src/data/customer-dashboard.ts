import type { StageKey, StageStatus } from "@/components/active-videos/types";
import type { DsIconName } from "@/components/video-review/DsIcon";

export type CustomerDashboardStatus = "Queued" | "In Production" | "Completed" | "Paused" | "Archived";

export type CustomerDashboardProject = {
  id: string;
  code: string;
  name: string;
  status: CustomerDashboardStatus;
  statusDetail: "Waiting on you" | "Waiting on studio" | "Approved" | "Ready to start" | "Paused" | "Archived";
  createdAt: string;
  latestAction: {
    label: string;
    timestamp: string;
  };
  stages: Record<StageKey, StageStatus>;
  seriesId?: string;
  thumbnailUrl?: string;
  unreadMessages: number;
};

export type CustomerDashboardSeries = {
  id: string;
  name: string;
  childProjectIds: string[];
};

export type CustomerDashboardActivity = {
  id: string;
  actor: string;
  action: string;
  object: string;
  projectId: string;
  projectLabel: string;
  timestamp: string;
  icon: DsIconName;
  href: string;
};

const thumbnailOne = "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=80";
const thumbnailTwo = "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=900&q=80";
const thumbnailThree = "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=80";
const thumbnailFour = "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80";
export const customerDashboardFallbackThumbnailUrl = thumbnailThree;

export const customerDashboardSeries: CustomerDashboardSeries[] = [
  { id: "wacf-cc", name: "WACF CC", childProjectIds: ["loom-wacf-01", "loom-wacf-02", "loom-wacf-03"] },
  {
    id: "customer-stories",
    name: "Customer Stories",
    childProjectIds: ["loom-customer-stories", "loom-customer-story-finance", "loom-customer-story-retail"],
  },
];

export const customerDashboardProjects: CustomerDashboardProject[] = [
  {
    id: "loom-launch-film",
    code: "LOOM-24",
    name: "Launch Film - Sales Narrative",
    status: "In Production",
    statusDetail: "Waiting on you",
    createdAt: "2026-05-18T10:15:00+10:00",
    latestAction: { label: "Shoot interviews shared by Maddie", timestamp: "2026-07-26T09:12:00+10:00" },
    stages: makeStageProgress("media", "waiting"),
    thumbnailUrl: thumbnailOne,
    unreadMessages: 3,
  },
  {
    id: "loom-wacf-01",
    code: "LOOM-31",
    name: "WACF Customer Cutdown 01",
    status: "In Production",
    statusDetail: "Waiting on studio",
    createdAt: "2026-06-02T14:30:00+10:00",
    latestAction: { label: "Rough cut uploaded", timestamp: "2026-07-25T16:40:00+10:00" },
    stages: makeStageProgress("edit", "in_progress"),
    seriesId: "wacf-cc",
    thumbnailUrl: thumbnailTwo,
    unreadMessages: 1,
  },
  {
    id: "loom-product-tour",
    code: "LOOM-34",
    name: "Product Tour - Team Workflows",
    status: "In Production",
    statusDetail: "Approved",
    createdAt: "2026-06-08T11:00:00+10:00",
    latestAction: { label: "Script approved by Emma", timestamp: "2026-07-24T12:18:00+10:00" },
    stages: makeStageProgress("shoot", "in_progress"),
    thumbnailUrl: thumbnailThree,
    unreadMessages: 0,
  },
  {
    id: "loom-customer-stories",
    code: "LOOM-27",
    name: "Customer Story - Healthcare",
    status: "In Production",
    statusDetail: "Waiting on you",
    createdAt: "2026-05-27T15:20:00+10:00",
    latestAction: { label: "Edit V2 ready for review", timestamp: "2026-07-23T10:05:00+10:00" },
    stages: makeStageProgress("edit", "waiting"),
    seriesId: "customer-stories",
    thumbnailUrl: thumbnailFour,
    unreadMessages: 4,
  },
  {
    id: "loom-q3-recap",
    code: "LOOM-36",
    name: "Q3 Product Recap",
    status: "In Production",
    statusDetail: "Waiting on studio",
    createdAt: "2026-06-19T09:45:00+10:00",
    latestAction: { label: "Media organised for edit", timestamp: "2026-07-22T17:32:00+10:00" },
    stages: makeStageProgress("edit", "in_progress"),
    unreadMessages: 2,
  },
  {
    id: "loom-wacf-02",
    code: "LOOM-32",
    name: "WACF Customer Cutdown 02",
    status: "Queued",
    statusDetail: "Ready to start",
    createdAt: "2026-06-03T09:12:00+10:00",
    latestAction: { label: "Brief updated by Emma", timestamp: "2026-07-21T14:04:00+10:00" },
    stages: makeStageProgress("brief", "waiting"),
    seriesId: "wacf-cc",
    unreadMessages: 0,
  },
  {
    id: "loom-customer-story-finance",
    code: "LOOM-28",
    name: "Customer Story - Financial Services",
    status: "Queued",
    statusDetail: "Ready to start",
    createdAt: "2026-06-11T16:24:00+10:00",
    latestAction: { label: "Interview talent confirmed", timestamp: "2026-07-20T11:25:00+10:00" },
    stages: makeStageProgress("script", "waiting"),
    seriesId: "customer-stories",
    unreadMessages: 2,
  },
  {
    id: "loom-employer-brand",
    code: "LOOM-38",
    name: "Employer Brand - Engineering",
    status: "Queued",
    statusDetail: "Ready to start",
    createdAt: "2026-07-02T08:35:00+10:00",
    latestAction: { label: "Brief submitted by Sarah", timestamp: "2026-07-19T15:48:00+10:00" },
    stages: makeStageProgress("brief", "waiting"),
    unreadMessages: 1,
  },
  {
    id: "loom-onboarding-film",
    code: "LOOM-40",
    name: "New Starter Onboarding Film",
    status: "Queued",
    statusDetail: "Ready to start",
    createdAt: "2026-07-08T10:10:00+10:00",
    latestAction: { label: "Reference links added", timestamp: "2026-07-18T09:44:00+10:00" },
    stages: makeStageProgress("brief", "in_progress"),
    unreadMessages: 0,
  },
  {
    id: "loom-wacf-03",
    code: "LOOM-33",
    name: "WACF Customer Cutdown 03",
    status: "Completed",
    statusDetail: "Approved",
    createdAt: "2026-05-12T13:30:00+10:00",
    latestAction: { label: "Masters downloaded by Emma", timestamp: "2026-07-17T12:03:00+10:00" },
    stages: makeCompletedStages(),
    seriesId: "wacf-cc",
    unreadMessages: 0,
  },
  {
    id: "loom-customer-story-retail",
    code: "LOOM-29",
    name: "Customer Story - Retail",
    status: "Completed",
    statusDetail: "Approved",
    createdAt: "2026-04-29T14:52:00+10:00",
    latestAction: { label: "Final masters approved", timestamp: "2026-07-15T16:20:00+10:00" },
    stages: makeCompletedStages(),
    seriesId: "customer-stories",
    unreadMessages: 0,
  },
  {
    id: "loom-culture-film",
    code: "LOOM-19",
    name: "Culture Film - Sydney Team",
    status: "Completed",
    statusDetail: "Approved",
    createdAt: "2026-03-18T09:25:00+10:00",
    latestAction: { label: "Project completed", timestamp: "2026-07-12T10:15:00+10:00" },
    stages: makeCompletedStages(),
    unreadMessages: 0,
  },
  {
    id: "loom-leadership-profile",
    code: "LOOM-35",
    name: "Leadership Profile - APAC",
    status: "Paused",
    statusDetail: "Paused",
    createdAt: "2026-06-14T12:05:00+10:00",
    latestAction: { label: "Video paused by Emma", timestamp: "2026-07-10T13:28:00+10:00" },
    stages: makeStageProgress("script", "waiting"),
    unreadMessages: 1,
  },
  {
    id: "loom-launch-teaser",
    code: "LOOM-12",
    name: "Launch Teaser - Q1",
    status: "Archived",
    statusDetail: "Archived",
    createdAt: "2026-01-12T09:05:00+10:00",
    latestAction: { label: "Project archived", timestamp: "2026-06-28T17:10:00+10:00" },
    stages: makeCompletedStages(),
    unreadMessages: 0,
  },
  {
    id: "loom-ai-workflows",
    code: "LOOM-42",
    name: "AI Workflows - Product Education",
    status: "Queued",
    statusDetail: "Ready to start",
    createdAt: "2026-07-10T11:15:00+10:00",
    latestAction: { label: "Brief submitted by Avery", timestamp: "2026-07-16T14:22:00+10:00" },
    stages: makeStageProgress("brief", "waiting"),
    unreadMessages: 1,
  },
  {
    id: "loom-security-explainer",
    code: "LOOM-43",
    name: "Enterprise Security Explainer",
    status: "Queued",
    statusDetail: "Ready to start",
    createdAt: "2026-07-12T15:40:00+10:00",
    latestAction: { label: "References added by Sarah", timestamp: "2026-07-14T10:08:00+10:00" },
    stages: makeStageProgress("brief", "in_progress"),
    unreadMessages: 0,
  },
  {
    id: "loom-sales-kickoff",
    code: "LOOM-18",
    name: "Sales Kick-off Opener",
    status: "Completed",
    statusDetail: "Approved",
    createdAt: "2026-03-04T10:30:00+10:00",
    latestAction: { label: "Masters approved by Sarah", timestamp: "2026-07-08T09:32:00+10:00" },
    stages: makeCompletedStages(),
    unreadMessages: 0,
  },
  {
    id: "loom-customer-care",
    code: "LOOM-17",
    name: "Customer Care - Team Profile",
    status: "Completed",
    statusDetail: "Approved",
    createdAt: "2026-02-18T13:20:00+10:00",
    latestAction: { label: "Captions delivered", timestamp: "2026-07-04T16:18:00+10:00" },
    stages: makeCompletedStages(),
    unreadMessages: 0,
  },
  {
    id: "loom-partner-stories",
    code: "LOOM-16",
    name: "Partner Stories - Melbourne",
    status: "Completed",
    statusDetail: "Approved",
    createdAt: "2026-02-02T09:10:00+10:00",
    latestAction: { label: "Project completed", timestamp: "2026-06-24T11:44:00+10:00" },
    stages: makeCompletedStages(),
    unreadMessages: 0,
  },
  {
    id: "loom-feature-launch",
    code: "LOOM-15",
    name: "Feature Launch - Async Review",
    status: "Completed",
    statusDetail: "Approved",
    createdAt: "2026-01-22T15:12:00+10:00",
    latestAction: { label: "Social cutdowns delivered", timestamp: "2026-06-18T10:20:00+10:00" },
    stages: makeCompletedStages(),
    unreadMessages: 0,
  },
  {
    id: "loom-community-recap",
    code: "LOOM-14",
    name: "Community Recap - Creator Week",
    status: "Completed",
    statusDetail: "Approved",
    createdAt: "2026-01-08T11:50:00+10:00",
    latestAction: { label: "Masters downloaded by Avery", timestamp: "2026-06-11T14:30:00+10:00" },
    stages: makeCompletedStages(),
    unreadMessages: 0,
  },
  {
    id: "loom-founder-interview",
    code: "LOOM-37",
    name: "Founder Interview - Remote Work",
    status: "Paused",
    statusDetail: "Paused",
    createdAt: "2026-06-24T09:36:00+10:00",
    latestAction: { label: "Shoot dates placed on hold", timestamp: "2026-07-06T13:14:00+10:00" },
    stages: makeStageProgress("shoot", "waiting"),
    unreadMessages: 2,
  },
  {
    id: "loom-year-in-review",
    code: "LOOM-11",
    name: "Year in Review - 2025",
    status: "Archived",
    statusDetail: "Archived",
    createdAt: "2025-11-12T10:18:00+11:00",
    latestAction: { label: "Project archived", timestamp: "2026-06-02T09:46:00+10:00" },
    stages: makeCompletedStages(),
    unreadMessages: 0,
  },
  {
    id: "loom-product-summit",
    code: "LOOM-10",
    name: "Product Summit Highlights",
    status: "Archived",
    statusDetail: "Archived",
    createdAt: "2025-10-28T14:05:00+11:00",
    latestAction: { label: "Project archived", timestamp: "2026-05-20T16:24:00+10:00" },
    stages: makeCompletedStages(),
    unreadMessages: 0,
  },
];

export const customerDashboardActivity: CustomerDashboardActivity[] = [
  activity("activity-01", "Maddie", "shared", "the shoot interviews", "loom-launch-film", "LOOM-24", "2026-07-26T09:12:00+10:00", "upload-simple", "/projects/loom-launch-film/stages/media"),
  activity("activity-02", "Marcus", "uploaded", "rough cut V1", "loom-wacf-01", "LOOM-31", "2026-07-25T16:40:00+10:00", "stage-edit", "/review?project=loom-wacf-01"),
  activity("activity-03", "Emma", "approved", "the script", "loom-product-tour", "LOOM-34", "2026-07-24T12:18:00+10:00", "check-circle", "/projects/loom-product-tour/script"),
  activity("activity-04", "Marcus", "shared", "Edit V2 for review", "loom-customer-stories", "LOOM-27", "2026-07-23T10:05:00+10:00", "stage-edit", "/review?project=loom-customer-stories"),
  activity("activity-05", "Priya", "organised", "the edit media", "loom-q3-recap", "LOOM-36", "2026-07-22T17:32:00+10:00", "image-square", "/projects/loom-q3-recap/stages/media"),
  activity("activity-06", "Emma", "updated", "the brief", "loom-wacf-02", "LOOM-32", "2026-07-21T14:04:00+10:00", "clipboard-text", "/projects/loom-wacf-02/stages/brief"),
  activity("activity-07", "David", "confirmed", "interview talent", "loom-customer-story-finance", "LOOM-28", "2026-07-20T11:25:00+10:00", "video-camera-ds", "/projects/loom-customer-story-finance/stages/brief"),
  activity("activity-08", "Sarah", "submitted", "the project brief", "loom-employer-brand", "LOOM-38", "2026-07-19T15:48:00+10:00", "clipboard-text", "/projects/loom-employer-brand/stages/brief"),
  activity("activity-09", "Emma", "added", "reference links", "loom-onboarding-film", "LOOM-40", "2026-07-18T09:44:00+10:00", "link", "/projects/loom-onboarding-film/stages/brief"),
  activity("activity-10", "Emma", "downloaded", "the final masters", "loom-wacf-03", "LOOM-33", "2026-07-17T12:03:00+10:00", "film-strip", "/projects/loom-wacf-03/stages/masters"),
  activity("activity-11", "Tom", "approved", "the final masters", "loom-customer-story-retail", "LOOM-29", "2026-07-15T16:20:00+10:00", "check-circle", "/projects/loom-customer-story-retail/stages/masters"),
  activity("activity-12", "Brisk", "completed", "the culture film", "loom-culture-film", "LOOM-19", "2026-07-12T10:15:00+10:00", "check-circle", "/projects/loom-culture-film/stages/masters"),
];

function makeStageProgress(currentStage: StageKey, currentState: StageStatus["state"]): Record<StageKey, StageStatus> {
  const stageKeys: StageKey[] = ["brief", "script", "shoot", "media", "edit", "masters"];
  const currentIndex = stageKeys.indexOf(currentStage);

  return Object.fromEntries(
    stageKeys.map((stage, index) => {
      if (index < currentIndex) {
        return [stage, { state: "done", daysAgo: currentIndex - index + 1 } satisfies StageStatus];
      }

      if (index === currentIndex) {
        return [stage, { state: currentState, daysAgo: 1 } satisfies StageStatus];
      }

      return [stage, { state: "not_started" } satisfies StageStatus];
    }),
  ) as Record<StageKey, StageStatus>;
}

function makeCompletedStages(): Record<StageKey, StageStatus> {
  return {
    brief: { state: "done", daysAgo: 20 },
    script: { state: "done", daysAgo: 16 },
    shoot: { state: "done", daysAgo: 12 },
    media: { state: "done", daysAgo: 9 },
    edit: { state: "done", daysAgo: 4 },
    masters: { state: "done", daysAgo: 2 },
  };
}

function activity(
  id: string,
  actor: string,
  action: string,
  object: string,
  projectId: string,
  projectLabel: string,
  timestamp: string,
  icon: DsIconName,
  href: string,
): CustomerDashboardActivity {
  return { id, actor, action, object, projectId, projectLabel, timestamp, icon, href };
}
