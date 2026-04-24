// 这个模块负责：注册 SW、申请权限、封装 postMessage 通信

let swRegistration = null  // 全局持有 SW 注册对象

/**
 * 初始化：注册 Service Worker
 * 应用启动时调用一次即可
 */
export async function initNotificationSW() {
  if (!('serviceWorker' in navigator) || !('Notification' in window)) {
    console.warn('当前环境不支持通知功能')
    return false
  }

  try {
    // 注册我们专门用于通知的 SW 文件
    swRegistration = await navigator.serviceWorker.register('/sw-notification.js')
    console.log('通知 SW 注册成功')
    return true
  } catch (e) {
    console.error('通知 SW 注册失败:', e)
    return false
  }
}

/**
 * 申请通知权限（必须由用户手势触发）
 * 返回 true 表示用户授权了
 */
export async function requestNotificationPermission() {
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false

  const result = await Notification.requestPermission()
  return result === 'granted'
}

/**
 * 向 SW 发送消息的统一入口
 * SW 可能还没激活，所以需要等待它 ready
 */
async function sendToSW(message) {
  if (!swRegistration) return
  // serviceWorker.ready 返回一个 Promise，确保 SW 已经激活
  const registration = await navigator.serviceWorker.ready
  registration.active?.postMessage(message)
}

export async function startTimerNotification(displayTime, categoryName) {
  const hasPermission = await requestNotificationPermission()
  if (!hasPermission) return

  await sendToSW({
    type: 'START_NOTIFICATION',
    payload: { displayTime, categoryName }
  })
}

export async function updateTimerNotification(displayTime, categoryName) {
  await sendToSW({
    type: 'UPDATE_NOTIFICATION',
    payload: { displayTime, categoryName }
  })
}

export async function stopTimerNotification() {
  await sendToSW({ type: 'STOP_NOTIFICATION' })
}