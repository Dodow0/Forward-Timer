import { db } from './local'

// ─── 分类操作 ───────────────────────────────────────────────
export async function getAllCategories() {
  // 用 toArray() 全量取出，避免依赖 orderBy 索引
  // 然后在内存里排序，兼容两种 created_at 格式（字符串或数字）
  const rows = await db.categories.toArray()
  rows.sort((a, b) => {
    // Number() 可以把时间戳数字和 ISO 字符串都转换成可比较的数值
    return Number(new Date(a.created_at)) - Number(new Date(b.created_at))
  })
  return rows.map(normalizeCategory)
}

export async function getCategories() {
  const rows = await db.categories.toArray()
  // 先过滤归档，再排序——逻辑和之前一致，但不依赖索引查询
  const active = rows.filter(r => !r.archived)
  active.sort((a, b) => Number(new Date(a.created_at)) - Number(new Date(b.created_at)))
  return active.map(normalizeCategory)
}

// 把数据库的原始格式转为前端统一格式（类似 Supabase 版本里的 .map(r => ({...}))）
function normalizeCategory(r) {
  return {
    id:        r.id,
    name:      r.name,
    color:     r.color,
    parentId:  r.parentId ?? null,
    createdAt: r.created_at,
    archived:  r.archived === 1,
  }
}

export async function addCategory({ name, color, parentId = null }) {
  // Dexie 的 add() 会返回新记录的 id
  const id = await db.categories.add({
    name,
    color,
    parentId,
    archived:   0,
    created_at: Date.now(),
  })
  return id
}

export async function updateCategory(id, changes) {
  const patch = {}
  if (changes.name  !== undefined) patch.name     = changes.name
  if (changes.color !== undefined) patch.color    = changes.color
  if (changes.parentId !== undefined) patch.parentId = changes.parentId
  await db.categories.update(id, patch)
}

export async function deleteCategory(id) {
  // 删除分类时，同时删除该分类下所有计时记录（保持数据一致性）
  await db.records.where('categoryId').equals(id).delete()
  await db.categories.delete(id)
}

export async function archiveCategory(id, archived = true) {
  await db.categories.update(id, { archived: archived ? 1 : 0 })
}

// ─── 计时记录操作 ────────────────────────────────────────────

export async function addRecord({ categoryId, date, startTime, duration }) {
  await db.records.add({ categoryId, date, startTime, duration })
}

export async function getRecordsByRange(startDate, endDate) {
  // IndexedDB 的范围查询：字符串比较在 'YYYY-MM-DD' 格式下天然正确
  return db.records
    .where('date')
    .between(startDate, endDate, true, true) // true, true 表示包含两端
    .toArray()
}

export async function getRecordsByDate(date) {
  return db.records.where('date').equals(date).toArray()
}

export async function getAllRecords() {
  return db.records.orderBy('date').toArray()
}

export async function deleteRecord(id) {
  await db.records.delete(id)
}

// 这个函数之前依赖 Supabase 的 RPC，现在在本地计算
export async function getTotalDurationByCategory() {
  const records = await db.records.toArray()
  // 用 reduce 在内存里做 groupBy，数据量不大所以完全没问题
  return records.reduce((map, r) => {
    map[r.categoryId] = (map[r.categoryId] || 0) + r.duration
    return map
  }, {})
}