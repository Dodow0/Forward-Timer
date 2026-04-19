<template>
  <div class="stats-view">

    <header class="page-header">
      <div class="header-content">
        <p class="eyebrow">数据可视化</p>
        <h1 class="display-title">统计</h1>
      </div>

      <div class="segmented-control">
        <button
          v-for="m in modes"
          :key="m.value"
          class="segment-btn"
          :class="{ 'segment-btn--active': mode === m.value }"
          @click="switchMode(m.value)"
        >{{ m.label }}</button>
      </div>

      <div v-if="mode === 'custom'" class="custom-date-picker">
        <div class="input-group">
          <label>从</label>
          <input type="date" v-model="customStart" />
        </div>
        <div class="input-group">
          <label>至</label>
          <input type="date" v-model="customEnd" />
        </div>
      </div>
    </header>

    <div class="stats-body">
      <div v-if="loading" class="empty-state">加载中…</div>

      <div v-else-if="!hasData" class="empty-state">
        <div class="empty-icon">📭</div>
        <p class="empty-title">暂无记录</p>
        <p class="empty-hint">去计时页面开始计时或调整查询日期</p>
      </div>

      <template v-else>
        <div class="summary-card">
          <span class="summary-label">查询期内总计</span>
          <span class="summary-value">{{ totalDurationText }}</span>
        </div>

        <div class="chart-card">
          <h3 class="chart-title">分类占比</h3>
          <PieChart :data="pieData" />
        </div>

        <div class="chart-card" v-if="mode !== 'day'">
          <h3 class="chart-title">每日时长趋势（分钟）</h3>
          <BarChart :data="barData" />
        </div>

        <div class="chart-card" v-if="mode === 'month'">
          <h3 class="chart-title">本月热力图</h3>
          <Heatmap :data="heatmapData" />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import PieChart  from '@/components/charts/PieChart.vue'
import BarChart  from '@/components/charts/BarChart.vue'
import Heatmap   from '@/components/charts/Heatmap.vue'
import { useCategoryStore } from '@/stores/categoryStore'
import { getRecordsByRange } from '@/db'
import { getDateRange, groupByCategory, groupByDate, formatDuration } from '@/utils/dateHelpers'

const categoryStore = useCategoryStore()
const mode    = ref('day')
const records = ref([])
const loading = ref(false)

const customStart = ref('')
const customEnd   = ref('')

const modes = [
  { value: 'day',    label: '日' },
  { value: 'week',   label: '周' },
  { value: 'month',  label: '月' },
  { value: 'custom', label: '自定义' },
]

const hasData = computed(() => records.value.length > 0)
const totalDuration = computed(() => records.value.reduce((sum, r) => sum + r.duration, 0))
const totalDurationText = computed(() => formatDuration(totalDuration.value))

const pieData = computed(() => {
  const byCategory = groupByCategory(records.value)
  return Object.entries(byCategory).map(([catId, duration]) => {
    const cat = categoryStore.findById(Number(catId))
    return {
      name:      cat?.name ?? '未知',
      value:     duration,
      itemStyle: { color: cat?.color ?? '#888' }
    }
  })
})

const barData = computed(() => {
  const byDate = groupByDate(records.value)
  const sorted = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b))
  return {
    dates:  sorted.map(([date]) => date.slice(5)),
    values: sorted.map(([, dur]) => Math.round(dur / 60))
  }
})

const heatmapData = computed(() => {
  const byDate = groupByDate(records.value)
  const result = {}
  for (const [date, dur] of Object.entries(byDate)) {
    result[date] = Math.round(dur / 60)
  }
  return result
})

async function loadData() {
  loading.value = true
  try {
    let startRange, endRange;

    if (mode.value === 'custom') {
      if (!customStart.value || !customEnd.value) {
        records.value = []
        return
      }
      // 【修复核心点】：直接使用原生的 YYYY-MM-DD 字符串传递给 IndexedDB 进行比对
      // 不要转换为 Date 对象，因为数据库里存的 date 字段就是字符串
      startRange = customStart.value
      endRange = customEnd.value
    } else {
      const { start, end } = getDateRange(mode.value)
      startRange = start
      endRange = end
    }

    records.value = await getRecordsByRange(startRange, endRange)
  } catch (err) {
    console.error('统计数据加载失败:', err)
    records.value = []
  } finally {
    loading.value = false
  }
}

function switchMode(newMode) { 
  mode.value = newMode 
}

watch([mode, customStart, customEnd], loadData)

onMounted(loadData)
</script>

<style scoped>
.stats-view {
  min-height: 100%;
  background: var(--color-bg);
}

/* 极简风 Header */
.page-header {
  padding: 32px 20px 16px;
  background: var(--color-bg);
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: 1px solid var(--color-border);
}

.eyebrow {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-fg-muted);
  letter-spacing: 0.05em;
  margin-bottom: 4px;
}

/* 分段控制器 */
.segmented-control {
  display: inline-flex;
  background: var(--color-muted);
  padding: 4px;
  border-radius: 8px;
  margin-top: 16px;
}

.segment-btn {
  padding: 6px 20px;
  border-radius: 6px;
  border: none;
  background: transparent;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-fg-muted);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.segment-btn--active {
  background: var(--color-bg);
  color: var(--color-fg);
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

/* 自定义日期选择器 */
.custom-date-picker {
  display: flex;
  gap: 12px;
  margin-top: 16px;
  padding: 12px;
  background: var(--color-muted);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}
.input-group { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.input-group label { font-size: 11px; font-weight: 700; color: var(--color-fg-muted); }
.input-group input { 
  background: var(--color-bg); 
  border: 1px solid var(--color-border); 
  border-radius: 4px; 
  padding: 6px 8px; 
  font-size: 13px; 
  color: var(--color-fg); 
  font-family: inherit; 
  outline: none;
}

/* 主体背景为浅灰，凸显白色卡片 */
.stats-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: var(--color-muted);
  min-height: calc(100vh - 150px);
}

.empty-state { text-align: center; padding: 80px 20px; }
.empty-icon { font-size: 48px; margin-bottom: 16px; opacity: 0.8; }
.empty-title { font-size: 16px; font-weight: 700; color: var(--color-fg); }
.empty-hint { font-size: 13px; margin-top: 8px; color: var(--color-fg-muted); }

/* 卡片通用样式 */
.summary-card, .chart-card {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 20px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.02);
}

.summary-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-fg-muted);
}

.summary-value {
  font-size: 32px;
  font-weight: 800;
  color: var(--color-primary); /* 使用主蓝色显示时长 */
  font-feature-settings: "tnum";
  letter-spacing: -0.02em;
}

.chart-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-fg-muted);
  margin-bottom: 16px;
}
</style>