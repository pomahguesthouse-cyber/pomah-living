import { z } from "zod";

export function isSafeImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      (!url.port || url.port === "443") &&
      /^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(url.hostname) &&
      !/(^|\.)(localhost|local|internal|test|invalid)$/i.test(url.hostname) &&
      !/\s/.test(value)
    );
  } catch {
    return false;
  }
}

const slideImageExtensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export function slideImageExtension(file: Pick<File, "type" | "size">) {
  if (
    file.size <= 0 ||
    file.size > 10 * 1024 * 1024 ||
    !Object.hasOwn(slideImageExtensions, file.type)
  )
    return undefined;
  return slideImageExtensions[file.type as keyof typeof slideImageExtensions];
}

export function heroSlideImagePath(value: string) {
  return value.match(
    /\/storage\/v1\/object\/public\/hero-slide-images\/([a-f0-9-]{36}\.(?:jpg|png|webp))$/,
  )?.[1];
}
export const slideDetailsSchema = z.object({
  title: z.string().trim().min(1, "Judul wajib diisi.").max(160),
  eyebrow: z.string().trim().max(100),
  description: z.string().trim().max(350),
  image_alt: z.string().trim().min(1, "Deskripsi gambar wajib diisi.").max(180),
  button_label: z.string().trim().min(1).max(80),
  button_href: z.enum(["/pilih-aset", "/proyek/demo"]),
  sort_order: z.number().int().min(0).max(999),
  published: z.boolean(),
});
export const slideSchema = slideDetailsSchema.extend({
  image_url: z.string().refine(isSafeImageUrl, "Gambar slide tidak valid."),
});
export type SlideInput = z.infer<typeof slideSchema>;
export const directorySchema = z.object({
  total: z.number(),
  accounts: z.number(),
  pending: z.number(),
  published: z.number(),
  rows: z.array(
    z.object({
      id: z.string(),
      email: z.string().nullable(),
      name: z.string(),
      created_at: z.string(),
      last_sign_in_at: z.string().nullable(),
      requested_role: z.string().nullable(),
      status: z.string(),
      note: z.string().nullable(),
      reviewed_at: z.string().nullable(),
    }),
  ),
});
export const statusLabels: Record<string, string> = {
  regular: "Pengguna biasa",
  pending: "Menunggu",
  approved: "Disetujui",
  rejected: "Ditolak",
  revision: "Perlu revisi",
};

export function canReviewApproval(status: string) {
  return status === "pending";
}
