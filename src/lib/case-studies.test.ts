import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { bedahanCibinong, caseStudyResult } from "./case-studies";

describe("bedahanCibinong", () => {
  it("menampilkan tahap sebelum, proses, dan sesudah secara berurutan", () => {
    const labels = bedahanCibinong.photos.map((photo) => photo.label);
    const order = { Sebelum: 0, Proses: 1, Sesudah: 2 };
    expect(labels.map((label) => order[label])).toEqual(
      [...labels.map((label) => order[label])].sort((a, b) => a - b),
    );
    expect(new Set(labels)).toEqual(new Set(["Sebelum", "Proses", "Sesudah"]));
  });

  it("setiap foto punya teks alternatif dan berkasnya tersedia", () => {
    for (const photo of bedahanCibinong.photos) {
      expect(photo.alt.length).toBeGreaterThan(10);
      expect(existsSync(`public${photo.src}`)).toBe(true);
    }
  });

  it("menghitung laba kotor dari harga beli, renovasi, dan harga jual", () => {
    expect(caseStudyResult(bedahanCibinong.figures)).toEqual({
      totalCost: 370_000_000,
      grossProfit: 60_000_000,
      margin: 60 / 370,
    });
  });
});
