# 🍅 pomodoro PWA

一款简洁、高效的个人任务计时与统计工具。它采用“本地优先 + 云端同步”的架构，旨在帮助用户精确记录时间分配，通过可视化数据回顾提升效率。

---

##  核心特性

- **多层级任务管理**：支持大类与小类的双层分类体系，灵活组织你的任务目标。
- **实时精准计时**：流畅的计时器界面，支持随时开始、暂停，并自动关联分类。
- **深度统计分析**：提供柱状图、饼图及热力图，全方位展示日、周、月的时间投入分布。
- **分类归档系统**：不再活跃的分类可一键归档，保持主界面的清爽，同时保留历史记录。
- **云端同步**：基于 Supabase 构建，确保你的计时数据在多端之间无缝同步。
- **本地优先**：利用 IndexedDB 存储，即使在离线状态下也能正常使用。


##  技术栈

- **框架**: [Vue 3 (Composition API)](https://vuejs.org/)
- **状态管理**: [Pinia](https://pinia.vuejs.org/)
- **数据库**: [Supabase](https://supabase.com/) & [IndexedDB](https://developer.mozilla.org/zh-CN/docs/Web/API/IndexedDB_API)
- **构建工具**: [Vite](https://vitejs.dev/)
- **样式**: CSS Variables & Flexbox (支持暗色模式扩展)

## 项目结构

```
pomodoro-pwa/
├── index.html                  # HTML 入口
├── vite.config.js              # 构建配置 + PWA 配置
├── tailwind.config.js          # Tailwind CSS 配置
├── postcss.config.js
├── package.json                # 依赖声明
└── src/
    ├── main.js                 # 应用入口，注册插件
    ├── App.vue                 # 根组件（底部导航 + 路由出口）
    ├── router/
    │   └── index.js            # 页面路由（/timer /stats /categories）
    ├── db/
    │   └── index.js            # 数据库层（Dexie + IndexedDB 封装）
    ├── stores/
    │   ├── timerStore.js       # 计时器全局状态（Pinia）
    │   └── categoryStore.js    # 分类管理全局状态（Pinia）
    ├── utils/
    │   └── dateHelpers.js      # 日期范围计算 + 数据聚合
    ├── views/
    │   ├── HomeView.vue        # 计时主页
    │   ├── StatsView.vue       # 统计页（日/周/月 + 三种图表）
    │   └── CategoriesView.vue  # 分类管理页
    ├── components/
    │   └── charts/
    │       ├── PieChart.vue    # 饼图（ECharts）
    │       ├── BarChart.vue    # 柱状图（ECharts）
    │       └── Heatmap.vue     # 热力图（Canvas 手绘）
    └── assets/
        └── main.css            # 全局样式 + CSS 设计 Token
```

---

## 环境要求

- **Node.js** 18 或以上（去 https://nodejs.org 下载 LTS 版）

---

## 快速开始

```bash
# 1. 进入项目目录
cd pomodoro-pwa

# 2. 安装依赖（类似 pip install -r requirements.txt）
npm install

# 3. 启动开发服务器
npm run dev
# 终端会显示类似：Local: http://localhost:5173

# 4. 手机访问（需在同一 WiFi 下）
npm run dev -- --host
# 终端会显示：Network: http://192.168.x.x:5173
# 手机浏览器打开这个地址即可
```

---

## 构建与部署

```bash
# 构建生产版本（输出到 dist/ 目录）
npm run build

# 本地预览构建结果
npm run preview
```

### 部署到 Vercel

```bash
# 安装 Vercel CLI
npm install -g vercel

# 部署
vercel

# 之后每次更新
vercel --prod
```

部署后会得到一个 `https://xxx.vercel.app` 地址。
手机访问这个地址，浏览器会提示"添加到主屏幕"，安装后即可离线使用。

---

## TODO
- [x] 统计页面可以查看前一日后一日
- [x] 增加固定计时（如25min）
- [x] 历史记录与删除
- [x] 通过supabase实现多设备同步
- [x] 分类大类下面可分小类
- [x] 大类、小类都可以计时，查看统计时可切换
- [x] 每个分类可看累计计时
- [x] 增加归档功能
- [x] 导出/导入数据（JSON 文件）
