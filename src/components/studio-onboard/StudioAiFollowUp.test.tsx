import "@testing-library/jest-dom/vitest";
import { createElement } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StudioAiFollowUp } from "@/components/studio-onboard/StudioAiFollowUp";
import {
  studioOnboardingScenarios,
  type StudioOnboardingScenario,
} from "@/data/studio-onboard";

const answerAdvanceDelayMs = 180;
const fullServiceScenario: StudioOnboardingScenario = studioOnboardingScenarios[0];
const animationScenario: StudioOnboardingScenario = studioOnboardingScenarios[1];

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function advancePastPressedState() {
  act(() => {
    vi.advanceTimersByTime(answerAdvanceDelayMs);
  });
}

function renderFollowUp(scenario: StudioOnboardingScenario = fullServiceScenario) {
  const onAnswersChange = vi.fn();
  const onBack = vi.fn();
  const onContinue = vi.fn();
  const onStepChange = vi.fn();

  render(createElement(StudioAiFollowUp, {
    scenario,
    onAnswersChange,
    onBack,
    onContinue,
    onStepChange,
  }));

  return { onAnswersChange, onBack, onContinue, onStepChange };
}

function reachProductionModel() {
  fireEvent.click(screen.getByRole("button", { name: "We develop them with clients" }));
  advancePastPressedState();
}

function reachVideoTypes() {
  reachProductionModel();
  fireEvent.click(screen.getByRole("button", { name: "Post-production only" }));
  advancePastPressedState();
}

