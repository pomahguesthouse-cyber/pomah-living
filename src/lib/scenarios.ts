import { calculateFlipping, type FlippingProject } from "@/lib/flipping";

/** Indeks skenario Moderat; skenario ini selalu memakai angka dasar proyek. */
export const baseScenarioIndex = 1;

export type ScenarioInputs = { sale: number; months: number; renovationFactor: number };

export function scenarioInputs(project: FlippingProject, index: number): ScenarioInputs {
  if (index === baseScenarioIndex)
    return { sale: project.finance.sale, months: project.finance.months, renovationFactor: 1 };
  const scenario = project.scenarios[index];
  return {
    sale: scenario?.sale ?? 0,
    months: scenario?.months ?? 0,
    renovationFactor: scenario?.renovationFactor ?? 1,
  };
}

/**
 * Seberapa besar laba berubah bila harga beli naik Rp1: bea lelang ikut naik, dan BPHTB ikut
 * naik bila dasar pengenaannya sama dengan harga beli (asumsi bawaan proyek).
 */
function profitDropPerRupiah(finance: FlippingProject["finance"]) {
  const bphtbFollows = finance.bphtbBase === finance.purchase && finance.purchase > finance.npoptkp;
  return 1 + finance.auctionRate / 100 + (bphtbFollows ? finance.bphtbRate / 100 : 0);
}

export function analyzeScenario(project: FlippingProject, index: number) {
  const inputs = scenarioInputs(project, index);
  const finance = { ...project.finance, sale: inputs.sale, months: inputs.months };
  const result = calculateFlipping(finance, project.rab, inputs.renovationFactor);
  const months = inputs.months;
  const profitPerMonth = months > 0 ? result.profit / months : null;
  const annualRoi = result.roi !== null && months > 0 ? (result.roi * 12) / months : null;
  const maxPurchase = Math.max(0, finance.purchase + result.profit / profitDropPerRupiah(finance));
  const minSale = result.breakEven;
  const safetyMargin =
    minSale !== null && inputs.sale > 0 ? ((inputs.sale - minSale) / inputs.sale) * 100 : null;
  return {
    inputs,
    result,
    renovationCost: result.renovation,
    profitPerMonth,
    annualRoi,
    /** Harga beli tertinggi agar skenario ini tidak rugi (laba = 0). */
    maxPurchase,
    /** Harga jual terendah agar skenario ini tidak rugi (titik impas). */
    minSale,
    /** Persentase harga jual boleh turun sebelum rugi. */
    safetyMargin,
  };
}
export type ScenarioAnalysis = ReturnType<typeof analyzeScenario>;
