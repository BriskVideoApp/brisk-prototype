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

export type StudioOnboardingScenarioId = "full-service" | "animation" | "post-production";

export type StudioOnboardingScenario = {
  id: StudioOnboardingScenarioId;
  acknowledgement: string;
  question: string;
  suggestedAnswers: readonly string[];
  generatedSetup: StudioGeneratedSetupRecommendation;
};

export type StudioBrandAccentId = "purple" | "cyan" | "pink";

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
  logoPreviewUrl: string | null;
  logoOptions: string[];
  brandAccentId: StudioBrandAccentId;
  studioType: string;
  studioDescription: string;
  videoTypeIds: BriefVideoTypeId[];
  briefConfiguration: StudioBriefConfiguration;
};

export type StudioReviewView = "studio-setup" | "client-preview";

export type StudioReviewDraft = GeneratedStudioSetup & {
  view: StudioReviewView;
};

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
      defaultStudioName: "Northstar Films",
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
    logoPreviewUrl: null,
    logoOptions: [],
    brandAccentId: scenario.generatedSetup.brandAccentId,
    studioType: scenario.generatedSetup.studioType,
    studioDescription: scenario.generatedSetup.studioDescription,
    videoTypeIds: scenario.generatedSetup.videoTypeNames.filter((videoTypeId) => canonicalVideoTypes.has(videoTypeId)),
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
