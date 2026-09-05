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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      docket_loads: {
        Row: {
          created_at: string | null
          docket_id: string | null
          gross_weight: number | null
          id: string
          material_code: string | null
          net_weight: number | null
          product: string | null
          quantity: number | null
          tare_weight: number | null
          unit: string | null
        }
        Insert: {
          created_at?: string | null
          docket_id?: string | null
          gross_weight?: number | null
          id?: string
          material_code?: string | null
          net_weight?: number | null
          product?: string | null
          quantity?: number | null
          tare_weight?: number | null
          unit?: string | null
        }
        Update: {
          created_at?: string | null
          docket_id?: string | null
          gross_weight?: number | null
          id?: string
          material_code?: string | null
          net_weight?: number | null
          product?: string | null
          quantity?: number | null
          tare_weight?: number | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "docket_loads_docket_id_fkey"
            columns: ["docket_id"]
            isOneToOne: false
            referencedRelation: "docket_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "docket_loads_docket_id_fkey"
            columns: ["docket_id"]
            isOneToOne: false
            referencedRelation: "dockets"
            referencedColumns: ["id"]
          },
        ]
      }
      dockets: {
        Row: {
          arrive_jobsite: string | null
          command_job_number: string | null
          created_at: string | null
          customer_name: string | null
          customer_number: string | null
          delivery_address: string | null
          docket_date: string | null
          docket_number: string
          docket_type: string
          driver_name: string | null
          email_sender: string | null
          email_subject: string | null
          id: string
          pdf_path: string | null
          plant_name: string | null
          plant_number: string | null
          purchase_order: string | null
          source_email: string | null
          source_email_subject: string | null
          time_batched: string | null
          time_dispatched: string | null
          time_finished: string | null
          total_time_on_site: string | null
          truck_id: string | null
          waiting_time: string | null
        }
        Insert: {
          arrive_jobsite?: string | null
          command_job_number?: string | null
          created_at?: string | null
          customer_name?: string | null
          customer_number?: string | null
          delivery_address?: string | null
          docket_date?: string | null
          docket_number: string
          docket_type: string
          driver_name?: string | null
          email_sender?: string | null
          email_subject?: string | null
          id?: string
          pdf_path?: string | null
          plant_name?: string | null
          plant_number?: string | null
          purchase_order?: string | null
          source_email?: string | null
          source_email_subject?: string | null
          time_batched?: string | null
          time_dispatched?: string | null
          time_finished?: string | null
          total_time_on_site?: string | null
          truck_id?: string | null
          waiting_time?: string | null
        }
        Update: {
          arrive_jobsite?: string | null
          command_job_number?: string | null
          created_at?: string | null
          customer_name?: string | null
          customer_number?: string | null
          delivery_address?: string | null
          docket_date?: string | null
          docket_number?: string
          docket_type?: string
          driver_name?: string | null
          email_sender?: string | null
          email_subject?: string | null
          id?: string
          pdf_path?: string | null
          plant_name?: string | null
          plant_number?: string | null
          purchase_order?: string | null
          source_email?: string | null
          source_email_subject?: string | null
          time_batched?: string | null
          time_dispatched?: string | null
          time_finished?: string | null
          total_time_on_site?: string | null
          truck_id?: string | null
          waiting_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_dockets_truck"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      trucks: {
        Row: {
          active: boolean | null
          company: string | null
          created_at: string | null
          id: string
          purchase_date: string | null
          purchase_price: number | null
          registration: string | null
          truck_number: string | null
          truck_type: string | null
        }
        Insert: {
          active?: boolean | null
          company?: string | null
          created_at?: string | null
          id?: string
          purchase_date?: string | null
          purchase_price?: number | null
          registration?: string | null
          truck_number?: string | null
          truck_type?: string | null
        }
        Update: {
          active?: boolean | null
          company?: string | null
          created_at?: string | null
          id?: string
          purchase_date?: string | null
          purchase_price?: number | null
          registration?: string | null
          truck_number?: string | null
          truck_type?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      docket_summary: {
        Row: {
          customer_name: string | null
          docket_date: string | null
          docket_number: string | null
          docket_type: string | null
          driver_name: string | null
          id: string | null
          load_count: number | null
          pdf_path: string | null
          plant_name: string | null
          plant_number: string | null
          total_m3: number | null
          total_time_on_site: string | null
          total_tonnes: number | null
          truck_number: string | null
          waiting_time: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_customer_summary: {
        Args: { date_from: string; date_to: string }
        Returns: {
          customer_name: string
          docket_count: number
          last_docket_date: string
          total_aggregates_tonnes: number
          total_concrete_m3: number
        }[]
      }
      get_daily_volume: {
        Args: { date_from: string; date_to: string }
        Returns: {
          docket_date: string
          docket_type: string
          load_count: number
          total_quantity: number
          unit: string
        }[]
      }
      get_plant_summary: {
        Args: { date_from: string; date_to: string }
        Returns: {
          docket_count: number
          last_docket_date: string
          plant_name: string
          total_aggregates_tonnes: number
          total_concrete_m3: number
        }[]
      }
      get_truck_summary: {
        Args: { date_from: string; date_to: string }
        Returns: {
          company: string
          docket_count: number
          last_docket_date: string
          total_aggregates_tonnes: number
          total_concrete_m3: number
          truck_id: string
          truck_number: string
        }[]
      }
      get_turnaround_stats: {
        Args: { date_from: string; date_to: string }
        Returns: {
          avg_site_minutes: number
          docket_count: number
          median_site_minutes: number
          timed_docket_count: number
        }[]
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
