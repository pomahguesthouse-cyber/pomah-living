import { describe, expect, it } from "vitest";
import { makeFlippingProject } from "@/lib/flipping";
import {
  evaluateStep,
  evaluateWizard,
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
    // RAB dan skenario laba dihitung di tahap analisis, sebelum menawar.
    expect(stepIndexOfTab("rab")).toBe(0);
    expect(stepIndexOfTab("scenarios")).toBe(0);
    expect(stepIndexOfTab("analysis")).toBe(1);
    expect(stepIndexOfTab("timeline")).toBe(2);
    expect(stepIndexOfTab("selling")).toBe(3);
  });
  it("walks tabs in wizard order across steps", () => {
    expect(nextTab("risks")).toBe("rab");
    expect(nextTab("scenarios")).toBe("analysis");
    expect(nextTab("timeline")).toBe("selling");
    expect(nextTab("selling")).toBeNull();
    expect(previousTab("asset")).toBeNull();
    expect(previousTab("photos")).toBe("analysis");
  });
  it("rejects unknown tab ids", () => {
    expect(isProjectTab("rab")).toBe(true);
    expect(isProjectTab("nope")).toBe(false);
  });
});

describe("Automatic step status", () => {
  const fresh = () => makeFlippingProject("cibinong");
  const ready = () => {
    const project = fresh();
    return {
      ...project,
      assetAssessments: project.assetAssessments.map((item) => ({
        ...item,
        condition: "Baik" as const,
      })),
      risks: project.risks.map((risk) => ({ ...risk, verified: true })),
      timeline: project.timeline.map((item) => ({ ...item, date: "2027-01-15" })),
    };
  };

  it("marks a fresh demo project as incomplete with specific gaps", () => {
    const [feasibility, acquisition, renovation, sale] = evaluateWizard(fresh());
    expect(feasibility?.status).toBe("todo");
    expect(feasibility?.checks.find((check) => check.id === "risks")?.detail).toBe(
      "5 dari 5 belum diverifikasi",
    );
    expect(acquisition?.status).toBe("done");
    expect(renovation?.checks.find((check) => check.id === "timeline")?.ok).toBe(false);
    expect(feasibility?.checks.find((check) => check.id === "profit")?.ok).toBe(true);
    expect(sale?.checks.map((check) => check.id)).toEqual(["selling"]);
  });

  it("marks every step ready once checks, risks and dates are complete", () => {
    // Skenario pesimis proyek contoh masih rugi, jadi tahap analisis belum lengkap.
    expect(evaluateWizard(ready()).map((step) => step.status)).toEqual([
      "todo",
      "done",
      "done",
      "done",
    ]);
  });

  it("flags acquisition for attention when the purchase price is below the limit", () => {
    const project = ready();
    const result = evaluateStep("acquisition", {
      ...project,
      finance: { ...project.finance, purchase: project.property.limit - 1 },
    });
    expect(result.status).toBe("attention");
  });

  it("flags the analysis step when the projection makes a loss", () => {
    const project = ready();
    const result = evaluateStep("feasibility", {
      ...project,
      finance: { ...project.finance, sale: 300_000_000 },
    });
    expect(result.status).toBe("attention");
    expect(result.checks.find((check) => check.id === "profit")?.ok).toBe(false);
  });

  it("requires the pessimistic scenario not to lose money", () => {
    const project = ready();
    const safer = {
      ...project,
      scenarios: project.scenarios.map((scenario, index) =>
        index === 0 ? { ...scenario, sale: 520_000_000 } : scenario,
      ) as typeof project.scenarios,
    };
    expect(evaluateStep("feasibility", safer).status).toBe("done");
  });
});
