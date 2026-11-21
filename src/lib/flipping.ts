import { z } from "zod";
import { getProperty } from "@/lib/properties";

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

export const assetAssessmentSchema = z.array(z.object({
  area: text,
  group: z.enum(workGroups),
  condition: z.enum(["Belum diperiksa", "Baik", "Perlu perbaikan ringan", "Perlu pemeriksaan lanjutan", "Perlu perbaikan besar"]),
  finding: text,
  recommendation: text,
})).max(30);
export type AssetAssessment = z.infer<typeof assetAssessmentSchema>[number];
export function makeAssetAssessments(): AssetAssessment[] {
  return assetAssessmentSections.map(({area, group}) => ({
    area, group, condition: "Belum diperiksa", finding: "", recommendation: "",
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
  { key: "sale", label: "Target harga jual", unit: "Rp", group: "Penjualan & cadangan" },
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
export function isDemoProject(id: string) {
  return id === "demo" || Boolean(getProperty(id));
}
export function makeFlippingProject(id: string, name?: string, location?: string): FlippingProject {
  const asset = getProperty(id);
  const demo = isDemoProject(id);
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
      purchase: demo ? 300_000_000 : 0,
      auctionRate: demo ? 2 : 0,
      bphtbBase: demo ? 300_000_000 : 0,
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
      sale: demo ? 480_000_000 : 0,
    },
    assetAssessments: makeAssetAssessments(),
    rab: demo
      ? [
          {
            id: "prep",
            name: "Pembersihan dan bongkar ringan",
            group: "Persiapan",
            volume: 1,
            unit: "ls",
            price: 5_000_000,
          },
          {
            id: "roof",
            name: "Perbaikan atap",
            group: "Struktur",
            volume: 20,
            unit: "m²",
            price: 600_000,
          },
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
        ]
      : [],
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
        sale: demo ? 430_000_000 : 0,
        months: demo ? 9 : 0,
        renovationFactor: 1.2,
      },
      { name: "Moderat", sale: demo ? 480_000_000 : 0, months: demo ? 6 : 0, renovationFactor: 1 },
      {
        name: "Optimis",
        sale: demo ? 530_000_000 : 0,
        months: demo ? 4 : 0,
        renovationFactor: 0.95,
      },
    ],
  };
}
export function readFlippingProject(value: unknown) {
  return flippingSchema.parse(value);
}
export function formatProjectDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "Belum diisi";
}
