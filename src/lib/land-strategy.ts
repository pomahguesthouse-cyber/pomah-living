import { calculateSimulation, type SimulationValues } from "@/lib/simulation";

/**
 * Perbandingan strategi keluar untuk satu bidang tanah: renovasi rumah yang ada,
 * atau pecah kavling dan bangun beberapa rumah baru. Semua angka adalah asumsi
 * yang diisi flipper; aturan tata ruang (kavling minimum, KDB, jumlah lantai)
 * harus diambil dari KRK/RDTR setempat karena berbeda di tiap daerah.
 */

export type LandRules = {
  /** Luas tanah di sertifikat, m². */
  landArea: number;
  /** Lebar muka tanah yang menghadap jalan, m. 0 bila belum diketahui. */
  frontage: number;
  /** Luas kavling minimum per rumah menurut aturan setempat, m². */
  minLotArea: number;
  /** Lebar muka minimum per kavling, m. */
  minFrontage: number;
  /** Koefisien dasar bangunan, persen luas kavling yang boleh tertutup bangunan. */
  kdbPercent: number;
  /** Jumlah lantai maksimal yang diizinkan. */
  maxFloors: number;
};

export type NewBuildAssumptions = {
  /** Luas bangunan yang ingin dibangun per rumah, m². */
  targetBuildingArea: number;
  /** Biaya bangun rumah baru per m² luas bangunan. */
  buildCostPerM2: number;
  /** Biaya bongkar rumah lama dan pembersihan lahan (sekali). */
  demolition: number;
  /** Pekerjaan bersama: pagar, saluran, akses jalan (sekali). */
  sharedSiteWorks: number;
  /** Pecah sertifikat, pengukuran, dan PBG per rumah. */
  permitsPerUnit: number;
  /** Perkiraan harga jual per rumah baru, dari pembanding rumah baru sejenis. */
  salePerUnit: number;
  /** Lama proyek sampai rumah terakhir terjual, bulan. */
  months: number;
  /** Biaya kepemilikan per bulan (bunga, listrik, keamanan). */
  monthlyHolding: number;
  /** Pajak penjual dan komisi, persen dari harga jual. */
  sellingRatePercent: number;
};

export const defaultLandRules: Omit<LandRules, "landArea" | "frontage"> = {
  minLotArea: 60,
  minFrontage: 6,
  kdbPercent: 60,
  maxFloors: 2,
};

export const defaultNewBuild: Omit<NewBuildAssumptions, "salePerUnit"> = {
  targetBuildingArea: 45,
  buildCostPerM2: 4_000_000,
  demolition: 15_000_000,
  sharedSiteWorks: 20_000_000,
  permitsPerUnit: 10_000_000,
  months: 10,
  monthlyHolding: 2_000_000,
  sellingRatePercent: 5,
};

/** Lama proyek renovasi bawaan, untuk menghitung ROI per tahun strategi renovasi. */
export const defaultRenovationMonths = 4;

/** Jumlah rumah terbanyak yang dibandingkan, agar kartu tetap terbaca. */
export const maxComparedUnits = 4;

export type LandCapacity = {
  byArea: number;
  /** null bila lebar muka belum diisi. */
  byFrontage: number | null;
  maxUnits: number;
  warnings: string[];
};

export function landCapacity(rules: LandRules): LandCapacity {
  const warnings: string[] = [];
  const byArea = rules.minLotArea > 0 ? Math.floor(rules.landArea / rules.minLotArea) : 0;
  const byFrontage =
    rules.frontage > 0 && rules.minFrontage > 0
      ? Math.floor(rules.frontage / rules.minFrontage)
      : null;
  const maxUnits = Math.max(0, Math.min(byArea, byFrontage ?? byArea));
  if (rules.minLotArea <= 0) warnings.push("Isi luas kavling minimum dari KRK/RDTR setempat.");
  if (byFrontage === null)
    warnings.push(
      "Lebar muka belum diisi: jumlah rumah hanya dihitung dari luas, dengan anggapan setiap rumah tetap menghadap jalan.",
    );
  else if (byFrontage < byArea)
    warnings.push(
      `Lebar muka membatasi jumlah rumah menjadi ${byFrontage}, walau luasnya cukup untuk ${byArea}.`,
    );
  if (rules.landArea > 0 && maxUnits < 2)
    warnings.push(
      "Tanah ini belum cukup untuk dipecah menjadi dua kavling sesuai aturan yang diisi.",
    );
  return { byArea, byFrontage, maxUnits, warnings };
}

