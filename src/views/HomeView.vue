<template>
  <div class="home-view">
    <header class="page-header">
      <div class="header-content">
        <p class="eyebrow">{{ today }}</p>
        <h1 class="display-title">专注计时</h1>
      </div>
    </header>

    <section class="timer-section">
      <div class="segmented-control" v-if="!timerStore.isRunning && timerStore.elapsed === 0">
        <button class="segment-btn" :class="{ 'segment-btn--active': currentMode === 'forward' }" @click="currentMode = 'forward'">正向计时</button>
        <button class="segment-btn" :class="{ 'segment-btn--active': currentMode === 'countdown' }" @click="currentMode = 'countdown'">倒计时</button>
      </div>

      <div class="timer-ring" :class="{ 
  'timer-ring--running': timerStore.isRunning,
  'timer-ring--svg': currentMode === 'countdown'
}">
        <!-- 倒计时进度环 SVG -->
        <svg v-if="currentMode === 'countdown'" class="progress-svg" viewBox="0 0 210 210">
          <!-- 灰色底轨 -->
          <circle cx="105" cy="105" r="101"
                  fill="none" stroke="var(--color-border)" stroke-width="4" />
          <!-- 蓝色进度，从顶部开始顺时针消耗 -->
          <circle cx="105" cy="105" r="101"
                  fill="none" stroke="var(--color-primary)" stroke-width="4"
                  stroke-linecap="round"
                  :stroke-dasharray="634"
                  :stroke-dashoffset="634 * timerStore.countdownProgress"
                  transform="rotate(-90 105 105)"
                  style="transition: stroke-dashoffset 0.5s linear;" />
        </svg>
        <div class="timer-display">
          <span class="time-text">{{ (timerStore.isRunning || timerStore.isFinished) ? timerStore.displayTime : defaultDisplayTime }}</span>
          
          <span class="category-badge" v-if="timerStore.selectedCategory" :style="{ background: timerStore.selectedCategory.color + '18' }">
            <span class="dot" :style="{ background: timerStore.selectedCategory.color }"></span>
            <span :style="{ color: timerStore.selectedCategory.color }">{{ timerStore.selectedCategory.name }}</span>
          </span>
          <span class="category-badge category-badge--empty" v-else>待选择任务</span>
        </div>
      </div>

      <div class="presets-panel" v-if="!timerStore.isRunning && timerStore.elapsed === 0 && currentMode === 'countdown'">
        <button v-for="mins in [25, 45, 60]" :key="mins" 
                class="preset-btn" :class="{ 'preset-btn--active': targetMinutes === mins }"
                @click="targetMinutes = mins">{{ mins }} 分</button>
        <input type="number" class="preset-input" v-model.number="targetMinutes" placeholder="自定义" min="1" max="999"/>
      </div>

      <div class="controls">
        <button v-if="!timerStore.isRunning && timerStore.elapsed === 0" 
                class="btn btn--primary" 
                :disabled="!timerStore.selectedCategory || (currentMode === 'countdown' && (!targetMinutes || targetMinutes <= 0))" 
                @click="startTimer">
          开始专注
        </button>

        <template v-else>
          <button class="btn btn--outline" @click="handlePauseResume">
            {{ timerStore.isRunning ? '暂停' : '继续' }}
          </button>
          <button class="btn btn--primary" @click="timerStore.stop()">保存记录</button>
        </template>
      </div>
            <!-- 倒计时完成弹窗 -->
      <transition name="fade">
        <div v-if="timerStore.isFinished" class="finish-overlay">
          <div class="finish-card">
            <div class="finish-icon">🎉</div>
            <p class="finish-title">专注完成！</p>
            <p class="finish-sub">{{ targetMinutes }} 分钟已自动保存</p>
            <button class="btn btn--primary" style="max-width:180px; height: 58px; font-size: 16px; border-radius: 12px;" @click="handleFinishDismiss">好的</button>
          </div>
        </div>
      </transition>
    </section>

    <section class="category-section">
      <h2 class="section-label">选择分类</h2>
      <div class="category-grid">
        <button v-for="cat in categoryStore.categories" :key="cat.id" 
                class="category-card" 
                :class="{ 'category-card--selected': timerStore.selectedCategory?.id === cat.id }" 
                :disabled="timerStore.isRunning" 
                @click="selectCategory(cat)">
          <div class="cat-indicator" :style="{ background: cat.color }"></div>
          <span class="cat-name">{{ cat.name }}</span>
        </button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted  } from 'vue'
