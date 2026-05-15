import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Task, TaskPriority, TaskStatus } from '@/types/database'

type AddPayload = {
  title: string
  priority: TaskPriority
  due_date: string | null
}

export function useTasks(customerId: string) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('tasks')
      .select('*')
      .eq('customer_id', customerId)
      .order('due_date', { ascending: true, nullsFirst: false })
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err) { setError(err.message) } else { setError(null); setTasks((data ?? []) as Task[]) }
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [customerId, refreshKey])

  const addTask = useCallback(async (payload: AddPayload): Promise<{ error: string | null }> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated.' }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: err } = await (supabase.from('tasks') as any)
      .insert({
        customer_id: customerId,
        created_by: user.id,
        assigned_to: user.id,
        title: payload.title,
        priority: payload.priority,
        due_date: payload.due_date || null,
        source: 'manual',
      })
    if (err) return { error: (err as { message: string }).message }
    setRefreshKey(k => k + 1)
    return { error: null }
  }, [customerId])

  const updateTaskStatus = useCallback(async (taskId: string, status: TaskStatus): Promise<{ error: string | null }> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: err } = await (supabase.from('tasks') as any)
      .update({ status })
      .eq('id', taskId)
    if (err) return { error: (err as { message: string }).message }
    setRefreshKey(k => k + 1)
    return { error: null }
  }, [])

  return { tasks, loading, error, addTask, updateTaskStatus }
}
