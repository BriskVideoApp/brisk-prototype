import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StudioAiQuestion } from "@/components/studio-onboard/StudioAiQuestion";

afterEach(cleanup);

describe("StudioAiQuestion actions", () => {
  it("uses the shared Back and Continue actions instead of the composer submit icon", () => {
    const onAnalyse = vi.fn();
    const onBack = vi.fn();

    render(
      <StudioAiQuestion
        onAnalyse={onAnalyse}
        onBack={onBack}
        onDraftChange={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Analyse Studio details" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByLabelText("What does your Studio do?"), {
      target: { value: "We make documentaries for charities." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(onAnalyse).toHaveBeenCalledWith(expect.objectContaining({
      studioDescription: "We make documentaries for charities.",
    }));
  });
});
