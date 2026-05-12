import { useState, useEffect } from 'react'
import { Loader2, RefreshCw, Mail, CheckCircle } from 'lucide-react'
import type { Profile, Customer } from '@/types/database'
import type { PersistedProposal } from '@/types/proposal'
import { supabase } from '@/lib/supabase'
import { ExportModal } from '@/components/export/ExportModal'

type Props = { profile: Profile }

type HistoryRow = PersistedProposal & { customer_company: string; customer_name: string }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtMoney(v: number) {
  return new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
}

export function ProposalHistory({ profile }: Props) {
  const [rows, setRows] = useState<HistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exportItem, setExportItem] = useState<{ proposal: PersistedProposal; customer: Customer } | null>(null)
  const [opening, setOpening] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: proposals, error: propErr } = await (supabase.from('proposals') as any)
        .select('*')
        .eq('created_by', profile.id)
        .order('created_at', { ascending: false })
        .limit(100)

      if (propErr) throw propErr
      if (!proposals?.length) { setRows([]); return }

      const customerIds: string[] = [...new Set<string>(proposals.map((p: PersistedProposal) => p.customer_id))]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: customers } = await (supabase.from('customers') as any)
        .select('id, company, name')
        .in('id', customerIds)

      const customerMap = new Map<string, Customer>((customers ?? []).map((c: Customer) => [c.id, c]))

      setRows(proposals.map((p: PersistedProposal) => {
        const c = customerMap.get(p.customer_id)
        return {
          ...p,
          customer_company: c?.company ?? '—',
          customer_name: c?.name ?? '',
        }
      }))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [profile.id])

  const openExport = async (row: HistoryRow) => {
    setOpening(row.id)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: cust } = await (supabase.from('customers') as any)
        .select('*').eq('id', row.customer_id).single()
      setExportItem({ proposal: row, customer: cust as Customer })
    } catch {
      // silently ignore
    } finally {
      setOpening(null)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-kozegho-dark">Proposal History</h1>
            <p className="text-sm text-kozegho-grey-text mt-0.5">Your last 100 proposals, most recent first.</p>
          </div>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 text-sm text-kozegho-grey-text hover:text-kozegho-dark transition-colors disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-kozegho-green" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className="text-center py-16 text-kozegho-grey-text text-sm">No proposals yet.</div>
        )}

        {!loading && rows.length > 0 && (
          <div className="bg-white rounded-lg shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-kozegho-grey border-b border-border">
                    <th className="text-left px-4 py-3 font-semibold text-kozegho-dark whitespace-nowrap">Reference</th>
                    <th className="text-left px-4 py-3 font-semibold text-kozegho-dark whitespace-nowrap">Client</th>
                    <th className="text-left px-4 py-3 font-semibold text-kozegho-dark hidden md:table-cell">Subject</th>
                    <th className="text-left px-4 py-3 font-semibold text-kozegho-dark whitespace-nowrap">Date</th>
                    <th className="text-right px-4 py-3 font-semibold text-kozegho-dark whitespace-nowrap">Total (€)</th>
                    <th className="text-left px-4 py-3 font-semibold text-kozegho-dark">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={row.id}
                      className={`border-b border-border last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-kozegho-grey/40'}`}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-bold text-kozegho-green">{row.reference}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium text-kozegho-dark">{row.customer_company}</div>
                        {row.customer_name && <div className="text-xs text-kozegho-grey-text">{row.customer_name}</div>}
                      </td>
                      <td className="px-4 py-3 text-kozegho-grey-text hidden md:table-cell max-w-xs truncate">
                        {row.subject}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-kozegho-grey-text">
                        {fmtDate(row.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap font-medium text-kozegho-dark">
                        {fmtMoney(row.total)}
                      </td>
                      <td className="px-4 py-3">
                        {row.email_sent_at ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-kozegho-green bg-kozegho-green-light px-2 py-0.5 rounded-full">
                            <CheckCircle className="w-3 h-3" />Sent
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-kozegho-grey-text bg-kozegho-grey px-2 py-0.5 rounded-full">
                            Draft
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openExport(row)}
                          disabled={opening === row.id}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-kozegho-green hover:bg-kozegho-green-dark px-3 py-1.5 rounded transition-colors disabled:opacity-50"
                        >
                          {opening === row.id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <Mail className="w-3 h-3" />}
                          Export
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {exportItem && (
        <ExportModal
          proposal={exportItem.proposal}
          customer={exportItem.customer}
          onClose={() => { setExportItem(null); load() }}
        />
      )}
    </>
  )
}
