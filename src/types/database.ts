import type { PersistedProposal } from './proposal'

export type Profile = {
  id: string
  full_name: string
  email: string
  created_at: string
}

export type Customer = {
  id: string
  name: string
  company: string
  email: string
  country: string
  created_by: string
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: { id: string; full_name: string; email: string }
        Update: { full_name?: string; email?: string }
      }
      customers: {
        Row: Customer
        Insert: { name: string; company: string; email: string; country: string; created_by: string }
        Update: { name?: string; company?: string; email?: string; country?: string }
      }
      proposals: {
        Row: PersistedProposal
        Insert: Omit<PersistedProposal, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<PersistedProposal, 'id' | 'created_at' | 'created_by'>>
      }
    }
    Views: Record<string, never>
    Functions: {
      count_proposals_on_date: {
        Args: { p_date: string }
        Returns: number
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
