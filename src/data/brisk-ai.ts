import type { DsIconName } from "@/components/video-review/DsIcon";

export type FilmmakerModeId =
  | "cinematic-storyteller"
  | "documentary-filmmaker"
  | "corporate-communicator"
  | "social-first-creator"
  | "campaign-strategist"
  | "custom";

export type FilmmakerMode = {
  id: FilmmakerModeId;
  label: string;
  description: string;
  icon: DsIconName;
};

export type BriskAiResponseLength = "Concise" | "Balanced" | "Detailed";
export type BriskAiTone = "Direct and constructive" | "Warm and supportive" | "Challenging and candid";

export type StudioAiPlaybook = {
  defaultModeId: FilmmakerModeId;
  tone: BriskAiTone;
  responseLength: BriskAiResponseLength;
  creativePrinciples: string;
  productionPrinciples: string;
  alwaysConsider: string;
  avoid: string;
  customInstructions: string;
  customModeName: string;
  customModeBehaviour: string;
  exampleReferences: string[];
  clientAccessEnabled: boolean;
};

export type BriskAiStage = "brief" | "script" | "shoot" | "media" | "edit" | "masters" | "project" | "workspace";

export type BriskAiSourceKind =
  | "studio"
  | "client"
  | "brand_brain"
  | "project"
  | "stage"
  | "brief"
  | "script"
  | "edit"
  | "comments"
  | "document"
  | "image"
  | "video"
  | "page"
  | "record"
  | "person";

export type BriskAiSource = {
  id: string;
  label: string;
  kind: BriskAiSourceKind;
  context: "automatic" | "manual";
  required: boolean;
  selected: boolean;
  available: boolean;
  clientVisible: boolean;
  preview: string;
  detail?: string;
  thumbnailUrl?: string;
  duration?: string;
  referenceRange?: string;
};

export type BriskAiCitation = {
  id: string;
  label: string;
  sourceId: string;
  kind: "source" | "timecode" | "comment" | "activity";
  detail?: string;
  timecodeSeconds?: number;
  commentId?: string;
};

export type BriskAiResponse = {
  title: string;
  body: string;
  draft?: string;
  categoryRows?: Array<{ label: string; body: string; citationIds: string[] }>;
  citations: BriskAiCitation[];
};

export type MockBriskAiChatMessage =
  | {
      id: string;
      role: "user";
      body: string;
    }
  | {
      id: string;
      role: "assistant";
      response: BriskAiResponse;
    };

export type MockBriskAiChat = {
  id: string;
  title: string;
  period: "Today" | "Past week" | "Older";
  clientName: string;
  projectId: string | null;
  projectName: string;
  stage: BriskAiStage;
  manualSourceIds: string[];
  messages: MockBriskAiChatMessage[];
};

