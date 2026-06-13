import type { PersistedProposal } from './proposal'

export type InteractionType = 'note' | 'call' | 'meeting' | 'whatsapp' | 'visit' | 'other'

export type RelationshipScore = {
  customer_id: string
  score: number
  temperature: 'hot' | 'warm' | 'cold'
  analysis: string
  opportunity: string | null
  suggestions: string[]
  risk_flags: string[]
  last_analyzed: string
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskStatus = 'open' | 'done' | 'cancelled'

export type Task = {
  id: string
  customer_id: string | null
  created_by: string
  assigned_to: string | null
  title: string
  due_date: string | null
  priority: TaskPriority
  status: TaskStatus
  source: 'user' | 'manual' | 'ai_extracted' | 'gmail_detected' | 'agent'
  source_ref: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

// Shape stored in tasks.metadata for agent-created follow-up tasks (source='agent').
export type AgentFollowUpMetadata = {
  proposal_id: string
  reference: string
  subject: string
  tier: 1 | 2 | 3
  tier_label: string
  days_open: number
  customer_name: string
  customer_email: string | null
  escalation: 'manager_alert' | null
  draft: { subject: string; body: string }
}

export type Interaction = {
  id: string
  customer_id: string
  created_by: string
  type: InteractionType
  content: string
  occurred_at: string
  ai_summary: string | null
  ai_sentiment: number | null
  ai_actions: unknown[]
  created_at: string
}

export type Profile = {
  id: string
  full_name: string
  email: string
  role: 'manager' | 'salesperson'
  created_at: string
}

export type Customer = {
  id: string
  name: string     // contacto (pessoa)
  company: string  // empresa
  email: string
  country: string
  created_by: string
  created_at: string
}

// In-memory types used by ProposalPDF for rendering — not DB tables
export type ProposalLine = {
  id: string
  proposal_id: string
  product_id: string | null
  product_name: string
  description: string | null
  quantity: number
  unit_price: number
  discount_percent: number | null
  line_total: number
  sort_order: number | null
  datasheet_url: string | null
  unit?: string | null
  base_price_eur?: number | null
  created_at: string
}

export type ProposalLineOption = {
  id: string
  proposal_line_id: string
  option_code: string
  option_label: string
  price_eur: number | null
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: { id: string; full_name?: string; email?: string; role?: 'manager' | 'salesperson' }
        Update: { full_name?: string; email?: string; role?: 'manager' | 'salesperson' }
      }
      customers: {
        Row: Customer
        Insert: { name?: string | null; company: string; email: string; country?: string | null; created_by: string }
        Update: Partial<Pick<Customer, 'name' | 'company' | 'email' | 'country'>>
      }
      proposals: {
        Row: PersistedProposal
        Insert: Omit<PersistedProposal, 'id' | 'created_at' | 'updated_at' | 'email_sent_at' | 'last_email_to' | 'last_email_subject'>
        Update: Partial<Omit<PersistedProposal, 'id' | 'created_at' | 'created_by'>>
      }
      interactions: {
        Row: Interaction
        Insert: {
          customer_id: string
          created_by: string
          type: InteractionType
          content: string
          occurred_at?: string
          ai_summary?: string | null
          ai_sentiment?: number | null
          ai_actions?: unknown[]
        }
        Update: Partial<Pick<Interaction, 'type' | 'content' | 'occurred_at' | 'ai_summary' | 'ai_sentiment' | 'ai_actions'>>
      }
      tasks: {
        Row: Task
        Insert: {
          customer_id?: string | null
          created_by: string
          assigned_to?: string | null
          title: string
          due_date?: string | null
          priority?: TaskPriority
          status?: TaskStatus
          source?: Task['source']
          source_ref?: string | null
        }
        Update: Partial<Pick<Task, 'title' | 'due_date' | 'priority' | 'status' | 'assigned_to'>>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
