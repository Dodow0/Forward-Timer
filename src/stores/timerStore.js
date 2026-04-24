/**
 * stores/timerStore.js
 * 新增：倒计时模式（countdown）支持
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { addRecord } from '@/db'
import { today } from '@/utils/dateHelpers'
import {initNotificationSW, startTimerNotification, updateTimerNotification, stopTimerNotification } from '@/utils/notificationManager'

// 模块加载时就初始化 SW（不需要用户操作）
initNotificationSW()

const STORAGE_KEY = 'timer_persist'

function saveState(startTimestamp, elapsed, category, mode, targetDuration) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      startTimestamp,
      elapsed,
      category,
      mode,                // 新增：保存模式
      targetDuration,      // 新增：保存目标时长
      savedAt: Date.now()
    }))
  } catch (e) {
    console.warn('timer persist save failed', e)
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch (e) {
    return null
  }
}

function clearState() {
  localStorage.removeItem(STORAGE_KEY)
}

function splitByMidnight(startTime, duration) {
  const segments = []
  let remaining  = duration          // 还剩多少秒需要分配
  let segStart   = startTime         // 当前段的开始时间戳（毫秒）

  while (remaining > 0) {
    const startDate  = new Date(segStart)

    // 计算当前段所在日期的零点时间戳
    // 用 setHours(0,0,0,0) 可以安全地处理夏令时问题，不用手动算 86400000
    const nextMidnight = new Date(startDate)
    nextMidnight.setDate(nextMidnight.getDate() + 1)
    nextMidnight.setHours(0, 0, 0, 0)

    // 从当前开始时间到下一个零点还有多少秒
    const secondsUntilMidnight = Math.floor((nextMidnight - segStart) / 1000)

    // 当前段的时长：取"剩余时长"和"距零点时长"的较小值
    // 如果剩余时长在零点之前就结束了，就不需要切割
    const segDuration = Math.min(remaining, secondsUntilMidnight)

    // 构造日期字符串，使用本地时区（不能用 toISOString，那是 UTC）
    const y = startDate.getFullYear()
    const m = String(startDate.getMonth() + 1).padStart(2, '0')
    const d = String(startDate.getDate()).padStart(2, '0')

    segments.push({
      date:      `${y}-${m}-${d}`,
      startTime: segStart,
      duration:  segDuration
    })

    // 移动到下一段的起点
    segStart  = nextMidnight.getTime()
    remaining -= segDuration
  }

  return segments
}

export const useTimerStore = defineStore('timer', () => {
  // ── State ──
  const isRunning        = ref(false)
  const elapsed          = ref(0)
  const selectedCategory = ref(null)
  const startTimestamp   = ref(null)

  // ── 新增 State：倒计时相关 ──
  // mode: 'countup'（正向）| 'countdown'（倒计时）
  const mode            = ref('countup')
  // 目标秒数，仅 countdown 模式使用
  const targetDuration  = ref(25 * 60)
  // 倒计时是否已完成
  const isFinished      = ref(false)

  let _rafId      = null
  let _intervalId = null

  // ── 核心校准函数（兼容两种模式）──
  function syncElapsed() {
    if (isRunning.value && startTimestamp.value !== null) {
      const raw = Math.floor((Date.now() - startTimestamp.value) / 1000)
      elapsed.value = raw

      // 倒计时到达终点时自动触发完成
      if (mode.value === 'countdown' && raw >= targetDuration.value) {
        elapsed.value = targetDuration.value  // 锁定到终点值，不超出
        _onCountdownFinish()
      }
    }
  }

  // ── 新增：倒计时完成处理 ──
  async function _onCountdownFinish() {
    _stopRaf()
    _stopInterval()
    isRunning.value  = false
    isFinished.value = true

    // 播放提示音（使用 Web Audio API，不需要额外音频文件）
    _playBeep()

    // 自动保存记录
    if (selectedCategory.value) {
      const segments = splitByMidnight(startTimestamp.value, targetDuration.value)
      for (const seg of segments) {
        await addRecord({
          categoryId: selectedCategory.value.id,
          date:       seg.date,
          startTime:  seg.startTime,
          duration:   seg.duration
        })
      }
    }

    stopTimerNotification()
    clearState()
  }

  // ── 新增：用 Web Audio API 生成提示音（不需要音频文件）──
  function _playBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      
      // 连续播放三声，音调递减，有节奏感
      const beeps = [
        { freq: 880, start: 0,   duration: 0.15 },
        { freq: 880, start: 0.2, duration: 0.15 },
        { freq: 660, start: 0.4, duration: 0.3  },
      ]

      beeps.forEach(({ freq, start, duration }) => {
        const osc   = ctx.createOscillator()
        const gain  = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = freq
        osc.type = 'sine'
        gain.gain.setValueAtTime(0.4, ctx.currentTime + start)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration)
        osc.start(ctx.currentTime + start)
        osc.stop(ctx.currentTime + start + duration + 0.05)
      })
    } catch (e) {
      console.warn('beep failed', e)
    }
  }

  function _startRaf() {
    function tick() {
      syncElapsed()
      // 倒计时完成后 rAF 已在 _onCountdownFinish 里停掉，这里不再递归
      if (isRunning.value) {
        _rafId = requestAnimationFrame(tick)
      }
    }
    _rafId = requestAnimationFrame(tick)
  }

  function _stopRaf() {
    if (_rafId !== null) {
      cancelAnimationFrame(_rafId)
      _rafId = null
    }
  }

  function _startInterval() {
    _intervalId = setInterval(() => {
      syncElapsed()
      if (isRunning.value && startTimestamp.value !== null) {
        saveState(
          startTimestamp.value,
          elapsed.value,
          selectedCategory.value,
          mode.value,           // 新增
          targetDuration.value  // 新增
        )
              if (selectedCategory.value) {
        updateTimerNotification(
          displayTime.value,
          selectedCategory.value.name
        )
      }
      }
    }, 1000)
  }

  function _stopInterval() {
    if (_intervalId !== null) {
      clearInterval(_intervalId)
      _intervalId = null
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && isRunning.value) {
      syncElapsed()
      _stopRaf()
      _startRaf()
    }
  })

  // ── 恢复持久化状态（新增 mode/targetDuration 字段恢复）──
  function tryRestore() {
    const saved = loadState()
    if (!saved) return

    const { startTimestamp: savedTs, category, savedAt, mode: savedMode, targetDuration: savedTarget } = saved

    const MAX_DURATION = 24 * 60 * 60 * 1000
    const age = Date.now() - savedTs
    if (!category || !savedTs || savedAt > Date.now() || age > MAX_DURATION) {
      clearState()
      return
    }

    // 新增：恢复模式和目标时长
    mode.value           = savedMode || 'countup'
    targetDuration.value = savedTarget || 25 * 60

    // 倒计时模式：检查恢复时是否已超出目标时长
    if (mode.value === 'countdown') {
      const restoredElapsed = Math.floor(age / 1000)
      if (restoredElapsed >= targetDuration.value) {
        // 后台已经超时，直接触发完成
        elapsed.value          = targetDuration.value
        selectedCategory.value = category
        startTimestamp.value   = savedTs
        _onCountdownFinish()
        return
      }
    }

    selectedCategory.value = category
    startTimestamp.value   = savedTs
    elapsed.value          = Math.floor(age / 1000)
    isRunning.value        = true

    _startRaf()
    _startInterval()
  }

  tryRestore()

  // ── Getters ──

  // 正向：显示已过时间；倒计时：显示剩余时间
  const displayTime = computed(() => {
    let s
    if (mode.value === 'countdown') {
      s = Math.max(0, targetDuration.value - elapsed.value)
    } else {
      s = elapsed.value
    }
    const mm = String(Math.floor(s / 60)).padStart(2, '0')
    const ss = String(s % 60).padStart(2, '0')
    return `${mm}:${ss}`
  })

  // 新增：倒计时进度（0~1），供进度条组件使用
  const countdownProgress = computed(() => {
    if (mode.value !== 'countdown' || targetDuration.value === 0) return 0
    return Math.min(elapsed.value / targetDuration.value, 1)
  })

  // ── Actions ──

  // 新增：切换模式（未计时时才允许切换）
  function setMode(newMode) {
    if (isRunning.value) return
    mode.value = newMode
    isFinished.value = false
    elapsed.value = 0
  }

  // 新增：设置倒计时目标时长（秒）
  function setTargetDuration(seconds) {
    if (isRunning.value) return
    targetDuration.value = seconds
    isFinished.value = false
    elapsed.value = 0
  }

  // 新增：关闭完成状态（让用户手动确认后重置）
  function dismissFinished() {
    isFinished.value      = false
    elapsed.value         = 0
    selectedCategory.value = null
    startTimestamp.value  = null
  }

  function start(category) {
    if (isRunning.value) return
    isFinished.value       = false
    selectedCategory.value = category
    startTimestamp.value   = Date.now()
    isRunning.value        = true

    saveState(startTimestamp.value, 0, category, mode.value, targetDuration.value)

    _startRaf()
    _startInterval()
    startTimerNotification(displayTime.value, category.name)
  }

  function pause() {
    if (!isRunning.value) return
    syncElapsed()
    _stopRaf()
    _stopInterval()
    isRunning.value = false
    clearState()
  }

  function resume() {
    if (isRunning.value || !selectedCategory.value) return
    startTimestamp.value = Date.now() - elapsed.value * 1000
    isRunning.value      = true

    saveState(startTimestamp.value, elapsed.value, selectedCategory.value, mode.value, targetDuration.value)

    _startRaf()
    _startInterval()
  }

  async function stop() {
    if (!selectedCategory.value) return
    syncElapsed()
    _stopRaf()
    _stopInterval()
    isRunning.value = false
    clearState()

    const actualDuration = elapsed.value

    if (actualDuration > 5) {
    const segments = splitByMidnight(startTimestamp.value, actualDuration)
    for (const seg of segments) {
      await addRecord({
        categoryId: selectedCategory.value.id,
        date:       seg.date,
        startTime:  seg.startTime,
        duration:   seg.duration
      })
    }
    }

    stopTimerNotification()
    elapsed.value          = 0
    selectedCategory.value = null
    startTimestamp.value   = null
    isFinished.value       = false
  }

  return {
    // State
    isRunning, elapsed, selectedCategory,
    mode, targetDuration, isFinished,
    // Getters
    displayTime, countdownProgress,
    // Actions
    start, pause, resume, stop,
    setMode, setTargetDuration, dismissFinished
  }
})