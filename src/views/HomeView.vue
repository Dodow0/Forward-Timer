<template>
  <div
    class="home-view"
    :class="[
      { 'is-focusing': timerStore.isRunning || timerStore.elapsed > 0 },
      isDarkTheme ? 'focus-theme-dark' : 'focus-theme-light'
    ]"
  >
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
          <span class="time-text">{{(timerStore.isRunning || timerStore.elapsed > 0 || timerStore.isFinished) ? timerStore.displayTime : defaultDisplayTime }}</span>
          
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

      <!-- 画中画按钮：只在计时进行中才显示 -->
      <PiPTimer ref="pipTimerRef" />
      <button
        v-if="timerStore.isRunning|| timerStore.elapsed > 0"
        class="btn-pip"
        @click="togglePiP"
        :title="pipOpen ? '关闭浮窗' : '开启浮窗'"
        :class="{ 'btn-pip--active': pipOpen }"
      >
        <X v-if="pipOpen" :size="16" :stroke-width="2.5" />
        <PictureInPicture2 v-else :size="16" :stroke-width="2.5" />
        
        <span>{{ pipOpen ? '关闭浮窗' : '迷你浮窗' }}</span>
      </button>

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
            <div class="finish-icon"><PartyPopper :size="48" :stroke-width="1.5" color="var(--color-primary)" /></div>
            <p class="finish-title">专注完成！</p>
            <p class="finish-sub">{{ targetMinutes }} 分钟已自动保存</p>
            <button class="btn btn--primary" style="max-width:180px; height: 58px; font-size: 16px; border-radius: 12px;" @click="handleFinishDismiss">好的</button>
          </div>
        </div>
      </transition>
    </section>
    <section class="category-section">
      <h2 class="section-label">选择分类</h2>

      <div class="parent-grid">
        <div v-for="parent in categoryStore.parentCategories" :key="parent.id"
            class="parent-card"
            :class="{
              'parent-card--active': selectedParent?.id === parent.id,
              'parent-card--selected': timerStore.selectedCategory?.id === parent.id
            }"
            :style="timerStore.selectedCategory?.id === parent.id ? { borderColor: parent.color } : {}"
            @click="selectAsCategory(parent)">

          <div class="card-header">
            <div class="cat-indicator" :style="{ background: parent.color }"></div>

            <button v-if="categoryStore.getChildren(parent.id).length > 0"
                    class="btn-expand"
                    @click.stop="selectParent(parent)">
            <ChevronRight 
                class="expand-arrow" 
                :class="{ 'is-expanded': selectedParent?.id === parent.id }" 
                :size="16" 
                :stroke-width="2" 
              />
            </button>

            <span class="cat-name">{{ parent.name }}</span>
          </div>

        </div>
      </div>

      <!-- 选中大类后展开小类 -->
      <template v-if="selectedParent">
        <div class="children-label">
          <span class="section-label" style="margin-bottom:0">{{ selectedParent.name }} 的细分</span>
        </div>
        <div class="category-grid" style="margin-top: 10px;">
          <button v-for="child in categoryStore.getChildren(selectedParent.id)" :key="child.id"
                  class="category-card"
                  :class="{ 'category-card--selected': timerStore.selectedCategory?.id === child.id }"
                  :disabled="timerStore.isRunning"
                  @click="selectCategory(child)">
            <div class="cat-indicator" :style="{ background: child.color }"></div>
            <span class="cat-name">{{ child.name }}</span>
          </button>
        </div>

        <!-- 如果该大类没有小类，提示去添加 -->
        <p v-if="categoryStore.getChildren(selectedParent.id).length === 0" 
          class="no-children-hint">该大类下暂无小类，请前往分类页添加</p>
      </template>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useTimerStore } from '@/stores/timerStore'
import { useCategoryStore } from '@/stores/categoryStore'
import PiPTimer from '@/components/PiPTimer.vue'
import { ChevronRight, PictureInPicture2, PartyPopper, X } from 'lucide-vue-next'

const pipTimerRef = ref(null)
const pipOpen = computed(() => pipTimerRef.value?.isOpen ?? false)
const timerStore    = useTimerStore()
const categoryStore = useCategoryStore()
const isDarkTheme = ref(
  typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
)

let themeObserver = null

const today = computed(() =>
  new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })
)

// UI 选择状态
const currentMode   = ref('forward') // 'forward' 或 'countdown'
const targetMinutes = ref(25)        // 默认 25 分钟
const selectedParent = ref(null)   // 当前选中的大类

function togglePiP() {
  if (pipOpen.value) {
    pipTimerRef.value.closePiP()
  } else {
    pipTimerRef.value.openPiP()
  }
}

