/** Kalkulator proyek flipping. Nilai rupiah dalam angka bulat; tarif dalam persen. */
export type RabItem = { id: string; category: string; description: string; volume: number; unit: string; unitPrice: number };
export type FlipInputs = {
  winningBid: number; auctionBuyerFee: number; bphtbBase: number; npoptkp: number;
  bphtbRate: number; documentFees: number; vacancyCosts: number; utilities: number;
  monthlyHolding: number; holdingMonths: number; financing: number;
  salePrice: number; saleTaxRate: number; sellingFixedCosts: number;
  renovationContingencyRate: number; targetProfit: number;
};
export type FlipResult = {
  rabSubtotal: number; renovationContingency: number; renovationTotal: number;
  bphtb: number; acquisitionTotal: number; holdingTotal: number;
  sellingTotal: number; totalAllIn: number; netProfit: number; roiPercent: number;
  saleMarginPercent: number; breakEvenSale: number; maxBidApprox: number;
};
const nonNegative = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0;
export function rabTotal(items: RabItem[]): number {
  return items.reduce((total, item) => total + nonNegative(item.volume) * nonNegative(item.unitPrice), 0);
}
export function evaluateFlip(input: FlipInputs, items: RabItem[]): FlipResult {
  const rabSubtotal = rabTotal(items);
  const renovationContingency = rabSubtotal * nonNegative(input.renovationContingencyRate) / 100;
  const renovationTotal = rabSubtotal + renovationContingency;
  const bphtb = Math.max(0, nonNegative(input.bphtbBase) - nonNegative(input.npoptkp)) * nonNegative(input.bphtbRate) / 100;
  const acquisitionTotal = nonNegative(input.winningBid) + nonNegative(input.auctionBuyerFee) + bphtb
    + nonNegative(input.documentFees) + nonNegative(input.vacancyCosts);
  const holdingTotal = nonNegative(input.monthlyHolding) * nonNegative(input.holdingMonths)
    + nonNegative(input.financing) + nonNegative(input.utilities);
  const salePrice = nonNegative(input.salePrice);
  const sellingTotal = salePrice * nonNegative(input.saleTaxRate) / 100 + nonNegative(input.sellingFixedCosts);
  const totalAllIn = acquisitionTotal + renovationTotal + holdingTotal + sellingTotal;
  const netProfit = salePrice - totalAllIn;
  const breakEvenSale = nonNegative(input.saleTaxRate) < 100
    ? (acquisitionTotal + renovationTotal + holdingTotal + nonNegative(input.sellingFixedCosts)) /
      (1 - nonNegative(input.saleTaxRate) / 100)
    : Infinity;
  return {
    rabSubtotal, renovationContingency, renovationTotal, bphtb,
    acquisitionTotal, holdingTotal, sellingTotal, totalAllIn, netProfit,
    roiPercent: totalAllIn > 0 ? 100 * netProfit / totalAllIn : 0,
    saleMarginPercent: salePrice > 0 ? 100 * netProfit / salePrice : 0,
    breakEvenSale,
    // Perkiraan awal: dasar BPHTB diperlakukan tetap. Jika dasar pajak tergantung harga menang,
    // batas tawar harus dihitung ulang secara iteratif.
    maxBidApprox: nonNegative(input.winningBid) + netProfit - nonNegative(input.targetProfit),
  };
}
/** Semua data berikut adalah angka fiktif untuk demo, bukan rekomendasi investasi atau penetapan pajak. */
export const flipDemo: FlipInputs = {
  winningBid: 400_000_000, auctionBuyerFee: 8_000_000,
  bphtbBase: 400_000_000, npoptkp: 80_000_000, bphtbRate: 5,
  documentFees: 12_000_000, vacancyCosts: 0, utilities: 3_000_000,
  monthlyHolding: 2_000_000, holdingMonths: 6, financing: 5_000_000,
  salePrice: 700_000_000, saleTaxRate: 2.5, sellingFixedCosts: 8_000_000,
  renovationContingencyRate: 10, targetProfit: 100_000_000,
};
export const demoRab: RabItem[] = [
  { id: "1", category: "Persiapan", description: "Pembersihan dan bongkar ringan", volume: 1, unit: "ls", unitPrice: 6_000_000 },
  { id: "2", category: "Arsitektur", description: "Perbaikan dinding dan plester", volume: 100, unit: "m²", unitPrice: 150_000 },
  { id: "3", category: "Finishing", description: "Pengecatan interior dan eksterior", volume: 250, unit: "m²", unitPrice: 75_000 },
  { id: "4", category: "MEP", description: "Perbaikan listrik dan plumbing", volume: 1, unit: "ls", unitPrice: 12_000_000 },
  { id: "5", category: "Finishing", description: "Lantai, pintu dan sanitair", volume: 1, unit: "ls", unitPrice: 35_000_000 },
];
