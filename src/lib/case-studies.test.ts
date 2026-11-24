import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { bedahanCibinong, caseStudies, caseStudyResult, karadenanBogor } from "./case-studies";

const order = { Sebelum: 0, Proses: 1, Sesudah: 2, Desain: 2 } as const;

describe.each(caseStudies)("$title", (study) => {
  it("menampilkan foto berurutan dari sebelum, proses, lalu hasil", () => {
    const steps = study.photos.map((photo) => order[photo.label]);
    expect(steps).toEqual([...steps].sort((a, b) => a - b));
    expect(steps[0]).toBe(0);
    expect(steps.at(-1)).toBe(2);
  });

  it("setiap foto punya teks alternatif dan berkasnya tersedia", () => {
    for (const photo of study.photos) {
      expect(photo.alt.length).toBeGreaterThan(10);
      expect(existsSync(`public${photo.src}`)).toBe(true);
    }
  });

  it("proyek berjalan tidak menampilkan foto sesudah, hanya ilustrasi desain", () => {
    if (study.inProgress) {
      expect(study.photos.some((photo) => photo.label === "Sesudah")).toBe(false);
    }
  });
});

describe("caseStudyResult", () => {
  it("menghitung laba kotor Rumah Bedahan Cibinong", () => {
    expect(caseStudyResult(bedahanCibinong.figures)).toEqual({
      totalCost: 370_000_000,
      grossProfit: 60_000_000,
      margin: 60 / 370,
    });
  });

  it("menghitung estimasi laba kotor Rumah Karadenan Bogor", () => {
    expect(caseStudyResult(karadenanBogor.figures)).toEqual({
      totalCost: 338_000_000,
      grossProfit: 262_000_000,
      margin: 262 / 338,
    });
  });
});
