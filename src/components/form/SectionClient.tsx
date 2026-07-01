import { useState, useEffect } from 'react'
import { Search, UserPlus, Sparkles } from 'lucide-react'
import type { ProposalFormState } from '@/types/proposal'
import type { Customer } from '@/types/database'
import { useCustomers } from '@/hooks/useCustomers'
import { useClientAnalysis } from '@/hooks/useClientAnalysis'
import { COUNTRIES } from '@/data/countries'

const fmtEur = (n: number) => '€' + new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(n)

type Props = {
  form: ProposalFormState
  userId: string
  onSetField: <K extends keyof ProposalFormState>(key: K, value: ProposalFormState[K]) => void
  onCustomerCreated: (customer: Customer) => void
}

export function SectionClient({ form, userId, onSetField, onCustomerCreated }: Props) {
  const [mode, setMode] = useState<'search' | 'new'>(form.customer_id ? 'search' : 'new')
  const [query, setQuery] = useState('')
  const { results, loading, search, upsert } = useCustomers()
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const clientAnalysis = useClientAnalysis()
  // Existing customers picked from search can generate client context on demand; brand-new ones can't.
  const [contextEligible, setContextEligible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => search(query), 300)
    return () => clearTimeout(t)
  }, [query, search])

  const selectCustomer = (c: Customer, fromSearch = false) => {
    setSelectedCustomer(c)
    onSetField('customer_id', c.id)
    setQuery(c.company)
    setMode('search')
    onCustomerCreated(c)  // propagate existing customer to ProposalForm state
    // On-demand: do NOT fire analyze-client-history here. Just clear any prior display and mark
    // whether this customer is eligible for the (paid) client-context button.
    clientAnalysis.reset()
    setContextEligible(fromSearch)
  }

  const createCustomer = async () => {
    const d = form.customer_draft
    if (!d.company || !d.email || !d.country) return
    const c = await upsert({ name: d.name || null, company: d.company, email: d.email, country: d.country || null }, userId)
    if (c) { onCustomerCreated(c); selectCustomer(c) }
  }

  const draft = form.customer_draft
  const setDraftField = (field: keyof typeof draft, value: string) => {
    onSetField('customer_draft', { ...draft, [field]: value })
  }

  return (
    <section className="bg-white rounded-lg border border-border shadow-card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-display font-semibold text-kozegho-dark">Client</h2>
        <div className="flex gap-2">
          <button onClick={() => setMode('search')}
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${mode === 'search' ? 'bg-kozegho-green text-white border-kozegho-green' : 'border-border text-kozegho-dark hover:bg-kozegho-grey'}`}>
            <Search className="w-3 h-3" /> Find existing
          </button>
          <button onClick={() => setMode('new')}
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${mode === 'new' ? 'bg-kozegho-green text-white border-kozegho-green' : 'border-border text-kozegho-dark hover:bg-kozegho-grey'}`}>
            <UserPlus className="w-3 h-3" /> New client
          </button>
        </div>
      </div>

      {mode === 'search' && (
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-kozegho-grey-text" />
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by company name..."
              className="w-full rounded-md border border-border bg-input pl-9 pr-3 py-2 text-sm text-kozegho-dark focus:outline-none focus:ring-2 focus:ring-kozegho-green" />
          </div>
          {loading && <p className="text-xs text-kozegho-grey-text">Searching...</p>}
          {results.length > 0 && !selectedCustomer && (
            <div className="border border-border rounded-md overflow-hidden">
              {results.map((c) => (
                <button key={c.id} onClick={() => selectCustomer(c, true)}
                  className="w-full text-left px-3 py-2.5 hover:bg-kozegho-grey border-b border-border last:border-0 transition-colors">
                  <p className="text-sm font-medium text-kozegho-dark">{c.company}</p>
                  <p className="text-xs text-kozegho-grey-text">{c.name || '—'} · {c.email}</p>
                </button>
              ))}
            </div>
          )}
          {selectedCustomer && (
            <div className="bg-kozegho-green-light rounded-md p-3 flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-kozegho-dark">{selectedCustomer.company}</p>
                <p className="text-xs text-kozegho-grey-text">{selectedCustomer.name || '—'} · {selectedCustomer.email} · {selectedCustomer.country}</p>
              </div>
              <button onClick={() => { setSelectedCustomer(null); onSetField('customer_id', null); setQuery(''); clientAnalysis.reset(); setContextEligible(false) }}
                className="text-xs text-kozegho-grey-text hover:text-kozegho-dark ml-3 shrink-0">Change</button>
            </div>
          )}

          {/* Client context for an existing client — ON-DEMAND (analyze-client-history RAG).
              The paid Sonnet call fires only when the salesperson clicks; the hook caches per
              customer so a repeat request this session does not re-fire. */}
          {selectedCustomer && contextEligible && (
            <div className="rounded-md border border-border bg-white p-3">
              <p className="text-xs font-semibold text-kozegho-grey-text uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-kozegho-green" /> Client context
              </p>

              {!clientAnalysis.data && !clientAnalysis.loading && (
                <button
                  onClick={() => clientAnalysis.analyze(selectedCustomer.id)}
                  className="text-xs border border-kozegho-green text-kozegho-green bg-white px-2.5 py-1 rounded hover:bg-kozegho-green-light transition-colors"
                >
                  Generate client context
                </button>
              )}

              {clientAnalysis.error && !clientAnalysis.loading && (
                <p className="text-xs text-gray-600 mt-2">{clientAnalysis.error}</p>
              )}

              {clientAnalysis.loading && (
                <p className="text-xs text-kozegho-grey-text">Analysing this client's history…</p>
              )}

              {clientAnalysis.data && clientAnalysis.data.facts.proposalCount > 0 && (
                <>
                  <p className="text-sm text-kozegho-dark">{clientAnalysis.data.summary}</p>
                  <div className="flex flex-wrap gap-x-2 gap-y-1 mt-2 text-xs text-kozegho-grey-text">
                    <span>{clientAnalysis.data.facts.acceptedCount} won · {clientAnalysis.data.facts.rejectedCount} lost · {clientAnalysis.data.facts.openCount} open</span>
                    {clientAnalysis.data.facts.revenue > 0 && <span>· {fmtEur(clientAnalysis.data.facts.revenue)} won</span>}
                    {clientAnalysis.data.facts.priceMax > 0 && (
                      <span>· typical {fmtEur(clientAnalysis.data.facts.priceMin)}–{fmtEur(clientAnalysis.data.facts.priceMax)}</span>
                    )}
                  </div>
                </>
              )}

              {clientAnalysis.data && clientAnalysis.data.facts.proposalCount === 0 && (
                <p className="text-xs text-kozegho-grey-text">No prior proposals for this client yet.</p>
              )}
            </div>
          )}
        </div>
      )}

      {mode === 'new' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-kozegho-grey-text uppercase tracking-wide">Company *</label>
            <input type="text" value={draft.company} onChange={(e) => setDraftField('company', e.target.value)}
              className="rounded-md border border-border bg-input px-3 py-2 text-sm text-kozegho-dark focus:outline-none focus:ring-2 focus:ring-kozegho-green" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-kozegho-grey-text uppercase tracking-wide">Contact name</label>
            <input type="text" value={draft.name} onChange={(e) => setDraftField('name', e.target.value)}
              className="rounded-md border border-border bg-input px-3 py-2 text-sm text-kozegho-dark focus:outline-none focus:ring-2 focus:ring-kozegho-green" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-kozegho-grey-text uppercase tracking-wide">Email *</label>
            <input type="email" value={draft.email} onChange={(e) => setDraftField('email', e.target.value)}
              className="rounded-md border border-border bg-input px-3 py-2 text-sm text-kozegho-dark focus:outline-none focus:ring-2 focus:ring-kozegho-green" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-kozegho-grey-text uppercase tracking-wide">Country *</label>
            <select value={draft.country} onChange={(e) => setDraftField('country', e.target.value)}
              className="rounded-md border border-border bg-input px-3 py-2 text-sm text-kozegho-dark focus:outline-none focus:ring-2 focus:ring-kozegho-green">
              <option value="">Select country…</option>
              {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <button onClick={createCustomer} disabled={!draft.company || !draft.email || !draft.country}
              className="w-full rounded-md bg-kozegho-green py-2.5 text-sm font-semibold text-white hover:bg-kozegho-green-dark transition-colors disabled:opacity-50">
              Save & use this client
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
