import { describe, expect, it } from "vitest";
import {
  matchesPreferredRegions,
  provinceOptions,
  regencyOptions,
  regionName,
} from "@/lib/indonesia-regions";
import { properties } from "@/lib/properties";

describe("Preferred regions", () => {
  it("provides all provinces and regencies from the bundled dataset", () => {
    expect(provinceOptions).toHaveLength(38);
    expect(provinceOptions.flatMap(({ code }) => regencyOptions(code))).toHaveLength(514);
    expect(regionName("3276")).toBe("Kota Depok");
    expect(regionName("__proto__")).toBeUndefined();
  });

  it("matches province-wide and individual asset locations with OR logic", () => {
    const match = (regions: string[]) =>
      properties
        .filter(({ regionCode }) => matchesPreferredRegions(regionCode, regions))
        .map(({ id }) => id);
    expect(match(["32"])).toHaveLength(3);
    expect(match(["3276", "3275"])).toEqual(["sawangan", "jatiasih"]);
    expect(match(["31"])).toEqual([]);
    expect(match([])).toHaveLength(3);
  });
});
