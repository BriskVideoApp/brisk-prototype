import type { BriefVideoTypeId } from "@/data/brief";

type StudioWebsiteProfile = {
  hostname: string;
  name: string;
  description: string;
  videoTypeIds: BriefVideoTypeId[];
  logoUrl: string | null;
};

// Mock suggestions only. No website is fetched by the prototype.
export const studioWebsiteProfiles: readonly StudioWebsiteProfile[] = [
  {
    hostname: "chopchop.film",
    name: "ChopChop",
    description: "We create films for ambitious teams and purpose-driven organisations. Our work includes brand films, customer stories and social videos.",
    videoTypeIds: ["Brand Film", "Case Study / Testimonial", "Short-Form / Reels"],
    logoUrl: null,
  },
  {
    hostname: "northstarfilms.com.au",
    name: "North Star Films",
    description: "We create documentaries, case studies and brand films for purpose-driven organisations.",
    videoTypeIds: ["Brand Film", "Case Study / Testimonial", "Documentary"],
    logoUrl: null,
  },
  {
    hostname: "orbitanimation.com",
    name: "Orbit Animation",
    description: "We turn complex products and ideas into clear, characterful animation and explainers.",
    videoTypeIds: ["Animation", "Explainer", "Product / Demo"],
    logoUrl: null,
  },
];

export function normaliseStudioWebsite(value: string): string | null {
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:/iu.test(value.trim()) ? value.trim() : `https://${value.trim()}`);
    if (!["http:", "https:"].includes(url.protocol) || !url.hostname.includes(".") || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function getStudioWebsiteProfile(website: string): StudioWebsiteProfile | undefined {
  const normalised = normaliseStudioWebsite(website);
  if (!normalised) return undefined;
  const hostname = new URL(normalised).hostname.replace(/^www\./iu, "");
  return studioWebsiteProfiles.find((profile) => profile.hostname === hostname);
}
