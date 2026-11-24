export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      academy_progress: {
        Row: {
          completed: boolean
          level: number
          mission_index: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          completed?: boolean
          level?: number
          mission_index?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          completed?: boolean
          level?: number
          mission_index?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          actor_id: string
          after_data: Json | null
          before_data: Json | null
          created_at: string
          id: number
          target: string
        }
        Insert: {
          action: string
          actor_id: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          id?: never
          target: string
        }
        Update: {
          action?: string
          actor_id?: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          id?: never
          target?: string
        }
        Relationships: []
      }
      admin_roles: {
        Row: {
          created_at: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      hero_slides: {
        Row: {
          button_href: string
          button_label: string
          description: string
          eyebrow: string
          id: string
          image_alt: string
          image_url: string
          published: boolean
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          button_href?: string
          button_label?: string
          description?: string
          eyebrow?: string
          id?: string
          image_alt?: string
          image_url?: string
          published?: boolean
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          button_href?: string
          button_label?: string
          description?: string
          eyebrow?: string
          id?: string
          image_alt?: string
          image_url?: string
          published?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      partner_approvals: {
        Row: {
          created_at: string
          note: string
          requested_role: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          note?: string
          requested_role: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          note?: string
          requested_role?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      pomah_flipping_demos: {
        Row: {
          description: string
          id: string
          payload: Json
          published: boolean
          revision: number
          updated_at: string
        }
        Insert: {
          description?: string
          id: string
          payload: Json
          published?: boolean
          revision?: number
          updated_at?: string
        }
        Update: {
          description?: string
          id?: string
          payload?: Json
          published?: boolean
          revision?: number
          updated_at?: string
        }
        Relationships: []
      }
      pomah_listings: {
        Row: {
          access_verified: boolean
          address: string
          auction_date: string | null
          auction_limit: number
          bathrooms: number | null
          bedrooms: number | null
          building_area: number | null
          cover_photo_path: string | null
          created_at: string
          created_by: string | null
          documents_verified: boolean
          est_holding_sale: number
          est_purchase_costs: number
          est_renovation: number
          est_sale_price: number
          est_winning_price: number | null
          id: string
          land_area: number | null
          legal: string
          name: string
          notes: string
          occupancy_verified: boolean
          photo_paths: string[]
          regency_code: string
          slug: string
          sort_order: number
          source: string
          source_url: string | null
          status: string
          target_profit: number
          updated_at: string
        }
        Insert: {
          access_verified?: boolean
          address?: string
          auction_date?: string | null
          auction_limit: number
          bathrooms?: number | null
          bedrooms?: number | null
          building_area?: number | null
          cover_photo_path?: string | null
          created_at?: string
          created_by?: string | null
          documents_verified?: boolean
          est_holding_sale?: number
          est_purchase_costs?: number
          est_renovation?: number
          est_sale_price?: number
          est_winning_price?: number | null
          id?: string
          land_area?: number | null
          legal?: string
          name: string
          notes?: string
          occupancy_verified?: boolean
          photo_paths?: string[]
          regency_code: string
          slug: string
          sort_order?: number
          source: string
          source_url?: string | null
          status?: string
          target_profit?: number
          updated_at?: string
        }
        Update: {
          access_verified?: boolean
          address?: string
          auction_date?: string | null
          auction_limit?: number
          bathrooms?: number | null
          bedrooms?: number | null
          building_area?: number | null
          cover_photo_path?: string | null
          created_at?: string
          created_by?: string | null
          documents_verified?: boolean
          est_holding_sale?: number
          est_purchase_costs?: number
          est_renovation?: number
          est_sale_price?: number
          est_winning_price?: number | null
          id?: string
          land_area?: number | null
          legal?: string
          name?: string
          notes?: string
          occupancy_verified?: boolean
          photo_paths?: string[]
          regency_code?: string
          slug?: string
          sort_order?: number
          source?: string
          source_url?: string | null
          status?: string
          target_profit?: number
          updated_at?: string
        }
        Relationships: []
      }
      pomah_project_details: {
        Row: {
          payload: Json
          project_id: string
          revision: number
          updated_at: string
        }
        Insert: {
          payload: Json
          project_id: string
          revision?: number
          updated_at?: string
        }
        Update: {
          payload?: Json
          project_id?: string
          revision?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pomah_project_details_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "pomah_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      pomah_projects: {
        Row: {
          actual_cost: number | null
          actual_sale: number | null
          created_at: string
          expected_cost: number | null
          expected_sale: number | null
          id: string
          location: string
          name: string
          owner_id: string
          status: string
          updated_at: string
        }
        Insert: {
          actual_cost?: number | null
          actual_sale?: number | null
          created_at?: string
          expected_cost?: number | null
          expected_sale?: number | null
          id?: string
          location?: string
          name: string
          owner_id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          actual_cost?: number | null
          actual_sale?: number | null
          created_at?: string
          expected_cost?: number | null
          expected_sale?: number | null
          id?: string
          location?: string
          name?: string
          owner_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          age: number | null
          avatar_url: string | null
          birth_date: string | null
          contact_phone: string | null
          created_at: string
          display_name: string | null
          full_name: string | null
          has_property_experience: boolean | null
          id: string
          occupation: string | null
          preferred_regions: string[]
          residence_province: string | null
          residence_regency: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          age?: number | null
          avatar_url?: string | null
          birth_date?: string | null
          contact_phone?: string | null
          created_at?: string
          display_name?: string | null
          full_name?: string | null
          has_property_experience?: boolean | null
          id: string
          occupation?: string | null
          preferred_regions?: string[]
          residence_province?: string | null
          residence_regency?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          age?: number | null
          avatar_url?: string | null
          birth_date?: string | null
          contact_phone?: string | null
          created_at?: string
          display_name?: string | null
          full_name?: string | null
          has_property_experience?: boolean | null
          id?: string
          occupation?: string | null
          preferred_regions?: string[]
          residence_province?: string | null
          residence_regency?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_pomah_admin: { Args: never; Returns: boolean }
      pomah_admin_directory: {
        Args: {
          page_number?: number
          role_filter?: string
          search_text?: string
          status_filter?: string
        }
        Returns: Json
      }
      pomah_admin_metrics: { Args: never; Returns: Json }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
