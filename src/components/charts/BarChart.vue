<template>
  <div ref="chartEl" class="chart-container"></div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts/core'
import { BarChart as EChartsBarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([EChartsBarChart, GridComponent, TooltipComponent, CanvasRenderer])

const props = defineProps({
  data: { type: Object, required: true }
})

const chartEl     = ref(null)
let chartInstance = null

function buildOption({ dates, values }) {
  return {
    backgroundColor: 'transparent',
    grid: { top: 10, right: 10, bottom: 30, left: 48 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#ffffff',
      borderColor: '#111827',
      borderWidth: 2,
      textStyle: { color: '#111827', fontSize: 13, fontFamily: 'Outfit, sans-serif' },
      formatter: (params) => `${params[0].name}　${params[0].value} 分钟`
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: {
        color: '#6B7280',   // Gray 500，次要信息
        fontSize: 11,
        fontFamily: 'Outfit, sans-serif',
        fontWeight: 600
      },
      axisLine:  { lineStyle: { color: '#E5E7EB' } },
      axisTick:  { show: false }
    },
    yAxis: {
      type: 'value',
      name: 'min',
      nameTextStyle: { color: '#9CA3AF', fontSize: 10, fontFamily: 'Outfit, sans-serif' },
      axisLabel: { color: '#6B7280', fontSize: 11, fontFamily: 'Outfit, sans-serif' },
      splitLine: { lineStyle: { color: '#F3F4F6', width: 1 } }  // 浅灰分割线
    },
    series: [{
      type: 'bar',
      data: values,
      barMaxWidth: 36,
      itemStyle: {
        // 平面设计：实心单色，不用渐变
        color: '#3B82F6',      // Primary Blue
        borderRadius: [4, 4, 0, 0]
      },
      emphasis: {
        itemStyle: {
          color: '#2563EB'     // hover 时加深，scale 反馈由 ECharts 处理
        }
      }
    }]
  }
}

function initChart() {
  if (!chartEl.value) return
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
.chart-container { width: 100%; height: 200px; }
</style>