import { useTimerStore } from '@/stores/timerStore'
import { useCategoryStore } from '@/stores/categoryStore'

const timerStore    = useTimerStore()
const categoryStore = useCategoryStore()

const today = computed(() =>
  new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })
)

// UI 选择状态
const currentMode   = ref('forward') // 'forward' 或 'countdown'
const targetMinutes = ref(25)        // 默认 25 分钟

// 计算未启动时圆环展示的时间
const defaultDisplayTime = computed(() => {
  if (currentMode.value === 'countdown') {
    const mm = String(targetMinutes.value || 0).padStart(2, '0')
    return `${mm}:00`
  }
  return '00:00'
})

function selectCategory(cat) {
  if (timerStore.isRunning) return
  timerStore.selectedCategory = cat
}

function startTimer() {
  // 先把模式和时长同步到 store，再调用 start
  timerStore.setMode(currentMode.value === 'forward' ? 'countup' : 'countdown')
  if (currentMode.value === 'countdown') {
    timerStore.setTargetDuration(targetMinutes.value * 60)
  }
  timerStore.start(timerStore.selectedCategory)
}

function handlePauseResume() {
  timerStore.isRunning ? timerStore.pause() : timerStore.resume()
}
// 完成后重置本地 UI 状态
function handleFinishDismiss() {
  timerStore.dismissFinished()
}

// 页面挂载时：如果 store 已经从 localStorage 恢复了倒计时，同步本地 UI 状态
onMounted(() => {
  if (timerStore.mode === 'countdown') {
    currentMode.value   = 'countdown'
    targetMinutes.value = Math.round(timerStore.targetDuration / 60)
  }
})
</script>

<style scoped>
.home-view { min-height: 100%; background: var(--color-bg); }

.page-header {
  padding: 32px 20px 16px;
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
}

.eyebrow { font-size: 12px; font-weight: 600; color: var(--color-fg-muted); letter-spacing: 0.05em; margin-bottom: 4px; }
.display-title { font-size: 28px; font-weight: 800; color: var(--color-fg); line-height: 1.1; }

.timer-section {
  display: flex; flex-direction: column; align-items: center; gap: 32px; padding: 32px 20px; background: var(--color-bg);
}

/* 复用 StatsView 的分段控制器样式 */
.segmented-control {
  display: inline-flex; background: var(--color-muted); padding: 4px; border-radius: 8px; width: 100%; max-width: 210px;
}
.segment-btn {
  flex: 1; padding: 8px 0; border-radius: 6px; border: none; background: transparent; 
  font-size: 13px; font-weight: 600; color: var(--color-fg-muted); cursor: pointer; transition: all 0.2s;
}
.segment-btn--active { background: var(--color-bg); color: var(--color-fg); box-shadow: 0 1px 3px rgba(0,0,0,0.08); }

.timer-ring {
  width: 210px; height: 210px; border-radius: 50%; 
  border: 4px solid var(--color-fg); 
  display: flex; align-items: center; justify-content: center; transition: all 0.3s ease;flex-shrink: 0;
}
.timer-ring--running { border-color: var(--color-accent); }

