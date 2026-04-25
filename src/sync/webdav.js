// src/sync/webdav.js
import { db } from '@/db/local'

function getConfig() {
  const raw = localStorage.getItem('webdav_config')
  return raw ? JSON.parse(raw) : null
}

export function saveConfig(config) {
  localStorage.setItem('webdav_config', JSON.stringify(config))
}

export function loadConfig() {
  return getConfig()
}

// 构造请求头，把用户名密码通过自定义头传给 Worker
// Worker 会从这两个头里读取认证信息，重新构造 Authorization 头发给 WebDAV 服务器
function buildHeaders(config, extra = {}) {
  return {
    'X-WebDAV-Username': config.username,
    'X-WebDAV-Password': config.password,
    ...extra,
  }
}

// ── 把本地数据库的全量数据导出成一个普通 JS 对象 ──────────────
async function exportLocalData() {
  const [categories, records] = await Promise.all([
    db.categories.toArray(),
    db.records.toArray(),
  ])
  return {
    meta: { exportedAt: new Date().toISOString(), version: 1 },
    categories,
    records,
  }
}

// ── 从 WebDAV 服务器下载备份文件，返回解析后的 JS 对象 ────────
async function fetchRemoteData(config) {
  const res = await fetch(`${config.url}/pomodoro-backup.json`, {
    headers: buildHeaders(config),
  })
  // 404 表示云端还没有备份文件，这不是错误，返回 null 让调用方处理
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`获取云端数据失败：HTTP ${res.status}`)
  return res.json()
}

