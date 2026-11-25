import { z } from "zod";
import type { FlippingProject } from "@/lib/flipping";

/**
 * Penetapan harga jual di tahap Analisis aset: flipper mengisi rumah pembanding, platform
 * menyesuaikan ke luas aset dan memberi rentang wajar, lalu flipper menetapkan target.
 * Target = skenario Moderat; Pesimis dan Optimis mengikuti ±10% selama belum diubah.
 */

export const comparableConditions = ["Siap huni", "Baru", "Perlu renovasi"] as const;
export type ComparableCondition = (typeof comparableConditions)[number];

const amount = z.number().finite().min(0).max(1_000_000_000_000);
export const comparableSchema = z.object({
  id: z.string().max(80),
  source: z.string().max(200),
  url: z.string().max(500),
  landArea: amount,
  buildingArea: amount,
  condition: z.enum(comparableConditions),
  askingPrice: amount,
  date: z.string().max(20),
});
export type Comparable = z.infer<typeof comparableSchema>;

export const pricingSchema = z.object({
  comparables: z.array(comparableSchema).max(12),
  /** Diskon dari harga iklan ke perkiraan harga transaksi, persen. */
  negotiationPercent: z.number().finite().min(0).max(50),
});
export type Pricing = z.infer<typeof pricingSchema>;

export const defaultPricing: Pricing = { comparables: [], negotiationPercent: 7 };
/** Pembanding yang luasnya berselisih lebih dari ini dianggap lemah. */
export const sizeTolerance = 0.25;
/** Jumlah pembanding kuat minimal agar rentang dianggap andal. */
export const minStrongComparables = 3;
/** Selisih skenario Pesimis/Optimis dari target. */
export const scenarioSpread = 0.1;

export function emptyComparable(id: string): Comparable {
  return {
    id,
    source: "",
    url: "",
    landArea: 0,
    buildingArea: 0,
    condition: "Siap huni",
    askingPrice: 0,
    date: "",
  };
}

const roundTo = (value: number, step = 5_000_000) => Math.round(value / step) * step;

export type ComparableEstimate = {
  id: string;
  /** Perkiraan harga aset menurut pembanding ini, setelah diskon negosiasi. */
  estimate: number;
  pricePerBuildingM2: number | null;
  pricePerLandM2: number | null;
  strong: boolean;
  reasons: string[];
};

/** Sesuaikan satu pembanding ke luas aset: rata-rata pendekatan per m² bangunan dan per m² tanah. */
export function estimateFromComparable(
  asset: { land: number; building: number },
  comparable: Comparable,
  negotiationPercent: number,
): ComparableEstimate | null {
  if (comparable.askingPrice <= 0) return null;
  const transaction = comparable.askingPrice * (1 - negotiationPercent / 100);
  const perBuilding = comparable.buildingArea > 0 ? transaction / comparable.buildingArea : null;
  const perLand = comparable.landArea > 0 ? transaction / comparable.landArea : null;
  const approaches = [
    perBuilding !== null && asset.building > 0 ? perBuilding * asset.building : null,
    perLand !== null && asset.land > 0 ? perLand * asset.land : null,
  ].filter((value): value is number => value !== null);
  const estimate = approaches.length
    ? approaches.reduce((sum, value) => sum + value, 0) / approaches.length
    : transaction;
  const reasons: string[] = [];
  const differs = (own: number, other: number) =>
    own > 0 && other > 0 && Math.abs(other - own) / own > sizeTolerance;
  if (differs(asset.land, comparable.landArea)) reasons.push("luas tanah beda >25%");
  if (differs(asset.building, comparable.buildingArea)) reasons.push("luas bangunan beda >25%");
  if (comparable.landArea <= 0 || comparable.buildingArea <= 0) reasons.push("luas belum lengkap");
  if (comparable.condition === "Perlu renovasi") reasons.push("kondisi belum direnovasi");
  return {
    id: comparable.id,
    estimate: Math.round(estimate),
    pricePerBuildingM2: perBuilding === null ? null : Math.round(perBuilding),
    pricePerLandM2: perLand === null ? null : Math.round(perLand),
    strong: reasons.length === 0,
    reasons,
  };
}

function quantile(sorted: number[], q: number) {
  if (sorted.length === 1) return sorted[0]!;
  const position = (sorted.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return sorted[lower]! + (sorted[upper]! - sorted[lower]!) * (position - lower);
}

export type PriceRange = {
  low: number;
  mid: number;
  high: number;
  /** Jumlah pembanding yang dipakai menghitung rentang. */
  used: number;
  strongCount: number;
  /** true bila pembanding kuat kurang dari minimal sehingga semua pembanding dipakai. */
  weak: boolean;
};

/** Rentang harga wajar: kuartil bawah, median, kuartil atas dari perkiraan pembanding. */
export function priceRange(
  asset: { land: number; building: number },
  pricing: Pricing,
): { estimates: ComparableEstimate[]; range: PriceRange | null } {
  const estimates = pricing.comparables
    .map((comparable) => estimateFromComparable(asset, comparable, pricing.negotiationPercent))
    .filter((estimate): estimate is ComparableEstimate => estimate !== null);
  const strong = estimates.filter((estimate) => estimate.strong);
  const weak = strong.length < minStrongComparables;
  const basis = (weak ? estimates : strong).map((estimate) => estimate.estimate);
  if (basis.length === 0) return { estimates, range: null };
  const sorted = [...basis].sort((a, b) => a - b);
  return {
    estimates,
    range: {
      low: roundTo(quantile(sorted, 0.25), 1_000_000),
      mid: roundTo(quantile(sorted, 0.5), 1_000_000),
      high: roundTo(quantile(sorted, 0.75), 1_000_000),
      used: basis.length,
      strongCount: strong.length,
      weak,
    },
  };
}

/** Harga skenario Pesimis dan Optimis yang mengikuti target. */
export function followingScenarioSales(target: number) {
  return {
    pessimistic: roundTo(target * (1 - scenarioSpread)),
    optimistic: roundTo(target * (1 + scenarioSpread)),
  };
}

/**
 * Tetapkan target harga jual (= skenario Moderat). Harga Pesimis/Optimis ikut berubah bila
 * masih kosong atau masih sama dengan turunan target lama; yang sudah diubah flipper dibiarkan.
 */
export function withTargetSale(project: FlippingProject, sale: number): FlippingProject {
  const before = followingScenarioSales(project.finance.sale);
  const after = followingScenarioSales(sale);
  const scenarios = project.scenarios.map((scenario, index) => {
    if (index === 0 && (scenario.sale === 0 || scenario.sale === before.pessimistic))
      return { ...scenario, sale: after.pessimistic };
    if (index === 2 && (scenario.sale === 0 || scenario.sale === before.optimistic))
      return { ...scenario, sale: after.optimistic };
    return scenario;
  }) as FlippingProject["scenarios"];
  return { ...project, finance: { ...project.finance, sale }, scenarios };
}
