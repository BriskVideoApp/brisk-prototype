import { describe, expect, it } from "vitest";
import { canActOnProject, canViewProject, type PrototypeViewer } from "@/data/prototype-access";
import { createPopulatedStudioFixture, northStarWorkspaceId, updateProjectTeamState } from "@/data/prototype-state";
import { getPrototypeFreelancerViewer } from "@/components/prototype-state/usePrototypeViewer";
import { getMediaCapabilities } from "@/lib/media";
import { getAcceptedFreelancerEngagements, getFreelancerEngagements, getPendingFreelancerEngagements } from "@/data/freelancer-videos";
import { initialContractorOffers } from "@/data/costs";

const state = createPopulatedStudioFixture();
const staff: PrototypeViewer = { role: "Studio Staff", id: "user-tom", name: "Tom Mitchell", email: "tom@northstarfilms.com.au", workspaceId: northStarWorkspaceId, clientId: null, personId: "te", chatUserId: "user-tom" };
const client: PrototypeViewer = { role: "Customer", id: "client-jess", name: "Jess Taylor", email: "jess@loom.com", workspaceId: northStarWorkspaceId, clientId: "loom", personId: null, chatUserId: "user-jess" };
const freelancer: PrototypeViewer = { role: "Studio Freelancer", id: "user-nina", name: "Nina Patel", email: "nina@patelvfx.com", workspaceId: northStarWorkspaceId, clientId: null, personId: "np", chatUserId: "user-nina" };
const loom = state.projects.find((project) => project.id === "loom-launch-film")!;
const otherClient = state.projects.find((project) => project.clientId === "harbour-health")!;
const ninaProject = state.projects.find((project) => project.team.some((slot) => slot.invitations.some((invitation) => invitation.personId === "np" && invitation.status === "accepted" && slot.acceptedInvitationId === invitation.id)))!;
const unassigned = state.projects.find((project) => !project.team.some((slot) => slot.invitations.some((invitation) => invitation.personId === "np" && invitation.status === "accepted" && slot.acceptedInvitationId === invitation.id)))!;

