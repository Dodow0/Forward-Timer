/**
 * utils/dateHelpers.js — 日期处理与数据聚合
 *
 * 这个文件承担两个职责：
 * 1. 计算日/周/月的日期范围（用于数据库查询）
 * 2. 将原始记录聚合成图表所需的格式（类似 Python pandas 的 groupby）
 */

// ─────────────────────────────────────────
// 日期工具
// ─────────────────────────────────────────

/**
 * 获取今天的日期字符串（本地时区，非 UTC）
 * @returns {string} 'YYYY-MM-DD'
 *
 * 注意：不能用 toISOString()，它返回 UTC 时间。
 * 在 UTC+8 时区，凌晨 0~8 点调用会返回昨天的日期。
 * 用 toLocaleDateString 再手动格式化才能得到本地日期。
 */
export function today() {
  return localDateString(new Date())
}

/**
 * 把 Date 对象转成本地时区的 'YYYY-MM-DD' 字符串
 */
function localDateString(date) {
  const y  = date.getFullYear()
  const m  = String(date.getMonth() + 1).padStart(2, '0')
  const d  = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * 根据视图模式返回查询的起止日期
 * @param {'day'|'week'|'month'} mode
 * @param {number} offset - 日期偏移量（0表示当前，-1表示上一个周期）
 * @returns {{ start: string, end: string, label: string }}
 */
export function getDateRange(mode, offset = 0) {
  const targetDate = new Date()

  if (mode === 'day') {
    targetDate.setDate(targetDate.getDate() + offset)
    const d = localDateString(targetDate)
    return { start: d, end: d, label: d }
  }

  if (mode === 'week') {
    targetDate.setDate(targetDate.getDate() + offset * 7)
    const dayOfWeek = targetDate.getDay() || 7  // 周日的 0 转为 7
    const monday = new Date(targetDate)
    monday.setDate(targetDate.getDate() - dayOfWeek + 1)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    const start = localDateString(monday)
    const end = localDateString(sunday)
    return {
      start,
      end,
      label: `${start} ~ ${end}`
    }
  }

  if (mode === 'month') {
    targetDate.setMonth(targetDate.getMonth() + offset)
    const y = targetDate.getFullYear()
    const m = targetDate.getMonth()
    const firstDay = new Date(y, m, 1)
    const lastDay  = new Date(y, m + 1, 0)
    return {
      start: localDateString(firstDay),
      end:   localDateString(lastDay),
      label: `${y}年${m + 1}月`
    }
  }

  // 兜底：避免未知 mode 导致解构 undefined 报错
  const d = today()
  return { start: d, end: d, label: d }
}

// ─────────────────────────────────────────
// 数据聚合（为图表准备数据）
// ─────────────────────────────────────────

/**
 * 按分类聚合总时长 → 用于饼图
 *
 * 输入：[{ categoryId: 1, duration: 300 }, { categoryId: 1, duration: 200 }, ...]
 * 输出：{ 1: 500, 2: 800, ... }  （categoryId → 总秒数）
 *
 * 这就是 Python 里 df.groupby('categoryId')['duration'].sum() 的手写版
 */
export function groupByCategory(records) {
  return records.reduce((acc, record) => {
    const key = record.categoryId
    acc[key] = (acc[key] || 0) + record.duration
    return acc
  }, {})
}

/**
 * 按日期聚合总时长 → 用于柱状图、热力图
 *
 * 输入：[{ date: '2026-04-14', duration: 300 }, ...]
 * 输出：{ '2026-04-14': 500, '2026-04-15': 1200, ... }
 */
export function groupByDate(records) {
  return records.reduce((acc, record) => {
    acc[record.date] = (acc[record.date] || 0) + record.duration
    return acc
  }, {})
}

/**
 * 将秒数格式化为易读字符串
 * 例如：3661 → '1h 1m'
 */
export function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}
