import { describe, expect, it } from "vitest";
import { initialMastersDeliverables } from "@/data/masters";
import {
  mergeRecoveredMastersDeliverables,
  recoverLegacyEditReview,
  recoverLegacyMastersDeliverables,
  recoverLegacyScriptDraft,
} from "@/data/project-legacy-recovery";
import { initialScriptComments, scriptVersions } from "@/data/script";
import { reviewVersions, reviewVideo } from "@/data/video-review";

describe("legacy project content recovery", () => {
  it("does not carry untouched samples into a different project", () => {
    const script = recoverLegacyScriptDraft({
      versions: structuredClone(scriptVersions),
      comments: structuredClone(initialScriptComments).map((comment) => comment.id === "script-comment-row-03-resolved-01"
        ? { ...comment, authorId: "user-jess" }
        : comment),
      selectedVersionId: scriptVersions[0].id,
    });
    const edit = recoverLegacyEditReview({
      versions: structuredClone(reviewVersions),
      comments: reviewVideo.comments.map((comment) => ({ ...comment, versionLabel: "v2" })),
      resolvedIds: [],
      statuses: {},
    });
    const masters = recoverLegacyMastersDeliverables(structuredClone(initialMastersDeliverables), []);

    expect(script).toBeNull();
    expect(edit).toBeNull();
    expect(masters).toEqual([]);
  });

  it("keeps an edited Script row while removing unchanged foreign sample rows", () => {
    const versions = structuredClone(scriptVersions);
    versions[0].rows[0].words = "A genuine project-specific edit";
    const recovered = recoverLegacyScriptDraft({
      versions,
      comments: structuredClone(initialScriptComments),
      selectedVersionId: versions[0].id,
      versionMetaById: {},
      lastSavedAt: "2026-09-25T12:00:00+10:00",
    });

    expect(recovered?.versions[0].rows).toHaveLength(1);
    expect(recovered?.versions[0].rows[0].words).toBe("A genuine project-specific edit");
    expect(recovered?.versions[0].rows[0].visuals).toBe("");
    expect(recovered?.comments).toEqual([]);
    expect(recovered?.versions[1].rows).toEqual([]);
  });

  it("keeps a new Script comment attached to a neutral row", () => {
    const comment = { ...initialScriptComments[0], id: "authored-script-comment", body: "Please refine this line" };
    const recovered = recoverLegacyScriptDraft({
      versions: structuredClone(scriptVersions),
      comments: [comment],
      selectedVersionId: scriptVersions[0].id,
    });

    expect(recovered?.comments[0].body).toBe("Please refine this line");
    expect(recovered?.versions[0].rows.find((row) => row.id === comment.anchor.rowId)?.words).toBe("");
  });

  it("keeps a new Edit comment without retaining the sample video filename", () => {
    const comment = { ...reviewVideo.comments[0], id: "authored-comment", body: "Please adjust this cut", versionLabel: "v2" };
    const recovered = recoverLegacyEditReview({
      versions: structuredClone(reviewVersions),
      comments: [{ ...reviewVideo.comments[0], versionLabel: "v2" }, comment],
      resolvedIds: [],
      statuses: {},
    });

    expect(recovered?.comments.map((item) => item.body)).toEqual(["Please adjust this cut"]);
    expect(recovered?.versions.map((version) => version.fileName)).toEqual(["Recovered review notes"]);
    expect(recovered?.versions[0].sourceUrl).toBeUndefined();
  });

  it("keeps a Masters rename while removing Good Citizens sample assets", () => {
    const sample = structuredClone(initialMastersDeliverables[0]);
    const clean = { ...sample, id: "loom-main", name: "Loom main", status: "not_started" as const,
      versions: [], comments: [], srt: undefined, thumbnail: undefined };
    const recovered = recoverLegacyMastersDeliverables([{ ...sample, name: "My renamed master" }], [clean]);

    expect(recovered[0].name).toBe("My renamed master");
    expect(recovered[0].versions).toEqual([]);
    expect(recovered[0].comments).toEqual([]);
    expect(recovered[0].srt).toBeUndefined();
    expect(mergeRecoveredMastersDeliverables([clean], recovered, [clean])[0].name)
      .toBe("My renamed master");
  });
});
