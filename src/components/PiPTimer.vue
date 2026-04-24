<script setup>
import { ref, watch, onUnmounted } from 'vue'
import { useTimerStore } from '@/stores/timerStore'
import { useCategoryStore } from '@/stores/categoryStore'

const timerStore = useTimerStore()
const categoryStore = useCategoryStore()

// 持有对画中画窗口对象的引用，方便后续关闭
const pipWindow = ref(null)
const isOpen = ref(false)

// 检查当前浏览器是否支持这个 API
const isSupported = 'documentPictureInPicture' in window

async function openPiP() {
  if (!isSupported) {
    alert('你的浏览器暂不支持画中画模式，建议使用 Chrome')
    return
  }

  // 请求打开一个 200x100 的小浮窗
  // 注意：这个 API 必须由用户手势触发（比如点击按钮），不能自动调用
pipWindow.value = await window.documentPictureInPicture.requestWindow({
    width: 230,
    height: 85,  // 大幅减小高度
  })

  isOpen.value = true

  // 把主页面的所有 CSS 样式复制到小窗口里
  // 否则小窗口是没有任何样式的空白页面
  ;[...document.styleSheets].forEach(sheet => {
    try {
      const cssRules = [...sheet.cssRules].map(r => r.cssText).join('')
      const style = pipWindow.value.document.createElement('style')
      style.textContent = cssRules
      pipWindow.value.document.head.appendChild(style)
    } catch (e) {
      // 跨域的 stylesheet 无法读取，跳过即可
    }
  })

  // 渲染初始内容
  renderPiP()

  // 监听小窗口被用户手动关闭的事件，同步更新状态
  pipWindow.value.addEventListener('pagehide', () => {
    isOpen.value = false
    pipWindow.value = null
  })
}

function closePiP() {
  pipWindow.value?.close()
  isOpen.value = false
  pipWindow.value = null
}

// 每当计时器的显示时间变化，就重新渲染小窗口内容
// watch 会自动追踪 timerStore.displayTime 的变化
watch(
  () => timerStore.displayTime,
  () => { if (isOpen.value) renderPiP() }
)

watch(() => timerStore.isRunning, () => {
  if (isOpen.value) renderPiP()
})

function renderPiP() {
  if (!isOpen.value || !pipWindow.value) return

  const timeString = timerStore.displayTime
  const categoryName = timerStore.selectedCategory?.name || '专注中'

  // 使用 Lucide 风格的纯净 SVG 字符串
  // 如果正在运行，显示“暂停(双竖线)”图标；如果已暂停，显示“播放(三角形)”图标
  const pauseIcon = timerStore.isRunning 
    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/></svg>`
    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>`

  pipWindow.value.document.body.innerHTML = `
    <div style="
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      height: 100vh; background: #18181B; color: #FAFAFA; font-family: 'Outfit', sans-serif;
    ">
      <div style="font-size: 11px; color: #A1A1AA; font-weight: 600; margin-bottom: 6px; letter-spacing: 0.5px;">
        ${categoryName}
      </div>

      <div style="display: flex; align-items: center; gap: 16px;">
        
        <button id="pip-pause" style="
          width: 36px; height: 36px; border-radius: 50%; border: 1px solid #3F3F46;
          background: transparent; color: #FAFAFA;
          display: flex; align-items: center; justify-content: center; cursor: pointer;
        " title="${timerStore.isRunning ? '暂停' : '继续'}">
          ${pauseIcon}
        </button>

        <div style="
          font-size: 32px; font-weight: 700; font-variant-numeric: tabular-nums;
          letter-spacing: 1px; width: 90px; text-align: center;
        ">
          ${timeString}
        </div>

        <button id="pip-save" style="
          width: 36px; height: 36px; border-radius: 50%; border: none;
          background: #FAFAFA; color: #18181B;
          display: flex; align-items: center; justify-content: center; cursor: pointer;
        " title="保存记录">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/></svg>
        </button>
        
      </div>
    </div>
  `

  bindPiPEvents()
}

function bindPiPEvents() {
  const doc = pipWindow.value?.document
  if (!doc) return

  const pauseBtn = doc.getElementById('pip-pause')
  const saveBtn = doc.getElementById('pip-save')

  pauseBtn?.addEventListener('click', () => {
    // 直接调用 timerStore 的方法——这就是共享运行环境的好处
    timerStore.isRunning ? timerStore.pause() : timerStore.resume()
    // 操作后立刻重新渲染，让按钮文字从"暂停"变成"继续"（或反之）
    renderPiP()
  })

  saveBtn?.addEventListener('click', async () => {
    // 保存记录，这会重置计时器状态
    await timerStore.stop()
    // 保存完成后关闭画中画窗口，因为已经没有计时内容可以显示了
    closePiP()
  })
}

// 组件卸载时关闭小窗口，防止内存泄漏
onUnmounted(closePiP)

defineExpose({ openPiP, closePiP, isOpen, isSupported })
</script>