<template>
  <div class="home-view">

    <header class="page-header">
      <div class="header-content">
        <p class="eyebrow">{{ today }}</p>
        <h1 class="display-title">专注计时</h1>
      </div>
    </header>

    <section class="timer-section">
      <div class="timer-ring" :class="{ 'timer-ring--running': timerStore.isRunning }">
        <div class="timer-display">
          <span class="time-text">{{ timerStore.displayTime }}</span>
          
          <span class="category-badge" v-if="timerStore.selectedCategory"
            :style="{ background: timerStore.selectedCategory.color + '18' }">
            <span class="dot" :style="{ background: timerStore.selectedCategory.color }"></span>
            <span :style="{ color: timerStore.selectedCategory.color }">{{ timerStore.selectedCategory.name }}</span>
          </span>
          <span class="category-badge category-badge--empty" v-else>
            待选择任务
          </span>
        </div>
      </div>

      <div class="controls">
        <button
          v-if="!timerStore.isRunning && timerStore.elapsed === 0"
          class="btn btn--primary"
          :disabled="!timerStore.selectedCategory"
          @click="timerStore.start(timerStore.selectedCategory)"
        >
          开始专注
        </button>

        <template v-else>
          <button class="btn btn--outline" @click="handlePauseResume">
            {{ timerStore.isRunning ? '暂停' : '继续' }}
          </button>
          <button class="btn btn--primary" @click="timerStore.stop()">
            保存记录
          </button>
        </template>
      </div>
    </section>

    <section class="category-section">
      <h2 class="section-label">选择分类</h2>
      <div class="category-grid">
        <button
          v-for="cat in categoryStore.categories"
          :key="cat.id"
          class="category-card"
          :class="{ 'category-card--selected': timerStore.selectedCategory?.id === cat.id }"
          :style="{
            '--cat-color': cat.color,
            '--cat-color-bg': cat.color + '18'
          }"
          :disabled="timerStore.isRunning"
          @click="selectCategory(cat)"
        >
          <div class="cat-indicator" :style="{ background: cat.color }"></div>
          <span class="cat-name">{{ cat.name }}</span>
        </button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useTimerStore } from '@/stores/timerStore'
import { useCategoryStore } from '@/stores/categoryStore'

const timerStore    = useTimerStore()
const categoryStore = useCategoryStore()

const today = computed(() =>
  new Date().toLocaleDateString('zh-CN', {
    month: 'long', day: 'numeric', weekday: 'long'
  })
)

function selectCategory(cat) {
  if (timerStore.isRunning) return
  timerStore.selectedCategory = cat
}

function handlePauseResume() {
  timerStore.isRunning ? timerStore.pause() : timerStore.resume()
}
</script>

<style scoped>
.home-view { min-height: 100%; background: var(--color-bg); }

/* ── 统一 Header 样式 ── */
.page-header {
  padding: 32px 20px 16px;
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
}

.eyebrow {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-fg-muted);
  letter-spacing: 0.05em;
  margin-bottom: 4px;
}

.display-title {
  font-size: 28px;
  font-weight: 800;
  color: var(--color-fg);
  line-height: 1.1;
}

/* ── 计时器区 ── */
.timer-section {
  display: flex; flex-direction: column; align-items: center; gap: 32px; padding: 48px 20px; background: var(--color-bg);
}

.timer-ring {
  width: 210px; height: 210px; border-radius: 50%; 
  border: 4px solid var(--color-fg); /* 使用变量确保暗色模式下变白 */
  display: flex; align-items: center; justify-content: center; transition: all 0.3s ease;
}

.timer-ring--running { border-color: var(--color-accent); }

.timer-display { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.time-text { font-size: 56px; color: var(--color-fg); font-weight: 700; }

.category-badge {
  display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 700;
}
.category-badge .dot { width: 6px; height: 6px; border-radius: 50%; }
.category-badge--empty { background: var(--color-muted); color: var(--color-fg-muted); }

/* ── 按钮颜色修正：实现 Dark Mode 自动反转 ── */
.controls { display: flex; gap: 16px; width: 100%; max-width: 300px; }

.btn { flex: 1; height: 52px; border-radius: var(--radius-md); border: none; font-size: 15px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
.btn:active { transform: scale(0.96); }
.btn:disabled { opacity: 0.3; cursor: not-allowed; }

.btn--primary {
  background: var(--color-primary);
  /* 关键：使用 var(--color-bg) 作为文字颜色。
     浅色模式下按钮是黑底白字，深色模式下会自动变为白底黑字 */
  color: var(--color-bg); 
}

.btn--outline {
  background: transparent;
  color: var(--color-fg);
  border: 2px solid var(--color-border);
}

/* ── 分类选择区 ── */
.category-section { padding: 32px 20px; background: var(--color-muted); min-height: calc(100vh - 400px); }
.section-label { font-size: 12px; font-weight: 700; color: var(--color-fg-muted); margin-bottom: 16px; text-transform: uppercase; }
.category-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }

.category-card {
  display: flex; flex-direction: column; align-items: flex-start; gap: 8px; padding: 16px 12px; border-radius: var(--radius-md); border: 1px solid var(--color-border); background: var(--color-bg); cursor: pointer; transition: all 0.2s; position: relative;
}
.category-card--selected { border-color: var(--color-primary); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.cat-indicator { width: 14px; height: 4px; border-radius: 2px; }
.cat-name { font-size: 13px; font-weight: 700; color: var(--color-fg); }
</style>