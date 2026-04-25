import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      // 'autoUpdate' 意味着 Service Worker 会在后台自动更新
      registerType: 'autoUpdate',
      manifest: {
        name: 'Pomodoro',
        short_name: 'Pomodoro',
        description: '按事件分类的正向计时与数据可视化工具',
        theme_color: '#d9dede',
        background_color: '#ffffff',
        display: 'standalone',  // 安装后像原生App一样，没有浏览器地址栏
        orientation: 'portrait',
        icons: [
          {
            "src": "/icon-192.png",
            "sizes": "192x192",
            "type": "image/png",
            "purpose": "any"
          },
          {
            "src": "/icons/icon-384x384.png",
            "sizes": "384x384",
            "type": "image/png",
            "purpose": "any"
          },
          {
            "src": "/icons/icon-512x512.png",
            "sizes": "512x512",
            "type": "image/png",
            "purpose": "any"
          },
          {
            "src": "/icons/icon-192x192-maskable.png",
            "sizes": "192x192",
            "type": "image/png",
            "purpose": "maskable"
          },
          {
            "src": "/icons/icon-512x512-maskable.png",
            "sizes": "512x512",
            "type": "image/png",
            "purpose": "maskable"
          }
        ]
      },
      workbox: {
        // 预缓存所有构建产物，让App可以完全离线使用
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
      }
    })
  ],
  resolve: {
    alias: { '@': '/src' }  // 这样可以用 @/db 代替 ../../db，更简洁
  }
})
