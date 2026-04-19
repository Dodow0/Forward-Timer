# 🍅 pomodoro PWA

按事件分类的正向计时工具，支持饼图、柱状图、热力图统计，可安装到手机桌面离线使用。

---

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

## 数据说明

所有数据存储在手机/浏览器本地的 **IndexedDB** 中，不会上传到任何服务器。
清除浏览器数据或卸载 PWA 会导致数据丢失——后续可以增加"导出 JSON"功能备份数据。

---

## 后续可扩展的功能

- [ ] 导出/导入数据（JSON 文件）
- [ ] 添加 Firebase 实现多设备同步
- [ ] 桌面小组件（浏览器 Notification API）
- [ ] 自定义颜色主题
- [ ] 历史记录列表与删除

## TODO
- [ ] 分类大类下面可分小类
- [ ] 每个分类项目点开可看全部计时
- [x] 统计页面可以查看前一日后一日
- [ ] 增加固定计时（如25min）