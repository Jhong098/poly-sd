// Minimal hand-written DB type. Replace with `supabase gen types typescript` once schema is deployed.

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          username: string | null
          xp: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          username?: string | null
          xp?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          email?: string | null
          username?: string | null
          xp?: number
          updated_at?: string
        }
      }
      architectures: {
        Row: {
          id: string
          user_id: string
          name: string
          nodes: Json
          edges: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          nodes: Json
          edges: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          nodes?: Json
          edges?: Json
          updated_at?: string
        }
      }
      challenge_completions: {
        Row: {
          id: string
          user_id: string
          challenge_id: string
          passed: boolean
          score: number
          metrics: Json
          architecture_snapshot: Json | null
          completed_at: string
        }
        Insert: {
          id?: string
          user_id: string
          challenge_id: string
          passed: boolean
          score: number
          metrics: Json
          architecture_snapshot?: Json | null
          completed_at?: string
        }
        Update: {
          passed?: boolean
          score?: number
          metrics?: Json
          architecture_snapshot?: Json | null
          completed_at?: string
        }
      }
    }
  }
}
