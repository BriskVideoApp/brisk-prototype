import { describe, expect, it } from "vitest";
import { createInitialBriefFields } from "@/data/brief";
import {
  createRecommendedStudioBriefConfiguration,
  getStudioBrandContrastText,
  getStudioBrandColours,
  restoreStudioFollowUpAnswersFromReview,
  type StudioReviewDraft,
} from "@/data/studio-onboard";
import {
  addClientToPrototypeState,
  clonePrototypeState,
  commitStudioSetupState,
  createOnboardingEmptyFixture,
  createPopulatedStudioFixture,
  createProjectFromStudioTemplateState,
  getActiveProjectCount,
  inviteClientTeammateState,
  inviteClientToProjectState,
  northStarWorkspaceId,
  selectClientPortalData,
  selectClientProjects,
  selectScopedClient,
  selectWorkspaceProjects,
  updateOnboardingProgressState,
  updateProjectBriefState,
  updateStudioBriefTemplateState,
} from "@/data/prototype-state";

const studioDraft: StudioReviewDraft = {
  view: "studio-setup",
  studioName: "North Star Films",
  logoPreviewUrl: null,
  logoOptions: [],
  brandAccentId: "purple",
  brandColours: [
    { hex: "#6DE5FA", role: "primary" },
    { hex: "#8B2CFF", role: "supporting" },
  ],
  studioType: "Full-service production Studio",
  studioDescription: "Films for purpose-driven organisations.",
  videoTypeIds: ["Brand Film", "Documentary", "Live Action"],
  customVideoTypes: [
    { name: "Interview series", iconId: "bezier-curve" },
    { name: "Recruitment films", iconId: "folder" },
  ],
  customVideoType: "Interview series",
  briefConfiguration: createRecommendedStudioBriefConfiguration(),
};

function createFirstProjectState() {
  const committed = commitStudioSetupState(createOnboardingEmptyFixture(), studioDraft);
  const clientResult = addClientToPrototypeState(committed, { name: "Good Citizens" }, "good-citizens");
  const projectResult = createProjectFromStudioTemplateState(clientResult.state, {
    clientId: clientResult.client.id,
    name: "Good Citizens Impact Story",
    requestedId: "good-citizens-impact-story",
  });
  if (!projectResult) throw new Error("Expected the first project to be created");
  return { client: clientResult.client, project: projectResult.project, state: projectResult.state };
}

describe("prototype workspace and Client isolation", () => {
  it("never resolves Loom data for Harbour Health", () => {
    const state = createPopulatedStudioFixture();
    const portal = selectClientPortalData(state, northStarWorkspaceId, "harbour-health", { kind: "studio-preview" });

    expect(portal?.client.name).toBe("Harbour Health");
    expect(portal?.projects.map((project) => project.clientId)).toEqual(["harbour-health"]);
    expect(portal?.projects.some((project) => /loom/iu.test(`${project.clientName} ${project.name}`))).toBe(false);
  });

  it("returns no Client data for missing or mismatched workspace and Client IDs", () => {
    const state = createPopulatedStudioFixture();

    expect(selectScopedClient(state, "missing-workspace", "loom")).toBeNull();
    expect(selectScopedClient(state, northStarWorkspaceId, "missing-client")).toBeNull();
    expect(selectClientPortalData(state, "missing-workspace", "loom", { kind: "studio-preview" })).toBeNull();
    expect(selectClientPortalData(state, northStarWorkspaceId, "missing-client", { kind: "studio-preview" })).toBeNull();
  });
});

