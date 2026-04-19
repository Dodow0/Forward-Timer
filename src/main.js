import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './assets/main.css'

// createApp 类似 Python 里实例化一个主类
const app = createApp(App)

// Pinia 是全局状态管理库，类似一个全局的"共享变量仓库"
// 任何组件都可以读写它，不需要层层传参
app.use(createPinia())

// router 管理页面路由，类似 Flask 的 @app.route
app.use(router)

app.mount('#app')  // 把 Vue 应用挂载到 index.html 里的 <div id="app">
