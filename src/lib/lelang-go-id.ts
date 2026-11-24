/**
 * Membaca data lot dari API publik lelang.go.id. Halaman detail lelang.go.id dirender lewat
 * JavaScript, jadi data (termasuk foto) diambil dari endpoint yang dipakai halaman itu sendiri.
 */

export const lelangApiBase = "https://api.lelang.go.id/api/v1";
export const lelangFileHost = "file.lelang.go.id";

const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/** ID lot dari tautan https://lelang.go.id/kpknl/<kpknl>/detail-auction/<lot>. */
export function lelangLotId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!/^(www\.)?lelang\.go\.id$/i.test(parsed.hostname)) return null;
    return parsed.pathname.match(new RegExp(`/detail-auction/(${uuid})`, "i"))?.[1] ?? null;
  } catch {
    return null;
  }
}

/** Foto lelang.go.id hanya boleh diunduh dari host berkas resmi dan folder foto barang. */
export function isLelangPhotoUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === lelangFileHost &&
      !url.username &&
      !url.password &&
      !url.port &&
      /^\/lelang\/photo_barang\/[\w./-]+\.(jpe?g|png|webp)$/i.test(url.pathname) &&
      !url.pathname.includes("..")
    );
  } catch {
    return false;
  }
}

export type LelangLot = {
  title: string;
  limit: number | null;
  deposit: number | null;
  address: string;
  landArea: number | null;
  auctionDate: string | null;
  legal: string;
  /** Foto sampul lebih dulu. */
  photoUrls: string[];
};

type Photo = {
  iscover?: unknown;
  deletedAt?: unknown;
  file?: { folder?: unknown; fileName?: unknown };
};

const text = (value: unknown) => (typeof value === "string" ? value : "");
const positive = (value: unknown) => {
  const n = Number(String(value ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};
const stripTags = (value: string) =>
  value
    .replace(/<sup>\s*2\s*<\/sup>/gi, "²")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

export function parseLelangInfo(json: unknown): LelangLot | null {
  const data = (json as { data?: unknown } | null)?.data as Record<string, unknown> | undefined;
  if (!data || typeof data !== "object") return null;
  let content: Record<string, unknown> = {};
  try {
    const raw = data["content"];
    content = (typeof raw === "string" ? JSON.parse(raw) : raw) ?? {};
  } catch {
    content = {};
  }
  const barang = (Array.isArray(content["barangs"]) ? content["barangs"][0] : null) as Record<
    string,
    unknown
  > | null;
  const photos = (Array.isArray(data["photos"]) ? (data["photos"] as Photo[]) : [])
    .filter((photo) => !photo.deletedAt)
    .sort((a, b) => Number(Boolean(b.iscover)) - Number(Boolean(a.iscover)));
  const photoUrls = photos
    .map((photo) => {
      const folder = text(photo.file?.folder).replace(/^\/+|\/+$/g, "");
      const name = text(photo.file?.fileName);
      return folder && name ? `https://${lelangFileHost}/lelang/${folder}/${name}` : "";
    })
    .filter((url, index, all) => isLelangPhotoUrl(url) && all.indexOf(url) === index);
  const date = text(data["tglMulaiLelang"]).match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? null;
  const limit = positive(data["nilaiLimit"]);
  const deposit = positive(data["uangJaminan"]);
  return {
    title: stripTags(text(data["namaLotLelang"])).slice(0, 180),
    limit: limit === null ? null : Math.round(limit),
    deposit: deposit === null ? null : Math.round(deposit),
    address: text(barang?.["alamat"]).trim().slice(0, 500),
    landArea: positive(barang?.["luas"]),
    auctionDate: date,
    legal: text(barang?.["buktiKepemilikan"]).trim().slice(0, 100),
    photoUrls,
  };
}
