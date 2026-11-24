import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  analysisDefaultsKey,
  analysisDefaultsSchema,
  defaultAnalysisDefaults,
  parseAnalysisDefaults,
  type AnalysisDefaults,
} from "@/lib/analysis-defaults";
import {
  defaultLandSettings,
  landSettingsKey,
  landSettingsSchema,
  parseLandSettings,
  type LandSettings,
} from "@/lib/land-settings";

/*
 * Tabel `app_settings` dibuat lewat SQL editor (docs/app-settings-setup.sql). Sampai tipe
 * Supabase diperbarui, tabel ini dipanggil lewat klien tanpa tipe dan hasilnya selalu
 * divalidasi dengan zod. Baris yang belum ada dibuat saat admin pertama kali menyimpan.
 */
const untyped = supabase as unknown as SupabaseClient;

export type SettingsResult<T> = {
  settings: T;
  /** "database" bila terbaca dari tabel; "default" bila belum tersimpan atau gagal dibaca. */
  source: "database" | "default";
};

async function fetchSetting<T>(
  key: string,
  parse: (value: unknown) => T,
  fallback: T,
): Promise<SettingsResult<T>> {
  try {
    const { data, error } = await untyped
      .from("app_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (error || !data) return { settings: fallback, source: "default" };
    return { settings: parse(data.value), source: "database" };
  } catch {
    return { settings: fallback, source: "default" };
  }
}

async function saveSetting(key: string, value: unknown) {
  const { error } = await untyped
    .from("app_settings")
    .upsert({ key, value }, { onConflict: "key" });
  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205")
      throw new Error(
        "Tabel pengaturan belum dibuat. Jalankan docs/app-settings-setup.sql di SQL editor.",
      );
    throw error;
  }
}

export const landSettingsQueryKey = ["app-settings", landSettingsKey] as const;
export type LandSettingsResult = SettingsResult<LandSettings>;

export function fetchLandSettings(): Promise<LandSettingsResult> {
  return fetchSetting(landSettingsKey, parseLandSettings, defaultLandSettings);
}

export function saveLandSettings(value: LandSettings) {
  return saveSetting(landSettingsKey, landSettingsSchema.parse(value));
}

export const analysisDefaultsQueryKey = ["app-settings", analysisDefaultsKey] as const;

export function fetchAnalysisDefaults(): Promise<SettingsResult<AnalysisDefaults>> {
  return fetchSetting(analysisDefaultsKey, parseAnalysisDefaults, defaultAnalysisDefaults);
}

export function saveAnalysisDefaults(value: AnalysisDefaults) {
  return saveSetting(analysisDefaultsKey, analysisDefaultsSchema.parse(value));
}
