import { z } from "zod";
import { pricingSchema } from "@/lib/pricing";
import { formatTanggal } from "@/lib/format-date";
import { getProperty } from "@/lib/properties";
import {
  cibinongBaseLines,
  cibinongFindings,
  defaultContingencyRate,
  summarizeRab,
} from "@/lib/condition-rab";

const amount = z.number().finite().min(0).max(1_000_000_000_000);
const rate = z.number().finite().min(0).max(100);
const text = z.string().max(500);
export const workGroups = [
  "Persiapan",
  "Struktur",
  "Arsitektur",
  "MEP",
  "Finishing",
  "Contingency",
] as const;
export const assetAssessmentSections = [
  { area: "Atap dan talang", group: "Arsitektur" },
  { area: "Struktur (kolom, balok, pelat)", group: "Struktur" },
  { area: "Dinding dan cat", group: "Finishing" },
  { area: "Lantai dan keramik", group: "Arsitektur" },
  { area: "Plafon", group: "Arsitektur" },
  { area: "Pintu dan jendela", group: "Arsitektur" },
  { area: "Listrik", group: "MEP" },
  { area: "Air bersih, sanitasi, drainase", group: "MEP" },
  { area: "Fasad dan tampilan jual", group: "Finishing" },
] as const;

export const assetAssessmentSchema = z
  .array(
    z.object({
      area: text,
      group: z.enum(workGroups),
      condition: z.enum([
        "Belum diperiksa",
        "Baik",
        "Perlu perbaikan ringan",
        "Perlu pemeriksaan lanjutan",
        "Perlu perbaikan besar",
      ]),
      finding: text,
      recommendation: text,
    }),
  )
  .max(30);
