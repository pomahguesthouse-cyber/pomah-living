import { supabase } from "@/integrations/supabase/client";
import {
  isListingPhotoFile,
  listingFormSchema,
  listingPhotoExtensions,
  type ListingFormInput,
  type ListingRow,
  type ListingStatus,
} from "@/lib/listings";

const bucket = "listing-photos";
export const publishedListingsKey = ["published-listings"] as const;
export const listingKey = (slug: string) => ["listing", slug] as const;
export const adminListingsKey = (userId: string) => ["admin", userId, "listings"] as const;

export async function fetchPublishedListings(): Promise<ListingRow[]> {
  const { data, error } = await supabase
    .from("pomah_listings")
    .select("*")
    .eq("status", "published")
    .order("sort_order", { ascending: true })
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchListingBySlug(slug: string): Promise<ListingRow | null> {
  const { data, error } = await supabase
    .from("pomah_listings")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchAdminListings(): Promise<ListingRow[]> {
  const { data, error } = await supabase
    .from("pomah_listings")
    .select("*")
    .order("status", { ascending: true })
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function saveListing(
  input: ListingFormInput,
  photos: { cover: string | null; paths: string[] },
  id?: string,
): Promise<ListingRow> {
  const { land_width, land_length, ...values } = listingFormSchema.parse(input);
  // Kolom ukuran tanah hanya dikirim bila diisi, agar katalog tetap bisa disimpan sebelum
  // docs/katalog-ukuran-tanah.sql dijalankan.
  const landSize = {
    ...(land_width !== null ? { land_width } : {}),
    ...(land_length !== null ? { land_length } : {}),
  };
  const base = { ...values, cover_photo_path: photos.cover, photo_paths: photos.paths };
  const payload = { ...base, ...landSize } as typeof base;
  const query = id
    ? supabase.from("pomah_listings").update(payload).eq("id", id)
    : supabase.from("pomah_listings").insert({ ...payload, status: "draft" });
  const { data, error } = await query.select("*").single();
  if (error) {
    if (error.code === "23505") throw new Error("Slug sudah dipakai properti lain.");
    throw error;
  }
  return data;
}

export async function setListingStatus(id: string, status: ListingStatus) {
  const { error } = await supabase.from("pomah_listings").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deleteListing(row: Pick<ListingRow, "id" | "photo_paths">) {
  const { error } = await supabase.from("pomah_listings").delete().eq("id", row.id);
  if (error) throw error;
  if (row.photo_paths.length) await supabase.storage.from(bucket).remove(row.photo_paths);
}

export async function uploadListingPhoto(file: File): Promise<string> {
  if (!isListingPhotoFile(file)) throw new Error("Gunakan JPG, PNG, atau WebP maksimal 10 MB.");
  const extension = listingPhotoExtensions[file.type as keyof typeof listingPhotoExtensions];
  const path = `${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file);
  if (error) throw error;
  return path;
}

export async function removeListingPhotos(paths: string[]) {
  if (!paths.length) return;
  await supabase.storage.from(bucket).remove(paths);
}

export async function fetchListingPhotoUrls(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, 3600);
  if (error) throw error;
  return Object.fromEntries(
    data.flatMap((entry) =>
      entry.path && entry.signedUrl && !entry.error ? [[entry.path, entry.signedUrl]] : [],
    ),
  );
}
