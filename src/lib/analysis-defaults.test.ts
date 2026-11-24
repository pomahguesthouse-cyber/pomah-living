import { describe, expect, it } from "vitest";
import {
  defaultAnalysisDefaults,
  followStandards,
  parseAnalysisDefaults,
  quickRenovation,
  standardCosts,
  startingValues,
} from "./analysis-defaults";

describe("startingValues", () => {
  it("memulai dari limit lelang tanpa asumsi admin", () => {
    // Biaya perolehan 8% × 300 jt = 24 jt; target 15% × (300 + 24) jt = 48,6 jt.
    expect(startingValues(300_000_000, defaultAnalysisDefaults)).toEqual({
      winningPrice: 300_000_000,
      salePrice: 0,
      renovationCosts: 0,
      purchaseCosts: 24_000_000,
      holdingAndSaleCosts: 0,
      targetProfit: 48_600_000,
    });
  });
});

describe("standardCosts", () => {
  it("mengikuti harga jual dan renovasi yang diisi flipper", () => {
    expect(
      standardCosts(
        { winningPrice: 300_000_000, salePrice: 500_000_000, renovationCosts: 76_000_000 },
        defaultAnalysisDefaults,
      ),
    ).toEqual({
      purchaseCosts: 24_000_000,
      holdingAndSaleCosts: 30_000_000,
      targetProfit: 60_000_000,
    });
  });
});

describe("quickRenovation", () => {
  it("mengalikan luas bangunan dengan tarif per tingkat kerusakan", () => {
    expect(quickRenovation(70, "ringan", defaultAnalysisDefaults)).toBe(52_500_000);
    expect(quickRenovation(70, "berat", defaultAnalysisDefaults)).toBe(245_000_000);
  });
});

describe("parseAnalysisDefaults", () => {
  it("menggabungkan nilai sebagian dengan standar bawaan", () => {
    expect(
      parseAnalysisDefaults({ targetProfitPercent: 20, renovationPerM2: { berat: 4_000_000 } }),
    ).toEqual({
      ...defaultAnalysisDefaults,
      targetProfitPercent: 20,
      renovationPerM2: { ...defaultAnalysisDefaults.renovationPerM2, berat: 4_000_000 },
    });
  });

  it("kembali ke standar bila nilainya rusak", () => {
    expect(parseAnalysisDefaults({ purchaseCostPercent: 500 })).toEqual(defaultAnalysisDefaults);
    expect(parseAnalysisDefaults("x")).toEqual(defaultAnalysisDefaults);
  });
});

describe("followStandards", () => {
  const start = startingValues(300_000_000, defaultAnalysisDefaults);

  it("menyesuaikan biaya standar saat harga jual dan renovasi diisi", () => {
    const withSale = followStandards(
      start,
      { ...start, salePrice: 500_000_000 },
      defaultAnalysisDefaults,
    );
    expect(withSale.holdingAndSaleCosts).toBe(30_000_000);
    const withRenovation = followStandards(
      withSale,
      { ...withSale, renovationCosts: 76_000_000 },
      defaultAnalysisDefaults,
    );
    expect(withRenovation.targetProfit).toBe(60_000_000);
  });

  it("biaya perolehan dan target ikut harga menang", () => {
    const next = followStandards(
      start,
      { ...start, winningPrice: 350_000_000 },
      defaultAnalysisDefaults,
    );
    expect(next.purchaseCosts).toBe(28_000_000);
    expect(next.targetProfit).toBe(56_700_000);
  });

  it("tidak menimpa biaya yang sudah diubah flipper", () => {
    const edited = { ...start, purchaseCosts: 30_000_000 };
    const next = followStandards(
      edited,
      { ...edited, winningPrice: 350_000_000 },
      defaultAnalysisDefaults,
    );
    expect(next.purchaseCosts).toBe(30_000_000);
  });

  it("tidak menimpa angka yang sedang diubah", () => {
    const next = followStandards(start, { ...start, targetProfit: 1 }, defaultAnalysisDefaults);
    expect(next.targetProfit).toBe(1);
  });
});
