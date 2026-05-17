import { useState } from 'react'
import { useIntelligenceData } from '@/hooks/useIntelligenceData'
import type { ProposalAttention } from '@/hooks/useIntelligenceData'
import { useDailyBriefing, type BriefingResult } from '@/hooks/useDailyBriefing'
import { useFollowUp } from '@/hooks/useFollowUp'
import { useRole } from '@/hooks/useRole'

function fmtMoney(n: number) {
  return '€ ' + new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

type Props = {
  onNavigateToCustomer: (customerId: string) => void
}

export function IntelligencePage({ onNavigateToCustomer }: Props) {
  const { isManager } = useRole()
  const intelligenceData = useIntelligenceData(isManager)
  const {
    totalPipeline,
    totalRevenue,
    totalProposals,
    acceptedCount,
    rejectedCount,
    openCount,
    conversionRate,
    totalCustomers,
    proposalsNeedingAttention,
    coldRiskCustomers,
    loading,
    error,
  } = intelligenceData

  const {
    briefing,
    analyzing,
    error: briefingError,
    lastGenerated,
    generateBriefing,
  } = useDailyBriefing()

  const followUp = useFollowUp()
  const [selectedItem, setSelectedItem] = useState<ProposalAttention | null>(null)

  function handleGenerate() {
    void generateBriefing({
      metrics: { totalPipeline, totalRevenue, openCount, acceptedCount, rejectedCount, conversionRate },
      attentionItems: proposalsNeedingAttention,
      coldRiskItems: coldRiskCustomers,
    })
  }

  function handleFollowUp(item: ProposalAttention) {
    setSelectedItem(item)
    void followUp.generateDraft({
      customerName: item.customer.company,
      customerEmail: item.customer.email,
      proposalReference: item.proposal.reference,
      proposalSubject: item.proposal.subject,
      proposalTotal: item.proposal.total,
      proposalCreatedAt: item.proposal.created_at,
      daysOpen: item.daysOpen,
      salespersonName: item.proposal.salesperson_name,
      interactionHistory: '',
    })
  }

  function handleCloseModal() {
    setSelectedItem(null)
    followUp.reset()
  }

  return (
    <div className="space-y-7">

      {/* Page header */}
      <div>
        <h1 className="text-[28px] font-semibold text-[var(--kz-text-on-dark)]">Intelligence</h1>
        <p className="text-sm text-[var(--kz-text-on-dark-muted)] mt-1">Commercial overview and strategic priorities</p>
      </div>

      {/* Daily Briefing */}
      <DailyBriefingPanel
        briefing={briefing}
        analyzing={analyzing}
        error={briefingError}
        lastGenerated={lastGenerated}
        onGenerate={handleGenerate}
        onRefresh={handleGenerate}
      />

      {/* Metrics grid */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-5 h-5 border-2 border-[var(--kz-green)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard
              label="Total Revenue"
              value={fmtMoney(totalRevenue)}
              sub="from accepted proposals"
            />
            <MetricCard
              label="Pipeline"
              value={fmtMoney(totalPipeline)}
              sub={`${openCount} open proposal${openCount !== 1 ? 's' : ''}`}
            />
            <MetricCard
              label="Conversion Rate"
              value={`${conversionRate}%`}
              sub={`${acceptedCount} accepted · ${rejectedCount} rejected`}
            />
            <MetricCard
              label="Active Customers"
              value={String(totalCustomers)}
              sub="in your portfolio"
            />
          </div>

          {/* Proposals needing attention */}
          <section className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-[var(--kz-text-on-dark-muted)] uppercase tracking-wider">
                Proposals Needing Attention
              </p>
              <p className="text-xs text-[var(--kz-text-on-dark-muted)] mt-0.5 opacity-70">
                Open proposals sorted by days without response
              </p>
            </div>

            {proposalsNeedingAttention.length === 0 ? (
              <p className="text-sm text-[var(--kz-text-on-dark-muted)] text-center py-6">All proposals are up to date.</p>
            ) : (
              <div className="bg-[var(--kz-surface)] rounded-[var(--kz-radius-card)] border border-[var(--kz-border)] shadow-[var(--kz-shadow-card)] overflow-hidden">
                <div className="max-h-80 overflow-y-auto divide-y divide-[var(--kz-border)]">
                  {proposalsNeedingAttention.slice(0, 8).map((item) => {
                    const { proposal, customer, daysOpen, urgency } = item
                    const urgencyBar =
                      urgency === 'critical' ? 'bg-[var(--kz-green)]' :
                      urgency === 'high'     ? 'bg-gray-400' :
                                              'bg-gray-200'
                    const daysClass =
                      urgency === 'critical' ? 'text-[var(--kz-text-secondary)] font-semibold text-xs' :
                      urgency === 'high'     ? 'text-[var(--kz-text-secondary)] text-xs' :
                                              'text-[var(--kz-text-muted)] text-xs'
                    return (
                      <div key={proposal.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--kz-surface-hover)] transition-colors">
                        <div className={`w-0.5 self-stretch rounded-full flex-shrink-0 ${urgencyBar}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--kz-text)] truncate">{customer.company}</p>
                          <p className="text-xs text-[var(--kz-text-muted)] truncate">
                            {proposal.reference} · {proposal.subject}
                          </p>
                        </div>
                        <p className="text-sm font-medium text-[var(--kz-text)] flex-shrink-0">
                          {fmtMoney(proposal.total)}
                        </p>
                        <p className={`flex-shrink-0 w-16 text-right ${daysClass}`}>
                          {daysOpen} days
                        </p>
                        <button
                          onClick={() => handleFollowUp(item)}
                          className="flex-shrink-0 border border-[var(--kz-green)]/40 text-[var(--kz-green)] text-xs px-3 py-1 rounded-[var(--kz-radius-button)] hover:bg-[var(--kz-green-soft)] transition-colors"
                        >
                          Follow up
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </section>

          {/* Clients at risk */}
          <section className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-[var(--kz-text-on-dark-muted)] uppercase tracking-wider">
                Clients at Risk
              </p>
              <p className="text-xs text-[var(--kz-text-on-dark-muted)] mt-0.5 opacity-70">
                Clients with no activity in the last 14+ days
              </p>
            </div>

            {coldRiskCustomers.length === 0 ? (
              <p className="text-sm text-[var(--kz-text-on-dark-muted)] text-center py-6">All clients have recent activity.</p>
            ) : (
              <div className="bg-[var(--kz-surface)] rounded-[var(--kz-radius-card)] border border-[var(--kz-border)] shadow-[var(--kz-shadow-card)] overflow-hidden">
                <div className="max-h-64 overflow-y-auto divide-y divide-[var(--kz-border)]">
                  {coldRiskCustomers.slice(0, 6).map(({ customer, daysSinceLastActivity, lastActivityDate, lastActivityType, temperature }) => {
                    const tempClasses =
                      temperature === 'cold'
                        ? 'border-gray-300 text-[var(--kz-text-muted)]'
                        : 'border-gray-300 text-[var(--kz-text-secondary)]'
                    return (
                      <div key={customer.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--kz-surface-hover)] transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--kz-text)] truncate">{customer.company}</p>
                          <p className="text-xs text-[var(--kz-text-muted)] truncate">{customer.email}</p>
                          <p className="text-xs text-[var(--kz-text-muted)]">
                            Last {lastActivityType}: {fmtDate(lastActivityDate)}
                          </p>
                        </div>
                        <span className={`flex-shrink-0 border rounded-full px-2.5 py-0.5 text-xs ${tempClasses}`}>
                          {temperature === 'cold' ? 'Cold' : 'Warm'}
                        </span>
                        <p className="flex-shrink-0 text-xs text-[var(--kz-text-secondary)] w-24 text-right">
                          {daysSinceLastActivity} days inactive
                        </p>
                        <button
                          onClick={() => onNavigateToCustomer(customer.id)}
                          className="flex-shrink-0 text-xs text-[var(--kz-green)] hover:underline transition-colors"
                        >
                          View
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </section>

          {/* Stats footer */}
          <p className="text-xs text-[var(--kz-text-on-dark-muted)] text-center pb-2 opacity-60">
            {totalProposals} total proposals across {totalCustomers} customers
          </p>
        </>
      )}

      {/* Follow-up modal */}
      {selectedItem && (
        <FollowUpModal
          key={followUp.draft?.subject ?? 'generating'}
          item={selectedItem}
          draft={followUp.draft}
          generating={followUp.generating}
          sending={followUp.sending}
          sent={followUp.sent}
          error={followUp.error}
          onSend={(to, subject, body) => void followUp.sendEmail(to, subject, body)}
          onClose={handleCloseModal}
          onRetry={() => handleFollowUp(selectedItem)}
        />
      )}
    </div>
  )
}

// ─── Follow-up modal ───────────────────────────────────────────────────────────

type FollowUpModalProps = {
  item: ProposalAttention
  draft: { subject: string; body: string } | null
  generating: boolean
  sending: boolean
  sent: boolean
  error: string | null
  onSend: (to: string, subject: string, body: string) => void
  onClose: () => void
  onRetry: () => void
}

function FollowUpModal({ item, draft, generating, sending, sent, error, onSend, onClose, onRetry }: FollowUpModalProps) {
  const [editSubject, setEditSubject] = useState(draft?.subject ?? '')
  const [editBody, setEditBody] = useState(draft?.body ?? '')

  const hasDraft = !generating && draft !== null && !sent
  const hasGenerationError = !generating && draft === null && !sent && error !== null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-[var(--kz-surface)] rounded-[var(--kz-radius-card)] shadow-[var(--kz-shadow-card)] max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">

        <div>
          <p className="text-xs font-semibold text-[var(--kz-text-secondary)] uppercase tracking-wider">Follow-up Draft</p>
          <p className="text-sm font-medium text-[var(--kz-text)] mt-1">{item.customer.company}</p>
          <p className="text-xs text-[var(--kz-text-muted)]">{item.proposal.reference} · {fmtMoney(item.proposal.total)}</p>
        </div>

        {generating && (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="w-5 h-5 border-2 border-[var(--kz-green)] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[var(--kz-text-secondary)]">Generating follow-up draft...</p>
          </div>
        )}

        {hasDraft && (
          <>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[var(--kz-text-secondary)] block mb-1">Subject</label>
                <input
                  type="text"
                  value={editSubject}
                  onChange={e => setEditSubject(e.target.value)}
                  className="w-full border border-[var(--kz-border)] rounded-[var(--kz-radius-input)] p-2 text-sm text-[var(--kz-text)] focus:outline-none focus:border-[var(--kz-green)] focus:ring-2 focus:ring-[var(--kz-green-ring)]"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--kz-text-secondary)] block mb-1">Body (HTML)</label>
                <textarea
                  value={editBody}
                  onChange={e => setEditBody(e.target.value)}
                  className="w-full border border-[var(--kz-border)] rounded-[var(--kz-radius-input)] p-2 text-sm text-[var(--kz-text)] min-h-48 focus:outline-none focus:border-[var(--kz-green)] focus:ring-2 focus:ring-[var(--kz-green-ring)] resize-y font-mono"
                />
              </div>
            </div>
            {error && <p className="text-sm text-[var(--kz-text-secondary)]">{error}</p>}
            <div className="flex justify-end gap-3 pt-1">
              <button
                onClick={onClose}
                disabled={sending}
                className="border border-[var(--kz-border)] text-[var(--kz-text-secondary)] px-4 py-2 rounded-[var(--kz-radius-button)] text-sm hover:bg-[var(--kz-surface-hover)] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => onSend(item.customer.email, editSubject, editBody)}
                disabled={sending}
                className="bg-[var(--kz-green)] hover:bg-[var(--kz-green-hover)] text-white px-4 py-2 rounded-[var(--kz-radius-button)] text-sm transition-colors disabled:opacity-60"
              >
                {sending ? 'Sending...' : 'Send Email'}
              </button>
            </div>
          </>
        )}

        {sent && (
          <div className="flex flex-col items-center gap-4 py-4">
            <p className="text-sm text-[var(--kz-green)]">Follow-up sent successfully.</p>
            <button
              onClick={onClose}
              className="border border-[var(--kz-border)] text-[var(--kz-text-secondary)] px-4 py-2 rounded-[var(--kz-radius-button)] text-sm hover:bg-[var(--kz-surface-hover)] transition-colors"
            >
              Close
            </button>
          </div>
        )}

        {hasGenerationError && (
          <div className="flex flex-col items-center gap-4 py-4">
            <p className="text-sm text-[var(--kz-text-secondary)]">{error}</p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="border border-[var(--kz-border)] text-[var(--kz-text-secondary)] px-4 py-2 rounded-[var(--kz-radius-button)] text-sm hover:bg-[var(--kz-surface-hover)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onRetry}
                className="bg-[var(--kz-green)] hover:bg-[var(--kz-green-hover)] text-white px-4 py-2 rounded-[var(--kz-radius-button)] text-sm transition-colors"
              >
                Try again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Daily Briefing panel ──────────────────────────────────────────────────────

type BriefingPanelProps = {
  briefing: BriefingResult | null
  analyzing: boolean
  error: string | null
  lastGenerated: string | null
  onGenerate: () => void
  onRefresh: () => void
}

function DailyBriefingPanel({ briefing, analyzing, error, lastGenerated, onGenerate, onRefresh }: BriefingPanelProps) {
  const momentumClasses: Record<string, string> = {
    strong:   'border-[var(--kz-green)]/40 text-[var(--kz-green)]',
    building: 'border-[var(--kz-border-strong)] text-[var(--kz-text-secondary)]',
    brief:    'border-[var(--kz-border)] text-[var(--kz-text-muted)]',
    declining:'border-[var(--kz-border-strong)] text-[var(--kz-text-secondary)]',
  }

  return (
    <div className="bg-[var(--kz-surface)] border border-[var(--kz-border)] rounded-[var(--kz-radius-card)] shadow-[var(--kz-shadow-card-soft)] p-6">

      {analyzing && (
        <div className="flex flex-col items-center gap-3 py-2">
          <p className="text-xs font-semibold text-[var(--kz-text-secondary)] uppercase tracking-wider self-start">Daily Briefing</p>
          <div className="flex flex-col items-center gap-3 w-full pt-4">
            <div className="w-5 h-5 border-2 border-[var(--kz-green)] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[var(--kz-text-muted)]">Analysing your portfolio...</p>
          </div>
        </div>
      )}

      {!analyzing && !briefing && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-xs font-semibold text-[var(--kz-text-secondary)] uppercase tracking-wider self-start">Daily Briefing</p>
          <p className="text-sm text-[var(--kz-text-muted)] text-center">Generate your AI-powered commercial briefing for today.</p>
          {error && <p className="text-sm text-[var(--kz-text-muted)] text-center">Failed to generate briefing. Try again.</p>}
          <button
            onClick={onGenerate}
            className="bg-[var(--kz-green)] hover:bg-[var(--kz-green-hover)] text-white text-sm px-4 py-2.5 rounded-[var(--kz-radius-button)] font-medium transition-colors"
          >
            Generate Briefing
          </button>
        </div>
      )}

      {!analyzing && briefing && (
        <div className="space-y-4">

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-[var(--kz-text-secondary)] uppercase tracking-wider">Daily Briefing</p>
            <div className="flex items-center gap-3">
              {lastGenerated && (
                <p className="text-xs text-[var(--kz-text-muted)]">Generated at {fmtTime(lastGenerated)}</p>
              )}
              <button
                onClick={onRefresh}
                className="text-xs border border-[var(--kz-border)] text-[var(--kz-text-secondary)] px-2 py-0.5 rounded hover:bg-[var(--kz-surface-hover)] transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="pb-3 border-b border-[var(--kz-border)]">
            <p className="text-sm text-[var(--kz-text)] font-medium">{briefing.headline}</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--kz-text-muted)]">Momentum:</span>
            <span className={`border rounded px-2 py-0.5 text-xs ${momentumClasses[briefing.momentum] ?? 'border-[var(--kz-border)] text-[var(--kz-text-muted)]'}`}>
              {briefing.momentum.charAt(0).toUpperCase() + briefing.momentum.slice(1)}
            </span>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-[var(--kz-text-muted)] uppercase tracking-wider">Urgent actions</p>
            <ol className="divide-y divide-[var(--kz-border)]">
              {briefing.urgent.map((action, i) => (
                <li key={i} className="flex gap-2 text-sm text-[var(--kz-text)] py-2 first:pt-0 last:pb-0">
                  <span className="flex-shrink-0 text-[var(--kz-green)] font-semibold">{i + 1}.</span>
                  <span>{action}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-1">
            <div className="space-y-1">
              <p className="text-xs text-[var(--kz-text-muted)]">Opportunity</p>
              <p className="text-sm text-[var(--kz-text-secondary)]">{briefing.opportunity}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-[var(--kz-text-muted)]">Risk</p>
              <p className="text-sm text-[var(--kz-text-secondary)]">{briefing.risk}</p>
            </div>
          </div>

          {error && (
            <p className="text-sm text-[var(--kz-text-muted)]">Failed to generate briefing. Try again.</p>
          )}
        </div>
      )}
    </div>
  )
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-[var(--kz-surface)] rounded-[var(--kz-radius-card)] border border-[var(--kz-border)] p-4 shadow-[var(--kz-shadow-card-soft)]">
      <p className="text-xs text-[var(--kz-text-secondary)] uppercase tracking-wide font-medium">{label}</p>
      <p className="text-[28px] font-semibold text-[var(--kz-text)] mt-1 leading-tight">{value}</p>
      <p className="text-xs text-[var(--kz-text-muted)] mt-1">{sub}</p>
    </div>
  )
}