export const mockBriskAiChatHistory: readonly MockBriskAiChat[] = [
  {
    id: "chat-latest-client-approval",
    title: "Latest client approval",
    period: "Today",
    clientName: "Loom",
    projectId: "loom-launch-film",
    projectName: "Launch Film - Sales Narrative",
    stage: "script",
    manualSourceIds: ["client-comments"],
    messages: [
      {
        id: "history-user-approval",
        role: "user",
        body: "When did the client last approve the edit?",
      },
      {
        id: "history-assistant-approval",
        role: "assistant",
        response: {
          title: "Latest Client approval",
          body: "Jess Chen approved Edit v3 on 18 Aug at 3:42 pm. The project has since moved back into Script for the revised closing line.",
          citations: [
            { id: "history-approval-time", label: "18 Aug, 3:42 pm", sourceId: "current-project", kind: "activity", detail: "Client approval activity" },
          ],
        },
      },
    ],
  },
  {
    id: "chat-summarise-edit-feedback",
    title: "Summarise edit feedback",
    period: "Today",
    clientName: "Loom",
    projectId: "loom-launch-film",
    projectName: "Launch Film - Sales Narrative",
    stage: "edit",
    manualSourceIds: ["client-comments", "edit-v3"],
    messages: [
      {
        id: "history-user-feedback",
        role: "user",
        body: "Summarise the latest edit feedback.",
      },
      {
        id: "history-assistant-feedback",
        role: "assistant",
        response: {
          title: "Latest edit feedback",
          body: "The Client wants a faster opening, an earlier product benefit and a shorter hold at 00:47. Four of six comments appear resolved.",
          citations: [
            { id: "history-feedback-comments", label: "Client comments", sourceId: "client-comments", kind: "comment", detail: "6 unresolved comments" },
            { id: "history-feedback-time", label: "00:47", sourceId: "edit-v3", kind: "timecode", timecodeSeconds: 47, detail: "Transition timing" },
          ],
        },
      },
    ],
  },
  {
    id: "chat-review-opening-script",
    title: "Review the opening script",
    period: "Past week",
    clientName: "Loom",
    projectId: "loom-launch-film",
    projectName: "Launch Film - Sales Narrative",
    stage: "script",
    manualSourceIds: ["brand-guidelines-pdf"],
    messages: [
      {
        id: "history-user-opening",
        role: "user",
        body: "Review the opening script against the approved brief.",
      },
      {
        id: "history-assistant-opening",
        role: "assistant",
        response: {
          title: "",
          body: "The opening is clear, but the audience arrives too late. Lead with the sales-team pressure before introducing the product response.",
          draft: "When every customer conversation moves quickly, sales teams need one clear place to stay aligned.",
          citations: [
            { id: "history-opening-script", label: "Current script", sourceId: "current-script", kind: "source", detail: "Script v4" },
            { id: "history-opening-brief", label: "Approved Brief", sourceId: "current-brief", kind: "source", detail: "Approved audience" },
          ],
        },
      },
    ],
  },
  {
    id: "chat-campaign-message",
    title: "Clarify the campaign message",
    period: "Older",
    clientName: "Canva",
    projectId: null,
    projectName: "Teams Campaign Film",
    stage: "brief",
    manualSourceIds: ["launch-campaign-page"],
    messages: [
      {
        id: "history-user-campaign",
        role: "user",
        body: "Clarify the main campaign message for the brief.",
      },
      {
        id: "history-assistant-campaign",
        role: "assistant",
        response: {
          title: "Campaign message",
          body: "Centre the story on helping distributed teams turn rough ideas into shared, useful work without adding another approval layer.",
          draft: "Canva helps every team move from first thought to finished work together.",
          citations: [
            { id: "history-campaign-brief", label: "Current Brief", sourceId: "current-brief", kind: "source", detail: "Campaign purpose" },
          ],
        },
      },
    ],
  },
] as const;

export const filmmakerModes: readonly FilmmakerMode[] = [
  {
    id: "cinematic-storyteller",
    label: "Cinematic storyteller",
    description: "Emotive, visual and character-led",
    icon: "film-strip",
  },
  {
    id: "documentary-filmmaker",
    label: "Documentary filmmaker",
    description: "Authentic, restrained and evidence-led",
    icon: "video-camera-ds",
  },
  {
    id: "corporate-communicator",
    label: "Corporate communicator",
    description: "Clear, structured and stakeholder-safe",
    icon: "clipboard-text",
  },
  {
    id: "social-first-creator",
    label: "Social-first creator",
    description: "Fast hooks, short formats and platform-aware",
    icon: "play",
  },
  {
    id: "campaign-strategist",
    label: "Campaign strategist",
    description: "Focused on audience, message and outcomes",
    icon: "circles-three",
  },
  {
    id: "custom",
    label: "Custom",
    description: "Studio-defined behaviour and examples",
    icon: "settings",
  },
] as const;

export const initialStudioAiPlaybook: StudioAiPlaybook = {
  defaultModeId: "documentary-filmmaker",
  tone: "Direct and constructive",
  responseLength: "Balanced",
  creativePrinciples:
    "Start with a human tension, make the audience clear early, and favour one memorable idea over several competing messages.",
  productionPrinciples:
    "Work from approved project facts, flag production assumptions, and keep recommendations achievable within the agreed scope and schedule.",
  alwaysConsider:
    "The approved Brief, the Client AI Brand Profile, accessibility, delivery formats, the current Stage and the latest Client feedback.",
  avoid:
    "Generic hype, invented claims, unapproved promises, celebrity imitation, hidden production costs and automatic publishing.",
  customInstructions:
    "Challenge weak concepts, but keep Client feedback constructive. Explain the production consequence of every recommendation.",
  customModeName: "Northstar challenger",
  customModeBehaviour:
    "Be candid about weak ideas, protect the core audience insight, and offer one practical alternative with a clear production trade-off.",
  exampleReferences: [
    "Loom launch script v4.pdf",
    "Deel customer story treatment.pdf",
    "Northstar review principles.docx",
  ],
  clientAccessEnabled: false,
};