function selectParent(parent) {
  if (timerStore.isRunning) return
  if (selectedParent.value?.id !== parent.id) {
    timerStore.selectedCategory = null
    selectedParent.value = parent
  } else {
    // 再次点击同一个大类：收起展开并取消选中
    selectedParent.value = null
    timerStore.selectedCategory = null
  }
}

function selectCategory(cat) {
  if (timerStore.isRunning) return
  // 点击已选中的小类 → 退回到选大类（直接用大类计时）
  if (timerStore.selectedCategory?.id === cat.id) {
    timerStore.selectedCategory = selectedParent.value
  } else {
    timerStore.selectedCategory = cat
  }
}

// 点大类卡片主体 → 直接选为计时分类
function selectAsCategory(parent) {
  if (timerStore.isRunning) return
  timerStore.selectedCategory = timerStore.selectedCategory?.id === parent.id ? null : parent
}

// 计算未启动时圆环展示的时间
const defaultDisplayTime = computed(() => {
  if (currentMode.value === 'countdown') {
    const mm = String(targetMinutes.value || 0).padStart(2, '0')
    return `${mm}:00`
  }
  return '00:00'
})

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
  const syncTheme = () => {
    isDarkTheme.value = document.documentElement.classList.contains('dark')
  }

  syncTheme()

  themeObserver = new MutationObserver(syncTheme)
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  })

  if (timerStore.mode === 'countdown') {
    currentMode.value   = 'countdown'
    targetMinutes.value = Math.round(timerStore.targetDuration / 60)
  }
})

onBeforeUnmount(() => {
  themeObserver?.disconnect()
  themeObserver = null
})
</script>

<style scoped>
.home-view,
.focus-theme-light.home-view {
  min-height: 100%;
  background: var(--color-bg);
  transition: background 0.8s ease;
  --focus-bg: #f9f9f9;
  --focus-fg: #1d1d1f;
  --focus-ring: rgba(29, 29, 31, 0.86);
  --focus-ring-muted: rgba(29, 29, 31, 0.08);
  --focus-muted: rgba(29, 29, 31, 0.38);
  --focus-dot: rgba(29, 29, 31, 0.26);
  --focus-control-bg: rgba(29, 29, 31, 0.04);
  --focus-control-border: rgba(29, 29, 31, 0.12);
  --focus-control-fg: rgba(29, 29, 31, 0.76);
  --focus-primary-bg: #1d1d1f;
  --focus-primary-fg: #ffffff;
  --focus-outline-border: rgba(29, 29, 31, 0.22);
  --focus-pip-bg: rgba(29, 29, 31, 0.03);
  --focus-pip-border: rgba(29, 29, 31, 0.08);
  --focus-pip-fg: rgba(29, 29, 31, 0.42);
  --focus-pip-active-bg: rgba(29, 29, 31, 0.08);
  --focus-pip-active-border: rgba(29, 29, 31, 0.16);
  --focus-pip-active-fg: rgba(29, 29, 31, 0.74);
}

.focus-theme-dark.home-view {
  --focus-bg: #050505;
  --focus-fg: rgba(245, 245, 245, 0.98);
  --focus-ring: rgba(245, 245, 245, 0.88);
  --focus-ring-muted: rgba(245, 245, 245, 0.12);
  --focus-muted: rgba(245, 245, 245, 0.46);
  --focus-dot: rgba(245, 245, 245, 0.32);
  --focus-control-bg: rgba(245, 245, 245, 0.07);
  --focus-control-border: rgba(245, 245, 245, 0.15);
  --focus-control-fg: rgba(245, 245, 245, 0.86);
  --focus-primary-bg: rgba(245, 245, 245, 0.9);
  --focus-primary-fg: #050505;
  --focus-outline-border: rgba(245, 245, 245, 0.25);
  --focus-pip-bg: rgba(245, 245, 245, 0.05);
  --focus-pip-border: rgba(245, 245, 245, 0.11);
  --focus-pip-fg: rgba(245, 245, 245, 0.64);
  --focus-pip-active-bg: rgba(245, 245, 245, 0.1);
  --focus-pip-active-border: rgba(245, 245, 245, 0.2);
  --focus-pip-active-fg: rgba(245, 245, 245, 0.88);
}

.page-header {
  padding: 32px 20px 16px;
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
  transition: opacity 0.8s ease;
}

.eyebrow { font-size: 12px; font-weight: 600; color: var(--color-fg-muted); letter-spacing: 0.05em; margin-bottom: 4px; }
.display-title { font-size: 28px; font-weight: 800; color: var(--color-fg); line-height: 1.1; }

