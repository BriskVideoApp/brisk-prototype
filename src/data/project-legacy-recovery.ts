import type { ReviewComment, ReviewVersion, ReviewVersionStatus } from "@/components/video-review/types";
import { initialMastersDeliverables, type MastersDeliverable } from "@/data/masters";
import { initialScriptComments, scriptVersions, type ScriptComment, type ScriptVersion } from "@/data/script";
import { reviewVersions, reviewVideo } from "@/data/video-review";

type ScriptDraft<T> = T & { versions: ScriptVersion[]; comments: ScriptComment[]; selectedVersionId: string };
type EditReview<T> = T & {
  versions: ReviewVersion[];
  comments: ReviewComment[];
  resolvedIds: string[];
  statuses: Record<string, ReviewVersionStatus>;
};

export function recoverLegacyScriptDraft<T>(draft: ScriptDraft<T>): ScriptDraft<T> | null {
  const comments = draft.comments.flatMap((comment) => {
    const sample = initialScriptComments.find((candidate) => candidate.id === comment.id);
    if (!sample) return [comment];
    if (comment.body === sample.body && comment.resolved === sample.resolved
      && JSON.stringify(comment.replies) === JSON.stringify(sample.replies)
      && JSON.stringify(comment.reactions) === JSON.stringify(sample.reactions)) return [];
    return [{ ...comment, body: comment.body === sample.body ? "Earlier sample comment removed." : comment.body }];
  });
  let hasAuthoredContent = comments.length > 0;
  const versions: ScriptVersion[] = draft.versions.map((version) => {
    const sampleVersion = scriptVersions.find((candidate) => candidate.id === version.id);
    const rows = version.rows.flatMap((row) => {
      if (row.id === "script-empty-row" && !row.words && !row.visuals && row.media.length === 0) return [];
      const sample = sampleVersion?.rows.find((candidate) => candidate.id === row.id)
        ?? scriptVersions.flatMap((candidate) => candidate.rows).find((candidate) => candidate.id === row.id
          && (candidate.words === row.words || candidate.visuals === row.visuals))
        ?? scriptVersions.flatMap((candidate) => candidate.rows).find((candidate) => candidate.id === row.id);
      if (!sample) {
        hasAuthoredContent = true;
        return [row];
      }
      if (JSON.stringify(row) === JSON.stringify(sample)) return [];
      hasAuthoredContent = true;
      return [{
        ...row,
        words: row.words === sample.words ? "" : row.words,
        visuals: row.visuals === sample.visuals ? "" : row.visuals,
        media: row.media.filter((item) => !sample.media.some((seed) => seed.id === item.id)),
      }];
    });
    if (sampleVersion && ((version.displayName && version.displayName !== sampleVersion.displayName)
      || version.snapshotName !== sampleVersion.snapshotName)) hasAuthoredContent = true;
    return {
      ...version,
      snapshotName: sampleVersion ? version.displayName ?? `Recovered ${version.label}` : version.snapshotName,
      approvedSnapshot: sampleVersion ? false : version.approvedSnapshot,
      approvedBy: sampleVersion ? undefined : version.approvedBy,
      approvedAt: sampleVersion ? undefined : version.approvedAt,
      rows,
    };
  });
  const selected = versions.find((version) => version.id === draft.selectedVersionId) ?? versions[0];
  for (const comment of comments) {
    const rowId = comment.anchor.rowId;
    if (!rowId || !selected || selected.rows.some((row) => row.id === rowId)) continue;
    const sample = scriptVersions.flatMap((version) => version.rows).find((row) => row.id === rowId);
    if (sample) selected.rows.push({ ...sample, words: "", visuals: "", durationSeconds: 0, media: [], change: undefined });
  }
  return hasAuthoredContent ? { ...draft, versions, comments } : null;
}

export function recoverLegacyEditReview<T>(review: EditReview<T>): EditReview<T> | null {
  const comments = review.comments.flatMap((comment) => {
    const sample = reviewVideo.comments.find((candidate) => candidate.id === comment.id);
    if (!sample) return [comment];
    if (JSON.stringify(comment) === JSON.stringify({ ...sample, versionLabel: sample.versionLabel ?? reviewVideo.versionLabel })) return [];
    return [{ ...comment, body: comment.body === sample.body ? "Earlier sample comment removed." : comment.body }];
  });
  const versions = review.versions.filter((version) => !reviewVersions.some((sample) =>
    sample.label === version.label && sample.fileName === version.fileName));
  for (const comment of comments) {
    const label = comment.versionLabel ?? reviewVideo.versionLabel;
    if (versions.some((version) => version.label === label)) continue;
    const sample = reviewVersions.find((version) => version.label === label);
    if (sample) versions.push({ ...sample, fileName: "Recovered review notes", sourceUrl: undefined, status: "in_review" });
  }
  if (versions.length === 0 && comments.length === 0) return null;
  const labels = new Set(versions.map((version) => version.label));
  return {
    ...review,
    versions,
    comments,
    resolvedIds: review.resolvedIds.filter((id) => comments.some((comment) => comment.id === id)),
    statuses: Object.fromEntries(Object.entries(review.statuses).filter(([label]) => labels.has(label))),
  };
}