export const stageActionPrompts: Record<BriskAiStage, readonly string[]> = {
  brief: [
    "Suggest an angle",
    "Clarify the audience",
    "Draft the brief",
    "Improve the brief",
    "Check against the AI Brand Profile",
    "Ask follow-up questions",
  ],
  script: [
    "Draft from the approved brief",
    "Rewrite in the Client's voice",
    "Make more concise",
    "Suggest an alternative opening",
    "Improve the call to action",
    "Check against the AI Brand Profile",
  ],
  edit: [
    "Review this edit",
    "Check brief alignment",
    "Check story clarity",
    "Review pacing",
    "Check Client-comment coverage",
  ],
  shoot: ["When does the shoot start?", "Summarise the call sheet", "What are we waiting on from the Client?"],
  media: ["What footage is still missing?", "Summarise the available interviews", "What are we waiting on from the Client?"],
  masters: ["What is ready for delivery?", "Check deliverables against the Brief", "What are we waiting on from the Client?"],
  project: ["Summarise this project", "What was the issue that came up last time?", "What happens next?"],
  workspace: ["Which projects have not moved in two weeks?", "What needs my attention today?", "Summarise the latest Client comments."],
};

export const accountManagerPrompts = [
  "When did the Client last approve the edit?",
  "When does the shoot start?",
  "What was the issue that came up last time?",
  "What are we currently waiting on from the Client?",
  "Summarise the latest Client comments.",
  "Which projects have not moved in two weeks?",
] as const;

export const optionalBriskAiSources: readonly BriskAiSource[] = [
  {
    id: "client-comments",
    label: "Client comments",
    kind: "comments",
    context: "manual",
    required: false,
    selected: true,
    available: true,
    clientVisible: true,
    preview: "6 unresolved comments on Edit v3",
    detail: "Latest Client comment: The opening feels slow. Can we reach the product benefit sooner?",
  },
  {
    id: "brand-guidelines-pdf",
    label: "Brand guidelines.pdf",
    kind: "document",
    context: "manual",
    required: false,
    selected: true,
    available: true,
    clientVisible: true,
    preview: "Loom brand guidelines, 42 pages",
    detail: "Voice: calm, direct and useful. Avoid inflated claims and jargon.",
  },
  {
    id: "reference-image",
    label: "Launch key art.jpg",
    kind: "image",
    context: "manual",
    required: false,
    selected: true,
    available: true,
    clientVisible: true,
    preview: "Reference image supplied by Loom",
    detail: "Warm office portraiture with clear product UI and restrained purple accents.",
    thumbnailUrl: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=640&q=80",
  },
  {
    id: "edit-v3",
    label: "Edit v3",
    kind: "video",
    context: "manual",
    required: false,
    selected: false,
    available: true,
    clientVisible: true,
    preview: "Loom-launch-film-v3.mp4",
    detail: "Current Client review version uploaded 18 Aug 2026 at 2:14 pm.",
    duration: "02:00",
    referenceRange: "Whole video",
    thumbnailUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=640&q=80",
  },
  {
    id: "product-dashboard-screenshot",
    label: "Product dashboard screenshot.png",
    kind: "image",
    context: "manual",
    required: false,
    selected: false,
    available: true,
    clientVisible: true,
    preview: "Screenshot supplied with the latest Client comment",
    detail: "Annotated dashboard screenshot showing the approved product state for the closing sequence.",
    thumbnailUrl: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=640&q=80",
  },
  {
    id: "launch-campaign-page",
    label: "Launch campaign page",
    kind: "page",
    context: "manual",
    required: false,
    selected: false,
    available: true,
    clientVisible: true,
    preview: "Brisk page in the Loom Client workspace",
    detail: "Campaign outcomes, release plan and agreed message hierarchy.",
  },
  {
    id: "previous-project-record",
    label: "Loom onboarding film",
    kind: "record",
    context: "manual",
    required: false,
    selected: false,
    available: true,
    clientVisible: true,
    preview: "Previous project record for Loom",
    detail: "The previous project lost two days while final product screenshots were replaced.",
  },
  {
    id: "maddie-lee",
    label: "Maddie Lee",
    kind: "person",
    context: "manual",
    required: false,
    selected: false,
    available: true,
    clientVisible: false,
    preview: "Producer on this project",
    detail: "Studio Staff - Producer. Assigned across Brief, Shoot and delivery.",
  },
  {
    id: "internal-comments",
    label: "Internal comments",
    kind: "comments",
    context: "manual",
    required: false,
    selected: false,
    available: true,
    clientVisible: false,
    preview: "3 Studio-only comments",
    detail: "Internal notes are never available in the Client AI experience.",
  },
  {
    id: "archived-reference",
    label: "Archived campaign reference",
    kind: "document",
    context: "manual",
    required: false,
    selected: false,
    available: false,
    clientVisible: false,
    preview: "Source unavailable",
    detail: "This file was removed from the Studio workspace and cannot be used.",
  },
] as const;

