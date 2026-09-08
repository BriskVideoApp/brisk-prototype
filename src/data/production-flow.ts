import type { DsIconName } from "@/components/video-review/DsIcon";
import {
  briefFilmingContentOptions,
  briefFootageOptions,
  briefVideoTypes,
} from "@/data/brief";

export type ProductionFlowStageKey =
  | "brief"
  | "script"
  | "shoot"
  | "storyboard"
  | "edit"
  | "masters";

export type ProductionFlowSelection = ProductionFlowStageKey | "media";
export type ProductionFlowStatus = "not-started" | "waiting-client" | "waiting-studio" | "approved";
export type ProductionFlowTemplateId = "default" | "scripted" | "interview" | "animation" | "mixed";
export type ProductionBriefOverride = "video-type" | "existing-footage" | "scripted" | "interview" | "animation" | "mixed" | "shoot-new-undecided";
export type ProductionFlowPostProductionTerm = "edit" | "animation";

export type ProductionFlowStageDefinition = {
  key: ProductionFlowStageKey;
  label: string;
  icon: DsIconName;
  summary: string;
};

export type ProductionFlowTemplate = {
  id: ProductionFlowTemplateId;
  label: string;
  projectName: string;
  summary: string;
  stages: ProductionFlowStageKey[];
  postProductionTerm: ProductionFlowPostProductionTerm;
  videoTypes: string[];
};

export type ProductionFlowPostProductionDefinition = {
  label: string;
  icon: DsIconName;
  summary: string;
  heading: string;
  description: string;
  actionLabel: string;
};

export const productionFlowStages: Record<ProductionFlowStageKey, ProductionFlowStageDefinition> = {
  brief: {
    key: "brief",
    label: "Brief",
    icon: "clipboard-text",
    summary: "The source of truth for the video, audience, message and production needs.",
  },
  script: {
    key: "script",
    label: "Script",
    icon: "pen-nib",
    summary: "The written narrative or interview-led edit assembled from transcripts.",
  },
  shoot: {
    key: "shoot",
    label: "Shoot",
    icon: "video-camera-ds",
    summary: "Pre-production planning, the Call Sheet and the live On Set workflow.",
  },
  storyboard: {
    key: "storyboard",
    label: "Storyboard",
    icon: "grid-four",
    summary: "A separate handover and approval stage created from an approved Script.",
  },
  edit: {
    key: "edit",
    label: "Edit",
    icon: "scissors",
    summary: "Video construction, versions, feedback and approvals.",
  },
  masters: {
    key: "masters",
    label: "Masters",
    icon: "film-strip",
    summary: "Final exports, delivery files and handover.",
  },
};

export const productionFlowPostProductionDefinitions: Record<ProductionFlowPostProductionTerm, ProductionFlowPostProductionDefinition> = {
  edit: {
    label: "Edit",
    icon: "scissors",
    summary: "Video construction, versions, feedback and approvals.",
    heading: "Edit is ready when production inputs are complete",
    description: "Cuts, versions, comments and approvals continue through the existing Video Review workflow.",
    actionLabel: "Open Video Review",
  },
  animation: {
    label: "Animation",
    icon: "paint-brush",
    summary: "Motion production, versions, feedback and approvals.",
    heading: "Animation starts after Storyboard approval",
    description: "Motion production, review versions, comments and approvals continue through the existing Video Review workflow.",
    actionLabel: "Open Animation Review",
  },
};

export function getProductionFlowStageDefinition(
  stage: ProductionFlowStageKey,
  postProductionTerm: ProductionFlowPostProductionTerm,
): ProductionFlowStageDefinition {
  if (stage !== "edit") return productionFlowStages[stage];

  const presentation = productionFlowPostProductionDefinitions[postProductionTerm];
  return {
    key: "edit",
    label: presentation.label,
    icon: presentation.icon,
    summary: presentation.summary,
  };
}