export function recoverLegacyMastersDeliverables(
  stored: MastersDeliverable[],
  cleanSlots: MastersDeliverable[],
): MastersDeliverable[] {
  const recovered = [...cleanSlots];
  for (const deliverable of stored) {
    const sample = initialMastersDeliverables.find((candidate) => candidate.id === deliverable.id);
    if (!sample) {
      recovered.push(deliverable);
      continue;
    }
    const cleanIndex = recovered.findIndex((candidate) => candidate.briefDeliverableId === deliverable.briefDeliverableId);
    const clean = cleanIndex >= 0 ? recovered[cleanIndex] : null;
    const versions = deliverable.versions.filter((version) => !sample.versions.some((seed) => seed.id === version.id
      && seed.filename === version.filename) && !version.filename.includes("Good_Citizens"));
    const comments = deliverable.comments.filter((comment) => !sample.comments.some((seed) =>
      seed.id === comment.id && JSON.stringify(seed) === JSON.stringify(comment)));
    const renamed = deliverable.name !== sample.name;
    const changed = renamed || versions.length > 0 || comments.length > 0
      || deliverable.platform !== sample.platform || deliverable.format !== sample.format
      || deliverable.duration !== sample.duration || deliverable.deadline !== sample.deadline
      || deliverable.status !== sample.status
      || JSON.stringify(deliverable.captions) !== JSON.stringify(sample.captions)
      || JSON.stringify(deliverable.thumbnail) !== JSON.stringify(sample.thumbnail)
      || Boolean(deliverable.srt && !deliverable.srt.filename.includes("Good_Citizens"));
    if (!clean && !changed) continue;
    const result: MastersDeliverable = {
      ...deliverable,
      id: clean?.id ?? deliverable.id,
      name: renamed ? deliverable.name : clean?.name ?? deliverable.name,
      platform: deliverable.platform !== sample.platform ? deliverable.platform : clean?.platform ?? deliverable.platform,
      format: deliverable.format !== sample.format ? deliverable.format : clean?.format ?? deliverable.format,
      duration: deliverable.duration !== sample.duration ? deliverable.duration : clean?.duration ?? deliverable.duration,
      captions: JSON.stringify(deliverable.captions) !== JSON.stringify(sample.captions) ? deliverable.captions : clean?.captions ?? deliverable.captions,
      deadline: deliverable.deadline !== sample.deadline ? deliverable.deadline : clean?.deadline,
      versions,
      comments,
      unreadCommentCount: comments.filter((comment) => !comment.resolved).length,
      status: versions.length || deliverable.status !== sample.status
        ? deliverable.status : clean?.status ?? "not_started",
      currentVersionId: versions.some((version) => version.id === deliverable.currentVersionId)
        ? deliverable.currentVersionId : undefined,
      srt: deliverable.srt && !deliverable.srt.filename.includes("Good_Citizens") ? deliverable.srt : undefined,
      thumbnail: JSON.stringify(deliverable.thumbnail) !== JSON.stringify(sample.thumbnail) ? deliverable.thumbnail : undefined,
      recutSourceDeliverableId: deliverable.recutSourceDeliverableId !== sample.recutSourceDeliverableId
        ? deliverable.recutSourceDeliverableId : clean?.recutSourceDeliverableId,
    };
    if (cleanIndex >= 0) recovered[cleanIndex] = result;
    else recovered.push(result);
  }
  return recovered;
}

export function mergeRecoveredMastersDeliverables(
  current: MastersDeliverable[],
  legacy: MastersDeliverable[],
  cleanSlots: MastersDeliverable[],
): MastersDeliverable[] {
  const merged = [...current];
  for (const old of legacy) {
    const index = merged.findIndex((candidate) => candidate.briefDeliverableId === old.briefDeliverableId);
    if (index < 0) {
      merged.push(old);
      continue;
    }
    const newer = merged[index];
    const clean = cleanSlots.find((candidate) => candidate.briefDeliverableId === old.briefDeliverableId);
    merged[index] = {
      ...newer,
      name: newer.name === clean?.name ? old.name : newer.name,
      platform: newer.platform === clean?.platform ? old.platform : newer.platform,
      format: newer.format === clean?.format ? old.format : newer.format,
      duration: newer.duration === clean?.duration ? old.duration : newer.duration,
      captions: JSON.stringify(newer.captions) === JSON.stringify(clean?.captions) ? old.captions : newer.captions,
      deadline: newer.deadline === clean?.deadline ? old.deadline : newer.deadline,
      versions: [...newer.versions, ...old.versions.filter((version) =>
        !newer.versions.some((candidate) => candidate.id === version.id))],
      comments: [...newer.comments, ...old.comments.filter((comment) =>
        !newer.comments.some((candidate) => candidate.id === comment.id))],
      srt: newer.srt ?? old.srt,
      thumbnail: newer.thumbnail ?? old.thumbnail,
    };
  }
  return merged;
}
