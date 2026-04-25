<template>
  <div class="stats-view">

    <header class="page-header">
      <div class="header-content">
        <p class="eyebrow">数据可视化</p>
        <h1 class="display-title">统计</h1>
      </div>

<input type="file" ref="fileInput" accept=".json" style="display: none" @change="handleFileChange" />
      
      <div class="toolbar">
        <div class="segmented-control">
          <button
            v-for="m in modes"
            :key="m.value"
            class="segment-btn"
            :class="{ 'segment-btn--active': mode === m.value }"
            @click="switchMode(m.value)"
          >{{ m.label }}</button>
        </div>

        <div class="more-actions">
          <button class="more-btn" :class="{ active: showExportMenu }" @click="showExportMenu = !showExportMenu">
            <MoreHorizontal :size="20" />
          </button>
          
          <div v-if="showExportMenu" class="click-away-overlay" @click="showExportMenu = false"></div>

          <div v-if="showExportMenu" class="dropdown-menu">
            <button class="dropdown-item" @click="triggerImport(); showExportMenu = false" :disabled="isImporting">
              <Loader2 v-if="isImporting" class="animate-spin" :size="16" />
              <Upload v-else :size="16" />
              <span>导入数据</span>
            </button>
            <button class="dropdown-item" @click="exportAsJSON(); showExportMenu = false">
              <FileJson :size="16" />
              <span>导出 JSON</span>
            </button>
            <button class="dropdown-item" @click="exportAsCSV(categoryStore); showExportMenu = false">
              <FileSpreadsheet :size="16" />
              <span>导出 CSV</span>
            </button>
              <!-- 新增：分隔线 + WebDAV 入口 -->
            <div class="dropdown-divider"></div>
            <button class="dropdown-item" @click="showWebDAVModal = true; showExportMenu = false">
              <Cloud :size="16" />
              <span>WebDAV</span>
            </button>
          </div>
        </div>
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
                  <div v-else class="date-navigator">
        <button class="nav-btn" @click="prevPeriod">‹</button>
        <span class="period-label">{{ currentPeriodLabel }}</span>
        <button class="nav-btn" @click="nextPeriod" :disabled="periodOffset >= 0">›</button>
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
          <div class="pie-header">
            <h3 class="chart-title" style="margin-bottom:0">分类占比</h3>
            <div class="pie-toggle">
              <button class="pie-toggle-btn" :class="{ active: pieView === 'parent' }" @click="pieView = 'parent'">大类</button>
              <button class="pie-toggle-btn" :class="{ active: pieView === 'child' }"  @click="pieView = 'child'">小类</button>
            </div>
          </div>
          <PieChart :data="pieView === 'parent' ? parentPieData : pieData" />
        </div>

        <div class="chart-card" v-if="mode !== 'day'">
          <h3 class="chart-title">每日时长趋势（分钟）</h3>
          <BarChart :data="barData" />
        </div>

        <div class="chart-card" v-if="mode === 'month'">
          <h3 class="chart-title">本月热力图</h3>
          <Heatmap :data="heatmapData" />
        </div>
        <!-- 计时记录列表 -->
        <div class="chart-card records-card">
          <div class="records-header">
            <h3 class="chart-title" style="margin-bottom:0">计时记录</h3>
          </div>

          <div v-for="group in groupedRecords" :key="group.date" class="day-group">
            <!-- 日期行，点击展开/收起 -->
            <div class="day-header" @click="toggleGroup(group.date)">
              <div class="day-header-left">
                <span class="day-toggle">{{ expandedDates.has(group.date) ? '▾' : '▸' }}</span>
                <span class="day-label">{{ formatDate(group.date) }}</span>
              </div>
              <span class="day-total">{{ formatDur(group.total) }}</span>
            </div>

            <!-- 展开后的记录列表 -->
            <div v-if="expandedDates.has(group.date)" class="day-records">
              <div v-for="record in group.records" :key="record.id" class="record-row">
                <div class="record-left">
                  <div class="cat-dot" :style="{ background: getCategoryColor(record.categoryId) }"></div>
                 <div class="record-info">
                  <span class="record-cat">{{ getCategoryName(record.categoryId) }}</span>
                  <span class="record-time">{{ formatTimeRange(record.startTime, record.duration) }}</span>
                </div>
                </div>
                <div class="record-right">
                  <span class="record-duration">{{ formatDur(record.duration) }}</span>
                  <button class="delete-btn" @click.stop="confirmDelete(record)">✕</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
      <!-- 删除确认弹窗 -->
    <transition name="fade">
      <div v-if="pendingDelete" class="overlay">
        <div class="confirm-card">
          <p class="confirm-title">删除这条记录？</p>
          <p class="confirm-sub">
            {{ getCategoryName(pendingDelete.categoryId) }} · {{ formatDur(pendingDelete.duration) }}
          </p>
          <div class="confirm-actions">
            <button class="btn btn--outline" @click="pendingDelete = null">取消</button>
            <button class="btn btn--danger" @click="doDelete">删除</button>
          </div>
        </div>
      </div>
    </transition>
          <!-- WebDAV 配置与同步弹窗 -->
      <transition name="fade">
        <div v-if="showWebDAVModal" class="overlay" @click.self="showWebDAVModal = false">
          <div class="confirm-card webdav-card">
            <p class="confirm-title">WebDAV 同步</p>

            <!-- 配置区：服务器地址、用户名、密码 -->
            <div class="webdav-fields">
              <label class="webdav-label">服务器地址</label>
              <input
                v-model="webdavConfig.url"
                class="webdav-input"
                placeholder="https://dav.example.com/remote.php/dav/files/user"
              />

              <label class="webdav-label">用户名</label>
              <input
                v-model="webdavConfig.username"
                class="webdav-input"
                placeholder="username"
                autocomplete="username"
              />

              <label class="webdav-label">密码 / 应用密码</label>
              <input
                v-model="webdavConfig.password"
                class="webdav-input"
                type="password"
                placeholder="••••••••"
                autocomplete="current-password"
              />
            </div>

            <!-- 状态提示文字（上传/下载结果） -->
            <p v-if="syncStatus" class="sync-status" :class="{ 'sync-status--error': syncStatus.startsWith('❌') }">
              {{ syncStatus }}
            </p>

            <!-- 操作按钮区 -->
            <div class="webdav-actions">
            <button class="btn btn--outline btn--full" @click="saveWebDAVConfig">
                保存配置
              </button>

              <button class="btn btn--primary btn--full" @click="handleSmartMerge" :disabled="isSyncing">
                <template v-if="isSyncing">处理中…</template>
                <template v-else>⟳ 智能合并</template>
              </button>

              <div class="webdav-sync-group">
                <button class="btn btn--outline" @click="handleUpload" :disabled="isSyncing">
                  ↑ 上传备份
                </button>
                <button class="btn btn--outline" @click="handleDownload" :disabled="isSyncing">
                  ↓ 下载恢复
                </button>
            </div>
            </div>
            <button class="close-btn" @click="showWebDAVModal = false">✕</button>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import PieChart  from '@/components/charts/PieChart.vue'
