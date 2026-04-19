import { createRouter, createWebHashHistory } from 'vue-router'

// 路由定义：URL 路径 → 对应渲染哪个 Vue 组件（页面）
// 类比 Flask 的 @app.route('/timer') → def timer_page()
const routes = [
  {
    path: '/',
    redirect: '/timer'  // 访问根路径自动跳转到计时页
  },
  {
    path: '/timer',
    name: 'Timer',
    component: () => import('@/views/HomeView.vue')
    // 注意这里用了"懒加载"：只有用户导航到这个页面时才加载代码
    // 可以加快首屏启动速度
  },
  {
    path: '/stats',
    name: 'Stats',
    component: () => import('@/views/StatsView.vue')
  },
  {
    path: '/categories',
    name: 'Categories',
    component: () => import('@/views/CategoriesView.vue')
  }
]

const router = createRouter({
  // createWebHashHistory 使用 URL 的 # 符号来实现路由
  // 例如：http://localhost:5173/#/timer
  // 优点是不需要服务器配置，适合 PWA 这种纯静态部署
  history: createWebHashHistory(),
  routes
})

export default router
