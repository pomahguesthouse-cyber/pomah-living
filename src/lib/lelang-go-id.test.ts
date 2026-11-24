import { describe, expect, it } from "vitest";
import { isLelangPhotoUrl, lelangLotId, parseLelangInfo } from "./lelang-go-id";

const lot = "09641302-12de-48f6-a188-dcdfd0ac65c1";
const sample = {
  code: 200,
  data: {
    namaLotLelang:
      "1 bidang tanah dengan total luas 108 m<sup>2</sup> berikut bangunan di Kab. Bogor",
    nilaiLimit: "685900000",
    uangJaminan: "240000000",
    tglMulaiLelang: "2026-10-28T00:00:00+07:00",
    content: JSON.stringify({
      barangs: [
        {
          alamat: "Perumahan Cahaya Kemang Bogor Blok B No. 1, Kabupaten Bogor",
          luas: "108",
          buktiKepemilikan: "SHM Elektronik",
        },
      ],
    }),
    photos: [
      {
        iscover: false,
        deletedAt: null,
        file: { folder: "photo_barang/2026/10/01", fileName: "a.jpg" },
      },
      {
        iscover: true,
        deletedAt: null,
        file: { folder: "photo_barang/2026/10/01", fileName: "cover.jpg" },
      },
      {
        iscover: false,
        deletedAt: "2026-10-02",
        file: { folder: "photo_barang/2026/10/01", fileName: "old.jpg" },
      },
      { iscover: false, deletedAt: null, file: { folder: "../etc", fileName: "passwd.jpg" } },
    ],
  },
};

describe("lelangLotId", () => {
  it("mengambil ID lot dari tautan detail lelang", () => {
    expect(
      lelangLotId(
        `https://lelang.go.id/kpknl/6705aec8-f64f-11ed-b3e2-5620a0c2ec5a/detail-auction/${lot}`,
      ),
    ).toBe(lot);
  });
  it("menolak host lain atau tautan tanpa ID lot", () => {
    expect(lelangLotId(`https://evil.test/detail-auction/${lot}`)).toBeNull();
    expect(lelangLotId("https://lelang.go.id/kpknl/x")).toBeNull();
  });
});

describe("parseLelangInfo", () => {
  it("membaca fakta lot dan foto dengan sampul lebih dulu", () => {
    expect(parseLelangInfo(sample)).toEqual({
      title: "1 bidang tanah dengan total luas 108 m² berikut bangunan di Kab. Bogor",
      limit: 685_900_000,
      deposit: 240_000_000,
      address: "Perumahan Cahaya Kemang Bogor Blok B No. 1, Kabupaten Bogor",
      landArea: 108,
      auctionDate: "2026-10-28",
      legal: "SHM Elektronik",
      photoUrls: [
        "https://file.lelang.go.id/lelang/photo_barang/2026/10/01/cover.jpg",
        "https://file.lelang.go.id/lelang/photo_barang/2026/10/01/a.jpg",
      ],
    });
  });
  it("mengembalikan null untuk respons yang bukan data lot", () => {
    expect(parseLelangInfo({ code: 404 })).toBeNull();
    expect(parseLelangInfo(null)).toBeNull();
  });
});

describe("isLelangPhotoUrl", () => {
  it("hanya menerima foto barang dari host berkas resmi", () => {
    expect(isLelangPhotoUrl("https://file.lelang.go.id/lelang/photo_barang/2026/10/01/a.jpg")).toBe(
      true,
    );
    expect(isLelangPhotoUrl("http://file.lelang.go.id/lelang/photo_barang/a.jpg")).toBe(false);
    expect(isLelangPhotoUrl("https://file.lelang.go.id/lelang/dokumen/a.pdf")).toBe(false);
    expect(isLelangPhotoUrl("https://evil.test/lelang/photo_barang/a.jpg")).toBe(false);
  });
});
