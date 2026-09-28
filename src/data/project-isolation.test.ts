import { describe, expect, it } from "vitest";
import { chatClients, chatProjects } from "@/data/chat";
import { getChatUsers, getScopedChatClient, getScopedChatProject } from "@/data/chat-access";
import { getMockBriskAiResponse } from "@/data/brisk-ai";
import { createPopulatedStudioFixture } from "@/data/prototype-state";
import { transcriptClips } from "@/data/transcripts";
import { correctFormerLoomSeedName, initialMediaAssets } from "@/data/media";

describe("project and Client fixture isolation", () => {
  it("uses the canonical Client membership instead of Chat's older cross-client fixture", () => {
    const state = createPopulatedStudioFixture();
    const hims = getScopedChatProject(chatProjects.find((project) => project.id === "hims-product-education")!, state);
    const himsClient = getScopedChatClient(chatClients.find((client) => client.name === "Hims")!, state);
    const users = getChatUsers(state);

    expect(hims?.clientMemberIds).toEqual(["hims-contact-1"]);
    expect(hims?.memberIds).not.toContain("user-jess");
    expect(himsClient.userIds).toEqual(["hims-contact-1"]);
    expect(users.find((user) => user.id === "hims-contact-1")?.email).toBe("noah@hims.com");
  });

  it("keeps Loom's Client membership on Loom projects", () => {
    const state = createPopulatedStudioFixture();
    const loom = getScopedChatProject(chatProjects.find((project) => project.id === "loom-launch-film")!, state);

    expect(loom?.clientMemberIds).toContain("user-jess");
    expect(loom?.clientMemberIds).not.toContain("hims-contact-1");
  });

  it("does not draft Loom content for another project's AI context", () => {
    const response = getMockBriskAiResponse("Draft this script", "script", "hims-product-education");

    expect(response.draft).toBeUndefined();
    expect(JSON.stringify(response)).not.toMatch(/Loom|sales story/iu);
  });

  it("keeps Loom transcripts free of Harbour Health content", () => {
    const loomText = transcriptClips
      .filter((clip) => clip.projectId === "loom-launch-film")
      .flatMap((clip) => clip.paragraphs.map((paragraph) => paragraph.text))
      .join(" ");

    expect(loomText).toContain("Loom");
    expect(loomText).not.toMatch(/Harbour Health|Mia Chen|family|families|clinician/iu);
  });

  it("corrects only the old Loom seed filename in a stored media record", () => {
    const seeded = initialMediaAssets.find((asset) => asset.id === "media-01")!;
    expect(correctFormerLoomSeedName({ ...seeded, name: "Mia-interview-camera-a.mov" }).name)
      .toBe("Jess-interview-camera-a.mov");
    expect(correctFormerLoomSeedName({ ...seeded, name: "Custom interview.mov" }).name)
      .toBe("Custom interview.mov");
  });
});
