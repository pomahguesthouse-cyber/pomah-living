import { describe, expect, it } from "vitest";
import { defaultLandSettings, parseLandSettings, resolveLandSize } from "./land-settings";

describe("parseLandSettings", () => {
  it("memakai standar bawaan bila nilai kosong atau rusak", () => {
    expect(parseLandSettings(null)).toEqual(defaultLandSettings);
    expect(parseLandSettings({ minLotArea: -5 })).toEqual(defaultLandSettings);
  });

  it("menggabungkan nilai dari database dengan bawaan", () => {
    expect(parseLandSettings({ minLotArea: 72 })).toEqual({
      ...defaultLandSettings,
      minLotArea: 72,
    });
  });
});

describe("resolveLandSize", () => {
  it("panjang × lebar memberi luas dan lebar muka", () => {
    expect(
      resolveLandSize({ mode: "dimensions", length: 20, width: 7.5, area: 0, frontage: 0 }),
    ).toEqual({ landArea: 150, frontage: 7.5 });
  });

  it("mode luas memakai lebar muka opsional", () => {
    expect(resolveLandSize({ mode: "area", length: 20, width: 8, area: 120, frontage: 0 })).toEqual(
      { landArea: 120, frontage: 0 },
    );
  });
});