describe("prototype project access", () => {
  it("keeps the Studio Owner on normal projects and stages", () => {
    expect(canViewProject(staff, loom, state)).toBe(true);
    expect(canActOnProject(staff, loom, state, "status")).toBe(true);
    expect(canActOnProject(staff, loom, state, "upload", "edit")).toBe(true);
  });

  it("limits the Client to invited projects in the matching Client account", () => {
    expect(canViewProject(client, loom, state)).toBe(true);
    expect(canViewProject(client, otherClient, state)).toBe(false);
    expect(canActOnProject(client, loom, state, "approve", "edit")).toBe(true);
    expect(canActOnProject(client, loom, state, "status")).toBe(false);
    expect(canActOnProject(client, loom, state, "upload", "edit")).toBe(false);
  });

  it("limits the Freelancer to accepted assignments and assigned stages", () => {
    expect(canViewProject(freelancer, ninaProject, state)).toBe(true);
    expect(canViewProject(freelancer, unassigned, state)).toBe(false);
    expect(canActOnProject(freelancer, ninaProject, state, "status")).toBe(false);
    expect(canActOnProject(freelancer, unassigned, state, "upload", "masters")).toBe(false);
  });

  it("rejects access outside the active workspace and paused Client contacts", () => {
    expect(canViewProject({ ...staff, workspaceId: "elsewhere" }, loom, state)).toBe(false);
    const paused = structuredClone(state);
    const contact = paused.clients.find((candidate) => candidate.id === "loom")?.contacts.find((candidate) => candidate.id === "client-jess");
    if (!contact) throw new Error("Jess fixture missing");
    contact.portalAccess = "Paused";
    expect(canViewProject(client, loom, paused)).toBe(false);
  });

  it("keeps media actions tied to membership even when Test Mode shows every page", () => {
    expect(canActOnProject(client, loom, state, "upload", "media")).toBe(true);
    expect(canActOnProject(client, loom, state, "status", "media")).toBe(false);
    expect(canActOnProject(client, otherClient, state, "upload", "media")).toBe(false);
    expect(canActOnProject(freelancer, ninaProject, state, "upload", "media")).toBe(true);
    expect(canActOnProject(freelancer, unassigned, state, "upload", "media")).toBe(false);
    expect(getMediaCapabilities("Customer", loom.id, state.projects, true).canDelete).toBe(false);
    expect(getMediaCapabilities("Studio Freelancer", ninaProject.id, state.projects, true).canDelete).toBe(false);
    expect(getMediaCapabilities("Studio Staff", loom.id, state.projects, true).canDelete).toBe(true);
  });

  it("revokes a Freelancer when the active project team changes", () => {
    const removed = updateProjectTeamState(state, ninaProject.id, ninaProject.team.map((slot) => ({
      ...slot,
      invitations: slot.invitations.filter((invitation) => invitation.personId !== freelancer.personId),
    })));
    expect(canViewProject(freelancer, ninaProject, removed)).toBe(false);
    expect(canActOnProject(freelancer, ninaProject, removed, "edit", "edit")).toBe(false);
  });

  it("grants a newly accepted Freelancer assignment from the active team", () => {
    const slot = unassigned.team[0];
    const invitationId = `${slot.id}-np-accepted`;
    const assigned = updateProjectTeamState(state, unassigned.id, [{
      ...slot,
      acceptedInvitationId: invitationId,
      invitations: [...slot.invitations, { id: invitationId, personId: "np", status: "accepted", sentAt: "2026-09-25T09:00:00+10:00" }],
    }, ...unassigned.team.slice(1)]);
    expect(canViewProject(freelancer, unassigned, assigned)).toBe(true);
    expect(canActOnProject(freelancer, unassigned, assigned, "edit", slot.stages[0].stageId)).toBe(true);
    expect(initialContractorOffers.some((offer) => offer.projectId === unassigned.id && offer.contractorId === "np")).toBe(false);
    expect(getAcceptedFreelancerEngagements(assigned.projects, "np").map((engagement) => engagement.project.id)).toContain(unassigned.id);
    expect(getAcceptedFreelancerEngagements(state.projects, "np").map((engagement) => engagement.project.id)).not.toContain(unassigned.id);
  });

  it("removes a withdrawn assignment from active Freelancer jobs", () => {
    const removed = updateProjectTeamState(state, ninaProject.id, ninaProject.team.map((slot) => ({
      ...slot,
      acceptedInvitationId: undefined,
      invitations: slot.invitations.map((invitation) => invitation.personId === "np" ? { ...invitation, status: "withdrawn" as const } : invitation),
    })));
    expect(getAcceptedFreelancerEngagements(state.projects, "np").map((engagement) => engagement.project.id)).toContain(ninaProject.id);
    expect(getAcceptedFreelancerEngagements(removed.projects, "np").map((engagement) => engagement.project.id)).not.toContain(ninaProject.id);
  });

  it("uses the latest accepted invitation when the same Freelancer is reassigned", () => {
    const acceptedSlot = ninaProject.team.find((slot) => slot.acceptedInvitationId
      && slot.invitations.some((invitation) => invitation.id === slot.acceptedInvitationId && invitation.personId === "np"));
    if (!acceptedSlot) throw new Error("Nina's assignment fixture is missing");
    const invitationId = `${acceptedSlot.id}-np-reassigned`;
    const reassigned = updateProjectTeamState(state, ninaProject.id, ninaProject.team.map((slot) => slot.id === acceptedSlot.id ? {
      ...slot,
      acceptedInvitationId: invitationId,
      invitations: [
        ...slot.invitations.map((invitation) => invitation.personId === "np" ? { ...invitation, status: "withdrawn" as const } : invitation),
        { id: invitationId, personId: "np", status: "accepted" as const, sentAt: "2026-09-25T09:00:00+10:00" },
      ],
    } : slot));
    expect(getAcceptedFreelancerEngagements(reassigned.projects, "np").find((engagement) => engagement.project.id === ninaProject.id)?.invitationId).toBe(invitationId);
  });

  it("uses the selected Freelancer scenario participant", () => {
    const jordan = getPrototypeFreelancerViewer(northStarWorkspaceId, "Jordan Lee");
    expect(jordan?.personId).toBe("jl");
    expect(jordan?.name).toBe("Jordan Lee");
    expect(jordan?.email).toBe("jordan@leevisuals.com");
    expect(getPrototypeFreelancerViewer(northStarWorkspaceId)?.personId).toBe("np");
    expect(getPrototypeFreelancerViewer(northStarWorkspaceId, "Unknown Person")).toBeNull();
    const jordanProjects = getFreelancerEngagements(state.projects, jordan?.personId ?? "")
      .filter((engagement) => engagement.invitationStatus === "accepted")
      .map((engagement) => engagement.project.id);
    expect(jordanProjects).toContain("deel-customer-story");
    expect(jordanProjects).not.toContain("figma-config-highlights");
    const deel = state.projects.find((project) => project.id === "deel-customer-story")!;
    expect(getMediaCapabilities("Studio Freelancer", deel.id, [deel], false, "jl").canUpload).toBe(true);
    expect(getMediaCapabilities("Studio Freelancer", deel.id, [deel], false, "np").canUpload).toBe(false);
  });

  it("does not offer a withdrawn invitation as open work", () => {
    const jordanPending = getPendingFreelancerEngagements(state.projects, "jl").find((engagement) =>
      engagement.project.id === "loom-launch-film");
    if (!jordanPending) throw new Error("Jordan's pending invitation fixture is missing");
    const withdrawn = updateProjectTeamState(state, loom.id, loom.team.map((slot) => slot.id === jordanPending.roleSlotId ? {
      ...slot,
      invitations: slot.invitations.map((invitation) => invitation.id === jordanPending.invitationId
        ? { ...invitation, status: "withdrawn" as const } : invitation),
    } : slot));
    expect(getPendingFreelancerEngagements(withdrawn.projects, "jl").map((engagement) => engagement.invitationId)).not.toContain(jordanPending.invitationId);
  });
});