describe("onboarding-empty fixture", () => {
  it("contains only the provisional Studio and signed-in Studio Staff user", () => {
    const state = createOnboardingEmptyFixture();

    expect(state.fixtureKind).toBe("onboarding-empty");
    expect(state.workspaces).toEqual([expect.objectContaining({ name: "North Star Films", status: "provisional" })]);
    expect(state.users).toEqual([expect.objectContaining({ role: "Studio Staff" })]);
    expect(state.clients).toEqual([]);
    expect(state.projects).toEqual([]);
    expect(state.invitations).toEqual([]);
    expect(state.projectBriefSnapshots).toEqual([]);
  });

  it("creates a fresh fixture on reset", () => {
    const first = createOnboardingEmptyFixture();
    first.workspaces[0].name = "Changed locally";
    first.clients.push({} as never);
    const reset = createOnboardingEmptyFixture();

    expect(reset.workspaces[0].name).toBe("North Star Films");
    expect(reset.clients).toEqual([]);
    expect(reset).not.toBe(first);
  });

  it("serialises the in-progress onboarding checkpoint for resume", () => {
    const progressed = updateOnboardingProgressState(createOnboardingEmptyFixture(), {
      view: "ai-setup",
      aiPhase: "follow-up",
      followUpStepId: "production-model",
      hasAnalysedStudio: true,
      studioAnswer: {
        studioDescription: "Documentary-led films for purpose-driven organisations.",
        sources: [{ id: "source-website", type: "website", label: "https://northstarfilms.com.au" }],
      },
      followUpAnswers: {
        contextualAnswer: "We develop them with clients",
        productionModel: null,
        productionScale: null,
        videoTypeIds: ["Brand Film"],
        customVideoTypes: [
          { name: "Interview series", iconId: "bezier-curve" },
          { name: "Recruitment films", iconId: "folder" },
        ],
        customVideoType: "Interview series",
      },
    });
    const resumed = clonePrototypeState(progressed);

    expect(resumed.onboarding).toEqual(expect.objectContaining({
      view: "ai-setup",
      aiPhase: "follow-up",
      followUpStepId: "production-model",
      hasAnalysedStudio: true,
    }));
    expect(resumed.onboarding.followUpAnswers?.contextualAnswer).toBe("We develop them with clients");
    expect(resumed.onboarding.followUpAnswers?.customVideoType).toBe("Interview series");
    expect(resumed.onboarding.followUpAnswers?.customVideoTypes).toHaveLength(2);
  });

  it("restores the latest Review products when returning to the final setup question", () => {
    const restored = restoreStudioFollowUpAnswersFromReview({
      contextualAnswer: "We develop them with clients",
      productionModel: "post-production-only",
      productionScale: null,
      videoTypeIds: ["Brand Film"],
      customVideoTypes: [],
      customVideoType: null,
    }, studioDraft);

    expect(restored.videoTypeIds).toEqual(studioDraft.videoTypeIds);
    expect(restored.customVideoTypes).toEqual(studioDraft.customVideoTypes);
    expect(restored.customVideoTypes).not.toBe(studioDraft.customVideoTypes);
  });
});

describe("Studio Brand Kit colours", () => {
  it("commits the full palette to the canonical workspace used by the Client portal", () => {
    const { client, state } = createFirstProjectState();
    const workspace = state.workspaces.find((candidate) => candidate.id === northStarWorkspaceId);
    const portal = selectClientPortalData(state, northStarWorkspaceId, client.id, { kind: "studio-preview" });

    expect(workspace?.brandColours).toEqual(studioDraft.brandColours);
    expect(portal?.workspace.brandColours).toEqual(studioDraft.brandColours);
    expect(workspace?.brandColours).not.toBe(studioDraft.brandColours);
  });

  it("chooses readable black or white text for the primary colour", () => {
    expect(getStudioBrandContrastText("#6DE5FA")).toBe("#000000");
    expect(getStudioBrandContrastText("#8B2CFF")).toBe("#FFFFFF");
  });

  it("falls back to Brisk Purple when the saved palette is empty", () => {
    expect(getStudioBrandColours({ brandColours: [] })).toEqual([
      { hex: "#8B2CFF", role: "primary" },
    ]);
  });
});

