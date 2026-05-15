import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import type { Customer } from '@/types/database'
import { Search, ArrowLeft, Building2, Mail, Globe, TrendingUp, FileText, CheckCircle } from 'lucide-react'

type ProposalSummary = {
  customer_id: string
  total: number
  status: string
  created_at: string
}

type CustomerMetrics = {
  totalRevenue: number
  proposalCount: number
  exportedCount: number
  lastProposalDate: string | null
  temperature: 'hot' | 'warm' | 'cold' | 'none'
}

type CustomerWithMetrics = Customer & CustomerMetrics

const GREEN = '#7AB648'

function computeTemperature(lastDate: string | null): CustomerMetrics['temperature'] {
  if (!lastDate) return 'none'
  const days = (Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24)
  if (days <= 30) return 'hot'
  if (days <= 90) return 'warm'
  return 'cold'
}

function temperatureLabel(t: CustomerMetrics['temperature']) {
  switch (t) {
    case 'hot':  return { emoji: '🔥', label: 'Quente', color: '#ef4444' }
    case 'warm': return { emoji: '🟡', label: 'Morno',  color: '#f59e0b' }
    case 'cold': return { emoji: '❄️', label: 'Frio',   color: '#60a5fa' }
    default:     return { emoji: '—',  label: 'Sem actividade', color: '#9ca3af' }
  }
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${GREEN} transparent transparent transparent` }} />
    </div>
  )
}

function MetricBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-base font-bold text-gray-800">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  )
}

function PlaceholderSection({ title, message }: { title: string; message: string }) {
  return (
    <div className="border border-dashed border-gray-200 rounded-lg p-5">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{title}</div>
      <p className="text-sm text-gray-400 italic">{message}</p>
    </div>
  )
}

// ─── Detail Panel ────────────────────────────────────────────────────────────

function CustomerDetail({ customer, onBack }: { customer: CustomerWithMetrics; onBack: () => void }) {
  const temp = temperatureLabel(customer.temperature)
  const convRate = customer.proposalCount > 0
    ? Math.round((customer.exportedCount / customer.proposalCount) * 100)
    : 0

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar</span>
        </button>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-gray-900 truncate">{customer.company}</h2>
          {customer.name && customer.name !== customer.company && (
            <p className="text-sm text-gray-500 truncate">{customer.name}</p>
          )}
        </div>
        <span
          className="text-xs font-medium px-2.5 py-1 rounded-full"
          style={{ background: `${temp.color}20`, color: temp.color }}
        >
          {temp.emoji} {temp.label}
        </span>
      </div>

      <div className="p-6 space-y-6">
        {/* Contact info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Mail className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="truncate">{customer.email}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Globe className="w-4 h-4 text-gray-400 shrink-0" />
            <span>{customer.country || '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="truncate">{customer.company}</span>
          </div>
        </div>

        {/* Metrics */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Métricas</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricBox
              label="Receita Total"
              value={`${fmtMoney(customer.totalRevenue)} €`}
            />
            <MetricBox
              label="Propostas"
              value={String(customer.proposalCount)}
              sub={`${customer.exportedCount} exportadas`}
            />
            <MetricBox
              label="Taxa Conversão"
              value={`${convRate}%`}
            />
            <MetricBox
              label="Última Proposta"
              value={fmtDate(customer.lastProposalDate)}
            />
          </div>
        </div>

        {/* Timeline placeholder */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Timeline</h3>
          <PlaceholderSection
            title="Interações"
            message="Sem interações registadas."
          />
        </div>

        {/* Tasks placeholder */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Tarefas</h3>
          <PlaceholderSection
            title="Tarefas"
            message="Sem tarefas activas."
          />
        </div>

        {/* AI Intelligence placeholder */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">AI Intelligence</h3>
          <PlaceholderSection
            title="Análise AI"
            message="A implementar em próxima iteração."
          />
        </div>
      </div>
    </div>
  )
}

// ─── Customer Card ────────────────────────────────────────────────────────────

function CustomerCard({ customer, onClick }: { customer: CustomerWithMetrics; onClick: () => void }) {
  const temp = temperatureLabel(customer.temperature)

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all p-4 group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="font-semibold text-gray-900 truncate group-hover:text-[#7AB648] transition-colors">
            {customer.company}
          </div>
          {customer.name && customer.name !== customer.company && (
            <div className="text-sm text-gray-500 truncate">{customer.name}</div>
          )}
        </div>
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap"
          style={{ background: `${temp.color}20`, color: temp.color }}
        >
          {temp.emoji} {temp.label}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1 text-gray-400">
            <TrendingUp className="w-3 h-3" />
            <span>Receita</span>
          </div>
          <span className="font-semibold text-gray-700">{fmtMoney(customer.totalRevenue)} €</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1 text-gray-400">
            <FileText className="w-3 h-3" />
            <span>Propostas</span>
          </div>
          <span className="font-semibold text-gray-700">{customer.proposalCount}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1 text-gray-400">
            <CheckCircle className="w-3 h-3" />
            <span>Exportadas</span>
          </div>
          <span className="font-semibold text-gray-700">{customer.exportedCount}</span>
        </div>
      </div>

      <div className="mt-3 text-xs text-gray-400">
        Última proposta: {fmtDate(customer.lastProposalDate)}
      </div>
    </button>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function CustomerIntelligencePage() {
  const [customers, setCustomers] = useState<CustomerWithMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<CustomerWithMetrics | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)

      const [custRes, propRes] = await Promise.all([
        supabase.from('customers').select('*').order('company'),
        supabase.from('proposals').select('customer_id, total, status, created_at'),
      ])

      if (custRes.error) {
        setError(`Erro ao carregar clientes: ${custRes.error.message}`)
        setLoading(false)
        return
      }

      const rawCustomers = (custRes.data ?? []) as Customer[]
      const rawProposals = (propRes.data ?? []) as ProposalSummary[]

      // Group proposals by customer_id
      const byCustomer = new Map<string, ProposalSummary[]>()
      for (const p of rawProposals) {
        const arr = byCustomer.get(p.customer_id) ?? []
        arr.push(p)
        byCustomer.set(p.customer_id, arr)
      }

      const withMetrics: CustomerWithMetrics[] = rawCustomers.map(c => {
        const props = byCustomer.get(c.id) ?? []
        const exported = props.filter(p => p.status === 'exported')
        const lastDate = props.length > 0
          ? props.reduce((best, p) => p.created_at > best ? p.created_at : best, props[0].created_at)
          : null
        return {
          ...c,
          totalRevenue: props.reduce((s, p) => s + (p.total ?? 0), 0),
          proposalCount: props.length,
          exportedCount: exported.length,
          lastProposalDate: lastDate,
          temperature: computeTemperature(lastDate),
        }
      })

      // Sort: hot first, then warm, then cold, then none; within each group by lastProposalDate desc
      const order: Record<CustomerMetrics['temperature'], number> = { hot: 0, warm: 1, cold: 2, none: 3 }
      withMetrics.sort((a, b) => {
        const tempDiff = order[a.temperature] - order[b.temperature]
        if (tempDiff !== 0) return tempDiff
        if (!a.lastProposalDate && !b.lastProposalDate) return a.company.localeCompare(b.company)
        if (!a.lastProposalDate) return 1
        if (!b.lastProposalDate) return -1
        return b.lastProposalDate.localeCompare(a.lastProposalDate)
      })

      setCustomers(withMetrics)
      setLoading(false)
    }

    load()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return customers
    return customers.filter(c =>
      c.company.toLowerCase().includes(q) ||
      (c.name && c.name.toLowerCase().includes(q))
    )
  }, [customers, search])

  const stats = useMemo(() => ({
    hot:  customers.filter(c => c.temperature === 'hot').length,
    warm: customers.filter(c => c.temperature === 'warm').length,
    cold: customers.filter(c => c.temperature === 'cold').length,
  }), [customers])

  if (selected) {
    return <CustomerDetail customer={selected} onBack={() => setSelected(null)} />
  }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500 mt-0.5">Inteligência de clientes e relações comerciais</p>
        </div>
        {!loading && (
          <div className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1 text-red-500 font-medium">🔥 {stats.hot}</span>
            <span className="flex items-center gap-1 text-amber-500 font-medium">🟡 {stats.warm}</span>
            <span className="flex items-center gap-1 text-blue-400 font-medium">❄️ {stats.cold}</span>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Pesquisar por nome ou empresa…"
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#7AB648] focus:border-transparent placeholder:text-gray-400"
        />
      </div>

      {/* Body */}
      {loading && <Spinner />}

      {!loading && error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          {search ? (
            <p className="text-sm">Nenhum cliente encontrado para "{search}".</p>
          ) : (
            <p className="text-sm">Ainda não existem clientes. Cria a primeira proposta para registar um cliente.</p>
          )}
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => (
            <CustomerCard key={c.id} customer={c} onClick={() => setSelected(c)} />
          ))}
        </div>
      )}
    </div>
  )
}
