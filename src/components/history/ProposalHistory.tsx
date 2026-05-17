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
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[28px] font-semibold text-[var(--kz-text-on-dark)]">Proposal History</h1>
            <p className="text-sm text-[var(--kz-text-on-dark-muted)] mt-1">Your last 100 proposals, most recent first.</p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 text-sm text-[var(--kz-text-on-dark-muted)] hover:text-[var(--kz-text-on-dark)] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--kz-green)]" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-[var(--kz-radius-card)] px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className="text-center py-16 text-[var(--kz-text-on-dark-muted)] text-sm">No proposals yet.</div>
        )}

        {!loading && rows.length > 0 && (
          <div className="bg-[var(--kz-surface)] rounded-[var(--kz-radius-card)] border border-[var(--kz-border)] shadow-[var(--kz-shadow-card)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-[var(--kz-border)]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--kz-text-secondary)] uppercase tracking-wide whitespace-nowrap">Reference</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--kz-text-secondary)] uppercase tracking-wide whitespace-nowrap">Client</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--kz-text-secondary)] uppercase tracking-wide hidden md:table-cell">Subject</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--kz-text-secondary)] uppercase tracking-wide whitespace-nowrap">Date</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--kz-text-secondary)] uppercase tracking-wide whitespace-nowrap">Total (€)</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--kz-text-secondary)] uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-[var(--kz-border)] last:border-0 hover:bg-[var(--kz-surface-hover)] transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-medium text-[var(--kz-green)]">{row.reference}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium text-[var(--kz-text)]">{row.customer_company}</div>
                        {row.customer_name && <div className="text-xs text-[var(--kz-text-secondary)]">{row.customer_name}</div>}
                      </td>
                      <td className="px-4 py-3 text-[var(--kz-text-secondary)] hidden md:table-cell max-w-xs truncate">
                        {row.subject}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-[var(--kz-text-secondary)]">
                        {fmtDate(row.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap font-medium text-[var(--kz-text)]">
                        {fmtMoney(row.total)}
                      </td>
                      <td className="px-4 py-3">
                        {row.email_sent_at ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-[var(--kz-green-soft)] text-[var(--kz-green)] border border-[var(--kz-green)]/30 px-2.5 py-0.5 rounded-[var(--kz-radius-pill)] uppercase tracking-wide">
                            <CheckCircle className="w-3 h-3" />Sent
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-[var(--kz-surface-hover)] text-[var(--kz-text-secondary)] border border-[var(--kz-border)] px-2.5 py-0.5 rounded-[var(--kz-radius-pill)]">
                            Draft
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openExport(row)}
                          disabled={opening === row.id}
                          className="inline-flex items-center gap-1 text-[13px] font-medium border border-[var(--kz-green)] text-[var(--kz-green)] hover:bg-[var(--kz-green-soft)] px-3 py-1.5 rounded-[var(--kz-radius-button)] transition-colors disabled:opacity-50"
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
