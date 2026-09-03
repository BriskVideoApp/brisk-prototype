import { describe, expect, it } from "vitest";
import {
  addClientToPrototypeState,
  createOnboardingEmptyFixture,
  createPopulatedStudioFixture,
  setFixtureClientSession,
} from "@/data/prototype-state";
import {
  getAppShellPresentation,
  getClientPortalDestination,
  getScopedRoleHome,
  shouldHideLegacyCurrentVideo,
} from "@/components/navigation/prototypeNavigation";

describe("test mode layout navigation", () => {
  it.each([
    "/prototype/journey-entry",
    "/workspaces/northstar-films/clients/harbour-health/portal",
    "/workspaces/invalid/clients/invalid/portal",
    "/customer-dashboard",
  ])("keeps the product shell around %s while Test Mode is active", (pathname) => {
    expect(getAppShellPresentation(pathname, true)).toBe("product");
  });

  it("keeps the complete Studio onboarding flow out of the product shell in Test Mode", () => {
    expect(getAppShellPresentation("/studio-onboard", true)).toBe("clean-entry");
  });

  it.each([
    "/studio-onboard",
    "/prototype/journey-entry",
    "/workspaces/northstar-films/clients/harbour-health/portal",
    "/customer-dashboard",
  ])("keeps the clean entry layout around %s outside Test Mode", (pathname) => {
    expect(getAppShellPresentation(pathname, false)).toBe("clean-entry");
  });

  it("keeps project overviews in the product shell", () => {
    expect(getAppShellPresentation("/projects/harbour-health-care-journey", false)).toBe("product");
    expect(getAppShellPresentation("/projects/harbour-health-care-journey", true)).toBe("product");
  });

  it.each([
    ["/studio-onboard", "active", null],
    ["/workspaces/northstar-films/clients/harbour-health/portal", "active", null],
    ["/projects/harbour-health-care-journey", "active", "harbour-health-care-journey"],
    ["/today", "new", null],
  ] as const)("hides legacy current-video fixtures on contextual route %s", (pathname, state, projectId) => {
    expect(shouldHideLegacyCurrentVideo(pathname, state, projectId)).toBe(true);
  });

  it("retains the current-video section on a populated workspace home", () => {
    expect(shouldHideLegacyCurrentVideo("/today", "active", null)).toBe(false);
  });
});

describe("scoped Client portal navigation", () => {
  it("disables the portal destination when the onboarding fixture has no Client", () => {
    expect(getClientPortalDestination(createOnboardingEmptyFixture())).toBeNull();
  });

  it("uses the newly created onboarding Client for Studio preview", () => {
    const { state, client } = addClientToPrototypeState(createOnboardingEmptyFixture(), {
      name: "Harbour Health",
      website: "harbourhealth.com.au",
      primaryContactName: "Mia Chen",
      primaryContactEmail: "mia@harbourhealth.com.au",
    });

    expect(getClientPortalDestination(state)).toBe(
      `/workspaces/northstar-films/clients/${client.id}/portal?studio-preview=1`,
    );
  });

  it("uses the exact active Client session without falling back to Loom", () => {
    const state = setFixtureClientSession(createPopulatedStudioFixture(), "harbour-health");

    expect(getClientPortalDestination(state)).toBe(
      "/workspaces/northstar-films/clients/harbour-health/portal",
    );
  });

  it("does not create a portal destination for mismatched active scope", () => {
    const state = setFixtureClientSession(createPopulatedStudioFixture(), "harbour-health");
    state.session.activeWorkspaceId = "another-workspace";

    expect(getClientPortalDestination(state)).toBeNull();
  });

  it("never uses the unscoped legacy portal as the Client home fallback", () => {
    expect(getScopedRoleHome("Customer", null)).toBe("/prototype/scenarios");
    expect(getScopedRoleHome(
      "Customer",
      "/workspaces/northstar-films/clients/harbour-health/portal",
    )).toBe("/workspaces/northstar-films/clients/harbour-health/portal");
  });
});
