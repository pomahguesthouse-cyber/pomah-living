import { describe, expect, it } from "vitest";
import { catalogSummary, daysUntilAuction } from "./catalog-summary";

const settings = { minLotArea: 60, minFrontage: 6 };

describe("catalogSummary", () => {
  it("menghitung limit per m² dan potensi kavling dari fakta aset", () => {
    expect(
      catalogSummary({ auctionLimit: 300_000_000, landArea: 150, landWidth: 12 }, settings),
    ).toEqual({
      auctionLimit: 300_000_000,
      landArea: 150,
      limitPerM2: 2_000_000,
      potentialUnits: 2,
      widthUnknown: false,
    });
  });

  it("memakai panjang × lebar bila luas kosong dan dibatasi lebar muka", () => {
    const summary = catalogSummary(
      { auctionLimit: 240_000_000, landArea: null, landWidth: 8, landLength: 20 },
      settings,
    );
    expect(summary.landArea).toBe(160);
    expect(summary.potentialUnits).toBe(1);
  });

  it("tanpa data tanah tetap satu rumah dan tanpa limit per m²", () => {
    expect(catalogSummary({ auctionLimit: 1, landArea: null }, settings)).toMatchObject({
      landArea: null,
      limitPerM2: null,
      potentialUnits: 1,
      widthUnknown: true,
    });
  });
});

describe("daysUntilAuction", () => {
  const today = new Date(2026, 10, 25);
  it("menghitung sisa hari", () => {
    expect(daysUntilAuction("2026-12-07", today)).toBe(12);
    expect(daysUntilAuction("2026-11-25", today)).toBe(0);
  });
  it("kosong bila tanggal tidak ada atau sudah lewat", () => {
    expect(daysUntilAuction(null, today)).toBeNull();
    expect(daysUntilAuction("2026-11-01", today)).toBeNull();
  });
});
