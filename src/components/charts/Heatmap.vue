<template>
  <div class="heatmap-wrapper">
    <div class="week-labels">
      <span v-for="d in weekDays" :key="d">{{ d }}</span>
    </div>
    <canvas ref="canvasEl" class="heatmap-canvas"></canvas>
    <div class="legend">
      <span class="legend-label">少</span>
      <div class="legend-cells">
        <div v-for="i in 5" :key="i" class="legend-cell" :style="{ background: getColor(i / 5) }"></div>
      </div>
      <span class="legend-label">多</span>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'

const props = defineProps({
  data: { type: Object, required: true }
})

const canvasEl = ref(null)
const weekDays = ['一', '二', '三', '四', '五', '六', '日']

function getColor(intensity) {
  if (intensity <= 0) return '#F3F4F6'
  const r = Math.round(lerp(219, 59,  intensity))
  const g = Math.round(lerp(234, 130, intensity))
  const b = Math.round(lerp(254, 246, intensity))
  return `rgb(${r},${g},${b})`
}

function lerp(a, b, t) { return a + (b - a) * t }

function drawHeatmap() {
  const canvas = canvasEl.value
  if (!canvas) return

  const data    = props.data
  const values  = Object.values(data)
  const maxVal  = values.length ? Math.max(...values) : 1

  const now         = new Date()
  const year        = now.getFullYear()
  const month       = now.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const CELL  = 36
  const GAP   = 4
  const STEP  = CELL + GAP
  const COLS  = 7
  const ROWS  = Math.ceil(daysInMonth / 7)

  // 1. 计算逻辑上的 CSS 像素尺寸
  const cssWidth  = COLS * STEP - GAP
  const cssHeight = ROWS * STEP - GAP

  // 2. 获取设备的物理像素比 (解决高清屏模糊的核心)
  const dpr = window.devicePixelRatio || 1

  // 3. 设置 Canvas 的物理级分辨率，将其放大
  canvas.width  = cssWidth * dpr
  canvas.height = cssHeight * dpr

  const ctx = canvas.getContext('2d')
  // 4. 缩放画布上下文，让后续的绘制代码依然可以使用逻辑像素
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, cssWidth, cssHeight)

  for (let day = 1; day <= daysInMonth; day++) {
    const date      = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const minutes   = data[date] ?? 0
    const intensity = maxVal > 0 ? minutes / maxVal : 0

    const col = (day - 1) % COLS
    const row = Math.floor((day - 1) / COLS)
    const x   = col * STEP
    const y   = row * STEP

    ctx.fillStyle = getColor(intensity)
    roundRect(ctx, x, y, CELL, CELL, 4)
    ctx.fill()

    ctx.fillStyle = intensity > 0.5 ? '#ffffff' : '#9CA3AF'
    ctx.font      = '600 11px Outfit, sans-serif'
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(day, x + CELL / 2, y + CELL / 2)
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

watch(() => props.data, drawHeatmap)
onMounted(drawHeatmap)
</script>

<style scoped>
.heatmap-wrapper { display: flex; flex-direction: column; gap: 8px; }

.week-labels {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  width: 100%;
  max-width: 280px; /* 限制最大宽度 */
  margin: 0 auto;   /* 在宽屏中居中 */
  font-size: 11px;
  font-weight: 700;
  color: #9CA3AF;
  text-align: center;
  letter-spacing: 0.04em;
}

.heatmap-canvas { 
  width: 100%; 
  max-width: 280px; /* 与上方标签保持一致，防止电脑端被无限拉伸 */
  margin: 0 auto;   /* 居中展示 */
  display: block;
}

.legend {
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: flex-end;
  margin-top: 4px;
}
.legend-label { font-size: 11px; font-weight: 600; color: #9CA3AF; }
.legend-cells  { display: flex; gap: 3px; }
.legend-cell   { width: 14px; height: 14px; border-radius: 3px; }
</style>