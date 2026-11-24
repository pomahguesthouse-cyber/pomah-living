import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { properties, type Property } from "@/lib/properties";
import type { SimulationValues, Verification } from "@/lib/simulation";

export type ListingRow = Database["public"]["Tables"]["pomah_listings"]["Row"];

export const listingSources = ["btn", "djkn", "pomah", "lainnya"] as const;
export const listingStatuses = ["draft", "published", "archived"] as const;
export type ListingSource = (typeof listingSources)[number];
export type ListingStatus = (typeof listingStatuses)[number];

export const listingSourceLabels: Record<ListingSource, string> = {
  btn: "Lelang BTN",
  djkn: "Lelang DJKN",
  pomah: "Stok Pomah Living",
  lainnya: "Sumber lain",
};
export const listingStatusLabels: Record<ListingStatus, string> = {
  draft: "Draf",
  published: "Dipublikasikan",
  archived: "Diarsipkan",
};

export const maxListingPhotos = 24;
export const maxListingPhotoBytes = 10 * 1024 * 1024;
export const listingPhotoExtensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

/** Aset yang bisa dianalisis: aset contoh bawaan atau properti katalog dari admin. */
export type AnalysisAsset = Omit<Property, "id"> & {
  id: string;
  isSample: boolean;
  sourceLabel: string;
  sourceUrl: string | null;
  notes: string;
  status: ListingStatus | "sample";
  details?: {
    auctionDate: string | null;
    landArea: number | null;
    buildingArea: number | null;
    legal: string;
  };
};

const rupiah = z
  .number({ message: "Isi angka rupiah." })
  .int("Gunakan angka bulat.")
  .min(0, "Tidak boleh negatif.")
  .max(1_000_000_000_000, "Angka terlalu besar.");
const optionalArea = z.number().min(0, "Tidak boleh negatif.").max(1_000_000).nullable();
const optionalCount = z.number().int().min(0, "Tidak boleh negatif.").max(100).nullable();

const reservedSlugs = new Set(properties.map((property) => property.id));

