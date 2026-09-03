import {
  briefVideoTypeDetails,
  type BriefFieldId,
  type BriefVideoTypeId,
} from "@/data/brief";

export type StudioOnboardingSource = {
  id: string;
  type: "website" | "file";
  label: string;
};

export type StudioOnboardingAnswer = {
  studioDescription: string;
  sources: StudioOnboardingSource[];
};

export type StudioFollowUpStepId =
  | "contextual"
  | "production-model"
  | "video-types";

export type StudioCustomVideoTypeIconId =
  | "bezier-curve"
  | "circles-three"
  | "file-video"
  | "fire-simple"
  | "folder"
  | "globe"
  | "image-square"
  | "pen-nib"
  | "smiley"
  | "users-three";

export type StudioCustomVideoType = {
  name: string;
  iconId: StudioCustomVideoTypeIconId;
};

export const defaultStudioCustomVideoTypeIconId: StudioCustomVideoTypeIconId = "circles-three";

export const studioOnboardingVideoTypeLabels: Record<BriefVideoTypeId, string> = {
  "AI Video": "AI video",
  Animation: "Animations",
  "Brand Film": "Brand films",
  "Case Study / Testimonial": "Case studies",
  "Commercial / TVC": "TV Ads",
  Documentary: "Documentaries",
  Event: "Event videos",
  Explainer: "Explainers",
  "Fashion / Lookbook": "Fashion films",
  "Internal Comms": "Internal communications",
  "Live Action": "Live action",
  "Music Video": "Music videos",
  Podcast: "Podcasts",
  "Product / Demo": "Product demos",
  "Real Estate": "Property videos",
  "Short-Form / Reels": "Social videos",
  "Training / How To": "Training videos",
  "Wedding / Events": "Wedding films",
};

export function getStudioCustomVideoTypes(source: {
  customVideoTypes?: readonly StudioCustomVideoType[];
  customVideoType?: string | null;
  customVideoTypeIcon?: StudioCustomVideoTypeIconId | null;
}): StudioCustomVideoType[] {
  if (source.customVideoTypes?.length) {
    return source.customVideoTypes
      .filter((videoType) => videoType.name.trim().length > 0)
      .map((videoType) => ({ ...videoType, name: videoType.name.trim() }));
  }

  const legacyName = source.customVideoType?.trim();
  return legacyName ? [{
    name: legacyName,
    iconId: source.customVideoTypeIcon ?? defaultStudioCustomVideoTypeIconId,
  }] : [];
}

export type StudioFollowUpAnswers = {
  contextualAnswer: string;
  productionModel: "shoot-and-post" | "post-production-only" | null;
  productionScale: "larger-production" | "run-and-gun" | "varies" | null;
  videoTypeIds: BriefVideoTypeId[];
  customVideoTypes?: StudioCustomVideoType[];
  customVideoType: string | null;
  customVideoTypeIcon?: StudioCustomVideoTypeIconId | null;
};

export type StudioOnboardingScenarioId = "full-service" | "animation" | "post-production";

export type StudioOnboardingScenario = {
  id: StudioOnboardingScenarioId;
  acknowledgement: string;
  question: string;
  suggestedAnswers: readonly string[];
  generatedSetup: StudioGeneratedSetupRecommendation;
};

export type StudioBrandAccentId = "purple" | "cyan" | "pink";

export type StudioBrandColour = {
  hex: string;
  role: "primary" | "supporting";
};

const studioBrandPaletteHex = {
  purple: "#8B2CFF",
  cyan: "#6DE5FA",
  pink: "#FD9AC8",
  yellow: "#FDCE5D",
} as const;

export function createStudioBrandColours(accentId: StudioBrandAccentId): StudioBrandColour[] {
  const primaryHex = studioBrandPaletteHex[accentId];
  const supportingHexes = accentId === "purple"
    ? [studioBrandPaletteHex.cyan, studioBrandPaletteHex.yellow]
    : accentId === "cyan"
      ? [studioBrandPaletteHex.purple, studioBrandPaletteHex.yellow]
      : [studioBrandPaletteHex.purple, studioBrandPaletteHex.cyan];

  return [
    { hex: primaryHex, role: "primary" },
    ...supportingHexes.map((hex): StudioBrandColour => ({ hex, role: "supporting" })),
  ];
}

export function getStudioBrandColours(source: {
  brandAccentId?: StudioBrandAccentId;
  brandColours?: readonly StudioBrandColour[];
}): StudioBrandColour[] {
  if (source.brandColours === undefined) {
    return createStudioBrandColours(source.brandAccentId ?? "purple");
  }

  const validColours = source.brandColours
    .filter((colour) => isValidStudioBrandHex(colour.hex))
    .map((colour) => ({ ...colour, hex: normaliseStudioBrandHex(colour.hex) }));

  if (validColours.length === 0) {
    return [{ hex: studioBrandPaletteHex.purple, role: "primary" }];
  }

  const primaryIndex = validColours.findIndex((colour) => colour.role === "primary");
  const resolvedPrimaryIndex = primaryIndex >= 0 ? primaryIndex : 0;

  return validColours.map((colour, index) => ({
    ...colour,
    role: index === resolvedPrimaryIndex ? "primary" : "supporting",
  }));
}

