import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AccountDetails = {
  full_name: string | null;
  birth_date: string | null;
  occupation: string | null;
  has_property_experience?: boolean | null;
  display_name: string | null;
  avatar_url: string | null;
  address: string | null;
  residence_province: string | null;
  residence_regency: string | null;
  contact_phone: string | null;
  preferred_regions: string[];
};

type ExistingProfile = Database["public"]["Tables"]["profiles"];
type AccountDatabase = Database & {
  public: {
    Tables: {
      profiles: {
        Row: ExistingProfile["Row"] & AccountDetails;
        Insert: ExistingProfile["Insert"] & Partial<AccountDetails>;
        Update: ExistingProfile["Update"] & Partial<AccountDetails>;
        Relationships: [];
      };
    };
  };
};

// Extend the existing client without changing the generated Supabase types.
const accounts = supabase as unknown as SupabaseClient<AccountDatabase>;
const accountColumns =
  "full_name,birth_date,occupation,display_name,avatar_url,address,residence_province,residence_regency,contact_phone,preferred_regions";

export const accountDetailsKey = (id: string) => ["account-details", id] as const;
export const preferredRegionsKey = (id: string | undefined) => ["preferred-regions", id] as const;

const accountColumnsWithExperience = `${accountColumns},has_property_experience` as const;

export async function fetchAccountDetails(id: string) {
  const { data, error } = await accounts
    .from("profiles")
    .select(accountColumnsWithExperience)
    .eq("id", id)
    .maybeSingle();
  if (!error) return { details: data, experienceAvailable: true };
  // Keep the existing form usable during an app-first rollout of the new column.
  if (
    !["42703", "PGRST204"].includes(error.code) ||
    !error.message.includes("has_property_experience")
  )
    throw error;

  const fallback = await accounts
    .from("profiles")
    .select(accountColumns)
    .eq("id", id)
    .maybeSingle();
  if (fallback.error) throw fallback.error;
  return { details: fallback.data, experienceAvailable: false };
}

export async function fetchPreferredRegions(id: string, signal: AbortSignal) {
  const { data, error } = await accounts
    .from("profiles")
    .select("preferred_regions")
    .eq("id", id)
    .abortSignal(signal)
    .maybeSingle();
  if (error) throw error;
  return data?.preferred_regions ?? [];
}

export async function saveAccountDetails(id: string, values: AccountDetails) {
  const { data, error } = await accounts
    .from("profiles")
    .upsert({ id, ...values })
    .select(
      Object.hasOwn(values, "has_property_experience")
        ? accountColumnsWithExperience
        : accountColumns,
    )
    .single()
    .overrideTypes<AccountDetails, { merge: false }>();
  if (error) throw error;
  return data;
}
