import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AccountDetails = {
  full_name: string | null;
  age: number | null;
  display_name: string | null;
  avatar_url: string | null;
  address: string | null;
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
  "full_name,age,display_name,avatar_url,address,contact_phone,preferred_regions";

export const accountDetailsKey = (id: string) => ["account-details", id] as const;
export const preferredRegionsKey = (id: string | undefined) => ["preferred-regions", id] as const;

export async function fetchAccountDetails(id: string) {
  const { data, error } = await accounts
    .from("profiles")
    .select(accountColumns)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
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
    .select(accountColumns)
    .single();
  if (error) throw error;
  return data;
}