export type AssetAssessment = z.infer<typeof assetAssessmentSchema>[number];
export function makeAssetAssessments(): AssetAssessment[] {
  return assetAssessmentSections.map(({ area, group }) => ({
    area,
    group,
    condition: "Belum diperiksa",
    finding: "",
    recommendation: "",
  }));
}
export const financeSchema = z.object({
  purchase: amount,
  auctionRate: rate,
  bphtbBase: amount,
  npoptkp: amount,
  bphtbRate: rate,
  notary: amount,
  documentCheck: amount,
  vacancy: amount,
  utilities: amount,
  loanPrincipal: amount,
  interestRate: rate,
  monthlyCarrying: amount,
  months: z.number().min(0).max(120),
  marketing: amount,
  reserve: amount,
  sellerTaxRate: rate,
  sellerFeeRate: rate,
  sellerFixed: amount,
  sale: amount,
});
export const flippingSchema = z.object({
  version: z.literal(1),
  // Asal proyek: slug properti katalog yang dianalisis, untuk mencegah proyek ganda.
  origin: z
    .object({
      listingSlug: z
        .string()
        .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
        .max(80),
    })
    .optional(),
  property: z.object({
    name: text,
    address: text,
    province: text,
    type: text,
    land: amount,
    building: amount,
    legal: text,
    occupancy: text,
    documents: text,
    source: text,
    auctionDate: text,
    referenceDate: text,
    limit: amount,
  }),
  finance: financeSchema,
  assetAssessments: assetAssessmentSchema.default(makeAssetAssessments),
  // Manual review markers: not evidence of legal, technical, or financial verification.
  stageReviews: z.record(z.string(), z.boolean()).optional(),
  rab: z
    .array(
      z.object({
        id: text,
        name: text,
        group: z.enum(workGroups),
        volume: amount,
        unit: text,
        price: amount,
      }),
    )
    .max(200),
  risks: z.array(z.object({ id: text, name: text, note: text, verified: z.boolean() })).max(30),
  timeline: z
    .array(
      z.object({
        id: text,
        name: text,
        date: text,
        status: z.enum(["Belum mulai", "Berjalan", "Selesai"]),
      }),
    )
    .max(30),
  scenarios: z
    .array(
      z.object({
        name: text,
        sale: amount,
        months: z.number().min(0).max(120),
        renovationFactor: z.number().min(0).max(10),
      }),
    )
    .length(3),
  // Pembanding harga jual dan diskon negosiasi; opsional agar proyek lama tetap terbaca.
  pricing: pricingSchema.optional(),
});
export type FlippingProject = z.infer<typeof flippingSchema>;
export type Finance = FlippingProject["finance"];
export type RabItem = FlippingProject["rab"][number];
export const financeFields: { key: keyof Finance; label: string; unit: string; group: string }[] = [
  { key: "purchase", label: "Harga penawaran / menang lelang", unit: "Rp", group: "Akuisisi" },
  { key: "auctionRate", label: "Asumsi bea lelang pembeli", unit: "%", group: "Akuisisi" },
  { key: "bphtbBase", label: "Dasar pengenaan BPHTB (asumsi)", unit: "Rp", group: "Akuisisi" },
  { key: "npoptkp", label: "NPOPTKP sesuai daerah (asumsi)", unit: "Rp", group: "Akuisisi" },
  { key: "bphtbRate", label: "Asumsi tarif BPHTB", unit: "%", group: "Akuisisi" },
  { key: "notary", label: "Notaris / PPAT / balik nama", unit: "Rp", group: "Akuisisi" },
  { key: "documentCheck", label: "Pengecekan dokumen", unit: "Rp", group: "Akuisisi" },
  { key: "vacancy", label: "Pengosongan (0 jika tidak perlu)", unit: "Rp", group: "Akuisisi" },
  { key: "utilities", label: "Utilitas selama proyek", unit: "Rp", group: "Holding" },
  { key: "loanPrincipal", label: "Pokok pendanaan berbunga", unit: "Rp", group: "Holding" },
  { key: "interestRate", label: "Asumsi bunga tahunan sederhana", unit: "%", group: "Holding" },
  {
    key: "monthlyCarrying",
    label: "Carrying cost per bulan (tanpa utilitas / bunga)",
    unit: "Rp",
    group: "Holding",
  },
  { key: "months", label: "Durasi kepemilikan", unit: "bulan", group: "Holding" },
  { key: "marketing", label: "Biaya pemasaran tetap", unit: "Rp", group: "Penjualan & cadangan" },
  {
    key: "reserve",
    label: "Cadangan di luar RAB (jangan isi ulang contingency RAB)",
    unit: "Rp",
    group: "Penjualan & cadangan",
  },
  {
    key: "sellerTaxRate",
    label: "Asumsi tarif pajak sisi penjual",
    unit: "%",
    group: "Penjualan & cadangan",
  },
  {
    key: "sellerFeeRate",
    label: "Asumsi komisi / biaya jual",
    unit: "%",
    group: "Penjualan & cadangan",
  },
  {
    key: "sellerFixed",
    label: "Biaya penjual tetap lain (tanpa pemasaran)",
    unit: "Rp",
    group: "Penjualan & cadangan",
  },
  // Ditetapkan di tab Harga jual (tahap Analisis aset), bukan bersama biaya jual.
  { key: "sale", label: "Target harga jual", unit: "Rp", group: "Harga jual" },
];
export function rabTotal(items: RabItem[]) {
  return items.reduce((sum, item) => sum + item.volume * item.price, 0);
}
export function calculateFlipping(finance: Finance, rab: RabItem[], renovationFactor = 1) {
  const auctionFee = (finance.purchase * finance.auctionRate) / 100;
  const bphtb = (Math.max(0, finance.bphtbBase - finance.npoptkp) * finance.bphtbRate) / 100;
  const acquisition =
    finance.purchase +
    auctionFee +
    bphtb +
    finance.notary +
    finance.documentCheck +
    finance.vacancy;
  const renovation = rabTotal(rab) * renovationFactor;
  const interest = (((finance.loanPrincipal * finance.interestRate) / 100) * finance.months) / 12;
  const carrying = finance.monthlyCarrying * finance.months;
  const holding = interest + carrying + finance.utilities;
  const sellingRate = (finance.sellerTaxRate + finance.sellerFeeRate) / 100;
  const sellerTax = (finance.sale * finance.sellerTaxRate) / 100;
  const sellerFee = (finance.sale * finance.sellerFeeRate) / 100;
  const selling = finance.marketing + finance.sellerFixed + sellerTax + sellerFee;
  const fixedCost =
    acquisition + renovation + holding + finance.reserve + finance.marketing + finance.sellerFixed;
  const allIn = acquisition + renovation + holding + selling + finance.reserve;
  const profit = finance.sale - allIn;
  return {
    acquisition,
    auctionFee,
    bphtb,
    renovation,
    interest,
    carrying,
    holding,
    selling,
    sellerTax,
    sellerFee,
    allIn,
    profit,
    roi: allIn > 0 ? (profit / allIn) * 100 : null,
    margin: finance.sale > 0 ? (profit / finance.sale) * 100 : null,
    breakEven: sellingRate < 1 ? fixedCost / (1 - sellingRate) : null,
  };
}
const genericDemoRab: RabItem[] = [
  {
    id: "prep",
    name: "Pembersihan dan bongkar ringan",
    group: "Persiapan",
    volume: 1,
    unit: "ls",
    price: 5_000_000,
  },
  { id: "roof", name: "Perbaikan atap", group: "Struktur", volume: 20, unit: "m²", price: 600_000 },
  {
    id: "floor",
    name: "Perbaikan lantai",
    group: "Arsitektur",
    volume: 50,
    unit: "m²",
    price: 300_000,
  },
  {
    id: "mep",
    name: "Perbaikan listrik dan sanitasi",
    group: "MEP",
    volume: 1,
    unit: "ls",
    price: 12_000_000,
  },
  {
    id: "paint",
    name: "Pengecatan dan finishing",
    group: "Finishing",
    volume: 100,
    unit: "m²",
    price: 180_000,
  },
  {
    id: "reserve",
    name: "Cadangan renovasi",
    group: "Contingency",
    volume: 1,
    unit: "ls",
    price: 8_000_000,
  },
];
const conditionLineGroups: Record<string, RabItem["group"]> = {
  "plafon-atap": "Struktur",
  "plafon-gypsum": "Arsitektur",
  "plafon-cat": "Finishing",
  "dinding-aci": "Finishing",
  "dinding-waterproof": "Finishing",
  "dinding-cat": "Finishing",
  "umum-cat": "Finishing",
  "umum-lantai": "Arsitektur",
  "umum-km": "MEP",
  "umum-listrik": "MEP",
  "umum-kusen": "Arsitektur",
  "umum-dapur": "Arsitektur",
  "umum-carport": "Persiapan",
};
/** RAB Cibinong dari temuan foto di halaman analisis, termasuk cadangan yang sama. */
export function cibinongConditionRab(): RabItem[] {
  const lines = [...cibinongFindings.flatMap((finding) => finding.lines), ...cibinongBaseLines];
  const summary = summarizeRab(cibinongFindings, cibinongBaseLines);
  return [
    ...lines.map((line) => ({
      id: line.id,
      name: line.work,
      group: conditionLineGroups[line.id] ?? "Arsitektur",
      volume: line.volume,
      unit: line.unit,
      price: line.unitPrice,
    })),
    {
      id: "reserve",
      name: `Cadangan renovasi ${Math.round(defaultContingencyRate * 100)}%`,
      group: "Contingency",
      volume: 1,
      unit: "ls",
      price: summary.contingency,
    },
  ];
}
/** RAB umum yang diskalakan agar totalnya sama dengan biaya renovasi di analisis. */
export function scaledDemoRab(target: number): RabItem[] {
  const base = rabTotal(genericDemoRab);
  const scaled = genericDemoRab.map((item) => ({
    ...item,
    price: Math.round((item.price * target) / base / 1000) * 1000,
  }));
  const drift = target - rabTotal(scaled);
  return scaled.map((item) =>
    item.id === "reserve" ? { ...item, price: Math.max(0, item.price + drift) } : item,
  );
}
function demoRabFor(id: string): RabItem[] {
  const asset = getProperty(id);
  if (!asset) return genericDemoRab;
  if (asset.id === "cibinong") return cibinongConditionRab();
  return scaledDemoRab(asset.initialValues.renovationCosts);
}
export function isDemoProject(id: string) {
  return id === "demo" || Boolean(getProperty(id));
}
export function makeFlippingProject(id: string, name?: string, location?: string): FlippingProject {
  const asset = getProperty(id);
  const demo = isDemoProject(id);
  const purchase = asset?.initialValues.winningPrice ?? 300_000_000;
  const sale = asset?.initialValues.salePrice ?? 480_000_000;
  const roundTo = (value: number) => Math.round(value / 5_000_000) * 5_000_000;
  return {
    version: 1,
    property: {
      name: name ?? asset?.name ?? (demo ? "Rumah Cibinong · proyek demo" : "Proyek rumah"),
      address:
        location ??
        asset?.location ??
        (demo ? "Jl. Contoh Flipping No. 12, Cibinong, Bogor (fiktif)" : ""),
      province: demo ? "Jawa Barat" : "",
      type: demo ? "Rumah tapak 1 lantai" : "",
      land: demo ? 120 : 0,
      building: demo ? 70 : 0,
      legal: demo ? "SHM (asumsi, belum diperiksa)" : "Belum diketahui",
      occupancy: "Belum diverifikasi",
      documents: "Belum diverifikasi",
      source: demo ? "Simulasi internal Pomah Living, bukan listing lelang" : "Belum diisi",
      auctionDate: demo ? "2026-12-15" : "",
      referenceDate: "2026-11-20",
      limit: asset?.auctionLimit ?? (demo ? 280_000_000 : 0),
    },
    finance: {
      purchase: demo ? purchase : 0,
      auctionRate: demo ? 2 : 0,
      bphtbBase: demo ? purchase : 0,
      npoptkp: demo ? 80_000_000 : 0,
      bphtbRate: demo ? 5 : 0,
      notary: demo ? 8_000_000 : 0,
      documentCheck: demo ? 1_000_000 : 0,
      vacancy: 0,
      utilities: demo ? 3_000_000 : 0,
      loanPrincipal: demo ? 150_000_000 : 0,
      interestRate: demo ? 12 : 0,
      monthlyCarrying: demo ? 1_500_000 : 0,
      months: demo ? 6 : 0,
      marketing: demo ? 3_000_000 : 0,
      reserve: 0,
      sellerTaxRate: demo ? 2.5 : 0,
      sellerFeeRate: demo ? 2 : 0,
      sellerFixed: 0,
      sale: demo ? sale : 0,
    },
    assetAssessments: makeAssetAssessments(),
    rab: demo ? demoRabFor(id) : [],
    risks: [
      {
        id: "legal",
        name: "Legalitas & sertifikat",
        note: "Periksa keaslian sertifikat, hak tanggungan, dan kesesuaian objek dengan PPAT/BPN.",
        verified: false,
      },
      {
        id: "occupancy",
        name: "Hunian & pengosongan",
        note: "Konfirmasi penghuni, penguasaan fisik, serta kewajiban dan potensi biaya pengosongan.",
        verified: false,
      },
      {
        id: "documents",
        name: "Dokumen & ketentuan lelang",
        note: "Periksa pengumuman, risalah, tunggakan dan pihak yang menanggung pajak/biaya.",
        verified: false,
      },
      {
        id: "structure",
        name: "Struktur & akses",
        note: "Survei bangunan, akses jalan, banjir dan kebutuhan renovasi bersama tenaga ahli.",
        verified: false,
      },
      {
        id: "market",
        name: "Harga jual & likuiditas",
        note: "Validasi pembanding transaksi; harga penawaran bukan jaminan harga jual.",
        verified: false,
      },
    ],
    timeline: [
      "Survei & pemeriksaan",
      "Lelang & akuisisi",
      "Pengosongan & dokumen",
      "Renovasi",
      "Pemasaran",
      "Penjualan & serah terima",
    ].map((stage, index) => ({ id: String(index), name: stage, date: "", status: "Belum mulai" })),
    scenarios: [
      {
        name: "Pesimis",
        sale: demo ? roundTo(sale * 0.9) : 0,
        months: demo ? 9 : 0,
        renovationFactor: 1.2,
      },
      { name: "Moderat", sale: demo ? sale : 0, months: demo ? 6 : 0, renovationFactor: 1 },
      {
        name: "Optimis",
        sale: demo ? roundTo(sale * 1.1) : 0,
        months: demo ? 4 : 0,
        renovationFactor: 0.95,
      },
    ],
  };
}
export type AnalysisSnapshot = {
  listingSlug?: string;
  name: string;
  location: string;
  auctionLimit: number;
  auctionDate?: string | null;
  landArea?: number | null;
  buildingArea?: number | null;
  legal?: string;
  source: string;
  verification: { occupancy: boolean; access: boolean; documents: boolean };
  values: {
    salePrice: number;
    winningPrice: number;
    renovationCosts: number;
  };
};

