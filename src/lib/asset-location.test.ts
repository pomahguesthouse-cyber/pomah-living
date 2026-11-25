import { describe, expect, it } from "vitest";
import { kecamatanFrom, shortLocation } from "./asset-location";

const bogor =
  "Perumahan Cahaya Kemang Bogor Blok B No. 1 (d.h. Griya Bumi Pasundan Blok B No 1), Desa/Kelurahan Bojong, Kecamatan Kemang, Kabupaten Bogor, Provinsi Jawa Barat";

describe("kecamatanFrom", () => {
  it("mengambil nama kecamatan dari alamat", () => {
    expect(kecamatanFrom(bogor)).toBe("Kemang");
    expect(kecamatanFrom("Jl. Mawar, Kec. CIBINONG, Kab. Bogor")).toBe("Cibinong");
    expect(kecamatanFrom("Cibinong, Kabupaten Bogor")).toBeNull();
  });
});

describe("shortLocation", () => {
  it("menampilkan kecamatan dan kabupaten saja", () => {
    expect(shortLocation(bogor, "3201")).toBe("Kec. Kemang, Kab. Bogor");
  });
  it("alamat pendek tanpa kecamatan dipakai apa adanya", () => {
    expect(shortLocation("Cibinong, Kabupaten Bogor", "3201")).toBe("Cibinong, Kab. Bogor");
    expect(shortLocation("Sawangan, Depok", "3276")).toBe("Sawangan, Depok");
  });
  it("alamat panjang tanpa kecamatan memakai nama kabupaten/kota", () => {
    expect(
      shortLocation("Perumahan Griya Indah Blok C No. 12 RT 03 RW 05 Desa Sukamaju", "3276"),
    ).toBe("Kota Depok");
  });
});