.timer-display { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.time-text { font-size: 56px; color: var(--color-fg); font-weight: 700; font-variant-numeric: tabular-nums;letter-spacing: 4px; 
  /* 稍微补偿一下因为字间距向右偏移的视觉中心 */
  margin-left: 4px; }

.category-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 700; }
.category-badge .dot { width: 6px; height: 6px; border-radius: 50%; }
.category-badge--empty { background: var(--color-muted); color: var(--color-fg-muted); }

/* 预设时长选择区 */
.presets-panel {
  display: flex; gap: 8px; width: 100%; max-width: 300px;
}
.preset-btn {
  flex: 1; height: 40px; background: var(--color-muted); border: 1.5px solid transparent; border-radius: var(--radius-md);
  font-size: 14px; font-weight: 600; color: var(--color-fg-muted); cursor: pointer; transition: all 0.2s;
}
.preset-btn--active { background: var(--color-bg); border-color: var(--color-primary); color: var(--color-fg); }
.preset-input {
  width: 70px; height: 40px; background: var(--color-muted); border: 1.5px solid transparent; border-radius: var(--radius-md);
  text-align: center; font-size: 14px; font-weight: 600; color: var(--color-fg); transition: all 0.2s; outline: none;
}
.preset-input:focus { border-color: var(--color-primary); background: var(--color-bg); }

.controls { display: flex; gap: 16px; width: 100%; max-width: 300px; }

.btn { 
  flex: 1; 
  height: 52px; 
  
  /* 补充左右安全距离，防止按钮不拉伸时挤压文字 */
  padding: 0 32px; 
  /* 强制文字不换行 */
  white-space: nowrap; 
  /* 使用 flex 保证文字在按钮内部绝对居中 */
  display: inline-flex;
  align-items: center;
  justify-content: center;

  border-radius: var(--radius-md); 
  border: none; 
  font-size: 15px; 
  font-weight: 700; 
  cursor: pointer; 
  transition: all 0.2s; 
}
.btn:active { transform: scale(0.96); }
.btn:disabled { opacity: 0.3; cursor: not-allowed; }

.btn--primary { background: var(--color-primary); color: var(--color-bg); }
.btn--outline { background: transparent; color: var(--color-fg); border: 2px solid var(--color-border); }

.category-section { padding: 32px 20px; background: var(--color-muted); min-height: calc(100vh - 400px); }
.section-label { font-size: 12px; font-weight: 700; color: var(--color-fg-muted); margin-bottom: 16px; text-transform: uppercase; }
.category-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.category-card {
  display: flex; flex-direction: column; align-items: flex-start; gap: 8px; padding: 16px 12px; border-radius: var(--radius-md); border: 1px solid var(--color-border); background: var(--color-bg); cursor: pointer; transition: all 0.2s;
}
.category-card--selected { border-color: var(--color-primary); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.category-card:disabled { opacity: 0.5; cursor: not-allowed; }
.cat-indicator { width: 14px; height: 4px; border-radius: 2px; }
.cat-name { font-size: 13px; font-weight: 700; color: var(--color-fg); }

/* 进度 SVG 覆盖在圆环上 */
.timer-ring { position: relative; }
.progress-svg {
  position: absolute; top: -4px; left: -4px;
  width: calc(100% + 8px); height: calc(100% + 8px);
  pointer-events: none;
}

/* 完成弹窗 */
.finish-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.45);
  display: flex; align-items: center; justify-content: center;
  z-index: 100;
}
.finish-card {
  background: var(--color-bg); border-radius: 20px;
  padding: 40px 32px; display: flex; flex-direction: column;
  align-items: center; gap: 12px; width: 280px; text-align: center;
}
.finish-icon { font-size: 48px; }
.finish-title { font-size: 22px; font-weight: 800; color: var(--color-fg); }
.finish-sub { font-size: 14px; color: var(--color-fg-muted); }

/* 弹窗淡入淡出动画 */
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* 倒计时模式下由 SVG 接管圆环，隐藏 CSS border 避免双重叠加 */
.timer-ring--svg {
  border-color: transparent;
}
</style>