import BarChart  from '@/components/charts/BarChart.vue'
import Heatmap   from '@/components/charts/Heatmap.vue'
import { useCategoryStore } from '@/stores/categoryStore'
import { getRecordsByRange, deleteRecord} from '@/db'
import { getDateRange, groupByCategory, groupByDate, formatDuration } from '@/utils/dateHelpers'
import { exportAsJSON, exportAsCSV, importFromJSON } from '@/utils/dataTransfer'
import { Download, Upload, FileJson, FileSpreadsheet, Loader2, MoreHorizontal, Cloud } from 'lucide-vue-next'
import { uploadOverwrite, downloadOverwrite, smartMerge, saveConfig, loadConfig } from '@/sync/webdav'

const categoryStore = useCategoryStore()
const mode    = ref('day')
const records = ref([])
const loading = ref(false)
const pieView = ref('child')  // 'parent' | 'child'
const expandedDates = ref(new Set())   // 当前展开的日期集合
const pendingDelete = ref(null)        // 待确认删除的记录
const periodOffset = ref(0)           // 周期偏移量
const currentPeriodLabel = ref('')    // 当前展示的日期文案

const customStart = ref('')
const customEnd   = ref('')

const showWebDAVModal = ref(false)
const webdavConfig    = ref(loadConfig() || { url: '', username: '', password: '' })
const syncStatus      = ref('')  // 显示给用户的状态文字
const isSyncing       = ref(false)