// ── 把数据对象上传到 WebDAV 服务器 ────────────────────────────
async function pushData(config, data) {
  const res = await fetch(`${config.url}/pomodoro-backup.json`, {
    method: 'PUT',
    headers: buildHeaders(config, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(data, null, 2),
  })
  if (!res.ok) throw new Error(`上传失败：HTTP ${res.status}`)
}

// ── 模式一：上传覆盖 ───────────────────────────────────────────
// 本地数据直接覆盖云端，云端原有数据全部丢失
export async function uploadOverwrite() {
  const config = getConfig()
  if (!config) throw new Error('未配置 WebDAV 服务器')

  const localData = await exportLocalData()
  await pushData(config, localData)

  return {
    categories: localData.categories.length,
    records:    localData.records.length,
  }
}

// ── 模式二：拉取覆盖 ───────────────────────────────────────────
// 云端数据直接覆盖本地，本地原有数据全部丢失
// 用 Dexie 的事务保证原子性：要么全部成功，要么全部回滚
export async function downloadOverwrite() {
  const config = getConfig()
  if (!config) throw new Error('未配置 WebDAV 服务器')

  const remoteData = await fetchRemoteData(config)
  if (!remoteData) throw new Error('云端暂无备份文件')

  // 在一个事务里清空本地数据库再写入云端数据
  // 这样可以保证不会出现"删了一半本地数据，写入又失败"的中间状态
  await db.transaction('rw', db.categories, db.records, async () => {
    await db.categories.clear()
    await db.records.clear()
    await db.categories.bulkAdd(remoteData.categories)
    await db.records.bulkAdd(remoteData.records)
  })

  return {
    categories: remoteData.categories.length,
    records:    remoteData.records.length,
  }
}

// ── 模式三：智能合并 ───────────────────────────────────────────
// 云端和本地取并集，两边的数据都不会丢失
// 合并后的结果同时写回本地和云端，保持两边一致
export async function smartMerge() {
  const config = getConfig()
  if (!config) throw new Error('未配置 WebDAV 服务器')

  // 并行获取本地和云端数据，节省时间
  const [localData, remoteData] = await Promise.all([
    exportLocalData(),
    fetchRemoteData(config),
  ])

  // 如果云端还没有文件，直接上传本地数据即可，不需要合并
  if (!remoteData) {
    await pushData(config, localData)
    return { categories: localData.categories.length, records: localData.records.length, merged: false }
  }

  // ── 合并分类 ────────────────────────────────────────────────
  // 策略：以本地分类为基础，把云端独有的分类追加进来
  // 判断"同一个分类"的依据是：名称相同 + 父分类名称相同
  // 注意：不能直接用 id 判断，因为两边的自增 id 可能不同

  // 先建立一个"分类名称 → 本地id"的查找表，方便后续快速判断某个分类在本地是否存在
  const localCatIndex = new Map(
    localData.categories.map(c => [categoryKey(c, localData.categories), c.id])
  )

  // id 映射表：云端分类的 id → 合并后对应的本地 id
  // 这个映射在合并记录时会用到，确保记录的 categoryId 指向正确
  const idMap = new Map()

  // 先处理云端的大类（parentId 为 null 的分类）
  const remoteParents  = remoteData.categories.filter(c => c.parentId === null)
  const remoteChildren = remoteData.categories.filter(c => c.parentId !== null)

  // 找出云端有而本地没有的大类，准备追加
  const newCategories = []

  for (const remoteCat of remoteParents) {
    const key = categoryKey(remoteCat, remoteData.categories)
    if (localCatIndex.has(key)) {
      // 云端这个分类在本地已经存在，记录 id 映射关系即可
      idMap.set(remoteCat.id, localCatIndex.get(key))
    } else {
      // 云端独有的分类，需要追加到本地
      // 追加时不带 id，让 Dexie 自动分配新 id
      const { id: _oldId, ...catWithoutId } = remoteCat
      newCategories.push({ ...catWithoutId, parentId: null })
    }
  }

  // 再处理云端的小类，逻辑相同，但要先把 parentId 转换成合并后的本地 id
  for (const remoteCat of remoteChildren) {
    const key = categoryKey(remoteCat, remoteData.categories)
    if (localCatIndex.has(key)) {
      idMap.set(remoteCat.id, localCatIndex.get(key))
    } else {
      const { id: _oldId, ...catWithoutId } = remoteCat
      // 用 idMap 把云端的 parentId 转换成本地的 parentId
      const mappedParentId = idMap.get(remoteCat.parentId) ?? remoteCat.parentId
      newCategories.push({ ...catWithoutId, parentId: mappedParentId })
    }
  }

  // 把新分类写入本地数据库，bulkAdd 会返回新分配的 id 数组
  // 注意：我们需要把新分配的 id 也加进 idMap，后续合并记录时要用
  if (newCategories.length > 0) {
    const newIds = await db.categories.bulkAdd(newCategories, { allKeys: true })
    newCategories.forEach((cat, index) => {
      // 找到这个新分类在 remoteData 里对应的原始 id
      const originalRemoteCat = remoteData.categories.find(
        rc => categoryKey(rc, remoteData.categories) === categoryKey(cat, newCategories)
      )
      if (originalRemoteCat) {
        idMap.set(originalRemoteCat.id, newIds[index])
      }
    })
  }

  // ── 合并计时记录 ─────────────────────────────────────────────
  // 判断"同一条记录"的依据是四元组：(categoryId映射后, date, startTime, duration)
  // 这四个字段完全相同的记录视为重复，只保留一份

  // 建立本地记录的去重索引
  const localRecordIndex = new Set(
    localData.records.map(r => recordKey(r))
  )

  // 找出云端有而本地没有的记录
  const newRecords = remoteData.records
    .map(r => ({
      ...r,
      // 把云端记录的 categoryId 转换成本地对应的 categoryId
      // 如果 idMap 里没有这个映射（说明是同一个分类），就保持原样
      categoryId: idMap.get(r.categoryId) ?? r.categoryId,
    }))
    .filter(r => !localRecordIndex.has(recordKey(r)))
    // 去掉 id 字段，让 Dexie 自动分配，避免 id 冲突
    .map(({ id: _oldId, ...rest }) => rest)

  if (newRecords.length > 0) {
    await db.records.bulkAdd(newRecords)
  }

  // ── 把合并后的完整数据推送回云端 ────────────────────────────
  // 这样云端也拥有了两边的全量数据，下次同步时两边就完全一致了
  const mergedData = await exportLocalData()
  await pushData(config, mergedData)

  return {
    categories:    mergedData.categories.length,
    records:       mergedData.records.length,
    newCategories: newCategories.length,
    newRecords:    newRecords.length,
    merged:        true,
  }
}

// ── 工具函数 ───────────────────────────────────────────────────

// 生成分类的去重键：用"父分类名称/分类名称"的格式
// 这样即使两边的 id 不同，只要名称结构相同就能识别为同一个分类
function categoryKey(cat, allCategories) {
  if (cat.parentId === null || cat.parentId === undefined) {
    return `root/${cat.name}`
  }
  const parent = allCategories.find(c => c.id === cat.parentId)
  return `${parent?.name ?? 'unknown'}/${cat.name}`
}

// 生成记录的去重键：四元组拼接成字符串
function recordKey(record) {
  return `${record.categoryId}|${record.date}|${record.startTime}|${record.duration}`
}

export async function testConnection(config) {
  const res = await fetch(config.url, {
    method:  'OPTIONS',
    headers: buildHeaders(config),
  })
  return res.ok || res.status === 405 || res.status === 401
}