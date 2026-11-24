import type { LandSettings } from "@/lib/land-settings";

/**
 * Angka katalog yang diturunkan dari fakta aset saja (limit, ukuran tanah, tanggal lelang)
 * dan standar kavling platform, tanpa asumsi harga jual atau biaya.
 */
export function catalogSummary(
  asset: {
    auctionLimit: number;
    landArea: number | null;
    landWidth?: number | null;
    landLength?: number | null;
  },
  settings: Pick<LandSettings, "minLotArea" | "minFrontage">,
) {
  const width = asset.landWidth && asset.landWidth > 0 ? asset.landWidth : null;
  const length = asset.landLength && asset.landLength > 0 ? asset.landLength : null;
  const landArea =
    asset.landArea && asset.landArea > 0 ? asset.landArea : width && length ? width * length : null;
  const byArea = landArea ? Math.floor(landArea / settings.minLotArea) : 0;
  const byWidth = width ? Math.floor(width / settings.minFrontage) : null;
  return {
    auctionLimit: asset.auctionLimit,
    landArea,
    limitPerM2: landArea ? Math.round(asset.auctionLimit / landArea) : null,
    /** Jumlah rumah yang muat; dibatasi lebar muka bila diketahui. */
    potentialUnits: Math.max(1, Math.min(byArea, byWidth ?? byArea)),
    /** true bila lebar muka belum diketahui sehingga potensi hanya dari luas. */
    widthUnknown: byWidth === null,
  };
}

/** Sisa hari menuju lelang; null bila tanggal kosong atau sudah lewat lebih dari sehari. */
export function daysUntilAuction(date: string | null, today = new Date()) {
  if (!date) return null;
  const target = new Date(`${date}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.round((target.getTime() - start.getTime()) / 86_400_000);
  return days < 0 ? null : days;
}
