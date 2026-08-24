export type BrandLogo = {
  id: string;
  label: string;
  variant: "light" | "dark" | "mono";
  format: "svg" | "png";
  url: string;
  layout: "horizontal" | "stacked" | "mark";
};

export type BrandColour = {
  name?: string;
  hex: string;
  role: "primary" | "secondary" | "accent";
};

export type BrandFont = {
  role: string;
  family: string;
  source: "google" | "adobe" | "custom";
};

export type BrandImagery = {
  id: string;
  label: string;
  url: string;
  kind: "photo" | "broll" | "illustration" | "audio";
  format?: string;
  duration?: string;
};

export const mockAudioAsset: BrandImagery = {
  id: "mock-brand-audio",
  label: "Brand sonic logo.mp3",
  url: "data:audio/mpeg;base64,",
  kind: "audio",
  format: "MP3",
  duration: "02:14",
};

export type BrandGuidelineFile = {
  id: string;
  name: string;
  size: string;
  url: string;
};

export type BrandProfile = {
  logos: BrandLogo[];
  colours: BrandColour[];
  fonts: BrandFont[];
  imagery: BrandImagery[];
  voice: { summary: string; tags: string[] };
  guidelines: { files?: BrandGuidelineFile[]; pdfUrl?: string; aiSummary?: string };
};

export type AiBrandProfile = {
  summary: string;
  audience: string;
  keyMessages: string;
  visualStyle: string;
  recurringThemes: string;
  productionPreferences: string;
  previousWins: string;
  lastUpdated: string;
  sources: string[];
  learning: boolean;
};

export type EditorFile = {
  id: string;
  name: string;
  size: string;
  kind: "mogrt" | "aep" | "folder" | "font";
};

export type EditorFileVersion = {
  id: "v1" | "v2" | "v3";
  label: string;
  files: EditorFile[];
};

export type BrandRelationship = "master" | "sub-brand";

export type SubBrand = {
  slug: string;
  name: string;
  logoUrl: string | null;
  lastUpdated: string;
  relationship: BrandRelationship;
  profile: BrandProfile;
};

export type BrandKitCustomer = {
  slug: string;
  name: string;
  badge: string;
  website: string;
  logoUrl: string | null;
  lastUpdated: string;
  profile: BrandProfile | null;
  aiBrandProfile: AiBrandProfile;
  clientCanEdit: boolean;
  shareToken: string;
  showPoweredBy: boolean;
  motionPreview: {
    posterUrl: string;
    videoUrl: string;
  };
  editorFileVersions: EditorFileVersion[];
  subBrands: SubBrand[];
};

const teamImage = "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1200&q=82";
const productImage = "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=82";
const studioImage = "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=82";
const portraitImage = "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=82";
const motionVideo = "https://videos.pexels.com/video-files/853800/853800-hd_1920_1080_30fps.mp4";

const logoUrls = {
  loom: "https://cdn.simpleicons.org/loom",
  deel: null,
  notion: "https://cdn.simpleicons.org/notion",
  hims: null,
  openai: null,
  posthog: "https://cdn.simpleicons.org/posthog",
  ramp: null,
  canva: null,
  linear: "https://cdn.simpleicons.org/linear",
  figma: "https://cdn.simpleicons.org/figma",
} as const;

function makeLogos(brand: keyof typeof logoUrls, name: string): BrandLogo[] {
  const logoUrl = logoUrls[brand];

  if (!logoUrl) return [];

  return [
    {
      id: `${brand}-horizontal-dark`,
      label: `${name} horizontal - dark`,
      variant: "dark",
      format: "svg",
      url: logoUrl,
      layout: "horizontal",
    },
    {
      id: `${brand}-horizontal-light`,
      label: `${name} horizontal - light`,
      variant: "light",
      format: "svg",
      url: logoUrl,
      layout: "horizontal",
    },
    {
      id: `${brand}-mark-mono`,
      label: `${name} mark - mono`,
      variant: "mono",
      format: "png",
      url: logoUrl,
      layout: "mark",
    },
  ];
}

function makeImagery(prefix: string): BrandImagery[] {
  return [
    { id: `${prefix}-team`, label: "People collaborating", url: teamImage, kind: "photo" },
    { id: `${prefix}-product`, label: "Product in context", url: productImage, kind: "photo" },
    { id: `${prefix}-studio`, label: "Signature office b-roll", url: studioImage, kind: "broll" },
    { id: `${prefix}-portrait`, label: "Customer portrait", url: portraitImage, kind: "broll" },
    { ...mockAudioAsset, id: `${prefix}-brand-audio` },
  ];
}

