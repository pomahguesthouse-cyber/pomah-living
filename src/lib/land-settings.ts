import { z } from "zod";

/**
 * Standar platform untuk menilai potensi pecah kavling. Admin mengubahnya di
 * Admin → Pengaturan; flipper tetap boleh menyesuaikan per aset sesuai KRK setempat.
 */
export const landSettingsSchema = z.object({
  minLotArea: z.number().finite().min(1, "Minimal 1 m².").max(10_000),
  minFrontage: z.number().finite().min(1, "Minimal 1 m.").max(200),
  kdbPercent: z.number().finite().min(1, "Minimal 1%.").max(100, "Maksimal 100%."),
  maxFloors: z.number().int("Gunakan angka bulat.").min(1).max(10),
  buildCostPerM2: z.number().int().min(0).max(100_000_000),
});
export type LandSettings = z.infer<typeof landSettingsSchema>;

export const defaultLandSettings: LandSettings = {
  minLotArea: 60,
  minFrontage: 6,
  kdbPercent: 60,
  maxFloors: 2,
  buildCostPerM2: 4_000_000,
};

/** Kunci baris di tabel `app_settings`. */
export const landSettingsKey = "land_split";

/** Baca nilai dari database; isian yang hilang atau tidak sah kembali ke standar bawaan. */
export function parseLandSettings(value: unknown): LandSettings {
  if (!value || typeof value !== "object") return defaultLandSettings;
  const merged = { ...defaultLandSettings, ...(value as Record<string, unknown>) };
  const parsed = landSettingsSchema.safeParse(merged);
  return parsed.success ? parsed.data : defaultLandSettings;
}

export type LandInputMode = "dimensions" | "area";

export type LandSize = {
  mode: LandInputMode;
  /** Panjang tanah (ke belakang), m. */
  length: number;
  /** Lebar muka, sisi yang menghadap jalan, m. */
  width: number;
  /** Luas tanah bila diisi langsung, m². */
  area: number;
  /** Lebar muka opsional pada mode luas, m (0 = belum tahu). */
  frontage: number;
};

/** Luas dan lebar muka yang dipakai perhitungan. */
export function resolveLandSize(size: LandSize) {
  if (size.mode === "dimensions")
    return { landArea: size.length * size.width, frontage: size.width };
  return { landArea: size.area, frontage: size.frontage };
}
