import { useState } from 'react'
import { useIntelligenceData } from '@/hooks/useIntelligenceData'
import type { ProposalAttention } from '@/hooks/useIntelligenceData'
import { useDailyBriefing, type BriefingResult } from '@/hooks/useDailyBriefing'
import { useFollowUp } from '@/hooks/useFollowUp'
import { useRole } from '@/hooks/useRole'
import { useMarketDigest } from '@/hooks/useMarketDigest'
import { useChiefOfStaffDigest } from '@/hooks/useChiefOfStaffDigest'
import type { MarketDigestItem, ChiefOfStaffDigest } from '@/types/database'
import { FollowUpModal } from './FollowUpModal'

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
    agentFollowupCount,
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

  const { digest: chiefDigest } = useChiefOfStaffDigest(isManager)

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

      {/* Chief of Staff weekly digest (managers only) */}
      {isManager && chiefDigest && <ChiefOfStaffPanel digest={chiefDigest} />}

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
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-[var(--kz-text-on-dark-muted)] uppercase tracking-wider">
                  Proposals Needing Attention
                </p>
                <p className="text-xs text-[var(--kz-text-on-dark-muted)] mt-0.5 opacity-70">
                  Open proposals sorted by days without response
                </p>
              </div>
              {agentFollowupCount > 0 && (
                <span className="flex-shrink-0 border border-[var(--kz-green)]/40 text-[var(--kz-green)] bg-[var(--kz-green-soft)] rounded-full px-2.5 py-0.5 text-xs font-medium">
                  {agentFollowupCount} agent follow-up{agentFollowupCount !== 1 ? 's' : ''} pending
                </span>
              )}
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

          {/* Market Intelligence (market-intelligence weekly agent) */}
          <MarketIntelligencePanel />

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
          headerTitle={selectedItem.customer.company}
          headerSubtitle={`${selectedItem.proposal.reference} · ${fmtMoney(selectedItem.proposal.total)}`}
          recipientEmail={selectedItem.customer.email}
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

// ─── Market Intelligence panel ─────────────────────────────────────────────────

function MarketIntelligencePanel() {
  const { digest, loading } = useMarketDigest()
  const catClass: Record<string, string> = {
    regulation: 'border-[var(--kz-green)]/40 text-[var(--kz-green)]',
    competitor: 'border-[var(--kz-border-strong)] text-[var(--kz-text-secondary)]',
    tender: 'border-[var(--kz-green)]/40 text-[var(--kz-green)]',
    trend: 'border-[var(--kz-border)] text-[var(--kz-text-muted)]',
    client: 'border-[var(--kz-border)] text-[var(--kz-text-muted)]',
  }
  if (loading || !digest || !digest.digest?.items?.length) return null
  const items = digest.digest.items as MarketDigestItem[]
  return (
    <section className="space-y-3">
      <div>
        <p className="text-xs font-semibold text-[var(--kz-text-on-dark-muted)] uppercase tracking-wider">Market Intelligence</p>
        <p className="text-xs text-[var(--kz-text-on-dark-muted)] mt-0.5 opacity-70">
          Water-treatment sector · PT/ES/FR/UK · updated {fmtDate(digest.created_at)}
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {items.map((item, i) => (
          <div key={i} className="bg-[var(--kz-surface)] rounded-[var(--kz-radius-card)] border border-[var(--kz-border)] shadow-[var(--kz-shadow-card-soft)] p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`text-[10px] uppercase tracking-wide border rounded px-1.5 py-0.5 ${catClass[item.category] ?? 'border-[var(--kz-border)] text-[var(--kz-text-muted)]'}`}>{item.category}</span>
              {item.region && <span className="text-[10px] text-[var(--kz-text-muted)]">{item.region}</span>}
            </div>
            <p className="text-sm font-medium text-[var(--kz-text)] leading-snug">
              {item.source ? (
                <a href={item.source} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--kz-green)] hover:underline">{item.title}</a>
              ) : item.title}
            </p>
            <p className="text-xs text-[var(--kz-text-secondary)] mt-1">{item.summary}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Chief of Staff weekly digest panel (managers only) ────────────────────────

function ChiefOfStaffPanel({ digest }: { digest: ChiefOfStaffDigest }) {
  const d = digest.digest
  const alert = d.cost_guardrail?.status === 'alert'
  return (
    <div className="bg-[var(--kz-surface)] border border-[var(--kz-border)] rounded-[var(--kz-radius-card)] shadow-[var(--kz-shadow-card-soft)] p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-[var(--kz-text-secondary)] uppercase tracking-wider">Chief of Staff · Weekly digest</p>
        <p className="text-xs text-[var(--kz-text-muted)]">{fmtDate(digest.created_at)}</p>
      </div>

      <p className="text-sm text-[var(--kz-text)] font-medium pb-3 border-b border-[var(--kz-border)]">{d.headline}</p>

      {d.agents_summary && (
        <div className="space-y-1">
          <p className="text-xs text-[var(--kz-text-muted)] uppercase tracking-wider">What the agents did</p>
          <p className="text-sm text-[var(--kz-text-secondary)]">{d.agents_summary}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {d.unanswered?.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-[var(--kz-text-muted)] uppercase tracking-wider">Went unanswered</p>
            <ul className="space-y-1">
              {d.unanswered.map((x, i) => (
                <li key={i} className="text-sm text-[var(--kz-text-secondary)] flex gap-2"><span className="text-[var(--kz-text-muted)]">·</span><span>{x}</span></li>
              ))}
            </ul>
          </div>
        )}
        {d.cross_client_patterns?.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-[var(--kz-text-muted)] uppercase tracking-wider">Cross-client patterns</p>
            <ul className="space-y-1">
              {d.cross_client_patterns.map((x, i) => (
                <li key={i} className="text-sm text-[var(--kz-text-secondary)] flex gap-2"><span className="text-[var(--kz-text-muted)]">·</span><span>{x}</span></li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {d.priorities?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-[var(--kz-text-muted)] uppercase tracking-wider">Priorities for next week</p>
          <ol className="divide-y divide-[var(--kz-border)]">
            {d.priorities.map((p, i) => (
              <li key={i} className="flex gap-2 text-sm text-[var(--kz-text)] py-2 first:pt-0 last:pb-0">
                <span className="flex-shrink-0 text-[var(--kz-green)] font-semibold">{i + 1}.</span>
                <span>{p}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {d.cost_guardrail && (
        <div className={`flex items-start gap-2 text-xs rounded-[var(--kz-radius-button)] border px-3 py-2 ${alert ? 'border-red-400/50 text-red-500 bg-red-500/5' : 'border-[var(--kz-border)] text-[var(--kz-text-muted)]'}`}>
          <span className="font-medium flex-shrink-0">{alert ? '⚠ Cost alert:' : 'Cost guardrail:'}</span>
          <span>{d.cost_guardrail.message}</span>
        </div>
      )}

      <p className="text-[10px] text-[var(--kz-text-muted)] text-right opacity-70">Generated by {d.model}</p>
    </div>
  )
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-[var(--kz-surface)] rounded-[var(--kz-radius-card)] border border-[var(--kz-border)] p-4 shadow-[var(--kz-shadow-card-soft)]">
      <p className="text-xs text-[var(--kz-text-secondary)] uppercase tracking-wide font-medium">{label}</p>
      <p className="text-2xl font-semibold text-[var(--kz-text)] mt-1 leading-tight tracking-tight">{value}</p>
      <p className="text-xs text-[var(--kz-text-muted)] mt-1">{sub}</p>
    </div>
  )
}
