const LIFEUP_SYNC_STORAGE_KEY = 'lifeup_sync_enabled'
const LIFEUP_ADD_POMODORO_URI = 'lifeup://api/add_pomodoro'
const LIFEUP_MIN_DURATION_MS = 30000

export function getLifeUpSyncEnabled() {
  if (typeof window === 'undefined') return false

  try {
    return localStorage.getItem(LIFEUP_SYNC_STORAGE_KEY) === 'true'
  } catch (error) {
    console.warn('lifeup sync preference read failed', error)
    return false
  }
}

export function setLifeUpSyncEnabled(enabled) {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(LIFEUP_SYNC_STORAGE_KEY, String(Boolean(enabled)))
  } catch (error) {
    console.warn('lifeup sync preference save failed', error)
  }
}

export function shouldSyncLifeUpDuration(durationSeconds) {
  return Number(durationSeconds) * 1000 >= LIFEUP_MIN_DURATION_MS
}

export function buildLifeUpPomodoroUrl({
  taskName,
  startTimeMs,
  endTimeMs,
  durationMs,
  rewardTomatoes = false
}) {
  const params = new URLSearchParams()

  if (taskName) {
    params.set('task_name', taskName)
  }

  if (Number.isFinite(startTimeMs)) {
    params.set('start_time', String(Math.round(startTimeMs)))
  }

  if (Number.isFinite(endTimeMs)) {
    params.set('end_time', String(Math.round(endTimeMs)))
  }

  if (Number.isFinite(durationMs)) {
    params.set('duration', String(Math.round(durationMs)))
  }

  if (rewardTomatoes) {
    params.set('reward_tomatoes', 'true')
  }

  return `${LIFEUP_ADD_POMODORO_URI}?${params.toString()}`
}

export function syncPomodoroToLifeUp({
  taskName,
  startTimeMs,
  durationSeconds,
  rewardTomatoes = true
}) {
  if (!getLifeUpSyncEnabled()) {
    return { triggered: false, reason: 'disabled' }
  }

  const durationMs = Math.round(Number(durationSeconds) * 1000)
  if (!Number.isFinite(durationMs) || durationMs < LIFEUP_MIN_DURATION_MS) {
    return { triggered: false, reason: 'duration_too_short' }
  }

  const safeStartTime = Number.isFinite(startTimeMs) ? Math.round(startTimeMs) : undefined
  const safeEndTime = Number.isFinite(safeStartTime) ? safeStartTime + durationMs : undefined
  const url = buildLifeUpPomodoroUrl({
    taskName,
    startTimeMs: safeStartTime,
    endTimeMs: safeEndTime,
    durationMs,
    rewardTomatoes
  })

  const triggered = launchLifeUpUrl(url)
  return { triggered, reason: triggered ? 'triggered' : 'launch_failed', url }
}

function launchLifeUpUrl(url) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false

  try {
    const link = document.createElement('a')
    link.href = url
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    link.remove()
    return true
  } catch (error) {
    console.warn('lifeup launch failed', error)
    return false
  }
}

export { LIFEUP_MIN_DURATION_MS, LIFEUP_SYNC_STORAGE_KEY }
