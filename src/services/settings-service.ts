import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  defaultLandSettings,
  landSettingsKey,
  landSettingsSchema,
  parseLandSettings,
  type LandSettings,
} from "@/lib/land-settings";

/*
 * Tabel `app_settings` dibuat lewat Lovable (lihat docs/spec-pengaturan-tanah.md). Sampai
 * tipe Supabase diperbarui, tabel ini dipanggil lewat klien tanpa tipe dan hasilnya selalu
 * divalidasi dengan zod.
 */
const untyped = supabase as unknown as SupabaseClient;

export const landSettingsQueryKey = ["app-settings", landSettingsKey] as const;

export type LandSettingsResult = {
  settings: LandSettings;
  /** "database" bila terbaca dari tabel; "default" bila tabel belum ada atau gagal dibaca. */
  source: "database" | "default";
};

export async function fetchLandSettings(): Promise<LandSettingsResult> {
  try {
    const { data, error } = await untyped
      .from("app_settings")
      .select("value")
      .eq("key", landSettingsKey)
      .maybeSingle();
    if (error || !data) return { settings: defaultLandSettings, source: "default" };
    return { settings: parseLandSettings(data.value), source: "database" };
  } catch {
    return { settings: defaultLandSettings, source: "default" };
  }
}

export async function saveLandSettings(value: LandSettings) {
  const settings = landSettingsSchema.parse(value);
  const { error } = await untyped
    .from("app_settings")
    .upsert({ key: landSettingsKey, value: settings }, { onConflict: "key" });
  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205")
      throw new Error(
        "Tabel pengaturan belum dibuat. Minta Lovable membuat tabel app_settings sesuai docs/spec-pengaturan-tanah.md.",
      );
    throw error;
  }
}
