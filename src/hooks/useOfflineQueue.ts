import { useEffect, useRef } from 'react'
import { get, set, del, keys } from 'idb-keyval'
import { supabase } from '@/lib/supabase'
import { useOnline } from './useOnline'
import type { PersistedProposal } from '@/types/proposal'

const QUEUE_PREFIX = 'kp:queue:'

export async function enqueueProposal(proposal: PersistedProposal) {
  await set(`${QUEUE_PREFIX}${proposal.id}`, proposal)
}

async function flushQueue() {
  const allKeys = await keys()
  const queueKeys = allKeys.filter((k) => String(k).startsWith(QUEUE_PREFIX))
  for (const key of queueKeys) {
    const proposal = await get<PersistedProposal>(key as string)
    if (!proposal) continue
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('proposals') as any).upsert(proposal)
    if (!error) await del(key as string)
  }
}

export function useOfflineQueue() {
  const online = useOnline()
  const flushed = useRef(false)

  useEffect(() => {
    if (online && !flushed.current) {
      flushed.current = true
      flushQueue().catch(console.error)
    }
    if (!online) flushed.current = false
  }, [online])
}