describe("StudioAiFollowUp single-select questions", () => {
  it("shows Back on the first question and returns to the Studio details screen", () => {
    const { onBack } = renderFollowUp();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("saves a contextual answer, shows its pressed state, and advances without Continue", () => {
    const { onAnswersChange, onStepChange } = renderFollowUp();
    const answer = screen.getByRole("button", { name: "We develop them with clients" });

    expect(screen.queryByRole("button", { name: "Continue" })).not.toBeInTheDocument();
    fireEvent.click(answer);

    expect(answer).toHaveAttribute("aria-pressed", "true");
    expect(answer).toBeDisabled();
    expect(screen.getByRole("heading", { name: "Who develops concepts and scripts?" })).toBeInTheDocument();
    expect(onAnswersChange).toHaveBeenLastCalledWith(expect.objectContaining({
      contextualAnswer: "We develop them with clients",
    }));

    advancePastPressedState();

    expect(screen.getByRole("heading", {
      name: "Do you shoot footage, or do you only do post-production?",
    })).toBeInTheDocument();
    expect(onStepChange).toHaveBeenLastCalledWith("production-model");
    expect(screen.queryByRole("button", { name: "Continue" })).not.toBeInTheDocument();
  });

  it("uses native buttons so focused answers support Enter and Space activation", () => {
    renderFollowUp();
    const answer = screen.getByRole("button", { name: "We develop them with clients" });

    answer.focus();

    expect(answer).toHaveFocus();
    expect(answer.tagName).toBe("BUTTON");
    expect(answer).toHaveAttribute("type", "button");
    expect(answer).not.toBeDisabled();
  });

  it("returns to the saved answer and saves a replacement before advancing again", () => {
    const { onAnswersChange } = renderFollowUp();
    const firstAnswer = screen.getByRole("button", { name: "We develop them with clients" });

    fireEvent.click(firstAnswer);
    advancePastPressedState();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(screen.getByRole("button", { name: "We develop them with clients" }))
      .toHaveAttribute("aria-pressed", "true");

    const replacement = screen.getByRole("button", { name: "Clients create them" });
    fireEvent.click(replacement);

    expect(replacement).toHaveAttribute("aria-pressed", "true");
    expect(onAnswersChange).toHaveBeenLastCalledWith(expect.objectContaining({
      contextualAnswer: "Clients create them",
    }));

    advancePastPressedState();
    expect(screen.getByRole("heading", {
      name: "Do you shoot footage, or do you only do post-production?",
    })).toBeInTheDocument();
  });

  it("advances directly from post-production only to the multi-select review question", () => {
    renderFollowUp();
    reachProductionModel();

    const answer = screen.getByRole("button", { name: "Post-production only" });
    fireEvent.click(answer);

    expect(answer).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("button", { name: "Continue" })).not.toBeInTheDocument();
    advancePastPressedState();

    expect(screen.getByRole("heading", { name: "What kinds of videos do you make?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
  });

  it("treats crew size as its own single-select screen and restores it on Back", () => {
    renderFollowUp();
    reachProductionModel();

    const productionModel = screen.getByRole("button", { name: "Shoot + post-production" });
    fireEvent.click(productionModel);
    expect(productionModel).toHaveAttribute("aria-pressed", "true");
    advancePastPressedState();

    expect(screen.getByRole("heading", { name: "What size are your crews?" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Continue" })).not.toBeInTheDocument();

    const crewSize = screen.getByRole("button", { name: "Large (4+ people)" });
    fireEvent.click(crewSize);
    expect(crewSize).toHaveAttribute("aria-pressed", "true");
    advancePastPressedState();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "What size are your crews?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Large (4+ people)" }))
      .toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("button", { name: "Shoot + post-production" }))
      .toHaveAttribute("aria-pressed", "true");
  });
});

describe("StudioAiFollowUp explicit actions", () => {
  it("keeps Continue for a custom text answer", () => {
    renderFollowUp(animationScenario);

    fireEvent.click(screen.getByRole("button", { name: "Something else" }));

    const continueButton = screen.getByRole("button", { name: "Continue" });
    expect(continueButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("Add a short answer..."), {
      target: { value: "We write scripts in-house" },
    });

    expect(continueButton).toBeEnabled();
    fireEvent.click(continueButton);
    expect(screen.getByRole("heading", {
      name: "Do you shoot footage, or do you only do post-production?",
    })).toBeInTheDocument();
  });

  it("keeps Continue for the multi-select question", () => {
    const { onContinue } = renderFollowUp();
    reachVideoTypes();

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onContinue).toHaveBeenLastCalledWith(expect.objectContaining({
      videoTypeIds: expect.not.arrayContaining(["Live Action"]),
    }));
  });

  it("shows the compact common video types without descriptions or Live action", () => {
    renderFollowUp();
    reachVideoTypes();

    expect(screen.queryByText("Choose all that apply.")).not.toBeInTheDocument();
    const expectedVideoTypes = [
      "Animations",
      "Brand films",
      "Case studies",
      "Documentaries",
      "Event videos",
      "Explainers",
      "Internal communications",
      "Music videos",
      "Product demos",
      "Social videos",
      "Training videos",
      "TV Ads",
    ];

    expectedVideoTypes.forEach((label) => (
      expect(screen.getByRole("checkbox", { name: label })).toBeInTheDocument()
    ));
    expect(screen.getAllByRole("checkbox").map((checkbox) => checkbox.closest("label")?.textContent))
      .toEqual(expectedVideoTypes);

    expect(screen.queryByRole("checkbox", { name: "Live Action" })).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "AI video" })).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "Podcasts" })).not.toBeInTheDocument();
    expect(screen.queryByText("A cinematic hero piece about who the organisation or individual is and what they stand for."))
      .not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "Fashion films" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show more options" })).toBeInTheDocument();
  });

  it("keeps additional options expanded while selections change", () => {
    renderFollowUp();
    reachVideoTypes();

    fireEvent.click(screen.getByRole("button", { name: "Show more options" }));
    const fashionFilms = screen.getByRole("checkbox", { name: "Fashion films" });

    expect(screen.getByRole("checkbox", { name: "AI video" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Podcasts" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Property videos" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Wedding films" })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "Other" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add custom" })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("e.g. Recruitment films")).not.toBeInTheDocument();

    fireEvent.click(fashionFilms);

    expect(fashionFilms).toBeChecked();
    expect(fashionFilms).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("button", { name: "Show fewer options" })).toBeInTheDocument();
  });

  it("shows the custom editor only after Add custom is selected", () => {
    renderFollowUp();
    reachVideoTypes();

    fireEvent.click(screen.getByRole("button", { name: "Show more options" }));
    expect(screen.queryByPlaceholderText("e.g. Recruitment films")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add custom" }));
    expect(screen.getByPlaceholderText("e.g. Recruitment films")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show fewer options" }));
    fireEvent.click(screen.getByRole("button", { name: "Show more options" }));
    expect(screen.queryByPlaceholderText("e.g. Recruitment films")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add custom" })).toBeInTheDocument();
  });

  it("adds multiple custom video types to the selected options", () => {
    const { onAnswersChange, onContinue } = renderFollowUp();
    reachVideoTypes();
    fireEvent.click(screen.getByRole("button", { name: "Show more options" }));
    fireEvent.click(screen.getByRole("button", { name: "Add custom" }));

    const customVideoType = screen.getByLabelText("Video type");
    expect(customVideoType).toHaveClass("paragraph-s");
    expect(screen.getAllByRole("radio")).toHaveLength(10);
    expect(screen.getByRole("radio", { name: "Shapes" })).toBeChecked();
    expect(screen.queryByRole("radio", { name: "Sparkle" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Motion" }));
    expect(screen.getByRole("radio", { name: "Motion" })).toBeChecked();
    fireEvent.change(customVideoType, { target: { value: "Interview series" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    const customVideoTypeCard = screen.getByRole("checkbox", { name: "Interview series" });
    expect(customVideoTypeCard).toBeChecked();
    expect(customVideoTypeCard.closest(".studio-video-type-editor-option")?.querySelector(".ds-icon"))
      .toHaveStyle("--icon-url: url(\"/brisk-icons/bezier-curve.svg\")");
    expect(screen.getByRole("button", { name: "Add another video type" })).toBeInTheDocument();
    expect(onAnswersChange).toHaveBeenLastCalledWith(expect.objectContaining({
      customVideoTypes: [{ name: "Interview series", iconId: "bezier-curve" }],
      customVideoType: null,
    }));
    expect(screen.getByRole("button", { name: "Show fewer options" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add another video type" }));
    fireEvent.click(screen.getByRole("radio", { name: "Folder" }));
    fireEvent.change(screen.getByLabelText("Video type"), { target: { value: "Recruitment films" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(screen.getByRole("checkbox", { name: "Interview series" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Recruitment films" })).toBeChecked();
    expect(onAnswersChange).toHaveBeenLastCalledWith(expect.objectContaining({
      customVideoTypes: [
        { name: "Interview series", iconId: "bezier-curve" },
        { name: "Recruitment films", iconId: "folder" },
      ],
    }));

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(onContinue).toHaveBeenLastCalledWith(expect.objectContaining({
      customVideoTypes: [
        { name: "Interview series", iconId: "bezier-curve" },
        { name: "Recruitment films", iconId: "folder" },
      ],
    }));
  });

  it("restores the saved custom video type icon", () => {
    render(createElement(StudioAiFollowUp, {
      scenario: fullServiceScenario,
      initialStepId: "video-types",
      initialAnswers: {
        contextualAnswer: "We develop them with clients",
        productionModel: "post-production-only",
        productionScale: null,
        videoTypeIds: ["Brand Film"],
        customVideoType: "Interview series",
        customVideoTypeIcon: "bezier-curve",
      },
      onAnswersChange: vi.fn(),
      onBack: vi.fn(),
      onContinue: vi.fn(),
    }));

    const customVideoTypeCard = screen.getByRole("checkbox", { name: "Interview series" });
    expect(customVideoTypeCard.closest(".studio-video-type-editor-option")?.querySelector(".ds-icon"))
      .toHaveStyle("--icon-url: url(\"/brisk-icons/bezier-curve.svg\")");
  });

  it("does not auto-advance after selecting a video type", () => {
    const { onContinue } = renderFollowUp();
    reachVideoTypes();

    fireEvent.click(screen.getByRole("checkbox", { name: "TV Ads" }));

    expect(screen.getByRole("heading", { name: "What kinds of videos do you make?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
    expect(onContinue).not.toHaveBeenCalled();
  });

  it("keeps the hidden checkbox operable from the keyboard", () => {
    renderFollowUp();
    reachVideoTypes();
    const commercials = screen.getByRole("checkbox", { name: "TV Ads" });

    fireEvent.keyDown(commercials, { key: "Space", code: "Space" });

    expect(commercials).toBeChecked();
    expect(commercials).toHaveAttribute("aria-checked", "true");
  });
});