export type StrategyResult = {
  id: string;
  title: string;
  units: number;
  revenue: number;
  totalCost: number;
  profit: number;
  months: number;
  /** ROI per tahun, persen. null bila durasi atau biaya nol. */
  annualRoi: number | null;
  /** Harga menang lelang tertinggi agar target laba tetap tercapai. */
  bidLimit: number;
  /** Rincian khusus pecah kavling. */
  detail?: {
    lotArea: number;
    buildingArea: number;
    maxBuildingArea: number;
    buildingCapped: boolean;
    buildCost: number;
    sellingCost: number;
    holdingCost: number;
  };
};

function annualRoi(profit: number, totalCost: number, months: number) {
  return totalCost > 0 && months > 0 ? (profit / totalCost) * (12 / months) * 100 : null;
}

export function renovationStrategy(
  values: SimulationValues,
  months = defaultRenovationMonths,
): StrategyResult {
  const result = calculateSimulation(values);
  return {
    id: "renovasi",
    title: "Renovasi 1 rumah",
    units: 1,
    revenue: values.salePrice,
    totalCost: result.totalCost,
    profit: result.estimatedProfit,
    months,
    annualRoi: annualRoi(result.estimatedProfit, result.totalCost, months),
    bidLimit: result.bidLimit,
  };
}

export function splitStrategy(
  units: number,
  values: SimulationValues,
  rules: LandRules,
  build: NewBuildAssumptions,
): StrategyResult {
  const lotArea = rules.landArea / units;
  const maxBuildingArea = lotArea * (rules.kdbPercent / 100) * rules.maxFloors;
  const buildingArea = Math.min(build.targetBuildingArea, maxBuildingArea);
  const buildCost = Math.round(buildingArea * build.buildCostPerM2) * units;
  const revenue = build.salePerUnit * units;
  const sellingCost = Math.round((revenue * build.sellingRatePercent) / 100);
  const holdingCost = build.monthlyHolding * build.months;
  const costsBesidePurchase =
    values.purchaseCosts +
    build.demolition +
    build.sharedSiteWorks +
    build.permitsPerUnit * units +
    buildCost +
    holdingCost +
    sellingCost;
  const totalCost = values.winningPrice + costsBesidePurchase;
  const profit = revenue - totalCost;
  return {
    id: `pecah-${units}`,
    title: `Pecah ${units} kavling`,
    units,
    revenue,
    totalCost,
    profit,
    months: build.months,
    annualRoi: annualRoi(profit, totalCost, build.months),
    bidLimit: revenue - costsBesidePurchase - values.targetProfit,
    detail: {
      lotArea,
      buildingArea,
      maxBuildingArea,
      buildingCapped: build.targetBuildingArea > maxBuildingArea,
      buildCost,
      sellingCost,
      holdingCost,
    },
  };
}

export function compareStrategies(
  values: SimulationValues,
  rules: LandRules,
  build: NewBuildAssumptions,
  renovationMonths = defaultRenovationMonths,
) {
  const capacity = landCapacity(rules);
  const strategies = [renovationStrategy(values, renovationMonths)];
  for (let units = 2; units <= Math.min(capacity.maxUnits, maxComparedUnits); units += 1)
    strategies.push(splitStrategy(units, values, rules, build));
  const best = (score: (strategy: StrategyResult) => number | null) => {
    let winner: StrategyResult | null = null;
    for (const strategy of strategies) {
      const value = score(strategy);
      if (value === null || value <= 0) continue;
      if (winner === null || value > (score(winner) ?? -Infinity)) winner = strategy;
    }
    return winner?.id ?? null;
  };
  return {
    capacity,
    strategies,
    highestProfitId: best((strategy) => strategy.profit),
    highestAnnualRoiId: best((strategy) => strategy.annualRoi),
  };
}