describe("first project activation", () => {
  it("persists a Client teammate invitation without granting project access", () => {
    const committed = commitStudioSetupState(createOnboardingEmptyFixture(), studioDraft);
    const { client, state } = addClientToPrototypeState(committed, { name: "Good Citizens" }, "good-citizens");
    const invited = inviteClientTeammateState(state, {
      clientId: client.id,
      name: "Ava Green",
      email: "ava@goodcitizens.org",
    });
    const clientUser = invited.users.find((user) => user.email === "ava@goodcitizens.org");
    if (!clientUser) throw new Error("Expected an invited Client user");

    expect(invited.invitations).toEqual([expect.objectContaining({
      workspaceId: northStarWorkspaceId,
      clientId: client.id,
      projectIds: [],
      status: "Pending",
    })]);
    expect(invited.clients[0].contacts).toEqual([expect.objectContaining({
      email: "ava@goodcitizens.org",
      projectIds: [],
      portalAccess: "Invited",
    })]);
    expect(selectClientPortalData({
      ...invited,
      session: { ...invited.session, activeUserId: clientUser.id, activeClientId: client.id },
    }, northStarWorkspaceId, client.id, { kind: "external" })).toBeNull();
  });

  it("updates Videos, the Client profile and the scoped portal preview immediately", () => {
    const { client, project, state } = createFirstProjectState();

    expect(selectWorkspaceProjects(state, northStarWorkspaceId).map(({ id }) => id)).toContain(project.id);
    expect(selectClientProjects(state, northStarWorkspaceId, client.id).map(({ id }) => id)).toContain(project.id);
    expect(selectClientPortalData(state, northStarWorkspaceId, client.id, { kind: "studio-preview" })?.projects.map(({ id }) => id)).toContain(project.id);
  });

  it("clones the Studio Brief template into an independent project snapshot", () => {
    const { project, state } = createFirstProjectState();
    const template = state.studioBriefTemplates[0];
    const snapshot = state.projectBriefSnapshots.find((candidate) => candidate.projectId === project.id);

    expect(snapshot?.sourceTemplateId).toBe(template.id);
    expect(snapshot?.fields).toEqual(template.fields);
    expect(snapshot?.fields).not.toBe(template.fields);
    expect(template.customVideoType).toBe("Interview series");
    expect(snapshot?.customVideoType).toBe("Interview series");
    expect(template.customVideoTypes).toEqual(studioDraft.customVideoTypes);
    expect(snapshot?.customVideoTypes).toEqual(studioDraft.customVideoTypes);
    expect(snapshot?.customVideoTypes).not.toBe(template.customVideoTypes);

    const editedFields = createInitialBriefFields();
    editedFields.workingTitle.value = "A project-only title";
    const edited = updateProjectBriefState(state, project.id, editedFields);

    expect(edited.projectBriefSnapshots.find((candidate) => candidate.projectId === project.id)?.fields.workingTitle.value).toBe("A project-only title");
    expect(edited.studioBriefTemplates[0].fields.workingTitle.value).toBe("");
  });

  it("applies Studio Brief default changes only to future projects", () => {
    const { project, state } = createFirstProjectState();
    const snapshotBefore = clonePrototypeState(state).projectBriefSnapshots.find((candidate) => candidate.projectId === project.id);
    const template = state.studioBriefTemplates[0];
    const updated = updateStudioBriefTemplateState(state, {
      configuration: {
        ...template.configuration,
        excludedFieldIds: ["audience"],
      },
      videoTypeIds: ["Documentary"],
      customVideoTypes: [{ name: "Founder stories", iconId: "globe" }],
      customVideoType: "Founder stories",
    });
    const snapshotAfter = updated.projectBriefSnapshots.find((candidate) => candidate.projectId === project.id);

    expect(updated.studioBriefTemplates[0].videoTypeIds).toEqual(["Documentary"]);
    expect(updated.studioBriefTemplates[0].configuration.excludedFieldIds).toEqual(["audience"]);
    expect(snapshotAfter).toEqual(snapshotBefore);
    expect(snapshotAfter?.configuration.excludedFieldIds).toEqual([]);
  });

  it("keeps a Queued project visible without counting it as active", () => {
    const { project, state } = createFirstProjectState();

    expect(project.status).toBe("Queued");
    expect(project.briefStatus).toBe("Not sent");
    expect(selectWorkspaceProjects(state, northStarWorkspaceId)).toContainEqual(expect.objectContaining({ id: project.id }));
    expect(getActiveProjectCount(selectWorkspaceProjects(state, northStarWorkspaceId))).toBe(0);
  });

  it("inviting the Client moves the project and Brief into production", () => {
    const { client, project, state } = createFirstProjectState();
    const invited = inviteClientToProjectState(state, {
      clientId: client.id,
      projectId: project.id,
      name: "Ava Green",
      email: "ava@goodcitizens.org",
    });
    const updatedProject = selectWorkspaceProjects(invited, northStarWorkspaceId)
      .find((candidate) => candidate.id === project.id);

    expect(updatedProject).toEqual(expect.objectContaining({
      status: "In Production",
      briefStatus: "Waiting on Client",
    }));
    expect(updatedProject?.stages.brief.state).toBe("waiting");
    expect(invited.invitations).toEqual([expect.objectContaining({
      workspaceId: northStarWorkspaceId,
      clientId: client.id,
      projectIds: [project.id],
      status: "Pending",
    })]);
    expect(getActiveProjectCount(selectWorkspaceProjects(invited, northStarWorkspaceId))).toBe(1);
  });

  it("requires both an invitation and project membership for external access", () => {
    const { client, project, state } = createFirstProjectState();
    const beforeInvite = {
      ...state,
      session: { ...state.session, activeUserId: "missing-client-user", activeClientId: client.id },
    };
    expect(selectClientPortalData(beforeInvite, northStarWorkspaceId, client.id, { kind: "external" })).toBeNull();

    const invited = inviteClientToProjectState(state, {
      clientId: client.id,
      projectId: project.id,
      name: "Ava Green",
      email: "ava@goodcitizens.org",
    });
    const clientUser = invited.users.find((user) => user.email === "ava@goodcitizens.org");
    if (!clientUser) throw new Error("Expected an invited Client user");
    const externalState = {
      ...invited,
      session: { ...invited.session, activeUserId: clientUser.id, activeClientId: client.id },
    };

    expect(selectClientPortalData(externalState, northStarWorkspaceId, client.id, { kind: "external" })?.projects)
      .toEqual([expect.objectContaining({ id: project.id })]);
    expect(selectClientPortalData(externalState, northStarWorkspaceId, "another-client", { kind: "external" })).toBeNull();
  });
});