export function getAutomaticBriskAiSources({
  clientName,
  projectName,
  stage,
  studioName,
}: {
  clientName: string | null;
  projectName: string | null;
  stage: BriskAiStage;
  studioName: string;
}): BriskAiSource[] {
  const sources: BriskAiSource[] = [
    {
      id: "current-studio",
      label: studioName,
      kind: "studio",
      context: "automatic",
      required: true,
      selected: true,
      available: true,
      clientVisible: false,
      preview: "Current Studio",
      detail: "Sets the Studio AI Playbook, workspace boundaries and production principles.",
    },
  ];

  if (clientName) {
    sources.push(
      {
        id: "current-client",
        label: clientName,
        kind: "client",
        context: "automatic",
        required: true,
        selected: true,
        available: true,
        clientVisible: true,
        preview: "Current Client",
        detail: `Only ${clientName}'s workspace information is available in this conversation.`,
      },
      {
        id: "brand-brain",
        label: "AI Brand Profile",
        kind: "brand_brain",
        context: "automatic",
        required: true,
        selected: true,
        available: true,
        clientVisible: true,
        preview: `${clientName} AI Brand Profile`,
        detail: "Brisk's understanding of the Client's voice, audience, visual identity, approved work and production preferences.",
      },
    );
  }

  if (projectName) {
    sources.push({
      id: "current-project",
      label: projectName,
      kind: "project",
      context: "automatic",
      required: true,
      selected: true,
      available: true,
      clientVisible: true,
      preview: "Current project",
      detail: "Project schedule, approval activity, messages, status and delivery information.",
    });
  }

  if (stage !== "workspace" && stage !== "project") {
    const stageLabel = stage.charAt(0).toLocaleUpperCase("en-AU") + stage.slice(1);
    sources.push({
      id: "current-stage",
      label: `${stageLabel} Stage`,
      kind: "stage",
      context: "automatic",
      required: true,
      selected: true,
      available: true,
      clientVisible: true,
      preview: "Current production Stage",
      detail: `The request is being made while viewing the ${stageLabel} Stage.`,
    });
  }

  const currentWorkSources: BriskAiSource[] = [];

  if (stage === "brief" || stage === "script" || stage === "edit") {
    currentWorkSources.push({
      id: "current-brief",
      label: stage === "brief" ? "Current Brief" : "Approved Brief",
      kind: "brief",
      context: "automatic",
      required: true,
      selected: true,
      available: true,
      clientVisible: true,
      preview: stage === "brief" ? "The Brief currently open on screen" : "Approved project Brief",
      detail: "Approved purpose, audience, key message, deliverables and production constraints.",
    });
  }

  if (stage === "script" || stage === "edit") {
    currentWorkSources.push({
      id: "current-script",
      label: "Current script",
      kind: "script",
      context: "automatic",
      required: true,
      selected: true,
      available: true,
      clientVisible: true,
      preview: stage === "script" ? "The Script currently open on screen" : "Approved Script v4",
      detail: "Latest editable Script and approved narration.",
    });
  }

  if (stage === "edit") {
    currentWorkSources.push({
      id: "current-edit",
      label: "Current edit",
      kind: "edit",
      context: "automatic",
      required: true,
      selected: true,
      available: true,
      clientVisible: true,
      preview: "The Edit currently open on screen",
      detail: "Edit v3, 02:00, in Client review.",
    });
  }

  sources.push(...currentWorkSources);

  return sources;
}

