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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      assets: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          ticker: string
          type: Database["public"]["Enums"]["asset_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          ticker: string
          type: Database["public"]["Enums"]["asset_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          ticker?: string
          type?: Database["public"]["Enums"]["asset_type"]
          updated_at?: string
        }
        Relationships: []
      }
      bars: {
        Row: {
          asset_id: string
          close: number
          created_at: string
          high: number
          id: string
          low: number
          open: number
          timeframe: Database["public"]["Enums"]["timeframe_type"]
          timestamp: string
          volume: number
        }
        Insert: {
          asset_id: string
          close: number
          created_at?: string
          high: number
          id?: string
          low: number
          open: number
          timeframe: Database["public"]["Enums"]["timeframe_type"]
          timestamp: string
          volume?: number
        }
        Update: {
          asset_id?: string
          close?: number
          created_at?: string
          high?: number
          id?: string
          low?: number
          open?: number
          timeframe?: Database["public"]["Enums"]["timeframe_type"]
          timestamp?: string
          volume?: number
        }
        Relationships: [
          {
            foreignKeyName: "bars_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      indicators: {
        Row: {
          asset_id: string
          bb_lower: number | null
          bb_middle: number | null
          bb_upper: number | null
          bb_width: number | null
          created_at: string
          id: string
          rsi14: number | null
          sma100: number | null
          timeframe: Database["public"]["Enums"]["timeframe_type"]
          timestamp: string
        }
        Insert: {
          asset_id: string
          bb_lower?: number | null
          bb_middle?: number | null
          bb_upper?: number | null
          bb_width?: number | null
          created_at?: string
          id?: string
          rsi14?: number | null
          sma100?: number | null
          timeframe: Database["public"]["Enums"]["timeframe_type"]
          timestamp: string
        }
        Update: {
          asset_id?: string
          bb_lower?: number | null
          bb_middle?: number | null
          bb_upper?: number | null
          bb_width?: number | null
          created_at?: string
          id?: string
          rsi14?: number | null
          sma100?: number | null
          timeframe?: Database["public"]["Enums"]["timeframe_type"]
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "indicators_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      signals: {
        Row: {
          asset_id: string
          bb_width_15m: number | null
          confidence: number
          created_at: string
          distance_to_sma100: number | null
          id: string
          is_squeeze: boolean
          price_vs_sma100_15m: string | null
          price_vs_sma100_1d: string | null
          rationale_json: Json | null
          rsi_15m: number | null
          rsi_1d: number | null
          side: Database["public"]["Enums"]["signal_side"]
          timestamp: string
        }
        Insert: {
          asset_id: string
          bb_width_15m?: number | null
          confidence: number
          created_at?: string
          distance_to_sma100?: number | null
          id?: string
          is_squeeze?: boolean
          price_vs_sma100_15m?: string | null
          price_vs_sma100_1d?: string | null
          rationale_json?: Json | null
          rsi_15m?: number | null
          rsi_1d?: number | null
          side: Database["public"]["Enums"]["signal_side"]
          timestamp?: string
        }
        Update: {
          asset_id?: string
          bb_width_15m?: number | null
          confidence?: number
          created_at?: string
          distance_to_sma100?: number | null
          id?: string
          is_squeeze?: boolean
          price_vs_sma100_15m?: string | null
          price_vs_sma100_1d?: string | null
          rationale_json?: Json | null
          rsi_15m?: number | null
          rsi_1d?: number | null
          side?: Database["public"]["Enums"]["signal_side"]
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "signals_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      asset_type: "stock" | "etf"
      signal_side: "buy" | "sell" | "neutral"
      timeframe_type: "15m" | "1d"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      asset_type: ["stock", "etf"],
      signal_side: ["buy", "sell", "neutral"],
      timeframe_type: ["15m", "1d"],
    },
  },
} as const
