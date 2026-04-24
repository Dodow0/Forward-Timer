// 这个文件运行在浏览器的"后台线程"里
// 它没有 window、没有 DOM，但可以管理通知

let notifInterval = null  // 用来持有定时器的引用

// 监听来自主页面的消息
self.addEventListener('message', (event) => {
  const { type, payload } = event.data

  if (type === 'START_NOTIFICATION') {
    // 主页面告诉我们：计时开始了，请开始维护通知
    startNotification(payload)
  }

  if (type === 'UPDATE_NOTIFICATION') {
    // 主页面每秒发来最新的时间，更新通知显示
    updateNotification(payload)
  }

  if (type === 'STOP_NOTIFICATION') {
    // 计时停止了，清除通知
    stopNotification()
  }
})

async function startNotification({ displayTime, categoryName }) {
  // 先清除可能存在的旧通知，避免堆叠
  const existingNotifications = await self.registration.getNotifications({
    tag: 'timer-running'  // tag 是通知的唯一标识，相同 tag 会互相覆盖
  })
  existingNotifications.forEach(n => n.close())

  // 显示第一条通知
  // requireInteraction: true 让通知不会自动消失（重要！）
  await self.registration.showNotification('专注计时中', {
    body: `${categoryName} · ${displayTime}`,
    tag: 'timer-running',
    requireInteraction: true,   // 不自动消失
    silent: true,               // 不播放通知音
    icon: '/icons/icon-192.png' // 如果你有 PWA 图标的话
  })
}

async function updateNotification({ displayTime, categoryName }) {
  // showNotification 配合相同的 tag，会直接替换已有的通知
  // 这就是"更新"的原理：并非修改通知，而是用新通知替换旧通知
  await self.registration.showNotification('专注计时中', {
    body: `${categoryName} · ${displayTime}`,
    tag: 'timer-running',
    requireInteraction: true,
    silent: true,  // 关键！更新时绝对不能有声音，否则每秒一声通知音会把用户逼疯
    icon: '/icons/icon-192.png'
  })
}

async function stopNotification() {
  const notifications = await self.registration.getNotifications({
    tag: 'timer-running'
  })
  notifications.forEach(n => n.close())
}