function makeMockPdfDataUrl(title: string, summary: string) {
  const escapePdfText = (value: string) => value.replace(/([\\()])/gu, "\\$1");
  const stream = [
    "BT",
    "/F1 22 Tf",
    `72 720 Td (${escapePdfText(title)}) Tj`,
    "/F1 11 Tf",
    `0 -36 Td (${escapePdfText(summary)}) Tj`,
    "ET",
  ].join("\n");
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    `5 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = objects.map((object) => {
    const offset = pdf.length;
    pdf += object;
    return offset;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return `data:application/pdf;charset=utf-8,${encodeURIComponent(pdf)}`;
}

export function makeGuidelineFiles(prefix: string, name: string): BrandGuidelineFile[] {
  return [
    {
      id: `${prefix}-brand-guidelines`,
      name: `${name}-brand-guidelines.pdf`,
      size: "2.4 MB",
      url: makeMockPdfDataUrl(`${name} Brand Guidelines`, "Logo, colour, typography and layout guidance."),
    },
    {
      id: `${prefix}-content-guidelines`,
      name: `${name}-content-guidelines.pdf`,
      size: "806 KB",
      url: makeMockPdfDataUrl(`${name} Content Guidelines`, "Voice, imagery and content principles."),
    },
  ];
}

export const mockBrandProfilesBySlug: Record<string, BrandProfile> = {
  loom: {
    logos: makeLogos("loom", "Loom"),
    colours: [
      { name: "Loom purple", hex: "#625DF5", role: "primary" },
      { name: "Cloud", hex: "#F4F3FF", role: "secondary" },
      { name: "Signal pink", hex: "#FF6BCE", role: "accent" },
      { name: "Ink", hex: "#1B1B1F", role: "secondary" },
    ],
    fonts: [
      { role: "heading", family: "Inter", source: "google" },
      { role: "body", family: "Inter", source: "google" },
      { role: "mono", family: "IBM Plex Mono", source: "google" },
    ],
    imagery: makeImagery("loom"),
    voice: {
      summary: "Loom sounds clear, human and useful. Lead with the outcome, keep sentences conversational, and make complex teamwork feel simple. Confidence comes from direct language rather than hype.",
      tags: ["Warm", "Direct", "Useful", "Optimistic"],
    },
    guidelines: {
      files: makeGuidelineFiles("loom", "Loom"),
      aiSummary: "Use generous space, high-contrast product imagery and purple as a focused accent. Keep the Loom mark clear of busy photography and favour natural, candid team moments.",
    },
  },
  deel: {
    logos: makeLogos("deel", "Deel"),
    colours: [
      { name: "Deel navy", hex: "#1B1B3A", role: "primary" },
      { name: "Warm sand", hex: "#F7EBDD", role: "secondary" },
      { name: "Global orange", hex: "#FF6B35", role: "accent" },
      { name: "Mint", hex: "#9EEBCF", role: "accent" },
    ],
    fonts: [
      { role: "heading", family: "Roobert", source: "custom" },
      { role: "body", family: "Roobert", source: "custom" },
      { role: "mono", family: "Roboto Mono", source: "google" },
    ],
    imagery: makeImagery("deel"),
    voice: {
      summary: "Deel is assured, inclusive and practical. Write for a global audience in plain English, explain the next step quickly, and keep legal or operational details calm and approachable.",
      tags: ["Global", "Clear", "Assured", "Inclusive"],
    },
    guidelines: {
      aiSummary: "Pair expressive illustration with grounded workplace photography. Navy anchors the system, while warm orange and mint create energy around key messages.",
    },
  },
  notion: {
    logos: makeLogos("notion", "Notion"),
    colours: [
      { name: "Ink", hex: "#191919", role: "primary" },
      { name: "Paper", hex: "#FFFFFF", role: "secondary" },
      { name: "Stone", hex: "#F1F1EF", role: "secondary" },
      { name: "Callout blue", hex: "#2383E2", role: "accent" },
    ],
    fonts: [
      { role: "heading", family: "Inter", source: "google" },
      { role: "body", family: "Inter", source: "google" },
      { role: "mono", family: "SFMono-Regular", source: "custom" },
    ],
    imagery: makeImagery("notion"),
    voice: {
      summary: "Notion is thoughtful, capable and quietly playful. Explain possibilities with simple examples, avoid hard-sell language, and leave space for the customer to imagine their own way of working.",
      tags: ["Thoughtful", "Simple", "Playful", "Capable"],
    },
    guidelines: {
      aiSummary: "Use a monochrome foundation with hand-drawn illustration and restrained colour. Layouts should feel modular, editorial and calm rather than highly decorated.",
    },
  },
};

function makeEditorVersions(customer: string): EditorFileVersion[] {
  return [
    {
      id: "v3",
      label: "v3 Active",
      files: [
        { id: `${customer}-mogrt-v3`, name: `${customer}-titles-v3.mogrt`, size: "18.4 MB", kind: "mogrt" },
        { id: `${customer}-aep-v3`, name: `${customer}-motion-package-v3.aep`, size: "246 MB", kind: "aep" },
        { id: `${customer}-graphics-v3`, name: `${customer}-source-graphics`, size: "82.7 MB", kind: "folder" },
        { id: `${customer}-font-v3`, name: `${customer}-brand-fonts.zip`, size: "12.1 MB", kind: "font" },
      ],
    },
    {
      id: "v2",
      label: "v2",
      files: [
        { id: `${customer}-mogrt-v2`, name: `${customer}-titles-v2.mogrt`, size: "16.9 MB", kind: "mogrt" },
        { id: `${customer}-aep-v2`, name: `${customer}-motion-package-v2.aep`, size: "221 MB", kind: "aep" },
        { id: `${customer}-font-v2`, name: `${customer}-brand-fonts.zip`, size: "11.8 MB", kind: "font" },
      ],
    },
    {
      id: "v1",
      label: "v1",
      files: [
        { id: `${customer}-mogrt-v1`, name: `${customer}-titles-v1.mogrt`, size: "14.2 MB", kind: "mogrt" },
        { id: `${customer}-aep-v1`, name: `${customer}-motion-package-v1.aep`, size: "198 MB", kind: "aep" },
      ],
    },
  ];
}

function makeSubBrand(
  parentSlug: string,
  slug: string,
  name: string,
  profile: BrandProfile,
): SubBrand {
  return {
    slug,
    name,
    logoUrl: logoUrls[parentSlug as keyof typeof logoUrls] ?? null,
    lastUpdated: "18 Jul 2026",
    relationship: "sub-brand",
    profile,
  };
}

const lightweightCustomers: Array<{
  slug: keyof typeof logoUrls;
  name: string;
  badge: string;
  website: string;
  updated: string;
}> = [
  { slug: "openai", name: "OpenAI", badge: "OPEN", website: "openai.com", updated: "16 Jul 2026" },
  { slug: "posthog", name: "PostHog", badge: "PHOG", website: "posthog.com", updated: "11 Jul 2026" },
  { slug: "ramp", name: "Ramp", badge: "RAMP", website: "ramp.com", updated: "4 Jul 2026" },
  { slug: "canva", name: "Canva", badge: "CNVA", website: "canva.com", updated: "28 Jun 2026" },
  { slug: "linear", name: "Linear", badge: "LINR", website: "linear.app", updated: "21 Jun 2026" },
  { slug: "figma", name: "Figma", badge: "FIGM", website: "figma.com", updated: "15 Jun 2026" },
];

const defaultProfile = mockBrandProfilesBySlug.loom;

function makeAiBrandProfile(
  name: string,
  profile: BrandProfile | null,
  overrides: Partial<AiBrandProfile> = {},
): AiBrandProfile {
  return {
    summary: `Brisk understands ${name} as a clear, confident brand that values useful stories over generic promotion.`,
    audience: "Decision-makers and teams who need practical, credible information before they act.",
    keyMessages: "Lead with the customer outcome, explain the product value clearly and support claims with evidence.",
    visualStyle: profile?.guidelines.aiSummary ?? "Clean layouts, natural people and product detail with restrained use of brand colour.",
    recurringThemes: "Clarity, progress, collaboration and confident decision-making.",
    productionPreferences: "Open quickly, keep interviews conversational and show the product in a realistic working context.",
    previousWins: "Concise customer stories with an early audience cue and a single, memorable product benefit.",
    lastUpdated: "24 Aug 2026, 9:18 am",
    sources: ["Brand Kit", "Approved Briefs", "Approved Scripts", "Client comments", "Project history"],
    learning: false,
    ...overrides,
  };
}

export const brandKitCustomers: BrandKitCustomer[] = [
  {
    slug: "loom",
    name: "Loom",
    badge: "LOOM",
    website: "loom.com",
    logoUrl: logoUrls.loom,
    lastUpdated: "25 Jul 2026",
    profile: mockBrandProfilesBySlug.loom,
    aiBrandProfile: makeAiBrandProfile("Loom", mockBrandProfilesBySlug.loom, {
      summary: "Brisk understands Loom as warm, direct and useful. The strongest work makes complex teamwork feel human, reaches the audience tension early and lets the product prove the outcome.",
      audience: "Revenue leaders, enablement teams and distributed teams who need to explain product updates clearly.",
      keyMessages: "Move quickly without losing clarity. Replace unnecessary meetings with short, human explanations people can revisit.",
      recurringThemes: "Clear communication, confident teams, async work and human connection.",
      productionPreferences: "Natural workplace performances, visible product UI, concise openings and restrained purple accents.",
      previousWins: "Customer-led stories that introduce the team pressure in the first five seconds and reveal Loom as the practical response.",
      sources: ["Brand Kit", "4 approved Briefs", "3 approved Scripts", "7 approved videos", "18 Client comments"],
    }),
    clientCanEdit: true,
    shareToken: "loom-2026",
    showPoweredBy: true,
    motionPreview: { posterUrl: teamImage, videoUrl: motionVideo },
    editorFileVersions: makeEditorVersions("loom"),
    subBrands: [
      makeSubBrand("loom", "loom-ai", "Loom AI", mockBrandProfilesBySlug.loom),
      makeSubBrand("loom", "loom-enterprise", "Loom Enterprise", mockBrandProfilesBySlug.loom),
      makeSubBrand("loom", "loom-education", "Loom for Education", mockBrandProfilesBySlug.loom),
      makeSubBrand("loom", "loom-events", "Loom Events", mockBrandProfilesBySlug.loom),
    ],
  },
  {
    slug: "deel",
    name: "Deel",
    badge: "DEEL",
    website: "deel.com",
    logoUrl: logoUrls.deel,
    lastUpdated: "22 Jul 2026",
    profile: mockBrandProfilesBySlug.deel,
    aiBrandProfile: makeAiBrandProfile("Deel", mockBrandProfilesBySlug.deel, {
      audience: "People, finance and operations leaders managing global teams.",
      recurringThemes: "Global access, confidence, compliance and simpler international operations.",
      sources: ["Brand Kit", "3 approved Briefs", "2 approved Scripts", "5 approved videos", "12 Client comments"],
    }),
    clientCanEdit: false,
    shareToken: "deel-2026",
    showPoweredBy: false,
    motionPreview: { posterUrl: productImage, videoUrl: motionVideo },
    editorFileVersions: makeEditorVersions("deel"),
    subBrands: [
      makeSubBrand("deel", "deel-hr", "Deel HR", mockBrandProfilesBySlug.deel),
      makeSubBrand("deel", "deel-it", "Deel IT", mockBrandProfilesBySlug.deel),
    ],
  },
  {
    slug: "notion",
    name: "Notion",
    badge: "NOTN",
    website: "notion.so",
    logoUrl: logoUrls.notion,
    lastUpdated: "19 Jul 2026",
    profile: mockBrandProfilesBySlug.notion,
    aiBrandProfile: makeAiBrandProfile("Notion", mockBrandProfilesBySlug.notion, {
      audience: "Teams and individuals shaping flexible systems for their own way of working.",
      recurringThemes: "Thoughtful tools, calm capability, modular workflows and quiet confidence.",
      sources: ["Brand Kit", "2 approved Briefs", "4 approved Scripts", "6 approved videos", "9 Client comments"],
    }),
    clientCanEdit: true,
    shareToken: "notion-2026",
    showPoweredBy: true,
    motionPreview: { posterUrl: studioImage, videoUrl: motionVideo },
    editorFileVersions: makeEditorVersions("notion"),
    subBrands: [],
  },
  {
    slug: "hims",
    name: "Hims",
    badge: "HIMS",
    website: "hims.com",
    logoUrl: logoUrls.hims,
    lastUpdated: "Not set up",
    profile: null,
    aiBrandProfile: makeAiBrandProfile("Hims", null, {
      summary: "Brisk has an early understanding of Hims from the Client record and current project activity.",
      audience: "People looking for straightforward, private and approachable health support.",
      keyMessages: "Make care feel accessible, clear and free from judgement.",
      visualStyle: "The AI Brand Profile is still learning the preferred visual system.",
      recurringThemes: "Confidence, privacy, wellbeing and practical next steps.",
      productionPreferences: "Keep claims grounded and make the path to action easy to understand.",
      previousWins: "Brisk AI will improve its understanding as more work is completed for this Client.",
      sources: ["Client record", "1 active project"],
      learning: true,
    }),
    clientCanEdit: true,
    shareToken: "hims-2026",
    showPoweredBy: true,
    motionPreview: { posterUrl: portraitImage, videoUrl: motionVideo },
    editorFileVersions: makeEditorVersions("hims"),
    subBrands: [],
  },
  ...lightweightCustomers.map<BrandKitCustomer>((customer) => {
    const profile: BrandProfile = {
      ...defaultProfile,
      logos: makeLogos(customer.slug, customer.name),
      imagery: makeImagery(customer.slug),
      voice: {
        summary: `${customer.name} communicates with clarity and confidence. Keep the message practical, specific and focused on the customer's outcome.`,
        tags: ["Clear", "Confident", "Useful"],
      },
      guidelines: {
        aiSummary: `${customer.name} favours a clean, confident visual system with natural people, clear product detail and restrained use of brand colour.`,
      },
    };

    return {
      slug: customer.slug,
      name: customer.name,
      badge: customer.badge,
      website: customer.website,
      logoUrl: logoUrls[customer.slug],
      lastUpdated: customer.updated,
      profile,
      aiBrandProfile: makeAiBrandProfile(customer.name, profile, {
        summary: `Brisk understands ${customer.name} from its Brand Kit, approved work and Client feedback. The current profile favours clear, confident and useful communication.`,
        sources: ["Brand Kit", "Approved Briefs", "Approved Scripts", "Approved videos", "Client comments"],
      }),
      clientCanEdit: false,
      shareToken: `${customer.slug}-2026`,
      showPoweredBy: true,
      motionPreview: { posterUrl: productImage, videoUrl: motionVideo },
      editorFileVersions: makeEditorVersions(customer.slug),
      subBrands: [],
    };
  }),
];

