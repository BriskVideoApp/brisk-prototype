import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { Project } from "@/components/active-videos/types";
import type { PrototypeViewer } from "@/data/prototype-access";
import { createPopulatedStudioFixture, northStarWorkspaceId, type PrototypeState } from "@/data/prototype-state";
import { getAccessLevelRole, prototypeAccessLevels } from "@/data/prototype-permissions";
import { addWorkingDays, countdown, defaultTurnaround, extraVideoDays } from "@/data/turnaround";
import { deliveryAgreementSide, deliveryInstant, type ProjectDeliveryAgreement } from "@/data/project-delivery";
import { TurnaroundProvider, useTurnaround } from "./TurnaroundContext";
import { ProjectTimingProvider, useProjectTiming } from "./ProjectTimingContext";
import { DeadlineDialogProvider, ProjectDeadlineLink } from "./DeadlineDialogContext";
import { FinalDeliveryPage } from "./FinalDeliveryPage";
import { StageDeadlinePanel } from "./StageDeadlinePanel";
import { ProjectTimingWarning } from "./ProjectTimingNotice";

// Exercise the real timing providers, permissions, persistence and UI with isolated
// fixture state. Router and unrelated app providers are the only mocked boundaries.
const fixture = vi.hoisted(() => ({
  state: null as unknown as PrototypeState,
  viewer: null as PrototypeViewer | null,
  completed: {} as Record<string, unknown>,
  push: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: fixture.push, replace: fixture.push }), useSearchParams: () => new URLSearchParams(), usePathname: () => "/active-videos" }));
vi.mock("@/components/prototype-state/PrototypeStateContext", () => ({ usePrototypeState: () => ({ state: fixture.state, hasHydrated: true }) }));
vi.mock("@/components/prototype-state/usePrototypeViewer", () => ({ usePrototypeViewer: () => fixture.viewer }));
vi.mock("@/components/navigation/PrototypeRoleContext", () => ({ usePrototypeRole: () => ({ selectedRole: fixture.viewer?.role, hasLoadedRole: true }) }));
vi.mock("@/components/prototype-scenarios/PrototypeScenarioContext", () => ({ usePrototypeScenario: () => ({ activeScenario: null, hasLoadedScenario: true }) }));
vi.mock("@/components/settings/StudioSettingsContext", () => ({ useStudioSettings: () => ({ hasHydrated: true, studio: { details: { name: "ChopChop", timezone: "Australia/Sydney" }, production: {} } }) }));
vi.mock("@/components/project/ProjectStageStatusContext", () => ({ useProjectStageStatus: () => ({ hasHydrated: true, getProjectStages: (project: Project) => project.stages }) }));
vi.mock("@/components/storyboard/StoryboardContext", () => ({ useStoryboard: () => ({ hasHydrated: true, getStoryboardStatus: () => ({ state: "done" }) }) }));
vi.mock("@/components/project/ProjectFlowContext", () => ({ useProjectFlow: () => ({ getProjectFlow: () => ({ stages: ["brief", "script", "edit", "masters"], postProductionTerm: "edit" }) }) }));
vi.mock("@/components/project/ProjectCompletionContext", () => ({ useProjectCompletion: () => ({ completionRecords: fixture.completed }) }));

const now = "2026-11-03T00:00:00.000Z";
const internal = "2026-11-05T00:00:00.000Z";
const clientDate = "2026-11-06T00:00:00.000Z";
const finalDate = "2026-11-20T06:00:00.000Z";
const laterDate = "2026-11-24T06:00:00.000Z";
const project = () => fixture.state.projects[0];
const staff: PrototypeViewer = { role: "Studio Staff", id: "user-tom", name: "Tom", email: "tom@example.test", workspaceId: northStarWorkspaceId, clientId: null, personId: "te", chatUserId: "user-tom" };
const client: PrototypeViewer = { role: "Customer", id: "client-jess", name: "Jess", email: "jess@loom.com", workspaceId: northStarWorkspaceId, clientId: "loom", personId: null, chatUserId: "user-jess" };
const freelancer: PrototypeViewer = { ...staff, role: "Studio Freelancer", id: "user-nina", personId: "np", name: "Nina", chatUserId: "user-nina" };
function Providers({ children }: { children: ReactNode }) {
  return <TurnaroundProvider><ProjectTimingProvider><DeadlineDialogProvider>{children}</DeadlineDialogProvider></ProjectTimingProvider></TurnaroundProvider>;
}
function useFlow() { return { timing: useTurnaround(), delivery: useProjectTiming() }; }
function seedStage() {
  window.localStorage.setItem(`brisk-stage-cycles-v1:${northStarWorkspaceId}:default`, JSON.stringify([{
    id: "cycle-edit", projectId: project().id, stage: "edit", startedAt: now, endedAt: null,
    mode: "dates", revision: false, rule: defaultTurnaround.shared, extraDays: 0,
    internalDueAt: internal, clientDueAt: clientDate, timezone: "Australia/Sydney",
  }]));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(now));
  window.localStorage.clear();
  fixture.state = createPopulatedStudioFixture();
  fixture.state.projectBriefSnapshots = [];
  const source = fixture.state.projects.find((entry) => entry.id === "loom-launch-film")!;
  fixture.state.projects = [{ ...source, status: "In Production", deadline: undefined, videoLengthSeconds: 60,
    stages: { ...source.stages, brief: { state: "done" }, script: { state: "done" }, edit: { state: "in_progress" }, masters: { state: "not_started" } } }];
  fixture.viewer = staff;
  fixture.completed = {};
  fixture.push.mockReset();
  // JSDOM has no modal top layer. These shims permit form interaction assertions,
  // but do not verify browser focus trapping, layout or native dialog rendering.
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

