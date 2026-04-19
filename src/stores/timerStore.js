/**
 * stores/timerStore.js — 计时器全局状态
 * 新增：持久化到 localStorage，解决手机端 PWA 被杀进程后计时消失的问题
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { addRecord } from '@/db'
import { today } from '@/utils/dateHelpers'

// ── 持久化 Key 常量 ──
const STORAGE_KEY = 'timer_persist'

// ── 持久化读写工具函数 ──
function saveState(startTimestamp, elapsed, category) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      startTimestamp,
      elapsed,
      category,
      savedAt: Date.now()   // 记录保存时刻，用于恢复时校验合理性
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

export const useTimerStore = defineStore('timer', () => {
  // ── State ──
  const isRunning        = ref(false)
  const elapsed          = ref(0)
  const selectedCategory = ref(null)
  const startTimestamp   = ref(null)

  let _rafId      = null
  let _intervalId = null

  // ── 核心校准函数 ──
  function syncElapsed() {
    if (isRunning.value && startTimestamp.value !== null) {
      elapsed.value = Math.floor((Date.now() - startTimestamp.value) / 1000)
    }
  }

  // ── rAF 循环（前台高精度更新）──
  function _startRaf() {
    function tick() {
      syncElapsed()
      _rafId = requestAnimationFrame(tick)
    }
    _rafId = requestAnimationFrame(tick)
  }

  function _stopRaf() {
    if (_rafId !== null) {
      cancelAnimationFrame(_rafId)
      _rafId = null
    }
  }

  // ── 兜底 interval（应对最小化/后台）──
  function _startInterval() {
    // 新增：同时负责定期持久化状态（每秒存一次）
    _intervalId = setInterval(() => {
      syncElapsed()
      if (isRunning.value && startTimestamp.value !== null) {
        // 每秒把最新状态写入 localStorage
        saveState(startTimestamp.value, elapsed.value, selectedCategory.value)
      }
    }, 1000)
  }

  function _stopInterval() {
    if (_intervalId !== null) {
      clearInterval(_intervalId)
      _intervalId = null
    }
  }

  // ── visibilitychange ──
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && isRunning.value) {
      syncElapsed()
      _stopRaf()
      _startRaf()
    }
  })

  // ── 新增：页面加载时恢复持久化状态（核心修复点）──
  function tryRestore() {
    const saved = loadState()
    if (!saved) return

    const { startTimestamp: savedTs, category, savedAt } = saved

    // 安全校验：
    // 1. 必须有分类信息
    // 2. 保存时刻必须合理（不能是未来时间）
    // 3. 计时时长不超过 24 小时（超过视为异常数据）
    const MAX_DURATION = 24 * 60 * 60 * 1000
    const age = Date.now() - savedTs
    if (!category || !savedTs || savedAt > Date.now() || age > MAX_DURATION) {
      clearState()
      return
    }

    // 恢复状态：基于原始 startTimestamp 重新推算已过时间
    selectedCategory.value = category
    startTimestamp.value   = savedTs
    elapsed.value          = Math.floor(age / 1000)
    isRunning.value        = true

    // 立即恢复计时循环
    _startRaf()
    _startInterval()

    console.log(`[Timer] 恢复计时，已过 ${elapsed.value} 秒`)
  }

  // Store 初始化时立即尝试恢复
  tryRestore()

  // ── Getters ──
  const displayTime = computed(() => {
    const s  = elapsed.value
    const mm = String(Math.floor(s / 60)).padStart(2, '0')
    const ss = String(s % 60).padStart(2, '0')
    return `${mm}:${ss}`
  })

  // ── Actions ──
  function start(category) {
    if (isRunning.value) return
    selectedCategory.value = category
    startTimestamp.value   = Date.now()
    isRunning.value        = true

    saveState(startTimestamp.value, 0, category)  // 新增：启动时立即持久化

    _startRaf()
    _startInterval()
  }

  function pause() {
    if (!isRunning.value) return
    syncElapsed()
    _stopRaf()
    _stopInterval()
    isRunning.value = false

    clearState()  // 新增：暂停时清除持久化（暂停状态不需要后台恢复）
  }

  function resume() {
    if (isRunning.value || !selectedCategory.value) return
    startTimestamp.value = Date.now() - elapsed.value * 1000
    isRunning.value      = true

    saveState(startTimestamp.value, elapsed.value, selectedCategory.value)  // 新增

    _startRaf()
    _startInterval()
  }

  async function stop() {
    if (!selectedCategory.value) return
    syncElapsed()
    _stopRaf()
    _stopInterval()
    isRunning.value = false

    clearState()  // 新增：停止时清除持久化

    const actualDuration = elapsed.value

    if (actualDuration > 5) {
      await addRecord({
        categoryId: selectedCategory.value.id,
        date:       today(),
        startTime:  startTimestamp.value,
        duration:   actualDuration
      })
    }

    elapsed.value          = 0
    selectedCategory.value = null
    startTimestamp.value   = null
  }

  return {
    isRunning, elapsed, selectedCategory, displayTime,
    start, pause, resume, stop
  }
})