export function getMockBriskAiResponse(prompt: string, stage: BriskAiStage): BriskAiResponse {
  const normalisedPrompt = prompt.toLocaleLowerCase("en-AU");

  if (normalisedPrompt.includes("last approve") || normalisedPrompt.includes("last approved")) {
    return {
      title: "Latest approval",
      body: "Jess T. approved Edit v3 on 18 August at 3:42 pm. The Client added two follow-up notes after approval, so the version remains approved while those polish items are tracked.",
      citations: [
        { id: "approval-activity", label: "18 Aug, 3:42 pm", sourceId: "current-project", kind: "activity", detail: "Client approval activity" },
        { id: "approval-edit", label: "Edit v3", sourceId: "current-project", kind: "source", detail: "Current review version" },
      ],
    };
  }

  if (normalisedPrompt.includes("shoot start") || normalisedPrompt.includes("shoot begin")) {
    return {
      title: "Shoot timing",
      body: "The shoot starts Tuesday 25 August at 8:00 am at Loom Sydney. Crew call is 7:15 am and the first founder interview begins at 9:00 am.",
      citations: [
        { id: "shoot-date", label: "Call sheet - 25 Aug", sourceId: "current-project", kind: "source", detail: "Published call sheet" },
        { id: "shoot-update", label: "Updated 21 Aug, 4:18 pm", sourceId: "current-project", kind: "activity", detail: "Latest schedule change" },
      ],
    };
  }

  if (normalisedPrompt.includes("waiting on") || normalisedPrompt.includes("currently waiting")) {
    return {
      title: "Waiting on the Client",
      body: "We are waiting on Loom to confirm the final lower-third job titles and approve the shortened opening in Edit v3. Maddie requested both items yesterday at 2:16 pm.",
      citations: [
        { id: "waiting-comment", label: "Client comment #14", sourceId: "client-comments", kind: "comment", commentId: "comment-001", detail: "Lower-third copy" },
        { id: "waiting-message", label: "22 Aug, 2:16 pm", sourceId: "current-project", kind: "activity", detail: "Maddie's review request" },
      ],
    };
  }

  if (normalisedPrompt.includes("issue") && normalisedPrompt.includes("last")) {
    return {
      title: "Previous production issue",
      body: "The last Loom project slipped by two working days because final product screenshots arrived after picture lock. For this project, the Studio has requested approved screenshots before the fine cut.",
      citations: [
        { id: "previous-record", label: "Previous project activity", sourceId: "current-project", kind: "activity", detail: "Loom onboarding film" },
        { id: "current-plan", label: "Production note - 12 Aug", sourceId: "current-project", kind: "activity", detail: "Current mitigation" },
      ],
    };
  }

  if (normalisedPrompt.includes("latest client comments") || normalisedPrompt.includes("summarise") && normalisedPrompt.includes("comments")) {
    return {
      title: "Latest Client comments",
      body: "The Client likes the overall structure. The remaining notes are to reach the product benefit sooner, cool the colour grade at the opening, tighten the transition at 00:47 and simplify the lower third near the end.",
      citations: [
        { id: "comment-opening", label: "00:04", sourceId: "client-comments", kind: "timecode", timecodeSeconds: 4, detail: "Opening pacing comment" },
        { id: "comment-transition", label: "00:47", sourceId: "client-comments", kind: "timecode", timecodeSeconds: 47, commentId: "comment-003", detail: "Transition timing comment" },
        { id: "comment-summary", label: "Client comments", sourceId: "client-comments", kind: "comment", commentId: "comment-overall-jess", detail: "6 unresolved comments" },
      ],
    };
  }

  if (normalisedPrompt.includes("two weeks") || normalisedPrompt.includes("not moved")) {
    return {
      title: "Projects needing attention",
      body: "Three projects have had no Stage movement in the last two weeks: Hims Product Education, Ramp Finance Recap and Linear Roadmap Film. Hims is waiting on Client product claims; the other two are waiting on Studio review.",
      citations: [
        { id: "stalled-activity", label: "Workspace activity - 24 Aug", sourceId: "current-studio", kind: "activity", detail: "Project Stage history" },
        { id: "stalled-schedule", label: "Delivery schedule", sourceId: "current-studio", kind: "source", detail: "Active Videos" },
      ],
    };
  }

  if (stage === "edit" || normalisedPrompt.includes("review this edit") || normalisedPrompt.includes("pacing")) {
    return {
      title: "AI review of Edit v3",
      body: "The cut is close to the approved direction. The strongest gains now come from clarifying the audience earlier and resolving two Client notes without slowing the middle section.",
      draft: "Tighten the opening so the audience and product benefit are clear by 00:04. Trim the transition at 00:47 by half a beat, then resolve the remaining colour-grade and lower-third Client notes before the next review.",
      categoryRows: [
        { label: "Brief alignment", body: "The product benefit arrives four seconds later than the approved opening promises.", citationIds: ["edit-opening", "edit-brief"] },
        { label: "Story clarity", body: "The audience is not explicit until the first interview line. A shorter opening title would orient sales teams sooner.", citationIds: ["edit-opening", "edit-script"] },
        { label: "Pacing", body: "The transition at 00:47 holds about half a beat longer than the surrounding rhythm.", citationIds: ["edit-transition"] },
        { label: "Client-comment coverage", body: "Four of six notes appear resolved. The colour-grade and lower-third notes still need attention.", citationIds: ["edit-comments"] },
      ],
      citations: [
        { id: "edit-opening", label: "00:04", sourceId: "current-edit", kind: "timecode", timecodeSeconds: 4, detail: "Opening" },
        { id: "edit-transition", label: "00:47", sourceId: "current-edit", kind: "timecode", timecodeSeconds: 47, detail: "Transition" },
        { id: "edit-brief", label: "Approved Brief", sourceId: "current-brief", kind: "source", detail: "Audience and opening promise" },
        { id: "edit-script", label: "Current script", sourceId: "current-script", kind: "source", detail: "Approved narration" },
        { id: "edit-comments", label: "Client comments", sourceId: "client-comments", kind: "comment", commentId: "comment-001", detail: "6 unresolved comments" },
        { id: "edit-brand", label: "AI Brand Profile", sourceId: "brand-brain", kind: "source", detail: "Voice and visual identity" },
      ],
    };
  }

  if (stage === "brief" || normalisedPrompt.includes("brief") || normalisedPrompt.includes("angle") || normalisedPrompt.includes("audience")) {
    return {
      title: normalisedPrompt.includes("audience") ? "Audience clarification" : "Suggested Brief direction",
      body: "Lead with the pressure sales teams feel when product updates outpace their ability to explain them. Position Loom as the clear, human way to turn complex releases into confident customer conversations.",
      draft: "For revenue leaders and enablement teams launching new product capabilities, create a concise customer-led film that shows how Loom turns complex product updates into clear, repeatable sales conversations. The viewer should leave confident that teams can align quickly and act without another meeting.",
      citations: [
        { id: "brief-source", label: "Current Brief", sourceId: "current-brief", kind: "source", detail: "Purpose, audience and deliverables" },
        { id: "brief-brand", label: "AI Brand Profile", sourceId: "brand-brain", kind: "source", detail: "Audience and brand voice" },
        { id: "brief-guidelines", label: "Brand guidelines.pdf", sourceId: "brand-guidelines-pdf", kind: "source", detail: "Voice guidance" },
      ],
    };
  }

  if (stage === "script" || normalisedPrompt.includes("script") || normalisedPrompt.includes("opening") || normalisedPrompt.includes("call to action") || normalisedPrompt.includes("concise")) {
    return {
      title: normalisedPrompt.includes("opening") ? "Alternative opening" : "Script suggestion",
      body: "This version gets to the audience tension faster, keeps Loom's voice calm and specific, and preserves the approved call to action.",
      draft: "Product updates move quickly. Your sales story should too. With Loom, enablement teams turn each release into one clear narrative that sellers can understand, share and put to work.",
      citations: [
        { id: "script-current", label: "Current script", sourceId: "current-script", kind: "source", detail: "Script v4" },
        { id: "script-brief", label: "Approved Brief", sourceId: "current-brief", kind: "source", detail: "Approved audience and message" },
        { id: "script-brand", label: "AI Brand Profile", sourceId: "brand-brain", kind: "source", detail: "Loom voice" },
      ],
    };
  }

  return {
    title: "Project summary",
    body: "The Loom launch film is in production. Brief and Script are approved, the shoot is scheduled for 25 August, and the team is waiting on final job titles and product screenshots from the Client.",
    citations: [
      { id: "summary-project", label: "Project activity", sourceId: "current-project", kind: "activity", detail: "Updated today at 9:18 am" },
      { id: "summary-schedule", label: "Call sheet", sourceId: "current-project", kind: "source", detail: "Published 21 Aug" },
    ],
  };
}

export function cloneStudioAiPlaybook(playbook: StudioAiPlaybook): StudioAiPlaybook {
  return {
    ...playbook,
    exampleReferences: [...playbook.exampleReferences],
  };
}