export const listingFormSchema = z
  .object({
    slug: z
      .string()
      .min(3, "Minimal 3 karakter.")
      .max(80)
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Gunakan huruf kecil, angka, dan tanda hubung.")
      .refine((slug) => !reservedSlugs.has(slug as Property["id"]), "Slug dipakai aset contoh."),
    name: z.string().trim().min(3, "Isi nama properti.").max(200),
    address: z.string().trim().max(500),
    regency_code: z.string().regex(/^\d{4}$/, "Isi 4 digit kode kabupaten/kota."),
    source: z.enum(listingSources),
    source_url: z
      .string()
      .trim()
      .max(500)
      .refine((url) => url === "" || /^https:\/\//.test(url), "Gunakan tautan https://.")
      .transform((url) => (url === "" ? null : url)),
    auction_limit: rupiah,
    auction_date: z
      .string()
      .refine((date) => date === "" || /^\d{4}-\d{2}-\d{2}$/.test(date), "Format tanggal salah.")
      .transform((date) => (date === "" ? null : date)),
    land_area: optionalArea,
    building_area: optionalArea,
    bedrooms: optionalCount,
    bathrooms: optionalCount,
    legal: z.string().trim().max(100),
    occupancy_verified: z.boolean(),
    access_verified: z.boolean(),
    documents_verified: z.boolean(),
    est_sale_price: rupiah,
    est_winning_price: rupiah,
    est_purchase_costs: rupiah,
    est_renovation: rupiah,
    est_holding_sale: rupiah,
    target_profit: rupiah,
    notes: z.string().max(2000),
    sort_order: z.number().int().min(-1000).max(1000),
  })
  .refine((value) => value.est_winning_price >= value.auction_limit, {
    path: ["est_winning_price"],
    message: "Harga menang tidak boleh di bawah nilai limit.",
  });
export type ListingFormInput = z.input<typeof listingFormSchema>;
export type ListingFormValues = z.output<typeof listingFormSchema>;

export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

export function emptyListingForm(): ListingFormInput {
  return {
    slug: "",
    name: "",
    address: "",
    regency_code: "",
    source: "btn",
    source_url: "",
    auction_limit: 0,
    auction_date: "",
    land_area: null,
    building_area: null,
    bedrooms: null,
    bathrooms: null,
    legal: "SHM",
    occupancy_verified: false,
    access_verified: false,
    documents_verified: false,
    est_sale_price: 0,
    est_winning_price: 0,
    est_purchase_costs: 0,
    est_renovation: 0,
    est_holding_sale: 0,
    target_profit: 0,
    notes: "",
    sort_order: 0,
  };
}

export function listingToForm(row: ListingRow): ListingFormInput {
  return {
    slug: row.slug,
    name: row.name,
    address: row.address,
    regency_code: row.regency_code,
    source: (listingSources as readonly string[]).includes(row.source)
      ? (row.source as ListingSource)
      : "lainnya",
    source_url: row.source_url ?? "",
    auction_limit: row.auction_limit,
    auction_date: row.auction_date ?? "",
    land_area: row.land_area,
    building_area: row.building_area,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    legal: row.legal,
    occupancy_verified: row.occupancy_verified,
    access_verified: row.access_verified,
    documents_verified: row.documents_verified,
    est_sale_price: row.est_sale_price,
    est_winning_price: row.est_winning_price ?? row.auction_limit,
    est_purchase_costs: row.est_purchase_costs,
    est_renovation: row.est_renovation,
    est_holding_sale: row.est_holding_sale,
    target_profit: row.target_profit,
    notes: row.notes,
    sort_order: row.sort_order,
  };
}

export function listingValues(
  row: Pick<
    ListingRow,
    | "est_sale_price"
    | "est_winning_price"
    | "auction_limit"
    | "est_purchase_costs"
    | "est_renovation"
    | "est_holding_sale"
    | "target_profit"
  >,
): SimulationValues {
  return {
    salePrice: row.est_sale_price,
    winningPrice: row.est_winning_price ?? row.auction_limit,
    purchaseCosts: row.est_purchase_costs,
    renovationCosts: row.est_renovation,
    holdingAndSaleCosts: row.est_holding_sale,
    targetProfit: row.target_profit,
  };
}

export function listingVerification(
  row: Pick<ListingRow, "occupancy_verified" | "access_verified" | "documents_verified">,
): Verification {
  return {
    occupancy: row.occupancy_verified,
    access: row.access_verified,
    documents: row.documents_verified,
  };
}

export function inspectionLabel(verification: Verification): string {
  const missing = [
    !verification.occupancy && "penghunian",
    !verification.access && "akses fisik",
    !verification.documents && "dokumen",
  ].filter(Boolean) as string[];
  if (missing.length === 0) return "Pemeriksaan awal lengkap";
  if (missing.length === 3) return "Pemeriksaan awal belum dilakukan";
  return `Belum terverifikasi: ${missing.join(", ")}`;
}

export function listingToAsset(row: ListingRow, coverUrl?: string): AnalysisAsset {
  const verification = listingVerification(row);
  const source = (listingSources as readonly string[]).includes(row.source)
    ? (row.source as ListingSource)
    : "lainnya";
  return {
    id: row.slug,
    name: row.name,
    location: row.address,
    regionCode: row.regency_code,
    image: coverUrl ?? "",
    auctionLimit: row.auction_limit,
    initialValues: listingValues(row),
    verification,
    inspection: inspectionLabel(verification),
    isSample: false,
    sourceLabel: listingSourceLabels[source],
    sourceUrl: row.source_url,
    notes: row.notes,
    status: (listingStatuses as readonly string[]).includes(row.status)
      ? (row.status as ListingStatus)
      : "draft",
    details: {
      auctionDate: row.auction_date,
      landArea: row.land_area,
      buildingArea: row.building_area,
      legal: row.legal,
    },
  };
}

export function sampleToAsset(property: Property): AnalysisAsset {
  return {
    ...property,
    isSample: true,
    sourceLabel: "Contoh · data simulasi",
    sourceUrl: null,
    notes: "",
    status: "sample",
  };
}

export function isListingPhotoFile(file: Pick<File, "type" | "size">) {
  return (
    Object.hasOwn(listingPhotoExtensions, file.type) &&
    file.size > 0 &&
    file.size <= maxListingPhotoBytes
  );
}
