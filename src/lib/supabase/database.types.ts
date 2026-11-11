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
      household_members: {
        Row: {
          created_at: string
          household_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          household_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          household_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_events: {
        Row: {
          created_at: string
          days_held: number | null
          household_id: string
          id: number
          is_demo: boolean
          item_key: string
          item_name: string
          kind: Database["public"]["Enums"]["inventory_event_kind"]
          occurred_on: string
          price_cents: number | null
          product_id: string | null
          quantity: number
          unit: Database["public"]["Enums"]["quantity_unit"]
        }
        Insert: {
          created_at?: string
          days_held?: number | null
          household_id: string
          id?: never
          is_demo?: boolean
          item_key: string
          item_name: string
          kind: Database["public"]["Enums"]["inventory_event_kind"]
          occurred_on: string
          price_cents?: number | null
          product_id?: string | null
          quantity: number
          unit: Database["public"]["Enums"]["quantity_unit"]
        }
        Update: {
          created_at?: string
          days_held?: number | null
          household_id?: string
          id?: never
          is_demo?: boolean
          item_key?: string
          item_name?: string
          kind?: Database["public"]["Enums"]["inventory_event_kind"]
          occurred_on?: string
          price_cents?: number | null
          product_id?: string | null
          quantity?: number
          unit?: Database["public"]["Enums"]["quantity_unit"]
        }
        Relationships: [
          {
            foreignKeyName: "inventory_events_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: Database["public"]["Enums"]["product_category"]
          created_at: string
          created_by: string | null
          expires_on: string
          household_id: string
          id: string
          is_demo: boolean
          item_key: string | null
          name: string
          notes: string | null
          price_cents: number | null
          purchased_on: string | null
          quantity: number
          storage: Database["public"]["Enums"]["storage_location"]
          unit: Database["public"]["Enums"]["quantity_unit"]
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["product_category"]
          created_at?: string
          created_by?: string | null
          expires_on: string
          household_id: string
          id?: string
          is_demo?: boolean
          item_key?: string | null
          name: string
          notes?: string | null
          price_cents?: number | null
          purchased_on?: string | null
          quantity: number
          storage?: Database["public"]["Enums"]["storage_location"]
          unit?: Database["public"]["Enums"]["quantity_unit"]
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["product_category"]
          created_at?: string
          created_by?: string | null
          expires_on?: string
          household_id?: string
          id?: string
          is_demo?: boolean
          item_key?: string | null
          name?: string
          notes?: string | null
          price_cents?: number | null
          purchased_on?: string | null
          quantity?: number
          storage?: Database["public"]["Enums"]["storage_location"]
          unit?: Database["public"]["Enums"]["quantity_unit"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id?: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reminder_log: {
        Row: {
          delivered: number
          devices: number
          id: number
          kind: string
          local_date: string
          sent_at: string
          title: string
          user_id: string
        }
        Insert: {
          delivered: number
          devices: number
          id?: never
          kind: string
          local_date: string
          sent_at?: string
          title: string
          user_id: string
        }
        Update: {
          delivered?: number
          devices?: number
          id?: never
          kind?: string
          local_date?: string
          sent_at?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          household_id: string
          id: string
          onboarded_at: string | null
          reminder_hour: number
          savi_mode: Database["public"]["Enums"]["savi_mode"]
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          household_id: string
          id: string
          onboarded_at?: string | null
          reminder_hour?: number
          savi_mode?: Database["public"]["Enums"]["savi_mode"]
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          household_id?: string
          id?: string
          onboarded_at?: string | null
          reminder_hour?: number
          savi_mode?: Database["public"]["Enums"]["savi_mode"]
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      savi_events: {
        Row: {
          created_at: string
          household_id: string
          id: number
          kind: Database["public"]["Enums"]["savi_event_kind"]
          label: string | null
          local_day: string
          ref_id: string | null
          user_id: string | null
          xp: number
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: never
          kind: Database["public"]["Enums"]["savi_event_kind"]
          label?: string | null
          local_day: string
          ref_id?: string | null
          user_id?: string | null
          xp: number
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: never
          kind?: Database["public"]["Enums"]["savi_event_kind"]
          label?: string | null
          local_day?: string
          ref_id?: string | null
          user_id?: string | null
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "savi_events_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      savi_missions: {
        Row: {
          completed_at: string
          household_id: string
          local_day: string
          mission: string
        }
        Insert: {
          completed_at?: string
          household_id: string
          local_day: string
          mission: string
        }
        Update: {
          completed_at?: string
          household_id?: string
          local_day?: string
          mission?: string
        }
        Relationships: [
          {
            foreignKeyName: "savi_missions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_items: {
        Row: {
          category: Database["public"]["Enums"]["product_category"]
          created_at: string
          created_by: string | null
          household_id: string
          id: string
          is_demo: boolean
          name: string
          name_key: string | null
          note: string | null
          purchased_at: string | null
          quantity: number
          source: string
          source_recipe: string | null
          unit: Database["public"]["Enums"]["quantity_unit"]
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["product_category"]
          created_at?: string
          created_by?: string | null
          household_id: string
          id?: string
          is_demo?: boolean
          name: string
          name_key?: string | null
          note?: string | null
          purchased_at?: string | null
          quantity?: number
          source?: string
          source_recipe?: string | null
          unit?: Database["public"]["Enums"]["quantity_unit"]
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["product_category"]
          created_at?: string
          created_by?: string | null
          household_id?: string
          id?: string
          is_demo?: boolean
          name?: string
          name_key?: string | null
          note?: string | null
          purchased_at?: string | null
          quantity?: number
          source?: string
          source_recipe?: string | null
          unit?: Database["public"]["Enums"]["quantity_unit"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      waste_records: {
        Row: {
          category: Database["public"]["Enums"]["product_category"]
          cost_cents: number | null
          created_at: string
          created_by: string | null
          discarded_on: string
          household_id: string
          id: string
          is_demo: boolean
          item_key: string | null
          product_id: string | null
          product_name: string
          quantity: number
          reason: Database["public"]["Enums"]["waste_reason"]
          unit: Database["public"]["Enums"]["quantity_unit"]
        }
        Insert: {
          category?: Database["public"]["Enums"]["product_category"]
          cost_cents?: number | null
          created_at?: string
          created_by?: string | null
          discarded_on?: string
          household_id: string
          id?: string
          is_demo?: boolean
          item_key?: string | null
          product_id?: string | null
          product_name: string
          quantity: number
          reason: Database["public"]["Enums"]["waste_reason"]
          unit?: Database["public"]["Enums"]["quantity_unit"]
        }
        Update: {
          category?: Database["public"]["Enums"]["product_category"]
          cost_cents?: number | null
          created_at?: string
          created_by?: string | null
          discarded_on?: string
          household_id?: string
          id?: string
          is_demo?: boolean
          item_key?: string | null
          product_id?: string | null
          product_name?: string
          quantity?: number
          reason?: Database["public"]["Enums"]["waste_reason"]
          unit?: Database["public"]["Enums"]["quantity_unit"]
        }
        Relationships: [
          {
            foreignKeyName: "waste_records_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waste_records_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      savi_demo_level_up: { Args: never; Returns: number }
      reminder_batch: { Args: { p_secret: string }; Returns: Json }
      reminder_prune: { Args: { p_endpoint: string; p_secret: string }; Returns: undefined }
      reminder_record: {
        Args: { p_delivered: number; p_devices: number; p_local_date: string; p_secret: string; p_title: string; p_user: string }
        Returns: undefined
      }
      save_push_subscription: {
        Args: { p_auth: string; p_endpoint: string; p_p256dh: string; p_user_agent: string }
        Returns: undefined
      }
      clear_demo_history: { Args: never; Returns: number }
      consume_product: {
        Args: { p_product_id: string; p_quantity: number }
        Returns: undefined
      }
      cook_recipe: {
        Args: { p_items: Json; p_recipe: string }
        Returns: number
      }
      discard_product: {
        Args: {
          p_discarded_on: string
          p_product_id: string
          p_quantity: number
          p_reason: Database["public"]["Enums"]["waste_reason"]
        }
        Returns: string
      }
      my_household_ids: { Args: never; Returns: string[] }
      savi_award: {
        Args: {
          p_household: string
          p_kind: Database["public"]["Enums"]["savi_event_kind"]
          p_label: string
          p_ref: string
        }
        Returns: undefined
      }
      savi_local_day: { Args: never; Returns: string }
      savi_total_xp: { Args: never; Returns: number }
      seed_demo_history: { Args: never; Returns: number }
      stock_purchased_items: {
        Args: { p_items: Json; p_purchased_on: string }
        Returns: number
      }
    }
    Enums: {
      inventory_event_kind: "bought" | "used" | "wasted"
      product_category:
        | "vegetables"
        | "fruits"
        | "dairy"
        | "meat"
        | "fish"
        | "grains"
        | "bakery"
        | "drinks"
        | "other"
      quantity_unit: "pcs" | "g" | "kg" | "ml" | "l" | "pack"
      savi_event_kind:
        | "product_added"
        | "product_used"
        | "food_rescued"
        | "recipe_cooked"
        | "shopping_stocked"
        | "mission_completed"
        | "demo_boost"
      savi_mode: "full" | "quiet" | "hidden"
      storage_location: "fridge" | "freezer" | "pantry"
      waste_reason: "expired" | "spoiled" | "leftovers" | "overbought" | "other"
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
    Enums: {
      inventory_event_kind: ["bought", "used", "wasted"],
      product_category: [
        "vegetables",
        "fruits",
        "dairy",
        "meat",
        "fish",
        "grains",
        "bakery",
        "drinks",
        "other",
      ],
      quantity_unit: ["pcs", "g", "kg", "ml", "l", "pack"],
      savi_event_kind: [
        "product_added",
        "product_used",
        "food_rescued",
        "recipe_cooked",
        "shopping_stocked",
        "mission_completed",
        "demo_boost",
      ],
      savi_mode: ["full", "quiet", "hidden"],
      storage_location: ["fridge", "freezer", "pantry"],
      waste_reason: ["expired", "spoiled", "leftovers", "overbought", "other"],
    },
  },
} as const