export function isValidStudioBrandHex(hex: string) {
  return /^#[0-9A-F]{6}$/iu.test(hex.trim());
}

export function normaliseStudioBrandHex(hex: string) {
  return hex.trim().toLocaleUpperCase("en-AU");
}

export function getStudioBrandTheme(source: {
  brandAccentId?: StudioBrandAccentId;
  brandColours?: readonly StudioBrandColour[];
}) {
  const colours = getStudioBrandColours(source);
  const primary = colours.find((colour) => colour.role === "primary") ?? colours[0];
  const ink = mixStudioBrandHex(primary.hex, "#000000", 0.32);

  return {
    primary: primary.hex,
    primaryContrast: getStudioBrandContrastText(primary.hex),
    soft: mixStudioBrandHex(primary.hex, "#FFFFFF", 0.84),
    ink,
    inkContrast: getStudioBrandContrastText(ink),
  };
}

export function getStudioBrandContrastText(hex: string): "#000000" | "#FFFFFF" {
  const luminance = getRelativeLuminance(hex);
  const blackContrast = (luminance + 0.05) / 0.05;
  const whiteContrast = 1.05 / (luminance + 0.05);
  return blackContrast >= whiteContrast ? "#000000" : "#FFFFFF";
}

function mixStudioBrandHex(hex: string, targetHex: "#000000" | "#FFFFFF", targetWeight: number) {
  const sourceChannels = parseStudioBrandHex(hex);
  const targetChannels = parseStudioBrandHex(targetHex);
  const mixedChannels = sourceChannels.map((channel, index) => Math.round(
    channel + ((targetChannels[index] - channel) * targetWeight),
  ));
  return `#${mixedChannels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`.toLocaleUpperCase("en-AU");
}

function getRelativeLuminance(hex: string) {
  const [red, green, blue] = parseStudioBrandHex(hex).map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
}

function parseStudioBrandHex(hex: string) {
  const normalisedHex = isValidStudioBrandHex(hex) ? normaliseStudioBrandHex(hex) : studioBrandPaletteHex.purple;
  return [
    Number.parseInt(normalisedHex.slice(1, 3), 16),
    Number.parseInt(normalisedHex.slice(3, 5), 16),
    Number.parseInt(normalisedHex.slice(5, 7), 16),
  ];
}

export const studioBrandAccentOptions = [
  { id: "purple", label: "Brisk Purple" },
  { id: "cyan", label: "Cyan" },
  { id: "pink", label: "Signal pink" },
] as const satisfies readonly { id: StudioBrandAccentId; label: string }[];

export type StudioGeneratedSetupRecommendation = {
  defaultStudioName: string;
  studioType: string;
  studioDescription: string;
  brandAccentId: StudioBrandAccentId;
  brandAccentLabel: string;
  videoTypeNames: readonly BriefVideoTypeId[];
};

export type StudioBriefConfiguration = {
  excludedFieldIds: BriefFieldId[];
  excludedOptionValues: Partial<Record<BriefFieldId, string[]>>;
};

export type GeneratedStudioSetup = {
  studioName: string;
  studioWebsite?: string;
  logoPreviewUrl: string | null;
  logoOptions: string[];
  brandAccentId: StudioBrandAccentId;
  brandColours?: StudioBrandColour[];
  studioType: string;
  studioDescription: string;
  videoTypeIds: BriefVideoTypeId[];
  customVideoTypes?: StudioCustomVideoType[];
  customVideoType?: string | null;
  briefConfiguration: StudioBriefConfiguration;
};

export type StudioReviewView = "studio-setup" | "client-preview";

export type StudioReviewDraft = GeneratedStudioSetup & {
  view: StudioReviewView;
};

export function restoreStudioFollowUpAnswersFromReview(
  answers: StudioFollowUpAnswers,
  draft: StudioReviewDraft,
): StudioFollowUpAnswers {
  return {
    ...answers,
    videoTypeIds: [...draft.videoTypeIds],
    customVideoTypes: getStudioCustomVideoTypes(draft),
    customVideoType: null,
    customVideoTypeIcon: null,
  };
}

export function createRecommendedStudioBriefConfiguration(): StudioBriefConfiguration {
  return {
    excludedFieldIds: [],
    excludedOptionValues: {},
  };
}

export function cloneStudioBriefConfiguration(configuration: StudioBriefConfiguration): StudioBriefConfiguration {
  return {
    excludedFieldIds: [...configuration.excludedFieldIds],
    excludedOptionValues: Object.fromEntries(
      Object.entries(configuration.excludedOptionValues).map(([fieldId, values]) => [fieldId, [...values]]),
    ),
  };
}

