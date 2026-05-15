import { useState, useEffect, useMemo, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import type { Customer, Interaction, Task, TaskPriority, TaskStatus } from '@/types/database'
import { useInteractions } from '@/hooks/useInteractions'
import { useTasks } from '@/hooks/useTasks'
import { Search, ArrowLeft, Building2, Mail, Globe, TrendingUp, FileText, CheckCircle, Check } from 'lucide-react'

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
    case 'hot':  return { label: 'Hot',         borderClass: 'border-kozegho-green', textClass: 'text-kozegho-green' }
    case 'warm': return { label: 'Warm',        borderClass: 'border-gray-400',       textClass: 'text-gray-500'      }
    case 'cold': return { label: 'Cold',        borderClass: 'border-gray-300',       textClass: 'text-gray-400'      }
    default:     return { label: 'No activity', borderClass: 'border-gray-200',       textClass: 'text-gray-400'      }
  }
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
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

  const { interactions, loading: intLoading, error: intError, addInteraction } = useInteractions(customer.id)
  const { tasks, loading: taskLoading, error: taskError, addTask, updateTaskStatus } = useTasks(customer.id)

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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-gray-900 truncate">{customer.company}</h2>
          {customer.name && customer.name !== customer.company && (
            <p className="text-sm text-gray-500 truncate">{customer.name}</p>
          )}
        </div>
        <span className={`text-xs font-bold px-3 py-1 rounded border uppercase tracking-wide ${temp.borderClass} ${temp.textClass}`}>
          {temp.label}
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
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Metrics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricBox
              label="Total Revenue"
              value={`${fmtMoney(customer.totalRevenue)} €`}
            />
            <MetricBox
              label="Proposals"
              value={String(customer.proposalCount)}
              sub={`${customer.exportedCount} exported`}
            />
            <MetricBox
              label="Conversion Rate"
              value={`${convRate}%`}
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
            <div className="divide-y divide-gray-100">
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
            <div className="divide-y divide-gray-100">
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

        {/* AI Intelligence placeholder */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">AI Intelligence</h3>
          <PlaceholderSection
            title="AI Analysis"
            message="AI analysis will appear here in the next iteration."
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
        <span className={`text-xs font-medium px-2 py-0.5 rounded border shrink-0 whitespace-nowrap ${temp.borderClass} ${temp.textClass}`}>
          {temp.label}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1 text-gray-400">
            <TrendingUp className="w-3 h-3" />
            <span>Revenue</span>
          </div>
          <span className="font-semibold text-gray-700">{fmtMoney(customer.totalRevenue)} €</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1 text-gray-400">
            <FileText className="w-3 h-3" />
            <span>Proposals</span>
          </div>
          <span className="font-semibold text-gray-700">{customer.proposalCount}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1 text-gray-400">
            <CheckCircle className="w-3 h-3" />
            <span>Exported</span>
          </div>
          <span className="font-semibold text-gray-700">{customer.exportedCount}</span>
        </div>
      </div>

      <div className="mt-3 text-xs text-gray-400">
        Last proposal: {fmtDate(customer.lastProposalDate)}
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
          <p className="text-sm text-gray-500 mt-0.5">Customer intelligence and commercial relationships</p>
        </div>
        {!loading && (
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-kozegho-green">Hot</span>
            <span className="text-gray-600">{stats.hot}</span>
            <span className="text-gray-300">·</span>
            <span className="font-medium text-gray-500">Warm</span>
            <span className="text-gray-600">{stats.warm}</span>
            <span className="text-gray-300">·</span>
            <span className="text-gray-400">Cold</span>
            <span className="text-gray-600">{stats.cold}</span>
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
          placeholder="Search by name or company..."
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#7AB648] focus:border-transparent placeholder:text-gray-400"
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
        <div className="text-center py-16 text-gray-400">
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
