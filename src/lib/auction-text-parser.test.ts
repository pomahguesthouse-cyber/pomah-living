import { describe, expect, it } from "vitest";
import { parseAuctionText } from "./auction-text-parser";

describe("DJKN rendered page text parsing", () => {
  it("extracts auction financials and land area from sample listing", () => {
    const data = parseAuctionText([
      "1 bidang tanah dengan total luas 77 m² berikut bangunan di Kab. Bogor",
      "Nilai Limit",
      "Rp223.000.000",
      "Uang Jaminan",
      "Rp44.600.000",
      "Kode Lot Lelang",
      "7RYXAG",
    ].join("\n"));
    expect(data.limit).toBe(223000000);
    expect(data.deposit).toBe(44600000);
    expect(data.landArea).toBe(77);
    expect(data.lotCode).toBe("7RYXAG");
    expect(data.buildingArea).toBeNull();
  });
  it("extracts title, location and certificate from Uraian tab", () => {
    const data = parseAuctionText([
      "Jenis Barang",
      "Tidak Bergerak Tanah Berikut Bangunan",
      "Bukti Kepemilikan",
      "SHM No: 6439",
      "Uraian",
      "Luas: 77 M²",
      "Alamat: Perumahan Grande Kencana Blok J No. 15,",
      "Desa/Kelurahan Harapan Jaya, Kecamatan Cibinong,",
      "Kabupaten Bogor, Provinsi Jawa Barat",
      "Lihat Lokasi",
    ].join("\n"));
    expect(data.landArea).toBe(77);
    expect(data.address).toContain("Perumahan Grande Kencana");
    expect(data.address).toContain("Jawa Barat");
    expect(data.certificate).toMatch(/6439/);
  });
});