export function getBrandKitCustomer(slug: string) {
  return brandKitCustomers.find((customer) => customer.slug === slug);
}

export function getBrandKitCustomerByBadge(badge: string) {
  return brandKitCustomers.find((customer) => customer.badge === badge);
}

export function getBrandKitCustomerByShareToken(token: string) {
  return brandKitCustomers.find((customer) => customer.shareToken === token);
}

export function makeSubBrandFallback(
  customer: BrandKitCustomer,
  slug: string,
  relationship: BrandRelationship = "sub-brand",
  profileOverride?: BrandProfile,
): SubBrand {
  const name = slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  const profile = profileOverride ?? customer.profile ?? brandKitCustomers[0].profile;

  return {
    slug,
    name,
    logoUrl: customer.logoUrl,
    lastUpdated: "Just now",
    relationship,
    profile: cloneBrandProfile(profile as BrandProfile),
  };
}

export function createManualBrandProfile(): BrandProfile {
  return {
    logos: [],
    colours: [{ name: "Primary", hex: "#FFFFFF", role: "primary" }],
    fonts: [
      { role: "heading", family: "", source: "google" },
      { role: "body", family: "", source: "google" },
      { role: "mono", family: "", source: "google" },
    ],
    imagery: [],
    voice: { summary: "", tags: [] },
    guidelines: {},
  };
}

export function cloneBrandProfile(profile: BrandProfile): BrandProfile {
  return {
    logos: profile.logos.map((logo) => ({ ...logo })),
    colours: profile.colours.map((colour) => ({ ...colour })),
    fonts: profile.fonts.map((font) => ({ ...font })),
    imagery: profile.imagery.map((image) => ({ ...image })),
    voice: { summary: profile.voice.summary, tags: [...profile.voice.tags] },
    guidelines: {
      ...profile.guidelines,
      files: profile.guidelines.files?.map((file) => ({ ...file })),
    },
  };
}
