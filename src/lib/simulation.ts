export const simulationFields = [
  { key: "salePrice", label: "Perkiraan harga jual setelah renovasi" },
  { key: "winningPrice", label: "Simulasi harga menang lelang" },
  { key: "purchaseCosts", label: "Biaya pembelian dan dokumen" },
  { key: "renovationCosts", label: "Biaya renovasi termasuk cadangan" },
  { key: "holdingAndSaleCosts", label: "Biaya kepemilikan sementara dan biaya jual" },
  { key: "targetProfit", label: "Target laba" },
] as const;

export type SimulationField = (typeof simulationFields)[number]["key"];
export type SimulationValues = Record<SimulationField, number>;
export type SimulationInputs = Record<SimulationField, string>;
export const checkItems = [
  { key: "occupancy", label: "Status penghunian", description: "Kondisi dan penguasaan rumah" },
  { key: "access", label: "Akses fisik", description: "Akses jalan dan kunjungan ke rumah" },
  { key: "documents", label: "Dokumen", description: "Kelengkapan dokumen properti" },
] as const;
export type CheckKey = (typeof checkItems)[number]["key"];
export type Verification = Record<CheckKey, boolean>;

export const baseScenario: SimulationValues = {
  salePrice: 480_000_000,
  winningPrice: 300_000_000,
  purchaseCosts: 25_000_000,
  renovationCosts: 70_000_000,
  holdingAndSaleCosts: 20_000_000,
  targetProfit: 50_000_000,
};
export const stressedScenario: SimulationValues = {
  salePrice: 450_000_000,
  winningPrice: 300_000_000,
  purchaseCosts: 25_000_000,
  renovationCosts: 85_000_000,
  holdingAndSaleCosts: 30_000_000,
  targetProfit: 50_000_000,
};

const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});
export function formatRupiah(value: number): string {
  return rupiahFormatter.format(value).replace(/\u00a0/g, " ");
}
export function formatInput(value: number | string): string {
  const numeric = typeof value === "number" ? value : Number(value);
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(numeric);
}
export function toInputs(values: SimulationValues): SimulationInputs {
  return {
    salePrice: String(values.salePrice),
    winningPrice: String(values.winningPrice),
    purchaseCosts: String(values.purchaseCosts),
    renovationCosts: String(values.renovationCosts),
    holdingAndSaleCosts: String(values.holdingAndSaleCosts),
    targetProfit: String(values.targetProfit),
  };
}
export function validateAmount(input: string): string | null {
  if (input.trim() === "") return "Kolom ini wajib diisi.";
  if (!/^\d+$/.test(input) || !Number.isSafeInteger(Number(input)))
    return "Masukkan angka rupiah yang valid dan tidak negatif.";
  return null;
}
export function parseInputs(inputs: SimulationInputs): SimulationValues | null {
  if (simulationFields.some(({ key }) => validateAmount(inputs[key]) !== null)) return null;
  return {
    salePrice: Number(inputs.salePrice),
    winningPrice: Number(inputs.winningPrice),
    purchaseCosts: Number(inputs.purchaseCosts),
    renovationCosts: Number(inputs.renovationCosts),
    holdingAndSaleCosts: Number(inputs.holdingAndSaleCosts),
    targetProfit: Number(inputs.targetProfit),
  };
}
export function calculateSimulation(values: SimulationValues) {
  const otherCosts = values.purchaseCosts + values.renovationCosts + values.holdingAndSaleCosts;
  const totalCost = values.winningPrice + otherCosts;
  return {
    otherCosts,
    totalCost,
    estimatedProfit: values.salePrice - totalCost,
    bidLimit: values.salePrice - otherCosts - values.targetProfit,
  };
}
export type Decision = {
  label: string;
  description: string;
  tone: "success" | "warning" | "danger";
};
export function getDecision(
  values: SimulationValues,
  auctionLimit: number,
  verification: Verification,
): Decision {
  const { bidLimit } = calculateSimulation(values);
  if (bidLimit < auctionLimit)
    return {
      label: "Lewati aset",
      tone: "danger",
      description: `Batas tawar ${formatRupiah(auctionLimit - bidLimit)} di bawah nilai limit lelang. Aset ini belum memenuhi target laba Anda.`,
    };
  const unchecked = checkItems
    .filter(({ key }) => !verification[key])
    .map(({ label }) => label.toLowerCase());
  if (unchecked.length > 0)
    return {
      label: "Tahan penawaran",
      tone: "warning",
      description: `Verifikasi ${unchecked.join(", ")} sebelum mengajukan penawaran.`,
    };
  if (values.winningPrice > bidLimit)
    return {
      label: "Di atas batas tawar",
      tone: "warning",
      description: `Harga menang simulasi ${formatRupiah(values.winningPrice - bidLimit)} melebihi batas tawar. Turunkan penawaran agar target laba terjaga.`,
    };
  if (values.winningPrice < auctionLimit)
    return {
      label: "Di bawah nilai limit",
      tone: "warning",
      description: `Harga menang simulasi harus minimal ${formatRupiah(auctionLimit)} sesuai nilai limit lelang.`,
    };
  return {
    label: "Layak dipertimbangkan",
    tone: "success",
    description:
      "Pemeriksaan awal lengkap dan harga menang simulasi berada dalam rentang nilai limit hingga batas tawar.",
  };
}
