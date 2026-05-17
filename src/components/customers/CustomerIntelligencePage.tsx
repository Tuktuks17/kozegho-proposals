import { useState, useEffect, useMemo, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import type { Customer, Interaction, Task, TaskPriority, TaskStatus, RelationshipScore } from '@/types/database'
import type { PersistedProposal } from '@/types/proposal'
import { useInteractions } from '@/hooks/useInteractions'
import { useTasks } from '@/hooks/useTasks'
import { useGmailThreads } from '@/hooks/useGmailThreads'
import { useCustomerProposals, type ProposalOutcome } from '@/hooks/useCustomerProposals'
import { useRelationshipScore } from '@/hooks/useRelationshipScore'
import { Search, ArrowLeft, Mail, Globe, TrendingUp, FileText, CheckCircle, Check } from 'lucide-react'

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
    case 'hot':  return { label: 'Hot',         borderClass: 'border-[var(--kz-border)]', textClass: 'text-[var(--kz-text-secondary)]' }
    case 'warm': return { label: 'Warm',        borderClass: 'border-[var(--kz-border)]', textClass: 'text-[var(--kz-text-secondary)]' }
    case 'cold': return { label: 'Cold',        borderClass: 'border-[var(--kz-border)]', textClass: 'text-[var(--kz-text-secondary)]' }
    default:     return { label: 'No activity', borderClass: 'border-[var(--kz-border)]', textClass: 'text-[var(--kz-text-muted)]'      }
  }
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtDateTime(rfc: string | null) {
  if (!rfc) return '—'
  try {
    const d = new Date(rfc)
    if (isNaN(d.getTime())) return rfc
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
           ', ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  } catch { return rfc }
}

function priorityClasses(p: TaskPriority): string {
  if (p === 'urgent') return 'border-gray-400 text-gray-600'
  if (p === 'high')   return 'border-gray-300 text-gray-500'
  return 'border-gray-200 text-gray-400'
}

function isOverdue(task: Task): boolean {
  if (!task.due_date || task.status !== 'open') return false
  return task.due_date < new Date().toISOString().slice(0, 10)
}

const COUNTRY_NAMES: Record<string, string> = {
  PT: 'Portugal', DE: 'Germany', ES: 'Spain', FR: 'France',
  GB: 'United Kingdom', NL: 'Netherlands', BE: 'Belgium',
  IT: 'Italy', PL: 'Poland', US: 'United States', BR: 'Brazil',
  CH: 'Switzerland', AT: 'Austria', SE: 'Sweden', DK: 'Denmark',
  NO: 'Norway', FI: 'Finland', IE: 'Ireland', LU: 'Luxembourg',
  CZ: 'Czech Republic', HU: 'Hungary', RO: 'Romania', SK: 'Slovakia',
  HR: 'Croatia', SI: 'Slovenia', BG: 'Bulgaria', GR: 'Greece',
  TR: 'Turkey', ZA: 'South Africa', MA: 'Morocco', AE: 'UAE',
}

function getCountryName(code: string): string {
  return COUNTRY_NAMES[code?.toUpperCase()] ?? code
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
    <div className="bg-[var(--kz-surface-soft)] rounded-[var(--kz-radius-input)] border border-[var(--kz-border)] p-3 text-center">
      <div className="text-xs text-[var(--kz-text-secondary)] mb-1">{label}</div>
      <div className="text-base font-bold text-[var(--kz-text)]">{value}</div>
      {sub && <div className="text-xs text-[var(--kz-text-muted)] mt-0.5">{sub}</div>}
    </div>
  )
}


// ─── Detail Panel ────────────────────────────────────────────────────────────

