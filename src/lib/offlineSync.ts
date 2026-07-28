import { get, set } from 'idb-keyval'

export type OfflineMutation = {
  id: string
  actionType: 'CREATE_TRANSACTION' | 'UPDATE_TRANSACTION' | 'DELETE_TRANSACTION' | 'CREATE_CATEGORY' | 'UPDATE_CATEGORY' | 'DELETE_CATEGORY'
  payload: any
  timestamp: number
}

const QUEUE_KEY = 'simplificae_offline_mutations'

export async function enqueueMutation(mutation: Omit<OfflineMutation, 'id' | 'timestamp'>) {
  const queue = await getPendingMutations()
  
  const newMutation: OfflineMutation = {
    ...mutation,
    id: crypto.randomUUID(),
    timestamp: Date.now()
  }

  queue.push(newMutation)
  await set(QUEUE_KEY, queue)
  
  // Dispatch an event so the SyncProvider knows the queue was updated
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('offline-mutation-added'))
  }
  
  return newMutation
}

export async function getPendingMutations(): Promise<OfflineMutation[]> {
  try {
    const queue = await get(QUEUE_KEY)
    return Array.isArray(queue) ? queue : []
  } catch (err) {
    return []
  }
}

export async function removeMutation(id: string) {
  const queue = await getPendingMutations()
  const newQueue = queue.filter(m => m.id !== id)
  await set(QUEUE_KEY, newQueue)
}

export async function clearQueue() {
  await set(QUEUE_KEY, [])
}
