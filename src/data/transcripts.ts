export type TranscriptTextRange = {
  start: number;
  end: number;
};

export type TranscriptParagraph = {
  id: string;
  speakerName: string;
  startTimeSeconds: number;
  endTimeSeconds: number;
  text: string;
};

export type TranscriptClip = {
  id: string;
  projectId: string;
  mediaAssetId: string;
  language: string;
  createdAt: string;
  paragraphs: TranscriptParagraph[];
};

export type Highlight = {
  id: string;
  clipId: TranscriptClip["id"];
  paragraphId: TranscriptParagraph["id"];
  range: TranscriptTextRange;
  text: string;
};

export type SelectionContext = {
  clipId: TranscriptClip["id"];
  paragraphId: TranscriptParagraph["id"];
  range: TranscriptTextRange;
  text: string;
};

export type TranscriptWordsRowPayload = {
  sourceKey: string;
  words: string;
  speakerName: string;
  sourceFilename: string;
  clipId: TranscriptClip["id"];
  paragraphId: TranscriptParagraph["id"];
  startTimeSeconds: number;
  endTimeSeconds: number;
  range: TranscriptTextRange;
};

type TranscriptSeed = readonly [
  speakerName: string,
  startTimeSeconds: number,
  endTimeSeconds: number,
  text: string,
];

const jessCameraASeeds: TranscriptSeed[] = [
  ["Interviewer", 8, 15, "What changes when a product update reaches the sales team?"],
  ["Jess Taylor", 16, 25, "The team needs a clear way to explain the change before the next customer conversation."],
  ["Interviewer", 27, 34, "Where does Loom help most?"],
  ["Jess Taylor", 35, 45, "We can show the update in context and share the same story with everyone, wherever they work."],
  ["Jess Taylor", 47, 58, "A short recording lets people see the product and hear why it matters, without another meeting."],
  ["Interviewer", 60, 67, "What should customers take away from this film?"],
  ["Jess Taylor", 68, 78, "That the team understands their needs and can explain each new capability with confidence."],
];

const jessAudioSeeds: TranscriptSeed[] = [
  ["Jess Taylor", 8, 17, "The best sales conversations start with genuine curiosity about the customer."],
  ["Interviewer", 18, 25, "How does the team prepare for a new product launch?"],
  ["Jess Taylor", 26, 37, "We record a clear walkthrough, share it with the team and keep the important details easy to revisit."],
  ["Interviewer", 39, 46, "What does that change for sellers?"],
  ["Jess Taylor", 47, 59, "They can focus on the customer's question instead of trying to remember every slide from a meeting."],
];

const averySeeds: TranscriptSeed[] = [
  ["Interviewer", 5, 12, "What makes a product story useful to a customer?"],
  ["Avery Taylor", 13, 25, "Show the problem first, then let people see how the product fits into their day."],
  ["Interviewer", 27, 34, "What should the opening of this film communicate?"],
  ["Avery Taylor", 35, 47, "A familiar moment for a sales team, followed by a practical way to share the answer."],
  ["Avery Taylor", 49, 59, "The ending should leave people ready to explain the update in their own words."],
];

const roundtableSeeds: TranscriptSeed[] = [
  ["Priya Nair", 11, 22, "Start with the sales team's question and move quickly to the product demonstration."],
  ["David Ryan", 24, 36, "The edit should give the screen recording room to show the change clearly."],
  ["Jess Taylor", 38, 49, "Keep the Client language simple and specific to what customers can do next."],
  ["Priya Nair", 51, 62, "Jess's explanation gives us the human thread through the film."],
];

export const transcriptClips: TranscriptClip[] = [
  createTranscriptClip("transcript-media-01", "media-01", jessCameraASeeds),
  createTranscriptClip("transcript-media-03", "media-03", jessAudioSeeds),
  createTranscriptClip("transcript-media-16", "media-16", averySeeds),
  createTranscriptClip("transcript-media-17", "media-17", roundtableSeeds),
];

export function createTranscriptSourceKey(
  clipId: string,
  paragraphId: string,
  range: TranscriptTextRange,
) {
  return `${clipId}:${paragraphId}:${range.start}-${range.end}`;
}

function createTranscriptClip(
  id: string,
  mediaAssetId: string,
  seeds: TranscriptSeed[],
): TranscriptClip {
  return {
    id,
    projectId: "loom-launch-film",
    mediaAssetId,
    language: "en-AU",
    createdAt: "2026-07-08T15:00:00+10:00",
    paragraphs: seeds.map(([speakerName, startTimeSeconds, endTimeSeconds, text], index) => ({
      id: `${id}-paragraph-${String(index + 1).padStart(2, "0")}`,
      speakerName,
      startTimeSeconds,
      endTimeSeconds,
      text,
    })),
  };
}