const modes = [
  { value: 'day',    label: '日' },
  { value: 'week',   label: '周' },
  { value: 'month',  label: '月' },
  { value: 'custom', label: '自定义' },
]

const hasData = computed(() => records.value.length > 0)
const totalDuration = computed(() => records.value.reduce((sum, r) => sum + r.duration, 0))
const totalDurationText = computed(() => formatDuration(totalDuration.value))

// 小类饼图（直接按记录的 categoryId 聚合）
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

// 大类饼图（把小类的时长归并到其父类）
const parentPieData = computed(() => {
  const byCategory = groupByCategory(records.value)
  const parentMap = {}
  for (const [catId, duration] of Object.entries(byCategory)) {
    const cat = categoryStore.findById(Number(catId))
    if (!cat) continue
    // 如果是小类，归并到父类；如果是大类，直接用自己
    const parentId = cat.parentId ?? cat.id
    const parent   = categoryStore.findById(parentId)
    if (!parent) continue
    parentMap[parentId] = (parentMap[parentId] || 0) + duration
  }
  return Object.entries(parentMap).map(([parentId, duration]) => {
    const cat = categoryStore.findById(Number(parentId))
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

const isImporting = ref(false)
const fileInput = ref(null)
const showExportMenu = ref(false)

function triggerImport() {
  fileInput.value?.click()
}

// 处理 JSON 导入
async function handleFileChange(e) {
  const file = e.target.files[0]
  if (!file) return

  isImporting.value = true
  try {
    const result = await importFromJSON(file)
    alert(`🎉 导入成功！\n共导入 ${result.categoryCount} 个分类和 ${result.recordCount} 条记录。`)
    // 导入后刷新页面数据
    await categoryStore.loadCategories()
    await loadData()
  } catch (err) {
    alert(`❌ 导入失败: ${err.message}`)
  } finally {
    isImporting.value = false
    e.target.value = '' // 清空 input 以便下次选择同一文件
  }
}

function saveWebDAVConfig() {
  saveConfig(webdavConfig.value)
  syncStatus.value = '✅ 配置已保存'
}

async function handleUpload() {
  isSyncing.value  = true
  syncStatus.value = ''
  try {
    const result     = await uploadToWebDAV()
    syncStatus.value = `✅ 上传成功，共 ${result.records} 条记录`
  } catch (e) {
    syncStatus.value = `❌ ${e.message}`
  } finally {
    isSyncing.value = false
  }
}

async function handleDownload() {
  isSyncing.value  = true
  syncStatus.value = ''
  try {
    const result     = await downloadFromWebDAV()
    syncStatus.value = `✅ 恢复成功，共 ${result.records} 条记录`
    // 下载完成后刷新当前页面的统计数据和分类列表
    await categoryStore.loadCategories()
    await loadData()
  } catch (e) {
    syncStatus.value = `❌ ${e.message}`
  } finally {
    isSyncing.value = false
  }
}

async function handleSmartMerge() {
  isSyncing.value  = true
  syncStatus.value = ''
  try {
    const result = await smartMerge()
    syncStatus.value = result.merged
      ? `✅ 合并完成，新增 ${result.newCategories} 个分类、${result.newRecords} 条记录`
      : `✅ 云端无备份，已上传本地数据`
    await categoryStore.loadCategories()
    await loadData()
  } catch (e) {
    syncStatus.value = `❌ ${e.message}`
  } finally {
    isSyncing.value = false
  }
}

async function loadData() {
  loading.value = true
  try {
    let startRange, endRange;

    if (mode.value === 'custom') {
      if (!customStart.value || !customEnd.value) {
        records.value = []
        return
      }
      // 直接使用原生的 YYYY-MM-DD 字符串传递给 IndexedDB 进行比对
      // 不要转换为 Date 对象，因为数据库里存的 date 字段就是字符串
      startRange = customStart.value
      endRange = customEnd.value
    } else {
     // 修改：传入 offset 参数，并接收 label
      const { start, end, label } = getDateRange(mode.value, periodOffset.value)
      startRange = start
      endRange = end
      currentPeriodLabel.value = label
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
  periodOffset.value = 0
}

function prevPeriod() {
  periodOffset.value--
}

function nextPeriod() {
  if (periodOffset.value < 0) periodOffset.value++ // 防止查看到未来的空白数据
}

// 修改：监听 periodOffset 的变化，一旦点击前后按钮立刻重新加载数据
watch([mode, periodOffset, customStart, customEnd], loadData)
// ── 记录列表相关 ──

const groupedRecords = computed(() => {
  const map = {}
  for (const r of records.value) {
    if (!map[r.date]) map[r.date] = { date: r.date, records: [], total: 0 }
    map[r.date].records.push(r)
    map[r.date].total += r.duration
  }
  return Object.values(map)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(g => ({ ...g, records: g.records.sort((a, b) => b.startTime - a.startTime) }))
})

function toggleGroup(date) {
  const s = new Set(expandedDates.value)
  s.has(date) ? s.delete(date) : s.add(date)
  expandedDates.value = s
}

function confirmDelete(record) {
  pendingDelete.value = record
}

async function doDelete() {
  if (!pendingDelete.value) return
  await deleteRecord(pendingDelete.value.id)
  records.value = records.value.filter(r => r.id !== pendingDelete.value.id)
  pendingDelete.value = null
}

function getCategoryName(id) {
  return categoryStore.findById(id)?.name ?? '已删除分类'
}

function getCategoryColor(id) {
  return categoryStore.findById(id)?.color ?? '#ccc'
}

function formatDur(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function formatDate(dateStr) {
  const today     = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  if (dateStr === today)     return '今天'
  if (dateStr === yesterday) return '昨天'
  return new Date(dateStr).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })
}

function formatTimeRange(startTimeMs, durationSec) {
  // 计算开始时间和结束时间对象
  const start = new Date(startTimeMs)
  const end = new Date(startTimeMs + durationSec * 1000)
  
  // 分别格式化为 HH:MM
  const startStr = start.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  const endStr = end.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  
  // 返回拼接后的字符串
  return `${startStr} - ${endStr}`
}
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
  flex: 1; 
  background: var(--color-muted);
  padding: 4px;
  border-radius: 8px;
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
/* 日期导航器样式 */
.date-navigator {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
  padding: 6px 8px;
  background: var(--color-muted);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}
.period-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-fg);
  font-feature-settings: "tnum";
}
.nav-btn {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  width: 28px;
  height: 28px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  color: var(--color-fg);
  font-size: 16px; transition: all 0.2s;
}
.nav-btn:hover:not(:disabled) { border-color: var(--color-primary); }
.nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }
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

/* 记录列表 */
.records-card { padding: 16px 20px; }
.records-header { margin-bottom: 12px; }

.day-group { border-bottom: 1px solid var(--color-border); }
.day-group:last-child { border-bottom: none; }

.day-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 0; cursor: pointer; user-select: none;
}
.day-header:hover { opacity: 0.75; }
.day-header-left { display: flex; align-items: center; gap: 6px; }
.day-toggle { font-size: 11px; color: var(--color-fg-muted); width: 12px; }
.day-label { font-size: 13px; font-weight: 700; color: var(--color-fg); }
.day-total { font-size: 12px; color: var(--color-fg-muted); }

.day-records { display: flex; flex-direction: column; gap: 6px; padding-bottom: 10px; }

.record-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 12px; border-radius: 10px; background: var(--color-muted);
}
.record-left { display: flex; align-items: center; gap: 10px; }
.cat-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.record-info { display: flex; flex-direction: column; gap: 1px; }
.record-cat { font-size: 13px; font-weight: 700; color: var(--color-fg); }
.record-time { font-size: 11px; color: var(--color-fg-muted); }
.record-right { display: flex; align-items: center; gap: 10px; }
.record-duration { font-size: 14px; font-weight: 700; color: var(--color-fg); font-variant-numeric: tabular-nums; }

