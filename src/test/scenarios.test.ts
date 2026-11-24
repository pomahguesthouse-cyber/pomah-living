import { describe, expect, it } from "vitest";
import { calculateFlipping, makeFlippingProject } from "@/lib/flipping";
import { analyzeScenario, scenarioInputs } from "@/lib/scenarios";

describe("Investment scenarios", () => {
  const project = makeFlippingProject("cibinong");

  it("uses the project's base sale price and duration for Moderat", () => {
    const changed = { ...project, finance: { ...project.finance, sale: 500_000_000, months: 5 } };
    expect(scenarioInputs(changed, 1)).toEqual({
      sale: 500_000_000,
      months: 5,
      renovationFactor: 1,
    });
    expect(analyzeScenario(changed, 1).result.profit).toBe(
      calculateFlipping(changed.finance, changed.rab).profit,
    );
  });

  it("keeps Pesimis and Optimis on their own inputs", () => {
    expect(scenarioInputs(project, 0)).toEqual({
      sale: 430_000_000,
      months: 9,
      renovationFactor: 1.2,
    });
  });

  it("annualises ROI and spreads profit per month", () => {
    const optimis = analyzeScenario(project, 2);
    expect(optimis.annualRoi).toBeCloseTo((optimis.result.roi! * 12) / 4);
    expect(optimis.profitPerMonth).toBeCloseTo(optimis.result.profit / 4);
  });

  it("finds the highest purchase price that breaks even", () => {
    const pesimis = analyzeScenario(project, 0);
    expect(pesimis.result.profit).toBeLessThan(0);
    const atMax = calculateFlipping(
      {
        ...project.finance,
        sale: 430_000_000,
        months: 9,
        purchase: pesimis.maxPurchase,
        bphtbBase: pesimis.maxPurchase,
      },
      project.rab,
      1.2,
    );
    expect(Math.abs(atMax.profit)).toBeLessThan(1);
    expect(pesimis.maxPurchase).toBeLessThan(project.finance.purchase);
  });

  it("reports the break-even sale price and safety margin", () => {
    const moderat = analyzeScenario(project, 1);
    expect(moderat.minSale).toBeCloseTo(moderat.result.breakEven!);
    const atMin = calculateFlipping({ ...project.finance, sale: moderat.minSale! }, project.rab);
    expect(Math.abs(atMin.profit)).toBeLessThan(1);
    expect(moderat.safetyMargin).toBeCloseTo(
      ((480_000_000 - moderat.minSale!) / 480_000_000) * 100,
    );
  });
});
