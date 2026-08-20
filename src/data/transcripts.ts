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

const miaCameraASeeds: TranscriptSeed[] = [
  ["Interviewer", 8, 15, "Before we talk about the platform, can you describe what a difficult handover feels like for a family?"],
  ["Mia Chen", 16, 24, "It usually starts with uncertainty. People have names and appointments, but they cannot see how the pieces fit together."],
  ["Interviewer", 25, 29, "Where does that uncertainty show up first?"],
  ["Mia Chen", 30, 39, "At home, often late at night, when someone is trying to remember which service is calling next and what they promised to send."],
  ["Mia Chen", 41, 49, "The best sales conversations start with genuine curiosity, and care conversations are not very different."],
  ["Interviewer", 51, 56, "What does genuine curiosity look like in practice?"],
  ["Mia Chen", 57, 67, "You slow down, ask what the family already understands, and listen for the thing they are worried about but have not said yet."],
  ["Interviewer", 69, 75, "Is that where Harbour Health comes into the story?"],
  ["Mia Chen", 76, 87, "Yes. Harbour Health gives the whole team a clear view of what the customer needs, without making the family repeat themselves."],
  ["Mia Chen", 89, 97, "The shared plan is useful, but the feeling of being recognised is what builds trust."],
  ["Interviewer", 99, 105, "Can you remember a moment when that made a difference?"],
  ["Mia Chen", 106, 118, "A daughter called after her mum came home. She expected to chase three people, but the next appointments were already there in one place."],
  ["Mia Chen", 120, 127, "She said it was the first evening that week when she could just be a daughter again."],
  ["Interviewer", 129, 135, "What did that mean to you and the team?"],
  ["Mia Chen", 136, 146, "It reminded us that good coordination is not administrative. It gives people back attention for the parts of life that matter."],
  ["Interviewer", 148, 154, "How does the platform change your day?"],
  ["Mia Chen", 155, 166, "I can see what happened before my call, what I need to do now, and who will pick it up after me."],
  ["Mia Chen", 168, 176, "We can share context quickly and keep momentum through every hand-off."],
  ["Interviewer", 178, 183, "Does speed ever come at the cost of care?"],
  ["Mia Chen", 184, 195, "No, because the speed comes from removing repetition. The conversation itself can be calmer and more human."],
  ["Interviewer", 197, 203, "What do families notice first?"],
  ["Mia Chen", 204, 213, "They notice that we know their story. We begin in the right place instead of asking them to start again."],
  ["Interviewer", 215, 222, "And what do clinicians notice?"],
  ["Mia Chen", 223, 234, "They notice fewer loose ends. Decisions, documents and follow-ups are visible, so ownership is much clearer."],
  ["Mia Chen", 236, 245, "That clarity makes the whole service feel joined up, even when several organisations are involved."],
  ["Interviewer", 247, 254, "If you had to describe Harbour Health in three words?"],
  ["Mia Chen", 255, 261, "Calm, clear and human."],
  ["Interviewer", 263, 270, "Why those three?"],
  ["Mia Chen", 271, 282, "Calm means less chasing. Clear means everyone knows what happens next. Human means the plan still starts with the person."],
  ["Interviewer", 284, 291, "What would you say to a team considering the change?"],
  ["Mia Chen", 292, 303, "Start with the handovers that create the most anxiety. Make those visible first and let the team feel the difference."],
  ["Mia Chen", 305, 315, "Once people trust the shared view, they naturally find more ways to work together."],
  ["Interviewer", 317, 323, "What should the film leave people feeling?"],
  ["Mia Chen", 324, 335, "That complex care can still feel simple to the person living through it, because the team is carrying the complexity together."],
];

const miaAudioSeeds: TranscriptSeed[] = [
  ["Mia Chen", 8, 17, "The best sales conversations start with genuine curiosity, and care conversations are not very different."],
  ["Interviewer", 18, 25, "What does genuine curiosity look like in practice?"],
  ["Mia Chen", 26, 37, "You ask what the family understands, then listen for the worry underneath the practical question."],
  ["Interviewer", 39, 46, "Where does Harbour Health help most?"],
  ["Mia Chen", 47, 59, "It gives the whole team a clear view of what the customer needs, so the family does not have to repeat their story."],
  ["Mia Chen", 61, 71, "We can share context quickly and keep momentum through every hand-off."],
  ["Interviewer", 73, 80, "What do families notice?"],
  ["Mia Chen", 81, 92, "They notice that the next person already knows what happened and can begin in the right place."],
  ["Interviewer", 94, 101, "What do clinicians notice?"],
  ["Mia Chen", 102, 114, "Fewer loose ends, clearer ownership, and much less time spent reconstructing the last conversation."],
  ["Interviewer", 116, 123, "Three words for the experience?"],
  ["Mia Chen", 124, 131, "Calm, clear and human."],
  ["Interviewer", 133, 139, "Why human?"],
  ["Mia Chen", 140, 151, "Because even the best plan only matters if the person feels heard and knows what happens next."],
  ["Interviewer", 153, 160, "What is the closing thought?"],
  ["Mia Chen", 161, 172, "The team carries the complexity together, so families have more room to live their lives."],
];

const averySeeds: TranscriptSeed[] = [
  ["Interviewer", 5, 12, "Where is trust most at risk during a care journey?"],
  ["Avery Taylor", 13, 25, "The handover point is where families feel the most uncertainty, because responsibility is moving but the next step is not always visible."],
  ["Interviewer", 27, 34, "What did you want to change first?"],
  ["Avery Taylor", 35, 47, "We wanted one shared view that followed the person, rather than separate updates trapped inside each service."],
  ["Avery Taylor", 49, 59, "The important shift was making ownership obvious without making the experience feel clinical or transactional."],
  ["Interviewer", 61, 68, "How do you know it is working?"],
  ["Avery Taylor", 69, 82, "Families ask fewer questions about who to call next, and teams spend more time solving the need in front of them."],
  ["Interviewer", 84, 91, "What should the opening of the film communicate?"],
  ["Avery Taylor", 92, 103, "Start with the handover moment. That is where trust is either built or lost, and where Harbour Health becomes tangible."],
  ["Interviewer", 105, 112, "And the ending?"],
  ["Avery Taylor", 113, 126, "End with the family moving forward, while the team quietly carries the complexity in the background."],
];

const roundtableSeeds: TranscriptSeed[] = [
  ["Priya Nair", 11, 22, "From a producer's point of view, the strongest story is the change from chasing updates to seeing one clear path."],
  ["David Ryan", 24, 36, "For the edit, I would hold on the pauses around the daughter story. That is where the emotional meaning arrives."],
  ["Jess Turner", 38, 49, "The customer language should stay simple. We say what happens next, not workflow or coordination layer."],
  ["Priya Nair", 51, 62, "Mia's calm, clear and human line can work as the centre of the paper edit."],
  ["David Ryan", 64, 75, "Avery gives us the structure, and Mia gives us the lived experience. We should move between those two perspectives."],
  ["Jess Turner", 77, 88, "Please keep the family as the hero. Harbour Health should feel like the support around them, not the headline."],
  ["Priya Nair", 90, 102, "That gives us a clean ending: the team carries the complexity, so the family gets attention back for life."],
];

export const transcriptClips: TranscriptClip[] = [
  createTranscriptClip("transcript-media-01", "media-01", miaCameraASeeds),
  createTranscriptClip("transcript-media-03", "media-03", miaAudioSeeds),
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
