import { createClient } from "@supabase/supabase-js";
import type { ProjectFields, ProjectRecord } from "@/lib/project-records";

type AccountsDatabase = {
  public: {
    Tables: {
      pomah_projects: {
        Row: ProjectRecord & { owner_id: string; created_at: string };
        Insert: ProjectFields;
        Update: Partial<ProjectFields>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};

const url = import.meta.env["VITE_SUPABASE_URL"]?.trim();
const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"]?.trim();
let client: ReturnType<typeof createClient<AccountsDatabase>> | undefined;

export function getAccountsClient() {
  if (!url || !key || !key.startsWith("sb_publishable_")) return null;
  try {
    if (new URL(url).protocol !== "https:") return null;
    return (client ??= createClient<AccountsDatabase>(url, key));
  } catch {
    return null;
  }
}
