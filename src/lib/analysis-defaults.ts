import { z } from "zod";
import type { SimulationValues } from "@/lib/simulation";

/**
 * Standar platform untuk titik awal analisis aset katalog. Katalog admin hanya berisi
 * fakta aset; angka perhitungan dimulai dari standar ini dan diubah oleh flipper.
 * Admin mengubah standarnya di Admin → Pengaturan.
 */
export const renovationLevels = ["ringan", "sedang", "berat"] as const;
export type RenovationLevel = (typeof renovationLevels)[number];

export const renovationLevelLabels: Record<RenovationLevel, string> = {
  ringan: "Ringan",
  sedang: "Sedang",
  berat: "Berat",
};

const percent = z.number().finite().min(0, "Tidak boleh negatif.").max(100, "Maksimal 100%.");
const perM2 = z.number().int("Gunakan angka bulat.").min(0).max(100_000_000);

export const analysisDefaultsSchema = z.object({
  /** Bea lelang, BPHTB, notaris dan balik nama, persen dari harga menang. */
  purchaseCostPercent: percent,
  /** Biaya kepemilikan sementara dan biaya jual, persen dari harga jual. */
  holdingSalePercent: percent,
  /** Target laba, persen dari modal (harga menang + biaya perolehan + renovasi). */
  targetProfitPercent: percent,
  /** Perkiraan cepat biaya renovasi per m² luas bangunan. */
  renovationPerM2: z.object({ ringan: perM2, sedang: perM2, berat: perM2 }),
});
export type AnalysisDefaults = z.infer<typeof analysisDefaultsSchema>;

export const defaultAnalysisDefaults: AnalysisDefaults = {
  purchaseCostPercent: 8,
  holdingSalePercent: 6,
  targetProfitPercent: 15,
  renovationPerM2: { ringan: 750_000, sedang: 2_000_000, berat: 3_500_000 },
};

/** Kunci baris di tabel `app_settings`. */
export const analysisDefaultsKey = "analysis_defaults";

export function parseAnalysisDefaults(value: unknown): AnalysisDefaults {
  if (!value || typeof value !== "object") return defaultAnalysisDefaults;
  const raw = value as Record<string, unknown>;
  const merged = {
    ...defaultAnalysisDefaults,
    ...raw,
    renovationPerM2: {
      ...defaultAnalysisDefaults.renovationPerM2,
      ...(raw["renovationPerM2"] && typeof raw["renovationPerM2"] === "object"
        ? (raw["renovationPerM2"] as Record<string, unknown>)
        : {}),
    },
  };
  const parsed = analysisDefaultsSchema.safeParse(merged);
  return parsed.success ? parsed.data : defaultAnalysisDefaults;
}

const percentOf = (value: number, rate: number) => Math.round((value * rate) / 100);

/** Biaya yang mengikuti standar platform, dihitung dari angka yang sudah diisi. */
export function standardCosts(
  values: Pick<SimulationValues, "winningPrice" | "salePrice" | "renovationCosts">,
  defaults: AnalysisDefaults,
) {
  const purchaseCosts = percentOf(values.winningPrice, defaults.purchaseCostPercent);
  return {
    purchaseCosts,
    holdingAndSaleCosts: percentOf(values.salePrice, defaults.holdingSalePercent),
    targetProfit: percentOf(
      values.winningPrice + purchaseCosts + values.renovationCosts,
      defaults.targetProfitPercent,
    ),
  };
}

/**
 * Titik awal analisis aset katalog: harga menang = limit, biaya mengikuti standar,
 * renovasi dan harga jual kosong sampai diisi flipper.
 */
export function startingValues(auctionLimit: number, defaults: AnalysisDefaults): SimulationValues {
  const base = { winningPrice: auctionLimit, salePrice: 0, renovationCosts: 0 };
  return { ...base, ...standardCosts(base, defaults) };
}

/** Perkiraan cepat renovasi dari luas bangunan dan tingkat kerusakan. */
export function quickRenovation(
  buildingArea: number,
  level: RenovationLevel,
  defaults: AnalysisDefaults,
) {
  return Math.round(Math.max(0, buildingArea) * defaults.renovationPerM2[level]);
}

/**
 * Setelah flipper mengubah satu angka, biaya yang masih sama dengan standar ikut
 * dihitung ulang; biaya yang sudah diubah flipper dibiarkan.
 */
export function followStandards(
  previous: SimulationValues,
  next: SimulationValues,
  defaults: AnalysisDefaults,
): SimulationValues {
  const before = standardCosts(previous, defaults);
  const result = { ...next };
  if (
    previous.purchaseCosts === before.purchaseCosts &&
    next.purchaseCosts === previous.purchaseCosts
  )
    result.purchaseCosts = standardCosts(next, defaults).purchaseCosts;
  if (
    previous.holdingAndSaleCosts === before.holdingAndSaleCosts &&
    next.holdingAndSaleCosts === previous.holdingAndSaleCosts
  )
    result.holdingAndSaleCosts = standardCosts(next, defaults).holdingAndSaleCosts;
  const targetBefore = percentOf(
    previous.winningPrice + previous.purchaseCosts + previous.renovationCosts,
    defaults.targetProfitPercent,
  );
  if (previous.targetProfit === targetBefore && next.targetProfit === previous.targetProfit)
    result.targetProfit = percentOf(
      result.winningPrice + result.purchaseCosts + result.renovationCosts,
      defaults.targetProfitPercent,
    );
  return result;
}
