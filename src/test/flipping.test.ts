import { describe, expect, it } from "vitest";
import {
  calculateFlipping,
  formatProjectDate,
  isDemoProject,
  makeFlippingProject,
  makeProjectFromAnalysis,
  rabTotal,
  readFlippingProject,
  scaledDemoRab,
} from "@/lib/flipping";

describe("Flipping investment rules", () => {
  const demo = makeFlippingProject("demo");
  it("restores assessments for older project payloads and preserves edited notes", () => {
    const previous = { ...demo } as Record<string, unknown>;
    delete previous["assetAssessments"];
    const migrated = readFlippingProject(previous);
    expect(migrated.assetAssessments).toHaveLength(9);
    expect(migrated.assetAssessments[0]?.condition).toBe("Belum diperiksa");
    const edited = {
      ...migrated,
      assetAssessments: migrated.assetAssessments.map((row, index) =>
        index === 0 ? { ...row, finding: "Noda air", recommendation: "Periksa talang" } : row,
      ),
    };
    expect(
      readFlippingProject(JSON.parse(JSON.stringify(edited))).assetAssessments[0]?.finding,
    ).toBe("Noda air");
  });
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
    expect(formatProjectDate("2026-11-20")).toBe("20 November 2026");
    expect(formatProjectDate("")).toBe("Belum diisi");
  });
});

describe("Projects seeded from asset analysis", () => {
  it("uses Cibinong's analysis prices and photo-based RAB", () => {
    const project = makeFlippingProject("cibinong");
    expect(project.finance.purchase).toBe(300_000_000);
    expect(project.finance.sale).toBe(480_000_000);
    expect(rabTotal(project.rab)).toBe(70_361_500);
    expect(project.rab.some((item) => item.id === "dinding-waterproof")).toBe(true);
  });
  it("matches each asset's renovation budget from the analysis", () => {
    expect(rabTotal(makeFlippingProject("sawangan").rab)).toBe(60_000_000);
    expect(rabTotal(makeFlippingProject("jatiasih").rab)).toBe(85_000_000);
    expect(makeFlippingProject("jatiasih").finance.purchase).toBe(320_000_000);
  });
  it("keeps the generic demo unchanged", () => {
    expect(rabTotal(makeFlippingProject("demo").rab)).toBe(70_000_000);
  });
  it("scales the generic RAB to any target exactly", () => {
    expect(rabTotal(scaledDemoRab(53_210_000))).toBe(53_210_000);
  });
});

describe("Projects created from a catalog analysis", () => {
  const snapshot = {
    name: "Rumah Cilodong",
    location: "Cilodong, Depok",
    auctionLimit: 270_000_000,
    auctionDate: "2026-12-20",
    landArea: 72,
    buildingArea: 45,
    legal: "SHM",
    source: "Lelang BTN",
    verification: { occupancy: true, access: true, documents: false },
    values: { salePrice: 450_000_000, winningPrice: 285_000_000, renovationCosts: 65_000_000 },
  };
  it("carries the analysed prices and renovation budget into the project", () => {
    const project = makeProjectFromAnalysis(snapshot);
    expect(project.finance.purchase).toBe(285_000_000);
    expect(project.finance.bphtbBase).toBe(285_000_000);
    expect(project.finance.sale).toBe(450_000_000);
    expect(rabTotal(project.rab)).toBe(65_000_000);
    expect(project.property.limit).toBe(270_000_000);
    expect(project.property.land).toBe(72);
    expect(project.scenarios.map((scenario) => scenario.sale)).toEqual([
      405_000_000, 450_000_000, 495_000_000,
    ]);
  });
  it("marks only risks that were verified during analysis", () => {
    const risks = makeProjectFromAnalysis(snapshot).risks;
    expect(risks.find((risk) => risk.id === "occupancy")?.verified).toBe(true);
    expect(risks.find((risk) => risk.id === "documents")?.verified).toBe(false);
    expect(risks.find((risk) => risk.id === "structure")?.verified).toBe(false);
  });
  it("produces a payload that passes project validation", () => {
    expect(() => readFlippingProject(makeProjectFromAnalysis(snapshot))).not.toThrow();
  });
});

describe("Project origin for duplicate checks", () => {
  const snapshot = {
    listingSlug: "rumah-cilodong",
    name: "Rumah Cilodong",
    location: "Depok",
    auctionLimit: 270_000_000,
    source: "Lelang BTN",
    verification: { occupancy: false, access: false, documents: false },
    values: { salePrice: 450_000_000, winningPrice: 270_000_000, renovationCosts: 60_000_000 },
  };
  it("stores the catalog slug so existing projects can be found", () => {
    const project = readFlippingProject(makeProjectFromAnalysis(snapshot));
    expect(project.origin?.listingSlug).toBe("rumah-cilodong");
  });
  it("still reads older projects without an origin", () => {
    const older = { ...makeFlippingProject("demo") } as Record<string, unknown>;
    delete older["origin"];
    expect(readFlippingProject(older).origin).toBeUndefined();
  });
  it("rejects an invalid origin slug", () => {
    expect(() =>
      readFlippingProject({ ...makeFlippingProject("demo"), origin: { listingSlug: "Bad Slug" } }),
    ).toThrow();
  });
});
