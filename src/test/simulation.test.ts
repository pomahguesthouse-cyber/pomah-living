import { describe, expect, it } from "vitest";
import {
  baseScenario,
  stressedScenario,
  calculateSimulation,
  formatInput,
  formatRupiah,
  getDecision,
  parseInputs,
  toInputs,
  validateAmount,
} from "@/lib/simulation";
import { getProperty, properties } from "@/lib/properties";

const complete = { occupancy: true, access: true, documents: true };
describe("Cibinong scenarios", () => {
  it("has a Rp315 million base bid limit", () => {
    expect(calculateSimulation(baseScenario).bidLimit).toBe(315_000_000);
  });
  it("has a Rp65 million base profit", () => {
    expect(calculateSimulation(baseScenario).estimatedProfit).toBe(65_000_000);
  });
  it("totals all project costs to Rp415 million", () => {
    expect(calculateSimulation(baseScenario).totalCost).toBe(415_000_000);
  });
  it("has a Rp260 million stressed bid limit", () => {
    expect(calculateSimulation(stressedScenario).bidLimit).toBe(260_000_000);
  });
  it("has a Rp10 million stressed profit", () => {
    expect(calculateSimulation(stressedScenario).estimatedProfit).toBe(10_000_000);
  });
  it("skips the stressed asset below its Rp280 million limit", () => {
    expect(getDecision(stressedScenario, 280_000_000, complete).label).toBe("Lewati aset");
  });
});
describe("Decision precedence", () => {
  it("prioritizes below-limit bid ceiling over unverified checks", () => {
    expect(
      getDecision(stressedScenario, 280_000_000, { ...complete, occupancy: false }).label,
    ).toBe("Lewati aset");
  });
  it("prioritizes unverified checks over an excessive winning price", () => {
    expect(
      getDecision({ ...baseScenario, winningPrice: 330_000_000 }, 280_000_000, {
        ...complete,
        occupancy: false,
      }).label,
    ).toBe("Tahan penawaran");
  });
  it("identifies the specific check that is missing", () => {
    expect(
      getDecision(baseScenario, 280_000_000, { ...complete, access: false }).description,
    ).toContain("akses fisik");
  });
  it("detects winning price above bid ceiling", () => {
    expect(
      getDecision({ ...baseScenario, winningPrice: 316_000_000 }, 280_000_000, complete).label,
    ).toBe("Di atas batas tawar");
  });
  it("allows a complete inspection in the valid range", () => {
    expect(getDecision(baseScenario, 280_000_000, complete).label).toBe("Layak dipertimbangkan");
  });
  it("allows equality at auction limit", () => {
    expect(
      getDecision({ ...baseScenario, winningPrice: 280_000_000 }, 280_000_000, complete).label,
    ).toBe("Layak dipertimbangkan");
  });
  it("allows equality at bid ceiling", () => {
    expect(
      getDecision({ ...baseScenario, winningPrice: 315_000_000 }, 280_000_000, complete).label,
    ).toBe("Layak dipertimbangkan");
  });
  it("does not call a below-auction-limit winning price feasible", () => {
    expect(
      getDecision({ ...baseScenario, winningPrice: 279_000_000 }, 280_000_000, complete).label,
    ).toBe("Di bawah nilai limit");
  });
  it("keeps a negative bid ceiling instead of clamping it", () => {
    expect(calculateSimulation({ ...baseScenario, salePrice: 100_000_000 }).bidLimit).toBe(
      -65_000_000,
    );
  });
});
describe("Property data", () => {
  it("provides three simulation properties", () => {
    expect(properties).toHaveLength(3);
  });
  it("sets Cibinong auction limit to Rp280 million", () => {
    expect(getProperty("cibinong")?.auctionLimit).toBe(280_000_000);
  });
  it("sets Sawangan auction limit to Rp250 million", () => {
    expect(getProperty("sawangan")?.auctionLimit).toBe(250_000_000);
  });
  it("starts Sawangan with base scenario and unverified occupancy", () => {
    expect(getProperty("sawangan")?.initialValues).toEqual(baseScenario);
    expect(getProperty("sawangan")?.verification.occupancy).toBe(false);
  });
  it("sets Jatiasih auction limit to Rp320 million", () => {
    expect(getProperty("jatiasih")?.auctionLimit).toBe(320_000_000);
  });
  it("starts Jatiasih stressed with Rp320 million winning price", () => {
    expect(getProperty("jatiasih")?.initialValues).toEqual({
      ...stressedScenario,
      winningPrice: 320_000_000,
    });
  });
  it.each([
    ["banyumanik", "cibinong"],
    ["tembalang", "sawangan"],
    ["ngaliyan", "jatiasih"],
  ])("keeps the previous %s analysis link working", (oldId, newId) => {
    expect(getProperty(oldId)?.id).toBe(newId);
  });
  it("returns no property for an unknown id", () => {
    expect(getProperty("unknown")).toBeUndefined();
  });
});
describe("Rupiah input validation", () => {
  it("rejects negative amounts", () => {
    expect(validateAmount("-1")).not.toBeNull();
  });
  it("rejects empty amounts", () => {
    expect(validateAmount("")).not.toBeNull();
  });
  it("accepts zero", () => {
    expect(validateAmount("0")).toBeNull();
  });
  it("rejects nonnumeric amounts", () => {
    expect(validateAmount("abc")).not.toBeNull();
  });
  it("parses valid fields", () => {
    expect(parseInputs(toInputs(baseScenario))).toEqual(baseScenario);
  });
  it("does not calculate incomplete fields", () => {
    expect(parseInputs({ ...toInputs(baseScenario), targetProfit: "" })).toBeNull();
  });
  it("formats rupiah using Indonesian thousand separators", () => {
    expect(formatRupiah(315_000_000)).toBe("Rp 315.000.000");
  });
  it("formats editable amounts", () => {
    expect(formatInput("70000000")).toBe("70.000.000");
  });
});
