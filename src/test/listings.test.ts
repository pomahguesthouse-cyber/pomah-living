import { describe, expect, it } from "vitest";
import {
  emptyListingForm,
  inspectionLabel,
  isListingPhotoFile,
  listingFormSchema,
  listingLandSize,
  listingToAsset,
  listingToForm,
  sampleToAsset,
  slugify,
  type ListingRow,
} from "@/lib/listings";
import { getProperty } from "@/lib/properties";

const row: ListingRow = {
  id: "8f3e0d8e-0000-4000-8000-000000000001",
  slug: "rumah-cilodong",
  name: "Rumah Cilodong",
  address: "Cilodong, Depok",
  regency_code: "3276",
  source: "btn",
  source_url: "https://balelelang.btn.co.id/lot/1",
  auction_limit: 270_000_000,
  auction_date: "2026-12-20",
  land_area: 72,
  building_area: 45,
  bedrooms: 2,
  bathrooms: 1,
  legal: "SHM",
  occupancy_verified: true,
  access_verified: true,
  documents_verified: false,
  cover_photo_path: "a.webp",
  photo_paths: ["a.webp"],
  est_sale_price: 450_000_000,
  est_winning_price: null,
  est_purchase_costs: 24_000_000,
  est_renovation: 65_000_000,
  est_holding_sale: 19_000_000,
  target_profit: 45_000_000,
  notes: "Dekat stasiun.",
  status: "published",
  sort_order: 0,
  created_by: null,
  created_at: "2026-11-24T00:00:00Z",
  updated_at: "2026-11-24T00:00:00Z",
  land_width: null,
  land_length: null,
};

const validForm = () => ({
  ...emptyListingForm(),
  slug: "rumah-cilodong",
  name: "Rumah Cilodong",
  regency_code: "3276",
  auction_limit: 270_000_000,
});

describe("Catalog listings", () => {
  it("starts analysis from platform standards, ignoring old admin estimates", () => {
    const asset = listingToAsset(row, "https://example.test/a.webp");
    expect(asset.id).toBe("rumah-cilodong");
    expect(asset.isSample).toBe(false);
    expect(asset.image).toBe("https://example.test/a.webp");
    // Kolom est_* lama (harga jual 450 jt, renovasi 65 jt) tidak dipakai lagi.
    expect(asset.initialValues).toEqual({
      winningPrice: 270_000_000,
      salePrice: 0,
      renovationCosts: 0,
      purchaseCosts: 21_600_000,
      holdingAndSaleCosts: 0,
      targetProfit: 43_740_000,
    });
    expect(asset.details?.landArea).toBe(72);
    expect(asset.inspection).toBe("Belum terverifikasi: dokumen");
    expect(asset.sourceLabel).toBe("Lelang BTN");
  });
  it("round-trips a row through the admin form", () => {
    const parsed = listingFormSchema.parse(listingToForm(row));
    expect(parsed).not.toHaveProperty("est_sale_price");
    expect(parsed.source_url).toBe(row.source_url);
    expect(parsed.auction_date).toBe("2026-12-20");
  });
  it("accepts a minimal valid form and converts empty optional text to null", () => {
    const parsed = listingFormSchema.parse(validForm());
    expect(parsed.source_url).toBeNull();
    expect(parsed.auction_date).toBeNull();
  });
  it("reads optional land dimensions safely", () => {
    expect(listingLandSize({ ...row, land_width: 8, land_length: "18" } as unknown as typeof row)).toEqual({
      width: 8,
      length: 18,
    });
    expect(listingLandSize(row)).toEqual({ width: null, length: null });
  });
  it("rejects slugs reserved by sample assets or with invalid characters", () => {
    expect(listingFormSchema.safeParse({ ...validForm(), slug: "cibinong" }).success).toBe(false);
    expect(listingFormSchema.safeParse({ ...validForm(), slug: "Rumah Baru" }).success).toBe(false);
  });
  it("rejects a regency code that is not four digits and non-https sources", () => {
    expect(listingFormSchema.safeParse({ ...validForm(), regency_code: "32" }).success).toBe(false);
    expect(
      listingFormSchema.safeParse({ ...validForm(), source_url: "http://x.test" }).success,
    ).toBe(false);
  });
  it("creates URL-safe slugs", () => {
    expect(slugify("  Rumah Sawangan — Blok C/12 ")).toBe("rumah-sawangan-blok-c-12");
    expect(slugify("Kéramik Çantik")).toBe("keramik-cantik");
  });
  it("labels the inspection status", () => {
    expect(inspectionLabel({ occupancy: true, access: true, documents: true })).toBe(
      "Pemeriksaan awal lengkap",
    );
    expect(inspectionLabel({ occupancy: false, access: false, documents: false })).toBe(
      "Pemeriksaan awal belum dilakukan",
    );
  });
  it("keeps sample assets marked as samples", () => {
    const asset = sampleToAsset(getProperty("cibinong")!);
    expect(asset.isSample).toBe(true);
    expect(asset.status).toBe("sample");
  });
  it("accepts only supported photo files up to 10 MB", () => {
    expect(isListingPhotoFile({ type: "image/webp", size: 1000 })).toBe(true);
    expect(isListingPhotoFile({ type: "image/gif", size: 1000 })).toBe(false);
    expect(isListingPhotoFile({ type: "image/jpeg", size: 11 * 1024 * 1024 })).toBe(false);
  });
});