export const productionFlowTemplates: Record<ProductionFlowTemplateId, ProductionFlowTemplate> = {
  default: {
    id: "default",
    label: "Default and edit only",
    projectName: "Quarterly product update",
    summary: "Existing footage is ready and no new filming or animation stage is required.",
    stages: ["brief", "script", "edit", "masters"],
    postProductionTerm: "edit",
    videoTypes: [],
  },
  scripted: {
    id: "scripted",
    label: "Scripted shoot",
    projectName: "Product launch film",
    summary: "A written Script leads into the Shoot, including its Creative Plan, Plan the Day and On Set work.",
    stages: ["brief", "script", "shoot", "edit", "masters"],
    postProductionTerm: "edit",
    videoTypes: ["Brand Film", "Commercial / TVC", "Fashion / Lookbook", "Live Action", "Music Video", "Real Estate", "Short-Form / Reels", "Training / How To"],
  },
  interview: {
    id: "interview",
    label: "Interview-led shoot",
    projectName: "Customer story - APAC growth",
    summary: "The Shoot contains Interview Questions and the Shot List. Script is built from transcripts afterwards.",
    stages: ["brief", "shoot", "script", "edit", "masters"],
    postProductionTerm: "edit",
    videoTypes: ["Case Study / Testimonial", "Documentary", "Event", "Internal Comms", "Podcast", "Wedding / Events"],
  },
  animation: {
    id: "animation",
    label: "Animation",
    projectName: "Platform explainer animation",
    summary: "An approved Script creates the Storyboard before motion production begins.",
    stages: ["brief", "script", "storyboard", "edit", "masters"],
    postProductionTerm: "animation",
    videoTypes: ["Animation", "AI Video", "Explainer", "Product / Demo"],
  },
  mixed: {
    id: "mixed",
    label: "Mixed production",
    projectName: "Brand campaign - people and product",
    summary: "A scripted production can return to Script after interview transcripts are available.",
    stages: ["brief", "script", "shoot", "edit", "masters"],
    postProductionTerm: "edit",
    videoTypes: [],
  },
};

export const productionVideoTypeOptions = briefVideoTypes.map((label) => ({ label, value: label }));

const existingFootageLabel = briefFootageOptions.find((option) => option.value === "Use existing")?.label ?? "Use existing footage";
const shootNewFootageLabel = briefFootageOptions.find((option) => option.value === "Shoot new")?.label ?? "Shoot new footage";
const interviewsLabel = briefFilmingContentOptions.find((option) => option.value === "Interviews")?.label ?? "Interviews";
const scriptedScenesLabel = briefFilmingContentOptions.find((option) => option.value === "Scripted scenes")?.label ?? "Scripted scenes";
const notSureYetLabel = briefFilmingContentOptions.find((option) => option.value === "Not sure yet")?.label ?? "Not sure yet";

export const productionBriefOverrideOptions: Array<{ value: ProductionBriefOverride; label: string }> = [
  { value: "video-type", label: "Use the video type recommendation" },
  { value: "existing-footage", label: existingFootageLabel },
  { value: "interview", label: `${shootNewFootageLabel} - ${interviewsLabel}` },
  { value: "scripted", label: `${shootNewFootageLabel} - ${scriptedScenesLabel}` },
  { value: "mixed", label: `${shootNewFootageLabel} - ${interviewsLabel} + ${scriptedScenesLabel}` },
  { value: "shoot-new-undecided", label: `${shootNewFootageLabel} - ${notSureYetLabel}` },
  { value: "animation", label: "Animation production" },
];

export const allProductionFlowStageKeys = Object.keys(productionFlowStages) as ProductionFlowStageKey[];

export function getRecommendedProductionFlow(videoType: string, briefOverride: ProductionBriefOverride) {
  if (briefOverride !== "video-type" && briefOverride !== "shoot-new-undecided") {
    const explicitMapping: Record<Exclude<ProductionBriefOverride, "video-type" | "shoot-new-undecided">, ProductionFlowTemplateId> = {
      "existing-footage": "default",
      scripted: "scripted",
      interview: "interview",
      animation: "animation",
      mixed: "mixed",
    };

    return productionFlowTemplates[explicitMapping[briefOverride]];
  }

  return Object.values(productionFlowTemplates).find((template) => template.videoTypes.includes(videoType))
    ?? productionFlowTemplates.default;
}

export function createProductionFlowStatuses(templateId: ProductionFlowTemplateId) {
  const statuses = Object.fromEntries(
    allProductionFlowStageKeys.map((stage) => [stage, "not-started"]),
  ) as Record<ProductionFlowStageKey, ProductionFlowStatus>;

  if (templateId === "default") {
    statuses.brief = "approved";
    statuses.script = "waiting-studio";
  } else if (templateId === "scripted" || templateId === "mixed") {
    statuses.brief = "approved";
    statuses.script = "approved";
    statuses.shoot = "waiting-studio";
  } else if (templateId === "interview") {
    statuses.brief = "approved";
    statuses.shoot = "approved";
    statuses.script = "waiting-studio";
  } else {
    statuses.brief = "approved";
    statuses.script = "approved";
    statuses.storyboard = "waiting-studio";
  }

  return statuses;
}

export function getProductionFlowStatusLabel(status: ProductionFlowStatus) {
  if (status === "waiting-client") return "Waiting on Client";
  if (status === "waiting-studio") return "Waiting on Studio";
  if (status === "approved") return "Approved";
  return "Not started";
}
