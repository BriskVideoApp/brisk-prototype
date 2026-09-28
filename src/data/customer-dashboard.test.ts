import { describe, expect, it } from "vitest";
import { customerDashboardProjects, withSavedClientStageStatus } from "@/data/customer-dashboard";
import { createPopulatedStudioFixture } from "@/data/prototype-state";

describe("Client review cards", () => {
  const seededProject = customerDashboardProjects.find((candidate) => candidate.id === "loom-customer-stories")!;
  const project = {
    ...seededProject,
    statusDetail: "Waiting on you" as const,
    stages: { ...seededProject.stages, edit: { state: "waiting" as const } },
  };

  it("does not advertise a seeded Edit version that the project does not have", () => {
    expect(seededProject.statusDetail).toBe("Waiting on studio");
    expect(seededProject.stages.edit.state).toBe("in_progress");
    expect(seededProject.latestAction.label).not.toContain("shared");
    const storedProject = createPopulatedStudioFixture().projects.find((candidate) => candidate.id === seededProject.id);
    expect(storedProject?.stages.edit.state).toBe("in_progress");
  });

  it("removes an approved Edit from the Client review queue", () => {
    const stages = { ...project.stages, edit: { state: "done" as const, daysAgo: 0 } };
    const updated = withSavedClientStageStatus(project, stages, "Loom");

    expect(updated.statusDetail).toBe("Waiting on studio");
    expect(updated.stages.edit.state).toBe("done");
  });

  it("keeps a saved request for Client review in the review queue", () => {
    const stages = { ...project.stages, edit: { state: "waiting" as const, assignedTo: "Loom" } };
    const updated = withSavedClientStageStatus(project, stages, "Loom");

    expect(updated.statusDetail).toBe("Waiting on you");
  });

  it("moves a request sent to the Studio out of the Client review queue", () => {
    const stages = { ...project.stages, edit: { state: "waiting" as const, assignedTo: "North Star Films" } };
    const updated = withSavedClientStageStatus(project, stages, "Loom");

    expect(updated.statusDetail).toBe("Waiting on studio");
  });

  it("keeps the seeded review card until its stage changes", () => {
    expect(withSavedClientStageStatus(project, project.stages, "Loom").statusDetail).toBe("Waiting on you");
  });
});
