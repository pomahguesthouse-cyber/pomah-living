import { describe, expect, it } from "vitest";
import { makeFlippingProject } from "./flipping";
import {
  emptyComparable,
  estimateFromComparable,
  followingScenarioSales,
  priceRange,
  priceSensitivity,
  simulateSalePrice,
  withTargetSale,
  type Comparable,
} from "./pricing";

const asset = { land: 72, building: 45 };
const comparable = (patch: Partial<Comparable>): Comparable => ({
  ...emptyComparable(String(Math.random())),
  landArea: 72,
  buildingArea: 45,
  askingPrice: 500_000_000,
  ...patch,
});

describe("estimateFromComparable", () => {
  it("memotong diskon negosiasi lalu menyesuaikan ke luas aset", () => {
    // 500 jt − 10% = 450 jt; per m² bangunan 10 jt × 45, per m² tanah 6,25 jt × 72 → 450 jt.
    const result = estimateFromComparable(asset, comparable({}), 10);
    expect(result).toMatchObject({
      estimate: 450_000_000,
      pricePerBuildingM2: 10_000_000,
      pricePerLandM2: 6_250_000,
      strong: true,
    });
  });

  it("rata-rata pendekatan bangunan dan tanah bila luas berbeda, dan menandai pembanding lemah", () => {
    const result = estimateFromComparable(asset, comparable({ landArea: 60, buildingArea: 30 }), 0);
    // per bangunan 16,67 jt × 45 = 750 jt; per tanah 8,33 jt × 72 = 600 jt → 675 jt
    expect(result?.estimate).toBe(675_000_000);
    expect(result?.strong).toBe(false);
    expect(result?.reasons).toContain("luas bangunan beda >25%");
  });

  it("mengabaikan pembanding tanpa harga", () => {
    expect(estimateFromComparable(asset, comparable({ askingPrice: 0 }), 7)).toBeNull();
  });
});

describe("priceRange", () => {
  it("memakai kuartil dari pembanding kuat bila cukup", () => {
    const { range } = priceRange(asset, {
      negotiationPercent: 0,
      comparables: [
        comparable({ askingPrice: 400_000_000 }),
        comparable({ askingPrice: 450_000_000 }),
        comparable({ askingPrice: 500_000_000 }),
        comparable({ askingPrice: 550_000_000 }),
        comparable({ askingPrice: 900_000_000, condition: "Perlu renovasi" }),
      ],
    });
    expect(range).toEqual({
      low: 438_000_000,
      mid: 475_000_000,
      high: 513_000_000,
      used: 4,
      strongCount: 4,
      weak: false,
    });
  });

  it("memakai semua pembanding dan menandai lemah bila pembanding kuat kurang dari 3", () => {
    const { range } = priceRange(asset, {
      negotiationPercent: 0,
      comparables: [comparable({}), comparable({ landArea: 200 })],
    });
    expect(range).toMatchObject({ used: 2, strongCount: 1, weak: true });
  });

  it("tanpa pembanding tidak ada rentang", () => {
    expect(priceRange(asset, { negotiationPercent: 7, comparables: [] }).range).toBeNull();
  });
});

describe("withTargetSale", () => {
  it("menetapkan target dan skenario Pesimis/Optimis ikut ±10%", () => {
    const project = makeFlippingProject("cibinong");
    const next = withTargetSale(project, 500_000_000);
    expect(next.finance.sale).toBe(500_000_000);
    expect(next.scenarios[0]?.sale).toBe(450_000_000);
    expect(next.scenarios[2]?.sale).toBe(550_000_000);
  });

  it("tidak menimpa harga skenario yang sudah diubah flipper", () => {
    const project = makeFlippingProject("cibinong");
    const edited = {
      ...project,
      scenarios: project.scenarios.map((scenario, index) =>
        index === 0 ? { ...scenario, sale: 333_000_000 } : scenario,
      ) as typeof project.scenarios,
    };
    const next = withTargetSale(edited, 500_000_000);
    expect(next.scenarios[0]?.sale).toBe(333_000_000);
    expect(next.scenarios[2]?.sale).toBe(followingScenarioSales(500_000_000).optimistic);
  });
});

describe("simulasi harga jual", () => {
  it("menghitung laba pada harga coba tanpa mengubah target", () => {
    const project = makeFlippingProject("cibinong");
    const base = simulateSalePrice(project, project.finance.sale);
    const higher = simulateSalePrice(project, project.finance.sale + 10_000_000);
    expect(project.finance.sale).toBe(makeFlippingProject("cibinong").finance.sale);
    expect(higher.profit).toBeGreaterThan(base.profit);
    expect(higher.profit - base.profit).toBeLessThan(10_000_000); // biaya jual ikut naik
  });

  it("tabel kepekaan berisi lima harga dengan target di tengah", () => {
    const project = makeFlippingProject("cibinong");
    const rows = priceSensitivity(project);
    expect(rows.map((row) => row.step)).toEqual([-10, -5, 0, 5, 10]);
    expect(rows[2]?.sale).toBe(Math.round(project.finance.sale / 1_000_000) * 1_000_000);
    expect(rows[0]!.profit).toBeLessThan(rows[4]!.profit);
  });
});
