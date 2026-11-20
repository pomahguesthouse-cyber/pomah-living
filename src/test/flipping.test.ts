import { describe, expect, it } from "vitest";
import {
  calculateFlipping,
  formatProjectDate,
  isDemoProject,
  makeFlippingProject,
  rabTotal,
  readFlippingProject,
} from "@/lib/flipping";

describe("Flipping investment rules", () => {
  const demo = makeFlippingProject("demo");
  it("links renovation to volume times unit price including contingency exactly once", () => {
    expect(rabTotal(demo.rab)).toBe(70_000_000);
    expect(calculateFlipping(demo.finance, demo.rab).renovation).toBe(70_000_000);
  });
  it("calculates configurable buyer auction fees", () => {
    expect(calculateFlipping({ ...demo.finance, auctionRate: 3 }, []).auctionFee).toBe(9_000_000);
  });
  it("uses independent BPHTB base and regional NPOPTKP", () => {
    expect(
      calculateFlipping(
        { ...demo.finance, bphtbBase: 350_000_000, npoptkp: 100_000_000, bphtbRate: 4 },
        [],
      ).bphtb,
    ).toBe(10_000_000);
  });
  it("never produces a negative BPHTB taxable base", () => {
    expect(
      calculateFlipping({ ...demo.finance, bphtbBase: 50_000_000, npoptkp: 80_000_000 }, []).bphtb,
    ).toBe(0);
  });
  it("includes purchase and buyer costs only once", () => {
    expect(calculateFlipping(demo.finance, demo.rab).acquisition).toBe(326_000_000);
  });
  it("calculates prorated simple interest without adding loan principal again", () => {
    const result = calculateFlipping(demo.finance, demo.rab);
    expect(result.interest).toBe(9_000_000);
    expect(result.holding).toBe(21_000_000);
  });
  it("multiplies monthly carrying cost by duration", () => {
    expect(calculateFlipping({ ...demo.finance, months: 8 }, []).carrying).toBe(12_000_000);
  });
  it("includes seller taxes, commission, and marketing once", () => {
    const result = calculateFlipping(demo.finance, demo.rab);
    expect(result.sellerTax).toBe(12_000_000);
    expect(result.sellerFee).toBe(9_600_000);
    expect(result.selling).toBe(24_600_000);
    expect(result.allIn).toBe(441_600_000);
    expect(result.profit).toBe(38_400_000);
  });
  it("adds only an explicitly separate reserve", () => {
    expect(calculateFlipping({ ...demo.finance, reserve: 5_000_000 }, demo.rab).allIn).toBe(
      446_600_000,
    );
  });
  it("computes ROI over all costs and margin over sales", () => {
    const result = calculateFlipping(demo.finance, demo.rab);
    expect(result.roi).toBeCloseTo((38_400_000 / 441_600_000) * 100);
    expect(result.margin).toBe(8);
  });
  it("solves break-even with proportional selling costs instead of reusing current selling costs", () => {
    const result = calculateFlipping(demo.finance, demo.rab);
    expect(result.breakEven).toBeCloseTo(420_000_000 / 0.955);
    const atBreakEven = calculateFlipping(
      { ...demo.finance, sale: result.breakEven ?? 0 },
      demo.rab,
    );
    expect(atBreakEven.profit).toBeCloseTo(0, 4);
  });
  it("rejects an impossible break-even when selling rates reach 100%", () => {
    expect(
      calculateFlipping({ ...demo.finance, sellerTaxRate: 50, sellerFeeRate: 50 }, []).breakEven,
    ).toBeNull();
  });
  it("returns no ratio for zero cost or zero sale", () => {
    const blank = makeFlippingProject("00000000-0000-4000-8000-000000000001");
    const result = calculateFlipping(blank.finance, []);
    expect(result.roi).toBeNull();
    expect(result.margin).toBeNull();
    expect(blank.rab).toEqual([]);
  });
  it("recalculates scenario renovation and holding without duplicating the base RAB", () => {
    const result = calculateFlipping(
      { ...demo.finance, sale: 430_000_000, months: 9 },
      demo.rab,
      1.2,
    );
    expect(result.renovation).toBe(84_000_000);
    expect(result.holding).toBe(30_000_000);
    expect(result.allIn).toBe(462_350_000);
    expect(result.profit).toBe(-32_350_000);
  });
  it("starts all new risks unverified", () => {
    expect(demo.risks.every((risk) => !risk.verified)).toBe(true);
  });
  it("never categorizes a private UUID as a persistent demo", () => {
    expect(isDemoProject("demo")).toBe(true);
    expect(isDemoProject("cibinong")).toBe(true);
    expect(isDemoProject("00000000-0000-4000-8000-000000000001")).toBe(false);
  });
  it("validates stored payloads and rejects negative, nonfinite, or excessive values", () => {
    expect(readFlippingProject(demo)).toEqual(demo);
    expect(() =>
      readFlippingProject({ ...demo, finance: { ...demo.finance, purchase: -1 } }),
    ).toThrow();
    expect(() =>
      readFlippingProject({ ...demo, finance: { ...demo.finance, auctionRate: 101 } }),
    ).toThrow();
    expect(() =>
      readFlippingProject({ ...demo, finance: { ...demo.finance, months: NaN } }),
    ).toThrow();
  });
  it("formats dates in DD/MM/YYYY", () => {
    expect(formatProjectDate("2026-11-20")).toBe("20/11/2026");
    expect(formatProjectDate("")).toBe("Belum diisi");
  });
});
