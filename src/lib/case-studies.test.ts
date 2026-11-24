import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { bedahanCibinong } from "./case-studies";

describe("bedahanCibinong", () => {
  it("menampilkan tahap sebelum, proses, dan sesudah secara berurutan", () => {
    expect(bedahanCibinong.stages.map((stage) => stage.label)).toEqual([
      "Sebelum",
      "Proses",
      "Sesudah",
    ]);
  });

  it("setiap foto punya teks alternatif dan berkasnya tersedia", () => {
    for (const photo of [...bedahanCibinong.stages, ...bedahanCibinong.interior]) {
      expect(photo.alt.length).toBeGreaterThan(10);
      expect(existsSync(`public${photo.src}`)).toBe(true);
    }
  });
});
