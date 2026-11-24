import { describe, expect, it } from "vitest";
import {
  cibinongBaseLines,
  cibinongFindings,
  lineTotal,
  sumLines,
  summarizeRab,
  withVolume,
} from "@/lib/condition-rab";

describe("Condition-based RAB", () => {
  it("multiplies volume by unit price", () => {
    expect(lineTotal({ id: "a", work: "Cat", unit: "m²", volume: 12, unitPrice: 35_000 })).toBe(
      420_000,
    );
  });
  it("treats negative volume or price as zero", () => {
    expect(lineTotal({ id: "a", work: "x", unit: "m²", volume: -3, unitPrice: 10_000 })).toBe(0);
  });
  it("totals each Cibinong finding", () => {
    const [ceiling, wall] = cibinongFindings;
    expect(sumLines(ceiling!.lines)).toBe(6_140_000);
    expect(sumLines(wall!.lines)).toBe(3_225_000);
  });
  it("adds 10% contingency on top of findings and the standard package", () => {
    const summary = summarizeRab(cibinongFindings, cibinongBaseLines);
    expect(summary.findingsTotal).toBe(9_365_000);
    expect(summary.baseTotal).toBe(54_600_000);
    expect(summary.subtotal).toBe(63_965_000);
    expect(summary.contingency).toBe(6_396_500);
    expect(summary.total).toBe(70_361_500);
  });
  it("updates one line volume without touching the others", () => {
    const updated = withVolume(cibinongFindings[1]!, "dinding-aci", 30);
    expect(updated.lines.find((line) => line.id === "dinding-aci")?.volume).toBe(30);
    expect(updated.lines.find((line) => line.id === "dinding-cat")?.volume).toBe(15);
    expect(cibinongFindings[1]!.lines.find((line) => line.id === "dinding-aci")?.volume).toBe(15);
  });
});