.delete-btn {
  width: 24px; height: 24px; border-radius: 50%; border: none;
  background: transparent; color: var(--color-fg-muted);
  font-size: 11px; cursor: pointer; transition: all 0.2s;
  display: flex; align-items: center; justify-content: center;
}
.delete-btn:hover { background: #ff4d4f22; color: #ff4d4f; }

/* 删除确认弹窗 */
.overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.45);
  display: flex; align-items: center; justify-content: center; z-index: 100;
}
.confirm-card {
  background: var(--color-bg); border-radius: 20px;
  padding: 32px 28px; width: 280px;
  display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center;
}
.confirm-title { font-size: 18px; font-weight: 800; color: var(--color-fg); margin: 0; }
.confirm-sub { font-size: 13px; color: var(--color-fg-muted); margin: 0 0 8px; }
.confirm-actions { display: flex; gap: 12px; width: 100%; margin-top: 8px; }
.btn { flex: 1; height: 46px; min-height: 46px; display: flex; align-items: center; justify-content: center; border-radius: var(--radius-md); border: none; font-size: 14px; font-weight: 700; cursor: pointer;  transition: all 0.2s; }
.btn:active { transform: scale(0.96); }
.btn--outline { background: transparent; border: 2px solid var(--color-border); color: var(--color-fg); }
.btn--danger { background: #ff4d4f; color: #fff; }
.btn--primary {
  background: var(--color-primary);
  color: #fff;
  border: none;
  box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.2); /* 增加微妙阴影 */
}

