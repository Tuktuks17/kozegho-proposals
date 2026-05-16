import { useIntelligenceData } from '@/hooks/useIntelligenceData'

function fmtMoney(n: number) {
  return '€ ' + new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

type Props = {
  onNavigateToCustomer: (customerId: string) => void
}

export function IntelligencePage({ onNavigateToCustomer }: Props) {
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
  } = useIntelligenceData()

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-800">Intelligence</h1>
        <p className="text-sm text-gray-400 mt-1">Commercial overview and strategic priorities</p>
      </div>

      {/* Daily Briefing placeholder */}
      <div className="border border-dashed border-gray-200 rounded-lg p-6 text-center">
        <p className="text-gray-300 text-sm">
          Daily Briefing — Coming soon. AI will generate your 9:00 AM priorities automatically.
        </p>
      </div>

      {/* Metrics grid */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-5 h-5 border-2 border-kozegho-green border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-500">{error}</p>
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
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Proposals Needing Attention
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Open proposals sorted by days without response
              </p>
            </div>

            {proposalsNeedingAttention.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">All proposals are up to date.</p>
            ) : (
              <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                  {proposalsNeedingAttention.slice(0, 8).map(({ proposal, customer, daysOpen, urgency }) => {
                    const urgencyBar =
                      urgency === 'critical' ? 'bg-gray-700' :
                      urgency === 'high'     ? 'bg-gray-400' :
                                              'bg-gray-200'
                    const daysClass =
                      urgency === 'critical' ? 'text-gray-700 font-semibold text-xs' :
                      urgency === 'high'     ? 'text-gray-500 text-xs' :
                                              'text-gray-400 text-xs'
                    return (
                      <div key={proposal.id} className="flex items-center gap-3 px-4 py-3">
                        <div className={`w-0.5 self-stretch rounded-full flex-shrink-0 ${urgencyBar}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{customer.company}</p>
                          <p className="text-xs text-gray-400 truncate">
                            {proposal.reference} · {proposal.subject}
                          </p>
                        </div>
                        <p className="text-sm font-medium text-gray-700 flex-shrink-0">
                          {fmtMoney(proposal.total)}
                        </p>
                        <p className={`flex-shrink-0 w-16 text-right ${daysClass}`}>
                          {daysOpen} days
                        </p>
                        <button
                          onClick={() => onNavigateToCustomer(customer.id)}
                          className="flex-shrink-0 border border-kozegho-green text-kozegho-green text-xs px-3 py-1 rounded hover:bg-kozegho-green hover:text-white transition-colors"
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
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Clients at Risk
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Clients with no activity in the last 14+ days
              </p>
            </div>

            {coldRiskCustomers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">All clients have recent activity.</p>
            ) : (
              <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                  {coldRiskCustomers.slice(0, 6).map(({ customer, daysSinceLastActivity, lastActivityDate, lastActivityType, temperature }) => {
                    const tempClasses =
                      temperature === 'cold'
                        ? 'border-gray-300 text-gray-400'
                        : 'border-gray-300 text-gray-500'
                    return (
                      <div key={customer.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{customer.company}</p>
                          <p className="text-xs text-gray-400">
                            Last {lastActivityType}: {fmtDate(lastActivityDate)}
                          </p>
                        </div>
                        <span className={`flex-shrink-0 border rounded-full px-2.5 py-0.5 text-xs ${tempClasses}`}>
                          {temperature === 'cold' ? 'Cold' : 'Warm'}
                        </span>
                        <p className="flex-shrink-0 text-xs text-gray-500 w-24 text-right">
                          {daysSinceLastActivity} days inactive
                        </p>
                        <button
                          onClick={() => onNavigateToCustomer(customer.id)}
                          className="flex-shrink-0 text-xs text-gray-400 underline hover:text-gray-600 transition-colors"
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
          <p className="text-xs text-gray-300 text-center pb-2">
            {totalProposals} total proposals across {totalCustomers} customers
          </p>
        </>
      )}
    </div>
  )
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">{label}</p>
      <p className="text-xl font-semibold text-gray-800 mt-1">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  )
}
