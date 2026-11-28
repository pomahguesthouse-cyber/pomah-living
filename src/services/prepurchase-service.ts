import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { defaultCriteria, withWaterUtilities, masterSchema, type Criterion } from "@/lib/prepurchase";
const db = supabase as unknown as SupabaseClient;
export const prepurchaseKey = ["prepurchase-master"] as const;
export async function fetchCriteria(): Promise<Criterion[]> {
  const { data, error } = await db.from("pomah_prepurchase_master").select("criteria").eq("id",1).maybeSingle();
  if (error) throw error;
  return data ? withWaterUtilities(masterSchema.parse(data.criteria)) : defaultCriteria;
}
export async function saveCriteria(criteria: Criterion[]) {
  const { error } = await db.from("pomah_prepurchase_master").upsert({id:1,criteria:masterSchema.parse(criteria)});
  if (error) throw error;
}
