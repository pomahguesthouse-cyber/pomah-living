import { describe, expect, it } from "vitest";
import { formatTanggal } from "./format-date";

describe("formatTanggal", () => {
  it("memformat tanggal ISO ke format Indonesia", () => {
    expect(formatTanggal("2026-12-15")).toBe("15 Desember 2026");
    expect(formatTanggal("2026-11-20T23:17:01.12+00:00")).toBe("20 November 2026");
    expect(formatTanggal("2026-12-15", { withDay: true })).toBe("Selasa, 15 Desember 2026");
    expect(formatTanggal("2026-02-03", { short: true })).toBe("3 Feb 2026");
  });

  it("memakai fallback untuk tanggal kosong atau tidak sah", () => {
    expect(formatTanggal("", { fallback: "Belum diisi" })).toBe("Belum diisi");
    expect(formatTanggal("2026-13-01")).toBe("");
    expect(formatTanggal(null)).toBe("");
  });

  it("menerima objek Date", () => {
    expect(formatTanggal(new Date(2026, 10, 25))).toBe("25 November 2026");
  });
});
