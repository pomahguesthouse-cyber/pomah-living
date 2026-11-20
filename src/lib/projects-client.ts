import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { ProjectFields, ProjectRecord } from "@/lib/project-records";

type ProjectsDatabase = Database & {
  public: {
    Tables: {
      pomah_projects: {
        Row: ProjectRecord & { owner_id: string; created_at: string };
        Insert: ProjectFields;
        Update: Partial<ProjectFields>;
        Relationships: [];
      };
    };
  };
};

// The SQL file adds this table without editing the generated database types.
export const projectsClient = supabase as unknown as SupabaseClient<ProjectsDatabase>;