.timer-section {
  display: flex; flex-direction: column; align-items: center; gap: 32px; padding: 32px 20px; background: var(--color-bg);
  transition: background 0.8s ease, min-height 0.8s ease;
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

.focus-theme-dark .segmented-control {
  background: rgba(245, 245, 245, 0.08);
  border: 1px solid rgba(245, 245, 245, 0.12);
}

.focus-theme-dark .segment-btn {
  color: rgba(245, 245, 245, 0.62);
}

.focus-theme-dark .segment-btn--active {
  background: rgba(245, 245, 245, 0.16);
  color: rgba(245, 245, 245, 0.96);
  box-shadow: none;
}

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
.btn-pip {
  display: inline-flex;
  align-items: center;
  gap: 6px; /* 图标和文字的间距 */
  padding: 8px 16px;
  background: var(--color-muted);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  color: var(--color-fg);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-pip--active {
  background: var(--color-bg);
  border-color: var(--color-primary);
  color: var(--color-primary);
}
.category-section {
  padding: 32px 20px;
  background: var(--color-muted);
  min-height: calc(100vh - 400px);
  transition: opacity 0.8s ease;
}

.is-focusing.home-view,
.is-focusing .timer-section {
  background: var(--focus-bg);
}

.is-focusing .timer-section {
  min-height: 100vh;
  justify-content: center;
}

.is-focusing .page-header,
.is-focusing .category-section,
.is-focusing .segmented-control,
.is-focusing .presets-panel {
  opacity: 0;
  pointer-events: none;
}

.is-focusing .timer-ring {
  width: min(76vw, 300px);
  height: min(76vw, 300px);
  border-width: 1.5px;
  border-color: var(--focus-ring);
  color: var(--focus-fg);
  filter: none;
  animation: none;
}

.is-focusing .timer-ring--running {
  border-color: var(--focus-ring);
}

.is-focusing .timer-ring--svg {
  border-color: transparent;
}

.is-focusing .progress-svg circle:first-child {
  stroke: var(--focus-ring-muted);
}

.is-focusing .progress-svg circle:last-child {
  stroke: var(--focus-ring);
  transition: stroke-dashoffset 1s linear !important;
}

.is-focusing .time-text {
  color: var(--focus-fg);
  font-size: clamp(68px, 18vw, 92px);
  font-weight: 600;
  letter-spacing: 0;
  line-height: 1;
  margin-left: 0;
}

.is-focusing .category-badge {
  background: transparent !important;
  color: var(--focus-muted);
  padding: 0;
}

.is-focusing .category-badge span {
  color: var(--focus-muted) !important;
}

.is-focusing .category-badge .dot {
  background: var(--focus-dot) !important;
}

.is-focusing .btn-pip,
.is-focusing .controls {
  opacity: 1;
  transition: opacity 0.3s ease;
}

.is-focusing .btn {
  background: var(--focus-control-bg);
  border: 1px solid var(--focus-control-border);
  color: var(--focus-control-fg);
}

.is-focusing .btn--primary {
  background: var(--focus-primary-bg);
  border-color: var(--focus-primary-bg);
  color: var(--focus-primary-fg);
}

.is-focusing .btn--outline {
  background: transparent;
  border-color: var(--focus-outline-border);
  color: var(--focus-control-fg);
}

.is-focusing .btn-pip {
  background: var(--focus-pip-bg);
  border-color: var(--focus-pip-border);
  color: var(--focus-pip-fg);
}

.is-focusing .btn-pip--active {
  background: var(--focus-pip-active-bg);
  border-color: var(--focus-pip-active-border);
  color: var(--focus-pip-active-fg);
}
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

.parent-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

.parent-card {
  display: flex; flex-direction: column; align-items: flex-start;
  gap: 8px; padding: 14px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  cursor: pointer; transition: all 0.2s;
}

.parent-card--active {
  border-color: var(--color-primary);
  background: var(--color-muted);
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.parent-card:disabled { opacity: 0.5; cursor: not-allowed; }

.children-label {
  display: flex; align-items: center;
  padding: 8px 0 4px;
  border-top: 1px solid var(--color-border);
  margin-top: 4px;
}

.no-children-hint {
  font-size: 12px; color: var(--color-fg-muted);
  padding: 12px 0; text-align: center;
}

.parent-card--selected {
  box-shadow: 0 0 0 2px var(--color-primary);
}
/* --- 新增大类卡片顶部布局 --- */
.card-header {
  display: flex;
  justify-content: space-between; /* 左右两端对齐 */
  align-items: center;
  width: 100%;
}

.btn-expand {
  padding: 4px;
  margin: -4px; /* 稍微外扩一点，增大点击热区，但不撑大卡片 */
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
}

.expand-arrow {
  display: inline-block;
  font-size: 11px;
  color: var(--color-fg-muted);
  transition: transform 0.2s ease;
}

/* 展开状态向下旋转 90 度 */
.expand-arrow.is-expanded {
  transform: rotate(90deg);
}

</style>