export const studioOnboardingScenarios = [
  {
    id: "full-service",
    acknowledgement: "You handle filming and post-production.",
    question: "Who develops concepts and scripts?",
    suggestedAnswers: [
      "We develop them with clients",
      "Clients create them",
      "It varies by project",
    ],
    generatedSetup: {
      defaultStudioName: "North Star Films",
      studioType: "Full-service production Studio",
      studioDescription: "We create documentaries, case studies and brand films for purpose-driven organisations.",
      brandAccentId: "purple",
      brandAccentLabel: "Brisk Purple",
      videoTypeNames: ["Brand Film", "Case Study / Testimonial", "Documentary", "Live Action"],
    },
  },
  {
    id: "animation",
    acknowledgement: "Animation and explainers are central to your Studio.",
    question: "Who usually develops the script?",
    suggestedAnswers: [
      "We develop the script with them",
      "Clients provide a finished script",
    ],
    generatedSetup: {
      defaultStudioName: "Orbit Animation",
      studioType: "Animation Studio",
      studioDescription: "We turn complex products and ideas into clear, characterful animation and explainers.",
      brandAccentId: "cyan",
      brandAccentLabel: "Cyan",
      videoTypeNames: ["Animation", "Explainer", "Product / Demo", "AI Video"],
    },
  },
  {
    id: "post-production",
    acknowledgement: "You edit and finish supplied footage.",
    question: "What usually arrives before the edit?",
    suggestedAnswers: [
      "Source footage and a brief",
      "Organised selects and a script",
      "A rough cut ready for finishing",
    ],
    generatedSetup: {
      defaultStudioName: "Cut & Current",
      studioType: "Post-production Studio",
      studioDescription: "We shape supplied footage into focused stories, then handle colour, sound and final delivery.",
      brandAccentId: "pink",
      brandAccentLabel: "Signal pink",
      videoTypeNames: ["Brand Film", "Case Study / Testimonial", "Commercial / TVC", "Event"],
    },
  },
] as const satisfies readonly StudioOnboardingScenario[];

const animationSignals = ["animation", "animated", "explainer", "motion graphics"] as const;
const postProductionSignals = [
  "editing supplied",
  "supplied footage",
  "post-production studio",
  "post production studio",
  "offline edit",
  "finishing",
  "colour grade",
  "colour grading",
] as const;

export function selectStudioOnboardingScenario(answer: StudioOnboardingAnswer): StudioOnboardingScenario {
  const answerText = [answer.studioDescription, ...answer.sources.map((source) => source.label)]
    .join(" ")
    .toLocaleLowerCase("en-AU");

  if (postProductionSignals.some((signal) => answerText.includes(signal))) {
    return getStudioOnboardingScenario("post-production");
  }

  if (animationSignals.some((signal) => answerText.includes(signal))) {
    return getStudioOnboardingScenario("animation");
  }

  return getStudioOnboardingScenario("full-service");
}

export function createStudioReviewDraft(
  answer: StudioOnboardingAnswer,
  scenario: StudioOnboardingScenario,
): StudioReviewDraft {
  const canonicalVideoTypes = new Set<BriefVideoTypeId>(briefVideoTypeDetails.map((videoType) => videoType.name));

  return {
    view: "studio-setup",
    studioName: inferStudioName(answer, scenario.generatedSetup.defaultStudioName),
    studioWebsite: answer.sources.find((source) => source.type === "website")?.label ?? "",
    logoPreviewUrl: null,
    logoOptions: [],
    brandAccentId: scenario.generatedSetup.brandAccentId,
    brandColours: createStudioBrandColours(scenario.generatedSetup.brandAccentId),
    studioType: scenario.generatedSetup.studioType,
    studioDescription: scenario.generatedSetup.studioDescription,
    videoTypeIds: scenario.generatedSetup.videoTypeNames.filter((videoTypeId) => canonicalVideoTypes.has(videoTypeId)),
    customVideoTypes: [],
    customVideoType: null,
    briefConfiguration: createRecommendedStudioBriefConfiguration(),
  };
}

function getStudioOnboardingScenario(id: StudioOnboardingScenarioId): StudioOnboardingScenario {
  return studioOnboardingScenarios.find((scenario) => scenario.id === id) ?? studioOnboardingScenarios[0];
}

function inferStudioName(answer: StudioOnboardingAnswer, fallbackName: string) {
  const websiteSource = answer.sources.find((source) => source.type === "website");

  if (!websiteSource) {
    return fallbackName;
  }

  try {
    const hostname = new URL(websiteSource.label).hostname.replace(/^www\./iu, "");
    const domainName = hostname.split(".")[0];

    if (domainName === "northstarfilms") {
      return "North Star Films";
    }

    if (!domainName || domainName.length <= 2) {
      return fallbackName;
    }

    if (domainName.length <= 4) {
      return domainName.toLocaleUpperCase("en-AU");
    }

    return domainName
      .split(/[-_]/u)
      .filter(Boolean)
      .map((word) => `${word.charAt(0).toLocaleUpperCase("en-AU")}${word.slice(1)}`)
      .join(" ");
  } catch {
    return fallbackName;
  }
}