.pie-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 16px;
}
.pie-toggle {
  display: inline-flex; background: var(--color-muted);
  padding: 3px; border-radius: 6px;
}
.pie-toggle-btn {
  padding: 4px 14px; border-radius: 4px; border: none;
  font-size: 12px; font-weight: 600; color: var(--color-fg-muted);
  background: transparent; cursor: pointer; transition: all 0.2s;
}
.pie-toggle-btn.active {
  background: var(--color-bg); color: var(--color-fg);
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
}

.more-actions {
  position: relative;
}

.more-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px; /* 变成正方形的小按钮 */
  height: 36px;
  background: var(--color-muted);
  border: none;
  border-radius: 8px;
  color: var(--color-fg-muted);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.more-btn:hover, .more-btn.active {
  background: var(--color-bg);
  color: var(--color-fg);
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

.click-away-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 15;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 8px;
  min-width: 140px;
  box-shadow: 0 10px 24px -8px rgba(0,0,0,0.15);
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 20;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: none;
  background: transparent;
  border-radius: 6px;
  color: var(--color-fg);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  text-align: left;
}

.dropdown-item:hover:not(:disabled) {
  background: var(--color-muted);
}

.dropdown-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 旋转动画 */
.animate-spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.dropdown-divider {
  height: 1px;
  background: var(--color-border);
  margin: 4px 0;
}

/* 让 WebDAV 弹窗比删除确认弹窗更宽，能容纳输入框 */
.webdav-card {
  width: 320px;
  gap: 16px;
  position: relative; /* 给关闭按钮定位用 */
}

.webdav-fields {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: left;
}

.webdav-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-fg-muted);
  margin-top: 4px;
}

.webdav-input {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  background: var(--color-muted);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 13px;
  color: var(--color-fg);
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}

.webdav-input:focus {
  border-color: var(--color-primary);
  background: var(--color-bg);
}

.webdav-actions {
  display: flex;
  flex-direction: column;
  gap: 12px; /* 按钮之间的垂直间距 */
  width: 100%;
  margin-top: 8px;
}

/* 全宽类名 */
.btn--full {
  width: 100%;
  flex: none; /* 取消 flex: 1，确保占据完整行 */
}

.webdav-sync-group {
  display: flex;
  gap: 8px;
  width: 100%;
}

.webdav-sync-group .btn {
  flex: 1; /* 平分宽度 */
  font-size: 12px;
}

.sync-status {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-accent);
  text-align: center;
}

.sync-status--error {
  color: #ef4444;
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  color: var(--color-fg-muted);
  font-size: 14px;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
}
</style>