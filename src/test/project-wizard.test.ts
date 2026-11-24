import { describe, expect, it } from "vitest";
import {
  isProjectTab,
  nextTab,
  previousTab,
  projectTabs,
  stepIndexOfTab,
  wizardSteps,
} from "@/lib/project-wizard";

describe("Project wizard navigation", () => {
  it("places every tab in exactly one step", () => {
    const placed = wizardSteps.flatMap((step) => [...step.tabs]);
    expect(new Set(placed).size).toBe(placed.length);
    expect([...placed].sort()).toEqual(projectTabs.map((tab) => tab.id).sort());
  });
  it("finds the step that owns a tab so navigation stays in sync", () => {
    expect(stepIndexOfTab("asset")).toBe(0);
    expect(stepIndexOfTab("analysis")).toBe(1);
    expect(stepIndexOfTab("timeline")).toBe(2);
    expect(stepIndexOfTab("scenarios")).toBe(3);
  });
  it("walks tabs in wizard order across steps", () => {
    expect(nextTab("risks")).toBe("analysis");
    expect(nextTab("timeline")).toBe("selling");
    expect(nextTab("scenarios")).toBeNull();
    expect(previousTab("asset")).toBeNull();
    expect(previousTab("rab")).toBe("analysis");
  });
  it("rejects unknown tab ids", () => {
    expect(isProjectTab("rab")).toBe(true);
    expect(isProjectTab("nope")).toBe(false);
  });
});
