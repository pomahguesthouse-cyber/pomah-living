import { describe, expect, it } from "vitest";
import { parseSource } from "./source-link";

describe("parseSource", () => {
  it("memisahkan label dan tautan", () => {
    expect(
      parseSource("Lelang DJKN · https://lelang.go.id/kpknl/6705/detail-auction/0964"),
    ).toEqual({
      label: "Lelang DJKN",
      url: "https://lelang.go.id/kpknl/6705/detail-auction/0964",
      host: "lelang.go.id",
    });
  });
  it("teks tanpa tautan tetap utuh", () => {
    expect(parseSource("Simulasi internal Pomah Living")).toEqual({
      label: "Simulasi internal Pomah Living",
      url: null,
      host: null,
    });
  });
  it("hanya tautan https yang dapat diklik", () => {
    expect(parseSource("http://contoh.test/a").url).toBeNull();
    expect(parseSource("https://www.balelelang.btn.co.id/x")).toMatchObject({
      label: "Tautan sumber",
      host: "balelelang.btn.co.id",
    });
  });
});
