import { ref } from 'vue'

const UNSYNCED_STORAGE_KEY = 'sync_has_unsynced_changes'

function readPersistedUnsyncedState() {
  if (typeof window === 'undefined') return false

  try {
    return localStorage.getItem(UNSYNCED_STORAGE_KEY) === '1'
  } catch (error) {
    console.warn('read unsynced state failed', error)
    return false
  }
}

function persistUnsyncedState(value) {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(UNSYNCED_STORAGE_KEY, value ? '1' : '0')
  } catch (error) {
    console.warn('persist unsynced state failed', error)
  }
}

export const hasUnsyncedChanges = ref(readPersistedUnsyncedState())

let trackingPauseDepth = 0

export function markUnsynced() {
  if (trackingPauseDepth > 0) return
  hasUnsyncedChanges.value = true
  persistUnsyncedState(true)
}

export function markSynced() {
  hasUnsyncedChanges.value = false
  persistUnsyncedState(false)
}

export async function runWithUnsyncedTrackingPaused(task) {
  trackingPauseDepth += 1

  try {
    return await task()
  } finally {
    trackingPauseDepth = Math.max(0, trackingPauseDepth - 1)
  }
}
