/**
 * db/index.js — 数据库层
 *
 * Dexie.js 是对浏览器 IndexedDB 的封装，让操作变得像 Python 的 SQLAlchemy 一样简洁。
 * IndexedDB 是浏览器内置的本地数据库，数据持久存储在用户设备上，关闭页面后不会消失。
 *
 * 类比关系：
 *   IndexedDB ≈ SQLite 文件
 *   Dexie     ≈ SQLAlchemy ORM
 *   db.table  ≈ 数据库表
 */

import Dexie from 'dexie'

// 创建数据库实例，'PomodoroApp' 是数据库的名字
const db = new Dexie('PomodoroApp')

// 定义数据库结构（版本管理，类似数据库 migration）
// '++id' 表示自增主键，就像 SQL 的 INTEGER PRIMARY KEY AUTOINCREMENT
// 其他字段名表示建立索引，加快查询速度
db.version(1).stores({
  categories: '++id, name, color, icon, createdAt',
  records:    '++id, categoryId, date, startTime, duration'
  // date 格式统一用 'YYYY-MM-DD' 字符串，方便范围查询
})

// ─────────────────────────────────────────
// 分类相关操作
// ─────────────────────────────────────────

export async function getCategories() {
  return await db.categories.toArray()
}

export async function addCategory({ name, color, icon }) {
  return await db.categories.add({
    name,
    color,   // 十六进制颜色字符串，如 '#e05c4b'
    icon,    // emoji 字符，如 '📚'
    createdAt: Date.now()
  })
}

export async function updateCategory(id, changes) {
  return await db.categories.update(id, changes)
}

export async function deleteCategory(id) {
  // 删除分类时，同时删除该分类下的所有计时记录
  // 这是数据一致性的基本保障，类似 SQL 的 ON DELETE CASCADE
  await db.records.where('categoryId').equals(id).delete()
  await db.categories.delete(id)
}

// ─────────────────────────────────────────
// 计时记录相关操作
// ─────────────────────────────────────────

export async function addRecord({ categoryId, date, startTime, duration }) {
  return await db.records.add({ categoryId, date, startTime, duration })
}

/**
 * 按日期范围查询记录，这是统计图表的数据来源
 * @param {string} startDate - 'YYYY-MM-DD'
 * @param {string} endDate   - 'YYYY-MM-DD'
 */
export async function getRecordsByRange(startDate, endDate) {
  // Dexie 的 between() 类似 SQL 的 WHERE date BETWEEN startDate AND endDate
  return await db.records
    .where('date')
    .between(startDate, endDate, true, true)  // 两端闭合区间
    .toArray()
}

/**
 * 查询某一天的记录（按日视图用）
 */
export async function getRecordsByDate(date) {
  return await db.records.where('date').equals(date).toArray()
}

export default db
