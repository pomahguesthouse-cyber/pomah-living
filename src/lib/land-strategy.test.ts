import { describe, expect, it } from "vitest";
import {
  compareStrategies,
  defaultLandRules,
  defaultNewBuild,
  landCapacity,
  renovationStrategy,
  splitOffer,
  splitStrategy,
  type LandRules,
  type NewBuildAssumptions,
} from "./land-strategy";
import { baseScenario } from "./simulation";

const rules: LandRules = { landArea: 150, frontage: 15, ...defaultLandRules };
const build: NewBuildAssumptions = { ...defaultNewBuild, salePerUnit: 450_000_000 };

describe("landCapacity", () => {
  it("dibatasi oleh luas kavling minimum", () => {
    expect(landCapacity(rules)).toMatchObject({ byArea: 2, byFrontage: 2, maxUnits: 2 });
  });

  it("lebar muka bisa membatasi walau luas cukup", () => {
    const result = landCapacity({ ...rules, landArea: 200, frontage: 10 });
    expect(result).toMatchObject({ byArea: 3, byFrontage: 1, maxUnits: 1 });
    expect(result.warnings.join(" ")).toContain("Lebar muka membatasi");
    expect(result.warnings.join(" ")).toContain("belum cukup untuk dipecah");
  });

  it("tanpa lebar muka hanya memakai luas dan memberi catatan", () => {
    const result = landCapacity({ ...rules, landArea: 240, frontage: 0 });
    expect(result.maxUnits).toBe(4);
    expect(result.byFrontage).toBeNull();
    expect(result.warnings[0]).toContain("Lebar muka belum diisi");
  });
});

describe("renovationStrategy", () => {
  it("memakai angka simulasi yang sama dengan halaman analisis", () => {
    const result = renovationStrategy(baseScenario, 4);
    // 480 jt − (300 + 25 + 70 + 20) jt = 65 jt
    expect(result.profit).toBe(65_000_000);
    expect(result.totalCost).toBe(415_000_000);
    expect(result.bidLimit).toBe(480_000_000 - 115_000_000 - 50_000_000);
    expect(result.annualRoi).toBeCloseTo((65 / 415) * 3 * 100);
  });
});

describe("splitStrategy", () => {
  it("menghitung biaya dan laba pecah 2 kavling", () => {
    const result = splitStrategy(2, baseScenario, rules, build);
    // Kavling 75 m², maksimal 75 × 100% × 2 lantai = 150 m², target 45 m² tidak dipotong.
    expect(result.detail).toMatchObject({
      lotArea: 75,
      buildingArea: 45,
      maxBuildingArea: 150,
      buildingCapped: false,
      buildCost: 360_000_000,
      sellingCost: 45_000_000,
      holdingCost: 20_000_000,
    });
    // 300 + 25 + 15 + 20 + 2×10 + 360 + 20 + 45 = 805 jt
    expect(result.totalCost).toBe(805_000_000);
    expect(result.revenue).toBe(900_000_000);
    expect(result.profit).toBe(95_000_000);
    expect(result.bidLimit).toBe(900_000_000 - 505_000_000 - 50_000_000);
  });

  it("memotong luas bangunan bila melebihi KDB dan jumlah lantai", () => {
    const result = splitStrategy(
      2,
      baseScenario,
      { ...rules, maxFloors: 1, kdbPercent: 50 },
      build,
    );
    expect(result.detail?.maxBuildingArea).toBe(37.5);
    expect(result.detail?.buildingArea).toBe(37.5);
    expect(result.detail?.buildingCapped).toBe(true);
  });
});

describe("compareStrategies", () => {
  it("hanya membandingkan pecah kavling yang muat di tanah", () => {
    const result = compareStrategies(baseScenario, rules, build);
    expect(result.strategies.map((strategy) => strategy.id)).toEqual(["renovasi", "pecah-2"]);
    expect(result.highestProfitId).toBe("pecah-2");
    // Renovasi lebih cepat, sehingga ROI per tahunnya lebih tinggi.
    expect(result.highestAnnualRoiId).toBe("renovasi");
  });

  it("membatasi perbandingan sampai 4 rumah", () => {
    const result = compareStrategies(
      baseScenario,
      { ...rules, landArea: 600, frontage: 60 },
      build,
    );
    expect(result.capacity.maxUnits).toBe(10);
    expect(result.strategies.at(-1)?.units).toBe(4);
  });

  it("tidak menobatkan strategi yang rugi", () => {
    const result = compareStrategies(
      { ...baseScenario, salePrice: 100_000_000 },
      { ...rules, landArea: 50 },
      build,
    );
    expect(result.highestProfitId).toBeNull();
  });
});

describe("splitOffer", () => {
  it("tidak menawarkan bila tanah hanya muat satu rumah", () => {
    const result = compareStrategies(baseScenario, { ...rules, landArea: 100 }, build);
    expect(splitOffer(result)).toEqual({ tier: "none" });
  });

  it("menyarankan pecah kavling bila labanya lebih besar dari renovasi", () => {
    const offer = splitOffer(compareStrategies(baseScenario, rules, build));
    expect(offer).toMatchObject({ tier: "recommended", maxUnits: 2, best: { id: "pecah-2" } });
  });

  it("hanya memberi info bila pecah kavling muat tetapi kurang untung", () => {
    const offer = splitOffer(
      compareStrategies(baseScenario, rules, { ...build, salePerUnit: 350_000_000 }),
    );
    expect(offer.tier).toBe("info");
  });
});
