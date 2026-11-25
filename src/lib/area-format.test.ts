import { describe, expect, it } from "vitest";
import { formatArea, formatLandArea } from "./area-format";

describe("formatArea", () => {
  it("memformat luas dan memakai teks pengganti bila kosong", () => {
    expect(formatArea(1200)).toBe("1.200 m²");
    expect(formatArea(12.5)).toBe("12,5 m²");
    expect(formatArea(null)).toBe("Belum diketahui");
    expect(formatArea(0, "Belum diisi")).toBe("Belum diisi");
  });
});

describe("formatLandArea", () => {
  it("menambahkan ukuran panjang × lebar bila diketahui", () => {
    expect(formatLandArea(120, 8, 15)).toBe("120 m² (8 × 15 m)");
    expect(formatLandArea(null, 8, 15)).toBe("120 m² (8 × 15 m)");
    expect(formatLandArea(108)).toBe("108 m²");
    expect(formatLandArea(null)).toBe("Belum diketahui");
  });
});
