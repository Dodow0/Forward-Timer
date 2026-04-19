<template>
  <div ref="chartEl" class="chart-container"></div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts/core'
import { PieChart as EChartsPieChart } from 'echarts/charts'
import { TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { formatDuration } from '@/utils/dateHelpers'

echarts.use([EChartsPieChart, TooltipComponent, LegendComponent, CanvasRenderer])

const props = defineProps({
  data: { type: Array, required: true }
})

const chartEl     = ref(null)
let chartInstance = null

function buildOption(data) {
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      // 明亮主题：白色背景 tooltip，无阴影，粗边框
      backgroundColor: '#ffffff',
      borderColor: '#111827',
      borderWidth: 2,
      textStyle: { color: '#111827', fontSize: 13, fontFamily: 'Outfit, sans-serif' },
      formatter: (params) =>
        `<strong>${params.name}</strong><br/>${formatDuration(params.value)}（${params.percent}%）`
    },
    legend: {
      orient: 'vertical',
      right: 8,
      top: 'center',
      textStyle: {
        color: '#374151',   // Gray 700，在白色背景上清晰
        fontSize: 12,
        fontFamily: 'Outfit, sans-serif',
        fontWeight: 600
      },
      icon: 'rect',         // 方形图例标记，符合几何化风格
      itemWidth: 10,
      itemHeight: 10
    },
    series: [{
      type: 'pie',
      radius: ['42%', '68%'],
      center: ['38%', '50%'],
      label: { show: false },
      emphasis: {
        // 平面设计不用光晕，用 scale 提供 hover 反馈
        scaleSize: 8,
        itemStyle: { shadowBlur: 0 }
      },
      data
    }]
  }
}

function initChart() {
  if (!chartEl.value) return
  // 使用 'light' 主题（与整体明亮设计系统一致）
  chartInstance = echarts.init(chartEl.value, 'light')
  chartInstance.setOption(buildOption(props.data))
}

watch(() => props.data, (newData) => {
  chartInstance?.setOption(buildOption(newData))
})

onMounted(initChart)
onUnmounted(() => { chartInstance?.dispose() })
</script>

<style scoped>
.chart-container {
  width: 100%;
  height: 220px;
}
</style>