function CustomerDetail({ customer, onBack }: { customer: CustomerWithMetrics; onBack: () => void }) {
  const temp = temperatureLabel(customer.temperature)

  const { interactions, loading: intLoading, error: intError, addInteraction } = useInteractions(customer.id)
  const { tasks, loading: taskLoading, error: taskError, addTask, updateTaskStatus } = useTasks(customer.id)
  const { proposals, loading: propLoading, error: propError, updateOutcome } = useCustomerProposals(customer.id)
  const { threads, loading: emailLoading, error: emailError, noToken } = useGmailThreads(customer.email)
  const { score: aiScore, loading: aiLoading, analyzing, error: aiError, analyzeRelationship, isOutdated, invalidateScore } = useRelationshipScore(customer.id)

  // Metrics derived from proposals with outcome (updates when user clicks Open/Accepted/Rejected)
  const totalPipeline = proposals.reduce((sum, p) => sum + p.total, 0)
  const totalRevenue = proposals.filter(p => p.outcome === 'accepted').reduce((sum, p) => sum + p.total, 0)
  const acceptedCount = proposals.filter(p => p.outcome === 'accepted').length
  const rejectedCount = proposals.filter(p => p.outcome === 'rejected').length
  const decidedCount = acceptedCount + rejectedCount
  const convRate = decidedCount > 0 ? Math.round((acceptedCount / decidedCount) * 100) : 0

  const [userEmail, setUserEmail] = useState('')
  const [updatingOutcomes, setUpdatingOutcomes] = useState<Set<string>>(new Set())

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserEmail(data.session?.user.email ?? ''))
  }, [])

  const handleOutcomeUpdate = async (proposal: PersistedProposal, outcome: ProposalOutcome) => {
    if (outcome === (proposal.outcome ?? 'open')) return
    setUpdatingOutcomes(s => new Set(s).add(proposal.id))
    await updateOutcome(proposal.id, outcome)
    setUpdatingOutcomes(s => { const n = new Set(s); n.delete(proposal.id); return n })
    invalidateScore()
  }

  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState<Interaction['type']>('note')
  const [formContent, setFormContent] = useState('')
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [formSaving, setFormSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (formContent.trim().length < 3) {
      setFormError('Content must be at least 3 characters.')
      return
    }
    setFormSaving(true)
    setFormError(null)
    const result = await addInteraction({
      type: formType,
      content: formContent.trim(),
      occurred_at: new Date(formDate + 'T12:00:00Z').toISOString(),
    })
    setFormSaving(false)
    if (result.error) {
      setFormError(result.error)
    } else {
      invalidateScore()
      setShowForm(false)
      setFormContent('')
      setFormDate(new Date().toISOString().slice(0, 10))
      setFormType('note')
    }
  }

  const cancelForm = () => {
    setShowForm(false)
    setFormContent('')
    setFormError(null)
    setFormDate(new Date().toISOString().slice(0, 10))
    setFormType('note')
  }

  const [showTaskForm, setShowTaskForm] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('medium')
  const [taskDueDate, setTaskDueDate] = useState('')
  const [taskSaving, setTaskSaving] = useState(false)
  const [taskError2, setTaskError2] = useState<string | null>(null)

  const handleTaskSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (taskTitle.trim().length < 3) { setTaskError2('Title must be at least 3 characters.'); return }
    setTaskSaving(true)
    setTaskError2(null)
    const result = await addTask({ title: taskTitle.trim(), priority: taskPriority, due_date: taskDueDate || null })
    setTaskSaving(false)
    if (result.error) { setTaskError2(result.error) } else {
      setShowTaskForm(false); setTaskTitle(''); setTaskPriority('medium'); setTaskDueDate('')
    }
  }

  const cancelTaskForm = () => {
    setShowTaskForm(false); setTaskTitle(''); setTaskError2(null)
    setTaskPriority('medium'); setTaskDueDate('')
  }

  const handleToggleTask = async (task: Task) => {
    if (task.status !== 'open') return
    await updateTaskStatus(task.id, 'done' as TaskStatus)
  }

  return (
    <div className="bg-[var(--kz-surface)] rounded-[var(--kz-radius-card)] shadow-[var(--kz-shadow-card)] border border-[var(--kz-border)] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--kz-border)] flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-[var(--kz-text-secondary)] hover:text-[var(--kz-text)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <div className="w-px h-4 bg-[var(--kz-border)]" />
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-[var(--kz-text)] truncate">{customer.company}</h2>
          {customer.name && customer.name !== customer.company && (
            <p className="text-sm text-[var(--kz-text-secondary)] truncate">{customer.name}</p>
          )}
        </div>
        <span className={`text-xs font-bold px-3 py-1 rounded-[var(--kz-radius-pill)] border uppercase tracking-wide ${temp.borderClass} ${temp.textClass}`}>
          {temp.label}
        </span>
      </div>

      <div className="p-6 space-y-6">
        {/* Contact info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Mail className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="truncate">{customer.email}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Globe className="w-4 h-4 text-gray-400 shrink-0" />
            <span>{getCountryName(customer.country) || '—'}</span>
          </div>
        </div>

        {/* Metrics */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Metrics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricBox
              label="Total Revenue"
              value={`${fmtMoney(totalRevenue)} €`}
            />
            <MetricBox
              label="Pipeline"
              value={`${fmtMoney(totalPipeline)} €`}
              sub={`${proposals.length} proposal${proposals.length !== 1 ? 's' : ''}`}
            />
            <MetricBox
              label="Conversion Rate"
              value={`${convRate}%`}
              sub={`${acceptedCount} accepted · ${rejectedCount} rejected`}
            />
            <MetricBox
              label="Last Proposal"
              value={fmtDate(customer.lastProposalDate)}
            />
          </div>
        </div>

        {/* Timeline */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Timeline</h3>
            <button
              onClick={() => setShowForm(f => !f)}
              className="text-xs border border-kozegho-green text-kozegho-green bg-white px-2.5 py-1 rounded hover:bg-kozegho-green-light transition-colors"
            >
              + Log Interaction
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="mb-4 border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                <select
                  value={formType}
                  onChange={e => setFormType(e.target.value as Interaction['type'])}
                  className="w-full text-sm border border-gray-200 rounded px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-[#7AB648]"
                >
                  <option value="note">Note</option>
                  <option value="call">Call</option>
                  <option value="meeting">Meeting</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="visit">Visit</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Content</label>
                <textarea
                  value={formContent}
                  onChange={e => setFormContent(e.target.value)}
                  placeholder="Describe the interaction..."
                  rows={3}
                  className="w-full text-sm border border-gray-200 rounded px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-[#7AB648] resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  className="text-sm border border-gray-200 rounded px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-[#7AB648]"
                />
              </div>
              {formError && (
                <p className="text-xs text-gray-700 bg-gray-100 border border-gray-300 px-3 py-2 rounded">
                  {formError}
                </p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={formSaving}
                  className="text-sm px-4 py-1.5 rounded bg-[#7AB648] text-white font-medium hover:bg-kozegho-green-dark disabled:opacity-60 transition-colors"
                >
                  {formSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={cancelForm}
                  className="text-sm px-4 py-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {intLoading && (
            <div className="flex items-center justify-center py-6">
              <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${GREEN} transparent transparent transparent` }} />
            </div>
          )}

          {!intLoading && intError && (
            <p className="text-xs text-gray-600 bg-gray-100 border border-gray-300 px-3 py-2 rounded">
              Failed to load interactions: {intError}
            </p>
          )}

          {!intLoading && !intError && interactions.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No interactions recorded yet.</p>
          )}

          {!intLoading && !intError && interactions.length > 0 && (
            <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
              {interactions.map(item => (
                <div key={item.id} className="py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs border border-gray-300 text-gray-600 bg-white px-2 py-0.5 rounded capitalize">
                      {item.type}
                    </span>
                    <span className="text-xs text-gray-400">{fmtDate(item.occurred_at)}</span>
                  </div>
                  <p className="text-sm text-gray-800 leading-relaxed">{item.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tasks */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Tasks</h3>
            <button
              onClick={() => setShowTaskForm(f => !f)}
              className="text-xs border border-kozegho-green text-kozegho-green bg-white px-2.5 py-1 rounded hover:bg-kozegho-green-light transition-colors"
            >
              + Add Task
            </button>
          </div>

          {showTaskForm && (
            <form onSubmit={handleTaskSubmit} className="mb-4 border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  placeholder="Task title..."
                  className="w-full text-sm border border-gray-200 rounded px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-[#7AB648]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
                <select
                  value={taskPriority}
                  onChange={e => setTaskPriority(e.target.value as TaskPriority)}
                  className="w-full text-sm border border-gray-200 rounded px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-[#7AB648]"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Due Date (optional)</label>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={e => setTaskDueDate(e.target.value)}
                  className="text-sm border border-gray-200 rounded px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-[#7AB648]"
                />
              </div>
              {taskError2 && (
                <p className="text-xs text-gray-700 bg-gray-100 border border-gray-300 px-3 py-2 rounded">{taskError2}</p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={taskSaving}
                  className="text-sm px-4 py-1.5 rounded bg-[#7AB648] text-white font-medium hover:bg-kozegho-green-dark disabled:opacity-60 transition-colors"
                >
                  {taskSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={cancelTaskForm}
                  className="text-sm px-4 py-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {taskLoading && (
            <div className="flex items-center justify-center py-6">
              <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${GREEN} transparent transparent transparent` }} />
            </div>
          )}

          {!taskLoading && taskError && (
            <p className="text-xs text-gray-600 bg-gray-100 border border-gray-300 px-3 py-2 rounded">
              Failed to load tasks: {taskError}
            </p>
          )}

          {!taskLoading && !taskError && tasks.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No tasks for this customer.</p>
          )}

          {!taskLoading && !taskError && tasks.length > 0 && (
            <div className="max-h-48 overflow-y-auto divide-y divide-gray-100">
              {[...tasks]
                .sort((a, b) => (a.status === 'open' ? -1 : 1) - (b.status === 'open' ? -1 : 1))
                .map(task => (
                  <div key={task.id} className={`py-3 flex items-start gap-3 ${task.status !== 'open' ? 'opacity-50' : ''}`}>
                    <button
                      onClick={() => handleToggleTask(task)}
                      disabled={task.status !== 'open'}
                      className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                        task.status === 'done'
                          ? 'bg-[#7AB648] border-[#7AB648]'
                          : 'bg-white border-gray-300 hover:border-gray-500'
                      }`}
                    >
                      {task.status === 'done' && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm ${task.status !== 'open' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                          {task.title}
                        </span>
                        <span className={`text-xs border px-2 py-0.5 rounded capitalize ${priorityClasses(task.priority)}`}>
                          {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                        </span>
                      </div>
                      {task.due_date && (
                        <p className={`text-xs mt-0.5 ${isOverdue(task) ? 'text-gray-600 font-medium' : 'text-gray-400'}`}>
                          Due: {fmtDate(task.due_date)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Proposals */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Proposals</h3>

          {propLoading && (
            <div className="flex items-center justify-center py-6">
              <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${GREEN} transparent transparent transparent` }} />
            </div>
          )}

          {!propLoading && propError && (
            <p className="text-xs text-gray-600 bg-gray-100 border border-gray-300 px-3 py-2 rounded">
              Failed to load proposals: {propError}
            </p>
          )}

          {!propLoading && !propError && proposals.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No proposals for this customer.</p>
          )}

          {!propLoading && !propError && proposals.length > 0 && (
            <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
              {proposals.map(proposal => {
                const currentOutcome: ProposalOutcome = (proposal.outcome as ProposalOutcome) ?? 'open'
                const isUpdating = updatingOutcomes.has(proposal.id)
                return (
                  <div key={proposal.id} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium text-gray-800">{proposal.reference}</span>
                          <span className="text-sm font-medium text-gray-800 shrink-0">{fmtMoney(proposal.total)} €</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 truncate">{proposal.subject}</span>
                          <span className="text-xs text-gray-400 shrink-0">{fmtDate(proposal.created_at)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {(['open', 'accepted', 'rejected'] as ProposalOutcome[]).map(opt => (
                          <button
                            key={opt}
                            disabled={isUpdating}
                            onClick={() => handleOutcomeUpdate(proposal, opt)}
                            className={`text-xs px-2 py-0.5 rounded border transition-colors disabled:opacity-50 capitalize ${
                              currentOutcome === opt
                                ? opt === 'accepted'
                                  ? 'border-kozegho-green text-kozegho-green font-medium'
                                  : 'border-gray-400 text-gray-600 font-medium'
                                : 'border-gray-200 text-gray-400 hover:border-gray-300'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Email History */}
        <div>
          <div className="mb-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Email History</h3>
            <p className="text-xs text-gray-400 mt-0.5">Emails exchanged with {customer.email}</p>
          </div>

          {noToken && (
            <p className="text-sm text-gray-400 text-center py-4">
              Sign out and sign in again to view email history.
            </p>
          )}

          {!noToken && emailLoading && (
            <div className="flex items-center justify-center py-6">
              <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${GREEN} transparent transparent transparent` }} />
            </div>
          )}

          {!noToken && !emailLoading && emailError && (
            <p className="text-xs text-gray-600 bg-gray-100 border border-gray-300 px-3 py-2 rounded">
              {emailError}
            </p>
          )}

          {!noToken && !emailLoading && !emailError && threads.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No emails found with this customer.</p>
          )}

          {!noToken && !emailLoading && !emailError && threads.length > 0 && (
            <div className="relative">
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                {threads.map(thread => {
                  const isSent = userEmail && thread.from.includes(userEmail)
                  return (
                    <div key={thread.threadId} className="py-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className={`text-xs shrink-0 ${isSent ? 'text-gray-400' : 'text-kozegho-green font-medium'}`}>
                            {isSent ? 'Sent' : 'Received'}
                          </span>
                          <span className="text-sm text-gray-800 font-medium truncate">{thread.subject}</span>
                        </div>
                        {thread.messageCount > 1 && (
                          <span className="text-xs border border-gray-200 text-gray-400 px-2 py-0.5 rounded shrink-0 whitespace-nowrap">
                            {thread.messageCount} messages
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-500 truncate">{thread.from}</span>
                        <span className="text-xs text-gray-400 shrink-0">{fmtDateTime(thread.date)}</span>
                      </div>
                      {thread.snippet && (
                        <p className="text-xs text-gray-400 italic line-clamp-2">{thread.snippet}</p>
                      )}
                    </div>
                  )
                })}
              </div>
              {threads.length > 4 && (
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent" />
              )}
            </div>
          )}
        </div>

        {/* AI Intelligence */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">AI Intelligence</h3>
            <button
              disabled={analyzing}
              onClick={() => analyzeRelationship({ customer, proposals, interactions, emailCount: threads.length })}
              className="text-xs border border-kozegho-green text-kozegho-green bg-white px-2.5 py-1 rounded hover:bg-kozegho-green-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {analyzing ? 'Analysing...' : 'Analyse'}
            </button>
          </div>

          {aiLoading && !analyzing && (
            <div className="flex items-center justify-center py-6">
              <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${GREEN} transparent transparent transparent` }} />
            </div>
          )}

          {analyzing && (
            <div className="flex items-center gap-2 py-4 justify-center">
              <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${GREEN} transparent transparent transparent` }} />
              <span className="text-sm text-gray-400">Analysing relationship...</span>
            </div>
          )}

          {!aiLoading && !analyzing && aiError && (
            <p className="text-xs text-gray-600 bg-gray-100 border border-gray-300 px-3 py-2 rounded">{aiError}</p>
          )}

          {!aiLoading && !analyzing && !aiError && !aiScore && (
            <p className="text-sm text-gray-400 text-center py-4">
              No analysis yet. Click Analyse to generate insights.
            </p>
          )}

          {!analyzing && aiScore && (
            <>
              <AiScoreCard score={aiScore} />
              {isOutdated && (
                <div className="mt-2 px-3 py-2 bg-gray-50 border border-gray-100 rounded text-xs text-gray-400">
                  Activity recorded since last analysis. Click Analyse to refresh.
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  )
}

// ─── AI Score Card ────────────────────────────────────────────────────────────

function AiScoreCard({ score }: { score: RelationshipScore }) {
  const barColor =
    score.score >= 70 ? 'bg-kozegho-green' :
    score.score >= 40 ? 'bg-gray-400' :
    'bg-gray-300'

  const tempBadge = score.temperature === 'hot'
    ? 'border-kozegho-green text-kozegho-green'
    : score.temperature === 'warm'
    ? 'border-gray-400 text-gray-500'
    : 'border-gray-300 text-gray-400'

  return (
    <div className="space-y-4">
      {/* Score + bar */}
      <div>
        <div className="flex items-end gap-2 mb-2">
          <span className="text-3xl font-bold text-gray-800 leading-none">{score.score}</span>
          <span className="text-base text-gray-400 mb-0.5">/100</span>
          <span className={`text-xs font-bold px-2.5 py-0.5 rounded border uppercase tracking-wide ml-2 ${tempBadge}`}>
            {score.temperature}
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
          <div className={`h-1.5 rounded-full transition-all ${barColor}`} style={{ width: `${score.score}%` }} />
        </div>
      </div>

      {/* Analysis */}
      <div className="border-t border-gray-100 pt-3">
        <p className="text-sm text-gray-700 leading-relaxed">{score.analysis}</p>
        <p className="text-xs text-gray-400 mt-2">Last analysed: {new Date(score.last_analyzed).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + new Date(score.last_analyzed).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
      </div>

      {/* Opportunity */}
      {score.opportunity && (
        <div className="border-t border-gray-100 pt-3">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Opportunity</div>
          <p className="text-sm text-gray-700">{score.opportunity}</p>
        </div>
      )}

      {/* Suggestions */}
      {score.suggestions.length > 0 && (
        <div className="border-t border-gray-100 pt-3">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Suggested actions</div>
          <ol className="space-y-1">
            {score.suggestions.map((s, i) => (
              <li key={i} className="text-sm text-gray-700">{i + 1}. {s}</li>
            ))}
          </ol>
        </div>
      )}

      {/* Risk flags */}
      {score.risk_flags.length > 0 && (
        <div className="border-t border-gray-100 pt-3">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Risks</div>
          <ul className="space-y-1">
            {score.risk_flags.map((r, i) => (
              <li key={i} className="text-sm text-gray-500">— {r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ─── Customer Card ────────────────────────────────────────────────────────────

function CustomerCard({ customer, onClick }: { customer: CustomerWithMetrics; onClick: () => void }) {
  const temp = temperatureLabel(customer.temperature)

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-[var(--kz-surface)] rounded-[var(--kz-radius-card)] border border-[var(--kz-border)] shadow-[var(--kz-shadow-card-soft)] hover:shadow-[var(--kz-shadow-card)] hover:border-[var(--kz-border-strong)] transition-all p-5 group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="font-semibold text-[var(--kz-text)] truncate group-hover:text-[var(--kz-green)] transition-colors">
            {customer.company}
          </div>
          {customer.name && customer.name !== customer.company && (
            <div className="text-sm text-[var(--kz-text-secondary)] truncate">{customer.name}</div>
          )}
        </div>
        <span className={`text-[11px] font-medium uppercase tracking-wide px-2.5 py-0.5 rounded-[var(--kz-radius-pill)] border shrink-0 whitespace-nowrap ${temp.borderClass} ${temp.textClass}`}>
          {temp.label}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1 text-[var(--kz-text-secondary)]">
            <TrendingUp className="w-3 h-3" />
            <span>Revenue</span>
          </div>
          <span className="font-semibold text-[var(--kz-text)]">{fmtMoney(customer.totalRevenue)} €</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1 text-[var(--kz-text-secondary)]">
            <FileText className="w-3 h-3" />
            <span>Proposals</span>
          </div>
          <span className="font-semibold text-[var(--kz-text)]">{customer.proposalCount}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1 text-[var(--kz-text-secondary)]">
            <CheckCircle className="w-3 h-3" />
            <span>Exported</span>
          </div>
          <span className="font-semibold text-[var(--kz-text)]">{customer.exportedCount}</span>
        </div>
      </div>

      <div className="mt-3 text-xs text-[var(--kz-text-muted)]">
        Last proposal: {fmtDate(customer.lastProposalDate)}
      </div>
    </button>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function CustomerIntelligencePage({ autoSelectCustomerId, onAutoSelectDone }: {
  autoSelectCustomerId?: string | null
  onAutoSelectDone?: () => void
}) {
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
        setError(`Failed to load customers: ${custRes.error.message}`)
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

  useEffect(() => {
    if (!autoSelectCustomerId || customers.length === 0) return
    const target = customers.find(c => c.id === autoSelectCustomerId)
    if (target) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelected(target)
      onAutoSelectDone?.()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSelectCustomerId, customers])

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
          <h1 className="text-[28px] font-semibold text-[var(--kz-text-on-dark)]">Customers</h1>
          <p className="text-sm text-[var(--kz-text-on-dark-muted)] mt-1">Customer intelligence and commercial relationships</p>
        </div>
        {!loading && (
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-[var(--kz-green)]">Hot</span>
            <span className="text-[var(--kz-text-on-dark-muted)]">{stats.hot}</span>
            <span className="text-[var(--kz-text-on-dark-muted)] opacity-40">·</span>
            <span className="font-medium text-[var(--kz-text-on-dark-muted)]">Warm</span>
            <span className="text-[var(--kz-text-on-dark-muted)]">{stats.warm}</span>
            <span className="text-[var(--kz-text-on-dark-muted)] opacity-40">·</span>
            <span className="text-[var(--kz-text-on-dark-muted)]">Cold</span>
            <span className="text-[var(--kz-text-on-dark-muted)]">{stats.cold}</span>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--kz-text-on-dark-muted)]" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or company..."
          className="w-full pl-9 pr-4 h-12 text-sm border border-[var(--kz-border-dark)] rounded-[var(--kz-radius-input)] bg-[var(--kz-bg-elevated)] text-white placeholder:text-[var(--kz-text-on-dark-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--kz-green-ring)] focus:border-[var(--kz-green)]"
        />
      </div>

      {/* Body */}
      {loading && <Spinner />}

      {!loading && error && (
        <div className="bg-gray-100 border border-gray-300 text-gray-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-16 text-[var(--kz-text-on-dark-muted)]">
          {search ? (
            <p className="text-sm">No results found for &ldquo;{search}&rdquo;.</p>
          ) : (
            <p className="text-sm">No customers yet. Create your first proposal to add a customer.</p>
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
