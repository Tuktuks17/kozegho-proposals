import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Customer, Interaction } from '@/types/database'
import type { PersistedProposal } from '@/types/proposal'

export type ProposalAttention = {
  proposal: PersistedProposal
  customer: Customer
  daysOpen: number
  urgency: 'critical' | 'high' | 'medium'
}

export type ColdRiskCustomer = {
  customer: Customer
  daysSinceLastActivity: number
  lastActivityDate: string
  lastActivityType: 'proposal' | 'interaction'
  temperature: 'warm' | 'cold'
}

export type IntelligenceData = {
  totalPipeline: number
  totalRevenue: number
  totalProposals: number
  acceptedCount: number
  rejectedCount: number
  openCount: number
  conversionRate: number
  totalCustomers: number
  proposalsNeedingAttention: ProposalAttention[]
  coldRiskCustomers: ColdRiskCustomer[]
  loading: boolean
  error: string | null
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
}

export function useIntelligenceData(): IntelligenceData {
  const [data, setData] = useState<Omit<IntelligenceData, 'loading' | 'error'>>({
    totalPipeline: 0,
    totalRevenue: 0,
    totalProposals: 0,
    acceptedCount: 0,
    rejectedCount: 0,
    openCount: 0,
    conversionRate: 0,
    totalCustomers: 0,
    proposalsNeedingAttention: [],
    coldRiskCustomers: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString()

      const [customersRes, proposalsRes, interactionsRes] = await Promise.all([
        supabase.from('customers').select('*').order('company'),
        supabase.from('proposals').select('*').order('created_at', { ascending: false }),
        supabase.from('interactions').select('customer_id, occurred_at').gte('occurred_at', fourWeeksAgo),
      ])

      if (cancelled) return

      if (customersRes.error || proposalsRes.error || interactionsRes.error) {
        setError(
          customersRes.error?.message ||
          proposalsRes.error?.message ||
          interactionsRes.error?.message ||
          'Failed to load intelligence data'
        )
        setLoading(false)
        return
      }

      const customers = (customersRes.data ?? []) as Customer[]
      const proposals = (proposalsRes.data ?? []) as PersistedProposal[]
      const interactions = (interactionsRes.data ?? []) as Pick<Interaction, 'customer_id' | 'occurred_at'>[]

      // Financial metrics
      let totalPipeline = 0
      let totalRevenue = 0
      let acceptedCount = 0
      let rejectedCount = 0
      let openCount = 0

      for (const p of proposals) {
        if (p.outcome === 'accepted') {
          totalRevenue += p.total
          acceptedCount++
        } else if (p.outcome === 'rejected') {
          rejectedCount++
        } else {
          totalPipeline += p.total
          openCount++
        }
      }

      const decided = acceptedCount + rejectedCount
      const conversionRate = decided > 0 ? Math.round((acceptedCount / decided) * 100) : 0

      // Customer map for lookups
      const customerMap = new Map(customers.map(c => [c.id, c]))

      // Proposals needing attention (open, >= 4 days old)
      const proposalsNeedingAttention: ProposalAttention[] = proposals
        .filter(p => !p.outcome || p.outcome === 'open')
        .map(p => {
          const daysOpen = daysSince(p.created_at)
          const customer = customerMap.get(p.customer_id)
          if (!customer || daysOpen < 4) return null
          const urgency: ProposalAttention['urgency'] =
            daysOpen > 14 ? 'critical' : daysOpen >= 8 ? 'high' : 'medium'
          return { proposal: p, customer, daysOpen, urgency }
        })
        .filter((x): x is ProposalAttention => x !== null)
        .sort((a, b) => b.daysOpen - a.daysOpen)

      // Last proposal date per customer
      const lastProposalDate = new Map<string, string>()
      for (const p of proposals) {
        const existing = lastProposalDate.get(p.customer_id)
        if (!existing || p.created_at > existing) {
          lastProposalDate.set(p.customer_id, p.created_at)
        }
      }

      // Last interaction date per customer (within 4 weeks)
      const lastInteractionDate = new Map<string, string>()
      for (const i of interactions) {
        const existing = lastInteractionDate.get(i.customer_id)
        if (!existing || i.occurred_at > existing) {
          lastInteractionDate.set(i.customer_id, i.occurred_at)
        }
      }

      // Cold risk customers (>= 14 days since any activity)
      const coldRiskCustomers: ColdRiskCustomer[] = customers
        .map(c => {
          const lastProp = lastProposalDate.get(c.id) ?? null
          const lastInt = lastInteractionDate.get(c.id) ?? null

          let lastDate: string | null = null
          let lastActivityType: ColdRiskCustomer['lastActivityType'] = 'proposal'

          if (lastProp && lastInt) {
            if (lastProp >= lastInt) {
              lastDate = lastProp
              lastActivityType = 'proposal'
            } else {
              lastDate = lastInt
              lastActivityType = 'interaction'
            }
          } else if (lastProp) {
            lastDate = lastProp
            lastActivityType = 'proposal'
          } else if (lastInt) {
            lastDate = lastInt
            lastActivityType = 'interaction'
          }

          if (!lastDate) return null
          const days = daysSince(lastDate)
          if (days < 14) return null

          const temperature: ColdRiskCustomer['temperature'] = days > 30 ? 'cold' : 'warm'
          return { customer: c, daysSinceLastActivity: days, lastActivityDate: lastDate, lastActivityType, temperature }
        })
        .filter((x): x is ColdRiskCustomer => x !== null)
        .sort((a, b) => b.daysSinceLastActivity - a.daysSinceLastActivity)

      if (!cancelled) {
        setData({
          totalPipeline,
          totalRevenue,
          totalProposals: proposals.length,
          acceptedCount,
          rejectedCount,
          openCount,
          conversionRate,
          totalCustomers: customers.length,
          proposalsNeedingAttention,
          coldRiskCustomers,
        })
        setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  return { ...data, loading, error }
}
