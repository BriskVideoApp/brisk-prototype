import { describe, expect, it } from "vitest";
import { getNextClientProjectCode } from "@/data/project-naming";

describe("Client project codes", () => {
  it("continues Loom's existing project sequence in the new format", () => {
    expect(getNextClientProjectCode("LOOM", [])).toBe("loom044");
    expect(getNextClientProjectCode("LOOM", ["loom044"])).toBe("loom045");
  });

  it("starts a new Client sequence at 001", () => {
    expect(getNextClientProjectCode("AST", [])).toBe("ast001");
  });
});
