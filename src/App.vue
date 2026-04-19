<template>
  <div class="app-shell">
    <main class="content-area">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <nav class="bottom-nav">
      <router-link to="/timer" class="nav-item" active-class="active">
        <span class="nav-icon">⏱</span>
        <span class="nav-label">计时</span>
      </router-link>
      <router-link to="/stats" class="nav-item" active-class="active">
        <span class="nav-icon">📊</span>
        <span class="nav-label">统计</span>
      </router-link>
      <router-link to="/categories" class="nav-item" active-class="active">
        <span class="nav-icon">🏷</span>
        <span class="nav-label">分类</span>
      </router-link>
      
      <button @click="toggleDarkMode" class="theme-toggle" aria-label="切换深色模式">
        {{ isDark ? '☀️' : '🌙' }}
      </button>
    </nav>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useCategoryStore } from '@/stores/categoryStore'

const categoryStore = useCategoryStore()

// 新增：深色模式状态控制
const isDark = ref(false)

function toggleDarkMode() {
  isDark.value = !isDark.value
  const html = document.documentElement
  if (isDark.value) {
    html.classList.add('dark')
    localStorage.setItem('theme', 'dark')
  } else {
    html.classList.remove('dark')
    localStorage.setItem('theme', 'light')
  }
}

onMounted(() => {
  categoryStore.loadCategories()
  
  // 新增：应用启动时检查本地是否保存了深色模式偏好
  if (localStorage.getItem('theme') === 'dark') {
    isDark.value = true
    document.documentElement.classList.add('dark')
  }
})
</script>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  background: var(--color-bg);
  color: var(--color-fg);
}

.content-area {
  flex: 1;
  overflow-y: auto;
  padding-bottom: env(safe-area-inset-bottom);
}

.bottom-nav {
  display: flex;
  border-top: 1px solid var(--color-border); /* 改为极细边框，提升高级感 */
  background: var(--color-bg);
  padding-bottom: env(safe-area-inset-bottom);
  position: relative;
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 0 8px;
  text-decoration: none;
  color: var(--color-fg-muted);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  transition: all 0.2s;
  gap: 4px;
  position: relative;
}

.nav-item.active {
  color: var(--color-primary);
}

.nav-item.active::before {
  content: '';
  position: absolute;
  top: -1px; /* 紧贴顶部边框 */
  left: 30%;
  right: 30%;
  height: 3px;
  background: var(--color-primary);
  border-radius: 0 0 4px 4px; /* 极简的顶部指示器 */
}

.nav-icon {
  font-size: 20px;
  transition: transform 0.2s;
}

.nav-item.active .nav-icon {
  transform: scale(1.1);
}

/* 新增：主题切换按钮的样式 */
.theme-toggle {
  position: absolute;
  right: 16px;
  top: -60px; /* 悬浮在导航栏右上方 */
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 100;
}

.theme-toggle:hover {
  transform: scale(1.05);
}

.theme-toggle:active {
  transform: scale(0.95);
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.15s; }
.fade-enter-from, .fade-leave-to       { opacity: 0; }
</style>