it("requires the first Client date to come from the Brief", () => {
  fixture.viewer = client;
  const hook = renderHook(useFlow, { wrapper: Providers });
  act(() => { expect(hook.result.current.delivery.proposeDeliveryDate(project().id, finalDate, "First date")).toBe(false); });
  hook.unmount();
  render(<Providers><FinalDeliveryPage projectId={project().id} /></Providers>);
  expect(screen.getByRole("link", { name: "Brief" })).toHaveAttribute("href", `/projects/${project().id}/stages/brief`);
  expect(screen.queryByRole("button", { name: "Save deadline" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Send proposal" })).not.toBeInTheDocument();
});

it("adopts an approved legacy Brief date once without overwriting a later deadline", () => {
  const snapshot = createPopulatedStudioFixture().projectBriefSnapshots.find((entry) => entry.projectId === project().id)!;
  snapshot.fields = { ...snapshot.fields, deadline: { ...snapshot.fields.deadline, value: "2026-11-20" }, deliverables: { ...snapshot.fields.deliverables, value: "[]" } };
  fixture.state.projectBriefSnapshots = [snapshot];
  const hook = renderHook(useFlow, { wrapper: Providers });
  expect(hook.result.current.delivery.getDeliveryAgreement(project()).agreedDate).toBe(finalDate);
  snapshot.fields.deadline.value = "2026-11-24"; hook.rerender();
  expect(hook.result.current.delivery.getDeliveryAgreement(project()).agreedDate).toBe(finalDate);
  hook.unmount();
  const reopened = renderHook(useFlow, { wrapper: Providers });
  expect(reopened.result.current.delivery.getDeliveryAgreement(project()).originalDate).toBe(finalDate);
});

it.each(prototypeAccessLevels)("only Studio Admin/Staff can save a direct change: %s", (level) => {
  project().deadline = { finalDueAt: clientDate };
  const role = getAccessLevelRole(level);
  fixture.viewer = role === "Customer" ? client : role === "Studio Freelancer" ? { ...freelancer, testPreviewProjectId: project().id } : staff;
  const hook = renderHook(useFlow, { wrapper: Providers });
  act(() => { expect(hook.result.current.delivery.saveDeliveryDate(project().id, finalDate, "Launch date confirmed", clientDate)).toBe(role === "Studio Staff"); });
  expect(hook.result.current.delivery.getDeliveryAgreement(project()).agreedDate).toBe(role === "Studio Staff" ? finalDate : clientDate);
});

it("records direct changes, supersedes pending proposals, rejects stale writes and persists the Client update", () => {
  project().deadline = { finalDueAt: clientDate };
  const hook = renderHook(useFlow, { wrapper: Providers });
  act(() => { hook.result.current.delivery.proposeDeliveryDate(project().id, laterDate, "Proposed timing"); });
  const pending = hook.result.current.delivery.getDeliveryAgreement(project()).proposals[0];
  act(() => { expect(hook.result.current.delivery.saveDeliveryDate(project().id, finalDate, "Confirmed directly", clientDate)).toBe(true); });
  act(() => { expect(hook.result.current.delivery.saveDeliveryDate(project().id, laterDate, "Stale edit", clientDate)).toBe(false); });
  expect(hook.result.current.delivery.getDeliveryAgreement(project()).proposals[0].status).toBe("superseded");
  fixture.viewer = client; hook.rerender();
  act(() => { expect(hook.result.current.delivery.agreeDeliveryDate(project().id, pending.id)).toBe(false); });
  expect(hook.result.current.delivery.messages.some((message) => message.channel === "external" && message.body.includes("Confirmed directly"))).toBe(true);
  hook.unmount();
  const reopened = renderHook(useFlow, { wrapper: Providers });
  expect(reopened.result.current.delivery.getDeliveryAgreement(project()).changes?.[0].previousDate).toBe(clientDate);
  expect(reopened.result.current.delivery.getDeliveryAgreement(project()).agreedDate).toBe(finalDate);
});

it("saves a Studio change through the shared date picker without creating a proposal", () => {
  project().deadline = { finalDueAt: clientDate };
  render(<Providers><DeadlineEntry /></Providers>);
  fireEvent.click(screen.getByRole("link", { name: "Open deadline" }));
  fireEvent.click(screen.getByRole("button", { name: "6 November, 2026" }));
  fireEvent.click(screen.getByRole("button", { name: "Friday, 20 November 2026" }));
  fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Agreed in our call." } });
  fireEvent.click(screen.getByRole("button", { name: "Save deadline" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  cleanup();
  const hook = renderHook(useFlow, { wrapper: Providers });
  const agreement = hook.result.current.delivery.getDeliveryAgreement(project());
  expect(agreement.proposals).toHaveLength(0);
  expect(agreement.changes?.[0].reason).toBe("Agreed in our call.");
  expect(agreement.agreedDate).toBe(deliveryInstant("2026-11-20", "11:00"));
});

it("does not overwrite a deadline changed in another tab while the Studio is editing", () => {
  project().deadline = { finalDueAt: clientDate };
  render(<Providers><DeadlineEntry /></Providers>);
  fireEvent.click(screen.getByRole("link", { name: "Open deadline" }));
  fireEvent.click(screen.getByRole("button", { name: "6 November, 2026" }));
  fireEvent.click(screen.getByRole("button", { name: "Friday, 20 November 2026" }));
  fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Local draft" } });
  const agreement: ProjectDeliveryAgreement = { projectId: project().id, originalDate: clientDate, agreedDate: laterDate, proposals: [] };
  const key = `brisk-timing-warnings-v1:${northStarWorkspaceId}:default`;
  act(() => {
    window.localStorage.setItem(key, JSON.stringify({ issues: [], readBy: {}, deliveries: [agreement] }));
    window.dispatchEvent(new StorageEvent("storage", { key }));
  });
  fireEvent.click(screen.getByRole("button", { name: "Save deadline" }));
  expect(screen.getByRole("alert")).toHaveTextContent("The deadline has changed");
  cleanup();
  const hook = renderHook(useFlow, { wrapper: Providers });
  expect(hook.result.current.delivery.getDeliveryAgreement(project()).agreedDate).toBe(laterDate);
});

describe("deadline calculations", () => {
  it("skips weekends, preserves local time through daylight saving, and applies length bands", () => {
    expect(addWorkingDays("2026-10-02T07:00:00.000Z", 1, "Australia/Sydney")).toBe("2026-10-05T06:00:00.000Z");
    expect(countdown(clientDate, Date.parse(now), "Australia/Sydney")).toBe("3 working days left");
    expect(countdown(now, Date.parse(now) + 1, "Australia/Sydney")).toBe("Overdue");
    expect([70, 71, 130, 131].map((seconds) => extraVideoDays(seconds, 1))).toEqual([0, 1, 1, 2]);
  });

  it("distinguishes a future weekend deadline from a deadline today", () => {
    expect(countdown("2026-11-08T06:00:00.000Z", Date.parse("2026-11-06T00:00:00.000Z"), "Australia/Sydney")).toBe("Due Sun");
    expect(countdown("2026-11-07T06:00:00.000Z", Date.parse("2026-11-06T00:00:00.000Z"), "Australia/Sydney")).toBe("Due Sat");
    expect(countdown("2026-11-08T06:00:00.000Z", Date.parse("2026-11-07T13:00:00.000Z"), "Australia/Sydney")).toBe("Due today");
  });
});

describe("stage deadlines", () => {
  it("does not start existing stages on load; saves specific dates, rejects reversed dates, and persists", () => {
    const hook = renderHook(useFlow, { wrapper: Providers });
    expect(hook.result.current.timing.getActiveDeadlines(project())[0].dueAt).toBeNull();
    act(() => { expect(hook.result.current.timing.saveDeadline(project(), "edit", "dates", clientDate, internal)).toBe(false); });
    act(() => { expect(hook.result.current.timing.saveDeadline(project(), "edit", "dates", internal, clientDate)).toBe(true); });
    expect(hook.result.current.timing.getActiveDeadlines(project())[0].dueAt).toBe(clientDate);
    hook.unmount();
    const reopened = renderHook(useFlow, { wrapper: Providers });
    expect(reopened.result.current.timing.getActiveDeadlines(project())[0].internalDueAt).toBe(internal);
  });

  it("starts a timer on handover and a revision timer on return from Client review", () => {
    project().stages.edit = { state: "not_started" };
    const hook = renderHook(useFlow, { wrapper: Providers });
    project().stages.edit = { state: "in_progress" }; hook.rerender();
    expect(hook.result.current.timing.getActiveDeadlines(project())[0].cycle?.revision).toBe(false);
    project().stages.edit = { state: "waiting", assignedTo: "Client" }; hook.rerender();
    expect(hook.result.current.timing.getActiveDeadlines(project())).toHaveLength(0);
    project().stages.edit = { state: "waiting", assignedTo: "ChopChop" }; hook.rerender();
    expect(hook.result.current.timing.getActiveDeadlines(project())[0].cycle?.revision).toBe(true);
    expect(hook.result.current.timing.getActiveDeadlines(project())[0].internalDueAt).toBeNull();
  });

  it("retains paused dates but prevents editing, and removes completed stage timers", () => {
    seedStage(); project().status = "Paused";
    const hook = renderHook(useFlow, { wrapper: Providers });
    expect(hook.result.current.timing.getActiveDeadlines(project())[0].dueAt).toBe(clientDate);
    act(() => { expect(hook.result.current.timing.saveDeadline(project(), "edit", "automatic", null, null)).toBe(false); });
    project().status = "Completed"; hook.rerender();
    expect(hook.result.current.timing.getActiveDeadlines(project())).toHaveLength(0);
  });
});

describe("delivery agreement and alerts", () => {
  it("keeps the agreed date until Client agreement, supersedes proposals, rejects stale agreement, and persists history", () => {
    project().deadline = { finalDueAt: clientDate };
    const hook = renderHook(useFlow, { wrapper: Providers });
    act(() => { expect(hook.result.current.delivery.proposeDeliveryDate(project().id, finalDate, "Allow time for final checks")).toBe(true); });
    const first = hook.result.current.delivery.getDeliveryAgreement(project()).proposals[0];
    // Persisted proposals from before bilateral changes have no author-side field.
    expect(deliveryAgreementSide({ ...first, proposedByRole: undefined })).toBe("Customer");
    expect(hook.result.current.delivery.getDeliveryAgreement(project()).agreedDate).toBe(clientDate);
    act(() => { expect(hook.result.current.delivery.agreeDeliveryDate(project().id, first.id)).toBe(false); });
    act(() => { expect(hook.result.current.delivery.proposeDeliveryDate(project().id, laterDate, "Updated review allowance")).toBe(true); });
    fixture.viewer = client; hook.rerender();
    act(() => { expect(hook.result.current.delivery.agreeDeliveryDate(project().id, first.id)).toBe(false); });
    const pending = hook.result.current.delivery.getDeliveryAgreement(project()).proposals[1];
    act(() => { expect(hook.result.current.delivery.agreeDeliveryDate(project().id, pending.id)).toBe(true); });
    const agreed = hook.result.current.delivery.getDeliveryAgreement(project());
    expect(agreed.agreedDate).toBe(laterDate);
    expect(agreed.originalDate).toBe(clientDate);
    expect(agreed.proposals.map((entry) => entry.status)).toEqual(["superseded", "agreed"]);
    expect(agreed.proposals[1].agreedBy).toBe("Jess");
    expect(hook.result.current.delivery.messages.some((entry) => entry.projectUpdate?.kind === "event" && entry.projectUpdate.eventKey === "project.delivery.date_agreed")).toBe(true);
    hook.unmount();
    const reopened = renderHook(useFlow, { wrapper: Providers });
    expect(reopened.result.current.delivery.getDeliveryAgreement(project()).agreedDate).toBe(laterDate);
  });

  it("keeps production-risk details internal until explicitly shared; records reading without agreeing", () => {
    project().deadline = { finalDueAt: clientDate }; seedStage();
    const hook = renderHook(useFlow, { wrapper: Providers });
    const risk = hook.result.current.delivery.issues.find((entry) => entry.kind === "production")!;
    expect(risk).toBeDefined();
    expect(hook.result.current.delivery.messages.every((entry) => entry.channel === "internal")).toBe(true);
    fixture.viewer = client; hook.rerender();
    expect(hook.result.current.delivery.issues).toHaveLength(0);
    fixture.viewer = staff; hook.rerender();
    act(() => { expect(hook.result.current.delivery.shareClientUpdate(risk.id, "We need more time for final checks.")).toBe(true); });
    fixture.viewer = client; hook.rerender();
    expect(hook.result.current.delivery.messages.every((entry) => entry.channel === "external")).toBe(true);
    expect(hook.result.current.delivery.messages[0].body).not.toContain(risk.internalReason);
    act(() => hook.result.current.delivery.markChannelRead(project().id, "external"));
    expect(hook.result.current.delivery.messages[0].readBy).toContain(client.chatUserId);
    expect(hook.result.current.delivery.getDeliveryAgreement(project()).agreedDate).toBe(clientDate);
  });

  it("sets the initial Brief deadline while keeping Brisk's later date a suggestion", () => {
    fixture.viewer = client;
    const hook = renderHook(useFlow, { wrapper: Providers });
    act(() => hook.result.current.delivery.submitBriefTiming(project().id, "2026-11-01", now));
    expect(hook.result.current.delivery.getDeliveryAgreement(project()).agreedDate).toBe(deliveryInstant("2026-11-01", "17:00"));
    expect(hook.result.current.delivery.issues.filter((issue) => !issue.resolvedAt)).toHaveLength(1);
    expect(hook.result.current.delivery.getDeliveryAgreement(project()).proposals).toHaveLength(0);
    expect(hook.result.current.delivery.messages.every((message) => message.channel === "external")).toBe(true);
  });

  it("does not let a resubmitted Brief replace the deadline; a saved Studio correction resolves its alert", () => {
    fixture.viewer = client;
    const hook = renderHook(useFlow, { wrapper: Providers });
    act(() => hook.result.current.delivery.submitBriefTiming(project().id, "2026-11-01", now));
    const initial = hook.result.current.delivery.getDeliveryAgreement(project()).agreedDate;
    act(() => hook.result.current.delivery.submitBriefTiming(project().id, "2026-12-01", now));
    expect(hook.result.current.delivery.getDeliveryAgreement(project()).agreedDate).toBe(initial);
    expect(hook.result.current.delivery.issues.some((issue) => !issue.resolvedAt)).toBe(true);
    act(() => { expect(hook.result.current.delivery.saveDeliveryDate(project().id, finalDate, "Corrected timing", initial)).toBe(false); });
    fixture.viewer = staff; hook.rerender();
    act(() => { expect(hook.result.current.delivery.saveDeliveryDate(project().id, finalDate, "Corrected timing", initial)).toBe(true); });
    expect(hook.result.current.delivery.issues.filter((issue) => !issue.resolvedAt)).toHaveLength(0);
    expect(hook.result.current.delivery.issues[0].requestedDate).toBe("2026-11-01");
  });

  it("creates a fresh risk when stage dates move beyond the newly agreed final date", () => {
    project().deadline = { finalDueAt: clientDate }; seedStage();
    const hook = renderHook(useFlow, { wrapper: Providers });
    act(() => { hook.result.current.delivery.proposeDeliveryDate(project().id, laterDate, "More time"); });
    fixture.viewer = client; hook.rerender();
    const pending = hook.result.current.delivery.getDeliveryAgreement(project()).proposals[0];
    act(() => { hook.result.current.delivery.agreeDeliveryDate(project().id, pending.id); });
    fixture.viewer = staff; hook.rerender();
    act(() => { hook.result.current.timing.saveDeadline(project(), "edit", "dates", null, "2026-12-10T06:00:00.000Z"); });
    expect(hook.result.current.delivery.issues.some((entry) => !entry.resolvedAt && entry.kind === "production")).toBe(true);
  });
});

for (const level of prototypeAccessLevels) {
  describe(level, () => {
    it("permits proposals for either side, requires the other side to agree, and keeps Freelancers read-only", () => {
      const role = getAccessLevelRole(level);
      project().deadline = { finalDueAt: clientDate };
      fixture.viewer = role === "Customer" ? client : role === "Studio Freelancer" ? { ...freelancer, testPreviewProjectId: project().id } : staff;
      const hook = renderHook(useFlow, { wrapper: Providers });
      act(() => { expect(hook.result.current.delivery.proposeDeliveryDate(project().id, finalDate, "Final checks")).toBe(role !== "Studio Freelancer"); });
      const pending = hook.result.current.delivery.getDeliveryAgreement(project()).proposals[0];
      if (role === "Studio Freelancer") {
        act(() => { expect(hook.result.current.delivery.agreeDeliveryDate(project().id, "unavailable")).toBe(false); });
        return;
      }
      expect(pending.proposedByRole).toBe(role);
      expect(hook.result.current.delivery.getDeliveryAgreement(project()).agreedDate).toBe(clientDate);
      act(() => { expect(hook.result.current.delivery.agreeDeliveryDate(project().id, pending.id)).toBe(false); });
      fixture.viewer = role === "Customer" ? staff : client; hook.rerender();
      act(() => { expect(hook.result.current.delivery.agreeDeliveryDate(project().id, pending.id)).toBe(true); });
      expect(hook.result.current.delivery.getDeliveryAgreement(project()).agreedDate).toBe(finalDate);
    });

    it("enforces stage editing, proposal and agreement boundaries and renders the permitted actions", () => {
      seedStage();
      const role = getAccessLevelRole(level);
      project().deadline = { finalDueAt: clientDate };
      const hook = renderHook(useFlow, { wrapper: Providers });
      act(() => { hook.result.current.delivery.proposeDeliveryDate(project().id, finalDate, "Initial proposal"); });
      fixture.viewer = role === "Customer" ? client : role === "Studio Freelancer" ? { ...freelancer, testPreviewProjectId: project().id } : staff;
      hook.rerender();
      act(() => { expect(hook.result.current.timing.saveDeadline(project(), "edit", "dates", internal, clientDate)).toBe(role === "Studio Staff"); });
      hook.unmount();
      render(<Providers><FinalDeliveryPage projectId={project().id} /></Providers>);
      expect(screen.getAllByRole("button").map((button) => button.textContent).join(" | ")).toContain(role === "Studio Staff" ? "Change date" : "Discuss date");
      expect(screen.queryAllByRole("button", { name: /Change date/ }).length > 0).toBe(role === "Studio Staff");
      expect(Boolean(screen.queryByRole("button", { name: "Change proposal" }))).toBe(role === "Studio Staff");
      expect(Boolean(screen.queryByRole("button", { name: "Propose another date" }))).toBe(role === "Customer");
      expect(screen.queryByText(/Internal review due:/) !== null).toBe(role !== "Customer");
      expect(Boolean(screen.queryByRole("button", { name: "Agree date" }))).toBe(role === "Customer");
      for (const summary of screen.getAllByText("Timing details")) expect(summary.closest("details")).not.toHaveAttribute("open");
    });
  });
}

it("opens the single deadline editor directly, with Studio save and propose choices", () => {
  render(<Providers><FinalDeliveryPage projectId={project().id} /></Providers>);
  expect(screen.getByRole("dialog", { name: "Deadline" })).toBeInTheDocument();
  expect(screen.getByText("TBC")).toBeInTheDocument();
  expect(screen.queryByText("Delivery history")).not.toBeInTheDocument();
  expect(screen.getByRole("radio", { name: "Change date" })).toBeChecked();
  expect(screen.getByRole("button", { name: "Save deadline" })).toBeDisabled();
  fireEvent.click(screen.getByRole("radio", { name: "Propose change" }));
  expect(screen.getByRole("button", { name: "Send proposal" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(fixture.push).toHaveBeenCalledWith("/active-videos");
});

function DeadlineEntry() {
  return <ProjectDeadlineLink projectId={project().id} className="label-s">Open deadline</ProjectDeadlineLink>;
}

it("does not offer a review link without an issue or proposal", () => {
  render(<Providers><ProjectTimingWarning projectId={project().id} label="Review timing" /></Providers>);
  expect(screen.queryByRole("link", { name: /Review timing/ })).not.toBeInTheDocument();
});

it("takes Review timing directly to Final delivery and hides it when completed", () => {
  const hook = renderHook(useFlow, { wrapper: Providers });
  act(() => { hook.result.current.delivery.proposeDeliveryDate(project().id, finalDate, "Initial proposal"); });
  hook.unmount();
  const view = render(<Providers><ProjectTimingWarning projectId={project().id} label="Review timing" /></Providers>);
  expect(screen.getByRole("link", { name: /Review timing/ })).toHaveAttribute("href", `/projects/${project().id}/delivery`);
  fixture.completed = { [project().id]: { deliveredAt: now } };
  view.rerender(<Providers><ProjectTimingWarning projectId={project().id} label="Review timing" /></Providers>);
  expect(screen.queryByRole("link", { name: /Review timing/ })).not.toBeInTheDocument();
});

it("lets a Client counter-propose through the shared form and the Studio agree", () => {
  project().deadline = { finalDueAt: clientDate };
  const hook = renderHook(useFlow, { wrapper: Providers });
  act(() => { hook.result.current.delivery.proposeDeliveryDate(project().id, finalDate, "Initial proposal"); });
  hook.unmount();
  fixture.viewer = client;
  const view = render(<Providers><DeadlineEntry /></Providers>);
  fireEvent.click(screen.getByRole("link", { name: "Open deadline" }));
  fireEvent.click(screen.getByRole("button", { name: "Propose another date" }));
  fireEvent.click(screen.getByRole("button", { name: "20 November, 2026" }));
  fireEvent.click(screen.getByRole("button", { name: "Tuesday, 24 November 2026" }));
  fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Our launch moved." } });
  expect(screen.queryByRole("radio", { name: "Change date" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Send proposal" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("link", { name: "Open deadline" }));
  expect(screen.getByText("Waiting for Studio agreement")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Agree date" })).not.toBeInTheDocument();
  fixture.viewer = staff;
  view.rerender(<Providers><DeadlineEntry /></Providers>);
  fireEvent.click(screen.getByRole("button", { name: "Agree date" }));
  expect(screen.getByText("Delivery date agreed.")).toBeInTheDocument();
});

it("submits a Studio proposal from the calendar without changing the deadline, then lets the Client agree", () => {
  project().deadline = { finalDueAt: clientDate };
  const view = render(<Providers><DeadlineEntry /></Providers>);
  fireEvent.click(screen.getByRole("link", { name: "Open deadline" }));
  fireEvent.click(screen.getByRole("radio", { name: "Propose change" }));
  fireEvent.click(screen.getByRole("button", { name: "6 November, 2026" }));
  fireEvent.click(screen.getByRole("button", { name: "Friday, 20 November 2026" }));
  fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Allow time for your final review." } });
  fireEvent.click(screen.getByRole("button", { name: "Send proposal" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  fixture.viewer = client;
  view.rerender(<Providers><DeadlineEntry /></Providers>);
  fireEvent.click(screen.getByRole("link", { name: "Open deadline" }));
  expect(screen.getAllByText(/Fri 6 Nov/).length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole("button", { name: "Agree date" }));
  expect(screen.getByText("Delivery date agreed.")).toBeInTheDocument();
});

it("saves an automatic stage deadline inside the same dialog without changing final delivery", () => {
  render(<Providers><StageDeadlinePanel project={project()} /></Providers>);
  fireEvent.click(screen.getByRole("button", { name: /Set deadline/ }));
  expect(screen.getAllByRole("dialog")).toHaveLength(1);
  expect(screen.getByRole("dialog", { name: "Deadline" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Save stage deadline" }));
  expect(screen.getAllByText("3 working days left").length).toBeGreaterThan(0);
  expect(screen.getByText("TBC")).toBeInTheDocument();
});

it("blocks writes for a viewer outside the workspace and for completed projects", () => {
  const hook = renderHook(useFlow, { wrapper: Providers });
  fixture.viewer = { ...staff, workspaceId: "other-workspace" }; hook.rerender();
  act(() => {
    expect(hook.result.current.delivery.proposeDeliveryDate(project().id, finalDate, "Test")).toBe(false);
    expect(hook.result.current.timing.saveDeadline(project(), "edit", "automatic", null, null)).toBe(false);
  });
  fixture.viewer = staff; project().status = "Completed"; hook.rerender();
  act(() => { expect(hook.result.current.delivery.proposeDeliveryDate(project().id, finalDate, "Test")).toBe(false); });
});

it("clears an unshared production risk when the forecast fits the agreed date", () => {
  project().deadline = { finalDueAt: "2026-11-13T06:00:00.000Z" }; seedStage();
  const hook = renderHook(useFlow, { wrapper: Providers });
  act(() => { hook.result.current.timing.saveDeadline(project(), "edit", "dates", null, laterDate); });
  expect(hook.result.current.delivery.issues.some((issue) => !issue.resolvedAt)).toBe(true);
  act(() => { hook.result.current.timing.saveDeadline(project(), "edit", "dates", null, clientDate); });
  expect(hook.result.current.delivery.issues.some((issue) => !issue.resolvedAt)).toBe(false);
});

it("resolves saved Brief timing warnings on completion", () => {
  const hook = renderHook(useFlow, { wrapper: Providers });
  act(() => hook.result.current.delivery.submitBriefTiming(project().id, "2026-11-01", now));
  project().status = "Completed"; hook.rerender();
  expect(hook.result.current.delivery.issues.filter((issue) => !issue.resolvedAt)).toHaveLength(0);
  expect(hook.result.current.delivery.messages.every((message) => message.projectUpdate?.kind === "event" && message.projectUpdate.state !== "warning")).toBe(true);
});

it("resolves alerts and rejects date changes when a completion record precedes the project status", () => {
  const hook = renderHook(useFlow, { wrapper: Providers });
  act(() => {
    hook.result.current.delivery.submitBriefTiming(project().id, "2026-11-01", now);
    hook.result.current.delivery.proposeDeliveryDate(project().id, finalDate, "Initial proposal");
  });
  const pending = hook.result.current.delivery.getDeliveryAgreement(project()).proposals[0];
  fixture.completed = { [project().id]: { deliveredAt: now } }; hook.rerender();
  expect(hook.result.current.delivery.issues.filter((issue) => !issue.resolvedAt)).toHaveLength(0);
  expect(hook.result.current.delivery.messages.every((message) => message.projectUpdate?.kind === "event" && message.projectUpdate.state !== "warning")).toBe(true);
  act(() => { expect(hook.result.current.delivery.proposeDeliveryDate(project().id, laterDate, "Too late")).toBe(false); });
  fixture.viewer = client; hook.rerender();
  act(() => { expect(hook.result.current.delivery.agreeDeliveryDate(project().id, pending.id)).toBe(false); });
  hook.unmount();
  const reopened = renderHook(useFlow, { wrapper: Providers });
  expect(reopened.result.current.delivery.issues[0].resolvedAt).toBe(now);
});

it("does not treat a paused forecast as recovery", () => {
  project().deadline = { finalDueAt: clientDate }; seedStage();
  const hook = renderHook(useFlow, { wrapper: Providers });
  const risk = hook.result.current.delivery.issues.find((issue) => !issue.resolvedAt)!;
  act(() => { hook.result.current.delivery.shareClientUpdate(risk.id, "Reviewing timing."); });
  project().status = "Paused"; hook.rerender();
  expect(hook.result.current.delivery.issues.find((issue) => issue.id === risk.id)?.resolvedAt).toBeNull();
});

it("resolves a shared production warning when the schedule recovers, preserving its reviewed copy", () => {
  project().deadline = { finalDueAt: "2026-11-13T06:00:00.000Z" }; seedStage();
  const hook = renderHook(useFlow, { wrapper: Providers });
  act(() => { hook.result.current.timing.saveDeadline(project(), "edit", "dates", null, laterDate); });
  const risk = hook.result.current.delivery.issues.find((issue) => !issue.resolvedAt)!;
  act(() => { hook.result.current.delivery.shareClientUpdate(risk.id, "We are reviewing the schedule."); });
  act(() => { hook.result.current.timing.saveDeadline(project(), "edit", "dates", null, clientDate); });
  expect(hook.result.current.delivery.issues.filter((issue) => !issue.resolvedAt)).toHaveLength(0);
  expect(hook.result.current.delivery.issues[0].clientUpdate?.reason).toBe("We are reviewing the schedule.");
  expect(hook.result.current.delivery.messages.every((message) => message.projectUpdate?.kind === "event" && message.projectUpdate.state === "success")).toBe(true);
  hook.unmount();
  const reopened = renderHook(useFlow, { wrapper: Providers });
  expect(reopened.result.current.delivery.issues.filter((issue) => !issue.resolvedAt)).toHaveLength(0);
  act(() => { reopened.result.current.timing.saveDeadline(project(), "edit", "dates", null, laterDate); });
  const recurring = reopened.result.current.delivery.issues.find((issue) => !issue.resolvedAt)!;
  expect(recurring).toBeDefined();
  expect(recurring.id).not.toBe(risk.id);
  expect(recurring.clientUpdate).toBeNull();
  act(() => { reopened.result.current.delivery.shareClientUpdate(recurring.id, "A new timing review."); });
  act(() => { reopened.result.current.timing.saveDeadline(project(), "edit", "dates", null, clientDate); });
  act(() => { reopened.result.current.timing.saveDeadline(project(), "edit", "dates", null, laterDate); });
  expect(reopened.result.current.delivery.issues.filter((issue) => !issue.resolvedAt)).toHaveLength(1);
  expect(reopened.result.current.delivery.issues.filter((issue) => issue.resolvedAt)).toHaveLength(2);
});