/**
 * Proyek baru dari hasil analisis aset: harga menang, harga jual, dan anggaran renovasi
 * dibawa apa adanya; pajak, bunga, dan biaya jual memakai asumsi rinci bawaan proyek.
 */
export function makeProjectFromAnalysis(snapshot: AnalysisSnapshot): FlippingProject {
  const base = makeFlippingProject("demo", snapshot.name, snapshot.location);
  const { salePrice, winningPrice, renovationCosts } = snapshot.values;
  const roundTo = (value: number) => Math.round(value / 5_000_000) * 5_000_000;
  const verified = (ok: boolean) => (ok ? "Terverifikasi saat analisis" : "Belum diverifikasi");
  return {
    ...base,
    ...(snapshot.listingSlug ? { origin: { listingSlug: snapshot.listingSlug } } : {}),
    property: {
      ...base.property,
      name: snapshot.name,
      address: snapshot.location,
      province: "",
      type: "Rumah tapak",
      land: snapshot.landArea ?? 0,
      building: snapshot.buildingArea ?? 0,
      legal: snapshot.legal || "Belum diketahui",
      occupancy: verified(snapshot.verification.occupancy),
      documents: verified(snapshot.verification.documents),
      source: snapshot.source,
      auctionDate: snapshot.auctionDate ?? "",
      referenceDate: new Date().toISOString().slice(0, 10),
      limit: snapshot.auctionLimit,
    },
    finance: {
      ...base.finance,
      purchase: winningPrice,
      bphtbBase: winningPrice,
      loanPrincipal: Math.round(winningPrice / 2),
      sale: salePrice,
    },
    rab: renovationCosts > 0 ? scaledDemoRab(renovationCosts) : [],
    risks: base.risks.map((risk) =>
      (risk.id === "occupancy" && snapshot.verification.occupancy) ||
      (risk.id === "documents" && snapshot.verification.documents)
        ? { ...risk, verified: true }
        : risk,
    ),
    scenarios: [
      { name: "Pesimis", sale: roundTo(salePrice * 0.9), months: 9, renovationFactor: 1.2 },
      { name: "Moderat", sale: salePrice, months: 6, renovationFactor: 1 },
      { name: "Optimis", sale: roundTo(salePrice * 1.1), months: 4, renovationFactor: 0.95 },
    ],
  };
}
export function readFlippingProject(value: unknown) {
  return flippingSchema.parse(value);
}
export function formatProjectDate(value: string) {
  return formatTanggal(value, { fallback: "Belum diisi" });
}
